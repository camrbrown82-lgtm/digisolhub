import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import type { SiteSnapshot } from "@/lib/competitive/schema";
import type { StoredCompetitiveReport as Report } from "@/lib/competitive/scoring";
import { sendEmailToContact } from "@/lib/email";
import { escapeHtml as esc } from "@/lib/emailHtml";
import { DIGISOL_FOUNDER, DIGISOL_FOUNDER_TITLE, DIGISOL_PHONE } from "@/lib/site";
import { ensureDigisolClient } from "@/lib/workspace";

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
};

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

  const scorecard = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px">
<tr style="color:#64748b;text-align:left">
  <th style="padding:6px 8px 6px 0;font-weight:600">Area</th>
  <th style="padding:6px 8px;font-weight:600;text-align:right">You</th>
  <th style="padding:6px 8px;font-weight:600;text-align:right">Competitors</th>
  <th style="padding:6px 0 6px 8px;font-weight:600;text-align:right">Verdict</th>
</tr>
${report.dimensions
  .map(
    (d) => `<tr style="border-top:1px solid #e2e8f0">
  <td style="padding:8px 8px 8px 0;color:#0f172a">${esc(d.label)}</td>
  <td style="padding:8px;text-align:right;font-weight:700;color:${scoreColor(d.companyScore)}">${Math.round(d.companyScore)}</td>
  <td style="padding:8px;text-align:right;color:#475569">${Math.round(d.competitorAverage)}</td>
  <td style="padding:8px 0 8px 8px;text-align:right;color:${VERDICT_COLOR[d.verdict] ?? "#475569"}">${esc(d.verdict)}</td>
</tr>`,
  )
  .join("")}
</table>`;

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
<div style="display:none;max-height:0;overflow:hidden">${company} scored ${score}/100 against local competitors. Here's where you stand and what to do first.</div>
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
${h2("Scorecard")}
${scorecard}
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
  const { data: client } = await db.from("clients").select("name").eq("id", input.clientId).maybeSingle();
  const inputs = (row.inputs ?? {}) as { industry?: string; location?: string; companyName?: string };
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

  const { subject, html } = competitiveReportEmail({
    companyName,
    recipientName: name || contact.name,
    note: input.note,
    report: row.result as Report,
    inputs: { industry: inputs.industry || "", location: inputs.location || "" },
    completedAt: row.completed_at as string | null,
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
