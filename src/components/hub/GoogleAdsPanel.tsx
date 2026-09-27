type GoogleAdsPanelProps = {
  days: number;
  configured: boolean;
  sessions: number;
  landings: number;
  campaigns: { label: string; sessions: number }[];
};

export function GoogleAdsPanel({
  days,
  configured,
  sessions,
  landings,
  campaigns,
}: GoogleAdsPanelProps) {
  const visits = Math.max(sessions, landings);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Google Ads</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Paid visits to wwwdigisol.com in the last {days} days. A click in
            Google Ads shows here after the landing page loads. Browsers that
            have opened Hub are left out, so your own tests stay off this count.
          </p>
        </div>
        <a
          href="https://ads.google.com/"
          className="text-sm text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
        >
          Open Google Ads
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            GA4 paid sessions
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {configured ? sessions.toLocaleString("en-CA") : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">google / cpc</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Landing pageviews
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {landings.toLocaleString("en-CA")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">pages opened with a Google click id</p>
        </div>
      </div>

      {campaigns.length > 0 ? (
        <ul className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm">
          {campaigns.map((row) => (
            <li key={row.label} className="flex justify-between gap-3">
              <span className="truncate text-zinc-200">{row.label}</span>
              <span className="text-zinc-500">{row.sessions}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100/90">
          {visits > 0
            ? `${visits.toLocaleString("en-CA")} paid visit${visits === 1 ? "" : "s"} landed, and the campaign name is still blank.`
            : "No paid visits are in this window yet."}{" "}
          Campaign names show up after you link the Google Ads account to
          Analytics property G-4ZBG4VPC9C: Google Analytics → Admin → Product
          links → Google Ads links. Clicks in the Ads account stay higher than
          this number when someone leaves before the page tag runs, or declines
          cookies.
        </p>
      )}
    </section>
  );
}
