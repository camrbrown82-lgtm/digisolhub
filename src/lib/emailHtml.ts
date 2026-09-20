function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { escapeHtml };

export function looksLikeHtml(body: string) {
  return /<\/?[a-z][\s\S]*>/i.test(body);
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Compact mark for body {{logo}} merge tags. */
function inlineLogoImg(src: string, companyName: string) {
  const safeSrc = escapeHtml(src);
  const alt = escapeHtml(companyName || "Logo");
  return `<img src="${safeSrc}" alt="${alt}" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;" />`;
}

/** Full-bleed header mark — spans the card edge to edge, no letterbox padding. */
function headerLogoImg(src: string, companyName: string) {
  const safeSrc = escapeHtml(src);
  const alt = escapeHtml(companyName || "Logo");
  return `<img src="${safeSrc}" alt="${alt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;padding:0;line-height:0;" />`;
}

export function emailCtaButton(href: string, label: string, accent = "#4f46e5") {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const color = escapeHtml(accent);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr>
    <td align="center" style="border-radius:999px;background:${color};">
      <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`;
}

export function buildEmailHtml(
  body: string,
  opts: {
    logoSrc: string;
    companyName: string;
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    highlightColor?: string;
    fonts?: string;
  },
) {
  const company = opts.companyName?.trim() || "DigiSol";
  const header = opts.secondaryColor || "#09090b";
  const page = "#f4f4f5";
  const accent = opts.primaryColor || opts.highlightColor || "#4f46e5";
  const fonts = (opts.fonts || "Inter, Arial, Helvetica, sans-serif").replace(
    /[<>"]/g,
    "",
  );
  const tagline = opts.tagline?.trim() || "Engineering & growth";
  const headerLogo = headerLogoImg(opts.logoSrc, company);
  const inlineLogo = inlineLogoImg(opts.logoSrc, company);
  const withToken = body.replaceAll("{{logo}}", inlineLogo);

  if (/data-digisol-email=/i.test(withToken)) {
    return withToken;
  }

  if (/<html/i.test(withToken)) {
    if (!/data-digisol-logo|\/api\/hub\/email-logo/i.test(withToken)) {
      return withToken.replace(
        /<body([^>]*)>/i,
        `<body$1><div data-digisol-logo="1" style="text-align:center;padding:0;background:${header};line-height:0;font-size:0;">${headerLogo}</div>`,
      );
    }
    return withToken;
  }

  const inner = looksLikeHtml(withToken)
    ? withToken
    : escapeHtml(withToken).replaceAll("\n", "<br/>");

  return `<!DOCTYPE html>
<html>
<body data-digisol-email="1" style="margin:0;background:${page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td align="center" data-digisol-logo="1" style="background:${header};padding:0;line-height:0;font-size:0;">
              ${headerLogo}
            </td>
          </tr>
          <tr>
            <td data-digisol-body="1" style="padding:28px 28px 8px;font-family:${fonts};font-size:16px;line-height:1.6;color:#18181b;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;font-family:${fonts};font-size:13px;line-height:1.5;color:${accent};">
              ${escapeHtml(company)}${tagline ? ` · ${escapeHtml(tagline)}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
