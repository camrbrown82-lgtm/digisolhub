import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { awardDate, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";

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
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const award = hasAdminClient() ? await loadAward(createAdminClient(), params.id) : { state: "missing" as const };
  const font = "font-family=\"Inter,Segoe UI,Helvetica,Arial,sans-serif\"";

  if (award.state !== "valid") {
    return svg(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="DigiSol award not current">
  <rect x="1" y="1" width="318" height="118" rx="14" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  <text x="160" y="52" text-anchor="middle" ${font} font-size="13" font-weight="700" fill="#94a3b8" letter-spacing="1.5">DIGISOL EXCELLENCE AWARD</text>
  <text x="160" y="78" text-anchor="middle" ${font} font-size="13" fill="#64748b">Not current</text>
</svg>`);
  }

  const name = escapeXml(clip(award.companyName, 30));
  const date = escapeXml(awardDate(award.auditedAt));
  const label = escapeXml(`DigiSol Excellence Award: ${award.companyName}, website audit ${award.score}/100`);
  return svg(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="318" height="118" rx="14" fill="url(#bg)" stroke="#fbbf24" stroke-width="2"/>
  <circle cx="300" cy="10" r="46" fill="#fbbf24" fill-opacity="0.12"/>
  <rect x="84" y="14" width="152" height="20" rx="10" fill="#fbbf24"/>
  <text x="160" y="28" text-anchor="middle" ${font} font-size="9.5" font-weight="700" fill="#020617" letter-spacing="1.4">DIGISOL EXCELLENCE AWARD</text>
  <text x="160" y="62" text-anchor="middle" ${font} font-size="18" font-weight="800" fill="#ffffff">${name}</text>
  <text x="160" y="84" text-anchor="middle" ${font} font-size="12" fill="#cbd5e1">Website audit <tspan font-weight="700" fill="#fbbf24">${award.score}/100</tspan></text>
  <text x="160" y="104" text-anchor="middle" ${font} font-size="10" fill="#94a3b8">Verified ${date} · wwwdigisol.com</text>
</svg>`);
}
