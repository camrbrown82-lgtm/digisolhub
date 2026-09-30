import { DIGISOL_BRAND } from "@/lib/branding";
import { DIGISOL_GOOGLE_REVIEW_URL } from "@/lib/site";
import { AWARD_MIN_SCORE } from "@/lib/websiteAward";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const button = (href: string, label: string, primary: boolean) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;${
    primary
      ? `background:${DIGISOL_BRAND.primaryColor};color:#ffffff;`
      : "background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;"
  }">${esc(label)}</a>`;

/** Email telling a company its website earned the award, asking it to add the badge (and, separately, for a review). */
export function awardEmailContent(input: {
  companyName: string;
  recipientName?: string | null;
  score: number;
  date: string;
  addBadgeUrl: string;
  badgeUrl: string;
  embedHtml: string;
}) {
  const company = esc(input.companyName);
  const hello = input.recipientName?.trim() ? `Hi ${esc(input.recipientName.trim().split(/\s+/)[0])},` : "Hi there,";
  const subject = `${input.companyName}, your website earned the DigiSol Excellence Award (${input.score}/100)`;

  const html = `
<div style="display:none;max-height:0;overflow:hidden">Your site scored ${input.score}/100. Your badge is ready to add. It takes about two minutes.</div>
<p>${hello}</p>
<p><strong>${company}'s website scored ${input.score}/100</strong> on our website audit on ${esc(input.date)}. Only sites that score ${AWARD_MIN_SCORE} or higher earn the <strong>DigiSol Excellence Award</strong>, and yours made it.</p>
<p style="text-align:center;margin:28px 0">
  <a href="${esc(input.addBadgeUrl)}"><img src="${esc(input.badgeUrl)}" width="320" height="120" alt="DigiSol Excellence Award: ${company}, ${input.score}/100" style="border:0;max-width:100%"></a>
</p>
<p><strong>Why put it on your site?</strong></p>
<ul style="padding-left:20px;margin:0 0 16px">
  <li style="margin-bottom:6px">Visitors see at a glance that your site passed an outside check for speed, security and SEO.</li>
  <li style="margin-bottom:6px">It adds trust right where people decide whether to contact you or buy.</li>
  <li style="margin-bottom:6px">It stays honest. The badge links to a live verification page with your score and date.</li>
</ul>
<p style="text-align:center;margin:28px 0">${button(input.addBadgeUrl, "Add my badge (2 minutes)", true)}</p>
<p style="font-size:13px;color:#475569">Someone else runs your website? Forward them this code. It goes anywhere on the site, and the footer works well:</p>
<pre style="white-space:pre-wrap;word-break:break-all;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#0f172a">${esc(input.embedHtml)}</pre>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
<p><strong>One small favour?</strong> If the audit was useful, a quick Google review helps other local businesses find us. It takes about 30 seconds. The award is yours either way.</p>
<p style="margin:20px 0">${button(DIGISOL_GOOGLE_REVIEW_URL, "Leave a quick review", false)}</p>
<p>Congratulations again,<br>Cameron Brown<br>DigiSol</p>`;

  return { subject, html };
}
