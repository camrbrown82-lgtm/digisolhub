import { rgba, type AwardTheme } from "@/lib/awardTheme";
import { awardDate, badgeText, type AwardStatus } from "@/lib/websiteAward";

/** Badge artwork for next/og at 640×240 × `scale`. Satori needs rgba(), not 8-digit hex. */
export function awardBadgeElement(award: AwardStatus, theme: AwardTheme, scale = 1) {
  const s = (n: number) => Math.round(n * scale);
  const valid = award.state === "valid";
  const words = badgeText(award.state === "missing" ? { companyName: "" } : award);
  const name = valid ? words.title : "";
  const long = name.length > 18;

  return (
    <div
      style={{
        width: s(640),
        height: s(240),
        display: "flex",
        alignItems: "center",
        padding: `0 ${s(36)}px`,
        backgroundColor: theme.background,
        backgroundImage: `linear-gradient(135deg, ${theme.background} 35%, ${rgba(theme.primary, valid ? 0.28 : 0.08)})`,
        border: `${s(4)}px solid ${valid ? theme.primary : rgba(theme.text, 0.25)}`,
        borderRadius: s(28),
        color: theme.text,
        fontFamily: "sans-serif",
      }}
    >
      {theme.logoData ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.logoData}
          width={s(152)}
          height={s(152)}
          alt=""
          style={{
            borderRadius: 999,
            border: `${s(3)}px solid ${rgba(theme.highlight, valid ? 0.7 : 0.25)}`,
            opacity: valid ? 1 : 0.35,
          }}
        />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", marginLeft: theme.logoData ? s(32) : 0 }}>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: theme.primary,
            opacity: valid ? 1 : 0.55,
            fontSize: s(17),
            fontWeight: 700,
            letterSpacing: s(2.4),
            padding: `${s(6)}px ${s(20)}px`,
            borderRadius: 999,
          }}
        >
          {words.pill}
        </div>
        {valid ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: s(long ? 28 : 34), fontWeight: 800, marginTop: s(16), maxWidth: s(400) }}>
              {name.length > 26 ? `${name.slice(0, 25)}…` : name}
            </div>
            <div style={{ display: "flex", fontSize: s(24), opacity: 0.85, marginTop: s(8) }}>
              <span>{words.scoreLabel}</span>
              <span style={{ color: theme.highlight, fontWeight: 700, marginLeft: s(8) }}>{`${award.score}/100`}</span>
            </div>
            <div style={{ display: "flex", fontSize: s(18), opacity: 0.6, marginTop: s(10) }}>
              {`Verified ${awardDate(award.auditedAt)} · wwwdigisol.com`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: s(26), opacity: 0.6, marginTop: s(18) }}>Not current</div>
        )}
      </div>
    </div>
  );
}
