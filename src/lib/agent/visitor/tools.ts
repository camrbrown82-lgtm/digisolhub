import { tool } from "ai";
import { z } from "zod";
import { runWebsiteAudit, type WebsiteAuditResult } from "@/lib/agent/websiteAudit";
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
import { sendLeadAlert } from "@/lib/leadAlert";
import { sendAuditFollowUpEmail, sendConsultationFollowUpEmail } from "@/lib/prospectAudit/followUpEmail";
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
        "Run an automated SEO/performance website audit when the visitor shares their URL. Logs findings into DigiSol Hub.",
      inputSchema: z.object({
        url: z
          .string()
          .min(4)
          .describe("Visitor website URL (https://example.com)."),
      }),
      execute: async ({ url: rawUrl }) => {
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
          },
        });

        await notifyOwnerOfVisitorAudit(admin, clientId, audit, saved?.id ?? null);

        return {
          operator: DIGISOL_OPERATOR.name,
          reportedToHub: Boolean(saved?.id),
          auditId: saved?.id ?? null,
          score: audit.score,
          scoreLabel: audit.report.scoreLabel,
          summary: audit.report.summary,
          strengths: audit.report.strengths.slice(0, 4),
          weaknesses: audit.report.weaknesses.slice(0, 5),
          issues: audit.issues.slice(0, 6),
          metrics: {
            ttfbMs: audit.metrics.ttfbMs,
            totalMs: audit.metrics.totalMs,
            https: audit.metrics.https,
          },
        };
      },
    }),

    captureVisitorLead: tool({
      description:
        "Create or update a DigiSol Hub contact + pipeline lead immediately when the visitor shares email. Use leadType=consultation for no-website / cost / unsure-what-they-need paths; audit when they had a site audit. Always call this as soon as you have an email.",
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

        if (contactId && (created || isFreshContact(existing?.created_at))) {
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
        "Re-send the audit breakdown (findings + soft DigiSol product ideas, no pricing). captureVisitorLead with leadType=audit already emails it — only use this when capture ran earlier in the chat and the visitor asks for the write-up again.",
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

/**
 * Email DigiSol as soon as Kaylev audits a site, even when the visitor
 * never leaves a name, email, or phone. Same host within two hours is one email.
 */
async function notifyOwnerOfVisitorAudit(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  audit: WebsiteAuditResult,
  savedId: string | null,
) {
  const site = (audit.finalUrl || audit.url || "").trim();
  if (!site) return;

  let host = site;
  try {
    host = new URL(site.startsWith("http") ? site : `https://${site}`).hostname.replace(
      /^www\./i,
      "",
    );
  } catch {
    host = site;
  }

  if (savedId) {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("website_audits")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", since)
      .ilike("final_url", `%${host}%`);
    if ((count ?? 0) > 1) return;
  }

  const score =
    typeof audit.score === "number" ? `Score ${audit.score}/100 (${audit.report.scoreLabel}).` : "";

  await sendLeadAlert({
    sourceLabel: "Kaylev website audit",
    name: host,
    company: host,
    service: score ? `Website audit · ${score}` : "Website audit",
    website: site.startsWith("http") ? site : `https://${site}`,
    note: "No name, email, or phone was left. This is the website Kaylev just audited.",
    message: [score, audit.report.summary].filter(Boolean).join(" "),
  }).catch((error) => {
    console.warn(
      "[visitor-agent] audit alert skipped",
      error instanceof Error ? error.message : error,
    );
  });
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
  const weaknesses =
    (report.weaknesses || []).slice(0, 5).filter(Boolean).length > 0
      ? (report.weaknesses || []).slice(0, 5)
      : (audit.raw?.issues || [])
          .map((issue) => issue.message || "")
          .filter(Boolean)
          .slice(0, 5);
  const strengths = (report.strengths || []).slice(0, 4).filter(Boolean);

  const sent = await sendAuditFollowUpEmail({
    db: input.admin,
    clientId: input.clientId,
    email: input.email,
    name: input.name,
    company: input.company,
    url: audit.url || input.websiteUrl || "",
    score: audit.score ?? 0,
    summary:
      report.summary ||
      getMessages(input.language).emails.defaultSummary(audit.url || input.websiteUrl || ""),
    weaknesses,
    strengths,
    source: "visitor_chat",
    language: input.language,
  });

  return {
    emailed: Boolean(sent.emailed),
    reason: "reason" in sent ? sent.reason : undefined,
    contactId: sent.contactId,
    sendId: sent.sendId,
    resendId: sent.resendId,
    auditId: audit.id,
    score: audit.score,
  };
}
