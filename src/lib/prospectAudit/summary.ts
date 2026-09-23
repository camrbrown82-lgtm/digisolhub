import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { WebsiteAuditResult } from "@/lib/agent/websiteAudit";
import { getOpenAIApiKey } from "@/lib/openai";
import {
  PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
  PROSPECT_AUDIT_MAX_PAGE_CHARS,
  PROSPECT_AUDIT_MODEL,
} from "@/lib/prospectAudit/limits";
import { htmlToPlainExcerpt } from "@/lib/prospectAudit/casl";

export type ProspectAuditSummary = {
  subject: string;
  summary: string;
  weaknesses: string[];
  opener: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

/**
 * Cost-optimized audit copy — gpt-4o-mini only, hard maxOutputTokens.
 */
export async function draftProspectAuditSummary(input: {
  businessName?: string | null;
  trade: string;
  url: string;
  html?: string;
  audit: WebsiteAuditResult;
}): Promise<ProspectAuditSummary> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = createOpenAI({ apiKey });
  const pageText = htmlToPlainExcerpt(
    input.html || "",
    PROSPECT_AUDIT_MAX_PAGE_CHARS,
  );
  const issues = input.audit.issues
    .slice(0, 8)
    .map((issue) => `${issue.severity}: ${issue.code} — ${issue.message}`)
    .join("\n");

  const result = await generateText({
    model: openai(PROSPECT_AUDIT_MODEL),
    maxOutputTokens: PROSPECT_AUDIT_MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    prompt: `You write short DigiSol local website audit notes for Alberta ${input.trade} businesses.
Never invent prices, rankings, or legal claims. Be specific and useful.

Business: ${input.businessName || "Local business"}
URL: ${input.url}
Audit score: ${input.audit.score}/100
SEO title: ${input.audit.seo.title || "(missing)"}
Meta: ${input.audit.seo.metaDescription || "(missing)"}
TTFB ms: ${input.audit.metrics.ttfbMs ?? "n/a"}
Issues:
${issues || "(none flagged)"}

Page text excerpt:
${pageText || "(unavailable)"}

Return plain text in exactly this shape:
SUBJECT: <email subject under 70 chars>
OPENER: <1 short greeting sentence>
SUMMARY: <2-3 short sentences for the email body>
WEAKNESSES:
- <weakness 1>
- <weakness 2>
- <weakness 3>`,
  });

  const parsed = parseSummaryText(result.text);
  const usage = result.usage;
  const promptTokens = usage?.inputTokens ?? 0;
  const completionTokens = usage?.outputTokens ?? 0;

  return {
    ...parsed,
    model: PROSPECT_AUDIT_MODEL,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

function parseSummaryText(raw: string) {
  const text = raw.trim();
  const subject =
    text.match(/^SUBJECT:\s*(.+)$/im)?.[1]?.trim() ||
    "A quick look at your website";
  const opener =
    text.match(/^OPENER:\s*(.+)$/im)?.[1]?.trim() ||
    "Hey — I took a quick look at your site.";
  const summary =
    text.match(/^SUMMARY:\s*([\s\S]*?)(?=^WEAKNESSES:|$)/im)?.[1]?.trim() ||
    text.slice(0, 400);
  const weaknessBlock =
    text.match(/^WEAKNESSES:\s*([\s\S]*)$/im)?.[1]?.trim() || "";
  const weaknesses = weaknessBlock
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    subject: subject.slice(0, 90),
    opener,
    summary,
    weaknesses:
      weaknesses.length > 0
        ? weaknesses
        : ["Clarify the primary CTA", "Tighten page speed / SEO basics"],
  };
}
