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

/** DigiSol article preview card (Dispatch issues, blog guides, site pages), rendered with next/og. */
export function articleCardElement(card: ArticleCard, logo: string | null, photo?: string | null) {
  const brand = DIGISOL_BRAND;
  const titleSize = photo
    ? card.title.length > 50 ? 46 : 54
    : card.title.length > 70 ? 54 : 64;
  const body = (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
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
        {card.pill ? pillElement(card.pill) : <div style={{ display: "flex" }} />}
        <span style={{ fontSize: 22, color: "#a1a1aa" }}>{card.footer}</span>
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: brand.backgroundColor,
        backgroundImage: `linear-gradient(135deg, ${brand.backgroundColor} 45%, #1e1b4b 100%)`,
        color: brand.textColor,
      }}
    >
      {body}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          width={400}
          height={630}
          alt=""
          style={{ objectFit: "cover", borderLeft: `6px solid ${brand.primaryColor}` }}
        />
      ) : null}
    </div>
  );
}

function pillElement(label: string) {
  return (
    <div
      style={{
        display: "flex",
        padding: "14px 26px",
        borderRadius: 999,
        backgroundColor: DIGISOL_BRAND.primaryColor,
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

/** Video preview card: a real frame from the video with a play button, rendered with next/og. */
export function videoCardElement(card: ArticleCard, frame: string | null, logo: string | null) {
  const brand = DIGISOL_BRAND;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: brand.backgroundColor,
        color: brand.textColor,
      }}
    >
      {frame ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame}
          width={1200}
          height={630}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(9,9,11,0.6) 0%, rgba(9,9,11,0.2) 28%, rgba(9,9,11,0.88) 56%, rgba(9,9,11,0.97) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 150,
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: brand.primaryColor,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            border: "4px solid rgba(255,255,255,0.85)",
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" style={{ marginLeft: 8 }}>
            <path d="M7 4.5v15l12.5-7.5z" fill="#ffffff" />
          </svg>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={72} height={72} alt="" style={{ borderRadius: 36, marginRight: 18 }} />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{card.kicker}</span>
            <span style={{ fontSize: 20, color: brand.highlightColor }}>{card.subline}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 50, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
            {card.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
            {card.pill ? pillElement(card.pill) : <div style={{ display: "flex" }} />}
            <span style={{ fontSize: 22, color: "#d4d4d8" }}>{card.footer}</span>
          </div>
        </div>
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
