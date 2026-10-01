import sharp, { type OverlayOptions } from "sharp";
import { fitSize, textPath, textWidth, wrapToWidth } from "@/lib/cardType";

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

async function logoOnBar(logo: Buffer | null | undefined, company: string, text: string, barH: number) {
  if (logo?.length) {
    const resized = await sharp(logo)
      .resize({ height: Math.round(barH * 0.62), width: 460, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    return {
      input: resized,
      top: Math.round((barH - (meta.height || 0)) / 2),
      left: Math.round((CARD_WIDTH - (meta.width || 0)) / 2),
    } satisfies OverlayOptions;
  }
  const size = fitSize(company, "semi", 700, 32, 22);
  const x = (CARD_WIDTH - textWidth(company, size, "semi")) / 2;
  const mark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${barH}">
  ${textPath(company, x, barH / 2 + size / 3, size, "semi", text)}
</svg>`;
  return { input: Buffer.from(mark), top: 0, left: 0 } satisfies OverlayOptions;
}

function cardSvg(background: string, highlight: string, barH: number, rule: number, paths: string[], extra = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${background}"/>
  <rect x="0" y="${barH}" width="${CARD_WIDTH}" height="${rule}" fill="${highlight}"/>
  ${extra}
  ${paths.join("\n  ")}
</svg>`;
}

/** Front is the name. Back is the QR code. Both are 3.5 × 2 in. */
export async function renderBusinessCard(input: {
  companyName: string;
  line: string;
  personName?: string;
  personTitle?: string;
  phone?: string;
  email?: string;
  siteHost: string;
  qrPng: Buffer;
  logo?: Buffer | null;
  backgroundColor?: string;
  textColor?: string;
  highlightColor?: string;
}) {
  const background = hex(input.backgroundColor, "#09090b");
  const text = hex(input.textColor, "#f4f4f5");
  const highlight = hex(input.highlightColor, "#4f46e5");
  const company = input.companyName.trim() || "Company";
  const person = (input.personName || "").trim();
  const title = (input.personTitle || "").trim();
  const line = (input.line || "").trim();
  const contacts = [input.phone, input.email, input.siteHost].map((item) => (item || "").trim()).filter(Boolean);
  const textMax = CARD_WIDTH - 88;

  const frontPaths: string[] = [];
  const barH = 118;
  const rule = 6;
  let y = barH + rule + 52;
  if (person && person.toLowerCase() !== company.toLowerCase()) {
    const size = fitSize(person, "semi", textMax, 44, 28);
    frontPaths.push(textPath(person, 44, y, size, "semi", text));
    y += size + 12;
  }
  if (title) {
    const size = fitSize(title, "regular", textMax, 24, 16);
    frontPaths.push(textPath(title, 44, y, size, "regular", highlight));
    y += size + 18;
  }
  const companySize = fitSize(company, "semi", textMax, person ? 28 : 44, 20);
  frontPaths.push(textPath(company, 44, y, companySize, "semi", text));
  y += companySize + 18;
  if (line) {
    for (const row of wrapToWidth(line, 22, "regular", textMax, 2)) {
      frontPaths.push(textPath(row, 44, y, 22, "regular", text));
      y += 28;
    }
  }
  const contactSize = 18;
  let contactY = CARD_HEIGHT - 36 - (contacts.length - 1) * (contactSize + 8);
  for (const row of contacts) {
    const size = fitSize(row, "regular", textMax, contactSize, 13);
    frontPaths.push(textPath(row, 44, contactY, size, "regular", text));
    contactY += size + 8;
  }

  const frontSvg = cardSvg(background, highlight, barH, rule, frontPaths);
  const frontLayers: OverlayOptions[] = [await logoOnBar(input.logo, company, text, barH)];
  const front = await sharp(Buffer.from(frontSvg)).composite(frontLayers).png().toBuffer();

  const backBar = 96;
  const qrSize = 250;
  const qrX = Math.round((CARD_WIDTH - qrSize) / 2);
  const qrY = backBar + rule + 28;
  const backPaths: string[] = [];
  const scan = centeredPath("Scan", qrY + qrSize + 36, 18, "semi", text, 400);
  backPaths.push(scan.path);
  const host = centeredPath(input.siteHost, Math.min(CARD_HEIGHT - 28, qrY + qrSize + 64), 18, "regular", text, CARD_WIDTH - 80);
  backPaths.push(host.path);
  const plate = `<rect x="${qrX - 12}" y="${qrY - 12}" width="${qrSize + 24}" height="${qrSize + 24}" rx="16" fill="#ffffff"/>`;
  const backSvg = cardSvg(background, highlight, backBar, rule, backPaths, plate);
  const qr = await sharp(input.qrPng).resize(qrSize, qrSize, { fit: "fill" }).png().toBuffer();
  const back = await sharp(Buffer.from(backSvg))
    .composite([await logoOnBar(input.logo, company, text, backBar), { input: qr, top: qrY, left: qrX }])
    .png()
    .toBuffer();

  return { front, back };
}
