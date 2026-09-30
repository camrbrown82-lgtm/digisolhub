"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BRAND_WORDING_KEYS, type BrandWording } from "@/lib/branding";
import { appendDictation, MicDictateButton } from "@/components/hub/MicDictateButton";

type Key = (typeof BRAND_WORDING_KEYS)[number];

const LABELS: Record<Key, string> = {
  tagline: "Tagline",
  voice: "Voice / tone",
  audience: "Audience",
  doSay: "Words to lean on",
  dontSay: "Words to avoid",
  visualStyle: "Poster / visual style",
  extra: "Other brand notes",
};

/** Suggests the kit's wording from a description and the company's website. Colors, fonts, and logos are never changed. */
export function BrandWordingHelper({
  clientId,
  companyName,
  domain,
  onApply,
  onSave,
}: {
  clientId: string;
  companyName: string;
  domain?: string | null;
  onApply: (words: Partial<BrandWording>) => void;
  onSave: (words: Partial<BrandWording>) => Promise<boolean>;
}) {
  const [description, setDescription] = useState("");
  const [useWebsite, setUseWebsite] = useState(Boolean(domain));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState<BrandWording | null>(null);
  const [picked, setPicked] = useState<Record<Key, boolean>>(
    () => Object.fromEntries(BRAND_WORDING_KEYS.map((key) => [key, true])) as Record<Key, boolean>,
  );

  async function suggest() {
    setLoading(true);
    setError("");
    setNote("");
    const response = await fetch("/api/hub/brand/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, description, useWebsite }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      suggestions?: BrandWording;
      readWebsite?: boolean;
    };
    setLoading(false);
    if (!response.ok || !result.suggestions) {
      setError(result.error || "Could not suggest wording.");
      return;
    }
    setSuggestions(result.suggestions);
    if (useWebsite && domain && !result.readWebsite) setNote(`Couldn't read ${domain}, so this is from your description only.`);
  }

  function chosen() {
    if (!suggestions) return {};
    return Object.fromEntries(
      BRAND_WORDING_KEYS.filter((key) => picked[key] && suggestions[key]).map((key) => [key, suggestions[key]]),
    ) as Partial<BrandWording>;
  }

  async function save() {
    const words = chosen();
    if (!Object.keys(words).length) return;
    setSaving(true);
    onApply(words);
    const ok = await onSave(words);
    setSaving(false);
    if (ok) setNote("Wording saved. Colors, fonts, and logos weren't touched.");
  }

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          Help me write {companyName}&apos;s brand wording
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Kaylev drafts the tagline, voice, audience, words to lean on and avoid, visual style, and notes.
          Only the wording you pick changes. Colors, fonts, and logos stay exactly as saved.
        </p>
      </div>

      <label className="block text-sm">
        <span className="flex items-center justify-between gap-2">
          Describe the business in your own words
          <MicDictateButton onText={(chunk) => setDescription((current) => appendDictation(current, chunk))} />
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="hub-field mt-1.5 resize-y"
          placeholder="What you sell, who buys it, where, how you want to sound, words you hate…"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        {domain ? (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={useWebsite} onChange={(event) => setUseWebsite(event.target.checked)} />
            Also read {domain}
          </label>
        ) : null}
        <button type="button" onClick={suggest} disabled={loading} className="hub-btn">
          {loading ? "Writing…" : suggestions ? "Try again" : "Suggest wording"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions ? (
        <div className="space-y-3">
          {BRAND_WORDING_KEYS.filter((key) => suggestions[key]).map((key) => (
            <label key={key} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={picked[key]}
                onChange={(event) => setPicked((current) => ({ ...current, [key]: event.target.checked }))}
              />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">{LABELS[key]}</span>
                <span className="mt-1 block whitespace-pre-line text-zinc-200">{suggestions[key]}</span>
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onApply(chosen())} className="hub-btn-secondary">
              Put ticked wording in the form
            </button>
            <button type="button" onClick={save} disabled={saving} className="hub-btn">
              {saving ? "Saving…" : "Use and save wording only"}
            </button>
          </div>
        </div>
      ) : null}
      {note ? <p className="text-sm text-indigo-300">{note}</p> : null}
    </section>
  );
}
