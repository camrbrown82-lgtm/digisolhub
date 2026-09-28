"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceCandidate, ReviewSummary } from "@/lib/googleReviews";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-amber-400" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-zinc-700">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}

function signed(value: number, digits = 0) {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return "no change";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
}

export function GoogleReviewsPanel({
  companyName,
  initial,
}: {
  companyName?: string | null;
  initial: ReviewSummary;
}) {
  const [summary, setSummary] = useState(initial);
  const [picking, setPicking] = useState(!initial.placeId);
  const [query, setQuery] = useState(companyName || "");
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const autoTried = useRef(false);

  const link = useCallback(async (placeId: string) => {
    setBusy("link");
    setError("");
    try {
      const res = await fetch("/api/hub/google-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const json = (await res.json()) as { summary?: ReviewSummary; error?: string };
      if (!res.ok || !json.summary) throw new Error(json.error || "Could not link listing");
      setSummary(json.summary);
      setPicking(false);
      setCandidates([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link listing");
    } finally {
      setBusy("");
    }
  }, []);

  const search = useCallback(
    async (q: string, autoLink: boolean) => {
      setBusy("search");
      setError("");
      try {
        const res = await fetch(`/api/hub/google-reviews?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as {
          candidates?: PlaceCandidate[];
          match?: PlaceCandidate | null;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Google search failed");
        setCandidates(json.candidates ?? []);
        if (autoLink && json.match) {
          setBusy("");
          await link(json.match.placeId);
          return;
        }
        if (!json.candidates?.length) setError("No Google listings found. Try the name plus city.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Google search failed");
      } finally {
        setBusy((b) => (b === "search" ? "" : b));
      }
    },
    [link],
  );

  useEffect(() => {
    if (autoTried.current || summary.placeId || !summary.configured || summary.needsMigration) return;
    autoTried.current = true;
    void search(companyName || "", true);
  }, [companyName, search, summary.configured, summary.needsMigration, summary.placeId]);

  async function refresh() {
    setBusy("refresh");
    setError("");
    try {
      const res = await fetch("/api/hub/google-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
      });
      const json = (await res.json()) as { summary?: ReviewSummary; error?: string };
      if (!res.ok || !json.summary) throw new Error(json.error || "Refresh failed");
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy("");
    }
  }

  async function unlink() {
    if (!window.confirm("Stop tracking this Google listing? Past snapshots are kept.")) return;
    setBusy("unlink");
    setError("");
    try {
      const res = await fetch("/api/hub/google-reviews", { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not unlink");
      setSummary({ ...summary, placeId: null, latest: null, history: [], reviewUrl: null });
      setPicking(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlink");
    } finally {
      setBusy("");
    }
  }

  async function copyReviewLink() {
    if (!summary.reviewUrl) return;
    await navigator.clipboard.writeText(summary.reviewUrl).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const latest = summary.latest;
  const month = summary.monthAgo;
  const maxCount = Math.max(1, ...summary.history.map((h) => h.count ?? 0));
  const minCount = Math.min(...summary.history.map((h) => h.count ?? 0));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Google reviews</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Rating and review count for {companyName || "this company"}&apos;s Google listing,
            checked every morning. This listing belongs to this company only. Switch
            Working on to track another company.
          </p>
        </div>
        {summary.placeId && !picking ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={Boolean(busy)}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
            >
              {busy === "refresh" ? "Checking…" : "Refresh now"}
            </button>
            <button
              type="button"
              onClick={() => void copyReviewLink()}
              className="rounded-xl bg-indigo-500 px-3 py-1.5 font-medium text-white hover:bg-indigo-400"
            >
              {copied ? "Copied" : "Copy leave-a-review link"}
            </button>
          </div>
        ) : null}
      </div>

      {!summary.configured ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
          Add <code className="text-amber-50">GOOGLE_PLACES_API_KEY</code> to Vercel and redeploy
          to track Google reviews.
        </p>
      ) : summary.needsMigration ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
          One-time setup: run{" "}
          <code className="text-amber-50">supabase/migrations/20260930000000_google_reviews.sql</code>{" "}
          in the Supabase SQL editor, then refresh this page.
        </p>
      ) : null}

      {error ? <p className="text-sm text-amber-300/90">{error}</p> : null}

      {summary.configured && !summary.needsMigration && picking ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-300">
            {busy === "search" || busy === "link"
              ? "Looking for the Google listing…"
              : "Pick the right Google listing. Add the city if the list looks off."}
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search(query, false);
            }}
          >
            <input
              id="google-place-search"
              name="googlePlaceSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Business name and city"
              className="hub-field min-w-[16rem] flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={Boolean(busy)}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              Search Google
            </button>
            {summary.placeId ? (
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
            ) : null}
          </form>
          {candidates.length > 0 ? (
            <ul className="mt-4 divide-y divide-zinc-800">
              {candidates.map((c) => (
                <li key={c.placeId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.address}</p>
                    <p className="text-xs text-zinc-400">
                      {c.rating != null ? `${c.rating} ★ · ${c.reviewCount ?? 0} reviews` : "No reviews yet"}
                      {c.websiteUrl ? ` · ${c.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void link(c.placeId)}
                    disabled={Boolean(busy)}
                    className="rounded-xl border border-indigo-500/60 px-3 py-1.5 text-sm text-indigo-200 hover:bg-indigo-500/10 disabled:opacity-50"
                  >
                    Track this listing
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {summary.placeId && !picking && latest ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Google rating</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {latest.rating != null ? latest.rating.toFixed(1) : "-"}
              </p>
              {latest.rating != null ? <Stars value={latest.rating} /> : null}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Reviews</p>
              <p className="mt-2 text-3xl font-semibold text-white">{latest.review_count ?? 0}</p>
              {summary.newReviews > 0 ? (
                <p className="text-xs text-emerald-400">+{summary.newReviews} since last check</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">
                Change since {month ? month.captured_on : "tracking started"}
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {month && latest.review_count != null && month.review_count != null
                  ? `${signed(latest.review_count - month.review_count)} reviews`
                  : "Tracking started"}
              </p>
              {month && latest.rating != null && month.rating != null ? (
                <p className="text-xs text-zinc-400">Rating {signed(latest.rating - month.rating, 1)}</p>
              ) : null}
            </div>
            <div
              className={`rounded-2xl border p-5 ${
                summary.ratingDrop > 0
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <p className="text-sm text-zinc-400">Alerts</p>
              <p className="mt-2 text-sm text-white">
                {summary.ratingDrop > 0
                  ? `Rating dropped ${summary.ratingDrop} since the last check. Read the newest reviews and reply.`
                  : summary.newReviews > 0
                    ? "New reviews came in. A quick thank-you reply helps ranking."
                    : "No changes since the last check."}
              </p>
            </div>
          </div>

          {summary.history.length > 1 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Review count over time</p>
              <div className="mt-4 flex h-20 items-end gap-1">
                {summary.history.map((h) => (
                  <div
                    key={h.day}
                    className="flex-1 rounded-t bg-amber-400/70"
                    style={{
                      height: `${Math.max(8, maxCount === minCount ? 60 : (((h.count ?? 0) - minCount) / (maxCount - minCount)) * 92 + 8)}%`,
                    }}
                    title={`${h.day}: ${h.count ?? 0} reviews, ${h.rating ?? "-"} ★`}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                <span>{summary.history[0]?.day}</span>
                <span>{summary.history.at(-1)?.day}</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Latest reviews</h3>
              <span className="text-[11px] text-zinc-500">Reviews from Google</span>
            </div>
            {latest.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No review text available yet.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {latest.reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                      {r.authorUrl ? (
                        <a
                          href={r.authorUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-zinc-200 hover:text-white"
                        >
                          {r.author}
                        </a>
                      ) : (
                        <span className="font-medium text-zinc-200">{r.author}</span>
                      )}
                      <span className="text-xs text-zinc-500">{r.relative}</span>
                    </div>
                    {r.text ? (
                      <p className="mt-1 line-clamp-4 whitespace-pre-line text-zinc-400">{r.text}</p>
                    ) : null}
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Reply on Google
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>
              Tracking {latest.place_name || "listing"} · last checked{" "}
              {new Date(latest.captured_at).toLocaleString("en-CA", {
                timeZone: "America/Edmonton",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {latest.maps_url ? (
              <a href={latest.maps_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                Open on Google Maps
              </a>
            ) : null}
            <button type="button" onClick={() => setPicking(true)} className="text-indigo-400 hover:text-indigo-300">
              Wrong listing? Change it
            </button>
            <button type="button" onClick={() => void unlink()} className="text-zinc-500 hover:text-zinc-300">
              Stop tracking
            </button>
          </div>
        </>
      ) : null}

      {summary.placeId && !picking && !latest && summary.configured && !summary.needsMigration ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          Listing linked. No snapshot yet.{" "}
          <button type="button" onClick={() => void refresh()} className="text-indigo-400 hover:text-indigo-300">
            Check now
          </button>
        </div>
      ) : null}
    </section>
  );
}
