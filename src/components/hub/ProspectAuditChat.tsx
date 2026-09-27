"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";

type Turn = { role: "user" | "assistant"; content: string };

export function ProspectAuditChat() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Tell me who to audit. Example: “Audit Blaze Heating in Calgary, they’re HVAC” or “3 Edmonton plumbers from the list.” Trades land in Prospect audits — trades. Other companies land in Prospect audits — other. A Facebook or form inquiry lands in New leads.",
    },
  ]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const nextTurns: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(nextTurns);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/hub/prospects/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.filter((turn) => turn.role === "user" || turn.content),
        }),
      });
      const json = (await response.json()) as { reply?: string; error?: string };
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          content: json.reply || json.error || "Could not file that.",
        },
      ]);
      if (response.ok) router.refresh();
    } catch {
      setTurns((current) => [
        ...current,
        { role: "assistant", content: "Network error — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-4">
      <h2 className="text-sm font-semibold text-white">Kaylev — who to audit</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Speak or type. Kaylev files each business into the matching Contacts
        section and the audit queue. Nothing is emailed until you run audits.
      </p>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {turns.map((turn, index) => (
          <p
            key={`${turn.role}-${index}`}
            className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
              turn.role === "user"
                ? "ml-8 bg-indigo-600 text-white"
                : "mr-8 border border-zinc-800 bg-zinc-950/70 text-zinc-200"
            }`}
          >
            {turn.content}
          </p>
        ))}
        {busy ? <p className="text-xs text-zinc-500">Kaylev is filing…</p> : null}
      </div>
      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="prospect-kaylev" className="text-xs text-zinc-400">
            Message
          </label>
          <MicDictateButton
            disabled={busy}
            onText={(chunk) => setDraft((current) => appendDictation(current, chunk))}
          />
        </div>
        <div className="flex items-end gap-2">
          <textarea
            id="prospect-kaylev"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Audit Northstar Heating, Calgary HVAC, northstarheatingandcooling.ca"
            className="hub-field min-h-[4.5rem] flex-1 resize-y"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="hub-btn inline-flex h-10 items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
