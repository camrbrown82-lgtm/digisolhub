import type { SupabaseClient } from "@supabase/supabase-js";
import { assignAbVariants } from "@/lib/campaignAb";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  getResendFrom,
  parseFromAddress,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { fetchDigisolGa4Summary } from "@/lib/ga4";
import { summarizeLeadPerformance, type LeadRecord } from "@/lib/lead-pipeline";
import {
  BRAND_COPY_TEMPERATURE,
  createOpenAIClient,
  getOpenAIApiKey,
} from "@/lib/openai";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { logAbVariantEngagement } from "@/lib/abVariantTracking";
import type { AgentAccessScope } from "@/lib/agent/master/accessScope";
import {
  companyBrandPrompt,
  resolveCompanyScope,
} from "@/lib/agent/master/companyScope";
import type { MasterToolName } from "@/lib/agent/master/schemas";
import { summarizeSiteEvents } from "@/lib/site-analytics";
import { contactIdsForClient } from "@/lib/workspace";
import { reconcileHubEmailStats } from "@/lib/resendStats";
import {
  WORKFLOW_BUILDER_SYSTEM_PROMPT,
  buildWorkflowUserPrompt,
  parseWorkflowAiResponse,
} from "@/lib/workflowAi";
import { AgentError } from "@/lib/agent/errors";
import {
  checkAgentBudget,
  estimateToolCost,
  recordAgentUsage,
} from "@/lib/agent/budget";

export type MasterToolContext = {
  supabase: SupabaseClient;
  /** Working-on company — used when tools omit/blank companyId. */
  workspaceClientId: string;
  userId: string;
  access: AgentAccessScope;
};

const SEND_CAP = 15;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function scopedCompany(
  args: Record<string, unknown>,
  ctx: MasterToolContext,
) {
  return resolveCompanyScope(
    ctx.supabase,
    asString(args.companyId),
    ctx.workspaceClientId,
    ctx.access,
  );
}

/** 1. Brand rules from Supabase for a specific company. */
export async function getCompanyProfileTool(
  args: Record<string, unknown>,
  ctx: MasterToolContext,
) {
  const scope = await scopedCompany(args, ctx);

  return {
    tool: "getCompanyProfile" as const,
    companyId: scope.companyId,
    companyName: scope.companyName,
    domain: scope.domain,
    siteKey: scope.siteKey,
    notes: scope.notes,
    brandRules: {
      tagline: scope.brand.tagline,
      voice: scope.brand.voice,
      audience: scope.brand.audience,
      tone: scope.brand.voice,
      doSay: scope.brand.doSay,
      wordsToAvoid: scope.brand.dontSay,
      fonts: scope.brand.fonts,
      visualStyle: scope.brand.visualStyle,
      visualSizes: {
        note: "Official logos are stamped on a brand-colored bar; do not ask the model to draw logos.",
        logoUrl: scope.brand.logoUrl || null,
        logoDescription: scope.brand.logoDescription || null,
        secondaryLogoUrl: scope.brand.secondaryLogoUrl || null,
        secondaryLogoDescription: scope.brand.secondaryLogoDescription || null,
      },
      colors: {
        background: scope.brand.backgroundColor,
        text: scope.brand.textColor,
        highlights: scope.brand.highlightColor,
        primary: scope.brand.primaryColor,
        secondary: scope.brand.secondaryColor,
        accent: scope.brand.accentColor,
      },
    },
    brandKitPrompt: companyBrandPrompt(scope),
  };
}

/** 2. Structural/SEO website audit. */
export async function runWebsiteAuditTool(
  args: Record<string, unknown>,
  _ctx: MasterToolContext,
) {
  const url = asString(args.url);
  if (!url) throw new AgentError("url is required", 400, "missing_url");
  const audit = await runWebsiteAudit(url);
  return {
    tool: "runWebsiteAudit" as const,
    audit,
    report: audit.report,
  };
}

/** 3. Analytics via site_events + GA4 (DigiSol house) + reconciled CRM email metrics. */
export async function fetchCompanyAnalyticsTool(
  args: Record<string, unknown>,
  ctx: MasterToolContext,
) {
  const scope = await scopedCompany(args, ctx);
  const days = Math.min(
    30,
    Math.max(7, typeof args.days === "number" ? Math.floor(args.days) : 14),
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const scopedIds = await contactIdsForClient(ctx.supabase, scope.companyId);

  const [contacts, unsubscribed, site, leadsResult, email] = await Promise.all([
    ctx.supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", scope.companyId),
    ctx.supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", scope.companyId)
      .not("unsubscribed_at", "is", null),
    ctx.supabase
      .from("site_events")
      .select("client_id, visitor_id, host, path, title, referrer, created_at")
      .eq("client_id", scope.companyId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(4000),
    ctx.supabase
      .from("leads")
      .select(
        "id, source, stage, estimated_value, actual_value, first_touch_at, closed_at, created_at",
      )
      .eq("client_id", scope.companyId)
      .order("created_at", { ascending: false })
      .limit(2000),
    reconcileHubEmailStats(ctx.supabase, scopedIds),
  ]);

  const website = summarizeSiteEvents(site.data ?? [], scope.domain);
  const pipeline = summarizeLeadPerformance((leadsResult.data ?? []) as LeadRecord[]);
  const isDigisol =
    scope.companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const ga4 = isDigisol ? await fetchDigisolGa4Summary(days) : null;

  return {
    tool: "fetchCompanyAnalytics" as const,
    companyId: scope.companyId,
    companyName: scope.companyName,
    days,
    traffic: {
      pageviews: website.pageviews,
      visitors: website.visitors,
      topPages: website.pages.slice(0, 8),
      referrers: website.referrers.slice(0, 8),
      daily: website.daily,
    },
    conversion: {
      emailOpenRate: email.openRate,
      emailClickRate: email.clickRate,
      sends: email.sends,
      opened: email.opened,
      clicked: email.clicked,
      engagementSource: email.engagementSource,
      contacts: contacts.count ?? 0,
      unsubscribed: unsubscribed.count ?? 0,
      leadWinRate: pipeline.winRate,
      pipelineValue: pipeline.pipelineValue,
      byStage: pipeline.byStage,
    },
    weakPoints: website.pages.slice(0, 5).map((page) => ({
      path: page.label,
      pageviews: page.count,
      hint: "Review CTA clarity and exit intent on this path",
    })),
    ga4: ga4
      ? {
          configured: ga4.configured,
          error: ga4.error,
          sessions: ga4.sessions,
          users: ga4.users,
          pageviews: ga4.pageviews,
          sources: ga4.sources.slice(0, 8),
          pages: ga4.pages.slice(0, 8),
        }
      : {
          configured: false,
          note: "GA4 Data API is wired for DigiSol house; other companies use Hub site_events + CRM.",
        },
  };
}

/** 4. A/B campaign + workflow structure (stub persists optionally). */
export async function generateCampaignWorkflowTool(
  args: Record<string, unknown>,
  ctx: MasterToolContext,
) {
  const scope = await scopedCompany(args, ctx);
  const campaignGoal = asString(args.campaignGoal);
  if (!campaignGoal) {
    throw new AgentError("campaignGoal is required", 400, "missing_campaign_goal");
  }
  if (!getOpenAIApiKey()) {
    throw new AgentError("OPENAI_API_KEY is not configured", 503, "missing_api_key");
  }

  const channel = asString(args.channel) || "email";
  const audiencePercentA = Math.min(
    90,
    Math.max(
      10,
      typeof args.audiencePercentA === "number"
        ? Math.floor(args.audiencePercentA)
        : 50,
    ),
  );
  const save = args.save === true;

  const { data: contacts, error: contactError } = await ctx.supabase
    .from("contacts")
    .select("id, name, email, company, tags, service")
    .eq("client_id", scope.companyId)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: false })
    .limit(40);
  if (contactError) throw new AgentError(contactError.message, 400, "contacts_failed");

  const sample = contacts ?? [];
  const assignment = assignAbVariants(sample, audiencePercentA);
  const brandPrompt = companyBrandPrompt(scope);
  const openai = createOpenAIClient();

  const [workflowCompletion, abCompletion] = await Promise.all([
    openai.chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: 0.35,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WORKFLOW_BUILDER_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildWorkflowUserPrompt({
            goal: campaignGoal,
            audience: `${sample.length} subscribed contacts · channel ${channel}`,
            companyName: scope.companyName,
            notes: brandPrompt,
          }),
        },
      ],
    }),
    openai.chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: 1100,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Write A/B email variants inside this brand kit:\n${brandPrompt}\nReturn JSON: {"subjectA","bodyA","subjectB","bodyB","hypothesis"}. Soft CTA, 80–140 word bodies.`,
        },
        {
          role: "user",
          content: `Goal: ${campaignGoal}\nChannel: ${channel}\nAudience %A: ${audiencePercentA}`,
        },
      ],
    }),
  ]);

  const plan = parseWorkflowAiResponse(
    workflowCompletion.choices[0]?.message?.content?.trim() || "{}",
  );
  let ab: {
    subjectA: string;
    bodyA: string;
    subjectB: string;
    bodyB: string;
    hypothesis: string;
  };
  try {
    ab = JSON.parse(abCompletion.choices[0]?.message?.content || "{}") as typeof ab;
  } catch {
    ab = {
      subjectA: "A quick idea",
      bodyA: "Hey {{name}},\n\nWanted to share a clear next step.",
      subjectB: "Worth a look",
      bodyB: "Hey {{name}},\n\nA small change could lift replies.",
      hypothesis: "B tests sharper proof vs A's softer ask.",
    };
  }

  let workflowId: string | null = null;
  let campaignId: string | null = null;

  if (save) {
    const { data: workflow, error: wfError } = await ctx.supabase
      .from("workflows")
      .insert({
        name: plan.name,
        trigger: plan.trigger,
        graph: plan.graph,
        enabled: false,
        client_id: scope.companyId,
      })
      .select("id")
      .single();
    if (wfError) throw new AgentError(wfError.message, 400, "workflow_save_failed");
    workflowId = workflow.id;

    const { data: campaign, error: campError } = await ctx.supabase
      .from("campaigns")
      .insert({
        name: plan.name,
        status: "draft",
        is_ab: true,
        ab_split: audiencePercentA,
        client_id: scope.companyId,
        segment: {
          mode: "all",
          channel,
          workflowId,
          goal: campaignGoal,
        },
      })
      .select("id")
      .single();
    if (campError) {
      // Campaign schema may not have all columns — still return the plan.
      console.error("generateCampaignWorkflow campaign stub", campError.message);
    } else {
      campaignId = campaign.id;
    }
  }

  return {
    tool: "generateCampaignWorkflow" as const,
    companyId: scope.companyId,
    companyName: scope.companyName,
    campaignGoal,
    structure: {
      channel,
      audiencePercentA,
      audiencePercentB: 100 - audiencePercentA,
      variants: {
        A: {
          subject: ab.subjectA?.trim() || "Variant A",
          body: ab.bodyA?.trim() || "",
          assignedContacts: sample.filter((c) => assignment.get(c.id) === "A").length,
        },
        B: {
          subject: ab.subjectB?.trim() || "Variant B",
          body: ab.bodyB?.trim() || "",
          assignedContacts: sample.filter((c) => assignment.get(c.id) === "B").length,
        },
      },
      hypothesis: ab.hypothesis?.trim() || "",
      audienceSampleSize: sample.length,
    },
    workflow: {
      name: plan.name,
      trigger: plan.trigger,
      summary: plan.summary,
      tags: plan.tags,
      graph: plan.graph,
      id: workflowId,
    },
    campaignId,
    saved: save,
    nextStep:
      "Review variants, then call dispatchEmailCampaign with campaignId + variantData.confirmSend=true when ready to send.",
  };
}

/** 5. Resend dispatch for a campaign (dry-run by default). */
export async function dispatchEmailCampaignTool(
  args: Record<string, unknown>,
  ctx: MasterToolContext,
) {
  const campaignId = asString(args.campaignId);
  if (!campaignId) {
    throw new AgentError("campaignId is required", 400, "missing_campaign_id");
  }
  const variantData = asObject(args.variantData);
  const mode = variantData.mode === "bcc" ? "bcc" : "personalized";
  const confirmSend = variantData.confirmSend === true;
  const variant = asString(variantData.variant) || "both";
  const limit = Math.min(
    SEND_CAP,
    Math.max(1, typeof variantData.limit === "number" ? Math.floor(variantData.limit) : SEND_CAP),
  );

  const { data: campaign, error: campaignError } = await ctx.supabase
    .from("campaigns")
    .select("id, name, client_id, template_id, template_b_id, is_ab, segment, status")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    throw new AgentError(campaignError.message, 400, "campaign_lookup_failed");
  }
  if (!campaign) {
    throw new AgentError(`Campaign not found: ${campaignId}`, 404, "campaign_not_found");
  }

  const companyId =
    (campaign.client_id as string | null) || ctx.workspaceClientId;
  const scope = await resolveCompanyScope(
    ctx.supabase,
    companyId,
    ctx.workspaceClientId,
    ctx.access,
  );

  const { data: contacts, error: contactError } = await ctx.supabase
    .from("contacts")
    .select("id, email, name, company, unsubscribed_at")
    .eq("client_id", scope.companyId)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (contactError) throw new AgentError(contactError.message, 400, "contacts_failed");

  const recipients = contacts ?? [];
  if (recipients.length === 0) {
    throw new AgentError("No subscribed recipients for this company", 400, "no_recipients");
  }

  const subject = asString(variantData.subject);
  const html = asString(variantData.html);
  const templateId =
    asString(variantData.templateId) ||
    (campaign.template_id as string | null) ||
    "";
  const templateAId =
    asString(variantData.templateAId) ||
    (campaign.template_id as string | null) ||
    "";
  const templateBId =
    asString(variantData.templateBId) ||
    (campaign.template_b_id as string | null) ||
    "";

  if (!subject && !html && !templateId && !templateAId) {
    throw new AgentError(
      "variantData needs subject+html or templateId / templateAId",
      400,
      "missing_copy",
    );
  }

  const from = parseFromAddress(getResendFrom());
  const preview = {
    tool: "dispatchEmailCampaign" as const,
    campaignId,
    campaignName: campaign.name,
    companyId: scope.companyId,
    mode,
    variant,
    confirmSend,
    from: from.email,
    recipientCount: recipients.length,
    recipients: recipients.map((r) => ({ id: r.id, email: r.email, name: r.name })),
  };

  if (!confirmSend) {
    return {
      ...preview,
      dryRun: true,
      message:
        "Dry run only. Re-call with variantData.confirmSend=true to fire via Resend.",
    };
  }

  const logoSrc = await getEmailLogoUrl(ctx.supabase, scope.companyId);
  const assignment = assignAbVariants(recipients, 50);
  const results: Array<{
    contactId: string;
    email: string;
    variant?: string;
    ok: boolean;
    error?: string;
  }> = [];

  if (mode === "bcc") {
    const [primary, ...rest] = recipients;
    try {
      const sent = await sendEmailToContact({
        contactId: primary.id,
        contact: primary,
        db: ctx.supabase,
        subject: subject || undefined,
        html: html || undefined,
        templateId: templateId || templateAId || undefined,
        campaignId,
        companyName: scope.companyName,
        brand: scope.brand,
        clientId: scope.companyId,
        logoSrc,
        bcc: rest.map((r) => r.email),
        variant: variant === "B" ? "B" : "A",
      });
      for (const row of recipients) {
        const arm = (assignment.get(row.id) || "A") as string;
        results.push({
          contactId: row.id,
          email: row.email,
          variant: arm,
          ok: true,
        });
        await logAbVariantEngagement(ctx.supabase, {
          sendId: sent.sendId || sent.resendId || row.id,
          contactId: row.id,
          campaignId,
          variant: arm,
          event: "sent",
        }).catch(() => null);
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
    for (const contact of recipients) {
      const arm = assignment.get(contact.id) || "A";
      if (variant === "A" && arm !== "A") continue;
      if (variant === "B" && arm !== "B") continue;
      const tpl =
        arm === "B"
          ? templateBId || templateId || templateAId
          : templateAId || templateId || templateBId;
      try {
        const sent = await sendEmailToContact({
          contactId: contact.id,
          contact,
          db: ctx.supabase,
          subject: subject || undefined,
          html: html || undefined,
          templateId: tpl || undefined,
          campaignId,
          companyName: scope.companyName,
          brand: scope.brand,
          clientId: scope.companyId,
          logoSrc,
          variant: arm,
        });
        results.push({
          contactId: contact.id,
          email: contact.email,
          variant: arm,
          ok: true,
        });
        await logAbVariantEngagement(ctx.supabase, {
          sendId: sent.sendId || sent.resendId || contact.id,
          contactId: contact.id,
          campaignId,
          variant: arm,
          event: "sent",
        }).catch(() => null);
      } catch (err) {
        results.push({
          contactId: contact.id,
          email: contact.email,
          variant: arm,
          ok: false,
          error: err instanceof Error ? err.message : "Send failed",
        });
      }
    }
  }

  await ctx.supabase
    .from("campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId);

  const failed = results.filter((r) => !r.ok);
  return {
    ...preview,
    dryRun: false,
    sent: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
    error: failed[0]?.error,
  };
}

export async function executeMasterTool(
  name: string,
  rawArgs: string,
  ctx: MasterToolContext,
): Promise<{ name: string; arguments: Record<string, unknown>; result: unknown }> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs?.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    throw new AgentError(
      `Tool "${name}" received invalid JSON arguments`,
      400,
      "invalid_tool_args",
    );
  }

  const handlers: Record<
    MasterToolName,
    (a: Record<string, unknown>, c: MasterToolContext) => Promise<unknown>
  > = {
    getCompanyProfile: getCompanyProfileTool,
    runWebsiteAudit: runWebsiteAuditTool,
    fetchCompanyAnalytics: fetchCompanyAnalyticsTool,
    generateCampaignWorkflow: generateCampaignWorkflowTool,
    dispatchEmailCampaign: dispatchEmailCampaignTool,
  };

  const handler = handlers[name as MasterToolName];
  if (!handler) {
    throw new AgentError(`Unknown master tool: ${name}`, 400, "unknown_tool");
  }

  const companyId =
    asString(args.companyId) || ctx.workspaceClientId;
  const heavy =
    name === "runWebsiteAudit" ||
    name === "generateCampaignWorkflow" ||
    name === "dispatchEmailCampaign";

  try {
    if (heavy) {
      const confirmSend = args.confirmSend === true;
      if (name === "dispatchEmailCampaign" && !confirmSend) {
        // dry-run free
      } else {
        await checkAgentBudget(
          companyId,
          estimateToolCost(
            name === "dispatchEmailCampaign"
              ? "dispatchEmailCampaign"
              : name,
            {
              emails:
                name === "dispatchEmailCampaign" && confirmSend ? 1 : undefined,
            },
          ),
          {
            supabase: ctx.supabase,
            userId: ctx.userId,
            toolName: name,
            invocation: "manual",
            throwOnDeny: true,
          },
        );
      }
    }

    const result = await handler(args, ctx);

    if (heavy) {
      const confirmSend = args.confirmSend === true;
      if (!(name === "dispatchEmailCampaign" && !confirmSend)) {
        await recordAgentUsage(
          companyId,
          {
            ...estimateToolCost(
              name === "dispatchEmailCampaign"
                ? "dispatchEmailCampaign"
                : name,
              {
                emails:
                  name === "dispatchEmailCampaign" && confirmSend ? 1 : undefined,
              },
            ),
            toolName: name,
          },
          { supabase: ctx.supabase, userId: ctx.userId, invocation: "manual" },
        );
      }
    }

    return { name, arguments: args, result };
  } catch (err) {
    if (err instanceof AgentError) throw err;
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return { name, arguments: args, result: { ok: false, error: message } };
  }
}
