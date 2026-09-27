"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";

import { parseAudiencePreset, type AudiencePreset } from "@/lib/contactAudiences";

type AudienceChoice = AudiencePreset | "custom";

const AUDIENCE_COPY: Record<AudiencePreset, string> = {
  trades:
    "Trades prospect audits only — HVAC, mechanical, and similar cold audits.",
  audits: "All prospect audits (trades and other audited companies).",
  leads: "New leads — forms, Facebook, Kaylev chat, consult requests.",
  engaged:
    "Engaged contacts — opened or clicked an email, or tagged engaged / warm-lead.",
  me: "Me only — a self-test on my DigiSol contact.",
};

export function AiWorkflowGenerator() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [timeline, setTimeline] = useState("welcome, wait 1 day, then a follow-up");
  const [audience, setAudience] = useState("");
  const [audiencePreset, setAudiencePreset] = useState<AudienceChoice>("audits");
  const [offer, setOffer] = useState("Book a free consultation");
  const [triggerHint, setTriggerHint] = useState("new_lead");
  const [tagGuidance, setTagGuidance] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [createdTags, setCreatedTags] = useState<
    { name: string; description: string }[]
  >([]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSummary("");
    setCreatedTags([]);
    try {
      const response = await fetch("/api/hub/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          timeline,
          audiencePreset,
          audience:
            audiencePreset === "custom" ? audience.trim() : AUDIENCE_COPY[audiencePreset],
          audienceDetail: audiencePreset === "custom" ? "" : audience.trim(),
          offer,
          triggerHint,
          tagGuidance,
          notes: [
            notes.trim(),
            "Build the full plan: welcome (video or poster if I mentioned one), a wait, a follow-up, and the tags. I will review before sending.",
          ]
            .filter(Boolean)
            .join("\n"),
          save: true,
        }),
      });
      const result = (await response.json()) as {
        id?: string;
        summary?: string;
        audience?: string;
        tags?: { name: string; description: string }[];
        error?: string;
      };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "Could not generate workflow");
      }
      setCreatedTags(result.tags ?? []);
      setSummary(result.summary || "Workflow created. Review the steps, then Run now.");
      const presetKey = parseAudiencePreset(result.audience);
      const audienceQuery = presetKey ? `?audience=${presetKey}` : "";
      router.push(`/hub/workflows/${result.id}${audienceQuery}`);
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
            Tell Kaylev the goal, who it is for, and how long to wait. It
            builds the whole path — welcome (audit video or a poster you name),
            wait, follow-up, and tags — then loads that audience into Will run
            for. You review the steps and the people before anything sends.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Goal *
            <MicDictateButton
              disabled={busy}
              onText={(chunk) => setGoal((current) => appendDictation(current, chunk))}
            />
          </span>
          <textarea
            required
            rows={3}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="e.g. Prospect audit for trades: welcome with the website-audit video, wait a day, then a follow-up"
            className="hub-field mt-1.5 min-h-[88px]"
          />
        </label>
        <label className="text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Timeline
            <MicDictateButton
              disabled={busy}
              onText={(chunk) => setTimeline((current) => appendDictation(current, chunk))}
            />
          </span>
          <input
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            placeholder="1 day between welcome and follow-up"
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
          Audience preset
          <select
            value={audiencePreset}
            onChange={(event) => setAudiencePreset(event.target.value as AudienceChoice)}
            className="hub-field mt-1.5"
          >
            <option value="trades">Trades prospect audits</option>
            <option value="audits">All prospect audits</option>
            <option value="leads">New leads</option>
            <option value="engaged">Engaged (opened / clicked)</option>
            <option value="me">Me (self-test)</option>
            <option value="custom">Custom (type below)</option>
          </select>
          <span className="mt-1 block text-xs text-zinc-500">
            {audiencePreset === "custom"
              ? "Kaylev designs for exactly who you type in Audience detail."
              : AUDIENCE_COPY[audiencePreset]}
          </span>
        </label>
        <label className="text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Audience detail {audiencePreset === "custom" ? "*" : "(optional)"}
            <MicDictateButton
              disabled={busy}
              onText={(chunk) => setAudience((current) => appendDictation(current, chunk))}
            />
          </span>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            required={audiencePreset === "custom"}
            placeholder={
              audiencePreset === "custom"
                ? "e.g. Airdrie retailers, Calgary contractors…"
                : "Narrow it, e.g. HVAC owners in Airdrie who watched the video"
            }
            className="hub-field mt-1.5"
          />
        </label>
        <label className="text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Offer / CTA
            <MicDictateButton
              disabled={busy}
              onText={(chunk) => setOffer((current) => appendDictation(current, chunk))}
            />
          </span>
          <input
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            placeholder="Book a free consultation"
            className="hub-field mt-1.5"
          />
        </label>
        <label className="sm:col-span-2 text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Tag guidance (optional)
            <MicDictateButton
              disabled={busy}
              onText={(chunk) =>
                setTagGuidance((current) => appendDictation(current, chunk))
              }
            />
          </span>
          <input
            value={tagGuidance}
            onChange={(event) => setTagGuidance(event.target.value)}
            placeholder="e.g. Use warm-lead after open, consulted after they book, trades-nurture for contractors"
            className="hub-field mt-1.5"
          />
        </label>
        <label className="sm:col-span-2 text-sm text-zinc-300">
          <span className="flex items-center justify-between gap-2">
            Extra notes
            <MicDictateButton
              disabled={busy}
              onText={(chunk) => setNotes((current) => appendDictation(current, chunk))}
            />
          </span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tone, exclusions, must-include steps…"
            className="hub-field mt-1.5"
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !goal.trim()}
            className="hub-btn inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {busy ? "Building the plan…" : "Build the workflow"}
          </button>
          {summary ? <p className="text-sm text-indigo-200">{summary}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
        {createdTags.length > 0 ? (
          <ul className="sm:col-span-2 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm">
            {createdTags.map((tag) => (
              <li key={tag.name} className="text-zinc-300">
                <span className="font-medium text-emerald-300">{tag.name}</span>
                {tag.description ? (
                  <span className="text-zinc-500"> — {tag.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </section>
  );
}
