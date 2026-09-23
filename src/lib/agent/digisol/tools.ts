import { tool } from "ai";
import { z } from "zod";
import { assignAbVariants } from "@/lib/campaignAb";
import {
  findOrCreateContactForSend,
  getResendFrom,
  parseFromAddress,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { fetchDigisolGa4Summary } from "@/lib/ga4";
import { summarizeLeadPerformance, type LeadRecord } from "@/lib/lead-pipeline";
import { reconcileHubEmailStats } from "@/lib/resendStats";
import { summarizeSiteEvents } from "@/lib/site-analytics";
import { contactIdsForClient } from "@/lib/workspace";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import type { DigisolAgentContext } from "@/lib/agent/digisol/scope";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";
import { ensureWebsiteAuditSchema } from "@/lib/ensureWebsiteAuditSchema";
import {
  checkAgentBudget,
  estimateToolCost,
  recordAgentUsage,
} from "@/lib/agent/budget";

const SEND_CAP = 15;

async function withToolLog<T>(
  ctx: DigisolAgentContext,
  toolName: string,
  input: Record<string, unknown>,
  run: () => Promise<T>,
  budget?: {
    tokens?: number;
    toolCalls?: number;
    audits?: number;
    emails?: number;
  },
): Promise<T> {
  if (budget) {
    await checkAgentBudget(ctx.clientId, budget, {
      supabase: ctx.supabase,
      userId: ctx.userId,
      toolName,
      invocation: "manual",
      throwOnDeny: true,
    });
  }

  await logAgentActivity({
    supabase: ctx.supabase,
    userId: ctx.userId,
    clientId: ctx.clientId,
    action: `tool:${toolName}`,
    toolName,
    status: "started",
    input,
  });

  try {
    const output = await run();
    if (budget) {
      await recordAgentUsage(
        ctx.clientId,
        {
          ...budget,
          toolName,
        },
        { supabase: ctx.supabase, userId: ctx.userId, invocation: "manual" },
      );
    }
    await logAgentActivity({
      supabase: ctx.supabase,
      userId: ctx.userId,
      clientId: ctx.clientId,
      action: `tool:${toolName}`,
      toolName,
      status: "ok",
      input,
      output,
    });
    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    await logAgentActivity({
      supabase: ctx.supabase,
      userId: ctx.userId,
      clientId: ctx.clientId,
      action: `tool:${toolName}`,
      toolName,
      status: "error",
      input,
      errorMessage: message,
    });
    throw err;
  }
}

/**
 * DigiSol-only AI SDK tools. Context is closed over so models cannot pass
 * another companyId or escape the house profile.
 */
export function createDigisolAgentTools(ctx: DigisolAgentContext) {
  return {
    getDigisolBrandProfile: tool({
      description:
        "Fetch DigiSol's branding from Supabase: tone, voice, tagline, domain, colors, visual sizes, words to lean on, words to avoid, and brand notes. DigiSol-only — no company selector.",
      inputSchema: z.object({}),
      execute: async () =>
        withToolLog(ctx, "getDigisolBrandProfile", {}, async () => ({
          operator: DIGISOL_OPERATOR.name,
          clientId: ctx.clientId,
          companyName: ctx.companyName,
          domain: ctx.domain,
          siteKey: ctx.siteKey,
          notes: ctx.notes,
          branding: {
            tagline: ctx.brand.tagline,
            tone: ctx.brand.voice,
            voice: ctx.brand.voice,
            audience: ctx.brand.audience,
            wordsToLeanOn: ctx.brand.doSay,
            wordsToAvoid: ctx.brand.dontSay,
            fonts: ctx.brand.fonts,
            visualStyle: ctx.brand.visualStyle,
            brandNotes: ctx.brand.extra,
            visualSizes: {
              note: "Official DigiSol logos: primary wordmark (/logo.jpg) and secondary circular badge (/logo-badge.png). Stamp official marks; do not ask the model to draw logos.",
              logoUrl: ctx.brand.logoUrl || "/logo.jpg",
              logoDescription: ctx.brand.logoDescription || null,
              secondaryLogoUrl:
                ctx.brand.secondaryLogoUrl || "/logo-badge.png",
              secondaryLogoDescription:
                ctx.brand.secondaryLogoDescription || null,
            },
            colors: {
              background: ctx.brand.backgroundColor,
              text: ctx.brand.textColor,
              highlights: ctx.brand.highlightColor,
              primary: ctx.brand.primaryColor,
              secondary: ctx.brand.secondaryColor,
              accent: ctx.brand.accentColor,
            },
          },
          brandKitPrompt: ctx.brandPrompt,
        })),
    }),

    runWebsiteAudit: tool({
      description:
        "Scan a URL for basic performance and SEO structure, then log findings under DigiSol's website_audits. Defaults to DigiSol's domain when url is omitted.",
      inputSchema: z.object({
        url: z
          .string()
          .optional()
          .describe(
            "Absolute URL to audit (https://…). Defaults to DigiSol's configured domain.",
          ),
      }),
      execute: async ({ url: rawUrl }) =>
        withToolLog(
          ctx,
          "runWebsiteAudit",
          { url: rawUrl ?? null },
          async () => {
          let url = (rawUrl || "").trim();
          if (!url) {
            url = ctx.domain.startsWith("http")
              ? ctx.domain
              : `https://${ctx.domain}`;
          }

          await ensureWebsiteAuditSchema().catch(() => null);
          const audit = await runWebsiteAudit(url);

          const { data: saved, error: saveError } = await ctx.supabase
            .from("website_audits")
            .insert({
              client_id: ctx.clientId,
              url: audit.url,
              final_url: audit.finalUrl,
              score: audit.score,
              ttfb_ms: audit.metrics.ttfbMs,
              total_ms: audit.metrics.totalMs,
              report: audit.report,
              raw: {
                seo: audit.seo,
                metrics: audit.metrics,
                issues: audit.issues,
                status: audit.status,
                operator: DIGISOL_OPERATOR.name,
              },
            })
            .select(
              "id, client_id, url, final_url, score, ttfb_ms, total_ms, report, created_at",
            )
            .maybeSingle();

          return {
            operator: DIGISOL_OPERATOR.name,
            audit,
            report: audit.report,
            logged: Boolean(saved?.id),
            savedId: saved?.id ?? null,
            logError: saveError?.message ?? null,
          };
        },
          estimateToolCost("runWebsiteAudit"),
        ),
    }),

    fetchDigisolAnalytics: tool({
      description:
        "Pull DigiSol GA4 traffic/conversion metrics plus reconciled Hub + Resend email open/click stats. Strictly DigiSol house property only.",
      inputSchema: z.object({
        days: z
          .number()
          .int()
          .min(7)
          .max(30)
          .optional()
          .describe("Lookback window in days (7–30). Default 14."),
      }),
      execute: async ({ days: rawDays }) =>
        withToolLog(
          ctx,
          "fetchDigisolAnalytics",
          { days: rawDays ?? 14 },
          async () => {
            const days = Math.min(
              30,
              Math.max(7, typeof rawDays === "number" ? Math.floor(rawDays) : 14),
            );
            const since = new Date(
              Date.now() - days * 24 * 60 * 60 * 1000,
            ).toISOString();

            const scopedIds = await contactIdsForClient(
              ctx.supabase,
              ctx.clientId,
            );

            const [contacts, unsubscribed, site, leadsResult, ga4, email] =
              await Promise.all([
                ctx.supabase
                  .from("contacts")
                  .select("id", { count: "exact", head: true })
                  .eq("client_id", ctx.clientId),
                ctx.supabase
                  .from("contacts")
                  .select("id", { count: "exact", head: true })
                  .eq("client_id", ctx.clientId)
                  .not("unsubscribed_at", "is", null),
                ctx.supabase
                  .from("site_events")
                  .select(
                    "client_id, visitor_id, host, path, title, referrer, created_at",
                  )
                  .eq("client_id", ctx.clientId)
                  .gte("created_at", since)
                  .order("created_at", { ascending: false })
                  .limit(800),
                ctx.supabase
                  .from("leads")
                  .select(
                    "id, source, stage, estimated_value, actual_value, first_touch_at, closed_at, created_at",
                  )
                  .eq("client_id", ctx.clientId)
                  .order("created_at", { ascending: false })
                  .limit(500),
                fetchDigisolGa4Summary(days),
                reconcileHubEmailStats(ctx.supabase, scopedIds),
              ]);

            const website = summarizeSiteEvents(site.data ?? [], ctx.domain);
            const pipeline = summarizeLeadPerformance(
              (leadsResult.data ?? []) as LeadRecord[],
            );

            return {
              operator: DIGISOL_OPERATOR.name,
              days,
              email: {
                contacts: contacts.count ?? 0,
                unsubscribed: unsubscribed.count ?? 0,
                sends: email.sends,
                opened: email.opened,
                clicked: email.clicked,
                openRate: email.openRate,
                clickRate: email.clickRate,
                engagementSource: email.engagementSource,
                resendAccount: email.resend,
              },
              website,
              pipeline: {
                total: pipeline.total,
                open: pipeline.open,
                won: pipeline.won,
                lost: pipeline.lost,
                winRate: pipeline.winRate,
                pipelineValue: pipeline.pipelineValue,
                wonValue: pipeline.wonValue,
                byStage: pipeline.byStage,
              },
              ga4: {
                configured: ga4.configured,
                error: ga4.error ?? null,
                sessions: ga4.sessions,
                users: ga4.users,
                pageviews: ga4.pageviews,
                conversionHint:
                  ga4.sessions > 0
                    ? Math.round((pipeline.won / Math.max(ga4.sessions, 1)) * 10000) /
                      100
                    : 0,
                topPages: ga4.pages.slice(0, 8),
                sources: ga4.sources.slice(0, 8),
                locations: ga4.locations.slice(0, 8),
              },
            };
          },
        ),
    }),

    generateCampaignWorkflow: tool({
      description:
        "Read DigiSol brand rules and DigiSol contact segments, then build an A/B campaign structure (Variant A/B), channel config (email / cold_call / door_to_door / facebook / instagram / linkedin), and audience percentages. DigiSol CRM only.",
      inputSchema: z.object({
        campaignGoal: z
          .string()
          .min(1)
          .describe("Primary DigiSol campaign goal."),
        audience: z
          .string()
          .optional()
          .describe("Audience description when no CRM tag is used."),
        tag: z
          .string()
          .optional()
          .describe("Optional DigiSol CRM tag to sample contacts from."),
        channels: z
          .array(
            z.enum([
              "email",
              "cold_call",
              "door_to_door",
              "facebook",
              "instagram",
              "linkedin",
            ]),
          )
          .optional()
          .describe(
            "Channels to include. Default email + cold_call; social channels supported.",
          ),
        variantAPercent: z
          .number()
          .min(10)
          .max(90)
          .optional()
          .describe("Audience % for Variant A (rest goes to B). Default 50."),
        offer: z.string().optional().describe("Offer / CTA hint."),
        hypothesis: z
          .string()
          .optional()
          .describe("Optional A/B hypothesis seed."),
      }),
      execute: async (input) =>
        withToolLog(
          ctx,
          "generateCampaignWorkflow",
          input as Record<string, unknown>,
          async () => {            const tag = input.tag?.trim() || "";
            const audienceHint =
              input.audience?.trim() ||
              (tag ? `DigiSol contacts tagged ${tag}` : "DigiSol CRM contacts");
            const variantAPercent = Math.min(
              90,
              Math.max(10, Math.round(input.variantAPercent ?? 50)),
            );
            const channels = input.channels?.length
              ? input.channels
              : (["email", "cold_call"] as const);

            const { data: contactRows, error: contactError } = await ctx.supabase
              .from("contacts")
              .select("id, name, email, company, tags, service")
              .eq("client_id", ctx.clientId)
              .is("unsubscribed_at", null)
              .order("created_at", { ascending: false })
              .limit(80);

            if (contactError) throw new Error(contactError.message);

            let contacts = contactRows ?? [];
            if (tag) {
              const needle = tag.toLowerCase();
              contacts = contacts.filter((row) => {
                const tags = Array.isArray(row.tags)
                  ? row.tags.map((t) => String(t).toLowerCase())
                  : [];
                return tags.some((t) => t.includes(needle));
              });
            }

            const sample = contacts.slice(0, 24);
            const abAssignment = assignAbVariants(sample, variantAPercent);
            const countA = sample.filter(
              (c) => abAssignment.get(c.id) === "A",
            ).length;
            const countB = sample.length - countA;

            const brand = ctx.brand;
            const goal = input.campaignGoal.trim();
            const offer = input.offer?.trim() || "soft DigiSol consult booking";
            const hypothesis =
              input.hypothesis?.trim() ||
              "Variant B tests sharper proof vs Variant A's softer consult ask.";

            const variantA = {
              id: "A",
              label: "Variant A — consult-forward",
              subject: `Quick idea for ${DIGISOL_OPERATOR.name} growth`,
              angle: "Clear next step + engineering-meets-growth proof",
              bodyOutline: [
                `Hey {{name}},`,
                `Lead with DigiSol voice (${brand.voice.slice(0, 80)}…).`,
                `Goal: ${goal}.`,
                `CTA: ${offer}.`,
                `Lean on: ${brand.doSay}.`,
                `Avoid: ${brand.dontSay}.`,
              ].join("\n"),
              audiencePercent: variantAPercent,
            };

            const variantB = {
              id: "B",
              label: "Variant B — proof-forward",
              subject: "One DigiSol change worth testing",
              angle: "Specific conversion / SEO proof before the ask",
              bodyOutline: [
                `Hey {{name}},`,
                `Open with a concrete DigiSol outcome tied to ${goal}.`,
                `Differentiate proof vs Variant A (not synonyms).`,
                `CTA: ${offer}.`,
                `Stay inside DigiSol brand kit.`,
              ].join("\n"),
              audiencePercent: 100 - variantAPercent,
            };

            const channelConfig = channels.map((channel) => ({
              channel,
              enabled: true,
              notes:
                channel === "email"
                  ? "Primary DigiSol Resend path; use dispatchDigisolEmail after review."
                  : "Cold-call follow-up for high-intent DigiSol leads only — log outcomes in Hub.",
            }));

            return {
              operator: DIGISOL_OPERATOR.name,
              clientId: ctx.clientId,
              campaignGoal: goal,
              brandRules: {
                tagline: brand.tagline,
                voice: brand.voice,
                wordsToLeanOn: brand.doSay,
                wordsToAvoid: brand.dontSay,
              },
              audience: {
                description: audienceHint,
                matched: contacts.length,
                sampled: sample.length,
                tag: tag || null,
                abSplitPreview: { A: countA, B: countB },
                contacts: sample.map((c) => ({
                  id: c.id,
                  name: c.name,
                  company: c.company,
                  service: c.service,
                  tags: c.tags ?? [],
                  abVariant: abAssignment.get(c.id) || "A",
                })),
              },
              abTest: {
                hypothesis,
                variantA,
                variantB,
                audiencePercentages: {
                  A: variantAPercent,
                  B: 100 - variantAPercent,
                },
              },
              channels: channelConfig,
              nextStep:
                "Review A/B copy, then call dispatchDigisolEmail with confirmSend=true only when ready to send via Resend.",
            };
          },
          estimateToolCost("generateCampaignWorkflow"),
        ),
    }),

    dispatchDigisolEmail: tool({
      description:
        "Coordinate with Resend to push DigiSol personalized single sends or BCC blast campaigns. DigiSol contacts only. Dry-run unless confirmSend=true. Caps at 15 recipients per call.",
      inputSchema: z.object({
        mode: z
          .enum(["personalized", "bcc"])
          .describe("personalized = one send each; bcc = one message with BCC list."),
        subject: z.string().optional().describe("Email subject."),
        html: z.string().optional().describe("Email body HTML or plain text."),
        templateId: z
          .string()
          .optional()
          .describe("Optional DigiSol email_templates id when subject/html omitted."),
        contactIds: z
          .array(z.string())
          .optional()
          .describe("DigiSol CRM contact ids."),
        to: z
          .string()
          .optional()
          .describe("Comma/space separated emails when not using contactIds."),
        tag: z
          .string()
          .optional()
          .describe("Optional DigiSol audience tag filter."),
        campaignId: z.string().optional().describe("Optional campaign id."),
        confirmSend: z
          .boolean()
          .optional()
          .describe("Must be true to actually send via Resend."),
      }),
      execute: async (input) => {
        const confirmSend = input.confirmSend === true;
        const emailEstimate = Math.min(
          SEND_CAP,
          Array.isArray(input.contactIds) && input.contactIds.length
            ? input.contactIds.length
            : confirmSend
              ? SEND_CAP
              : 0,
        );
        const budget = confirmSend
          ? estimateToolCost("dispatchDigisolEmail", {
              emails: Math.max(1, emailEstimate),
            })
          : undefined;

        return withToolLog(
          ctx,
          "dispatchDigisolEmail",
          {
            mode: input.mode,
            confirmSend,
            recipientHint: input.contactIds?.length || input.to || input.tag || "crm",
          },
          async () => {
            const mode = input.mode === "bcc" ? "bcc" : "personalized";
            const subject = input.subject?.trim() || "";
            const html = input.html?.trim() || "";
            const templateId = input.templateId?.trim() || "";
            const campaignId = input.campaignId?.trim() || "";
            const tag = input.tag?.trim() || "";

            if (!subject && !html && !templateId) {
              throw new Error("Provide subject+html or templateId");
            }

            type ContactRow = {
              id: string;
              email: string;
              name?: string | null;
              company?: string | null;
              unsubscribed_at?: string | null;
            };

            const contacts: ContactRow[] = [];
            const contactIds = (input.contactIds ?? [])
              .map((id) => String(id).trim())
              .filter(Boolean);

            if (contactIds.length) {
              const { data, error } = await ctx.supabase
                .from("contacts")
                .select("id, email, name, company, unsubscribed_at")
                .eq("client_id", ctx.clientId)
                .in("id", contactIds.slice(0, SEND_CAP));
              if (error) throw new Error(error.message);
              for (const row of data ?? []) {
                if (!row.unsubscribed_at) contacts.push(row);
              }
            } else if (input.to?.trim()) {
              for (const email of parseRecipientList(input.to).slice(0, SEND_CAP)) {
                const contact = await findOrCreateContactForSend(ctx.supabase, {
                  email,
                  clientId: ctx.clientId,
                  companyName: ctx.companyName,
                });
                if (!contact.unsubscribed_at) contacts.push(contact);
              }
            } else {
              const { data, error } = await ctx.supabase
                .from("contacts")
                .select("id, email, name, company, unsubscribed_at, tags")
                .eq("client_id", ctx.clientId)
                .is("unsubscribed_at", null)
                .order("created_at", { ascending: false })
                .limit(SEND_CAP * 3);
              if (error) throw new Error(error.message);
              let rows = data ?? [];
              if (tag) {
                const needle = tag.toLowerCase();
                rows = rows.filter((row) => {
                  const tags = Array.isArray(row.tags)
                    ? row.tags.map((t) => String(t).toLowerCase())
                    : [];
                  return tags.some((t) => t.includes(needle));
                });
              }
              contacts.push(...rows.slice(0, SEND_CAP));
            }

            if (contacts.length === 0) {
              throw new Error("No DigiSol subscribed recipients matched");
            }

            const capped = contacts.slice(0, SEND_CAP);
            const from = parseFromAddress(getResendFrom());
            const preview = {
              operator: DIGISOL_OPERATOR.name,
              clientId: ctx.clientId,
              mode,
              confirmSend,
              from: from.email,
              recipientCount: capped.length,
              recipients: capped.map((c) => ({
                id: c.id,
                email: c.email,
                name: c.name,
              })),
              subject: subject || "(from template)",
              templateId: templateId || null,
              campaignId: campaignId || null,
            };

            if (!confirmSend) {
              return {
                ...preview,
                dryRun: true,
                message:
                  "Dry run only. Re-call dispatchDigisolEmail with the same payload and confirmSend=true to fire via Resend.",
              };
            }

            const logoSrc = await getEmailLogoUrl(ctx.supabase, ctx.clientId);
            const results: Array<{
              contactId: string;
              email: string;
              ok: boolean;
              error?: string;
            }> = [];

            if (mode === "bcc") {
              const [primary, ...rest] = capped;
              try {
                await sendEmailToContact({
                  contactId: primary.id,
                  contact: primary,
                  db: ctx.supabase,
                  subject: subject || undefined,
                  html: html || undefined,
                  templateId: templateId || undefined,
                  campaignId: campaignId || null,
                  companyName: ctx.companyName,
                  brand: ctx.brand,
                  clientId: ctx.clientId,
                  logoSrc,
                  bcc: rest.map((c) => c.email),
                });
                results.push({
                  contactId: primary.id,
                  email: primary.email,
                  ok: true,
                });
                for (const row of rest) {
                  results.push({
                    contactId: row.id,
                    email: row.email,
                    ok: true,
                  });
                }
              } catch (err) {
                results.push({
                  contactId: primary.id,
                  email: primary.email,
                  ok: false,
                  error: err instanceof Error ? err.message : "Send failed",
                });
              }
            } else {
              for (const contact of capped) {
                try {
                  await sendEmailToContact({
                    contactId: contact.id,
                    contact,
                    db: ctx.supabase,
                    subject: subject || undefined,
                    html: html || undefined,
                    templateId: templateId || undefined,
                    campaignId: campaignId || null,
                    companyName: ctx.companyName,
                    brand: ctx.brand,
                    clientId: ctx.clientId,
                    logoSrc,
                  });
                  results.push({
                    contactId: contact.id,
                    email: contact.email,
                    ok: true,
                  });
                } catch (err) {
                  results.push({
                    contactId: contact.id,
                    email: contact.email,
                    ok: false,
                    error: err instanceof Error ? err.message : "Send failed",
                  });
                }
              }
            }

            const failed = results.filter((r) => !r.ok);
            return {
              ...preview,
              dryRun: false,
              sent: results.filter((r) => r.ok).length,
              failed: failed.length,
              results,
              error: failed[0]?.error,
            };
          },
          budget,
        );
      },
    }),
  };
}

export type DigisolAgentTools = ReturnType<typeof createDigisolAgentTools>;
