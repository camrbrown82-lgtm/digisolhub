"use client";

import { useState } from "react";
import { Check, Copy, Download, Facebook, Linkedin, Share2 } from "lucide-react";
import { type PosterSocialPack } from "@/lib/posterSocial";

export function PosterExport({
  pack,
  companyName,
}: {
  pack: PosterSocialPack;
  companyName: string;
}) {
  const [copied, setCopied] = useState<"facebook" | "linkedin" | "instagram" | "url" | "">("");

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
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.download = `${slug || "poster"}-social-pack.txt`;
    link.click();
    URL.revokeObjectURL(href);
  }

  function downloadImage() {
    const link = document.createElement("a");
    link.href = pack.url;
    link.download = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "poster"}.png`;
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
        Copy a ready caption, download the poster, or share the public image
        URL — same flow as Dispatch.
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
          {copied === "instagram" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Instagram caption
        </button>
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
        <button
          type="button"
          onClick={() => void copy("url", pack.url)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy image URL
        </button>
        <button
          type="button"
          onClick={downloadImage}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" />
          Download poster
        </button>
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
