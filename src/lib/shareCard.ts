export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/** Branded 1200x630 link preview; `city` is a location slug for the city version. */
export function shareCardPath(city?: string) {
  return city ? `/og.jpg?city=${encodeURIComponent(city)}` : "/og.jpg";
}

/** `openGraph.images` entry for the DigiSol preview card. */
export function shareCardImages(alt: string, city?: string) {
  return [{ url: shareCardPath(city), ...SHARE_CARD_SIZE, alt, type: "image/jpeg" }];
}
