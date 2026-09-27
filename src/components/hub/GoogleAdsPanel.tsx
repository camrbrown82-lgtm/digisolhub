type ConversionRow = {
  kind: string;
  label: string;
  envVar: string;
  firesOn: string;
  ready: boolean;
  /** First-party count for the window; null when only Google Ads can count it. */
  count: number | null;
};

type GoogleAdsPanelProps = {
  days: number;
  configured: boolean;
  sessions: number;
  landings: number;
  campaigns: { label: string; sessions: number }[];
  adsTagReady: boolean;
  conversions: ConversionRow[];
};

export function GoogleAdsPanel({
  days,
  configured,
  sessions,
  landings,
  campaigns,
  adsTagReady,
  conversions,
}: GoogleAdsPanelProps) {
  const visits = Math.max(sessions, landings);
  const readyCount = conversions.filter((row) => row.ready).length;

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
          href="https://ads.google.com/aw/conversions"
          className="text-sm text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
        >
          Open Google Ads conversions
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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Conversion tracking</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              adsTagReady && readyCount === conversions.length
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-200"
            }`}
          >
            {adsTagReady
              ? `${readyCount} of ${conversions.length} conversions live`
              : "Google Ads tag not installed"}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Google Ads only credits a conversion to an ad click when its tag fires.
          Counts below are what the site recorded in the last {days} days; Google
          Ads shows the ad-attributed share under Goals → Conversions.
        </p>
        <ul className="mt-3 divide-y divide-zinc-800 text-sm">
          {conversions.map((row) => (
            <li key={row.kind} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-zinc-100">{row.label}</p>
                <p className="text-xs text-zinc-500">{row.firesOn}</p>
                {!row.ready ? (
                  <p className="mt-0.5 text-xs text-amber-200/80">
                    Needs {adsTagReady ? "" : "NEXT_PUBLIC_GOOGLE_ADS_ID + "}
                    <code className="text-amber-100">{row.envVar}</code>
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-right text-zinc-300">
                  {row.count === null ? (
                    <span className="text-xs text-zinc-500">counted in Google Ads</span>
                  ) : (
                    row.count.toLocaleString("en-CA")
                  )}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    row.ready
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {row.ready ? "Live" : "Off"}
                </span>
              </div>
            </li>
          ))}
        </ul>
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
