import sharp from "sharp";
import { textPath, textWidth } from "@/lib/cardType";
import { pieceHex, type LayoutPiece } from "@/lib/layoutPieces";

export type { LayoutPiece } from "@/lib/layoutPieces";
export { parseLayoutPieces } from "@/lib/layoutPieces";

function fontWeight(weight?: LayoutPiece["weight"]) {
  return weight === "bold" || weight === "semi" ? "semi" : "regular";
}

/** One line, with bold mapped to the semibold face and italic as a slant. */
export function styledTextPath(
  text: string,
  x: number,
  baseline: number,
  size: number,
  weight: LayoutPiece["weight"],
  italic: boolean | undefined,
  fill: string,
) {
  const path = textPath(text, x, baseline, size, fontWeight(weight), fill);
  if (!path || !italic) return path;
  return `<g transform="translate(${x} ${baseline}) skewX(-12) translate(${-x} ${-baseline})">${path}</g>`;
}

/** One picture fitted to a piece, kept inside the canvas. */
export async function pieceOverlay(
  file: Buffer,
  canvasWidth: number,
  canvasHeight: number,
  piece: { x: number; y: number; size: number; cover?: boolean },
) {
  if (piece.cover) {
    const image = await sharp(file).resize(canvasWidth, canvasHeight, { fit: "cover", position: "centre" }).png().toBuffer();
    return { input: image, left: 0, top: 0 };
  }
  const target = Math.max(8, Math.round(piece.size));
  let image = await sharp(file).resize({ height: target, fit: "inside" }).png().toBuffer();
  let meta = await sharp(image).metadata();
  const left = Math.max(0, Math.min(canvasWidth - 1, Math.round((piece.x / 100) * canvasWidth)));
  const top = Math.max(0, Math.min(canvasHeight - 1, Math.round((piece.y / 100) * canvasHeight)));
  const availW = Math.max(1, canvasWidth - left);
  const availH = Math.max(1, canvasHeight - top);
  if ((meta.width || 0) > availW || (meta.height || 0) > availH) {
    image = await sharp(image).resize({ width: availW, height: availH, fit: "inside" }).png().toBuffer();
    meta = await sharp(image).metadata();
  }
  if (!meta.width || !meta.height) return null;
  return { input: image, left, top };
}

/** Draws the pieces on top of an image. `size` is pixels at `width` × `height`. */
export async function stampLayoutText(
  base: Buffer,
  width: number,
  height: number,
  pieces: LayoutPiece[],
  color: string,
  logos?: { logo?: Buffer | null; emblem?: Buffer | null; images?: Map<string, Buffer>; highlight?: string },
) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#f4f4f5";
  const highlight = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(logos?.highlight || "") ? logos!.highlight!.trim() : "#4f46e5";
  const paths = pieces
    .filter((piece) => piece.kind !== "logo" && piece.kind !== "emblem" && piece.kind !== "image" && piece.kind !== "button" && piece.text.trim())
    .map((piece) => {
      const x = (piece.x / 100) * width;
      const y = (piece.y / 100) * height + piece.size;
      return styledTextPath(piece.text, x, y, piece.size, piece.weight, piece.italic, pieceHex(piece.fill, safe));
    });
  const buttons = pieces
    .filter((piece) => piece.kind === "button" && piece.text.trim())
    .map((piece) => {
      const weight = fontWeight(piece.weight);
      const labelWidth = textWidth(piece.text, piece.size, weight);
      const padX = Math.round(piece.size * 0.75);
      const padY = Math.round(piece.size * 0.4);
      const boxW = Math.max(piece.size * 3, labelWidth + padX * 2);
      const boxH = piece.size + padY * 2;
      const x = Math.max(0, Math.min(width - boxW, (piece.x / 100) * width));
      const y = Math.max(0, Math.min(height - boxH, (piece.y / 100) * height));
      const textX = x + (boxW - labelWidth) / 2;
      const baseline = y + padY + piece.size * 0.82;
      const buttonFill = pieceHex(piece.fill, highlight);
      const label = pieceHex(piece.ink, "#ffffff");
      return `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="${boxH / 2}" fill="${buttonFill}"/>${styledTextPath(piece.text, textX, baseline, piece.size, piece.weight, piece.italic, label)}`;
    });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${pieces
    .filter((piece) => piece.kind === "divider")
    .map((piece) => {
      const y = (piece.y / 100) * height;
      const x = (piece.x / 100) * width;
      return `<rect x="${x}" y="${y}" width="${Math.max(40, width - x - 24)}" height="2" fill="${pieceHex(piece.fill, safe)}"/>`;
    })
    .join("\n  ")}
  ${paths.join("\n  ")}
  ${buttons.join("\n  ")}
</svg>`;
  const photos: { input: Buffer; left: number; top: number }[] = [];
  const imagePieces = pieces
    .filter((piece) => piece.kind === "image" && piece.src)
    .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)));
  for (const piece of imagePieces) {
    if (piece.kind !== "image" || !piece.src) continue;
    const file = logos?.images?.get(piece.src);
    if (!file?.length) continue;
    const layer = await pieceOverlay(file, width, height, piece);
    if (layer) photos.push(layer);
  }
  const marks: { input: Buffer; left: number; top: number }[] = [];
  for (const piece of pieces) {
    const file = piece.kind === "emblem" ? logos?.emblem : piece.kind === "logo" ? logos?.logo : null;
    if (!file?.length) continue;
    const image = await sharp(file).resize({ height: piece.size, width: piece.size * 4, fit: "inside" }).png().toBuffer();
    marks.push({
      input: image,
      left: Math.round((piece.x / 100) * width),
      top: Math.round((piece.y / 100) * height),
    });
  }
  const layers = [...photos, { input: Buffer.from(svg), left: 0, top: 0 }, ...marks];
  return sharp(base)
    .resize(width, height, { fit: "cover" })
    .composite(layers)
    .png()
    .toBuffer();
}

export async function blankCanvas(width: number, height: number, color: string) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#09090b";
  return sharp({ create: { width, height, channels: 3, background: safe } }).png().toBuffer();
}
