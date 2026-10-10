import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { ensureGoogleSetupSchema } from "@/lib/ensureGoogleSetupSchema";
import { errorMessage } from "@/lib/google/auth";
import {
  FIX_PRODUCT,
  applyGoogleFix,
  discoverGoogleAccess,
  houseDefaults,
  loadGoogleSetup,
  logGoogleFix,
  recentGoogleFixes,
  runGoogleAudit,
  saveGoogleAudit,
  saveGoogleIds,
  type GoogleCheck,
  type GoogleSetupIds,
} from "@/lib/google/audit";
import * as ads from "@/lib/google/adsApi";
import {
  KEYWORD_AREAS,
  findTrendingKeywords,
  loadAdGroups,
  writeSearchAd,
  type CompanyContext,
  type KeywordArea,
} from "@/lib/google/keywords";
import { brandFromClient } from "@/lib/branding";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { companySiteUrl, getWorkspaceClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scope() {
  const { supabase, user, error } = await requireHubSession();
  if (error) return { error } as const;
  const client = await getWorkspaceClient(supabase);
  if (!client) {
    return {
      error: NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 }),
    } as const;
  }
  await ensureGoogleSetupSchema().catch(() => null);
  const isHouse = client.name.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const defaults = isHouse ? houseDefaults() : undefined;
  const setup = await loadGoogleSetup(supabase, client.id, defaults);
  if (setup.needsMigration) {
    return {
      error: NextResponse.json(
        { error: "Run supabase/migrations/20261001000000_google_setup.sql in the Supabase SQL editor first." },
        { status: 409 },
      ),
    } as const;
  }
  return { supabase, user, client, setup, defaults } as const;
}

function reloadSetup(ctx: { supabase: Parameters<typeof loadGoogleSetup>[0]; client: { id: string }; defaults?: GoogleSetupIds }) {
  return loadGoogleSetup(ctx.supabase, ctx.client.id, ctx.defaults);
}

const text = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const MAX_CPC = 50;
const MAX_DAILY_BUDGET = 500;
const MAX_BID_KEYWORDS = 20;
const MATCH_TYPES: ads.KeywordMatchType[] = ["PHRASE", "EXACT", "BROAD"];

const KEYWORD_LOG: GoogleCheck = {
  id: "ads_trending_keywords",
  product: "ads",
  title: "Bid on trending keywords",
  status: "info",
  detail: "",
};

async function companyContext(client: {
  name: string;
  domain?: string | null;
  notes?: string | null;
  branding?: unknown;
}): Promise<CompanyContext> {
  const { companyName, brand } = brandFromClient(client);
  return {
    companyName,
    brand,
    siteUrl: companySiteUrl(client),
    notes: client.notes,
    published: await companyPublishedFacts(client),
  };
}

function adsAccount(setupIds: GoogleSetupIds) {
  const cid = ads.cleanCustomerId(setupIds.adsCustomerId);
  if (!cid) return { cid: "", error: "Link this company's Google Ads account above and save first." };
  if (!ads.adsApiReady()) {
    return { cid: "", error: "Google Ads isn't connected to the Hub yet. Set up the manager account first." };
  }
  return { cid, error: "" };
}

export async function GET(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  if (new URL(request.url).searchParams.get("discover")) {
    const discovered = await discoverGoogleAccess(ctx.client.domain);
    const adsCustomerId = ctx.setup.ids.adsCustomerId;
    if (adsCustomerId && !discovered.suggested.adsCustomerId) {
      discovered.suggested.adsCustomerId = adsCustomerId;
    }
    return NextResponse.json(discovered);
  }
  return NextResponse.json({
    setup: ctx.setup,
    fixes: await recentGoogleFixes(ctx.supabase, ctx.client.id),
  });
}

/**
 * `{ action: "save", ids }`, `{ action: "audit" }`, `{ action: "fix", checkId }`,
 * `{ action: "keywords", area }` or `{ action: "bid", keywords, matchType, area, adGroup | newCampaign }`.
 */
export async function POST(request: Request) {
  const ctx = await scope();
  if ("error" in ctx) return ctx.error;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    ids?: Partial<GoogleSetupIds>;
    checkId?: string;
    area?: string;
    keywords?: { text?: unknown; bid?: unknown }[];
    matchType?: string;
    adGroup?: string;
    newCampaign?: { dailyBudget?: unknown; enabled?: unknown };
  };
  const { supabase, client, setup } = ctx;

  try {
    if (body.action === "save") {
      const ids: GoogleSetupIds = {
        ga4PropertyId: text(body.ids?.ga4PropertyId, 40),
        searchConsoleSite: text(body.ids?.searchConsoleSite),
        adsCustomerId: text(body.ids?.adsCustomerId, 20),
      };
      await saveGoogleIds(supabase, client.id, ids);
      const audit = await runGoogleAudit(ids, client.domain);
      await saveGoogleAudit(supabase, client.id, audit);
      return NextResponse.json({ setup: await reloadSetup(ctx) });
    }

    if (body.action === "audit") {
      const audit = await runGoogleAudit(setup.ids, client.domain);
      await saveGoogleAudit(supabase, client.id, audit);
      return NextResponse.json({ setup: await reloadSetup(ctx) });
    }

    if (body.action === "fix") {
      const check = setup.audit?.checks.find((c) => c.id === body.checkId);
      if (!check?.fix) {
        return NextResponse.json({ error: "That fix is out of date. Run the check again." }, { status: 400 });
      }
      let message = "";
      try {
        message = (await applyGoogleFix(check, setup.ids)) || "Done.";
        await logGoogleFix(supabase, { clientId: client.id, check, ok: true, detail: message, userEmail: ctx.user?.email });
      } catch (error) {
        const detail = errorMessage(error);
        await logGoogleFix(supabase, { clientId: client.id, check, ok: false, detail, userEmail: ctx.user?.email });
        return NextResponse.json({ error: `Google refused: ${detail}` }, { status: 502 });
      }
      const audit = await runGoogleAudit(setup.ids, client.domain, {
        only: [FIX_PRODUCT[check.fix.kind]],
        previous: setup.audit,
      });
      await saveGoogleAudit(supabase, client.id, audit, { keepPrevious: true });
      return NextResponse.json({
        message,
        setup: await reloadSetup(ctx),
        fixes: await recentGoogleFixes(supabase, client.id),
      });
    }

    const area: KeywordArea = body.area === "canada" ? "canada" : "alberta";

    if (body.action === "keywords") {
      const account = adsAccount(setup.ids);
      if (!account.cid) return NextResponse.json({ error: account.error }, { status: 400 });
      const found = await findTrendingKeywords(
        account.cid,
        await companyContext(client),
        area,
        setup.ids.searchConsoleSite,
      );
      return NextResponse.json({ ...found, area });
    }

    if (body.action === "bid") {
      const account = adsAccount(setup.ids);
      if (!account.cid) return NextResponse.json({ error: account.error }, { status: 400 });
      const cid = account.cid;
      const matchType = MATCH_TYPES.find((m) => m === body.matchType) ?? "PHRASE";
      const picked = (body.keywords ?? [])
        .map((k) => ({ text: text(k.text, 80) ?? "", bid: Number(k.bid) }))
        .filter((k) => k.text && Number.isFinite(k.bid) && k.bid >= 0.05);
      if (!picked.length) return NextResponse.json({ error: "Pick at least one keyword with a bid." }, { status: 400 });
      if (picked.length > MAX_BID_KEYWORDS) {
        return NextResponse.json({ error: `Pick ${MAX_BID_KEYWORDS} keywords or fewer at a time.` }, { status: 400 });
      }
      if (picked.some((k) => k.bid > MAX_CPC)) {
        return NextResponse.json({ error: `Max bid is $${MAX_CPC} a click.` }, { status: 400 });
      }
      const bids = picked.map((k) => ({ text: k.text, cpcBidMicros: ads.toMicros(k.bid) }));
      const list = picked.map((k) => `"${k.text}" ($${k.bid.toFixed(2)})`).join(", ");

      let message = "";
      try {
        if (body.newCampaign) {
          const daily = Number(body.newCampaign.dailyBudget);
          if (!Number.isFinite(daily) || daily < 1 || daily > MAX_DAILY_BUDGET) {
            return NextResponse.json(
              { error: `Daily budget must be between $1 and $${MAX_DAILY_BUDGET}.` },
              { status: 400 },
            );
          }
          const company = await companyContext(client);
          if (!company.siteUrl) {
            return NextResponse.json({ error: "Add this company's website under Companies first. The ad links to it." }, { status: 400 });
          }
          const enabled = body.newCampaign.enabled === true;
          const ad = await writeSearchAd(company, picked.map((k) => k.text));
          const month = new Date().toLocaleString("en-CA", { month: "short", year: "numeric", timeZone: "America/Edmonton" });
          const name = `Kaylev trending keywords · ${KEYWORD_AREAS[area].label} · ${month} · ${Date.now().toString(36)}`;
          const created = await ads.createSearchCampaign(cid, {
            name,
            dailyBudgetMicros: ads.toMicros(daily),
            defaultCpcMicros: ads.toMicros(Math.max(...picked.map((k) => k.bid))),
            geoTargets: [...KEYWORD_AREAS[area].geoTargets],
            keywords: bids,
            matchType,
            finalUrl: company.siteUrl,
            headlines: ad.headlines,
            descriptions: ad.descriptions,
            enabled,
          });
          message = `New Search campaign "${name}" with ${picked.length} keyword${picked.length === 1 ? "" : "s"}, $${daily.toFixed(2)}/day in ${KEYWORD_AREAS[area].label}. ${
            enabled ? "It's live now." : "It's paused. Turn it on in Google Ads when the ad looks right."
          }${created.campaignId ? ` Campaign ID ${created.campaignId}.` : ""}`;
        } else {
          const adGroup = text(body.adGroup, 200) ?? "";
          const { adGroups } = await loadAdGroups(cid);
          const target = adGroups.find((g) => g.resourceName === adGroup);
          if (!target || !adGroup.startsWith(`customers/${cid}/adGroups/`)) {
            return NextResponse.json({ error: "That ad group isn't in this company's account. Find keywords again." }, { status: 400 });
          }
          const result = await ads.addAdGroupKeywords(
            cid,
            target.resourceName,
            target.manualCpc ? bids : bids.map(({ text: t }) => ({ text: t })),
            matchType,
          );
          message = `Added ${result.added} of ${picked.length} keyword${picked.length === 1 ? "" : "s"} to "${target.campaign} › ${target.name}".${
            target.manualCpc ? "" : " That campaign uses automated bidding, so Google sets the bids inside its budget."
          }${result.error ? ` Google skipped some: ${result.error}` : ""}`;
        }
        await logGoogleFix(supabase, {
          clientId: client.id,
          check: KEYWORD_LOG,
          ok: true,
          detail: `${message} Keywords: ${list}.`,
          userEmail: ctx.user?.email,
        });
      } catch (error) {
        const detail = errorMessage(error);
        await logGoogleFix(supabase, {
          clientId: client.id,
          check: KEYWORD_LOG,
          ok: false,
          detail: `${detail} Keywords: ${list}.`,
          userEmail: ctx.user?.email,
        });
        return NextResponse.json({ error: `Google refused: ${detail}` }, { status: 502 });
      }
      return NextResponse.json({ message, fixes: await recentGoogleFixes(supabase, client.id) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
