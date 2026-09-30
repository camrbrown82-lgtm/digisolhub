"use client";

import { useState } from "react";
import { Check, Copy, Facebook, Linkedin, Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { LINKEDIN_ENABLED } from "@/lib/site";

/**
 * Facebook's share dialog ignores prefilled text, so "Share on Facebook" copies the caption first
 * and opens the dialog with the link preview; paste the caption in the post box.
 */
export function ShareButtons({
  url,
  caption,
  analyticsKey,
  heading = "Share this",
  className = "",
}: {
  url: string;
  caption: string;
  analyticsKey: string;
  heading?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState<"caption" | "url" | "">("");
  const [note, setNote] = useState("");

  async function copy(kind: "caption" | "url") {
    await navigator.clipboard.writeText(kind === "caption" ? caption : url).catch(() => undefined);
    setCopied(kind);
    trackEvent("share_export", { format: `copy_${kind}`, item: analyticsKey });
    window.setTimeout(() => setCopied(""), 2000);
  }

  function shareFacebook() {
    void navigator.clipboard.writeText(caption).catch(() => undefined);
    setNote("Caption copied. Paste it into the Facebook post box.");
    trackEvent("share_export", { format: "facebook_share", item: analyticsKey });
    window.setTimeout(() => setNote(""), 5000);
  }

  const button =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10";

  return (
    <div className={`rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Share2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
        {heading}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={shareFacebook}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
          Share on Facebook
        </a>
        {LINKEDIN_ENABLED ? (
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("share_export", { format: "linkedin_share", item: analyticsKey })}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
          >
            <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
            Share on LinkedIn
          </a>
        ) : null}
        <button type="button" onClick={() => void copy("caption")} className={button}>
          {copied === "caption" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy post text
        </button>
        <button type="button" onClick={() => void copy("url")} className={button}>
          {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy link
        </button>
      </div>
      {note ? <p className="mt-3 text-xs text-indigo-200">{note}</p> : null}
    </div>
  );
}
