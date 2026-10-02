import sharp from "sharp";
import { isPosterExportSize, isWorkspaceMediaUrl, POSTER_EXPORT_SIZES } from "@/lib/posterSizes";
import { fitInto } from "@/lib/stampLogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storageOrigin() {
  const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

/**
 * GET ?src=<stored poster URL>&size=feed|square|story|link|wide[&download=1]
 * A stored AI poster as a JPEG at the exact size a platform expects. Public so Meta can fetch it when publishing.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const src = params.get("src") || "";
  const size = params.get("size");
  if (!isPosterExportSize(size)) return new Response("Unknown size", { status: 400 });

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new Response("Bad poster URL", { status: 400 });
  }
  if (url.origin !== storageOrigin() || !isWorkspaceMediaUrl(url.href)) {
    return new Response("Only files stored for this company can be exported", { status: 400 });
  }

  const upstream = await fetch(url.href);
  if (!upstream.ok) return new Response("Poster not found", { status: 404 });

  const { width, height } = POSTER_EXPORT_SIZES[size];
  const fitted = await fitInto(Buffer.from(await upstream.arrayBuffer()), width, height);
  const jpeg = await sharp(fitted).flatten({ background: "#09090b" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();

  const name = (url.pathname.split("/").pop() || "poster").replace(/\.\w+$/, "");
  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
  });
  if (params.get("download") === "1") {
    headers.set("Content-Disposition", `attachment; filename="${name}-${size}-${width}x${height}.jpg"`);
  }
  return new Response(new Uint8Array(jpeg), { headers });
}
