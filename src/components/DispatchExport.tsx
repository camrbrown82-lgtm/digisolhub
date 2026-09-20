"use client";

import { useState } from "react";
import { Check, Copy, Download, Facebook, Instagram, Linkedin, Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  dispatchSocialPack,
  type DispatchIssue,
} from "@/lib/dispatch";
import { shareToInstagram } from "@/lib/instagramShare";
import { DIGISOL_INSTAGRAM_HANDLE } from "@/lib/site";

type PackKey = "facebook" | "linkedin" | "instagram";

export function DispatchExport({ issue }: { issue: DispatchIssue }) {
  const pack = dispatchSocialPack(issue);
  const [copied, setCopied] = useState<PackKey | "url" | "">("");
  const [igStatus, setIgStatus] = useState("");

  async function copy(key: PackKey | "url", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    trackEvent("dispatch_export", { format: key, slug: issue.slug });
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function shareInstagram() {
    setIgStatus("Sharing…");
    trackEvent("dispatch_export", { format: "instagram_share", slug: issue.slug });
    const result = await shareToInstagram({
      caption: pack.instagram,
      url: pack.url,
    });
    setIgStatus(
      result === "shared"
        ? "Shared — pick Instagram in the sheet"
        : "Caption copied — paste in Instagram",
    );
    window.setTimeout(() => setIgStatus(""), 3500);
  }

  function download() {
    const blob = new Blob([pack.fileBody], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `digisol-dispatch-${issue.slug}.txt`;
    link.click();
    URL.revokeObjectURL(href);
    trackEvent("dispatch_export", { format: "download", slug: issue.slug });
  }

  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Share2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
        Export to socials
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Copy a ready caption or share straight to Facebook, LinkedIn, or
        Instagram (@{DIGISOL_INSTAGRAM_HANDLE}). Every link points to
        wwwdigisol.com.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy("facebook", pack.facebook)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "facebook" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Facebook className="h-3.5 w-3.5" />
          )}
          Copy Facebook post
        </button>
        <button
          type="button"
          onClick={() => copy("linkedin", pack.linkedin)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "linkedin" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Linkedin className="h-3.5 w-3.5" />
          )}
          Copy LinkedIn post
        </button>
        <button
          type="button"
          onClick={() => copy("instagram", pack.instagram)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "instagram" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Instagram className="h-3.5 w-3.5" />
          )}
          Copy Instagram caption
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pack.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("dispatch_export", { format: "facebook_share", slug: issue.slug })
          }
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
          Share on Facebook
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pack.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("dispatch_export", { format: "linkedin_share", slug: issue.slug })
          }
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
        >
          <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
          Share on LinkedIn
        </a>
        <button
          type="button"
          onClick={() => void shareInstagram()}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
        >
          <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
          Share to Instagram
        </button>
        <button
          type="button"
          onClick={() => copy("url", pack.url)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          {copied === "url" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy page URL
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" />
          Download social pack
        </button>
      </div>
      {igStatus ? <p className="mt-3 text-xs text-indigo-200">{igStatus}</p> : null}
    </div>
  );
}
