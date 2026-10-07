import { rgba, type AwardTheme } from "@/lib/awardTheme";
import { competitiveBadgeDate, competitiveBadgeLine, type PublicCompetitiveBadge } from "@/lib/competitive/publicBadge";

/** Badge artwork for next/og at 640×240. Satori needs rgba() and display:flex. */
export function competitiveBadgeElement(badge: PublicCompetitiveBadge, theme: AwardTheme) {
  const name = badge.companyName.length > 26 ? `${badge.companyName.slice(0, 25)}…` : badge.companyName;
  const long = badge.companyName.length > 18;
  const line = `${competitiveBadgeLine(badge.key)} ${badge.score}/100`;

  return (
    <div
      style={{
        width: 640,
        height: 240,
        display: "flex",
        alignItems: "center",
        padding: "0 36px",
        backgroundColor: theme.background,
        backgroundImage: `linear-gradient(135deg, ${theme.background} 35%, ${rgba(theme.primary, 0.28)})`,
        border: `4px solid ${theme.primary}`,
        borderRadius: 28,
        color: theme.text,
        fontFamily: "sans-serif",
      }}
    >
      {theme.logoData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.logoData}
          width={152}
          height={152}
          alt=""
          style={{
            borderRadius: 999,
            border: `3px solid ${rgba(theme.highlight, 0.7)}`,
          }}
        />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", marginLeft: theme.logoData ? 32 : 0 }}>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: theme.primary,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: 2.4,
            padding: "6px 20px",
            borderRadius: 999,
          }}
        >
          DIGISOL AWARD
        </div>
        <div style={{ display: "flex", fontSize: long ? 28 : 34, fontWeight: 800, marginTop: 16, maxWidth: 400 }}>
          {name}
        </div>
        <div style={{ display: "flex", fontSize: 22, marginTop: 8, color: theme.highlight, fontWeight: 700 }}>{line}</div>
        <div style={{ display: "flex", fontSize: 18, opacity: 0.6, marginTop: 10 }}>
          {`Verified ${competitiveBadgeDate(badge.earnedAt)} · wwwdigisol.com`}
        </div>
      </div>
    </div>
  );
}
