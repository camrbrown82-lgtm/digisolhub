import sharp, { type OverlayOptions } from "sharp";
import { fitSize, textPath, textWidth, wrapToWidth } from "@/lib/cardType";
import type { LayoutPiece } from "@/lib/layoutPieces";
import { pieceHex } from "@/lib/layoutPieces";
import { pieceOverlay, styledTextPath } from "@/lib/layoutText";
import { fitInto } from "@/lib/stampLogo";

/** US business card at 300 dpi: 3.5 × 2 inches. */
export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 600;

function hex(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

function centeredPath(text: string, y: number, size: number, weight: "regular" | "semi", fill: string, maxWidth: number) {
  const fitted = fitSize(text, weight, maxWidth, size, 14);
  const x = (CARD_WIDTH - textWidth(text, fitted, weight)) / 2;
  return { path: textPath(text, x, y, fitted, weight, fill), size: fitted };
}

function cardSvg(background: string, highlight: string, barH: number, rule: number, paths: string[], extra = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${background}"/>
  <rect width="${CARD_WIDTH}" height="${barH}" fill="${highlight}"/>
  <rect x="0" y="${barH}" width="${CARD_WIDTH}" height="${rule}" fill="${highlight}"/>
  ${extra}
  ${paths.join("\n  ")}
</svg>`;
}

async function circleImage(file: Buffer, size: number) {
  const cover = await sharp(file).resize(size, size, { fit: "cover" }).png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(cover).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function fitImage(file: Buffer, width: number, height: number) {
  return sharp(file).resize({ width, height, fit: "inside", withoutEnlargement: false }).png().toBuffer();
}

function qrPlate(size: number, x: number, y: number, png: Buffer): OverlayOptions[] {
  return [
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 16}" height="${size + 16}"><rect width="100%" height="100%" rx="12" fill="#fff"/></svg>`,
      ),
      top: y - 8,
      left: x - 8,
    },
    { input: png, top: y, left: x },
  ];
}

function qrOrigin(side: "left" | "right" | "center", size: number, top: number) {
  const margin = 28;
  const x =
    side === "left" ? margin : side === "right" ? CARD_WIDTH - margin - size : Math.round((CARD_WIDTH - size) / 2);
  return { x, y: top };
}

async function awardGrid(awards: Buffer[], area: { left: number; top: number; width: number; height: number }) {
  const layers: OverlayOptions[] = [];
  if (!awards.length) return layers;
  const cols = awards.length === 1 ? 1 : 2;
  const rows = Math.ceil(awards.length / cols);
  const gap = 16;
  const cellW = Math.floor((area.width - gap * (cols - 1)) / cols);
  const cellH = Math.floor((area.height - gap * (rows - 1)) / rows);
  for (let index = 0; index < awards.length; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const image = await fitImage(awards[index], Math.max(40, cellW - 8), Math.max(40, cellH - 8));
    const meta = await sharp(image).metadata();
    const slotX = area.left + col * (cellW + gap);
    const slotY = area.top + row * (cellH + gap);
    layers.push({
      input: image,
      left: slotX + Math.round((cellW - (meta.width || cellW)) / 2),
      top: slotY + Math.round((cellH - (meta.height || cellH)) / 2),
    });
  }
  return layers;
}

/**
 * Default front is two sections: an indigo header with the logo, then a body
 * with the lines, a large center badge, and the QR. Kaylev can move any of those.
 * Default back is the headline and up to four awards.
 */
export async function renderBusinessCard(input: {
  companyName: string;
  siteHost: string;
  qrPng: Buffer;
  logo?: Buffer | null;
  emblem?: Buffer | null;
  awards?: Buffer[];
  backgroundColor?: string;
  textColor?: string;
  headerColor?: string;
  showHeader?: boolean;
  name?: string;
  roles?: string[];
  details?: string[];
  backHeadline?: string;
  backSubline?: string;
  qrFace?: "front" | "back";
  qrSide?: "left" | "right" | "center";
  emblemSize?: number;
  logoSize?: number;
  awardsFace?: "front" | "back";
  /** When set, these lines replace the automatic text. x and y are percentages. */
  layout?: LayoutPiece[];
  /** Pictures placed in the editor. Drawn on top of that face. */
  placedImages?: { buffer: Buffer; piece: LayoutPiece }[];
  /** A new picture from the directions. Replaces the header, badge, and award layout. */
  scene?: Buffer | null;
  /** Leave the QR off when this picture was not asked to include one. */
  omitQr?: boolean;
}) {
  const background = hex(input.backgroundColor, "#09090b");
  const text = hex(input.textColor, "#f4f4f5");
  const header = hex(input.headerColor, "#4f46e5");
  const company = input.companyName.trim() || "Company";
  const name = (input.name || "").trim();
  const roles = (input.roles || [])
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== company.toLowerCase())
    .slice(0, 6);
  const details = (input.details || []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
  const awards = (input.awards || []).filter((item) => item.length).slice(0, 4);
  const headline = (input.backHeadline || "").trim();
  const subline = (input.backSubline || "").trim();
  const scene = input.scene?.length ? input.scene : null;
  const showHeader = !scene && input.showHeader !== false;
  const omitQr = input.omitQr === true;
  const requestedLogo = Math.min(160, Math.max(36, Math.round(input.logoSize || 72)));
  const barH = showHeader ? Math.max(112, requestedLogo + 32) : 0;
  const qrFace = input.qrFace === "back" ? "back" : "front";
  const qrSide = input.qrSide === "left" || input.qrSide === "center" ? input.qrSide : "right";
  const awardsFace = input.awardsFace === "front" ? "front" : "back";
  const emblemSize = Math.min(420, Math.max(200, Math.round(input.emblemSize || 360)));
  const qrOnFront = qrFace === "front";
  const awardsOnFront = awardsFace === "front" && awards.length > 0;

  const custom = (input.layout || []).filter(
    (piece) =>
      piece.kind !== "logo" &&
      piece.kind !== "emblem" &&
      piece.kind !== "image" &&
      (piece.kind === "divider" || piece.text.trim()),
  );
  const placed: LayoutPiece[] = [];
  function place(piece: LayoutPiece, paths: string[]) {
    const x = (piece.x / 100) * CARD_WIDTH;
    const baseline = (piece.y / 100) * CARD_HEIGHT + piece.size;
    if (piece.kind === "button") {
      const size = piece.size;
      const boxW = Math.max(size * 4, piece.text.length * size * 0.55);
      const boxH = size + 16;
      const buttonFill = pieceHex(piece.fill, header);
      paths.push(
        `<rect x="${x}" y="${baseline - size}" width="${boxW}" height="${boxH}" rx="${boxH / 2}" fill="${buttonFill}"/>${styledTextPath(piece.text, x + 12, baseline, size, piece.weight, piece.italic, pieceHex(piece.ink, "#ffffff"))}`,
      );
    } else if (piece.kind === "divider") {
      paths.push(`<rect x="${x}" y="${baseline}" width="280" height="2" fill="${pieceHex(piece.fill, text)}"/>`);
    } else {
      paths.push(styledTextPath(piece.text, x, baseline, piece.size, piece.weight, piece.italic, pieceHex(piece.fill, text)));
    }
    placed.push(piece);
  }
  const leftW = qrOnFront && qrSide !== "center" ? 250 : 300;
  const textX = qrOnFront && qrSide === "left" ? CARD_WIDTH - leftW - 28 : 28;
  const lead = [name, company, ...roles].filter(Boolean).slice(0, 8 - details.length);
  const lines = [...lead, ...details];
  const frontPaths: string[] = [];
  if (custom.length) {
    for (const piece of custom.filter((item) => (item.face || "front") === "front")) place(piece, frontPaths);
  } else {
    let y = barH + 44;
    lines.forEach((line, index) => {
      const size = fitSize(line, index === 0 ? "semi" : "regular", leftW, index === 0 ? 22 : 15, 11);
      const piece: LayoutPiece = {
        id: `front-${index}`,
        label: index === 0 ? "Name" : `Line ${index + 1}`,
        text: line,
        size,
        x: Math.round((textX / CARD_WIDTH) * 1000) / 10,
        y: Math.round((((y - size) / CARD_HEIGHT) * 1000)) / 10,
        face: "front",
        weight: index === 0 ? "semi" : "regular",
      };
      place(piece, frontPaths);
      y += size + 8;
    });
  }

  const frontSvg = cardSvg(background, header, barH, 0, frontPaths);
  const frontLayers: OverlayOptions[] = [];
  if (!scene && input.logo?.length) {
    const logoH = showHeader ? Math.min(requestedLogo, barH - 24) : requestedLogo;
    const logo = await sharp(input.logo).resize({ height: logoH, width: 420, fit: "inside" }).png().toBuffer();
    const meta = await sharp(logo).metadata();
    frontLayers.push({
      input: logo,
      top: showHeader ? Math.round((barH - (meta.height || logoH)) / 2) : 24,
      left: Math.round((CARD_WIDTH - (meta.width || 0)) / 2),
    });
  }
  if (!scene && !awardsOnFront && input.emblem?.length) {
    const bodyTop = showHeader ? barH : 96;
    const bodyH = CARD_HEIGHT - bodyTop - 16;
    const size = Math.min(Math.min(480, Math.max(180, emblemSize)), bodyH - 8);
    frontLayers.push({
      input: await circleImage(input.emblem, size),
      top: bodyTop + Math.round((bodyH - size) / 2),
      left: Math.round((CARD_WIDTH - size) / 2),
    });
  }
  if (!scene && awardsOnFront) {
    const qrReserve = qrOnFront && qrSide !== "center" ? 200 : 16;
    const gridLeft = qrOnFront && qrSide === "left" ? 220 : 200;
    frontLayers.push(
      ...(await awardGrid(awards, {
        left: gridLeft,
        top: barH + 28,
        width: CARD_WIDTH - gridLeft - qrReserve,
        height: CARD_HEIGHT - barH - 44,
      })),
    );
  }
  const qrPng = await sharp(input.qrPng).resize(168, 168, { fit: "fill" }).png().toBuffer();
  if (!omitQr && qrOnFront) {
    const size = qrSide === "center" ? 150 : 168;
    const bodyTop = barH + 24;
    const { x, y: qrY } = qrOrigin(qrSide, size, bodyTop + Math.round((CARD_HEIGHT - bodyTop - size) / 2));
    const fitted = size === 168 ? qrPng : await sharp(input.qrPng).resize(size, size, { fit: "fill" }).png().toBuffer();
    frontLayers.push(...qrPlate(size, x, qrY, fitted));
  }
  const front = scene
    ? await sharp(await fitInto(scene, CARD_WIDTH, CARD_HEIGHT))
        .composite([
          {
            input: Buffer.from(
              `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">${frontPaths.join("\n")}</svg>`,
            ),
          },
          ...frontLayers,
        ])
        .png()
        .toBuffer()
    : await sharp(Buffer.from(frontSvg)).composite(frontLayers).png().toBuffer();

  const backPaths: string[] = [];
  let headlineBottom = 36;
  if (custom.length) {
    for (const piece of custom.filter((item) => item.face === "back")) {
      place(piece, backPaths);
      headlineBottom = Math.max(headlineBottom, (piece.y / 100) * CARD_HEIGHT + piece.size + 12);
    }
  } else {
    for (const row of wrapToWidth(headline, 26, "semi", CARD_WIDTH - 80, 2)) {
      const fitted = centeredPath(row, headlineBottom + 26, 26, "semi", text, CARD_WIDTH - 80);
      backPaths.push(fitted.path);
      placed.push({
        id: `back-${placed.length}`,
        label: "Headline",
        text: row,
        size: fitted.size,
        x: Math.round(((CARD_WIDTH - textWidth(row, fitted.size, "semi")) / 2 / CARD_WIDTH) * 1000) / 10,
        y: Math.round((((headlineBottom + 26 - fitted.size) / CARD_HEIGHT) * 1000)) / 10,
        face: "back",
        weight: "semi",
      });
      headlineBottom += fitted.size + 8;
    }
    for (const row of wrapToWidth(subline, 16, "regular", CARD_WIDTH - 80, 2)) {
      const fitted = centeredPath(row, headlineBottom + 16, 16, "regular", text, CARD_WIDTH - 80);
      backPaths.push(fitted.path);
      placed.push({
        id: `back-${placed.length}`,
        label: "Subline",
        text: row,
        size: fitted.size,
        x: Math.round(((CARD_WIDTH - textWidth(row, fitted.size, "regular")) / 2 / CARD_WIDTH) * 1000) / 10,
        y: Math.round((((headlineBottom + 16 - fitted.size) / CARD_HEIGHT) * 1000)) / 10,
        face: "back",
        weight: "regular",
      });
      headlineBottom += fitted.size + 6;
    }
  }
  const backSvg = cardSvg(background, header, 0, 0, backPaths);
  const backLayers: OverlayOptions[] = [];
  const gridTop = Math.max(headlineBottom + 16, 88);
  if (!scene && !awardsOnFront && awards.length) {
    if (qrFace === "back" && qrSide !== "center") {
      const columnLeft = qrSide === "left" ? 220 : 28;
      backLayers.push(
        ...(await awardGrid(awards, {
          left: columnLeft,
          top: gridTop,
          width: CARD_WIDTH - 248,
          height: CARD_HEIGHT - gridTop - 20,
        })),
      );
    } else {
      backLayers.push(
        ...(await awardGrid(awards, {
          left: 36,
          top: gridTop,
          width: CARD_WIDTH - 72,
          height: CARD_HEIGHT - gridTop - 20,
        })),
      );
    }
  }
  if (!omitQr && qrFace === "back") {
    const size = 188;
    const { x, y: qrY } = qrOrigin(qrSide, size, gridTop + 12);
    const fitted = await sharp(input.qrPng).resize(size, size, { fit: "fill" }).png().toBuffer();
    backLayers.push(...qrPlate(size, x, qrY, fitted));
  }
  const back = await sharp(Buffer.from(backSvg)).composite(backLayers).png().toBuffer();

  async function withPlaced(base: Buffer, face: string) {
    const layers: OverlayOptions[] = [];
    for (const item of input.placedImages || []) {
      if ((item.piece.face || "front") !== face) continue;
      const layer = await pieceOverlay(item.buffer, CARD_WIDTH, CARD_HEIGHT, item.piece);
      if (layer) layers.push(layer);
    }
    if (!layers.length) return base;
    return sharp(base).composite(layers).png().toBuffer();
  }

  return { front: await withPlaced(front, "front"), back: await withPlaced(back, "back"), pieces: placed };
}
