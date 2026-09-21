"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type AbAuditPeriod,
  type AbSendRow,
  summarizeAbSends,
} from "@/lib/campaignAb";

type Audit = {
  id: string;
  period: string;
  note: string;
  winner_pick: string | null;
  created_at: string;
};

export function AbCampaignResults({
  campaignId,
  campaignName,
  industry,
  winnerVariant,
  sends,
  audits: initialAudits,
}: {
  campaignId: string;
  campaignName: string;
  industry: string | null;
  winnerVariant: string | null;
  sends: AbSendRow[];
  audits: Audit[];
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<AbAuditPeriod>("week");
  const [note, setNote] = useState("");
  const [winnerPick, setWinnerPick] = useState<"A" | "B" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audits, setAudits] = useState(initialAudits);

  const summary = useMemo(
    () => summarizeAbSends(sends, period),
    [sends, period],
  );

  async function saveAudit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/hub/campaigns/${campaignId}/audit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          note,
          winnerPick: winnerPick || null,
          setCampaignWinner: Boolean(winnerPick),
        }),
      });
      const result = (await response.json()) as {
        audit?: Audit;
        error?: string;
      };
      if (!response.ok || !result.audit) {
        throw new Error(result.error || "Could not save audit");
      }
      setAudits((current) => [result.audit!, ...current]);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            A/B campaign
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{campaignName}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {industry ? `Industry: ${industry}` : "Audience campaign"}
            {winnerVariant ? ` · Winner: ${winnerVariant}` : ""}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-zinc-700 p-1">
          {(["day", "week", "month"] as AbAuditPeriod[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                period === item
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {item === "day" ? "24h" : item === "week" ? "7d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {([summary.a, summary.b] as const).map((stats) => (
          <div
            key={stats.variant}
            className={`rounded-xl border p-4 ${
              summary.leader === stats.variant
                ? "border-indigo-400/50 bg-indigo-500/10"
                : "border-zinc-800 bg-zinc-950/50"
            }`}
          >
            <p className="text-sm font-semibold text-white">
              Variant {stats.variant}
              {summary.leader === stats.variant ? " · leading" : ""}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-zinc-500">Sent</dt>
                <dd className="font-medium text-zinc-200">{stats.sent}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Open rate</dt>
                <dd className="font-medium text-zinc-200">{stats.openRate}%</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Click rate</dt>
                <dd className="font-medium text-zinc-200">{stats.clickRate}%</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Click / open</dt>
                <dd className="font-medium text-zinc-200">{stats.clickToOpen}%</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {summary.leader === "insufficient"
          ? "Need about 5+ sends per variant in this window before calling a leader."
          : summary.leader === "tie"
            ? "Variants are tied on click and open rate in this window."
            : `Variant ${summary.leader} is ahead in this ${period} window (clicks first, then opens).`}
      </p>

      <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
        <p className="text-sm font-medium text-zinc-200">Audit log</p>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="hub-field min-h-[64px]"
          placeholder="Weekly note: subject B wins opens; keep A body and swap subject…"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={winnerPick}
            onChange={(event) =>
              setWinnerPick(event.target.value as "A" | "B" | "")
            }
            className="hub-field w-auto"
          >
            <option value="">No winner yet</option>
            <option value="A">Declare A winner</option>
            <option value="B">Declare B winner</option>
          </select>
          <button
            type="button"
            disabled={busy || (!note.trim() && !winnerPick)}
            onClick={() => void saveAudit()}
            className="hub-btn-secondary"
          >
            {busy ? "Saving…" : `Save ${period} audit`}
          </button>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <ul className="space-y-2 text-sm">
          {audits.length === 0 ? (
            <li className="text-zinc-500">No audits yet — log daily/weekly notes as results come in.</li>
          ) : (
            audits.map((audit) => (
              <li
                key={audit.id}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300"
              >
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  {audit.period} ·{" "}
                  {new Date(audit.created_at).toLocaleString("en-CA")}
                  {audit.winner_pick ? ` · picked ${audit.winner_pick}` : ""}
                </span>
                {audit.note ? <p className="mt-1">{audit.note}</p> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
