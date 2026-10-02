import type { PosterFormat } from "@/lib/poster";

/** Final poster canvas per format. The logo bar and badge sit inside it, so the file is exactly this size. */
export const POSTER_CANVAS: Record<PosterFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
};

/** Exact sizes each platform expects. Exports fit the whole poster in, so no copy is ever cropped. */
export const POSTER_EXPORT_SIZES = {
  feed: { width: 1080, height: 1350, label: "Feed 4:5", hint: "Instagram and Facebook feed" },
  square: { width: 1080, height: 1080, label: "Square 1:1", hint: "Instagram, Facebook, LinkedIn" },
  story: { width: 1080, height: 1920, label: "Story 9:16", hint: "Stories, Reels, TikTok" },
  link: { width: 1200, height: 630, label: "Link 1.91:1", hint: "Facebook and LinkedIn shares" },
  wide: { width: 1600, height: 900, label: "Wide 16:9", hint: "X, YouTube, websites" },
} as const;

export type PosterExportSize = keyof typeof POSTER_EXPORT_SIZES;

export function isPosterExportSize(value: unknown): value is PosterExportSize {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(POSTER_EXPORT_SIZES, value);
}

const POSTER_BUCKET_PATH = "/storage/v1/object/public/ai-posters/";
const WORKSPACE_MEDIA_PATH = "/storage/v1/object/public/";

export function isStoredPosterUrl(url: string | null | undefined) {
  return Boolean(url && url.includes(POSTER_BUCKET_PATH));
}

/** A public file already stored for a company: posters, logos, uploads. */
export function isWorkspaceMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    return new URL(url).pathname.includes(WORKSPACE_MEDIA_PATH);
  } catch {
    return false;
  }
}

/** Link to a stored poster resized for a platform. `base` makes it absolute for Meta and other fetchers. */
export function posterExportUrl(src: string, size: PosterExportSize, options?: { base?: string; download?: boolean }) {
  const query = new URLSearchParams({ src, size });
  if (options?.download) query.set("download", "1");
  return `${options?.base?.replace(/\/$/, "") ?? ""}/poster-export?${query.toString()}`;
}
