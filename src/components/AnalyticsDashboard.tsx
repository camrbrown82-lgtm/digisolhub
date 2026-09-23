export type AnalyticsSeriesPoint = {
  day: string;
  value: number;
};

export type AnalyticsRankItem = {
  label: string;
  value: number;
};

export type AnalyticsHealth = "strong" | "watch" | "weak" | "unknown";

export type AnalyticsDashboardProps = {
  companyName?: string | null;
  gaConfigured: boolean;
  gaError?: string | null;
  traffic: {
    sessions: number;
    users: number;
    pageviews: number;
    daily: AnalyticsSeriesPoint[];
  };
  firstParty: {
    pageviews: number;
    visitors: number;
    daily: AnalyticsSeriesPoint[];
  };
  conversion: {
    openRate: number;
    clickRate: number;
    sends: number;
    opens: number;
    clicks: number;
    winRate: number;
    pipelineOpen: number;
    pipelineWon: number;
  };
  agentActivity?: {
    total: number;
    successRate: number;
    tokenCost: number;
    byType: AnalyticsRankItem[];
    byChannel: AnalyticsRankItem[];
    daily: AnalyticsSeriesPoint[];
  };
  weakPoints: AnalyticsRankItem[];
  topPages: AnalyticsRankItem[];
  topSources: AnalyticsRankItem[];
};

function healthFromRates(openRate: number, clickRate: number, sends: number): AnalyticsHealth {
  if (sends < 5) return "unknown";
  if (openRate >= 30 && clickRate >= 4) return "strong";
  if (openRate >= 18 || clickRate >= 2) return "watch";
  return "weak";
}

function trafficHealth(daily: AnalyticsSeriesPoint[]): AnalyticsHealth {
  if (daily.length < 4 || daily.every((d) => d.value === 0)) return "unknown";
  const mid = Math.floor(daily.length / 2);
  const first = daily.slice(0, mid).reduce((sum, d) => sum + d.value, 0);
  const second = daily.slice(mid).reduce((sum, d) => sum + d.value, 0);
  if (second > first * 1.1) return "strong";
  if (second >= first * 0.85) return "watch";
  return "weak";
}

function healthStyles(health: AnalyticsHealth) {
  switch (health) {
    case "strong":
      return {
        bar: "bg-emerald-500",
        soft: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        label: "Healthy",
        chip: "bg-emerald-500/20 text-emerald-200",
      };
    case "watch":
      return {
        bar: "bg-amber-400",
        soft: "border-amber-500/30 bg-amber-500/10 text-amber-100",
        label: "Watch",
        chip: "bg-amber-500/20 text-amber-100",
      };
    case "weak":
      return {
        bar: "bg-rose-500",
        soft: "border-rose-500/30 bg-rose-500/10 text-rose-100",
        label: "Needs work",
        chip: "bg-rose-500/20 text-rose-100",
      };
    default:
      return {
        bar: "bg-zinc-500",
        soft: "border-zinc-700 bg-zinc-900/60 text-zinc-300",
        label: "No signal",
        chip: "bg-zinc-700/60 text-zinc-300",
      };
  }
}

function ColorBarChart({
  title,
  points,
  health,
  emptyLabel,
}: {
  title: string;
  points: AnalyticsSeriesPoint[];
  health: AnalyticsHealth;
  emptyLabel: string;
}) {
  const styles = healthStyles(health);
  const max = Math.max(1, ...points.map((p) => p.value));
  const hasData = points.some((p) => p.value > 0);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{title}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles.chip}`}>
          {styles.label}
        </span>
      </div>
      {!hasData ? (
        <p className="mt-6 text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-4 flex h-32 items-end gap-1">
            {points.map((item) => (
              <div
                key={item.day}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`w-full rounded-t ${styles.bar} opacity-90`}
                  style={{
                    height: `${Math.max(6, (item.value / max) * 100)}%`,
                  }}
                  title={`${item.day}: ${item.value}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
            <span>{points[0]?.day}</span>
            <span>{points.at(-1)?.day}</span>
          </div>
        </>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  hint,
  health,
}: {
  label: string;
  value: string;
  hint: string;
  health: AnalyticsHealth;
}) {
  const styles = healthStyles(health);
  return (
    <div className={`rounded-2xl border p-5 ${styles.soft}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm opacity-80">{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.chip}`}>
          {styles.label}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs opacity-70">{hint}</p>
    </div>
  );
}

function RankList({
  title,
  items,
  accent,
  empty,
}: {
  title: string;
  items: AnalyticsRankItem[];
  accent: string;
  empty: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-zinc-300">{item.label}</span>
                <span className="shrink-0 text-zinc-500">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${accent}`}
                  style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Color-coded DigiSol hub analytics: traffic trends, conversion health, weak points.
 */
export function AnalyticsDashboard({
  companyName,
  gaConfigured,
  gaError,
  traffic,
  firstParty,
  conversion,
  agentActivity,
  weakPoints,
  topPages,
  topSources,
}: AnalyticsDashboardProps) {
  const trafficTone = trafficHealth(
    gaConfigured && !gaError ? traffic.daily : firstParty.daily,
  );
  const emailHealth = healthFromRates(
    conversion.openRate,
    conversion.clickRate,
    conversion.sends,
  );
  const pipelineHealth: AnalyticsHealth =
    conversion.pipelineOpen + conversion.pipelineWon === 0
      ? "unknown"
      : conversion.winRate >= 25
        ? "strong"
        : conversion.winRate >= 10
          ? "watch"
          : "weak";
  const agentHealth: AnalyticsHealth = !agentActivity?.total
    ? "unknown"
    : agentActivity.successRate >= 90
      ? "strong"
      : agentActivity.successRate >= 70
        ? "watch"
        : "weak";

  const trendDaily =
    gaConfigured && !gaError
      ? traffic.daily
      : firstParty.daily;

  return (
    <section className="space-y-4" aria-label="Analytics dashboard">
      <div>
        <h2 className="text-lg font-semibold text-white">Performance dashboard</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Color-coded traffic, conversion health, and weak points
          {companyName ? ` for ${companyName}` : ""} — GA4 + DigiSol Hub + agent
          telemetry.
        </p>
      </div>

      {gaError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          GA4 error: {gaError}. Showing first-party DigiSol Hub signals where available.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HealthCard
          label="Traffic trend"
          value={
            gaConfigured && !gaError
              ? String(traffic.sessions)
              : String(firstParty.pageviews)
          }
          hint={
            gaConfigured && !gaError
              ? "GA4 sessions (14d)"
              : "First-party pageviews (14d)"
          }
          health={trafficTone}
        />
        <HealthCard
          label="Email open rate"
          value={conversion.sends ? `${conversion.openRate}%` : "—"}
          hint={`${conversion.opens}/${conversion.sends} opens`}
          health={emailHealth}
        />
        <HealthCard
          label="Email click rate"
          value={conversion.sends ? `${conversion.clickRate}%` : "—"}
          hint={`${conversion.clicks}/${conversion.sends} clicks`}
          health={emailHealth}
        />
        <HealthCard
          label="Pipeline win rate"
          value={
            conversion.pipelineOpen + conversion.pipelineWon
              ? `${conversion.winRate}%`
              : "—"
          }
          hint={`${conversion.pipelineWon} won · ${conversion.pipelineOpen} open`}
          health={pipelineHealth}
        />
        <HealthCard
          label="Agent actions"
          value={agentActivity?.total ? String(agentActivity.total) : "—"}
          hint={
            agentActivity?.total
              ? `${agentActivity.successRate}% success · ${agentActivity.tokenCost} tokens`
              : "No analytics_events yet"
          }
          health={agentHealth}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ColorBarChart
          title={
            gaConfigured && !gaError
              ? "Traffic trend (GA4 sessions)"
              : "Traffic trend (first-party pageviews)"
          }
          points={trendDaily}
          health={trafficTone}
          emptyLabel="No traffic yet for this window."
        />
        <ColorBarChart
          title="Agent telemetry (analytics_events)"
          points={agentActivity?.daily ?? []}
          health={agentHealth}
          emptyLabel="No agent events yet — audits, leads, emails, and social posts will appear here."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankList
          title="Top pages"
          items={topPages}
          accent="bg-sky-500"
          empty="No page data yet."
        />
        <RankList
          title="Event channels"
          items={agentActivity?.byChannel?.length ? agentActivity.byChannel : topSources}
          accent="bg-violet-500"
          empty="No channel telemetry yet."
        />
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Weak-point highlights</h3>
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-medium text-rose-100">
              Focus
            </span>
          </div>
          {weakPoints.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No weak signals flagged — keep watching conversion paths.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {weakPoints.map((item) => (
                <li
                  key={item.label}
                  className="rounded-xl border border-rose-500/20 bg-zinc-950/40 px-3 py-2"
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-rose-50">{item.label}</span>
                    <span className="shrink-0 text-rose-200/80">{item.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-100/60">
                    Failed or low-performing signal — review CTA, deliverability, or
                    social publish status.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
