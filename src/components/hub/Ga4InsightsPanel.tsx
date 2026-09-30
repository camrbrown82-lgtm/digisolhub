import { GA_RANGES, type Ga4Change, type Ga4Insights } from "@/lib/ga4";

type Kind = "count" | "rate" | "seconds";

function formatValue(value: number, kind: Kind) {
  if (kind === "rate") return `${(value * 100).toFixed(1)}%`;
  if (kind === "seconds") {
    const total = Math.round(value);
    const minutes = Math.floor(total / 60);
    return minutes ? `${minutes}m ${total % 60}s` : `${total}s`;
  }
  return value.toLocaleString("en-CA");
}

function ChangeChip({ change, kind = "count" }: { change: Ga4Change; kind?: Kind }) {
  const { current, previous } = change;
  if (!current && !previous) return <span className="text-xs text-zinc-600">No data</span>;
  if (!previous) return <span className="text-xs text-emerald-300">New</span>;
  const diff =
    kind === "rate" ? (current - previous) * 100 : ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const tone =
    rounded > 0 ? "text-emerald-300" : rounded < 0 ? "text-rose-300" : "text-zinc-500";
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={`text-xs tabular-nums ${tone}`}>
      {sign}
      {rounded}
      {kind === "rate" ? " pts" : "%"}
    </span>
  );
}

function methodLabel(raw: string) {
  if (raw === "(not set)") return "Not tagged";
  if (raw === "kaylev_chat") return "Kaylev chat";
  const words = raw.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function leadRate(leads: number, sessions: number) {
  return sessions ? `${((leads / sessions) * 100).toFixed(1)}%` : "—";
}

export function Ga4InsightsPanel({
  data,
  basePath,
}: {
  data: Ga4Insights;
  basePath: string;
}) {
  const { days, totals } = data;
  const cards: { label: string; change: Ga4Change; kind: Kind }[] = [
    { label: "Sessions", change: totals.sessions, kind: "count" },
    { label: "Users", change: totals.users, kind: "count" },
    { label: "Pageviews", change: totals.pageviews, kind: "count" },
    { label: "Engagement rate", change: totals.engagementRate, kind: "rate" },
    { label: "Avg. visit length", change: totals.avgSessionSeconds, kind: "seconds" },
    { label: "Leads", change: totals.leads, kind: "count" },
  ];
  const conversions = data.conversions.filter((row) => row.current || row.previous);
  const methods = data.leadMethods?.filter((row) => row.count > 0) ?? null;
  const maxChannel = Math.max(1, ...data.channels.map((row) => row.sessions));

  return (
    <section className="space-y-4" aria-label="Google Analytics insights">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">What&apos;s working (Google Analytics)</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Last {days} days compared with the {days} days before. Cached for 10 minutes.
          </p>
        </div>
        <nav aria-label="Google Analytics date range" className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          {GA_RANGES.map((range) => (
            <a
              key={range}
              href={`${basePath}?range=${range}`}
              aria-current={range === days ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                range === days
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {range}d
            </a>
          ))}
        </nav>
      </div>

      {data.error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          Could not load Google Analytics insights: {data.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-400">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {formatValue(card.change.current, card.kind)}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <ChangeChip change={card.change} kind={card.kind} />
              <span className="text-[11px] text-zinc-600">
                was {formatValue(card.change.previous, card.kind)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-white">Conversions</h3>
          <p className="mt-1 text-xs text-zinc-500">Actions visitors took on the site.</p>
          {conversions.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No conversion events recorded in this window.
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="pb-2 font-normal">Action</th>
                  <th className="pb-2 text-right font-normal">Count</th>
                  <th className="pb-2 text-right font-normal">Before</th>
                  <th className="pb-2 text-right font-normal">Change</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((row) => (
                  <tr key={row.label} className="border-t border-zinc-800/70">
                    <td className="py-1.5 text-zinc-300">{row.label}</td>
                    <td className="py-1.5 text-right tabular-nums text-white">{row.current}</td>
                    <td className="py-1.5 text-right tabular-nums text-zinc-500">{row.previous}</td>
                    <td className="py-1.5 text-right">
                      <ChangeChip change={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totals.leads.current > 0 ? (
            methods ? (
              <p className="mt-3 text-xs text-zinc-400">
                Leads by method:{" "}
                {methods.map((row) => `${methodLabel(row.label)} ${row.count}`).join(" · ")}
              </p>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                To split leads by form, Kaylev chat, and so on, register <code>method</code> as an
                event-scoped custom dimension in Google Analytics (Admin, then Custom definitions).
              </p>
            )
          ) : null}
        </div>

        <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-white">Channels</h3>
          <p className="mt-1 text-xs text-zinc-500">Where visits came from, and which ones turn into leads.</p>
          {data.channels.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No sessions in this window.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.channels.map((row) => (
                <li key={row.label} className="min-w-0">
                  <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{row.label}</span>
                    <span className="shrink-0 tabular-nums text-white">{row.sessions}</span>
                    <span className="w-14 shrink-0 text-right">
                      <ChangeChip change={{ current: row.sessions, previous: row.previousSessions }} />
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(4, (row.sessions / maxChannel) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {formatValue(row.engagementRate, "rate")} engaged · {row.leads} lead
                    {row.leads === 1 ? "" : "s"} · {leadRate(row.leads, row.sessions)} lead rate
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-white">Landing pages</h3>
        <p className="mt-1 text-xs text-zinc-500">
          The first page people see. High traffic with a low lead rate is where to improve first.
        </p>
        {data.landingPages.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No landing page data in this window.</p>
        ) : (
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="pb-2 font-normal">Page</th>
                <th className="pb-2 text-right font-normal">Sessions</th>
                <th className="pb-2 text-right font-normal">Engaged</th>
                <th className="pb-2 text-right font-normal">Avg. visit</th>
                <th className="pb-2 text-right font-normal">Leads</th>
                <th className="pb-2 text-right font-normal">Lead rate</th>
              </tr>
            </thead>
            <tbody>
              {data.landingPages.map((row) => (
                <tr key={row.page} className="border-t border-zinc-800/70">
                  <td className="max-w-[280px] truncate py-1.5 text-zinc-300" title={row.page}>
                    {row.page}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-white">{row.sessions}</td>
                  <td className="py-1.5 text-right tabular-nums text-zinc-400">
                    {formatValue(row.engagementRate, "rate")}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-zinc-400">
                    {formatValue(row.avgSessionSeconds, "seconds")}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-white">{row.leads}</td>
                  <td className="py-1.5 text-right tabular-nums text-zinc-400">
                    {leadRate(row.leads, row.sessions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
