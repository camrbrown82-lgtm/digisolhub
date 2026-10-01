"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Check, Loader2, Trash2 } from "lucide-react";
import { AD_OBJECTIVES } from "@/lib/meta/adOptions";
import { CAMPAIGN_CHANNEL_LABELS } from "@/lib/campaignChannels";
import {
  dailyFromWeekly,
  formatMountain,
  nextPostInstant,
  type PlanItem,
  type SocialPlan,
} from "@/lib/social/weekPlan";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none";

const STATUS: Record<SocialPlan["status"], string> = {
  draft: "Needs your approval",
  running: "Approved and running",
  cancelled: "Dropped",
};

function PlanCard({
  initial,
  maxDaily,
  money,
}: {
  initial: SocialPlan;
  maxDaily: number;
  money: (value: number) => string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(plan.error || "");
  const editable = plan.status === "draft";
  const daily = dailyFromWeekly(Number(plan.weekly_budget), maxDaily);
  const posts = items.filter((item) => item.kind === "post" && item.included);
  const ad = items.find((item) => item.kind === "ad");

  function patchItem(id: string, patch: Partial<PlanItem>) {
    setItems((current) => current.map((item) => (item.id === id ? ({ ...item, ...patch } as PlanItem) : item)));
  }

  async function send(method: "PATCH" | "POST", body: Record<string, unknown>, label: string) {
    setBusy(label);
    setMessage("");
    try {
      const response = await fetch(`/api/hub/social-plan/${plan.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; plan?: SocialPlan };
      if (json.plan) {
        setPlan(json.plan);
        setItems(json.plan.items);
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

  async function approve() {
    const spend = ad?.included ? `${money(daily)} a day on Meta (about ${money(daily * 7)} this week)` : "no ad spend";
    const line = `Approve this week? ${posts.length} post${posts.length === 1 ? "" : "s"} will go out on schedule, with ${spend}.`;
    if (!window.confirm(line)) return;
    if (await send("POST", { action: "approve", items }, "approve")) router.refresh();
  }

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{plan.summary || "Weekly plan"}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {STATUS[plan.status]} · {money(Number(plan.weekly_budget))} week cap ·{" "}
            {new Date(plan.created_at).toLocaleDateString("en-CA")}
          </p>
        </div>
      </div>
      {plan.why ? <p className="mt-3 text-sm text-zinc-300">{plan.why}</p> : null}
      <div className="mt-4 space-y-3">
        {items.map((item) =>
          item.kind === "post" ? (
            <div key={item.id} className="rounded-xl border border-zinc-800 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-200">
                  {CAMPAIGN_CHANNEL_LABELS[item.channel]} ·{" "}
                  {formatMountain(nextPostInstant(item.dayOffset, item.hour))} MT
                </p>
                <span className="text-[11px] uppercase tracking-wide text-zinc-500">{item.status}</span>
              </div>
              {editable ? (
                <textarea
                  className={`${inputClass} mt-2`}
                  rows={3}
                  value={item.body}
                  onChange={(event) => patchItem(item.id, { body: event.target.value })}
                />
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">{item.body}</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">{item.reason}</p>
              {item.error ? <p className="mt-1 text-xs text-rose-300">{item.error}</p> : null}
              {editable ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={(event) => patchItem(item.id, { included: event.target.checked })}
                  />
                  Include this post
                </label>
              ) : null}
            </div>
          ) : (
            <div key={item.id} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-indigo-100">
                  Meta ad · {item.locations.join(", ")} · ages {item.ageMin}–{item.ageMax}
                </p>
                <span className="text-[11px] uppercase tracking-wide text-indigo-200/70">{item.status}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{item.headline}</p>
              {editable ? (
                <textarea
                  className={`${inputClass} mt-2`}
                  rows={3}
                  value={item.primaryText}
                  onChange={(event) => patchItem(item.id, { primaryText: event.target.value })}
                />
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm text-zinc-200">{item.primaryText}</p>
              )}
              <p className="mt-2 text-xs text-indigo-100/70">
                {AD_OBJECTIVES[item.objective]} · {money(daily)}/day · {item.reason}
              </p>
              {item.error ? <p className="mt-1 text-xs text-rose-300">{item.error}</p> : null}
              {editable ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-indigo-100/80">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={(event) => patchItem(item.id, { included: event.target.checked })}
                  />
                  Run this ad
                </label>
              ) : null}
            </div>
          ),
        )}
      </div>
      {message ? <p className="mt-3 text-xs text-rose-300">{message}</p> : null}
      {editable ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void approve()}
            disabled={Boolean(busy) || posts.length + (ad?.included ? 1 : 0) === 0}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve and run
          </button>
          <button
            type="button"
            onClick={() => void send("POST", { action: "cancel" }, "cancel").then((ok) => ok && router.refresh())}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-zinc-400 hover:text-rose-300 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Drop plan
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function SocialWeekPlanner({
  plans,
  maxDaily,
  setupError,
}: {
  plans: SocialPlan[];
  maxDaily: number;
  setupError?: string | null;
}) {
  const router = useRouter();
  const maxWeekly = maxDaily * 7;
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState(Math.min(140, maxWeekly));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState(plans);
  const money = (value: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
  const daily = dailyFromWeekly(budget, maxDaily);

  async function planWeek(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hub/social-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, weeklyBudget: budget }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; plan?: SocialPlan };
      if (!response.ok || !json.plan) {
        setError(json.error || "Could not write the plan.");
        return;
      }
      setList((current) => [json.plan!, ...current]);
      setBrief("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarRange className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          Social media plan
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Pick a weekly budget and what to promote. The plan is posts to DigiSol&apos;s Facebook Page and Instagram
          feed, plus one Meta ad in the cities it recommends. Nothing goes out until you approve it here. The budget
          is ad spend; posting is free. Not included: Facebook Groups, Stories, TikTok, and LinkedIn ads.
        </p>
      </div>
      {setupError ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {setupError} You can still write and approve a plan; posting and ads run once this is fixed.
        </p>
      ) : null}
      <form onSubmit={planWeek} className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
        <label className="text-xs text-zinc-400">
          What should this week do?
          <textarea
            className={`${inputClass} mt-1`}
            rows={3}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="e.g. Book website audits with trades businesses in Calgary and Edmonton."
          />
        </label>
        <label className="mt-3 block max-w-xs text-xs text-zinc-400">
          Weekly ad budget (max {money(maxWeekly)}, about {money(daily)} a day)
          <input
            type="number"
            min={0}
            max={maxWeekly}
            className={`${inputClass} mt-1`}
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
          />
        </label>
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || brief.trim().length < 10}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
          {busy ? "Planning the week…" : "Plan the week"}
        </button>
      </form>
      {list.filter((plan) => plan.status !== "cancelled").map((plan) => (
        <PlanCard key={plan.id} initial={plan} maxDaily={maxDaily} money={money} />
      ))}
    </section>
  );
}
