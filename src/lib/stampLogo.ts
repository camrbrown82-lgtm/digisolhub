import sharp from "sharp";

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

export async function stampOfficialLogo(
  poster: Buffer,
  logo: Buffer,
  options?: { backgroundColor?: string; accentColor?: string },
) {
  const background = hexToRgba(options?.backgroundColor || "#09090b");
  const accent = hexToRgba(options?.accentColor || "#4f46e5");
  const art = sharp(poster);
  const meta = await art.metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const headerH = Math.max(140, Math.round(height * 0.14));
  const ruleH = 4;
  const logoHeight = Math.round(headerH * 0.58);
  const resized = await sharp(logo)
    .resize({ height: logoHeight, withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(resized).metadata();
  const markW = logoMeta.width || Math.round(width * 0.28);
  const markH = logoMeta.height || logoHeight;
  const left = Math.max(24, Math.round((width - markW) / 2));
  const top = Math.max(16, Math.round((headerH - markH) / 2));

  const header = await sharp({
    create: {
      width,
      height: headerH,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, top, left }])
    .png()
    .toBuffer();

  const rule = await sharp({
    create: {
      width,
      height: ruleH,
      channels: 4,
      background: accent,
    },
  })
    .png()
    .toBuffer();

  const artPng = await art.png().toBuffer();
  const canvasH = headerH + ruleH + height;
  return sharp({
    create: {
      width,
      height: canvasH,
      channels: 4,
      background,
    },
  })
    .composite([
      { input: header, top: 0, left: 0 },
      { input: rule, top: headerH, left: 0 },
      { input: artPng, top: headerH + ruleH, left: 0 },
    ])
    .png()
    .toBuffer();
}
