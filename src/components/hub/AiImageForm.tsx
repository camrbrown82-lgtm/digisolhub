"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";
import { ImageTextEditor } from "@/components/hub/ImageTextEditor";
import { PosterExport } from "@/components/hub/PosterExport";
import { type LayoutPiece } from "@/lib/layoutPieces";
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
  palette,
  logoUrl,
  fonts,
  canQr,
  siteUrl,
}: {
  companyName: string;
  tagline: string;
  voice: string;
  colors: string[];
  palette?: { name: string; value: string }[];
  logoUrl?: string;
  fonts?: string;
  canQr?: boolean;
  siteUrl?: string;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<PosterFormat>("portrait");
  const [qr, setQr] = useState(false);
  const [status, setStatus] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [slides, setSlides] = useState<{ artUrl?: string; pieces?: LayoutPiece[] }[]>([]);
  const [artDirection, setArtDirection] = useState("");
  const [social, setSocial] = useState<PosterSocialPack | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("Designing a new picture from your prompt. This takes about a minute…");
    setUrls([]);
    setSlides([]);
    setArtDirection("");
    setSocial(null);
    const response = await fetch("/api/hub/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, format, qr }),
    });
    let result: {
      error?: string;
      asset?: { public_url?: string };
      urls?: string[];
      pdfUrl?: string;
      prompt?: string;
      social?: PosterSocialPack;
      logoStamped?: boolean;
      qrUrl?: string;
      slides?: { label: string; artUrl?: string; pieces?: LayoutPiece[] }[];
      warning?: string;
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
    setSlides(result.slides || []);
    setArtDirection(result.prompt ?? "");
    setSocial(result.social ?? null);
    setPrompt("");
    const slideCount = result.slides?.length || nextUrls.length || 1;
    setStatus(
      result.warning
        ? `Generated ${slideCount} slide${slideCount === 1 ? "" : "s"}, but saving the gallery row failed: ${result.warning}`
        : result.logoStamped
        ? `Saved ${slideCount} branded slide${slideCount === 1 ? "" : "s"}. Official logo stamped from Brand.`
        : `Saved ${slideCount} slide${slideCount === 1 ? "" : "s"}. Add a logo on Brand so the real mark can be stamped on.`,
    );
    if (result.qrUrl) setStatus((current) => `${current} QR opens ${result.qrUrl}.`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className="rounded-2xl border border-zinc-800 p-4"
        style={{ background: colors[0] || "#09090b" }}
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
                ? `Copy is typeset as written for ${companyName} only. Official logo sits on a brand bar above the art, never over the text.`
                : `Upload a logo on Brand for ${companyName} so posters stay on this company's mark.`}
            </p>
          </div>
        </div>
        {tagline ? (
          <p className="mt-2 text-sm" style={{ color: colors[1] || "#f4f4f5" }}>
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

      <div className="block text-sm">
        <span className="flex items-center justify-between gap-2">
          Slide blueprint
          <MicDictateButton
            disabled={busy}
            onText={(chunk) => setPrompt((current) => appendDictation(current, chunk))}
          />
        </span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          rows={12}
          className="hub-field mt-1.5 resize-y placeholder:text-zinc-600"
          placeholder="Describe the picture, then the words that should appear. Example: a rocket launch. Headline: DigiSol official launch. Offers on their own lines. Notes in parentheses, like (add a rocket), are drawn and not printed."
        />
      </div>
      <p className="text-xs text-zinc-500">
        The prompt is the design. Words you want on the poster go on their own
        lines. Notes like “add a rocket” are the picture, not the type. Logo,
        award badge, and each line can be removed from the Images and text lists.
        Use [SLIDE n] when you want a carousel.
      </p>
      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={qr}
          disabled={!canQr || busy}
          onChange={(event) => setQr(event.target.checked)}
          className="mt-1"
        />
        <span>
          Add a QR code on a band under the art. It opens this company&apos;s website,
          and Kaylev is the source on the link.
          {canQr ? "" : " Add a domain on Brand first."}
        </span>
      </label>
      <button type="submit" disabled={busy} className="hub-btn">
        {busy ? "Generating slides…" : "Generate poster"}
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
      {urls.length ? (
        <div className="space-y-6">
          {urls.map((url, index) => (
            <ImageTextEditor
              key={slides[index]?.artUrl || url}
              imageUrl={slides[index]?.artUrl || url}
              replaceUrl={url}
              initialPieces={slides[index]?.pieces}
              designWidth={format === "landscape" ? 1920 : 1080}
              designHeight={format === "portrait" ? 1350 : 1080}
              color={colors[1]}
              background={colors[0]}
              highlight={colors[2]}
              palette={palette}
              siteUrl={siteUrl}
              logoUrl={logoUrl}
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
