import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandVoicePrompt } from "@/lib/branding";
import { TEMPLATE_VARIABLES } from "@/lib/emailTemplates";
import { getActiveClient } from "@/lib/workspace";

type Mode = "generate" | "flare";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
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

  const active = await getActiveClient(supabase);
  const { companyName, brand } = brandFromClient(active);
  const company = body.companyName?.trim() || companyName;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write high-open-rate emails that match this company brand.
${brandVoicePrompt(company, brand)}
Return JSON only: {"subject":"...","body":"..."}.
Subject rules: 4-8 words, specific, curiosity or a clear benefit, never clickbait spam. No ALL CAPS, no "FREE", no fake urgency, no more than one punctuation mark.
Body rules: 80-140 words, plain text with blank lines, one idea, one soft CTA. Match the brand voice. No HTML.
Start the body with "Hey {{name}}," when it fits. Sign off with ${company}.
You may use these merge tags only: ${TEMPLATE_VARIABLES.join(", ")}.
Do not invent invoices, prices, or legal claims.`,
      },
      {
        role: "user",
        content:
          mode === "flare"
            ? `Rewrite this email so the subject earns the open and the body has more flare, without changing the intent. Stay inside the brand voice.
Template: ${body.templateName || "custom"}
Current subject: ${body.subject || "(none)"}
Current body:
${body.emailBody || "(none)"}
Extra direction: ${prompt || "Make it sharper and more human."}`
            : `Write a new email in this brand voice.
Template: ${body.templateName || "custom"}
Company: ${company}
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
