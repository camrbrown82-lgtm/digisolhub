import sharp from "sharp";

export async function stampOfficialLogo(poster: Buffer, logo: Buffer) {
  const base = sharp(poster);
  const meta = await base.metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const logoWidth = Math.round(width * 0.32);
  const resized = await sharp(logo)
    .resize({ width: logoWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(resized).metadata();
  const markWidth = logoMeta.width || logoWidth;
  const top = Math.max(24, Math.round(height * 0.055));
  const left = Math.max(0, Math.round((width - markWidth) / 2));
  return base
    .composite([{ input: resized, top, left }])
    .png()
    .toBuffer();
}
