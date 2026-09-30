import { markBadgeSeen } from "@/lib/awardRegistry";
import { awardTheme, type AwardTheme } from "@/lib/awardTheme";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { awardDate, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function svg(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short CDN cache so requests from the winner's site still reach us and mark the badge as live.
      "Cache-Control": "public, max-age=3600, s-maxage=300",
    },
  });
}

function frame(theme: AwardTheme, label: string, inner: string, current: boolean) {
  const font = 'font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif"';
  const logo = theme.logoData
    ? `<clipPath id="emblem"><circle cx="56" cy="60" r="38"/></clipPath>
  <image href="${theme.logoData}" x="18" y="22" width="76" height="76" clip-path="url(#emblem)" preserveAspectRatio="xMidYMid slice"${current ? "" : ' opacity="0.35"'}/>
  <circle cx="56" cy="60" r="38" fill="none" stroke="${theme.highlight}" stroke-opacity="${current ? 0.7 : 0.25}" stroke-width="1.5"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="${escapeXml(label)}" ${font}>
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.primary}" stop-opacity="0"/>
      <stop offset="1" stop-color="${theme.primary}" stop-opacity="${current ? 0.35 : 0.1}"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.primary}"/>
      <stop offset="1" stop-color="${theme.highlight}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="${theme.background}"/>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="url(#wash)"/>
  ${current ? `<circle cx="304" cy="8" r="52" fill="${theme.highlight}" fill-opacity="0.14"/>` : ""}
  <rect x="1" y="1" width="318" height="118" rx="14" fill="none" stroke="${current ? "url(#edge)" : theme.text}" stroke-opacity="${current ? 1 : 0.25}" stroke-width="2"/>
  ${logo}
  ${inner}
</svg>`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const [award, theme] = await Promise.all([
    hasAdminClient() ? loadAward(createAdminClient(), params.id) : Promise.resolve({ state: "missing" as const }),
    awardTheme(),
  ]);
  const x = theme.logoData ? 108 : 20;
  const pill = `<rect x="${x}" y="16" width="172" height="18" rx="9" fill="${theme.primary}"/>
  <text x="${x + 86}" y="28.6" text-anchor="middle" font-size="8.8" font-weight="700" fill="${theme.text}" letter-spacing="1.2">DIGISOL EXCELLENCE AWARD</text>`;

  if (award.state !== "valid") {
    return svg(
      frame(
        theme,
        "DigiSol award not current",
        `<g opacity="0.55">${pill}</g>
  <text x="${x}" y="70" font-size="14" fill="${theme.text}" fill-opacity="0.6">Not current</text>`,
        false,
      ),
    );
  }

  await markBadgeSeen(createAdminClient(), award.auditId, request.headers.get("referer"));
  const long = award.companyName.length > 18;
  const name = escapeXml(clip(award.companyName, long ? 26 : 18));
  const date = escapeXml(awardDate(award.auditedAt));
  return svg(
    frame(
      theme,
      `DigiSol Excellence Award: ${award.companyName}, website audit ${award.score}/100`,
      `${pill}
  <text x="${x}" y="60" font-size="${long ? 14 : 17}" font-weight="800" fill="${theme.text}">${name}</text>
  <text x="${x}" y="81" font-size="12" fill="${theme.text}" fill-opacity="0.8">Website audit <tspan font-weight="700" fill="${theme.highlight}" fill-opacity="1">${award.score}/100</tspan></text>
  <text x="${x}" y="101" font-size="9.5" fill="${theme.text}" fill-opacity="0.6">Verified ${date} · wwwdigisol.com</text>`,
      true,
    ),
  );
}
