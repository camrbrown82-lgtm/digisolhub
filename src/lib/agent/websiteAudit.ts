export type WebsiteAuditIssue = {
  severity: "critical" | "warn" | "info";
  code: string;
  message: string;
};

export type WebsiteAuditReportItem = {
  kind: "strength" | "weakness";
  area: "seo" | "performance" | "structure" | "trust";
  title: string;
  detail: string;
};

export type WebsiteAuditReport = {
  summary: string;
  scoreLabel: string;
  strengths: WebsiteAuditReportItem[];
  weaknesses: WebsiteAuditReportItem[];
};

export type WebsiteAuditResult = {
  ok: boolean;
  url: string;
  finalUrl: string;
  status: number | null;
  timedOut: boolean;
  metrics: {
    ttfbMs: number | null;
    totalMs: number | null;
    htmlBytes: number;
    https: boolean;
    redirected: boolean;
  };
  seo: {
    title: string | null;
    titleLength: number;
    metaDescription: string | null;
    metaDescriptionLength: number;
    h1Count: number;
    h1Text: string | null;
    canonical: string | null;
    robots: string | null;
    viewport: string | null;
    lang: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    hasJsonLd: boolean;
  };
  score: number;
  issues: WebsiteAuditIssue[];
  /** Operator-facing strengths / weaknesses for Analytics. */
  report: WebsiteAuditReport;
  error?: string;
};

export function formatWebsiteAuditReport(
  audit: Omit<WebsiteAuditResult, "report">,
): WebsiteAuditReport {
  const strengths: WebsiteAuditReportItem[] = [];
  const weaknesses: WebsiteAuditReportItem[] = [];
  const issueCodes = new Set(audit.issues.map((i) => i.code));

  if (audit.metrics.https) {
    strengths.push({
      kind: "strength",
      area: "trust",
      title: "HTTPS enabled",
      detail: "Final URL serves over HTTPS.",
    });
  }
  if (audit.seo.title && !issueCodes.has("title_length") && !issueCodes.has("missing_title")) {
    strengths.push({
      kind: "strength",
      area: "seo",
      title: "Solid page title",
      detail: `"${audit.seo.title}" (${audit.seo.titleLength} chars).`,
    });
  }
  if (
    audit.seo.metaDescription &&
    !issueCodes.has("meta_description_length") &&
    !issueCodes.has("missing_meta_description")
  ) {
    strengths.push({
      kind: "strength",
      area: "seo",
      title: "Meta description present",
      detail: `${audit.seo.metaDescriptionLength} characters — usable in SERPs.`,
    });
  }
  if (audit.seo.h1Count === 1) {
    strengths.push({
      kind: "strength",
      area: "structure",
      title: "Single clear H1",
      detail: audit.seo.h1Text || "One primary heading detected.",
    });
  }
  if (audit.seo.viewport) {
    strengths.push({
      kind: "strength",
      area: "structure",
      title: "Mobile viewport set",
      detail: "Viewport meta tag is present.",
    });
  }
  if (audit.seo.hasJsonLd) {
    strengths.push({
      kind: "strength",
      area: "seo",
      title: "Structured data detected",
      detail: "JSON-LD present for richer search results.",
    });
  }
  if (audit.metrics.ttfbMs != null && audit.metrics.ttfbMs <= 1200) {
    strengths.push({
      kind: "strength",
      area: "performance",
      title: "Snappy TTFB",
      detail: `Time to first byte ~${audit.metrics.ttfbMs}ms.`,
    });
  }

  for (const issue of audit.issues) {
    const area: WebsiteAuditReportItem["area"] =
      issue.code.includes("ttfb") || issue.code.includes("timeout")
        ? "performance"
        : issue.code.includes("https") || issue.code.includes("http_status")
          ? "trust"
          : issue.code.includes("h1") || issue.code.includes("viewport")
            ? "structure"
            : "seo";
    weaknesses.push({
      kind: "weakness",
      area,
      title: issue.message.split("—")[0]?.trim() || issue.code,
      detail: issue.message,
    });
  }

  const scoreLabel =
    audit.score >= 85
      ? "Strong"
      : audit.score >= 65
        ? "Needs polish"
        : audit.score >= 40
          ? "Weak"
          : "Critical";

  const summary = audit.error
    ? `Audit failed: ${audit.error}`
    : `Score ${audit.score}/100 (${scoreLabel}). ${strengths.length} strength${
        strengths.length === 1 ? "" : "s"
      }, ${weaknesses.length} weakness${weaknesses.length === 1 ? "" : "es"} on ${audit.finalUrl}.`;

  return {
    summary,
    scoreLabel,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 12),
  };
}


function pickAttr(html: string, tagPattern: RegExp, attr: string) {
  const match = html.match(tagPattern);
  if (!match?.[0]) return null;
  const attrMatch = match[0].match(
    new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i"),
  );
  return attrMatch?.[1]?.trim() || null;
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function analyzeHtml(html: string, finalUrl: string): Pick<WebsiteAuditResult, "seo" | "issues"> {
  const issues: WebsiteAuditIssue[] = [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : null;
  const metaDescription =
    pickAttr(html, /<meta[^>]+name=["']description["'][^>]*>/i, "content") ||
    pickAttr(html, /<meta[^>]+content=["'][^"']*["'][^>]*name=["']description["'][^>]*>/i, "content");
  const h1Matches = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));
  const h1Text = h1Matches[0] ? stripTags(h1Matches[0][1]) : null;
  const canonical = pickAttr(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, "href");
  const robots =
    pickAttr(html, /<meta[^>]+name=["']robots["'][^>]*>/i, "content") ||
    pickAttr(html, /<meta[^>]+content=["'][^"']*["'][^>]*name=["']robots["'][^>]*>/i, "content");
  const viewport =
    pickAttr(html, /<meta[^>]+name=["']viewport["'][^>]*>/i, "content") ||
    pickAttr(html, /<meta[^>]+content=["'][^"']*["'][^>]*name=["']viewport["'][^>]*>/i, "content");
  const langMatch = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  const ogTitle = pickAttr(html, /<meta[^>]+property=["']og:title["'][^>]*>/i, "content");
  const ogDescription = pickAttr(
    html,
    /<meta[^>]+property=["']og:description["'][^>]*>/i,
    "content",
  );
  const hasJsonLd = /application\/ld\+json/i.test(html);

  if (!title) {
    issues.push({
      severity: "critical",
      code: "missing_title",
      message: "Missing <title> — search engines and shares will look unfinished.",
    });
  } else if (title.length < 15 || title.length > 65) {
    issues.push({
      severity: "warn",
      code: "title_length",
      message: `Title is ${title.length} chars (aim ~30–60).`,
    });
  }

  if (!metaDescription) {
    issues.push({
      severity: "critical",
      code: "missing_meta_description",
      message: "Missing meta description — SERP snippets will be guessed.",
    });
  } else if (metaDescription.length < 70 || metaDescription.length > 165) {
    issues.push({
      severity: "warn",
      code: "meta_description_length",
      message: `Meta description is ${metaDescription.length} chars (aim ~120–160).`,
    });
  }

  if (h1Matches.length === 0) {
    issues.push({
      severity: "critical",
      code: "missing_h1",
      message: "No H1 found — page hierarchy is unclear for SEO and scanners.",
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      severity: "warn",
      code: "multiple_h1",
      message: `Found ${h1Matches.length} H1 tags — prefer one clear primary heading.`,
    });
  }

  if (!viewport) {
    issues.push({
      severity: "critical",
      code: "missing_viewport",
      message: "Missing viewport meta — mobile rendering will suffer.",
    });
  }

  if (!canonical) {
    issues.push({
      severity: "info",
      code: "missing_canonical",
      message: "No canonical link — duplicate URL variants may split ranking signals.",
    });
  }

  if (robots && /noindex/i.test(robots)) {
    issues.push({
      severity: "critical",
      code: "noindex",
      message: `robots meta includes noindex (${robots}).`,
    });
  }

  if (!ogTitle || !ogDescription) {
    issues.push({
      severity: "warn",
      code: "weak_open_graph",
      message: "Open Graph title/description incomplete — social shares will look weak.",
    });
  }

  if (!hasJsonLd) {
    issues.push({
      severity: "info",
      code: "missing_json_ld",
      message: "No JSON-LD detected — consider LocalBusiness/Organization schema.",
    });
  }

  if (!finalUrl.startsWith("https://")) {
    issues.push({
      severity: "critical",
      code: "not_https",
      message: "Final URL is not HTTPS.",
    });
  }

  return {
    seo: {
      title,
      titleLength: title?.length ?? 0,
      metaDescription,
      metaDescriptionLength: metaDescription?.length ?? 0,
      h1Count: h1Matches.length,
      h1Text,
      canonical,
      robots,
      viewport,
      lang: langMatch?.[1] || null,
      ogTitle,
      ogDescription,
      hasJsonLd,
    },
    issues,
  };
}

function scoreFromIssues(issues: WebsiteAuditIssue[], ttfbMs: number | null) {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 18;
    else if (issue.severity === "warn") score -= 8;
    else score -= 3;
  }
  if (ttfbMs != null) {
    if (ttfbMs > 2500) {
      score -= 15;
    } else if (ttfbMs > 1200) {
      score -= 8;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function withReport(audit: Omit<WebsiteAuditResult, "report">): WebsiteAuditResult {
  return { ...audit, report: formatWebsiteAuditReport(audit) };
}

/**
 * Lightweight on-demand website SEO/performance snapshot.
 * Fetches HTML once (no third-party PageSpeed dependency) and compiles actionable metrics.
 */
export async function runWebsiteAudit(
  targetUrl: string,
  opts?: { includeHtml?: boolean },
): Promise<WebsiteAuditResult & { html?: string }> {
  let url: URL;
  try {
    url = new URL(targetUrl.trim());
  } catch {
    return withReport({
      ok: false,
      url: targetUrl,
      finalUrl: targetUrl,
      status: null,
      timedOut: false,
      metrics: {
        ttfbMs: null,
        totalMs: null,
        htmlBytes: 0,
        https: false,
        redirected: false,
      },
      seo: {
        title: null,
        titleLength: 0,
        metaDescription: null,
        metaDescriptionLength: 0,
        h1Count: 0,
        h1Text: null,
        canonical: null,
        robots: null,
        viewport: null,
        lang: null,
        ogTitle: null,
        ogDescription: null,
        hasJsonLd: false,
      },
      score: 0,
      issues: [],
      error: "Invalid URL",
    });
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return runWebsiteAudit(`https://${targetUrl.replace(/^\/\//, "")}`, opts);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const started = Date.now();
  let ttfbMs: number | null = null;

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "DigiSolHubBot/1.0 (+https://wwwdigisol.com; website-audit)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    ttfbMs = Date.now() - started;
    const html = (await response.text()).slice(0, 500_000);
    const totalMs = Date.now() - started;
    const finalUrl = response.url || url.toString();
    const { seo, issues } = analyzeHtml(html, finalUrl);

    if (ttfbMs > 2500) {
      issues.push({
        severity: "warn",
        code: "slow_ttfb",
        message: `Time to first byte ~${ttfbMs}ms (aim under ~1200ms for snappy UX).`,
      });
    }

    if (!response.ok) {
      issues.unshift({
        severity: "critical",
        code: "http_status",
        message: `HTTP ${response.status} from ${finalUrl}`,
      });
    }

    const result = withReport({
      ok: response.ok,
      url: url.toString(),
      finalUrl,
      status: response.status,
      timedOut: false,
      metrics: {
        ttfbMs,
        totalMs,
        htmlBytes: Buffer.byteLength(html, "utf8"),
        https: finalUrl.startsWith("https://"),
        redirected: finalUrl.replace(/\/$/, "") !== url.toString().replace(/\/$/, ""),
      },
      seo,
      score: scoreFromIssues(issues, ttfbMs),
      issues,
    });

    return opts?.includeHtml ? { ...result, html } : result;
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return withReport({
      ok: false,
      url: url.toString(),
      finalUrl: url.toString(),
      status: null,
      timedOut,
      metrics: {
        ttfbMs,
        totalMs: Date.now() - started,
        htmlBytes: 0,
        https: url.protocol === "https:",
        redirected: false,
      },
      seo: {
        title: null,
        titleLength: 0,
        metaDescription: null,
        metaDescriptionLength: 0,
        h1Count: 0,
        h1Text: null,
        canonical: null,
        robots: null,
        viewport: null,
        lang: null,
        ogTitle: null,
        ogDescription: null,
        hasJsonLd: false,
      },
      score: 0,
      issues: [
        {
          severity: "critical",
          code: timedOut ? "timeout" : "fetch_failed",
          message: timedOut
            ? "Audit timed out after 12s"
            : err instanceof Error
              ? err.message
              : "Fetch failed",
        },
      ],
      error: timedOut
        ? "Timed out"
        : err instanceof Error
          ? err.message
          : "Fetch failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}
