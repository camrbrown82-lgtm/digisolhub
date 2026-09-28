import type { DemographicRow, Ga4Demographics } from "@/lib/ga4";

/** Cloud and social-crawler hubs: visits from these towns are almost always bots. */
const DATA_CENTER_CITIES = new Set(
  [
    "Forest City",
    "Prineville",
    "Lulea",
    "Luleå",
    "Gallatin",
    "Boardman",
    "Council Bluffs",
    "The Dalles",
    "Ashburn",
    "Altoona",
    "Papillion",
    "Clonee",
    "Odense",
    "Los Lunas",
    "New Albany",
    "Henrico",
  ].map((city) => city.toLowerCase()),
);

function labelFor(raw: string) {
  if (!raw || raw === "unknown" || raw === "(not set)") return "Unknown";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function Breakdown({
  title,
  rows,
  empty,
  flagBots = false,
}: {
  title: string;
  rows: DemographicRow[];
  empty: string;
  flagBots?: boolean;
}) {
  const max = Math.max(1, ...rows.map((row) => row.users));
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          All · Google Ads
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((row) => {
            const bot = flagBots && DATA_CENTER_CITIES.has(row.label.toLowerCase());
            return (
              <li key={row.label} className="min-w-0">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-zinc-300" title={row.label}>
                    {labelFor(row.label)}
                    {bot ? (
                      <span className="ml-2 rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                        data center / bot
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {row.users}
                    <span className="text-zinc-600"> · </span>
                    <span className={row.adsUsers ? "text-indigo-300" : "text-zinc-600"}>
                      {row.adsUsers}
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-zinc-800">
                  <div
                    className={`h-1.5 rounded ${bot ? "bg-zinc-600" : "bg-indigo-500/70"}`}
                    style={{ width: `${Math.max(3, (row.users / max) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DemographicsPanel({
  days,
  data,
}: {
  days: number;
  data: Ga4Demographics;
}) {
  const withheldNote =
    "Google hides age and gender until enough people visit, to protect privacy. It fills in as traffic grows.";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Demographics</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Who visited wwwdigisol.com in the last {days} days, from Google Analytics.
            Each row shows all visitors, then visitors who came from a Google Ads
            click. Use the Google Ads column for targeting.
          </p>
        </div>
        <a
          href="https://ads.google.com/aw/demographics"
          className="text-sm text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
        >
          Google Ads demographics
        </a>
      </div>

      {!data.configured ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
          Connect the GA4 Data API above to see demographics.
        </p>
      ) : data.error ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
          Could not load demographics: {data.error}
        </p>
      ) : (
        <>
          {data.ageGenderWithheld ? (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
              {withheldNote} Until then, Google Ads → Audiences, keywords, and
              content → Audiences → Demographics shows age and gender for the
              people who saw your ads.
            </p>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Age" rows={data.age} empty={withheldNote} />
            <Breakdown title="Gender" rows={data.gender} empty={withheldNote} />
            <Breakdown
              title="Cities"
              rows={data.cities}
              empty="No city data yet."
              flagBots
            />
            <Breakdown title="Devices" rows={data.devices} empty="No device data yet." />
          </div>
        </>
      )}
    </section>
  );
}
