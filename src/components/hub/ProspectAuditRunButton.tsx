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
        queueSeed?: { inserted?: number; pendingBefore?: number };
        requeuedDryRuns?: number;
        expandedSectors?: boolean;
        results?: Array<{ reason?: string; note?: string }>;
      };
      if (!res.ok) {
        setMessage(json.error || "Run failed");
        return;
      }
      const t = json.totals || {};
      const seeded = json.queueSeed?.inserted ?? 0;
      setMessage(
        [
          seeded ? `Seeded ${seeded} prospect${seeded === 1 ? "" : "s"}.` : null,
          json.requeuedDryRuns
            ? `Re-queued ${json.requeuedDryRuns} dry-run/Resend row${json.requeuedDryRuns === 1 ? "" : "s"}.`
            : null,
          json.expandedSectors ? "Expanded beyond preferred trades." : null,
          `Attempted ${t.attempted ?? 0} · audited ${t.audited ?? 0} · emailed ${t.emailed ?? 0} · CASL blocked ${t.caslBlocked ?? 0} · failed ${t.failed ?? 0}.`,
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
