import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getResendApiKey, getResendFrom } from "@/lib/email";
import { leadAlertRecipients } from "@/lib/leadAlert";
import { DIGISOL_SITE_URL } from "@/lib/site";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
].join(",");
const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "websiteUri",
  "reviews",
].join(",");

export type GoogleReview = {
  id: string;
  author: string;
  authorUrl: string | null;
  photoUrl: string | null;
  rating: number;
  text: string;
  publishedAt: string | null;
  relative: string;
  url: string | null;
};

export type PlaceCandidate = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
};

export type PlaceDetails = PlaceCandidate & { reviews: GoogleReview[] };

export type ReviewSnapshot = {
  captured_on: string;
  captured_at: string;
  place_id: string;
  place_name: string | null;
  rating: number | null;
  review_count: number | null;
  reviews: GoogleReview[];
  maps_url: string | null;
};

export type ReviewSummary = {
  configured: boolean;
  /** Migration not run yet: clients.google_place_id / google_review_snapshots missing. */
  needsMigration: boolean;
  placeId: string | null;
  latest: ReviewSnapshot | null;
  previous: ReviewSnapshot | null;
  monthAgo: ReviewSnapshot | null;
  history: { day: string; rating: number | null; count: number | null }[];
  newReviews: number;
  ratingDrop: number;
  reviewUrl: string | null;
};

function apiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || "";
}

export function placesConfigured() {
  return Boolean(apiKey());
}

export function writeReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

function hostOf(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  reviews?: {
    name?: string;
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    publishTime?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

function toCandidate(p: RawPlace): PlaceCandidate {
  return {
    placeId: p.id || "",
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    mapsUrl: p.googleMapsUri || null,
    websiteUrl: p.websiteUri || null,
  };
}

async function placesFetch(url: string, init: RequestInit & { fieldMask: string }) {
  const key = apiKey();
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const { fieldMask, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
      ...headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `Places API ${res.status}`);
  return json;
}

export async function searchPlaces(query: string, limit = 5): Promise<PlaceCandidate[]> {
  const json = (await placesFetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    fieldMask: SEARCH_FIELDS,
    body: JSON.stringify({ textQuery: query, regionCode: "CA", pageSize: limit }),
  })) as { places?: RawPlace[] };
  return (json.places ?? []).map(toCandidate).filter((p) => p.placeId);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const json = (await placesFetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=en`,
    { method: "GET", fieldMask: DETAIL_FIELDS },
  )) as RawPlace;
  return {
    ...toCandidate(json),
    placeId: json.id || placeId,
    reviews: (json.reviews ?? []).map((r, i) => ({
      id: r.name || `${placeId}-${i}`,
      author: r.authorAttribution?.displayName || "Google user",
      authorUrl: r.authorAttribution?.uri || null,
      photoUrl: r.authorAttribution?.photoUri || null,
      rating: typeof r.rating === "number" ? r.rating : 0,
      text: r.text?.text || r.originalText?.text || "",
      publishedAt: r.publishTime || null,
      relative: r.relativePublishTimeDescription || "",
      url: r.googleMapsUri || null,
    })),
  };
}

/** Best Google listing for a business, only when its website matches `url`. */
export async function findPlaceForSite(input: {
  name: string;
  url: string;
  location?: string;
}): Promise<PlaceCandidate | null> {
  const host = hostOf(input.url);
  const candidates = await searchPlaces(
    [input.name, input.location].filter(Boolean).join(" "),
    5,
  );
  if (!host) return null;
  return candidates.find((c) => hostOf(c.websiteUrl) === host) ?? null;
}

/**
 * Candidate listings for a company. `match` is set when a listing's website
 * matches the company domain, so it can be linked without asking.
 */
export async function suggestClientPlaces(input: {
  name: string;
  domain?: string | null;
  query?: string;
}) {
  const candidates = await searchPlaces(input.query?.trim() || input.name, 5);
  const host = hostOf(input.domain);
  const match = host ? candidates.find((c) => hostOf(c.websiteUrl) === host) ?? null : null;
  return { candidates, match };
}

function isMissingSchema(message: string | undefined) {
  return Boolean(
    message &&
      /google_place_id|google_review_snapshots|schema cache|does not exist/i.test(message),
  );
}

export async function getClientPlaceId(db: SupabaseClient, clientId: string) {
  const { data, error } = await db
    .from("clients")
    .select("google_place_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) return { placeId: null, needsMigration: isMissingSchema(error.message) };
  return {
    placeId: ((data as { google_place_id?: string | null } | null)?.google_place_id || null) as
      | string
      | null,
    needsMigration: false,
  };
}

export async function setClientPlaceId(
  db: SupabaseClient,
  clientId: string,
  placeId: string | null,
) {
  const { error } = await db.from("clients").update({ google_place_id: placeId }).eq("id", clientId);
  if (error) throw new Error(error.message);
}

function edmontonDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Pull today's rating, count and latest reviews and store one row per company per day. */
export async function snapshotClientReviews(
  db: SupabaseClient,
  clientId: string,
  placeId: string,
) {
  const details = await getPlaceDetails(placeId);
  const row = {
    client_id: clientId,
    place_id: details.placeId,
    place_name: details.name || null,
    rating: details.rating,
    review_count: details.reviewCount,
    reviews: details.reviews,
    maps_url: details.mapsUrl,
    captured_on: edmontonDay(),
    captured_at: new Date().toISOString(),
  };
  const { error } = await db
    .from("google_review_snapshots")
    .upsert(row, { onConflict: "client_id,captured_on" });
  if (error) throw new Error(error.message);
  return details;
}

const SNAPSHOT_COLUMNS =
  "captured_on, captured_at, place_id, place_name, rating, review_count, reviews, maps_url";

function normalizeSnapshot(row: Record<string, unknown>): ReviewSnapshot {
  return {
    captured_on: String(row.captured_on),
    captured_at: String(row.captured_at),
    place_id: String(row.place_id),
    place_name: (row.place_name as string | null) ?? null,
    rating: row.rating == null ? null : Number(row.rating),
    review_count: row.review_count == null ? null : Number(row.review_count),
    reviews: Array.isArray(row.reviews) ? (row.reviews as GoogleReview[]) : [],
    maps_url: (row.maps_url as string | null) ?? null,
  };
}

export function emptyReviewSummary(extra: Partial<ReviewSummary> = {}): ReviewSummary {
  return {
    configured: placesConfigured(),
    needsMigration: false,
    placeId: null,
    latest: null,
    previous: null,
    monthAgo: null,
    history: [],
    newReviews: 0,
    ratingDrop: 0,
    reviewUrl: null,
    ...extra,
  };
}

export async function loadReviewSummary(
  db: SupabaseClient,
  clientId: string | null,
): Promise<ReviewSummary> {
  if (!clientId) return emptyReviewSummary();
  const { placeId, needsMigration } = await getClientPlaceId(db, clientId);
  if (needsMigration) return emptyReviewSummary({ needsMigration: true });

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { data, error } = await db
    .from("google_review_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("client_id", clientId)
    .gte("captured_on", edmontonDay(since))
    .order("captured_on", { ascending: false })
    .limit(90);
  if (error) {
    return emptyReviewSummary({ placeId, needsMigration: isMissingSchema(error.message) });
  }
  const rows = (data ?? [])
    .map((r) => normalizeSnapshot(r as Record<string, unknown>))
    .filter((r) => !placeId || r.place_id === placeId);
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;
  const cutoff = edmontonDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const monthAgo = rows.find((r) => r.captured_on <= cutoff) ?? rows.at(-1) ?? null;
  return {
    configured: placesConfigured(),
    needsMigration: false,
    placeId,
    latest,
    previous,
    monthAgo: monthAgo && monthAgo !== latest ? monthAgo : null,
    history: rows
      .slice()
      .reverse()
      .map((r) => ({ day: r.captured_on, rating: r.rating, count: r.review_count })),
    newReviews:
      latest?.review_count != null && previous?.review_count != null
        ? Math.max(0, latest.review_count - previous.review_count)
        : 0,
    ratingDrop:
      latest?.rating != null && previous?.rating != null && latest.rating < previous.rating
        ? Math.round((previous.rating - latest.rating) * 10) / 10
        : 0,
    reviewUrl: placeId ? writeReviewUrl(placeId) : null,
  };
}

/** Compact Google review picture for Kaylev's analytics tools. */
export async function reviewsForAgent(db: SupabaseClient, clientId: string) {
  const s = await loadReviewSummary(db, clientId).catch(() => emptyReviewSummary());
  if (!s.latest) {
    return {
      tracked: false,
      note: s.needsMigration
        ? "Google review tracking is not set up yet (migration pending)."
        : "No Google listing linked. Link one in Analytics > Google reviews.",
    };
  }
  return {
    tracked: true,
    source: "Google Places API (verified)",
    listing: s.latest.place_name,
    rating: s.latest.rating,
    reviewCount: s.latest.review_count,
    checkedOn: s.latest.captured_on,
    newSinceLastCheck: s.newReviews,
    ratingDropSinceLastCheck: s.ratingDrop,
    thirtyDayChange: s.monthAgo
      ? {
          since: s.monthAgo.captured_on,
          reviews:
            s.latest.review_count != null && s.monthAgo.review_count != null
              ? s.latest.review_count - s.monthAgo.review_count
              : null,
          rating:
            s.latest.rating != null && s.monthAgo.rating != null
              ? Math.round((s.latest.rating - s.monthAgo.rating) * 10) / 10
              : null,
        }
      : null,
    leaveReviewLink: s.reviewUrl,
    latestReviews: s.latest.reviews.slice(0, 5).map((r) => ({
      rating: r.rating,
      author: r.author,
      when: r.relative,
      text: r.text.slice(0, 400),
    })),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Owner heads-up when a company gets new Google reviews or its rating drops. */
export async function sendReviewAlert(input: {
  companyName: string;
  details: PlaceDetails;
  newReviews: number;
  ratingDrop: number;
  since: string | null;
}) {
  const key = getResendApiKey();
  if (!key) return { ok: false, message: "Resend is not configured." };
  const fresh = input.details.reviews.filter(
    (r) => input.since && r.publishedAt && r.publishedAt > input.since,
  );
  const headline = [
    input.newReviews > 0
      ? `${input.newReviews} new Google review${input.newReviews === 1 ? "" : "s"}`
      : "",
    input.ratingDrop > 0 ? `rating down ${input.ratingDrop} to ${input.details.rating}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const lowStar = fresh.some((r) => r.rating <= 3);
  const reviewHtml = fresh
    .map(
      (r) =>
        `<div style="margin:0 0 12px;padding:12px;border:1px solid #e4e4e7;border-radius:10px;"><p style="margin:0 0 4px;font-weight:600;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} · ${escapeHtml(r.author)}</p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(r.text || "(no text)")}</p></div>`,
    )
    .join("");
  const html = `
<div style="font-family:Inter,Arial,Helvetica,sans-serif;color:#18181b;max-width:560px;">
  <p style="margin:0 0 4px;font-size:13px;color:#71717a;font-weight:600;">Google reviews · ${escapeHtml(input.companyName)}</p>
  <h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(headline)}</h1>
  <p style="margin:0 0 16px;">Now ${input.details.rating ?? "-"} stars from ${input.details.reviewCount ?? 0} reviews.${lowStar ? " One of the new reviews is 3 stars or lower. A quick, polite reply helps." : ""}</p>
  ${reviewHtml}
  <p style="margin:16px 0 0;">
    ${input.details.mapsUrl ? `<a href="${escapeHtml(input.details.mapsUrl)}">Reply on Google</a> · ` : ""}
    <a href="${DIGISOL_SITE_URL}/hub/analytics">Open Analytics</a>
  </p>
</div>`.trim();
  try {
    const { error } = await new Resend(key).emails.send({
      from: getResendFrom(),
      to: leadAlertRecipients(),
      subject: `${input.companyName}: ${headline}`,
      html,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Review alert failed" };
  }
}

/** Daily job: snapshot every company with a linked listing and alert on changes. */
export async function snapshotAllClientReviews(db: SupabaseClient) {
  if (!placesConfigured()) return { skipped: "GOOGLE_PLACES_API_KEY missing" };
  const { data: clients, error } = await db
    .from("clients")
    .select("id, name, google_place_id")
    .not("google_place_id", "is", null);
  if (error) return { skipped: error.message };

  const results: { client: string; ok: boolean; alerted?: boolean; error?: string }[] = [];
  for (const client of (clients ?? []) as { id: string; name: string; google_place_id: string }[]) {
    try {
      const { data: prev } = await db
        .from("google_review_snapshots")
        .select("rating, review_count, captured_at, captured_on")
        .eq("client_id", client.id)
        .eq("place_id", client.google_place_id)
        .lt("captured_on", edmontonDay())
        .order("captured_on", { ascending: false })
        .limit(1)
        .maybeSingle();
      const details = await snapshotClientReviews(db, client.id, client.google_place_id);
      const prevCount = prev?.review_count == null ? null : Number(prev.review_count);
      const prevRating = prev?.rating == null ? null : Number(prev.rating);
      const newReviews =
        prevCount != null && details.reviewCount != null
          ? Math.max(0, details.reviewCount - prevCount)
          : 0;
      const ratingDrop =
        prevRating != null && details.rating != null && details.rating < prevRating
          ? Math.round((prevRating - details.rating) * 10) / 10
          : 0;
      let alerted = false;
      if (newReviews > 0 || ratingDrop > 0) {
        const sent = await sendReviewAlert({
          companyName: client.name,
          details,
          newReviews,
          ratingDrop,
          since: (prev?.captured_at as string | undefined) ?? null,
        });
        alerted = sent.ok;
      }
      results.push({ client: client.name, ok: true, alerted });
    } catch (e) {
      results.push({
        client: client.name,
        ok: false,
        error: e instanceof Error ? e.message : "snapshot failed",
      });
    }
  }

  // Google allows caching review text only briefly; keep counts, drop old text.
  const staleDay = edmontonDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  await db
    .from("google_review_snapshots")
    .update({ reviews: [] })
    .lt("captured_on", staleDay);

  return { companies: results.length, results };
}
