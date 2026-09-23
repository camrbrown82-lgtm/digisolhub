import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { fetchDigisolGa4Summary } from "@/lib/ga4";
import { summarizeLeadPerformance, type LeadRecord } from "@/lib/lead-pipeline";
import {
  fetchResendAccountMetrics,
} from "@/lib/resendStats";
import { summarizeSiteEvents } from "@/lib/site-analytics";
import { contactIdsForClient } from "@/lib/workspace";
import type { AgentToolDefinition } from "@/lib/agent/types";

export const fetchAnalytics: AgentToolDefinition = {
  name: "fetchAnalytics",
  description:
    "Analytics section tool. Pulls traffic, top pages/referrers, email open/click rates (Hub sends + live Resend account metrics), and lead pipeline health for the Working-on company. Includes DigiSol GA4 when that house property is configured.",
  parameters: {
    type: "object",
    properties: {
      days: {
        type: "integer",
        description: "Lookback window in days (7–30). Default 14.",
        minimum: 7,
        maximum: 30,
      },
    },
    additionalProperties: false,
  },
  execute: async (args, ctx) => {
    const days = Math.min(
      30,
      Math.max(7, typeof args.days === "number" ? Math.floor(args.days) : 14),
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: client } = await ctx.supabase
      .from("clients")
      .select("id, name, domain, site_key")
      .eq("id", ctx.clientId)
      .maybeSingle();

    const scopedIds = await contactIdsForClient(ctx.supabase, ctx.clientId);
    const emptySends = scopedIds.length === 0;

    // Do not backfill Resend email-by-email here — that stalls Hub/agent UX.
    // Opens/clicks come from the webhook; account metrics are a single timed call.

    let contactsQuery = ctx.supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", ctx.clientId);
    let unsubQuery = ctx.supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", ctx.clientId)
      .not("unsubscribed_at", "is", null);
    let sendsQuery = ctx.supabase.from("sends").select("id", { count: "exact", head: true });
    let openedQuery = ctx.supabase
      .from("sends")
      .select("id", { count: "exact", head: true })
      .not("opened_at", "is", null);
    let clickedQuery = ctx.supabase
      .from("sends")
      .select("id", { count: "exact", head: true })
      .not("clicked_at", "is", null);

    if (!emptySends) {
      sendsQuery = sendsQuery.in("contact_id", scopedIds);
      openedQuery = openedQuery.in("contact_id", scopedIds);
      clickedQuery = clickedQuery.in("contact_id", scopedIds);
    }

    const siteQuery = ctx.supabase
      .from("site_events")
      .select("client_id, visitor_id, host, path, title, referrer, created_at")
      .eq("client_id", ctx.clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(800);

    const leadsQuery = ctx.supabase
      .from("leads")
      .select(
        "id, source, stage, estimated_value, actual_value, first_touch_at, closed_at, created_at",
      )
      .eq("client_id", ctx.clientId)
      .order("created_at", { ascending: false })
      .limit(500);

    const isDigisol =
      (client?.name || ctx.companyName || "").toLowerCase() ===
      DIGISOL_HOUSE_NAME.toLowerCase();

    const [contacts, sends, opened, clicked, unsubscribed, site, leadsResult, resend] =
      await Promise.all([
        contactsQuery,
        emptySends ? Promise.resolve({ count: 0 }) : sendsQuery,
        emptySends ? Promise.resolve({ count: 0 }) : openedQuery,
        emptySends ? Promise.resolve({ count: 0 }) : clickedQuery,
        unsubQuery,
        siteQuery,
        leadsQuery,
        fetchResendAccountMetrics(days),
      ]);

    const ga4 = isDigisol ? await fetchDigisolGa4Summary(days) : null;

    const website = summarizeSiteEvents(site.data ?? [], client?.domain);
    const pipeline = summarizeLeadPerformance((leadsResult.data ?? []) as LeadRecord[]);
    const sendCount = sends.count ?? 0;
    const openCount = opened.count ?? 0;
    const clickCount = clicked.count ?? 0;

    const weakPages = website.pages
      .filter((page) => page.count > 0)
      .slice(0, 5)
      .map((page) => ({
        path: page.label,
        pageviews: page.count,
        note:
          page.label.includes("thank") || page.label.includes("success")
            ? "Conversion endpoint — check upstream drop-off"
            : "Review bounce/exit and CTA clarity",
      }));

    return {
      section: "analytics",
      companyName: ctx.companyName,
      days,
      email: {
        contacts: contacts.count ?? 0,
        unsubscribed: unsubscribed.count ?? 0,
        sends: sendCount,
        opened: openCount,
        clicked: clickCount,
        openRate: sendCount ? Math.round((openCount / sendCount) * 1000) / 10 : 0,
        clickRate: sendCount ? Math.round((clickCount / sendCount) * 1000) / 10 : 0,
        resendAccount: resend,
      },
      website,
      weakConversionHints: weakPages,
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
      ga4: ga4
        ? {
            configured: ga4.configured,
            error: ga4.error,
            sessions: ga4.sessions,
            users: ga4.users,
            pageviews: ga4.pageviews,
            topPages: ga4.pages.slice(0, 8),
            sources: ga4.sources.slice(0, 8),
            locations: ga4.locations.slice(0, 8),
          }
        : {
            configured: false,
            note: "Per-client GA4 wiring is not enabled; using Hub site_events + CRM metrics for this company.",
          },
    };
  },
};
