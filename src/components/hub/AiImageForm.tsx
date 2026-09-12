"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { type PosterFormat } from "@/lib/poster";

const FORMATS: { id: PosterFormat; label: string; hint: string }[] = [
  { id: "portrait", label: "Portrait", hint: "Stories, print posters" },
  { id: "square", label: "Square", hint: "Feed, ads" },
  { id: "landscape", label: "Landscape", hint: "Banners, web" },
];

export function AiImageForm({
  companyName,
  tagline,
  voice,
  colors,
}: {
  companyName: string;
  tagline: string;
  voice: string;
  colors: string[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<PosterFormat>("portrait");
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const [artDirection, setArtDirection] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("Building a brand-matched poster…");
    setUrl("");
    setArtDirection("");
    const response = await fetch("/api/hub/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, format }),
    });
    let result: {
      error?: string;
      asset?: { public_url?: string };
      prompt?: string;
    } = {};
    try {
      result = (await response.json()) as typeof result;
    } catch {
      setBusy(false);
      setStatus("Generation failed");
      return;
    }
    setBusy(false);
    if (!response.ok) {
      setStatus(result.error || "Generation failed");
      return;
    }
    setUrl(result.asset?.public_url ?? "");
    setArtDirection(result.prompt ?? "");
    setStatus("Saved to ai-posters");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className="rounded-2xl border border-zinc-800 p-4"
        style={{ background: colors[3] || "#09090b" }}
      >
        <p className="text-sm font-medium text-white">
          Using {companyName} brand
        </p>
        {tagline ? (
          <p className="mt-1 text-sm" style={{ color: colors[2] || "#a1a1aa" }}>
            {tagline}
          </p>
        ) : null}
        {voice ? (
          <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{voice}</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          {colors.map((color) => (
            <span
              key={color}
              className="h-5 w-5 rounded-full border border-white/20"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm text-zinc-300">Format</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {FORMATS.map((item) => (
            <label
              key={item.id}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                format === item.id
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-zinc-800 text-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={item.id}
                checked={format === item.id}
                onChange={() => setFormat(item.id)}
                className="sr-only"
              />
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs opacity-80">{item.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm">
        What this poster is for
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          rows={4}
          className="hub-field resize-y"
          placeholder="Homepage launch. One line about shipping custom sites that convert. Keep the type bold and the layout quiet."
        />
      </label>
      <button type="submit" disabled={busy} className="hub-btn">
        {busy ? "Generating…" : "Generate poster"}
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
      {url ? (
        <img
          src={url}
          alt={`Generated ${format} poster for ${companyName}`}
          className="max-w-lg rounded-xl border border-zinc-800"
        />
      ) : null}
      {artDirection ? (
        <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
          <summary className="cursor-pointer text-sm text-zinc-300">
            Art direction used
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{artDirection}</p>
        </details>
      ) : null}
    </form>
  );
}
