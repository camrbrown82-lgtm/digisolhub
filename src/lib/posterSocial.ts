import { DIGISOL_SITE_URL } from "@/lib/site";

export type PosterSocialPack = {
  url: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  fileBody: string;
  hashtags: string[];
};

export function posterSocialPack(input: {
  companyName: string;
  tagline?: string;
  brief: string;
  imageUrl: string;
  siteUrl?: string;
}): PosterSocialPack {
  const company = input.companyName.trim() || "DigiSol";
  const site = (input.siteUrl || DIGISOL_SITE_URL).replace(/\/$/, "");
  const url = input.imageUrl;
  const tagline = input.tagline?.trim() || "";
  const brief = input.brief.trim();
  const hashtags = [
    `#${company.replace(/[^A-Za-z0-9]+/g, "")}`,
    "#Alberta",
    "#Airdrie",
    "#Calgary",
    "#Edmonton",
    "#Marketing",
  ].filter((tag, index, list) => tag.length > 1 && list.indexOf(tag) === index);

  const facebook = [
    tagline || company,
    "",
    brief,
    "",
    url,
    site,
    "",
    hashtags.join(" "),
  ].join("\n");

  const linkedin = [
    tagline || `${company} campaign`,
    "",
    brief,
    "",
    `Poster: ${url}`,
    `Work with ${company}: ${site}/#contact`,
  ].join("\n");

  const instagram = [
    tagline || company,
    "",
    brief,
    "",
    hashtags.join(" "),
  ].join("\n");

  const fileBody = [
    `${company.toUpperCase()} POSTER`,
    tagline,
    "",
    `Image: ${url}`,
    `Site: ${site}`,
    "",
    "FACEBOOK / THREADS",
    facebook,
    "",
    "LINKEDIN",
    linkedin,
    "",
    "INSTAGRAM / SHORT CAPTION",
    instagram,
    "",
  ].join("\n");

  return { url, facebook, linkedin, instagram, fileBody, hashtags };
}

export function parsePosterMeta(notes?: string | null) {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as {
      kind?: string;
      brief?: string;
      prompt?: string;
      caption?: string;
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
  if (isPosterSocialPack(poster.social_pack)) return poster.social_pack;
  const meta = parsePosterMeta(poster.notes);
  if (isPosterSocialPack(meta?.social)) return meta.social;
  return posterSocialPack({
    companyName: input.companyName,
    tagline: input.tagline,
    brief: meta?.brief || poster.filename || "Campaign poster",
    imageUrl: poster.public_url || "",
    siteUrl: input.siteUrl,
  });
}
