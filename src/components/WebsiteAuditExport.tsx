"use client";

import { useState } from "react";
import { Check, Copy, Download, Facebook, Instagram, Linkedin, Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { XIcon } from "@/components/XIcon";
import { useMessages } from "@/lib/i18n/client";
import { shareToInstagram } from "@/lib/instagramShare";
import { websiteAuditSocialPack } from "@/lib/media";
import { DIGISOL_INSTAGRAM_HANDLE, LINKEDIN_ENABLED } from "@/lib/site";

type PackKey = "facebook" | "linkedin" | "instagram" | "twitter";

export function WebsiteAuditExport({
  location = "media_website_audit",
}: {
  location?: string;
}) {
  const t = useMessages().auditExport;
  const pack = websiteAuditSocialPack();
  const [copied, setCopied] = useState<PackKey | "url" | "video" | "">("");
  const [igStatus, setIgStatus] = useState("");

  async function copy(key: PackKey | "url" | "video", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    trackEvent("media_export", { format: key, location });
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function shareInstagram() {
    setIgStatus(t.sharing);
    trackEvent("media_export", { format: "instagram_share", location });
    const result = await shareToInstagram({
      caption: pack.instagram,
      url: pack.url,
    });
    setIgStatus(result === "shared" ? t.shared : t.captionCopied);
    window.setTimeout(() => setIgStatus(""), 3500);
  }

  function download() {
    const blob = new Blob([pack.fileBody], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "digisol-website-audit-social-pack.txt";
    link.click();
    URL.revokeObjectURL(href);
    trackEvent("media_export", { format: "download", location });
  }

  return (
    <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <Share2 className="h-4 w-4 text-sky-300" aria-hidden="true" />
        {t.title}
      </p>
      <p className="mt-1 text-xs text-indigo-200/70">{t.body(LINKEDIN_ENABLED, DIGISOL_INSTAGRAM_HANDLE)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy("facebook", pack.facebook)}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 hover:text-sky-200"
        >
          {copied === "facebook" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Facebook className="h-3.5 w-3.5" />
          )}
          {t.copyFacebook}
        </button>
        {LINKEDIN_ENABLED ? (
          <button
            type="button"
            onClick={() => copy("linkedin", pack.linkedin)}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 hover:text-sky-200"
          >
            {copied === "linkedin" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Linkedin className="h-3.5 w-3.5" />
            )}
            {t.copyLinkedin}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => copy("instagram", pack.instagram)}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 hover:text-sky-200"
        >
          {copied === "instagram" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Instagram className="h-3.5 w-3.5" />
          )}
          {t.copyInstagram}
        </button>
        <button
          type="button"
          onClick={() => copy("twitter", pack.twitter)}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 hover:text-sky-200"
        >
          {copied === "twitter" ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
          {t.copyX}
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pack.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("media_export", { format: "facebook_share", location })
          }
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
        >
          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
          {t.shareFacebook}
        </a>
        {LINKEDIN_ENABLED ? (
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pack.url)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("media_export", { format: "linkedin_share", location })
            }
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-indigo-500/15"
          >
            <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
            {t.shareLinkedin}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => void shareInstagram()}
          className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-indigo-500/15"
        >
          <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
          {t.shareInstagram}
        </button>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(pack.twitter)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("media_export", { format: "x_share", location })}
          className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-indigo-500/15"
        >
          <XIcon className="h-3.5 w-3.5" />
          {t.shareX}
        </a>
        <button
          type="button"
          onClick={() => copy("url", pack.url)}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20"
        >
          {copied === "url" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {t.copyUrl}
        </button>
        <button
          type="button"
          onClick={() => copy("video", pack.videoUrl)}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20"
        >
          {copied === "video" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {t.copyVideo}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20"
        >
          <Download className="h-3.5 w-3.5" />
          {t.download}
        </button>
      </div>
      {igStatus ? <p className="mt-3 text-xs text-sky-200">{igStatus}</p> : null}
    </div>
  );
}
