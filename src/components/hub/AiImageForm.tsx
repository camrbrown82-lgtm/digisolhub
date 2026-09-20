"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PosterExport } from "@/components/hub/PosterExport";
import { type PosterFormat } from "@/lib/poster";
import { type PosterSocialPack } from "@/lib/posterSocial";

const FORMATS: { id: PosterFormat; label: string; hint: string }[] = [
  { id: "portrait", label: "Portrait", hint: "Stories, carousels, print" },
  { id: "square", label: "Square", hint: "Feed, ads" },
  { id: "landscape", label: "Landscape", hint: "Banners, web" },
];

export function AiImageForm({
  companyName,
  tagline,
  voice,
  colors,
  logoUrl,
  fonts,
}: {
  companyName: string;
  tagline: string;
  voice: string;
  colors: string[];
  logoUrl?: string;
  fonts?: string;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<PosterFormat>("portrait");
  const [status, setStatus] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [artDirection, setArtDirection] = useState("");
  const [social, setSocial] = useState<PosterSocialPack | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("Reading your slides and typesetting Brand-locked cards. Multi-slide briefs take about a minute…");
    setUrls([]);
    setArtDirection("");
    setSocial(null);
    const response = await fetch("/api/hub/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, format }),
    });
    let result: {
      error?: string;
      asset?: { public_url?: string };
      urls?: string[];
      pdfUrl?: string;
      prompt?: string;
      social?: PosterSocialPack;
      logoStamped?: boolean;
      slides?: { label: string }[];
    } = {};
    try {
      result = (await response.json()) as typeof result;
    } catch {
      setBusy(false);
      setStatus("Generation failed");
      return;
    }
    setBusy(false);
    if (response.status === 401) {
      setStatus("Sign in again, then retry. Your hub session expired.");
      return;
    }
    if (!response.ok) {
      setStatus(result.error || "Generation failed");
      return;
    }
    const nextUrls = result.urls?.length
      ? result.urls
      : result.asset?.public_url
        ? [result.asset.public_url]
        : [];
    setUrls(nextUrls);
    setArtDirection(result.prompt ?? "");
    setSocial(result.social ?? null);
    const slideCount = result.slides?.length || nextUrls.length || 1;
    setStatus(
      result.logoStamped
        ? `Saved ${slideCount} branded slide${slideCount === 1 ? "" : "s"}. Official logo stamped from Brand.`
        : `Saved ${slideCount} slide${slideCount === 1 ? "" : "s"}. Add a logo on Brand so the real mark can be stamped on.`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className="rounded-2xl border border-zinc-800 p-4"
        style={{ background: colors[3] || "#09090b" }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="h-12 w-auto max-w-[10rem] rounded-lg object-contain"
            />
          ) : null}
          <div>
            <p className="text-sm font-medium text-white">
              Using {companyName} Brand kit
            </p>
            <p className="text-xs text-zinc-400">
              {logoUrl
                ? "Your copy is typeset as written. The official logo is stamped on after generation."
                : "Upload a logo on Brand first so posters stay on-mark."}
            </p>
          </div>
        </div>
        {tagline ? (
          <p className="mt-2 text-sm" style={{ color: colors[2] || "#a1a1aa" }}>
            {tagline}
          </p>
        ) : null}
        {voice ? (
          <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{voice}</p>
        ) : null}
        {fonts ? <p className="mt-1 text-[11px] text-zinc-500">{fonts}</p> : null}
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
        Slide blueprint
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          rows={12}
          className="hub-field resize-y"
          placeholder={`[SLIDE 1 / POST HEADER: THE HOOK]
Visual Idea: Dark studio, indigo glow, bold white type.
Headline: Why the "Silo" Model is Costing Your Business Money
Sub-headline: Web Development + Digital Marketing = The Ultimate Growth Engine for Alberta Businesses.

[SLIDE 2 / CORE MESSAGE]
Visual Idea: Three stacked callout cards.
Body Copy:
The Problem: ...
The DigiSol Way: ...
The Result: ...

[SLIDE 3 / CALL TO ACTION]
Text:
Read our full monthly dispatch.
Visit us today: https://wwwdigisol.com`}
        />
      </label>
      <p className="text-xs text-zinc-500">
        Paste the full brief. Each [SLIDE n] becomes its own carousel card with
        that copy — LinkedIn, X, Facebook, Instagram, and a PDF when there are
        multiple slides.
      </p>
      <button type="submit" disabled={busy} className="hub-btn">
        {busy ? "Generating slides…" : "Generate poster"}
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
      {urls.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {urls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Generated ${format} slide ${index + 1} for ${companyName}`}
              className="rounded-xl border border-zinc-800"
            />
          ))}
        </div>
      ) : null}
      {social ? <PosterExport pack={social} companyName={companyName} /> : null}
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
