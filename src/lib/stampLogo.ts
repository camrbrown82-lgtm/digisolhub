import sharp, { type OverlayOptions } from "sharp";
import { fitSize, textPath } from "@/lib/cardType";
import type { PosterFormat } from "@/lib/poster";
import { POSTER_CANVAS } from "@/lib/posterSizes";

function hexToRgba(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.padEnd(6, "0");
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return { r: 9, g: 9, b: 11, alpha: 1 };
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    alpha: 1,
  };
}

/**
 * Fits the whole image into an exact size. The spare space is a blurred, dimmed stretch of the image
 * itself, so glows and gradients carry to the edges instead of stopping at a flat border.
 */
export async function fitInto(image: Buffer, width: number, height: number) {
  const meta = await sharp(image).metadata();
  const sourceW = meta.width || width;
  const sourceH = meta.height || height;
  const scale = Math.min(width / sourceW, height / sourceH);
  const fitW = Math.max(1, Math.round(sourceW * scale));
  const fitH = Math.max(1, Math.round(sourceH * scale));
  const fitted = await sharp(image).resize(fitW, fitH, { fit: "fill" }).png().toBuffer();
  if (fitW === width && fitH === height) return fitted;

  const { channels } = await sharp(image).stats();
  const mean = channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
  const backdrop = await sharp(image)
    .resize(width, height, { fit: "cover" })
    .blur(40)
    .modulate({ brightness: mean > 150 ? 0.94 : 0.6, saturation: 1.15 })
    .png()
    .toBuffer();
  return sharp(backdrop)
    .composite([{ input: fitted, top: Math.round((height - fitH) / 2), left: Math.round((width - fitW) / 2) }])
    .png()
    .toBuffer();
}

/** Art shape that best fills the space left for it once the logo bar (and badge band) are on the canvas. */
export function artFormatFor(format: PosterFormat, withBadge: boolean): PosterFormat {
  if (format === "landscape") return "landscape";
  return withBadge ? "landscape" : "square";
}

/**
 * Builds the finished poster at exactly the format's size: the official logo on a brand-colored bar,
 * then the art, then the award badge band when there is one. Nothing is drawn over the copy.
 */
export async function stampOfficialLogo(
  art: Buffer,
  logo: Buffer | null,
  options: {
    format: PosterFormat;
    backgroundColor?: string;
    accentColor?: string;
    textColor?: string;
    badge?: Buffer | null;
    /** Real QR placed on its own band under the art, never drawn by the image model. */
    qr?: Buffer | null;
    qrHost?: string;
  },
) {
  const { width, height } = POSTER_CANVAS[options.format];
  const background = hexToRgba(options.backgroundColor || "#09090b");
  const accent = hexToRgba(options.accentColor || "#4f46e5");
  const text = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(options.textColor || "")
    ? options.textColor!.trim()
    : "#f4f4f5";
  const layers: OverlayOptions[] = [];
  let top = 0;

  if (logo?.length) {
    const headerH = Math.round(height * (options.format === "landscape" ? 0.13 : 0.11));
    const resized = await sharp(logo)
      .resize({ height: Math.round(headerH * 0.58), width: Math.round(width * 0.6), fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const logoMeta = await sharp(resized).metadata();
    layers.push({
      input: resized,
      top: Math.round((headerH - (logoMeta.height || 0)) / 2),
      left: Math.round((width - (logoMeta.width || 0)) / 2),
    });
    const ruleH = 4;
    layers.push({
      input: await sharp({ create: { width, height: ruleH, channels: 4, background: accent } }).png().toBuffer(),
      top: headerH,
      left: 0,
    });
    top = headerH + ruleH;
  }

  let stripH = 0;
  if (options.qr?.length) {
    stripH = Math.round(height * (options.format === "landscape" ? 0.2 : 0.16));
    const qrSize = stripH - 36;
    const qrImg = await sharp(options.qr).resize(qrSize, qrSize, { fit: "fill" }).png().toBuffer();
    const host = (options.qrHost || "").slice(0, 42);
    const hostSize = host ? fitSize(host, "regular", width - qrSize - 120, 28, 16) : 28;
    const label = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width - qrSize - 48}" height="${stripH}">
  ${textPath("Scan", 40, Math.round(stripH * 0.42), 32, "semi", text)}
  ${host ? textPath(host, 40, Math.round(stripH * 0.72), hostSize, "regular", text) : ""}
</svg>`;
    layers.push({
      input: await sharp({ create: { width, height: 4, channels: 4, background: accent } }).png().toBuffer(),
      top: height - stripH,
      left: 0,
    });
    layers.push({ input: Buffer.from(label), top: height - stripH, left: 0 });
    layers.push({
      input: qrImg,
      top: height - stripH + Math.round((stripH - qrSize) / 2),
      left: width - qrSize - 24,
    });
  }

  let bandH = 0;
  if (options.badge?.length) {
    const badgeMeta = await sharp(options.badge).metadata();
    const pad = Math.round(width * (options.format === "landscape" ? 0.02 : 0.04));
    bandH = (badgeMeta.height || 0) + pad * 2;
    layers.push({
      input: options.badge,
      top: height - stripH - bandH + pad,
      left: Math.round((width - (badgeMeta.width || 0)) / 2),
    });
  }

  const artArea = await fitInto(art, width, height - top - bandH - stripH);
  layers.unshift({ input: artArea, top, left: 0 });

  return sharp({ create: { width, height, channels: 4, background } })
    .composite(layers)
    .png()
    .toBuffer();
}

/** Badge width on each canvas, so the band stays in proportion. */
export function badgeWidthFor(format: PosterFormat) {
  return Math.round(POSTER_CANVAS[format].width * (format === "landscape" ? 0.28 : 0.62));
}
