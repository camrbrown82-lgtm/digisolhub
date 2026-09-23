import type { InstagramInsightsSummary } from "@/lib/meta/instagramInsights";

export function InstagramInsightsPanel({
  summary,
}: {
  summary: InstagramInsightsSummary;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Instagram</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Organic account metrics for the Instagram Business profile linked to
            DigiSol&apos;s Meta Page
            {summary.username ? (
              <>
                {" "}
                (
                <span className="text-zinc-200">@{summary.username}</span>)
              </>
            ) : null}
            .
          </p>
        </div>
        <a
          href="https://business.facebook.com/"
          className="text-sm text-indigo-400 hover:text-indigo-300"
          target="_blank"
          rel="noreferrer"
        >
          Open Meta Business
        </a>
      </div>

      {!summary.configured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100/90">
          <p className="font-medium text-amber-50">Connect Instagram Insights</p>
          <p className="mt-2 text-amber-100/80">
            Set <code className="text-amber-50">INSTAGRAM_BUSINESS_ACCOUNT_ID</code>{" "}
            and a Page/system token with{" "}
            <code className="text-amber-50">instagram_basic</code> +{" "}
            <code className="text-amber-50">instagram_manage_insights</code>.
          </p>
        </div>
      ) : null}

      {summary.configured && summary.error ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Instagram: {summary.error}
        </div>
      ) : null}

      {summary.configured ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Followers"
            value={
              summary.followers != null
                ? summary.followers.toLocaleString("en-CA")
                : "—"
            }
          />
          <Stat
            label="Media"
            value={
              summary.mediaCount != null
                ? summary.mediaCount.toLocaleString("en-CA")
                : "—"
            }
          />
          {summary.metrics.slice(0, 6).map((metric) => (
            <Stat
              key={metric.name}
              label={metric.title}
              value={metric.value.toLocaleString("en-CA")}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
