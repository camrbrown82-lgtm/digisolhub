import { competitiveAwards } from "@/lib/competitive/awards";
import { COMPETITIVE_DIMENSIONS, type MarketPresence, type SiteSnapshot } from "@/lib/competitive/schema";
import type { StoredCompetitiveReport as Report } from "@/lib/competitive/scoring";
import { prospectHostKey } from "@/lib/prospectAudit/seedCatalog";

const dimensionLabel = (key: string) => COMPETITIVE_DIMENSIONS.find((d) => d.key === key)?.label ?? key;

type Props = {
  companyName: string;
  report: Report;
  inputs: { url: string; industry: string; location: string };
  sources: {
    company?: SiteSnapshot;
    competitors?: SiteSnapshot[];
    presence?: MarketPresence[];
  };
  completedAt: string | null;
  /** Signed-up companies only. Free-audit analyses do not show these awards. */
  awardsUnlocked?: boolean;
  /** Public badge links for awards this analysis earned. */
  analysisId?: string;
};

const POSITION_COPY: Record<Report["position"], string> = {
  leader: "Market leader",
  contender: "Strong contender",
  challenger: "Challenger",
  behind: "Behind the pack",
};

const LEVEL_TONE: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-200",
  medium: "bg-amber-500/15 text-amber-200",
  low: "bg-emerald-500/15 text-emerald-200",
};

const VERDICT_TONE: Record<string, string> = {
  strength: "bg-emerald-500/15 text-emerald-300",
  weakness: "bg-rose-500/15 text-rose-300",
  parity: "bg-zinc-700/60 text-zinc-300",
};

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-300";
  if (score >= 55) return "text-amber-200";
  return "text-rose-300";
}

function Bar({ value, className }: { value: number; className: string }) {
  const width = Math.max(2, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 w-full rounded-full bg-zinc-800">
      <div className={`h-2 rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tone}`}>{children}</span>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Awards({
  report,
  unlocked,
  analysisId,
}: {
  report: Report;
  unlocked: boolean;
  analysisId?: string;
}) {
  if (!unlocked) {
    return (
      <Section
        title="Awards"
        subtitle="These awards are for companies signed up with DigiSol. A website build or Hub sign-up unlocks every badge the site has earned. The Excellence Award is separate, and only a free website audit can earn it."
      >
        <p className="text-sm text-zinc-400">
          This company is not signed up, so these badges stay locked. Run a free website audit if you want the
          Excellence Award scored on its own.
        </p>
      </Section>
    );
  }
  const awards = competitiveAwards(report);
  return (
    <Section
      title="Awards"
      subtitle="Unlocked because this company is signed up with DigiSol. Speed, security and SEO, social and content, and Google Business Profile are earned at 90. Industry leader is the highest overall score in this analysis. The Excellence Award is separate and comes only from a free website audit."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {awards.map((award) => (
          <div
            key={award.key}
            className={`rounded-xl border p-4 ${
              award.earned ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-white">{award.title}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  award.earned ? "bg-emerald-500/20 text-emerald-200" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {award.earned ? "Earned" : "Not yet"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{award.covers}</p>
            <p className="mt-2 text-sm text-zinc-300">{award.detail}</p>
            {award.earned && analysisId ? (
              <a
                href={`/award/c/${analysisId}/${award.key}?add=1`}
                className="mt-3 inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200"
              >
                Download and embed this badge
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function CompetitiveReport({
  companyName,
  report,
  inputs,
  sources,
  completedAt,
  awardsUnlocked = false,
  analysisId,
}: Props) {
  const presenceFor = (url: string) =>
    sources.presence?.find((p) => prospectHostKey(p.url) === prospectHostKey(url));
  const snapshotFor = (url: string) =>
    sources.competitors?.find((s) => prospectHostKey(s.url) === prospectHostKey(url));
  const companyPresence = sources.company ? presenceFor(sources.company.url) : undefined;
  const actions = [...report.actionPlan].sort((a, b) => a.priority - b.priority);
  const changes = report.changes;
  const checksFor = (key: string) =>
    report.scorecard?.company.dimensions.find((d) => d.key === key)?.checks ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Competitive analysis · {companyName}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {inputs.industry} · {inputs.location}
              {completedAt ? ` · ${new Date(completedAt).toLocaleString()}` : ""}
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-100">{report.executiveSummary}</p>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold ${scoreTone(report.overallScore)}`}>
              {Math.round(report.overallScore)}
            </div>
            <div className="text-xs text-zinc-400">out of 100</div>
            {changes ? (
              <div
                className={`mt-1 text-xs font-medium ${
                  changes.overallDelta > 0
                    ? "text-emerald-300"
                    : changes.overallDelta < 0
                      ? "text-rose-300"
                      : "text-zinc-400"
                }`}
              >
                {changes.overallDelta > 0 ? "+" : ""}
                {changes.overallDelta} since last analysis
              </div>
            ) : null}
            <div className="mt-2">
              <Pill tone="bg-indigo-500/20 text-indigo-100">{POSITION_COPY[report.position]}</Pill>
            </div>
          </div>
        </div>
        {sources.company ? (
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span>
              Website audit: <span className="text-zinc-200">{sources.company.score}/100</span>
            </span>
            <span>
              Google rating: <span className="text-zinc-200">{companyPresence?.googleRating ?? "unknown"}</span>
            </span>
            <span>
              Google reviews: <span className="text-zinc-200">{companyPresence?.reviewCount ?? "unknown"}</span>
              {companyPresence?.googleSource === "google" ? (
                <span className="ml-1 text-emerald-400">verified by Google</span>
              ) : null}
            </span>
            <span>
              Competitors analysed: <span className="text-zinc-200">{report.competitors.length}</span>
            </span>
          </div>
        ) : null}
      </section>

      <Awards report={report} unlocked={awardsUnlocked} analysisId={analysisId} />

      {changes ? (
        <Section
          title="Since the last analysis"
          subtitle={`Compared with ${
            changes.previousDate ? new Date(changes.previousDate).toLocaleDateString() : "the previous run"
          }, scored on the same checklist: ${changes.previousOverall} → ${Math.round(report.overallScore)}.`}
        >
          {changes.gained.length || changes.lost.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Improvements</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {changes.gained.length ? (
                    changes.gained.map((g) => (
                      <li key={`${g.dimension}-${g.label}`} className="text-zinc-200">
                        <span className="text-emerald-300">+{g.points}</span> {g.label}
                        <span className="text-zinc-500"> · {dimensionLabel(g.dimension)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500">None detected.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">Went backwards</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {changes.lost.length ? (
                    changes.lost.map((g) => (
                      <li key={`${g.dimension}-${g.label}`} className="text-zinc-200">
                        <span className="text-rose-300">−{g.points}</span> {g.label}
                        <span className="text-zinc-500"> · {dimensionLabel(g.dimension)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500">Nothing.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No changes detected on the checklist since the last analysis.</p>
          )}
        </Section>
      ) : null}

      <Section
        title="Scorecard"
        subtitle={`${companyName} (indigo) against the competitor average (grey) in each area.${
          report.scorecard ? " Scores come from a fixed checklist, so the same site always gets the same score." : ""
        }`}
      >
        <div className="space-y-4">
          {report.dimensions.map((d) => (
            <div key={d.key} className="rounded-xl border border-zinc-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-white">{d.label}</div>
                <div className="flex items-center gap-2">
                  <Pill tone={VERDICT_TONE[d.verdict]}>{d.verdict}</Pill>
                  <span className="text-xs text-zinc-500">Best: {d.bestCompetitor}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <Bar value={d.companyScore} className="bg-indigo-500" />
                <span className="text-xs text-indigo-200">{Math.round(d.companyScore)} you</span>
                <Bar value={d.competitorAverage} className="bg-zinc-500" />
                <span className="text-xs text-zinc-400">{Math.round(d.competitorAverage)} avg</span>
              </div>
              <p className="mt-3 text-sm text-zinc-300">{d.evidence}</p>
              {checksFor(d.key).length ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-indigo-300 hover:text-indigo-200">
                    How this score was worked out
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {checksFor(d.key).map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3">
                        <span className={c.points >= c.max ? "text-zinc-200" : "text-zinc-500"}>
                          {c.points >= c.max ? "✓" : c.points > 0 ? "◐" : "✗"} {c.label}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {c.points}/{c.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      {report.priceComparison?.rows.length ? (
        <Section
          title="Price comparison"
          subtitle="Only prices printed on each public website. Nothing here is estimated."
        >
          <p className="text-sm leading-relaxed text-zinc-200">{report.priceComparison.summary}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">Offer</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 pr-4 font-medium">What it covers</th>
                  <th className="py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {report.priceComparison.rows.map((row) => (
                  <tr key={`${row.siteUrl}-${row.offer}-${row.price}`} className="border-t border-zinc-800 align-top">
                    <td className="py-2 pr-4 text-white">
                      {row.company}
                      {row.role === "you" ? (
                        <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-100">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">{row.offer}</td>
                    <td className="py-2 pr-4 font-medium text-zinc-100">{row.price}</td>
                    <td className="py-2 pr-4 text-zinc-400">{row.note || "—"}</td>
                    <td className="max-w-[12rem] py-2 break-all text-zinc-400">
                      {row.source ? (
                        <a href={row.source} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
                          {row.source.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section title="Strengths, weaknesses, opportunities, threats">
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["Strengths", report.swot.strengths, "border-emerald-500/30"],
              ["Weaknesses", report.swot.weaknesses, "border-rose-500/30"],
              ["Opportunities", report.swot.opportunities, "border-sky-500/30"],
              ["Threats", report.swot.threats, "border-amber-500/30"],
            ] as const
          ).map(([label, items, border]) => (
            <div key={label} className={`rounded-xl border ${border} p-4`}>
              <h3 className="font-semibold text-white">{label}</h3>
              <ul className="mt-2 space-y-2">
                {items.map((item) => (
                  <li key={item.title} className="text-sm">
                    <span className="font-medium text-zinc-100">{item.title}.</span>{" "}
                    <span className="text-zinc-400">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {report.quickWins.length ? (
        <Section title="Quick wins" subtitle="Each of these takes less than a day.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-200">
            {report.quickWins.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Action plan"
        subtitle="Ordered by priority. Each action lists the steps, how to do it well, and how to measure it."
      >
        <ol className="space-y-4">
          {actions.map((a) => (
            <li key={`${a.priority}-${a.title}`} className="rounded-xl border border-zinc-800 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {a.priority}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{a.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{a.why}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={LEVEL_TONE[a.impact]}>impact {a.impact}</Pill>
                  <Pill tone="bg-zinc-800 text-zinc-300">effort {a.effort}</Pill>
                  <Pill tone="bg-sky-500/15 text-sky-200">{a.timeframe}</Pill>
                  <Pill tone="bg-indigo-500/15 text-indigo-200">{a.owner}</Pill>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Steps</h4>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-200">
                    {a.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      How to achieve it
                    </h4>
                    <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">{a.howToAchieve}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Measure it
                    </h4>
                    <p className="mt-1 text-sm text-emerald-200/90">{a.kpi}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Competitors">
        <div className="grid gap-4 lg:grid-cols-2">
          {report.competitors.map((c) => {
            const snap = snapshotFor(c.url);
            const pres = presenceFor(c.url);
            return (
              <div key={c.url || c.name} className="rounded-xl border border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      {c.url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <Pill tone={LEVEL_TONE[c.threatLevel]}>threat {c.threatLevel}</Pill>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  {snap ? <span>Site {snap.ok ? `${snap.score}/100` : "didn't load"}</span> : null}
                  {pres ? (
                    <span>
                      Google {pres.googleRating} ({pres.reviewCount} reviews)
                      {pres.googleSource === "google" ? (
                        <span className="ml-1 text-emerald-400">verified</span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-zinc-300">{c.overview}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-emerald-300/80">Strengths</h4>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-zinc-300">
                      {c.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-rose-300/80">Weaknesses</h4>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-zinc-300">
                      {c.weaknesses.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-3 text-sm text-sky-200/90">
                  <span className="font-medium">Learn from them:</span> {c.whatToLearn}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {report.keywordOpportunities.length ? (
        <Section title="Keyword opportunities" subtitle={`Local searches worth targeting in ${inputs.location}.`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Keyword</th>
                  <th className="py-2 pr-4 font-medium">Intent</th>
                  <th className="py-2 pr-4 font-medium">Who owns it</th>
                  <th className="py-2 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {report.keywordOpportunities.map((k) => (
                  <tr key={k.keyword} className="border-t border-zinc-800 align-top">
                    <td className="py-2 pr-4 text-white">{k.keyword}</td>
                    <td className="py-2 pr-4 text-zinc-400">{k.intent}</td>
                    <td className="py-2 pr-4 text-zinc-400">{k.whoRanks}</td>
                    <td className="py-2 text-zinc-300">{k.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {report.dataGaps.length ? (
        <Section title="Check by hand" subtitle="Kaylev couldn't verify these from public data.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
            {report.dataGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
