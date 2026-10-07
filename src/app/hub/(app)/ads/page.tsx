import { AdsRobot, type CampaignStats, type RobotPoster } from "@/components/hub/AdsRobot";
import { MetaAdsPanel } from "@/components/hub/MetaAdsPanel";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { ADS_ONLY_DIGISOL, DRAFT_COLUMNS, type AdDraftRow } from "@/lib/meta/adDrafts";
import { adAccountInfo, maxDailyBudget, metaPageId, type AdAccountInfo } from "@/lib/meta/ads";
import { adviceLabel, coachCampaigns } from "@/lib/meta/adsCoach";
import { metaAdAccountId } from "@/lib/meta/config";
import { emptyMetaAdsSummary, fetchMetaAdsSummary } from "@/lib/meta/insights";
import { emptyOpportunity, opportunityStatus } from "@/lib/meta/opportunity";
import { brandColourSwatches, brandFromClient } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceClient, isDigisolClient, resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const SETUP_STEPS = [
  "Business Settings → Users → System users → open Conversions API System User.",
  "Assign assets: ad account 1576410710460508 (full control), the Facebook Page, Instagram, and the dataset. Do this before generating the token.",
  "Generate a new token on that system user, expiry Never, with ads_read and ads_management. A Graph API Explorer token will not clear this.",
  "Replace META_CAPI_ACCESS_TOKEN in Vercel with that new token, then redeploy.",
];

const ADVICE_STYLE = {
  pause: "border-rose-400/40 bg-rose-500/10 text-rose-100",
  review: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  refresh: "border-sky-400/40 bg-sky-500/10 text-sky-100",
  scale: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
} as const;

export default async function AdsPage() {
  await Promise.race([ensureMetaSchema().catch(() => null), new Promise((resolve) => setTimeout(resolve, 3000))]);
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);

  if (!isDigisolClient(active)) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-white">Ads robot</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p>{ADS_ONLY_DIGISOL}</p>
          <p className="mt-2 text-amber-100/80">
            To run ads for {active?.name || "another company"}, they add DigiSol as a partner on their own Meta ad
            account, and that account gets connected to their company here. Their ads never touch DigiSol&apos;s.
          </p>
        </div>
      </div>
    );
  }

  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  const [account, summary, opportunity, draftsResult, postersResult] = await Promise.all([
    withTimeout<AdAccountInfo>(adAccountInfo(), 6000, { ok: false, error: "Meta did not answer in time." }),
    withTimeout(fetchMetaAdsSummary(14), 12000, {
      ...emptyMetaAdsSummary(14),
      error: "Meta Insights timed out. Refresh to try again.",
    }),
    withTimeout(opportunityStatus(), 12000, {
      ...emptyOpportunity(),
      error: "Meta did not answer in time. Refresh to try again.",
    }),
    supabase
      .from("meta_ad_drafts")
      .select(DRAFT_COLUMNS)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("assets")
      .select("public_url, caption, created_at")
      .eq("bucket", "ai-posters")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(18),
  ]);

  const currency = account.currency || "CAD";
  const money = (value: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  const drafts = (draftsResult.data ?? []) as unknown as AdDraftRow[];
  const posters: RobotPoster[] = (postersResult.data ?? [])
    .filter((row) => row.public_url)
    .map((row) => ({
      url: row.public_url as string,
      label: (row.caption as string | null)?.slice(0, 80) || new Date(row.created_at as string).toLocaleDateString("en-CA"),
    }));
  const stats: Record<string, CampaignStats> = Object.fromEntries(
    summary.campaigns.map((c) => [c.campaignId, { spend: c.spend, clicks: c.clicks, leads: c.leads, cpl: c.cpl }]),
  );
  const advice = coachCampaigns(summary.campaigns, money);
  const connected = account.ok && Boolean(metaPageId());
  const accountNumber = metaAdAccountId().replace(/^act_/, "");
  const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountNumber}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Ads robot</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Writes Facebook and Instagram campaigns in DigiSol&apos;s voice with your posters, creates them in Meta
          paused, and checks results every day. Nothing spends until you press Launch, and budgets are capped at{" "}
          {money(maxDailyBudget())} a day.
        </p>
      </div>

      {connected ? (
        <p className="text-sm text-emerald-300">
          Connected to {account.name || "the ad account"} ({currency}).
        </p>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Connect the Meta ad account</p>
          <p className="mt-1 text-amber-100/80">
            {account.error
              ? `Meta rejected the saved token: ${account.error}`
              : !metaPageId()
                ? "META_PAGE_ID is not set."
                : "Not connected."}{" "}
            You can still write drafts now; they&apos;ll be ready to send once this is fixed.
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-amber-100/80">
            {SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {connected ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
          <h2 className="text-lg font-semibold text-white">Opportunity score</h2>
          <p className="mt-2 text-2xl font-semibold text-white">
            {opportunity.score == null ? "—" : Math.round(opportunity.score)}
            <span className="text-base font-normal text-zinc-500"> / 100</span>
          </p>
          {opportunity.error ? <p className="mt-2 text-amber-200">{opportunity.error}</p> : null}
          {opportunity.lookalike.note ? <p className="mt-2">{opportunity.lookalike.note}</p> : null}
          {opportunity.applied.length ? (
            <p className="mt-2">Turned on: {opportunity.applied.join(", ")}.</p>
          ) : null}
          {opportunity.held.length ? (
            <ul className="mt-3 space-y-1 text-zinc-400">
              {opportunity.held.map((item) => (
                <li key={item.title}>
                  Held back {item.title}. {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {opportunity.leftInAdsManager > 0 ? (
            <p className="mt-2 text-zinc-500">
              {opportunity.leftInAdsManager} other Meta suggestion{opportunity.leftInAdsManager === 1 ? "" : "s"} left in
              Ads Manager so the poster, copy, and budget stay as you set them.
            </p>
          ) : null}
        </section>
      ) : null}

      {advice.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Robot recommendations</h2>
          <div className="space-y-2">
            {advice.map((item) => (
              <div
                key={`${item.campaignId}-${item.action}`}
                className={`rounded-xl border px-4 py-3 text-sm ${ADVICE_STYLE[item.action]}`}
              >
                <span className="font-semibold">{adviceLabel(item.action)}:</span> {item.campaignName}. {item.message}
              </div>
            ))}
          </div>
        </section>
      ) : summary.synced && summary.campaigns.length ? (
        <p className="text-sm text-zinc-400">Robot check: nothing needs changing right now.</p>
      ) : null}

      <AdsRobot
        drafts={drafts}
        posters={posters}
        currency={currency}
        maxBudget={maxDailyBudget()}
        connected={connected}
        stats={stats}
        adsManagerUrl={adsManagerUrl}
        palette={brandColourSwatches(brandFromClient(active).brand)}
      />

      <MetaAdsPanel summary={summary} />
    </div>
  );
}
