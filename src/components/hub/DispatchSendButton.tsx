"use client";

import { useState } from "react";

export function DispatchSendButton() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSend() {
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/cron/dispatch", { method: "POST" });
    const result = (await response.json()) as {
      error?: string;
      sent?: number;
      skipped?: number;
      failed?: number;
      issues?: number;
    };
    setBusy(false);
    if (!response.ok) {
      setStatus(result.error || "Could not send");
      return;
    }
    setStatus(
      `Sent ${result.sent ?? 0} email${result.sent === 1 ? "" : "s"}. Skipped ${result.skipped ?? 0}. Failed ${result.failed ?? 0}.`,
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void onSend()}
        disabled={busy}
        className="hub-btn"
      >
        {busy ? "Sending…" : "Send new Dispatch issues now"}
      </button>
      {status ? <p className="mt-2 text-sm text-indigo-300">{status}</p> : null}
    </div>
  );
}
