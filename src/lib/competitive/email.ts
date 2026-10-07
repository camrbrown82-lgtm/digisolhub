import type { SupabaseClient } from "@supabase/supabase-js";
import { siteHost } from "@/lib/awardRegistry";
import { companyBadgesUnlocked } from "@/lib/clientWins";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { competitiveAwards } from "@/lib/competitive/awards";
import {
  competitiveBadgeEmbedHtml,
  competitiveBadgeLinks,
  type PublicCompetitiveBadge,
} from "@/lib/competitive/publicBadge";
import type { SiteSnapshot } from "@/lib/competitive/schema";
import type { StoredCompetitiveReport as Report } from "@/lib/competitive/scoring";
import { sendEmailToContact } from "@/lib/email";
import { escapeHtml as esc } from "@/lib/emailHtml";
import { DIGISOL_FOUNDER, DIGISOL_FOUNDER_TITLE, DIGISOL_PHONE, DIGISOL_SITE_URL } from "@/lib/site";
import { AWARD_MIN_SCORE, awardLinks } from "@/lib/websiteAward";
import { companySiteUrl, ensureDigisolClient } from "@/lib/workspace";
import { prospectHostKey } from "@/lib/prospectAudit/seedCatalog";

const POSITION_COPY: Record<Report["position"], string> = {
  leader: "Market leader",
  contender: "Strong contender",
  challenger: "Challenger",
  behind: "Behind the pack",
};

const VERDICT_COLOR: Record<string, string> = {
  strength: "#047857",
  weakness: "#b91c1c",
  parity: "#475569",
};

const OWNER_COPY: Record<string, string> = { DigiSol: "DigiSol", Kaylev: "DigiSol", Client: "You" };

/** How many actions get their full steps; the rest are listed by title. */
const DETAILED_ACTIONS = 5;

function scoreColor(score: number) {
  if (score >= 75) return "#047857";
  if (score >= 55) return "#b45309";
  return "#b91c1c";
}

const h2 = (text: string) =>
  `<h2 style="margin:28px 0 10px;font-size:18px;line-height:1.3;color:#0f172a">${esc(text)}</h2>`;

const list = (items: string[]) =>
  `<ul style="padding-left:20px;margin:0 0 12px">${items
    .map((item) => `<li style="margin-bottom:6px">${esc(item)}</li>`)
    .join("")}</ul>`;

export type CompetitiveEmailInput = {
  companyName: string;
  recipientName?: string | null;
  note?: string | null;
  report: Report;
  inputs: { industry: string; location: string };
  completedAt: string | null;
  /** Section awards are only included for a company signed up with DigiSol. */
  awardsUnlocked?: boolean;
  /** Analysis id used in the public badge image and embed link. */
  analysisId?: string;
  /** Excellence Award already on file for this website, when she earned that badge too. */
  excellence?: { companyName: string; score: number; badgeUrl: string; addUrl: string } | null;
};

function priceTable(report: Report) {
  const comparison = report.priceComparison;
  if (!comparison?.rows.length) return "";
  const cards = comparison.rows
    .map(
      (row) => `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:0 0 8px">
  <p style="margin:0 0 4px;font-weight:700;color:#0f172a">${esc(row.company)}${row.role === "you" ? " (you)" : ""}</p>
  <p style="margin:0;color:#0f172a"><strong>${esc(row.price)}</strong> · ${esc(row.offer)}</p>
  <p style="margin:4px 0 0;font-size:13px;color:#475569">${esc(row.note || "—")}</p>
</div>`,
    )
    .join("");
  return `${h2("Price comparison")}
<p>${esc(comparison.summary)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b">Only prices printed on each public website. Nothing here is estimated.</p>
${cards}`;
}

const emailButton = (href: string, label: string, primary: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;margin:4px;padding:12px 18px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;${
    primary ? "background:#4f46e5;color:#ffffff;" : "background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;"
  }">${esc(label)}</a>`;

function awardBadgeCards(companyName: string, report: Report, analysisId: string | undefined) {
  const earned = competitiveAwards(report).filter((award) => award.earned && award.score != null);
  if (!earned.length || !analysisId) return "";
  const cards = earned
    .map((award) => {
      const facts: PublicCompetitiveBadge = {
        analysisId,
        key: award.key,
        title: award.title,
        covers: award.covers,
        detail: award.detail,
        companyName,
        score: Math.round(award.score ?? 0),
        earnedAt: new Date().toISOString(),
      };
      const links = competitiveBadgeLinks(DIGISOL_SITE_URL, analysisId, award.key);
      const embed = competitiveBadgeEmbedHtml(DIGISOL_SITE_URL, facts);
      return `<div style="margin:0 0 22px">
<p style="margin:0 0 6px;font-weight:700;color:#0f172a">${esc(award.title)}</p>
<p style="text-align:center;margin:12px 0">
  <a href="${esc(links.add)}"><img src="${esc(links.badgePng)}" width="320" height="120" alt="DigiSol award: ${esc(companyName)}, ${esc(award.title)}, ${facts.score}/100" style="border:0;max-width:100%;height:auto"></a>
</p>
<p style="text-align:center;margin:0 0 10px">${emailButton(links.add, "Add this badge to my site", true)} ${emailButton(links.download, "Download the badge", false)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#475569">Paste this on your website. The image stays on DigiSol, and clicking it opens a page anyone can check.</p>
<pre style="white-space:pre-wrap;word-break:break-all;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#0f172a">${esc(embed)}</pre>
</div>`;
    })
    .join("");
  return `${h2("Award badges you earned")}
<p style="margin:0 0 14px">Each badge below is an image you can download and a link you can put on your website.</p>
${cards}`;
}

function excellenceBadgeBlock(award: CompetitiveEmailInput["excellence"]) {
  if (!award) return "";
  return `<p style="margin:0 0 8px">Your website also earned the <strong>DigiSol Excellence Award</strong> (${award.score}/100). The badge is below, ready to add to the site.</p>
<p style="text-align:center;margin:16px 0">
  <a href="${esc(award.addUrl)}"><img src="${esc(award.badgeUrl)}" width="320" height="120" alt="DigiSol Excellence Award: ${esc(award.companyName)}, ${award.score}/100" style="border:0;max-width:100%;height:auto"></a>
</p>
<p style="text-align:center;margin:0 0 8px"><a href="${esc(award.addUrl)}" style="display:inline-block;padding:12px 22px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;background:#4f46e5;color:#ffffff">Add my badge</a></p>`;
}

/** The competitive analysis as an email from DigiSol to the company it analysed. */
export function competitiveReportEmail(input: CompetitiveEmailInput) {
  const { report } = input;
  const company = esc(input.companyName);
  const score = Math.round(report.overallScore);
  const first = input.recipientName?.trim().split(/\s+/)[0];
  const hello = first ? `Hi ${esc(first)},` : "Hi there,";
  const date = input.completedAt
    ? new Date(input.completedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const actions = [...report.actionPlan].sort((a, b) => a.priority - b.priority);
  const note = input.note?.trim();

  const subject = `${input.companyName}: your competitive analysis (${score}/100)`;

  const scorecard = report.dimensions
    .map(
      (d) => `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:0 0 8px">
  <p style="margin:0 0 4px;font-weight:700;color:#0f172a">${esc(d.label)}</p>
  <p style="margin:0;font-size:14px">You <strong style="color:${scoreColor(d.companyScore)}">${Math.round(d.companyScore)}</strong>
  · Competitors ${Math.round(d.competitorAverage)}
  · <span style="color:${VERDICT_COLOR[d.verdict] ?? "#475569"}">${esc(d.verdict)}</span></p>
  ${d.evidence ? `<p style="margin:6px 0 0;font-size:13px;color:#475569">${esc(d.evidence)}</p>` : ""}
</div>`,
    )
    .join("");

  const swotBlock = (label: string, items: Array<{ title: string; detail: string }>, color: string) =>
    items.length
      ? `<p style="margin:14px 0 6px;font-weight:700;color:${color}">${esc(label)}</p>
<ul style="padding-left:20px;margin:0 0 8px">${items
          .slice(0, 3)
          .map((i) => `<li style="margin-bottom:6px"><strong>${esc(i.title)}.</strong> ${esc(i.detail)}</li>`)
          .join("")}</ul>`
      : "";

  const detailed = actions
    .slice(0, DETAILED_ACTIONS)
    .map(
      (a) => `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:0 0 12px">
  <p style="margin:0 0 4px;font-weight:700;color:#0f172a">${a.priority}. ${esc(a.title)}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#64748b">Impact ${esc(a.impact)} · effort ${esc(a.effort)} · ${esc(a.timeframe)} · owner: ${esc(OWNER_COPY[a.owner] ?? a.owner)}</p>
  <p style="margin:0 0 8px">${esc(a.why)}</p>
  <ol style="padding-left:20px;margin:0 0 8px">${a.steps.map((s) => `<li style="margin-bottom:4px">${esc(s)}</li>`).join("")}</ol>
  <p style="margin:0;font-size:13px;color:#047857"><strong>Measure it:</strong> ${esc(a.kpi)}</p>
</div>`,
    )
    .join("");
  const rest = actions.slice(DETAILED_ACTIONS);

  const competitors = report.competitors
    .map(
      (c) =>
        `<li style="margin-bottom:10px"><strong>${esc(c.name)}</strong> <span style="color:#64748b">(threat ${esc(
          c.threatLevel,
        )})</span><br>${esc(c.overview)}<br><span style="color:#0369a1">Learn from them: ${esc(c.whatToLearn)}</span></li>`,
    )
    .join("");

  const keywords = report.keywordOpportunities
    .slice(0, 8)
    .map(
      (k) =>
        `<li style="margin-bottom:6px"><strong>${esc(k.keyword)}</strong> <span style="color:#64748b">(${esc(
          k.whoRanks,
        )})</span>: ${esc(k.recommendation)}</li>`,
    )
    .join("");

  const html = `
<div style="display:none;max-height:0;overflow:hidden">${company} scored ${score}/100 against local competitors.${
    input.awardsUnlocked && competitiveAwards(report).some((award) => award.earned)
      ? " The award badges you earned are in this email."
      : " Here's where you stand and what to do first."
  }</div>
<p>${hello}</p>
${note ? `<p style="white-space:pre-line">${esc(note)}</p>` : ""}
<p>Here are the results of the competitive analysis we ran for <strong>${company}</strong>${
    input.inputs.industry ? ` (${esc(input.inputs.industry)}${input.inputs.location ? `, ${esc(input.inputs.location)}` : ""})` : ""
  }${date ? ` on ${esc(date)}` : ""}. It compares your website and online presence with ${report.competitors.length} local competitor${
    report.competitors.length === 1 ? "" : "s"
  }.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border:1px solid #c7d2fe;border-radius:14px;background:#eef2ff">
<tr><td style="padding:18px 20px;text-align:center">
  <div style="font-size:44px;font-weight:800;line-height:1;color:${scoreColor(score)}">${score}<span style="font-size:18px;color:#64748b">/100</span></div>
  <div style="margin-top:6px;font-size:14px;font-weight:600;color:#3730a3">${esc(POSITION_COPY[report.position])}${
    report.changes
      ? ` · ${report.changes.overallDelta > 0 ? "+" : ""}${report.changes.overallDelta} since last analysis`
      : ""
  }</div>
</td></tr>
</table>
<p>${esc(report.executiveSummary)}</p>
${excellenceBadgeBlock(input.excellence)}
${
  input.awardsUnlocked
    ? `${awardBadgeCards(input.companyName, report, input.analysisId)}
${h2("Awards")}
<p style="margin:0 0 8px;font-size:13px;color:#475569">These awards are unlocked because you are signed up with DigiSol. Speed, security and SEO, social and content, and Google Business Profile are earned at 90. Industry leader is the highest overall score in this analysis. The Excellence Award is separate and comes only from a free website audit.</p>
<ul style="padding-left:20px;margin:0 0 12px">${competitiveAwards(report)
  .map(
    (award) =>
      `<li style="margin-bottom:6px"><strong>${esc(award.title)}</strong> — ${
        award.earned ? "Earned" : "Not yet"
      }. ${esc(award.detail)}</li>`,
  )
  .join("")}</ul>`
    : ""
}
${h2("Scorecard")}
${scorecard}
${priceTable(report)}
${report.quickWins.length ? `${h2("Quick wins (each takes less than a day)")}${list(report.quickWins)}` : ""}
${h2("Where you stand")}
${swotBlock("Strengths", report.swot.strengths, "#047857")}
${swotBlock("Weaknesses", report.swot.weaknesses, "#b91c1c")}
${swotBlock("Opportunities", report.swot.opportunities, "#0369a1")}
${swotBlock("Threats", report.swot.threats, "#b45309")}
${actions.length ? `${h2("Action plan")}${detailed}` : ""}
${
  rest.length
    ? `<p style="margin:12px 0 6px;font-weight:700">Next up</p><ol start="${DETAILED_ACTIONS + 1}" style="padding-left:20px;margin:0 0 12px">${rest
        .map((a) => `<li style="margin-bottom:4px">${esc(a.title)} <span style="color:#64748b">(${esc(a.timeframe)})</span></li>`)
        .join("")}</ol>`
    : ""
}
${competitors ? `${h2("Your competitors")}<ul style="padding-left:20px;margin:0 0 12px">${competitors}</ul>` : ""}
${keywords ? `${h2("Searches worth targeting")}<ul style="padding-left:20px;margin:0 0 12px">${keywords}</ul>` : ""}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
<p>Want to go through it together, or have us start on the action plan? Just reply to this email.</p>
<p>${esc(DIGISOL_FOUNDER)}<br>${esc(DIGISOL_FOUNDER_TITLE)}, DigiSol · ${esc(DIGISOL_PHONE)}</p>`;

  return { subject, html };
}

/** Emails a completed competitive analysis to someone at the company, from DigiSol. */
export async function sendCompetitiveReport(
  db: SupabaseClient,
  input: { analysisId: string; clientId: string; email: string; name?: string | null; note?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Add a valid email address.");

  const { data: row } = await db
    .from("competitive_analyses")
    .select("id, status, inputs, result, sources, completed_at, client_id")
    .eq("id", input.analysisId)
    .eq("client_id", input.clientId)
    .maybeSingle();
  if (!row?.result) throw new Error("That analysis isn't finished yet.");

  const houseId = await ensureDigisolClient(db);
  if (!houseId) throw new Error("DigiSol's workspace is missing.");
  const { data: client } = await db
    .from("clients")
    .select("name, domain")
    .eq("id", input.clientId)
    .maybeSingle();
  const inputs = (row.inputs ?? {}) as {
    industry?: string;
    location?: string;
    companyName?: string;
    url?: string;
  };
  const companyName =
    inputs.companyName ||
    ((row.sources ?? {}) as { company?: SiteSnapshot }).company?.name ||
    (client?.name as string | undefined) ||
    "your company";

  const name = input.name?.trim() || null;
  const { data: found } = await db
    .from("contacts")
    .select("id, email, name, company, unsubscribed_at")
    .eq("client_id", houseId)
    .ilike("email", email)
    .limit(1);
  let contact = found?.[0] ?? null;
  if (!contact) {
    const { data: created, error } = await db
      .from("contacts")
      .insert({
        email,
        name,
        company: (client?.name as string | undefined) ?? companyName,
        source: "competitive_report",
        client_id: houseId,
      })
      .select("id, email, name, company, unsubscribed_at")
      .single();
    if (error || !created) throw new Error(error?.message || "Could not save the recipient.");
    contact = created;
  } else if (name && !contact.name) {
    await db.from("contacts").update({ name }).eq("id", contact.id);
    contact = { ...contact, name };
  }
  if (contact.unsubscribed_at) throw new Error(`${email} has unsubscribed from DigiSol emails.`);

  const sources = (row.sources ?? {}) as { company?: SiteSnapshot };
  const analyzedUrl = inputs.url || sources.company?.url || "";
  const ownSite = (() => {
    const site = companySiteUrl(client);
    if (!site || !analyzedUrl) return false;
    return prospectHostKey(site) === prospectHostKey(analyzedUrl.includes("://") ? analyzedUrl : `https://${analyzedUrl}`);
  })();
  const awardsUnlocked = await companyBadgesUnlocked(db, ownSite ? [client?.name, companyName] : [companyName]);
  const host = siteHost(analyzedUrl);
  let excellence: CompetitiveEmailInput["excellence"] = null;
  if (host) {
    const { data: awardRow, error: awardError } = await db
      .from("website_awards")
      .select("id, company_name, audit_score")
      .eq("site_host", host)
      .gte("audit_score", AWARD_MIN_SCORE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (awardError) console.warn("[competitive-email] award lookup", awardError.message);
    if (awardRow?.id) {
      const links = awardLinks(DIGISOL_SITE_URL, String(awardRow.id));
      excellence = {
        companyName: String(awardRow.company_name || companyName),
        score: Number(awardRow.audit_score) || 0,
        badgeUrl: links.badgePng,
        addUrl: links.add,
      };
    }
  }
  const { subject, html } = competitiveReportEmail({
    companyName,
    recipientName: name || contact.name,
    note: input.note,
    report: row.result as Report,
    inputs: { industry: inputs.industry || "", location: inputs.location || "" },
    completedAt: row.completed_at as string | null,
    awardsUnlocked,
    excellence,
    analysisId: String(row.id),
  });

  await sendEmailToContact({
    contactId: contact.id,
    contact,
    subject,
    html,
    db,
    clientId: houseId,
    companyName: DIGISOL_HOUSE_NAME,
    brand: DIGISOL_BRAND,
  });

  const emailedAt = new Date().toISOString();
  const { error: markError } = await db
    .from("competitive_analyses")
    .update({ emailed_to: email, emailed_at: emailedAt })
    .eq("id", row.id);
  if (markError) console.warn("[competitive-email] not recorded", markError.message);

  return { email, emailedAt };
}
