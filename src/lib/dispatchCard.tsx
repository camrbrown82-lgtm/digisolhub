import { DIGISOL_BRAND } from "@/lib/branding";
import type { DispatchIssue } from "@/lib/dispatch";

export const DISPATCH_CARD_SIZE = { width: 1200, height: 630 };

type ArticleCard = {
  kicker: string;
  subline: string;
  title: string;
  pill?: string;
  footer: string;
};

/** DigiSol article preview card (Dispatch issues and blog guides), rendered with next/og. */
export function articleCardElement(card: ArticleCard, logo: string | null) {
  const brand = DIGISOL_BRAND;
  const titleSize = card.title.length > 70 ? 54 : 64;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        backgroundColor: brand.backgroundColor,
        backgroundImage: `linear-gradient(135deg, ${brand.backgroundColor} 45%, #1e1b4b 100%)`,
        color: brand.textColor,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={84} height={84} alt="" style={{ borderRadius: 42, marginRight: 20 }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 30, fontWeight: 700 }}>{card.kicker}</span>
          <span style={{ fontSize: 22, color: brand.highlightColor }}>{card.subline}</span>
        </div>
      </div>

      <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.1, maxWidth: 1040 }}>
        {card.title}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {card.pill ? (
          <div
            style={{
              display: "flex",
              padding: "14px 26px",
              borderRadius: 999,
              backgroundColor: brand.primaryColor,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {card.pill}
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
        <span style={{ fontSize: 22, color: "#a1a1aa" }}>{card.footer}</span>
      </div>
    </div>
  );
}

/** Newsletter preview card layout (rendered with next/og). */
export function dispatchCardElement(issue: DispatchIssue, logo: string | null) {
  return articleCardElement(
    {
      kicker: "DigiSol Dispatch",
      subline: `Vol. ${issue.volume} · ${issue.month} ${issue.year}`,
      title: issue.title,
      pill: issue.cta?.heading,
      footer: "wwwdigisol.com/dispatch",
    },
    logo,
  );
}
