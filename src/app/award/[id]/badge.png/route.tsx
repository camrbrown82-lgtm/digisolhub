import { ImageResponse } from "next/og";
import { awardTheme } from "@/lib/awardTheme";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { awardDate, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PNG copy of the badge for email, since Gmail and Outlook don't show SVG images. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const [award, theme] = await Promise.all([
    hasAdminClient() ? loadAward(createAdminClient(), params.id) : Promise.resolve({ state: "missing" as const }),
    awardTheme(),
  ]);
  const valid = award.state === "valid";
  const name = valid ? award.companyName : "";
  const long = name.length > 18;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 36px",
          background: `linear-gradient(135deg, ${theme.background} 30%, ${theme.primary}${valid ? "59" : "1a"})`,
          border: `4px solid ${valid ? theme.primary : `${theme.text}40`}`,
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
              border: `3px solid ${theme.highlight}${valid ? "b3" : "40"}`,
              opacity: valid ? 1 : 0.35,
            }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: theme.logoData ? 32 : 0 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: theme.primary,
              opacity: valid ? 1 : 0.55,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 2.4,
              padding: "6px 20px",
              borderRadius: 999,
            }}
          >
            DIGISOL EXCELLENCE AWARD
          </div>
          {valid ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: long ? 28 : 34, fontWeight: 800, marginTop: 16, maxWidth: 400 }}>
                {name.length > 26 ? `${name.slice(0, 25)}…` : name}
              </div>
              <div style={{ display: "flex", fontSize: 24, opacity: 0.85, marginTop: 8 }}>
                <span>Website audit</span>
                <span style={{ color: theme.highlight, fontWeight: 700, marginLeft: 8 }}>{`${award.score}/100`}</span>
              </div>
              <div style={{ display: "flex", fontSize: 18, opacity: 0.6, marginTop: 10 }}>
                {`Verified ${awardDate(award.auditedAt)} · wwwdigisol.com`}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 26, opacity: 0.6, marginTop: 18 }}>Not current</div>
          )}
        </div>
      </div>
    ),
    { width: 640, height: 240 },
  );
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return image;
}
