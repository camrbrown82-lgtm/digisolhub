"use client";

import { useState } from "react";
import { Check, Copy, Download, Facebook, Instagram, Linkedin, Share2 } from "lucide-react";
import { shareToInstagram } from "@/lib/instagramShare";
import { type PosterSocialPack } from "@/lib/posterSocial";
import {
  isStoredPosterUrl,
  POSTER_EXPORT_SIZES,
  posterExportUrl,
  type PosterExportSize,
} from "@/lib/posterSizes";
import { DIGISOL_INSTAGRAM_HANDLE, DIGISOL_SITE_URL, LINKEDIN_ENABLED } from "@/lib/site";

const EXPORT_SIZES = Object.entries(POSTER_EXPORT_SIZES) as [
  PosterExportSize,
  (typeof POSTER_EXPORT_SIZES)[PosterExportSize],
][];

function sized(url: string, size: PosterExportSize, options?: { base?: string; download?: boolean }) {
  return isStoredPosterUrl(url) ? posterExportUrl(url, size, options) : url;
}

export function PosterExport({
  pack,
  companyName,
}: {
  pack: PosterSocialPack;
  companyName: string;
}) {
  const [copied, setCopied] = useState<"facebook" | "linkedin" | "instagram" | "twitter" | "url" | "">("");
  const [igStatus, setIgStatus] = useState("");
  const [sizing, setSizing] = useState<PosterExportSize | "">("");
  const urls = pack.urls?.length ? pack.urls : pack.url ? [pack.url] : [];
  const linkShareUrl = pack.url ? sized(pack.url, "link", { base: DIGISOL_SITE_URL }) : "";
  const slug = companyName.toLowerCase().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poster";
  const instagramHandle = pack.instagramHandle || DIGISOL_INSTAGRAM_HANDLE;

  async function copy(key: typeof copied, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function shareInstagram() {
    setIgStatus("Sharing…");
    const result = await shareToInstagram({
      caption: pack.instagram,
      url: pack.url,
      imageUrls: urls.map((url) => sized(url, "feed")),
    });
    setIgStatus(
      result === "shared"
        ? "Shared — pick Instagram in the sheet"
        : "Caption copied — paste with your slide in Instagram",
    );
    window.setTimeout(() => setIgStatus(""), 3500);
  }

  function downloadPack() {
    const blob = new Blob([pack.fileBody], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${slug}-social-pack.txt`;
    link.click();
    URL.revokeObjectURL(href);
  }

  function downloadImage(url = pack.url, index?: number) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}${typeof index === "number" ? `-slide-${index + 1}` : ""}.png`;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  }

  async function downloadSized(size: PosterExportSize) {
    setSizing(size);
    for (let index = 0; index < urls.length; index += 1) {
      const link = document.createElement("a");
      link.href = sized(urls[index], size, { download: true });
      link.download = `${slug}${urls.length > 1 ? `-slide-${index + 1}` : ""}-${size}.jpg`;
      link.click();
      if (index < urls.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    window.setTimeout(() => setSizing(""), 1500);
  }

  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Share2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
        Export to socials
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        {LINKEDIN_ENABLED ? "LinkedIn, " : ""}X, Facebook, and Instagram for @{instagramHandle}. On phone,
        Share to Instagram opens the system share sheet with your caption and
        slides.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy("facebook", pack.facebook)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "facebook" ? <Check className="h-3.5 w-3.5" /> : <Facebook className="h-3.5 w-3.5" />}
          Copy Facebook post
        </button>
        {LINKEDIN_ENABLED ? (
          <button
            type="button"
            onClick={() => void copy("linkedin", pack.linkedin)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            {copied === "linkedin" ? <Check className="h-3.5 w-3.5" /> : <Linkedin className="h-3.5 w-3.5" />}
            Copy LinkedIn post
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copy("instagram", pack.instagram)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "instagram" ? <Check className="h-3.5 w-3.5" /> : <Instagram className="h-3.5 w-3.5" />}
          Copy Instagram caption
        </button>
        {pack.twitter ? (
          <button
            type="button"
            onClick={() => void copy("twitter", pack.twitter)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            {copied === "twitter" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy X / Twitter post
          </button>
        ) : null}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkShareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
          Share on Facebook
        </a>
        {LINKEDIN_ENABLED ? (
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkShareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
          >
            <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
            Share on LinkedIn
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void shareInstagram()}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
        >
          <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
          Share to Instagram
        </button>
        {pack.twitter ? (
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(pack.twitter)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
          >
            Share on X
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void copy("url", urls.join("\n"))}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy image URL{urls.length > 1 ? "s" : ""}
        </button>
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => downloadImage(url, index)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            {urls.length > 1 ? `Download slide ${index + 1}` : "Download poster"}
          </button>
        ))}
        {pack.pdfUrl ? (
          <a
            href={pack.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`${slug}-carousel.pdf`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </a>
        ) : null}
        <button
          type="button"
          onClick={downloadPack}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" />
          Download social pack
        </button>
      </div>
      {urls.some(isStoredPosterUrl) ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold text-white">Download sized for</p>
          <p className="mt-1 text-xs text-zinc-400">
            Exact pixel size for each spot. The whole poster always fits, and any spare space is filled with a
            soft blur of the poster, so nothing gets cropped.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXPORT_SIZES.map(([size, spec]) => (
              <button
                key={size}
                type="button"
                onClick={() => void downloadSized(size)}
                disabled={Boolean(sizing)}
                title={`${spec.width}×${spec.height}`}
                className="inline-flex flex-col items-start rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                  {sizing === size ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  {spec.label}
                </span>
                <span className="text-[11px] text-zinc-400">{spec.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {igStatus ? <p className="mt-3 text-xs text-indigo-200">{igStatus}</p> : null}
    </div>
  );
}
