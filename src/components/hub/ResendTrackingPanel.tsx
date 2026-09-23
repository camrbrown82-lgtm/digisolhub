"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Tracking = {
  domain: string | null;
  openTracking: boolean;
  clickTracking: boolean;
  trackingSubdomain: string | null;
  domainStatus: string | null;
  trackingReady: boolean;
  dnsHint: string | null;
  error?: string;
  updated?: boolean;
};

export function ResendTrackingPanel() {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/hub/resend-tracking");
    const json = (await res.json()) as {
      tracking?: Tracking;
      error?: string;
    };
    if (!res.ok) {
      setMessage(json.error || "Could not load Resend tracking status");
      return;
    }
    setTracking(json.tracking ?? null);
    setMessage("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enableAndSync() {
    setBusy(true);
    setMessage("Enabling open tracking and syncing recent sends…");
    try {
      const res = await fetch("/api/hub/resend-tracking", { method: "POST" });
      const json = (await res.json()) as {
        tracking?: Tracking;
        sync?: { synced?: number; checked?: number };
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error || "Failed");
        return;
      }
      setTracking(json.tracking ?? null);
      setMessage(
        [
          json.note,
          json.sync
            ? `Synced ${json.sync.synced ?? 0} of ${json.sync.checked ?? 0} recent sends.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            Resend open tracking
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Opens only register when the sending domain has open tracking on
            and a verified tracking CNAME. Resend disables this by default.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void enableAndSync()}
          className="hub-btn inline-flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {busy ? "Working…" : "Enable + sync opens"}
        </button>
      </div>

      {tracking ? (
        <ul className="mt-4 space-y-1.5 text-xs">
          <li>
            Domain:{" "}
            <span className="text-zinc-200">{tracking.domain || "—"}</span>
            {tracking.domainStatus ? (
              <span className="text-zinc-500"> · {tracking.domainStatus}</span>
            ) : null}
          </li>
          <li>
            Open tracking:{" "}
            <span
              className={
                tracking.openTracking ? "text-emerald-300" : "text-amber-200"
              }
            >
              {tracking.openTracking ? "on" : "off"}
            </span>
            {" · "}
            Click tracking:{" "}
            <span
              className={
                tracking.clickTracking ? "text-emerald-300" : "text-zinc-500"
              }
            >
              {tracking.clickTracking ? "on" : "off"}
            </span>
          </li>
          <li>
            Tracking subdomain:{" "}
            <span className="text-zinc-200">
              {tracking.trackingSubdomain || "not set"}
            </span>
          </li>
          <li>
            Ready for Hub open rates:{" "}
            <span
              className={
                tracking.trackingReady ? "text-emerald-300" : "text-amber-200"
              }
            >
              {tracking.trackingReady ? "yes" : "not yet"}
            </span>
          </li>
          {tracking.dnsHint ? (
            <li className="text-amber-100/90">{tracking.dnsHint}</li>
          ) : null}
          {tracking.error ? (
            <li className="text-rose-300">{tracking.error}</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">Loading…</p>
      )}

      {message ? <p className="mt-3 text-xs text-zinc-300">{message}</p> : null}

      <p className="mt-4 text-xs text-zinc-500">
        Also confirm in Resend → Webhooks that{" "}
        <code className="text-zinc-300">
          https://wwwdigisol.com/api/webhooks/resend
        </code>{" "}
        receives <code className="text-zinc-300">email.opened</code> and{" "}
        <code className="text-zinc-300">email.clicked</code>. Self-tests can
        under-count when the client blocks tracking pixels (Apple Mail Privacy
        / image blocking).
      </p>
    </div>
  );
}
