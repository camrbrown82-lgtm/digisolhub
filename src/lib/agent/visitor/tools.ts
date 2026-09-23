import { tool } from "ai";
import { z } from "zod";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";
import { emitHubEvent } from "@/lib/events";
import { ensureWebsiteAuditSchema } from "@/lib/ensureWebsiteAuditSchema";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { ensureDigisolClient } from "@/lib/workspace";

const LEAD_TYPES = [
  "website_build",
  "marketing",
  "seo",
  "audit",
  "general",
  "other",
] as const;

export type VisitorLeadType = (typeof LEAD_TYPES)[number];

/**
 * Restricted public tools for the homepage visitor chatbot.
 * Always writes into DigiSol's house client — never creates external tenants.
 */
export function createVisitorAgentTools() {
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
        "Create or update a DigiSol Hub contact when the visitor shares email and what they need. Stores lead type + requirements. DigiSol CRM only.",
      inputSchema: z.object({
        email: z.string().email().describe("Visitor email address."),
        name: z.string().optional().describe("Visitor name if provided."),
        company: z.string().optional().describe("Their business name if provided."),
        phone: z.string().optional().describe("Phone if provided."),
        leadType: z
          .enum(LEAD_TYPES)
          .describe(
            "Lead type: website_build | marketing | seo | audit | general | other.",
          ),
        requirements: z
          .string()
          .min(3)
          .describe("What the visitor is looking for / project requirements."),
        websiteUrl: z
          .string()
          .optional()
          .describe("Their site URL if discussed."),
      }),
      execute: async (input) => {
        if (!hasAdminClient()) {
          throw new Error("Hub database is not configured");
        }
        const admin = createAdminClient();
        const clientId = await ensureDigisolClient(admin);
        if (!clientId) throw new Error("DigiSol profile missing");

        const email = input.email.trim().toLowerCase();
        const leadType = input.leadType;
        const requirements = input.requirements.trim();
        const domain = normalizeDomain(input.websiteUrl);

        const { data: existing } = await admin
          .from("contacts")
          .select("id, tags, notes_preview")
          .eq("client_id", clientId)
          .ilike("email", email)
          .maybeSingle();

        const tags = Array.from(
          new Set([
            ...((existing?.tags as string[] | null) ?? []),
            "lead",
            "visitor_chat",
            `lead_type:${leadType}`,
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

        let contactId = existing?.id as string | undefined;
        let created = false;

        if (existing?.id) {
          const { error } = await admin
            .from("contacts")
            .update(row)
            .eq("id", existing.id)
            .eq("client_id", clientId);
          if (error) throw new Error(error.message);
        } else {
          const { data, error } = await admin
            .from("contacts")
            .insert(row)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          contactId = data.id;
          created = true;
        }

        if (contactId) {
          await admin.from("notes").insert({
            contact_id: contactId,
            body: `[Visitor chat · ${leadTypeLabel(leadType)}]\n${requirements}`,
          });
        }

        if (contactId && created) {
          await emitHubEvent("hub/lead.created", { contactId }).catch(() => null);
        }

        // Best-effort pipeline lead row for DigiSol hub.
        if (contactId) {
          try {
            const { data: existingLead } = await admin
              .from("leads")
              .select("id")
              .eq("contact_id", contactId)
              .eq("client_id", clientId)
              .maybeSingle();

            if (!existingLead) {
              const { data: pipelineLead } = await admin
                .from("leads")
                .insert({
                  contact_id: contactId,
                  client_id: clientId,
                  name: row.name,
                  email,
                  phone: row.phone,
                  company: row.company,
                  service: row.service,
                  source: "website",
                  channel: "visitor_chat",
                  stage: "new",
                  notes_preview: requirements.slice(0, 280),
                })
                .select("id")
                .maybeSingle();

              if (pipelineLead?.id) {
                await admin.from("lead_activities").insert({
                  lead_id: pipelineLead.id,
                  type: "created",
                  body: requirements.slice(0, 500),
                  to_stage: "new",
                });
              }
            }
          } catch (err) {
            console.warn(
              "[visitor-agent] lead pipeline skipped",
              err instanceof Error ? err.message : err,
            );
          }
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
          output: { contactId, created },
        });

        return {
          operator: DIGISOL_OPERATOR.name,
          reportedToHub: true,
          contactId,
          created,
          leadType,
          leadTypeLabel: leadTypeLabel(leadType),
          email,
          requirementsPreview: requirements.slice(0, 160),
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
    case "general":
      return "General inquiry";
    default:
      return "Other";
  }
}
