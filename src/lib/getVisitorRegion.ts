import { cookies, headers } from "next/headers";
import {
  GEO_AUDIENCE_COOKIE,
  GEO_CITY_COOKIE,
  GEO_COUNTRY_COOKIE,
  GEO_REGION_COOKIE,
  buildVisitorRegion,
  parseAudienceCookie,
  type VisitorRegion,
} from "@/lib/visitorRegion";

/**
 * Server-side visitor region from middleware-injected headers / cookies.
 * Safe default: Alberta-first (keeps SEO and local brand voice).
 */
export async function getVisitorRegion(): Promise<VisitorRegion> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const fromHeaders = {
    country:
      headerStore.get("x-digisol-country") ||
      cookieStore.get(GEO_COUNTRY_COOKIE)?.value ||
      "",
    region:
      headerStore.get("x-digisol-region") ||
      cookieStore.get(GEO_REGION_COOKIE)?.value ||
      "",
    city:
      headerStore.get("x-digisol-city") ||
      cookieStore.get(GEO_CITY_COOKIE)?.value ||
      "",
  };

  const audienceOverride = parseAudienceCookie(
    headerStore.get("x-digisol-audience") ||
      cookieStore.get(GEO_AUDIENCE_COOKIE)?.value,
  );

  const region = buildVisitorRegion(fromHeaders);
  if (audienceOverride && audienceOverride !== region.audience) {
    return {
      ...region,
      audience: audienceOverride,
      isInternational: audienceOverride === "international",
    };
  }
  return region;
}
