export const ADSENSE_CLIENT = "ca-pub-5101175267885470";
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/** Set by middleware on public page requests (English path, no `/fr` prefix). */
export const PAGE_PATH_HEADER = "x-digisol-path";

/** Only the production domain serves ads; previews and localhost stay out of AdSense. */
const ADSENSE_HOST = "wwwdigisol.com";

/** Thank-you and account pages: thin content that AdSense policy keeps ad-free. */
const NO_ADS_PATHS = [/^\/confirmation$/, /^\/pricing\/success$/, /^\/unsubscribe/, /^\/auth\//];

export function shouldLoadAdSense(opts: {
  host: string | null;
  /** Null for Hub and other non-public requests. */
  path: string | null;
  internal: boolean;
}) {
  if (opts.internal || !opts.path) return false;
  if ((opts.host || "").split(":")[0] !== ADSENSE_HOST) return false;
  return !NO_ADS_PATHS.some((pattern) => pattern.test(opts.path!));
}
