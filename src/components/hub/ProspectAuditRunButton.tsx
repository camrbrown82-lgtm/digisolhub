"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";

export function ProspectAuditRunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(dryRun = false) {
    setBusy(true);
    setMessage(
      dryRun
        ? "Dry-run starting…"
        : "Running audits (incl. re-send of prior dry-runs)…",
    );
    try {
      const res = await fetch("/api/cron/prospect-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          manual: true,
          resendDryRuns: !dryRun,
          batchSize: dryRun ? 5 : 10,
          dailyMax: 25,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        totals?: {
          attempted?: number;
          audited?: number;
          emailed?: number;
          caslBlocked?: number;
          failed?: number;
        };
        queueSeed?: {
          inserted?: number;
          pendingBefore?: number;
          discovered?: number;
          discoveryTier?: string;
          discoverySearches?: Array<{ sector: string; city: string }>;
        };
        requeuedDryRuns?: number;
        expandedSectors?: boolean;
        results?: Array<{ reason?: string; note?: string }>;
      };
      if (!res.ok) {
        setMessage(json.error || "Run failed");
        return;
      }
      const t = json.totals || {};
      const ran = t.attempted ?? 0;
      const compliant = t.audited ?? 0;
      const seeded = json.queueSeed?.inserted ?? 0;
      const discovered = json.queueSeed?.discovered ?? 0;
      const searched = json.queueSeed?.discoverySearches ?? [];
      setMessage(
        [
          discovered
            ? `Found ${discovered} new business${discovered === 1 ? "" : "es"} with a published email (searched ${searched
                .map((s) => `${s.sector} in ${s.city}`)
                .join(", ")}).`
            : seeded
              ? `Seeded ${seeded} prospect${seeded === 1 ? "" : "s"}.`
              : null,
          json.queueSeed?.discoveryTier === "other"
            ? "Trades are searched out, so Kaylev moved on to other sectors."
            : null,
          json.requeuedDryRuns
            ? `Re-queued ${json.requeuedDryRuns} dry-run/Resend row${json.requeuedDryRuns === 1 ? "" : "s"}.`
            : null,
          json.expandedSectors ? "Expanded beyond preferred trades." : null,
          ran
            ? `Ran ${ran}. ${compliant} ${compliant === 1 ? "was" : "were"} email compliant.`
            : "Ran 0.",
          (t.failed ?? 0) > 0
            ? `${t.failed} failed before the CASL check finished.`
            : null,
          json.results?.[0]?.reason === "empty_queue"
            ? json.results[0].note || "Queue still empty."
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
      router.refresh();
    } catch {
      setMessage("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(true)}
          className="hub-btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Dry run
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className="hub-btn inline-flex items-center gap-1.5 text-xs"
        >
          <Play className="h-3.5 w-3.5" />
          {busy ? "Running…" : "Run audits now"}
        </button>
      </div>
      {message ? (
        <p className="max-w-md text-right text-xs text-zinc-400">{message}</p>
      ) : null}
    </div>
  );
}
