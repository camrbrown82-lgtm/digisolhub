"use client";

import { useState } from "react";
import { Check, Copy, Download, Facebook, Instagram, Linkedin, Share2 } from "lucide-react";
import { type PosterSocialPack } from "@/lib/posterSocial";
import { DIGISOL_INSTAGRAM_HANDLE, DIGISOL_INSTAGRAM_URL } from "@/lib/site";

export function PosterExport({
  pack,
  companyName,
}: {
  pack: PosterSocialPack;
  companyName: string;
}) {
  const [copied, setCopied] = useState<"facebook" | "linkedin" | "instagram" | "twitter" | "url" | "">("");
  const urls = pack.urls?.length ? pack.urls : pack.url ? [pack.url] : [];
  const slug = companyName.toLowerCase().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poster";
  const instagramUrl = pack.instagramUrl || DIGISOL_INSTAGRAM_URL;
  const instagramHandle = pack.instagramHandle || DIGISOL_INSTAGRAM_HANDLE;

  async function copy(key: typeof copied, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 2000);
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

  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Share2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
        Export to socials
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        LinkedIn, X, Facebook, and Instagram carousel copy for @
        {instagramHandle}. Download slides or the PDF.
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
        <button
          type="button"
          onClick={() => void copy("linkedin", pack.linkedin)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "linkedin" ? <Check className="h-3.5 w-3.5" /> : <Linkedin className="h-3.5 w-3.5" />}
          Copy LinkedIn post
        </button>
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
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pack.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
          Share on Facebook
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pack.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
        >
          <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
          Share on LinkedIn
        </a>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
        >
          <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
          Open Instagram @{instagramHandle}
        </a>
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
    </div>
  );
}
