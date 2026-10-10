"use client";

import { useState } from "react";
import type { AdGroupOption, KeywordArea, KeywordSource, TrendingKeyword } from "@/lib/google/keywords";

type Fix = { title: string; ok: boolean; detail: string; applied_by: string | null; created_at: string };

type Found = {
  field: string;
  seeds: string[];
  keywords: TrendingKeyword[];
  adGroups: AdGroupOption[];
  area: KeywordArea;
  source: KeywordSource;
  notice: string;
};

const NEW_CAMPAIGN = "new";

export function GoogleKeywordsPanel({
  companyName,
  currency,
  onFixes,
}: {
  companyName: string;
  currency: string;
  onFixes: (fixes: Fix[]) => void;
}) {
  const [area, setArea] = useState<KeywordArea>("alberta");
  const [found, setFound] = useState<Found | null>(null);
  const [bids, setBids] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [matchType, setMatchType] = useState("PHRASE");
  const [destination, setDestination] = useState(NEW_CAMPAIGN);
  const [dailyBudget, setDailyBudget] = useState("20");
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const money = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/hub/google-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function find() {
    setBusy("find");
    setError("");
    setNotice("");
    try {
      const json = (await post({ action: "keywords", area })) as Found;
      setFound(json);
      setBids(Object.fromEntries(json.keywords.map((k) => [k.text, k.suggestedBid.toFixed(2)])));
      setPicked(new Set(json.keywords.filter((k) => !k.alreadyBidding).slice(0, 5).map((k) => k.text)));
      setDestination(json.adGroups.find((g) => g.campaignStatus === "ENABLED")?.resourceName ?? NEW_CAMPAIGN);
      if (!json.keywords.length) setNotice("Google had no keywords with enough searches for this field. Fill in the brand kit audience and try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find keywords");
    } finally {
      setBusy("");
    }
  }

  function toggle(text: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  }

  const chosen = (found?.keywords ?? [])
    .filter((k) => picked.has(k.text))
    .map((k) => ({ text: k.text, bid: Number(bids[k.text]) }));
  const badBid = chosen.some((k) => !Number.isFinite(k.bid) || k.bid < 0.05 || k.bid > 50);
  const isNew = destination === NEW_CAMPAIGN;
  const group = found?.adGroups.find((g) => g.resourceName === destination);

  async function bid() {
    if (!found || !chosen.length || badBid) return;
    const where = isNew
      ? `a new Search campaign in ${found.area === "canada" ? "Canada" : "Alberta"} at ${money(Number(dailyBudget))}/day, ${startNow ? "running right away" : "paused until you turn it on"}`
      : `"${group?.campaign} › ${group?.name}"${group?.campaignStatus === "ENABLED" ? ", which is live" : ""}`;
    const confirmed = window.confirm(
      `This spends ${companyName}'s Google Ads money.\n\nBid on ${chosen.length} keyword${chosen.length === 1 ? "" : "s"} (max ${money(Math.max(...chosen.map((k) => k.bid)))} a click) in ${where}?`,
    );
    if (!confirmed) return;
    setBusy("bid");
    setError("");
    setNotice("");
    try {
      const json = (await post({
        action: "bid",
        area: found.area,
        matchType,
        keywords: chosen,
        ...(isNew
          ? { newCampaign: { dailyBudget: Number(dailyBudget), enabled: startNow } }
          : { adGroup: destination }),
      })) as { message?: string; fixes?: Fix[] };
      if (json.fixes) onFixes(json.fixes);
      setNotice(json.message || "Done.");
      setFound({
        ...found,
        keywords: found.keywords.map((k) => (picked.has(k.text) ? { ...k, alreadyBidding: true } : k)),
      });
      setPicked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google refused");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Trending keywords</h2>
        <span className="text-xs text-zinc-500">For {companyName} only. Switch Working on for another company.</span>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Kaylev works out {companyName}&apos;s field from its brand kit and website, pulls Google&apos;s search volumes,
        and keeps the searches that are rising and that a paying customer would type. Nothing is bid until you confirm.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-xs text-zinc-400">
          Area
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as KeywordArea)}
            className="hub-field mt-1 block text-sm"
          >
            <option value="alberta">Alberta</option>
            <option value="canada">Canada</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void find()}
          disabled={Boolean(busy)}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy === "find" ? "Kaylev is searching… (up to a minute)" : found ? "Find again" : "Find trending keywords"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}

      {found?.keywords.length ? (
        <>
          {found.notice ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90">
              {found.notice}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-zinc-500">
            {found.field ? `Field: ${found.field}. ` : ""}Started from: {found.seeds.join(", ")}.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-2 pr-2" />
                  <th className="py-2 pr-3 font-medium">Keyword</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    {found.source === "planner" ? "Searches / mo" : "Impressions / 4 wk"}
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">Trend</th>
                  <th className="py-2 pr-3 font-medium">Competition</th>
                  <th className="py-2 pr-3 text-right font-medium">Top-of-page bid</th>
                  <th className="py-2 font-medium">Your max bid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {found.keywords.map((k) => (
                  <tr key={k.text} className="align-top">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={picked.has(k.text)}
                        onChange={() => toggle(k.text)}
                        aria-label={`Bid on ${k.text}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <p className="text-zinc-100">
                        {k.text}
                        {k.alreadyBidding ? (
                          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">already bidding</span>
                        ) : null}
                      </p>
                      {k.why ? <p className="mt-0.5 text-xs text-zinc-500">{k.why}</p> : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-zinc-300">
                      {k.monthlySearches ? k.monthlySearches.toLocaleString("en-CA") : "Kaylev's pick"}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        k.trend > 0 ? "text-emerald-400" : k.trend < 0 ? "text-rose-300" : "text-zinc-400"
                      }`}
                    >
                      {k.trend > 0 ? "+" : ""}
                      {k.trend}%
                    </td>
                    <td className="py-2 pr-3 capitalize text-zinc-400">{k.competition || "-"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-zinc-400">
                      {k.lowBid || k.highBid ? `${money(k.lowBid)}–${money(k.highBid)}` : "-"}
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min="0.05"
                        max="50"
                        step="0.05"
                        value={bids[k.text] ?? ""}
                        onChange={(e) => setBids({ ...bids, [k.text]: e.target.value })}
                        className="hub-field w-24 text-sm"
                        aria-label={`Max bid for ${k.text}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block text-xs text-zinc-400">
              Bid where
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="hub-field mt-1 block w-full text-sm"
              >
                <option value={NEW_CAMPAIGN}>New Search campaign</option>
                {found.adGroups.map((g) => (
                  <option key={g.resourceName} value={g.resourceName}>
                    {`${g.campaign} › ${g.name}${g.campaignStatus === "PAUSED" ? " (paused)" : ""}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-400">
              Match type
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className="hub-field mt-1 block w-full text-sm"
              >
                <option value="PHRASE">Phrase (recommended)</option>
                <option value="EXACT">Exact</option>
                <option value="BROAD">Broad</option>
              </select>
            </label>
            {isNew ? (
              <label className="block text-xs text-zinc-400">
                Daily budget ({currency})
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="hub-field mt-1 block w-full text-sm"
                />
              </label>
            ) : group && !group.manualCpc ? (
              <p className="self-end text-xs text-zinc-500">
                This campaign uses automated bidding, so Google sets the bids within its budget. Your max bids are ignored.
              </p>
            ) : null}
          </div>
          {isNew ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
              Start it right away (otherwise it&apos;s created paused with a Kaylev-written ad for you to check)
            </label>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void bid()}
              disabled={Boolean(busy) || !chosen.length || badBid || (isNew && !(Number(dailyBudget) >= 1 && Number(dailyBudget) <= 500))}
              className="rounded-xl border border-amber-500/60 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
            >
              {busy === "bid"
                ? "Sending to Google Ads…"
                : `Bid on ${chosen.length} keyword${chosen.length === 1 ? "" : "s"}`}
            </button>
            {badBid ? <span className="text-xs text-rose-300">Bids must be between $0.05 and $50.</span> : null}
            <span className="text-xs text-zinc-500">Spends {companyName}&apos;s ad budget. You confirm first.</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
