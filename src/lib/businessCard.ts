import sharp, { type OverlayOptions } from "sharp";
import { fitSize, textPath, textWidth, wrapToWidth } from "@/lib/cardType";

/** US business card at 300 dpi: 3.5 × 2 inches. */
export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 600;

function hex(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

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

  const barH = 118;
  const rule = 6;
  const qrSize = 268;
  const qrX = CARD_WIDTH - 40 - qrSize;
  const contentTop = barH + rule;
  const contentH = CARD_HEIGHT - contentTop;
  const qrY = contentTop + Math.round((contentH - qrSize) / 2);
  const textMax = qrX - 56;

  const paths: string[] = [];
  let y = contentTop + 52;
  if (person && person.toLowerCase() !== company.toLowerCase()) {
    const size = fitSize(person, "semi", textMax, 40, 26);
    paths.push(textPath(person, 44, y, size, "semi", text));
    y += size + 10;
  }
  if (title) {
    const size = fitSize(title, "regular", textMax, 22, 16);
    paths.push(textPath(title, 44, y, size, "regular", highlight));
    y += size + 16;
  }
  const companySize = fitSize(company, "semi", textMax, person ? 26 : 40, 20);
  paths.push(textPath(company, 44, y, companySize, "semi", text));
  y += companySize + 16;
  if (line) {
    const size = 22;
    for (const row of wrapToWidth(line, size, "regular", textMax, 2)) {
      paths.push(textPath(row, 44, y, size, "regular", text));
      y += size + 6;
    }
  }

  const contactSize = 18;
  let contactY = CARD_HEIGHT - 36 - (contacts.length - 1) * (contactSize + 8);
  for (const row of contacts) {
    const size = fitSize(row, "regular", textMax, contactSize, 13);
    paths.push(textPath(row, 44, contactY, size, "regular", text));
    contactY += size + 8;
  }

  const scan = "Scan";
  const scanSize = 16;
  const scanX = qrX + (qrSize - textWidth(scan, scanSize, "semi")) / 2;
  paths.push(textPath(scan, scanX, Math.min(CARD_HEIGHT - 18, qrY + qrSize + 36), scanSize, "semi", text));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${background}"/>
  <rect x="0" y="${barH}" width="${CARD_WIDTH}" height="${rule}" fill="${highlight}"/>
  <rect x="${qrX - 10}" y="${qrY - 10}" width="${qrSize + 20}" height="${qrSize + 20}" rx="16" fill="#ffffff"/>
  ${paths.join("\n  ")}
</svg>`;

  const layers: OverlayOptions[] = [];
  if (input.logo?.length) {
    const resized = await sharp(input.logo)
      .resize({ height: 72, width: 460, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const meta = await sharp(resized).metadata();
    layers.push({
      input: resized,
      top: Math.round((barH - (meta.height || 0)) / 2),
      left: Math.round((CARD_WIDTH - (meta.width || 0)) / 2),
    });
  } else {
    const size = fitSize(company, "semi", 700, 32, 22);
    const x = (CARD_WIDTH - textWidth(company, size, "semi")) / 2;
    const mark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${barH}">
  ${textPath(company, x, barH / 2 + size / 3, size, "semi", text)}
</svg>`;
    layers.push({ input: Buffer.from(mark), top: 0, left: 0 });
  }

  const qr = await sharp(input.qrPng).resize(qrSize, qrSize, { fit: "fill" }).png().toBuffer();
  layers.push({ input: qr, top: qrY, left: qrX });

  return sharp(Buffer.from(svg)).composite(layers).png().toBuffer();
}
