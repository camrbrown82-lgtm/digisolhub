import { ImageResponse } from "next/og";
import sharp from "sharp";
import { FOUNDER_PHOTO } from "@/lib/credentials";
import { articleCardElement, videoCardElement } from "@/lib/dispatchCard";
import { DEFAULT_LOCALE, LOCALE_META, isLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getLocationPage } from "@/lib/locations";
import { WEBSITE_AUDIT_THUMBNAIL_PATH } from "@/lib/media";
import { pricingFrom } from "@/lib/pricingContent";
import { SHARE_CARD_SIZE, isSharePage } from "@/lib/shareCard";
import { DIGISOL_FOUNDER } from "@/lib/site";

export const runtime = "nodejs";

async function publicDataUrl(origin: string, path: string, mime: string) {
  return fetch(`${origin}${path}`)
    .then(async (res) =>
      res.ok ? `data:${mime};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}` : null,
    )
    .catch(() => null);
}

/**
 * Link preview for Facebook, Instagram, texts, and search.
 * `?page=` picks the page card, `?city=` the city card, `?lang=fr` the French text.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const city = getLocationPage(url.searchParams.get("city") || "");
  const pageParam = url.searchParams.get("page");
  const page = isSharePage(pageParam) ? pageParam : "home";
  const t = getMessages(locale).shareCard;

  const [logo, extra] = await Promise.all([
    publicDataUrl(url.origin, "/logo-badge.png", "image/png"),
    !city && page === "about"
      ? publicDataUrl(url.origin, FOUNDER_PHOTO, "image/jpeg")
      : !city && page === "video"
        ? publicDataUrl(url.origin, WEBSITE_AUDIT_THUMBNAIL_PATH, "image/jpeg")
        : Promise.resolve(null),
  ]);

  const base = { kicker: "DigiSol", subline: t.subline, pill: t.cta, footer: "wwwdigisol.com" };
  let element;
  if (city) {
    element = articleCardElement(
      { ...base, subline: t.citySubline(city.name), title: t.city(city.name) },
      logo,
    );
  } else {
    switch (page) {
      case "pricing":
        element = articleCardElement(
          {
            ...base,
            subline: t.pricingSubline,
            title: t.pricing(pricingFrom(LOCALE_META[locale].intl)),
            pill: t.pricingCta,
          },
          logo,
        );
        break;
      case "about":
        element = articleCardElement(
          { ...base, kicker: DIGISOL_FOUNDER, subline: t.aboutSubline, title: t.about, pill: t.aboutCta },
          logo,
          extra,
        );
        break;
      case "locations":
        element = articleCardElement(
          { ...base, subline: t.locationsSubline, title: t.locations, pill: t.locationsCta },
          logo,
        );
        break;
      case "blog":
        element = articleCardElement(
          { ...base, kicker: t.blogKicker, title: t.blog, pill: t.blogCta, footer: "wwwdigisol.com/blog" },
          logo,
        );
        break;
      case "dispatch":
        element = articleCardElement(
          {
            ...base,
            kicker: t.dispatchKicker,
            title: t.dispatch,
            pill: t.dispatchCta,
            footer: "wwwdigisol.com/dispatch",
          },
          logo,
        );
        break;
      case "privacy":
        element = articleCardElement({ ...base, title: t.privacy, pill: undefined }, logo);
        break;
      case "video":
        element = videoCardElement(
          { ...base, kicker: t.videoKicker, title: t.video, pill: t.videoCta },
          extra,
          logo,
        );
        break;
      default:
        element = articleCardElement({ ...base, title: t.home }, logo);
    }
  }

  try {
    const png = new ImageResponse(element, SHARE_CARD_SIZE);
    const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("share card render failed", err);
    return new Response("Card render failed", { status: 500 });
  }
}
