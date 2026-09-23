/**
 * DigiSol public logo paths (house brand).
 * Wordmark = horizontal bar mark. Badge = circular secondary emblem.
 */
export const DIGISOL_LOGO_WORDMARK = "/logo.jpg";
export const DIGISOL_LOGO_BADGE = "/logo-badge.png";

type LogoProps = {
  className?: string;
  size?: "header" | "footer" | "hub";
  href?: string;
  /** Show the circular DigiSol secondary badge beside the wordmark. Default true. */
  showBadge?: boolean;
  /** Wordmark only (no badge) — e.g. tight spaces. */
  wordmarkOnly?: boolean;
};

const wordmarkClass = {
  header: "h-12 w-auto sm:h-14 lg:h-16",
  footer: "h-16 w-auto sm:h-20",
  hub: "h-8 w-auto",
};

const badgeClass = {
  header: "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16",
  footer: "h-16 w-16 sm:h-20 sm:w-20",
  hub: "h-9 w-9",
};

export function Logo({
  className = "",
  size = "header",
  href = "/",
  showBadge = true,
  wordmarkOnly = false,
}: LogoProps) {
  const withBadge = showBadge && !wordmarkOnly;

  return (
    <a
      href={href}
      className={`inline-flex shrink-0 items-center gap-2.5 sm:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${className}`}
      aria-label="DigiSol home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DIGISOL_LOGO_WORDMARK}
        alt="DigiSol"
        width={480}
        height={156}
        className={`${wordmarkClass[size]} max-w-[min(100%,16rem)] object-contain object-left`}
      />
      {withBadge ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={DIGISOL_LOGO_BADGE}
          alt=""
          width={256}
          height={256}
          className={`${badgeClass[size]} shrink-0 rounded-full object-cover ring-1 ring-indigo-400/30`}
          aria-hidden="true"
        />
      ) : null}
    </a>
  );
}
