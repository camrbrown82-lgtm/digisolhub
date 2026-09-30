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

function greeting(recipientName?: string | null) {
  return recipientName?.trim() ? `Hi ${esc(recipientName.trim().split(/\s+/)[0])},` : "Hi there,";
}

/** Follow-up after they open the add page but the badge isn't live yet. */
export function awardHelpEmailContent(input: {
  companyName: string;
  recipientName?: string | null;
  score: number;
  addBadgeUrl: string;
  winnersUrl: string;
  embedHtml: string;
}) {
  const company = esc(input.companyName);
  const subject = `${input.companyName} is on the DigiSol award winners page`;
  const html = `
<div style="display:none;max-height:0;overflow:hidden">Congratulations again. Here's the badge code if you'd like a hand adding it.</div>
<p>${greeting(input.recipientName)}</p>
<p>Congratulations again on the <strong>DigiSol Excellence Award</strong>. ${company} is now featured on our <a href="${esc(input.winnersUrl)}">award winners page</a> with its ${input.score}/100 score.</p>
<p><strong>Want a hand adding the badge to your site?</strong> It takes about two minutes:</p>
<ul style="padding-left:20px;margin:0 0 16px">
  <li style="margin-bottom:6px">Reply with who manages your website and I'll send them the code, or</li>
  <li style="margin-bottom:6px">Paste this code anywhere on your site. The footer works well:</li>
</ul>
<pre style="white-space:pre-wrap;word-break:break-all;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#0f172a">${esc(input.embedHtml)}</pre>
<p style="text-align:center;margin:28px 0">${button(input.addBadgeUrl, "Get my badge code", true)}</p>
<p>Once it's up, the badge links to your live verification page, so visitors can check the score for themselves.</p>
<p>Cameron Brown<br>DigiSol</p>`;
  return { subject, html };
}

/** Thank-you once the badge shows up on their website. */
export function awardLiveEmailContent(input: {
  companyName: string;
  recipientName?: string | null;
  score: number;
  host: string;
  verifyUrl: string;
  winnersUrl: string;
}) {
  const company = esc(input.companyName);
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(input.verifyUrl)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(input.verifyUrl)}`;
  const subject = `Your DigiSol Excellence Award badge is live on ${input.host}`;
  const html = `
<div style="display:none;max-height:0;overflow:hidden">Thanks for adding your badge. Here's how to share it with your customers.</div>
<p>${greeting(input.recipientName)}</p>
<p>Your <strong>DigiSol Excellence Award</strong> badge is now live on <strong>${esc(input.host)}</strong>. Thanks for showing it off. Visitors can click it to see ${company}'s verified ${input.score}/100 score.</p>
<p>You're also featured on our <a href="${esc(input.winnersUrl)}">award winners page</a>.</p>
<p><strong>Tell your customers.</strong> A quick post lets them know your website passed an outside check for speed, security and SEO:</p>
<p style="margin:20px 0">${button(facebook, "Share on Facebook", true)}&nbsp; ${button(linkedin, "Share on LinkedIn", false)}</p>
<p>Congratulations again,<br>Cameron Brown<br>DigiSol</p>`;
  return { subject, html };
}
