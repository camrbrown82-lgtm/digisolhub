import { createHmac } from "crypto";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { getOutboundSiteUrl } from "@/lib/supabase/env";

function secret() {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-unsubscribe-secret"
  );
}

export function unsubscribeToken(email: string) {
  return createHmac("sha256", secret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string) {
  const expected = unsubscribeToken(email);
  return expected.length === token.length && expected === token;
}

export function unsubscribeUrl(email: string) {
  const token = unsubscribeToken(email);
  return `${getOutboundSiteUrl()}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

/** List-Unsubscribe header target — accepts the inbox's one-click POST. */
export function oneClickUnsubscribeUrl(email: string) {
  const token = unsubscribeToken(email);
  return `${getOutboundSiteUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** The footer names the sending company only; HUB_PHYSICAL_ADDRESS is DigiSol's own address. */
export function campaignFooterHtml(email: string, companyName: string) {
  const isHouse = !companyName || companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const name = escapeHtml(isHouse ? DIGISOL_HOUSE_NAME : companyName);
  const address = isHouse ? process.env.HUB_PHYSICAL_ADDRESS ?? "Alberta, Canada" : "";
  const url = unsubscribeUrl(email);
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;border-top:1px solid #e4e4e7;padding-top:16px;">
  <tr>
    <td style="font-family:Inter,Arial,sans-serif;font-size:12px;line-height:18px;color:#71717a;">
      <p style="margin:0 0 8px;">${name}${address ? ` · ${escapeHtml(address)}` : ""}</p>
      <p style="margin:0;">
        ${
          isHouse
            ? "You received this because you requested a consultation or subscribed to DigiSol updates."
            : `You received this because you're a customer or subscriber of ${name}.`
        }
        <a href="${url}" style="color:#4f46e5;">Unsubscribe</a>
      </p>
    </td>
  </tr>
</table>`;
}

export function wrapCampaignHtml(html: string, email: string, companyName: string) {
  if (html.includes("{{unsubscribe_url}}")) {
    return html.replaceAll("{{unsubscribe_url}}", unsubscribeUrl(email));
  }
  return `${html}${campaignFooterHtml(email, companyName)}`;
}
