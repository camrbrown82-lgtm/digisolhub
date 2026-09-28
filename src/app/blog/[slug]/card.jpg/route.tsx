import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getBlogPost } from "@/lib/blog";
import { DISPATCH_CARD_SIZE, articleCardElement } from "@/lib/dispatchCard";

export const runtime = "nodejs";

/** Link preview image for a blog guide on Facebook, Instagram, and search. */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) return new Response("Not found", { status: 404 });

  const origin = new URL(request.url).origin;
  const logo = await fetch(`${origin}/logo-badge.png`)
    .then(async (res) =>
      res.ok ? `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}` : null,
    )
    .catch(() => null);

  try {
    const png = new ImageResponse(
      articleCardElement(
        {
          kicker: "DigiSol Guides",
          subline: `${post.category} · ${post.readingMinutes} min read`,
          title: post.title,
          pill: "Free guide",
          footer: "wwwdigisol.com/blog",
        },
        logo,
      ),
      DISPATCH_CARD_SIZE,
    );
    const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("blog card render failed", err);
    return new Response("Card render failed", { status: 500 });
  }
}
