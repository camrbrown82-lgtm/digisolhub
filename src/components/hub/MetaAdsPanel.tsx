import type { MetaAdsSummary } from "@/lib/meta/insights";

function money(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function MetaAdsPanel({ summary }: { summary: MetaAdsSummary }) {
  const cards = [
    { label: "Ad spend", value: money(summary.spend) },
    { label: "Impressions", value: summary.impressions.toLocaleString("en-CA") },
    { label: "Clicks", value: summary.clicks.toLocaleString("en-CA") },
    {
      label: "Meta leads",
      value: summary.leads.toLocaleString("en-CA"),
    },
    {
      label: "Cost per lead",
      value: summary.cpl != null ? money(summary.cpl) : "—",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Meta Ads</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Facebook / Instagram ad performance (last {summary.days} days) —
            spend, clicks, and Pixel Lead volume beside Hub lead captures.
          </p>
        </div>
        <a
          href="https://business.facebook.com/adsmanager/"
          className="text-sm text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
        >
          Open Ads Manager
        </a>
      </div>

      {!summary.configured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100/90">
          <p className="font-medium text-amber-50">Connect Meta Ads Insights</p>
          <p className="mt-2 text-amber-100/80">
            Pixel Lead events already fire on wwwdigisol.com. To pull campaign
            metrics into Hub, add these Vercel Production secrets:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-amber-100/80">
            <li>
              <code className="text-amber-50">META_AD_ACCOUNT_ID</code> —{" "}
              <code className="text-amber-50">act_…</code> from Ads Manager
            </li>
            <li>
              <code className="text-amber-50">META_CAPI_ACCESS_TOKEN</code> —
              system user token with <code className="text-amber-50">ads_read</code>{" "}
              (and <code className="text-amber-50">ads_management</code> for CAPI)
            </li>
          </ul>
        </div>
      ) : null}

      {summary.configured && summary.error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Meta Insights: {summary.error}
          {summary.synced ? " Showing last cached sync." : null}
        </div>
      ) : null}

      {summary.configured ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {summary.campaigns.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Spend</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Leads</th>
                    <th className="px-4 py-3 font-medium">CPL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {summary.campaigns.slice(0, 12).map((row) => (
                    <tr key={`${row.campaignId}-${row.dateStart}`}>
                      <td className="px-4 py-3 text-zinc-200">{row.campaignName}</td>
                      <td className="px-4 py-3 text-zinc-300">{money(row.spend)}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.clicks.toLocaleString("en-CA")}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.leads.toLocaleString("en-CA")}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.cpl != null ? money(row.cpl) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : summary.synced ? (
            <p className="text-sm text-zinc-500">
              No campaign spend in this window yet.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
