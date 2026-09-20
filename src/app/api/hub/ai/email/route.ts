import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt } from "@/lib/branding";
import { TEMPLATE_VARIABLES } from "@/lib/emailTemplates";
import {
  BRAND_COPY_TEMPERATURE,
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import { getWorkspaceClient } from "@/lib/workspace";

type Mode = "generate" | "flare";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it in Vercel Production and .env.local, then redeploy.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    prompt?: string;
    mode?: Mode;
    companyName?: string;
    templateName?: string;
    subject?: string;
    emailBody?: string;
  };

  const prompt = body.prompt?.trim();
  const mode: Mode = body.mode === "flare" ? "flare" : "generate";
  if (mode === "generate" && !prompt) {
    return NextResponse.json(
      { error: "Tell the AI what this email should cover" },
      { status: 400 },
    );
  }
  if (mode === "flare" && !body.subject?.trim() && !body.emailBody?.trim() && !prompt) {
    return NextResponse.json(
      { error: "Add a subject or body to rewrite, or describe the email" },
      { status: 400 },
    );
  }

  const active = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(active);
  const company = body.companyName?.trim() || companyName;
  const openai = createOpenAIClient();
  const kit = brandKitPrompt(company, brand, "copy");

  const completion = await openai.chat.completions.create({
    model: getOpenAITextModel(),
    temperature: BRAND_COPY_TEMPERATURE,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write high-open-rate emails that obey this company brand kit with no drift.

${kit}

Return JSON only: {"subject":"...","body":"..."}.
Subject rules: 4-8 words, specific, curiosity or a clear benefit, never clickbait spam. No ALL CAPS, no "FREE", no fake urgency, no more than one punctuation mark.
Body rules: 80-140 words, plain text with blank lines, one idea, one soft CTA. Match the brand voice exactly. No HTML unless the brief asks for it.
Start the body with "Hey {{name}}," when it fits.
You may use these merge tags only, written exactly: ${TEMPLATE_VARIABLES.join(", ")}.
If a logo belongs in the body, insert {{logo}} on its own line. Never describe a fake mark.
Do not invent invoices, prices, legal claims, or another company's branding.`,
      },
      {
        role: "user",
        content:
          mode === "flare"
            ? `Rewrite this email so the subject earns the open and the body has more flare, without changing the intent. Stay inside the brand lock.
Template: ${body.templateName || "custom"}
Company: ${company}
Official logo: ${brand.logoDescription || (brand.logoUrl ? "on file" : "none — do not invent")}
Tagline: ${brand.tagline || "(none)"}
Current subject: ${body.subject || "(none)"}
Current body:
${body.emailBody || "(none)"}
Extra direction: ${prompt || "Make it sharper and more human."}`
            : `Write a new email that could only belong to this company.
Template: ${body.templateName || "custom"}
Company: ${company}
Official logo: ${brand.logoDescription || (brand.logoUrl ? "on file" : "none — do not invent")}
Tagline: ${brand.tagline || "(none)"}
Brief: ${prompt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: { subject?: string; body?: string } = {};
  try {
    parsed = JSON.parse(raw) as { subject?: string; body?: string };
  } catch {
    return NextResponse.json({ error: "AI returned unreadable copy" }, { status: 502 });
  }

  const subject = parsed.subject?.trim();
  const emailBody = parsed.body?.trim();
  if (!subject || !emailBody) {
    return NextResponse.json({ error: "AI did not return a subject and body" }, { status: 502 });
  }

  return NextResponse.json({ subject, body: emailBody });
}
