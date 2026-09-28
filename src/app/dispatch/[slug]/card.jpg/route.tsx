import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DIGISOL_BRAND } from "@/lib/branding";
import { getDispatchIssue } from "@/lib/dispatch";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

/** Newsletter preview card: the link preview on Facebook/LinkedIn and the image for Instagram posts. */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const issue = getDispatchIssue(params.slug);
  if (!issue) return new Response("Not found", { status: 404 });

  const origin = new URL(request.url).origin;
  const logo = await fetch(`${origin}/logo-badge.png`)
    .then(async (res) =>
      res.ok ? `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}` : null,
    )
    .catch(() => null);
  const brand = DIGISOL_BRAND;
  const titleSize = issue.title.length > 70 ? 54 : 64;

  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `radial-gradient(circle at 85% 10%, ${brand.primaryColor}55, transparent 55%), radial-gradient(circle at 0% 100%, ${brand.highlightColor}33, transparent 50%), ${brand.backgroundColor}`,
          color: brand.textColor,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={84} height={84} alt="" style={{ borderRadius: 42 }} />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>DigiSol Dispatch</span>
            <span style={{ fontSize: 22, color: brand.highlightColor }}>
              {`Vol. ${issue.volume} · ${issue.month} ${issue.year}`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>
          {issue.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {issue.cta ? (
            <div
              style={{
                display: "flex",
                padding: "14px 26px",
                borderRadius: 999,
                background: brand.primaryColor,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {issue.cta.heading}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <span style={{ fontSize: 22, color: "#a1a1aa" }}>wwwdigisol.com/dispatch</span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
