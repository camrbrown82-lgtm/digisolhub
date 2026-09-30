import { DIGISOL_BRAND } from "@/lib/branding";

export type AwardBadgeTheme = {
  background: string;
  primary: string;
  highlight: string;
  text: string;
  logoUrl: string;
};

export const DEFAULT_AWARD_THEME: AwardBadgeTheme = {
  background: DIGISOL_BRAND.backgroundColor,
  primary: DIGISOL_BRAND.primaryColor,
  highlight: DIGISOL_BRAND.highlightColor,
  text: DIGISOL_BRAND.textColor,
  logoUrl: DIGISOL_BRAND.secondaryLogoUrl,
};

interface AwardProps {
  companyName: string;
  score: number;
  date: string;
  verifyUrl: string;
  /** DigiSol's kit; colors must be #rrggbb so alpha suffixes work. */
  theme?: AwardBadgeTheme;
}

export default function WebsiteAwardBadge({ companyName, score, date, verifyUrl, theme = DEFAULT_AWARD_THEME }: AwardProps) {
  return (
    <div
      className="relative mx-auto max-w-md overflow-hidden rounded-2xl border-2 p-8 text-center shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${theme.background} 30%, ${theme.primary}59)`,
        borderColor: theme.primary,
        color: theme.text,
      }}
    >
      <div
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl"
        style={{ background: `${theme.highlight}33` }}
        aria-hidden="true"
      />

      {theme.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.logoUrl}
          alt="DigiSol"
          width={64}
          height={64}
          className="relative mx-auto mb-4 h-16 w-16 rounded-full object-cover"
          style={{ boxShadow: `0 0 0 2px ${theme.highlight}b3, 0 0 24px ${theme.highlight}55` }}
        />
      ) : null}

      <span
        className="relative mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
        style={{ background: theme.primary, color: theme.text }}
      >
        DigiSol Excellence Award
      </span>

      <h2 className="relative mb-2 text-2xl font-extrabold">{companyName}</h2>
      <p className="relative mb-6 text-sm" style={{ opacity: 0.85 }}>
        Recognized for website speed, SEO, and technical quality with a website audit score of{" "}
        <span className="font-bold" style={{ color: theme.highlight }}>
          {score}/100
        </span>
        .
      </p>

      <div
        className="relative mb-6 rounded-xl border px-4 py-3 text-xs"
        style={{ borderColor: `${theme.text}1f`, background: `${theme.background}cc`, color: `${theme.text}a6` }}
      >
        Verified &amp; audited on {date} by DigiSol
      </div>

      <div className="relative flex justify-center gap-3">
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
          style={{ background: theme.primary, color: theme.text }}
        >
          Verify award on DigiSol
        </a>
      </div>
    </div>
  );
}
