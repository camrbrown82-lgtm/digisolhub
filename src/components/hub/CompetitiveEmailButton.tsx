"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

type Props = {
  analysisId: string;
  companyName: string;
  defaultEmail?: string | null;
  defaultName?: string | null;
  lastEmailedTo?: string | null;
  lastEmailedAt?: string | null;
};

/** Emails the selected competitive analysis to someone at the company, from DigiSol. */
export function CompetitiveEmailButton({
  analysisId,
  companyName,
  defaultEmail,
  defaultName,
  lastEmailedTo,
  lastEmailedAt,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/hub/competitive/${analysisId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), name: data.get("name"), note: data.get("note") }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; email?: string };
    setSending(false);
    if (!response.ok) {
      setError(result.error || "Could not send the report.");
      return;
    }
    setSentTo(result.email || String(data.get("email")));
    setOpen(false);
    router.refresh();
  }

  const status = sentTo
    ? `Sent to ${sentTo}`
    : lastEmailedTo && lastEmailedAt
      ? `Emailed to ${lastEmailedTo} · ${new Date(lastEmailedAt).toLocaleDateString()}`
      : "";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 print:hidden sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hub-btn inline-flex w-full items-center justify-center gap-1.5 text-xs sm:w-auto"
      >
        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">Email to {companyName}</span>
      </button>
      {status ? (
        <span className="max-w-full break-all text-xs text-emerald-300 sm:text-right">{status}</span>
      ) : null}
      {open ? (
        <form
          onSubmit={onSubmit}
          className="w-full space-y-3 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl sm:w-96"
        >
          <p className="text-xs text-zinc-400">
            Sends this report from DigiSol, in DigiSol&apos;s brand: the score, any award badges this analysis
            earned, the scorecard, quick wins, action plan, competitors and keywords.
          </p>
          <label className="block text-xs text-zinc-400">
            To
            <input
              name="email"
              type="email"
              required
              defaultValue={defaultEmail ?? ""}
              className="hub-field mt-1 w-full"
              placeholder="name@company.com"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Their name
            <input name="name" defaultValue={defaultName ?? ""} className="hub-field mt-1 w-full" placeholder="Optional" />
          </label>
          <label className="block text-xs text-zinc-400">
            Personal note
            <textarea
              name="note"
              rows={3}
              className="hub-field mt-1 w-full"
              placeholder="Optional. Shown above the results."
            />
          </label>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">
              Cancel
            </button>
            <button type="submit" disabled={sending} className="hub-btn w-full sm:w-auto">
              {sending ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
