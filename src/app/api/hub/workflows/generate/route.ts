import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import {
  WORKFLOW_BUILDER_SYSTEM_PROMPT,
  buildWorkflowUserPrompt,
  parseWorkflowAiResponse,
} from "@/lib/workflowAi";
import { getActiveClientId, getWorkspaceClient } from "@/lib/workspace";

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
    goal?: string;
    timeline?: string;
    audience?: string;
    offer?: string;
    triggerHint?: string;
    notes?: string;
    save?: boolean;
  };

  const goal = body.goal?.trim();
  if (!goal) {
    return NextResponse.json(
      { error: "Describe the campaign goal so the workflow builder can plan steps." },
      { status: 400 },
    );
  }

  const active = await getWorkspaceClient(supabase);
  const { companyName } = brandFromClient(active);
  const openai = createOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: getOpenAITextModel(),
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WORKFLOW_BUILDER_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildWorkflowUserPrompt({
          goal,
          timeline: body.timeline?.trim(),
          audience: body.audience?.trim(),
          offer: body.offer?.trim(),
          triggerHint: body.triggerHint?.trim(),
          notes: body.notes?.trim(),
          companyName,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "AI returned an empty workflow" }, { status: 502 });
  }

  let plan;
  try {
    plan = parseWorkflowAiResponse(content);
  } catch {
    return NextResponse.json(
      { error: "Could not parse the AI workflow. Try again with a clearer goal." },
      { status: 502 },
    );
  }

  if (body.save === false) {
    return NextResponse.json({ workflow: plan, saved: false });
  }

  const { data, error: insertError } = await supabase
    .from("workflows")
    .insert({
      name: plan.name,
      trigger: plan.trigger,
      graph: plan.graph,
      enabled: false,
      client_id: (await getActiveClientId()) || null,
    })
    .select("id, name, trigger, enabled, updated_at")
    .single();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message || "Could not save workflow" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: data.id,
    workflow: data,
    summary: plan.summary,
    saved: true,
  });
}
