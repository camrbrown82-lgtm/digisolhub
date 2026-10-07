import type { AwardTheme } from "@/lib/awardTheme";
import {
  competitiveBadgeDate,
  competitiveBadgeFileName,
  competitiveBadgeLine,
  type PublicCompetitiveBadge,
} from "@/lib/competitive/publicBadge";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** SVG other websites can show. Same shape as the Excellence Award badge. */
export function competitiveBadgeSvg(theme: AwardTheme, badge: PublicCompetitiveBadge) {
  const x = theme.logoData ? 108 : 20;
  const long = badge.companyName.length > 18;
  const name = escapeXml(clip(badge.companyName, long ? 26 : 22));
  const line = escapeXml(`${competitiveBadgeLine(badge.key)} ${badge.score}/100`);
  const date = escapeXml(competitiveBadgeDate(badge.earnedAt));
  const label = escapeXml(`DigiSol award: ${badge.companyName}, ${badge.title}, ${badge.score}/100`);
  const logo = theme.logoData
    ? `<clipPath id="emblem"><circle cx="56" cy="60" r="38"/></clipPath>
  <image href="${theme.logoData}" x="18" y="22" width="76" height="76" clip-path="url(#emblem)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="56" cy="60" r="38" fill="none" stroke="${theme.highlight}" stroke-opacity="0.7" stroke-width="1.5"/>`
    : "";
  const font = 'font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="${label}" ${font}>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.primary}" stop-opacity="0"/>
      <stop offset="1" stop-color="${theme.primary}" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.highlight}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="${theme.background}"/>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="url(#wash)"/>
  <circle cx="304" cy="8" r="52" fill="${theme.highlight}" fill-opacity="0.14"/>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="none" stroke="url(#edge)" stroke-width="2"/>
  ${logo}
  <rect x="${x}" y="16" width="132" height="18" rx="9" fill="${theme.primary}"/>
  <text x="${x + 66}" y="28.6" text-anchor="middle" font-size="8.5" font-weight="700" fill="${theme.text}" letter-spacing="1.1">DIGISOL AWARD</text>
  <text x="${x}" y="58" font-size="${long ? 13 : 16}" font-weight="800" fill="${theme.text}">${name}</text>
  <text x="${x}" y="78" font-size="11" font-weight="700" fill="${theme.highlight}">${line}</text>
  <text x="${x}" y="98" font-size="9.5" fill="${theme.text}" fill-opacity="0.6">Verified ${date} · wwwdigisol.com</text>
</svg>`;
}

export function competitiveBadgeResponse(body: string, downloadName?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=300",
  };
  if (downloadName) headers["Content-Disposition"] = `attachment; filename="${downloadName}"`;
  return new Response(body, { headers });
}

export function pngDownloadName(badge: PublicCompetitiveBadge) {
  return competitiveBadgeFileName(badge.key);
}
