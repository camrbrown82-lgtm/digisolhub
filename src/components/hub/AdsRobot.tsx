"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ExternalLink, Loader2, Pause, Play, Rocket, Save, Trash2 } from "lucide-react";
import type { AdDraftRow } from "@/lib/meta/adDrafts";
import { AD_CTAS, AD_OBJECTIVES } from "@/lib/meta/adOptions";

export type RobotPoster = { url: string; label: string };
export type CampaignStats = { spend: number; clicks: number; leads: number; cpl: number | null };

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none";

const STATUS: Record<AdDraftRow["status"], { label: string; className: string }> = {
  draft: { label: "Draft (Hub only)", className: "border-zinc-600 text-zinc-300" },
  ready: { label: "In Meta · paused", className: "border-amber-400/50 text-amber-200" },
  active: { label: "Live", className: "border-emerald-400/50 text-emerald-200" },
  paused: { label: "Paused", className: "border-zinc-500 text-zinc-300" },
  failed: { label: "Needs a fix", className: "border-rose-400/50 text-rose-200" },
};

function PosterPicker({
  posters,
  value,
  onChange,
}: {
  posters: RobotPoster[];
  value: string;
  onChange: (url: string) => void;
}) {
  if (!posters.length) {
    return <p className="text-xs text-zinc-500">No posters yet. Make one under AI posters first.</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {posters.map((poster) => (
        <button
          key={poster.url}
          type="button"
          onClick={() => onChange(poster.url)}
          title={poster.label}
          className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
            value === poster.url ? "border-indigo-400" : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster.url} alt={poster.label} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

function DraftCard({
  initial,
  posters,
  currency,
  maxBudget,
  connected,
  stats,
  adsManagerUrl,
  money,
  onRemoved,
}: {
  onRemoved: () => void;
  initial: AdDraftRow;
  posters: RobotPoster[];
  currency: string;
  maxBudget: number;
  connected: boolean;
  stats?: CampaignStats;
  adsManagerUrl: string;
  money: (value: number) => string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [locations, setLocations] = useState(initial.locations.join(", "));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(initial.error || "");
  const editable = draft.status === "draft" || draft.status === "failed";

  function set<K extends keyof AdDraftRow>(key: K, value: AdDraftRow[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function call(method: "PATCH" | "POST" | "DELETE", body?: Record<string, unknown>, label = "") {
    setBusy(label || method);
    setMessage("");
    try {
      const response = await fetch(`/api/hub/meta-ads/${draft.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; draft?: AdDraftRow };
      if (json.draft) {
        setDraft(json.draft);
        setLocations(json.draft.locations.join(", "));
      }
      if (!response.ok) {
        setMessage(json.error || "Something went wrong.");
        return false;
      }
      return true;
    } finally {
      setBusy("");
    }
  }

  const fields = () => ({
    ...draft,
    locations: locations.split(",").map((l) => l.trim()).filter(Boolean),
  });

  async function save() {
    if (await call("PATCH", fields(), "save")) setMessage("Saved.");
  }

  async function createInMeta() {
    if (!(await call("PATCH", fields(), "create"))) return;
    if (await call("POST", { action: "create" }, "create")) {
      setMessage("Created in Meta, paused. Nothing spends until you launch it.");
      router.refresh();
    }
  }

  async function launch() {
    if (!window.confirm(`Launch "${draft.name}" at ${money(draft.daily_budget)} a day? It starts spending right away.`)) {
      return;
    }
    if (await call("POST", { action: "launch" }, "launch")) router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this draft?")) return;
    if (await call("DELETE", undefined, "delete")) onRemoved();
  }

  const status = STATUS[draft.status] ?? STATUS.draft;
  const campaignLink = draft.meta_campaign_id ? `${adsManagerUrl}&selected_campaign_ids=${draft.meta_campaign_id}` : "";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{draft.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {AD_OBJECTIVES[draft.objective as keyof typeof AD_OBJECTIVES] || draft.objective} ·{" "}
            {money(draft.daily_budget)}/day · {new Date(draft.created_at).toLocaleDateString("en-CA")}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${status.className}`}>{status.label}</span>
      </div>

      {stats ? (
        <p className="mt-3 text-xs text-zinc-300">
          Last 14 days: {money(stats.spend)} spent · {stats.clicks.toLocaleString("en-CA")} clicks · {stats.leads} leads
          {stats.cpl != null ? ` · ${money(stats.cpl)} per lead` : ""}
        </p>
      ) : null}

      <div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
          <p className="whitespace-pre-line text-zinc-200">{draft.primary_text || "Primary text"}</p>
          {draft.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.poster_url} alt="" className="mt-2 aspect-[4/5] w-full rounded object-cover" />
          ) : (
            <div className="mt-2 flex aspect-[4/5] items-center justify-center rounded bg-zinc-900 text-zinc-600">
              No poster
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{draft.headline || "Headline"}</p>
              <p className="truncate text-zinc-500">{draft.description}</p>
            </div>
            <span className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-zinc-200">
              {AD_CTAS[draft.cta as keyof typeof AD_CTAS] || "Learn more"}
            </span>
          </div>
        </div>

        {editable ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Campaign name
              <input className={inputClass} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Primary text
              <textarea
                className={inputClass}
                rows={3}
                value={draft.primary_text}
                onChange={(e) => set("primary_text", e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-400">
              Headline ({draft.headline.length}/40)
              <input className={inputClass} value={draft.headline} onChange={(e) => set("headline", e.target.value)} />
            </label>
            <label className="text-xs text-zinc-400">
              Description
              <input
                className={inputClass}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            <label className="text-xs text-zinc-400">
              Goal
              <select className={inputClass} value={draft.objective} onChange={(e) => set("objective", e.target.value)}>
                {Object.entries(AD_OBJECTIVES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Button
              <select className={inputClass} value={draft.cta} onChange={(e) => set("cta", e.target.value)}>
                {Object.entries(AD_CTAS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Website link
              <input className={inputClass} value={draft.link_url} onChange={(e) => set("link_url", e.target.value)} />
            </label>
            <label className="text-xs text-zinc-400">
              Daily budget ({currency}, max {maxBudget})
              <input
                type="number"
                min={1}
                max={maxBudget}
                className={inputClass}
                value={draft.daily_budget}
                onChange={(e) => set("daily_budget", Number(e.target.value))}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Age from
                <input
                  type="number"
                  min={18}
                  max={65}
                  className={inputClass}
                  value={draft.age_min}
                  onChange={(e) => set("age_min", Number(e.target.value))}
                />
              </label>
              <label className="text-xs text-zinc-400">
                to
                <input
                  type="number"
                  min={18}
                  max={65}
                  className={inputClass}
                  value={draft.age_max}
                  onChange={(e) => set("age_max", Number(e.target.value))}
                />
              </label>
            </div>
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Places (comma separated)
              <input
                className={inputClass}
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Calgary, Edmonton, Alberta"
              />
            </label>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-zinc-400">Poster (sent to Meta at 1080×1350)</p>
              <PosterPicker posters={posters} value={draft.poster_url || ""} onChange={(url) => set("poster_url", url)} />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-zinc-400">
            <p>
              <span className="text-zinc-500">Link:</span> {draft.link_url}
            </p>
            <p>
              <span className="text-zinc-500">Audience:</span> {draft.locations.join(", ") || "Canada"}, ages{" "}
              {draft.age_min}–{draft.age_max}
            </p>
            <p className="text-zinc-500">Brief: {draft.brief}</p>
          </div>
        )}
      </div>

      {message ? (
        <p className={`mt-3 text-xs ${draft.error && message === draft.error ? "text-rose-300" : "text-indigo-200"}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {editable ? (
          <>
            <button
              type="button"
              onClick={() => void save()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-60"
            >
              {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => void createInMeta()}
              disabled={Boolean(busy) || !connected}
              title={connected ? "" : "Connect the Meta ad account first"}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Create in Meta (paused)
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-zinc-400 hover:text-rose-300 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </>
        ) : null}
        {draft.status === "ready" || draft.status === "paused" ? (
          <button
            type="button"
            onClick={() => void launch()}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy === "launch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Launch
          </button>
        ) : null}
        {draft.status === "active" ? (
          <button
            type="button"
            onClick={() => void call("POST", { action: "pause" }, "pause").then((ok) => ok && router.refresh())}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-60"
          >
            {busy === "pause" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
            Pause
          </button>
        ) : null}
        {campaignLink ? (
          <a
            href={campaignLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-indigo-300 hover:text-indigo-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Ads Manager
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function AdsRobot({
  drafts,
  posters,
  currency,
  maxBudget,
  connected,
  stats,
  adsManagerUrl,
}: {
  drafts: AdDraftRow[];
  posters: RobotPoster[];
  currency: string;
  maxBudget: number;
  connected: boolean;
  stats: Record<string, CampaignStats>;
  adsManagerUrl: string;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState(Math.min(20, maxBudget));
  const [objective, setObjective] = useState("");
  const [poster, setPoster] = useState(posters[0]?.url || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState(drafts);
  const money = (value: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

  async function draftIt(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hub/meta-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, dailyBudget: budget, posterUrl: poster, objective: objective || undefined }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; draft?: AdDraftRow };
      if (!response.ok || !json.draft) {
        setError(json.error || "The robot could not write that draft.");
        return;
      }
      setList((current) => [json.draft!, ...current]);
      setBrief("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={draftIt} className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Bot className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          New campaign
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Say what you want to promote and who it&apos;s for. The robot writes the copy in the brand voice and picks
          the audience. You review it, create it in Meta paused, then launch it when you&apos;re happy.
        </p>
        <textarea
          className={`${inputClass} mt-3`}
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Custom websites for trades businesses in Calgary and Edmonton. Push the free website audit."
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            Daily budget ({currency}, max {maxBudget})
            <input
              type="number"
              min={1}
              max={maxBudget}
              className={inputClass}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-zinc-400">
            Goal
            <select className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="">Let the robot pick</option>
              {Object.entries(AD_OBJECTIVES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs text-zinc-400">Poster</p>
          <PosterPicker posters={posters} value={poster} onChange={setPoster} />
        </div>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || brief.trim().length < 10}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {busy ? "Writing the draft…" : "Draft it"}
        </button>
      </form>

      {list.length ? (
        <div className="space-y-4">
          {list.map((draft) => (
            <DraftCard
              key={draft.id}
              initial={draft}
              posters={posters}
              currency={currency}
              maxBudget={maxBudget}
              connected={connected}
              stats={draft.meta_campaign_id ? stats[draft.meta_campaign_id] : undefined}
              adsManagerUrl={adsManagerUrl}
              money={money}
              onRemoved={() => setList((current) => current.filter((row) => row.id !== draft.id))}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No campaigns yet. Describe one above.</p>
      )}
    </div>
  );
}
