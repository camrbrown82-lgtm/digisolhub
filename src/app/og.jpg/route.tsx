import { ImageResponse } from "next/og";
import sharp from "sharp";
import { articleCardElement } from "@/lib/dispatchCard";
import { getLocationPage } from "@/lib/locations";
import { SHARE_CARD_SIZE } from "@/lib/shareCard";

export const runtime = "nodejs";

/** Site link preview for Facebook, Instagram, texts, and search. `?city=` gives the city version. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = getLocationPage(url.searchParams.get("city") || "");

  const logo = await fetch(`${url.origin}/logo-badge.png`)
    .then(async (res) =>
      res.ok ? `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}` : null,
    )
    .catch(() => null);

  try {
    const png = new ImageResponse(
      articleCardElement(
        {
          kicker: "DigiSol",
          subline: city
            ? `Web design, SEO & marketing · ${city.name}, Alberta`
            : "Web design, SEO & marketing · Airdrie, Alberta",
          title: city
            ? `Websites that bring ${city.name} businesses more customers`
            : "Custom websites we design and build, then marketing that fills them",
          pill: "Get a free quote",
          footer: "wwwdigisol.com",
        },
        logo,
      ),
      SHARE_CARD_SIZE,
    );
    const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("share card render failed", err);
    return new Response("Card render failed", { status: 500 });
  }
}
