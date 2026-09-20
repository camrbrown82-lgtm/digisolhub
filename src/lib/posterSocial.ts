import { DIGISOL_INSTAGRAM_HANDLE, DIGISOL_INSTAGRAM_URL, DIGISOL_SITE_URL } from "@/lib/site";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { type PosterSlide, shortPosterCaption } from "@/lib/posterBrief";

export type PosterSocialPack = {
  url: string;
  urls: string[];
  pdfUrl?: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  fileBody: string;
  hashtags: string[];
  instagramUrl?: string;
  instagramHandle?: string;
};

function clip(value: string, max: number) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function posterSocialPack(input: {
  companyName: string;
  tagline?: string;
  brief: string;
  imageUrl: string;
  imageUrls?: string[];
  pdfUrl?: string;
  siteUrl?: string;
  slides?: PosterSlide[];
}): PosterSocialPack {
  const company = input.companyName.trim() || "DigiSol";
  const site = (input.siteUrl || DIGISOL_SITE_URL).replace(/\/$/, "");
  const urls = (input.imageUrls?.length ? input.imageUrls : [input.imageUrl]).filter(Boolean);
  const url = urls[0] || input.imageUrl;
  const hook = shortPosterCaption(input.slides || []) || input.tagline?.trim() || company;
  const carousel = urls.length > 1;
  const isDigisol = company.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const hashtags = [
    `#${company.replace(/[^A-Za-z0-9]+/g, "")}`,
    "#Alberta",
    "#Airdrie",
    "#Calgary",
    "#Edmonton",
    "#Marketing",
  ].filter((tag, index, list) => tag.length > 1 && list.indexOf(tag) === index);

  const facebook = [
    hook,
    "",
    carousel ? `${urls.length}-slide carousel for Facebook and Instagram.` : "",
    site,
    "",
    hashtags.join(" "),
  ]
    .filter((line) => line !== "")
    .join("\n");

  const linkedin = [
    hook,
    "",
    `Read the full dispatch: ${site}`,
    urls.length > 1 ? `Slides:\n${urls.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : `Poster: ${url}`,
  ].join("\n");

  const instagram = [
    hook,
    "",
    carousel ? "Swipe the carousel." : "",
    isDigisol ? `Follow @${DIGISOL_INSTAGRAM_HANDLE}` : "",
    hashtags.join(" "),
  ]
    .filter((line) => line !== "")
    .join("\n");

  const twitter = clip(`${hook}\n${site}\n${hashtags.slice(0, 3).join(" ")}`, 280);

  const fileBody = [
    `${company.toUpperCase()} ${carousel ? "CAROUSEL" : "POSTER"}`,
    hook,
    "",
    `Site: ${site}`,
    isDigisol ? `Instagram: ${DIGISOL_INSTAGRAM_URL}` : "",
    input.pdfUrl ? `PDF: ${input.pdfUrl}` : "",
    "",
    "SLIDES",
    ...urls.map((item, index) => `${index + 1}. ${item}`),
    "",
    "FACEBOOK",
    facebook,
    "",
    "LINKEDIN",
    linkedin,
    "",
    "INSTAGRAM CAROUSEL",
    instagram,
    "",
    "TWITTER / X",
    twitter,
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return {
    url,
    urls,
    pdfUrl: input.pdfUrl,
    facebook,
    linkedin,
    instagram,
    twitter,
    fileBody,
    hashtags,
    ...(isDigisol
      ? {
          instagramUrl: DIGISOL_INSTAGRAM_URL,
          instagramHandle: DIGISOL_INSTAGRAM_HANDLE,
        }
      : {}),
  };
}

export function parsePosterMeta(notes?: string | null) {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as {
      kind?: string;
      brief?: string;
      prompt?: string;
      caption?: string;
      pdfUrl?: string;
      seriesId?: string;
      slideIndex?: number;
      slideCount?: number;
      archivedAt?: string | null;
      social?: PosterSocialPack;
    };
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    return null;
  }
  return null;
}

function isPosterSocialPack(value: unknown): value is PosterSocialPack {
  if (!value || typeof value !== "object") return false;
  const row = value as PosterSocialPack;
  return Boolean(row.facebook && row.linkedin && row.instagram && row.url);
}

export function socialPackFromAsset(
  poster: {
    notes?: string | null;
    filename?: string | null;
    public_url?: string | null;
    social_pack?: unknown;
  },
  input: { companyName: string; tagline?: string; siteUrl?: string },
): PosterSocialPack {
  if (isPosterSocialPack(poster.social_pack)) {
    const pack = poster.social_pack;
    return {
      ...pack,
      urls: pack.urls?.length ? pack.urls : [pack.url],
      twitter: pack.twitter || clip(`${pack.instagram}\n${input.siteUrl || DIGISOL_SITE_URL}`, 280),
      instagramUrl: pack.instagramUrl || DIGISOL_INSTAGRAM_URL,
      instagramHandle: pack.instagramHandle || DIGISOL_INSTAGRAM_HANDLE,
    };
  }
  const meta = parsePosterMeta(poster.notes);
  if (isPosterSocialPack(meta?.social)) {
    const pack = meta.social;
    return {
      ...pack,
      urls: pack.urls?.length ? pack.urls : [pack.url],
      twitter: pack.twitter || clip(`${pack.instagram}\n${input.siteUrl || DIGISOL_SITE_URL}`, 280),
      instagramUrl: pack.instagramUrl || DIGISOL_INSTAGRAM_URL,
      instagramHandle: pack.instagramHandle || DIGISOL_INSTAGRAM_HANDLE,
    };
  }
  return posterSocialPack({
    companyName: input.companyName,
    tagline: input.tagline,
    brief: meta?.brief || poster.filename || "Campaign poster",
    imageUrl: poster.public_url || "",
    siteUrl: input.siteUrl,
  });
}

export function groupPosterSeries<T extends {
  id: string;
  notes?: string | null;
  public_url?: string | null;
  series_id?: string | null;
  slide_index?: number | null;
}>(posters: T[]) {
  const groups: T[][] = [];
  const seen = new Set<string>();
  for (const poster of posters) {
    const meta = parsePosterMeta(poster.notes);
    const series = poster.series_id || meta?.seriesId || poster.id;
    if (seen.has(series)) continue;
    seen.add(series);
    const slides = posters
      .filter((item) => (item.series_id || parsePosterMeta(item.notes)?.seriesId || item.id) === series)
      .sort((a, b) => (a.slide_index || parsePosterMeta(a.notes)?.slideIndex || 0) - (b.slide_index || parsePosterMeta(b.notes)?.slideIndex || 0));
    groups.push(slides);
  }
  return groups;
}
