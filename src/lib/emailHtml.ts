export function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function logoImgTag(src: string, companyName: string) {
  const safeSrc = escapeHtml(src);
  const alt = escapeHtml(companyName || "Logo");
  return `<img src="${safeSrc}" alt="${alt}" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0;" />`;
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
    fonts?: string;
  },
) {
  const company = opts.companyName?.trim() || "DigiSol";
  const header = opts.secondaryColor || "#09090b";
  const page = opts.backgroundColor || "#f4f4f5";
  const accent = opts.primaryColor || "#4f46e5";
  const fonts = (opts.fonts || "Inter, Arial, Helvetica, sans-serif").replace(
    /[<>"]/g,
    "",
  );
  const tagline = opts.tagline?.trim() || "Engineering & growth";
  const logo = logoImgTag(opts.logoSrc, company);
  const withToken = body.replaceAll("{{logo}}", logo);

  if (/data-digisol-email=/i.test(withToken)) {
    return withToken;
  }

  if (/<html/i.test(withToken)) {
    if (!/data-digisol-logo|\/api\/hub\/email-logo/i.test(withToken)) {
      return withToken.replace(
        /<body([^>]*)>/i,
        `<body$1><div data-digisol-logo="1" style="text-align:center;padding:20px 16px;background:${header};">${logo}</div>`,
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
            <td align="center" data-digisol-logo="1" style="background:${header};padding:28px 24px;">
              ${logo}
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
