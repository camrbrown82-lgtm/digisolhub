"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";

export function AiWorkflowGenerator() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [timeline, setTimeline] = useState("7 days");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("Book a free consultation");
  const [triggerHint, setTriggerHint] = useState("new_lead");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSummary("");
    try {
      const response = await fetch("/api/hub/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          timeline,
          audience,
          offer,
          triggerHint,
          notes,
          save: true,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        summary?: string;
        error?: string;
      };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "Could not generate workflow");
      }
      setSummary(result.summary || "Workflow created — open the canvas to attach email templates.");
      router.push(`/hub/workflows/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-indigo-600/30 p-2 text-indigo-200">
          <Wand2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">AI workflow generator</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Describe the goal, timeline, and offer. DigiSol builds a custom
            canvas workflow (trigger → emails → waits → tags) trained on this
            Hub&apos;s builder — then opens it so you can attach templates and
            enable it.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm text-zinc-300">
          Goal *
          <textarea
            required
            rows={3}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="e.g. Nurture new website leads into a booked DigiSol consult within 10 days"
            className="hub-field mt-1.5 min-h-[88px]"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Timeline
          <input
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            placeholder="7 days, 2 weeks…"
            className="hub-field mt-1.5"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Trigger hint
          <select
            value={triggerHint}
            onChange={(event) => setTriggerHint(event.target.value)}
            className="hub-field mt-1.5"
          >
            <option value="new_lead">New lead</option>
            <option value="tag_added">Tag added</option>
            <option value="email_opened">Email opened</option>
            <option value="">Let AI choose</option>
          </select>
        </label>
        <label className="text-sm text-zinc-300">
          Audience
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Airdrie retailers, Calgary contractors…"
            className="hub-field mt-1.5"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Offer / CTA
          <input
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            placeholder="Book a free consultation"
            className="hub-field mt-1.5"
          />
        </label>
        <label className="sm:col-span-2 text-sm text-zinc-300">
          Extra notes
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tone, exclusions, must-include steps…"
            className="hub-field mt-1.5"
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !goal.trim()} className="hub-btn inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {busy ? "Building workflow…" : "Generate & open canvas"}
          </button>
          {summary ? <p className="text-sm text-indigo-200">{summary}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
