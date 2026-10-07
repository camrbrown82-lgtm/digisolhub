import { tool } from "ai";
import { z } from "zod";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";
import { logAnalyticsEvent } from "@/lib/analyticsEvents";
import { emitHubEvent } from "@/lib/events";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { ensureWebsiteAuditSchema } from "@/lib/ensureWebsiteAuditSchema";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  attributionTags,
  isGoogleAdsTouch,
  type AttributionPayload,
} from "@/lib/meta/attribution";
import { recordAward } from "@/lib/awardRegistry";
import { sendAuditFollowUpEmail, sendConsultationFollowUpEmail } from "@/lib/prospectAudit/followUpEmail";
import { AWARD_MIN_SCORE } from "@/lib/websiteAward";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { ensureDigisolClient } from "@/lib/workspace";

const LEAD_TYPES = [
  "website_build",
  "marketing",
  "seo",
  "audit",
  "consultation",
  "general",
  "other",
] as const;

export type VisitorLeadType = (typeof LEAD_TYPES)[number];

/**
 * Restricted public tools for the homepage visitor chatbot.
 * Always writes into DigiSol's house client — never creates external tenants.
 */
export function createVisitorAgentTools(
  opts: { attribution?: AttributionPayload | null; language?: Locale } = {},
) {
  const attr = opts.attribution ?? null;
  const fromGoogleAds = attr ? isGoogleAdsTouch(attr) : false;
  const emailLanguage = (requested?: Locale) => requested ?? opts.language ?? DEFAULT_LOCALE;
  const languageTags = (language: Locale) =>
    language === DEFAULT_LOCALE ? [] : [`lang:${language}`];
  const languageInput = z
    .enum(LOCALES)
    .optional()
    .describe("Language the visitor is chatting in; emails go out in this language.");
  return {
    runVisitorWebsiteAudit: tool({
      description:
        "Run a free website audit only after the visitor has given BOTH their website URL and the email address to send the results to. Never call this with only a URL. It emails the full results immediately, saves the Hub lead, and starts the 14-day audited-prospect follow-up. Do not also call captureVisitorLead for the same person.",
      inputSchema: z.object({
        url: z
          .string()
          .min(4)
          .describe("Visitor website URL (https://example.com)."),
        email: z
          .string()
          .email()
          .describe("Required. Where to email the audit. The audit does not run without it."),
        name: z.string().optional().describe("Visitor name if they gave one."),
        company: z.string().optional().describe("Business name if they gave one."),
        phone: z.string().optional().describe("Phone if they gave one."),
        language: languageInput,
      }),
      execute: async ({ url: rawUrl, email: rawEmail, name, company, phone, language: requestedLanguage }) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        let url = rawUrl.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

        await ensureWebsiteAuditSchema().catch(() => null);
        const audit = await runWebsiteAudit(url);

        const { data: saved } = await admin
          .from("website_audits")
          .insert({
            client_id: clientId,
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
              source: "visitor_chat",
              operator: DIGISOL_OPERATOR.name,
            },
          })
          .select("id, score, url, final_url, created_at")
          .maybeSingle();

        await logAgentActivity({
          supabase: admin,
          clientId,
          action: "visitor:website_audit",
          toolName: "runVisitorWebsiteAudit",
          status: "ok",
          input: { url },
          output: {
            auditId: saved?.id ?? null,
            score: audit.score,
            summary: audit.report.summary,
          },
        });

        await logAnalyticsEvent(admin, {
          companyId: clientId,
          eventType: "website_audit_run",
          channel: "email",
          success: true,
          tokenCost: 800,
          source: "visitor_chat",
          metadata: {
            auditId: saved?.id ?? null,
            score: audit.score,
            url: audit.url,
            email: rawEmail.trim().toLowerCase(),
          },
        });

        const language = emailLanguage(requestedLanguage);
        const email = rawEmail.trim().toLowerCase();
        const followUp = await sendVisitorAuditEmail({
          admin,
          clientId,
          email,
          name,
          company,
          websiteUrl: url,
          auditId: saved?.id ?? null,
          language,
        });

        if (followUp.contactId && phone?.trim()) {
          await admin
            .from("contacts")
            .update({ phone: phone.trim() })
            .eq("id", followUp.contactId);
        }
        if (followUp.contactId) {
          await stampVisitorAttribution(admin, followUp.contactId, attr);
        }

        const resultsEmailed = Boolean(followUp.emailed);
        const alreadyEmailed = String(followUp.reason || "").startsWith("already_emailed");
        if (followUp.contactId && (resultsEmailed || alreadyEmailed)) {
          await emitHubEvent("hub/lead.created", { contactId: followUp.contactId }).catch(() => null);
          await logAnalyticsEvent(admin, {
            companyId: clientId,
            eventType: "visitor_chat_lead",
            channel: "email",
            success: true,
            contactId: followUp.contactId,
            source: "visitor_chat",
            metadata: {
              leadType: "audit",
              email,
              auditId: saved?.id ?? null,
              score: audit.score,
            },
          });
        }

        const awardEarned = audit.score >= AWARD_MIN_SCORE;
        return {
          operator: DIGISOL_OPERATOR.name,
          reportedToHub: Boolean(followUp.contactId && (resultsEmailed || alreadyEmailed)),
          leadCaptured: Boolean(followUp.contactId && (resultsEmailed || alreadyEmailed)),
          resultsEmailed,
          nurture: resultsEmailed
            ? "Results emailed. They are in the 14-day audited prospect follow-up (day 2, day 6, day 13). Do not call captureVisitorLead."
            : alreadyEmailed
              ? "Results were already emailed in the last 24 hours. Do not send another copy."
              : "The audit ran but the results email did not send. Say so and ask them to try the email again. Do not paste the full report.",
          auditId: saved?.id ?? null,
          score: audit.score,
          scoreLabel: audit.report.scoreLabel,
          award: {
            name: "DigiSol Excellence Award",
            minimumScore: AWARD_MIN_SCORE,
            checks: "speed, security, and SEO",
            earned: awardEarned,
            tellThem: !resultsEmailed && !alreadyEmailed
              ? "The results email did not send. Do not quote a score as if they have it."
              : awardEarned
                ? "They earned the badge. It is already in the email. Mention the score and that the badge is in their inbox. Do not paste the full audit."
                : `They did not earn the badge. ${AWARD_MIN_SCORE}+ is required. Mention the score and that the breakdown is in their inbox. Do not paste the full audit.`,
          },
        };
      },
    }),

    captureVisitorLead: tool({
      description:
        "Create or update a DigiSol Hub contact + pipeline lead when the visitor wants a consultation, a build, or anything other than a free website audit. For a free audit, call runVisitorWebsiteAudit with their URL and email instead — that tool already saves the lead, emails the results, and starts the 14-day follow-up. Do not call both.",
      inputSchema: z.object({
        email: z.string().email().describe("Visitor email address."),
        name: z.string().optional().describe("Visitor name if provided."),
        company: z.string().optional().describe("Their business name if provided."),
        phone: z.string().optional().describe("Phone if provided."),
        leadType: z
          .enum(LEAD_TYPES)
          .describe(
            "Lead type: consultation | website_build | marketing | seo | audit | general | other.",
          ),
        requirements: z
          .string()
          .min(3)
          .describe(
            "What they asked about. For cost/no-website, summarize briefly — do not invent technical requirements.",
          ),
        websiteUrl: z
          .string()
          .optional()
          .describe("Their site URL if discussed."),
        language: languageInput,
      }),
      execute: async (input) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        const language = emailLanguage(input.language);
        const email = input.email.trim().toLowerCase();
        const leadType = input.leadType;
        const requirements = input.requirements.trim();
        const domain = normalizeDomain(input.websiteUrl);

        const { data: existing } = await admin
          .from("contacts")
          .select("id, tags, notes_preview, created_at")
          .eq("client_id", clientId)
          .ilike("email", email)
          .maybeSingle();

        const tags = Array.from(
          new Set([
            ...((existing?.tags as string[] | null) ?? []),
            "lead",
            "visitor_chat",
            `lead_type:${leadType}`,
            ...(leadType === "consultation" ? ["consultation"] : []),
            ...(attr ? attributionTags(attr) : []),
            ...languageTags(language),
          ]),
        );

        const row = {
          name: input.name?.trim() || null,
          email,
          company: input.company?.trim() || null,
          domain,
          phone: input.phone?.trim() || null,
          service: leadTypeLabel(leadType),
          source: "visitor_chat",
          tags,
          notes_preview: requirements.slice(0, 280),
          client_id: clientId,
        };

        // Ad click ids ride along when present; retry without them on older DBs.
        const clickFields: Record<string, string> = {};
        if (attr?.gclid) clickFields.gclid = attr.gclid;
        if (attr?.gbraid) clickFields.gbraid = attr.gbraid;
        if (attr?.wbraid) clickFields.wbraid = attr.wbraid;
        if (attr?.utm_source) clickFields.utm_source = attr.utm_source;
        if (attr?.utm_medium) clickFields.utm_medium = attr.utm_medium;
        if (attr?.utm_campaign) clickFields.utm_campaign = attr.utm_campaign;
        if (attr?.utm_term) clickFields.utm_term = attr.utm_term;
        if (Object.keys(clickFields).length) {
          await ensureMetaSchema().catch(() => null);
        }
        const isColumnError = (message: string) => /column|schema cache/i.test(message);

        let contactId = existing?.id as string | undefined;
        let created = false;

        if (existing?.id) {
          let { error } = await admin
            .from("contacts")
            .update({ ...row, ...clickFields })
            .eq("id", existing.id)
            .eq("client_id", clientId);
          if (error && isColumnError(error.message)) {
            ({ error } = await admin
              .from("contacts")
              .update(row)
              .eq("id", existing.id)
              .eq("client_id", clientId));
          }
          if (error) throw new Error(error.message);
        } else {
          let { data, error } = await admin
            .from("contacts")
            .insert({ ...row, ...clickFields })
            .select("id")
            .single();
          if (error && isColumnError(error.message)) {
            ({ data, error } = await admin
              .from("contacts")
              .insert(row)
              .select("id")
              .single());
          }
          if (error || !data) throw new Error(error?.message || "Could not save lead");
          contactId = data.id;
          created = true;
        }

        if (contactId) {
          await admin.from("notes").insert({
            contact_id: contactId,
            body: `[Visitor chat · ${leadTypeLabel(leadType)}]\n${requirements}`,
          });
        }

        // Audit leads enroll only after runVisitorWebsiteAudit emails the results,
        // so they join the audited-prospect nurture instead of inbound.
        if (leadType !== "audit" && contactId && (created || isFreshContact(existing?.created_at))) {
          await emitHubEvent("hub/lead.created", { contactId }).catch(() => null);
        }

        let leadId: string | null = null;
        if (contactId) {
          leadId = await upsertVisitorPipelineLead({
            admin,
            clientId,
            contactId,
            row,
            email,
            leadType,
            requirements,
            fromGoogleAds,
          });
        }

        await logAgentActivity({
          supabase: admin,
          clientId,
          action: "visitor:lead_captured",
          toolName: "captureVisitorLead",
          status: "ok",
          input: {
            email,
            leadType,
            requirementsPreview: requirements.slice(0, 200),
          },
          output: { contactId, leadId, created },
        });

        await logAnalyticsEvent(admin, {
          companyId: clientId,
          eventType: "visitor_chat_lead",
          channel: "email",
          success: true,
          contactId: contactId ?? null,
          source: "visitor_chat",
          metadata: { leadType, created, email, leadId },
        });

        // Immediately email: audit write-up if audit path, else consult invite.
        let followUp: Record<string, unknown> | null = null;
        const wantsAuditEmail =
          leadType === "audit" ||
          (Boolean(input.websiteUrl?.trim()) && leadType !== "consultation");

        if (wantsAuditEmail && contactId) {
          followUp = await sendVisitorAuditEmail({
            admin,
            clientId,
            email,
            name: input.name,
            company: input.company,
            websiteUrl: input.websiteUrl,
            language,
          });
        } else if (contactId) {
          const consult = await sendConsultationFollowUpEmail({
            db: admin,
            clientId,
            email,
            name: input.name,
            company: input.company,
            phone: input.phone,
            requirements,
            leadType,
            language,
          });
          followUp = {
            emailed: consult.emailed,
            contactId: consult.contactId,
            kind: "consultation",
            reason: "reason" in consult ? consult.reason : undefined,
          };
        }

        return {
          operator: DIGISOL_OPERATOR.name,
          reportedToHub: true,
          contactId,
          leadId,
          created,
          leadType,
          leadTypeLabel: leadTypeLabel(leadType),
          email,
          requirementsPreview: requirements.slice(0, 160),
          followUpEmailed: Boolean(followUp?.emailed),
          followUpKind: wantsAuditEmail ? "audit" : "consultation",
          followUp,
        };
      },
    }),

    emailVisitorConsultationInvite: tool({
      description:
        "Fallback only: email a free consultation invite with Cameron when captureVisitorLead failed. captureVisitorLead already sends this invite — never call both for the same visitor.",
      inputSchema: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        requirements: z
          .string()
          .optional()
          .describe("Short note on what they asked (cost, new website, etc.)."),
        language: languageInput,
      }),
      execute: async (input) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        const language = emailLanguage(input.language);
        const email = input.email.trim().toLowerCase();
        const requirements =
          input.requirements?.trim() ||
          "Requested free consultation via Kaylev (cost / no website / unsure)";

        const result = await sendConsultationFollowUpEmail({
          db: admin,
          clientId,
          email,
          name: input.name,
          company: input.company,
          phone: input.phone,
          requirements,
          leadType: "consultation",
          language,
        });

        // Mirror capture tags/notes for Hub visibility.
        if (result.contactId) {
          const { data: existing } = await admin
            .from("contacts")
            .select("tags")
            .eq("id", result.contactId)
            .maybeSingle();
          const tags = Array.from(
            new Set([
              ...((existing?.tags as string[] | null) ?? []),
              "lead",
              "visitor_chat",
              "consultation",
              "lead_type:consultation",
              ...languageTags(language),
            ]),
          );
          await admin
            .from("contacts")
            .update({
              tags,
              service: "Free consultation",
              notes_preview: requirements.slice(0, 280),
            })
            .eq("id", result.contactId);

          await admin.from("notes").insert({
            contact_id: result.contactId,
            body: `[Visitor chat · Free consultation]\n${requirements}`,
          });
          await startWorkflowsIfNewContact(admin, result.contactId);
        }

        await logAgentActivity({
          supabase: admin,
          clientId,
          action: "visitor:consultation_invite_emailed",
          toolName: "emailVisitorConsultationInvite",
          status: result.emailed ? "ok" : "error",
          input: { email },
          output: result,
        });

        await logAnalyticsEvent(admin, {
          companyId: clientId,
          eventType: "visitor_chat_lead",
          channel: "email",
          success: true,
          contactId: result.contactId,
          source: "visitor_chat",
          metadata: { leadType: "consultation", email },
        });

        await logAnalyticsEvent(admin, {
          companyId: clientId,
          eventType: "email_sent",
          channel: "email",
          success: Boolean(result.emailed),
          contactId: result.contactId,
          source: "visitor_chat",
          metadata: {
            kind: "consultation_followup",
            email,
            reason: "reason" in result ? result.reason : null,
          },
        });

        return {
          operator: DIGISOL_OPERATOR.name,
          ...result,
          message: result.emailed
            ? "Free consultation invite emailed; contact and lead are in DigiSol Hub."
            : ("reason" in result && result.reason) ||
              "Could not send consultation email.",
        };
      },
    }),

    emailVisitorAuditBreakdown: tool({
      description:
        "Re-send the audit email. If the site scored 90 or higher, that email leads with the DigiSol Excellence Award badge. captureVisitorLead with leadType=audit already sends it — only use this when capture ran earlier and they ask for it again.",
      inputSchema: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        company: z.string().optional(),
        websiteUrl: z
          .string()
          .optional()
          .describe("Site URL from the audit conversation."),
        auditId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional website_audits id from runVisitorWebsiteAudit."),
        language: languageInput,
      }),
      execute: async (input) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        const result = await sendVisitorAuditEmail({
          admin,
          clientId,
          email: input.email.trim().toLowerCase(),
          name: input.name,
          company: input.company,
          websiteUrl: input.websiteUrl,
          auditId: input.auditId,
          language: emailLanguage(input.language),
        });
        if (result.contactId) {
          await startWorkflowsIfNewContact(admin, result.contactId);
        }

        await logAgentActivity({
          supabase: admin,
          clientId,
          action: "visitor:audit_followup_emailed",
          toolName: "emailVisitorAuditBreakdown",
          status: result.emailed ? "ok" : "error",
          input: { email: input.email, auditId: input.auditId ?? null },
          output: result,
        });

        await logAnalyticsEvent(admin, {
          companyId: clientId,
          eventType: "email_sent",
          channel: "email",
          success: Boolean(result.emailed),
          tokenCost: 0,
          source: "visitor_chat",
          metadata: {
            kind: "audit_followup",
            email: input.email,
            auditId: input.auditId ?? null,
            reason: result.reason ?? null,
          },
        });

        return {
          operator: DIGISOL_OPERATOR.name,
          ...result,
          message: result.emailed
            ? "Audit breakdown emailed with soft product ideas and Cameron consultation CTA."
            : result.reason || "Could not send audit email.",
        };
      },
    }),

    reportVisitorFindingsToHub: tool({
      description:
        "Report a concise summary of the visitor conversation (audit outcomes, interest, next step) into DigiSol Hub activity logs for the team.",
      inputSchema: z.object({
        summary: z
          .string()
          .min(8)
          .describe("Short operator-facing summary of the chat outcome."),
        visitorEmail: z.string().email().optional(),
        auditScore: z.number().optional(),
        leadType: z.enum(LEAD_TYPES).optional(),
        nextStep: z.string().optional(),
      }),
      execute: async (input) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        await logAgentActivity({
          supabase: admin,
          clientId,
          action: "visitor:findings_report",
          toolName: "reportVisitorFindingsToHub",
          status: "ok",
          input: {
            visitorEmail: input.visitorEmail ?? null,
            auditScore: input.auditScore ?? null,
            leadType: input.leadType ?? null,
          },
          output: {
            summary: input.summary.trim(),
            nextStep: input.nextStep?.trim() || null,
          },
          metadata: { source: "visitor_chat" },
        });

        return {
          operator: DIGISOL_OPERATOR.name,
          reportedToHub: true,
          message: "Findings logged to DigiSol Hub for the team.",
        };
      },
    }),
  };
}

function normalizeDomain(raw?: string) {
  const value = (raw || "").trim();
  if (!value) return null;
  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProto).hostname.replace(/^www\./, "") || null;
  } catch {
    return value.replace(/^https?:\/\//i, "").split("/")[0] || null;
  }
}

function leadTypeLabel(type: VisitorLeadType) {
  switch (type) {
    case "website_build":
      return "Custom website build";
    case "marketing":
      return "Growth marketing";
    case "seo":
      return "Local SEO";
    case "audit":
      return "Website audit";
    case "consultation":
      return "Free consultation";
    case "general":
      return "General inquiry";
    default:
      return "Other";
  }
}

async function upsertVisitorPipelineLead(input: {
  admin: ReturnType<typeof createAdminClient>;
  clientId: string;
  contactId: string;
  email: string;
  leadType: VisitorLeadType;
  requirements: string;
  fromGoogleAds?: boolean;
  row: {
    name: string | null;
    phone: string | null;
    company: string | null;
    service: string;
  };
}) {
  try {
    const stage =
      input.leadType === "consultation" || input.leadType === "audit"
        ? "contacted"
        : "new";

    const { data: existingLead } = await input.admin
      .from("leads")
      .select("id, stage")
      .eq("contact_id", input.contactId)
      .eq("client_id", input.clientId)
      .maybeSingle();

    if (existingLead?.id) {
      await input.admin
        .from("leads")
        .update({
          notes_preview: input.requirements.slice(0, 280),
          service: input.row.service,
          stage:
            existingLead.stage === "new" || !existingLead.stage
              ? stage
              : existingLead.stage,
        })
        .eq("id", existingLead.id);

      await input.admin.from("lead_activities").insert({
        lead_id: existingLead.id,
        type: "note",
        body: `[Kaylev] ${leadTypeLabel(input.leadType)} · ${input.requirements}`.slice(
          0,
          500,
        ),
        to_stage:
          existingLead.stage === "new" || !existingLead.stage
            ? stage
            : existingLead.stage,
      });
      return existingLead.id as string;
    }

    const { data: pipelineLead } = await input.admin
      .from("leads")
      .insert({
        contact_id: input.contactId,
        client_id: input.clientId,
        name: input.row.name,
        email: input.email,
        phone: input.row.phone,
        company: input.row.company,
        service: input.row.service,
        source: input.fromGoogleAds ? "google_ads" : "website",
        channel: "visitor_chat",
        stage,
        notes_preview: input.requirements.slice(0, 280),
      })
      .select("id")
      .maybeSingle();

    if (pipelineLead?.id) {
      await input.admin.from("lead_activities").insert({
        lead_id: pipelineLead.id,
        type: "created",
        body: input.requirements.slice(0, 500),
        to_stage: stage,
      });
      return pipelineLead.id as string;
    }
  } catch (err) {
    console.warn(
      "[visitor-agent] lead pipeline skipped",
      err instanceof Error ? err.message : err,
    );
  }
  return null;
}

/** Keep ad click ids on the lead so the audited-prospect nurture still attributes the ad. */
async function stampVisitorAttribution(
  admin: ReturnType<typeof createAdminClient>,
  contactId: string,
  attr: AttributionPayload | null,
) {
  if (!attr) return;
  const clickFields: Record<string, string> = {};
  if (attr.gclid) clickFields.gclid = attr.gclid;
  if (attr.gbraid) clickFields.gbraid = attr.gbraid;
  if (attr.wbraid) clickFields.wbraid = attr.wbraid;
  if (attr.utm_source) clickFields.utm_source = attr.utm_source;
  if (attr.utm_medium) clickFields.utm_medium = attr.utm_medium;
  if (attr.utm_campaign) clickFields.utm_campaign = attr.utm_campaign;
  if (attr.utm_term) clickFields.utm_term = attr.utm_term;
  const extraTags = attributionTags(attr);
  if (!Object.keys(clickFields).length && extraTags.length === 0) return;

  await ensureMetaSchema().catch(() => null);
  const { data } = await admin.from("contacts").select("tags").eq("id", contactId).maybeSingle();
  const tags = Array.from(new Set([...((data?.tags as string[] | null) ?? []), ...extraTags]));
  const patch = { ...clickFields, tags };
  let { error } = await admin.from("contacts").update(patch).eq("id", contactId);
  if (error && /column|schema cache/i.test(error.message)) {
    ({ error } = await admin.from("contacts").update({ tags }).eq("id", contactId));
  }
  if (error) {
    console.warn("[visitor-agent] attribution stamp skipped", error.message);
  }
}

function findingLine(item: unknown) {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  const row = item as { title?: unknown; detail?: unknown; message?: unknown };
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const detail = typeof row.detail === "string" ? row.detail.trim() : "";
  const message = typeof row.message === "string" ? row.message.trim() : "";
  if (title && detail) return `${title}: ${detail}`;
  return title || detail || message;
}

/** A contact made in this chat (possibly by a sibling tool call a moment ago). */
const FRESH_CONTACT_MS = 30 * 60 * 1000;

function isFreshContact(createdAt: unknown) {
  if (typeof createdAt !== "string") return false;
  return Date.now() - new Date(createdAt).getTime() < FRESH_CONTACT_MS;
}

/**
 * Kaylev may create the contact from any of its tools, in any order. Report the new
 * lead from each; Inngest starts workflows once per contact.
 */
async function startWorkflowsIfNewContact(
  admin: ReturnType<typeof createAdminClient>,
  contactId: string,
) {
  const { data } = await admin
    .from("contacts")
    .select("created_at")
    .eq("id", contactId)
    .maybeSingle();
  if (!isFreshContact(data?.created_at)) return;
  await emitHubEvent("hub/lead.created", { contactId }).catch(() => null);
}

async function sendVisitorAuditEmail(input: {
  admin: ReturnType<typeof createAdminClient>;
  clientId: string;
  email: string;
  name?: string | null;
  company?: string | null;
  websiteUrl?: string | null;
  auditId?: string | null;
  language: Locale;
}) {
  let auditQuery = input.admin
    .from("website_audits")
    .select("id, url, score, report, raw, created_at")
    .eq("client_id", input.clientId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.auditId) {
    auditQuery = input.admin
      .from("website_audits")
      .select("id, url, score, report, raw, created_at")
      .eq("client_id", input.clientId)
      .eq("id", input.auditId)
      .limit(1);
  }

  const { data: rows } = await auditQuery;
  let audit = rows?.[0] as
    | {
        id: string;
        url: string;
        score: number;
        report: {
          summary?: string;
          weaknesses?: string[];
          strengths?: string[];
        } | null;
        raw: { issues?: Array<{ message?: string }>; source?: string } | null;
      }
    | undefined;

  // Prefer matching URL if several recent audits exist.
  if (!input.auditId && input.websiteUrl) {
    const host = normalizeDomain(input.websiteUrl);
    if (host) {
      const { data: byUrl } = await input.admin
        .from("website_audits")
        .select("id, url, score, report, raw, created_at")
        .eq("client_id", input.clientId)
        .ilike("url", `%${host}%`)
        .order("created_at", { ascending: false })
        .limit(1);
      if (byUrl?.[0]) audit = byUrl[0] as typeof audit;
    }
  }

  if (!audit) {
    return {
      emailed: false,
      reason: "no_audit_found",
      contactId: undefined as string | undefined,
    };
  }

  const report = audit.report || {};
  const weaknessLines = (report.weaknesses || []).map(findingLine).filter(Boolean);
  const weaknesses =
    weaknessLines.length > 0
      ? weaknessLines.slice(0, 5)
      : (audit.raw?.issues || [])
          .map((issue) => findingLine(issue))
          .filter(Boolean)
          .slice(0, 5);
  const strengths = (report.strengths || []).map(findingLine).filter(Boolean).slice(0, 4);
  const awardEarned = (audit.score ?? 0) >= AWARD_MIN_SCORE;
  const companyName = input.company?.trim() || normalizeDomain(audit.url) || "";
  if (awardEarned) {
    await input.admin
      .from("website_audits")
      .update({
        raw: { ...(audit.raw || {}), source: "visitor_chat", companyName },
      })
      .eq("id", audit.id);
  }

  const sent = await sendAuditFollowUpEmail({
    db: input.admin,
    clientId: input.clientId,
    email: input.email,
    name: input.name,
    company: input.company || companyName,
    url: audit.url || input.websiteUrl || "",
    score: audit.score ?? 0,
    summary:
      report.summary ||
      getMessages(input.language).emails.defaultSummary(audit.url || input.websiteUrl || ""),
    weaknesses,
    strengths,
    source: "visitor_chat",
    language: input.language,
    awardId: awardEarned ? audit.id : undefined,
  });

  if (sent.emailed && awardEarned) {
    await recordAward(input.admin, {
      id: audit.id,
      source: "hub",
      companyName: companyName || audit.url,
      url: audit.url,
      score: audit.score ?? 0,
      auditId: audit.id,
      clientId: input.clientId,
      contactId: sent.contactId,
      sentTo: input.email,
      sentAt: new Date().toISOString(),
    });
  }

  return {
    emailed: Boolean(sent.emailed),
    reason: "reason" in sent ? sent.reason : undefined,
    contactId: sent.contactId,
    sendId: sent.sendId,
    resendId: sent.resendId,
    auditId: audit.id,
    score: audit.score,
    awardEarned,
    awardIncluded: Boolean(sent.emailed && awardEarned),
  };
}
