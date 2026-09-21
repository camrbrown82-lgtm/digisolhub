import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { ensureTagDescriptionSchema } from "@/lib/ensureTagSchema";
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
import { resolveClientId, getWorkspaceClient } from "@/lib/workspace";

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
    tagGuidance?: string;
    save?: boolean;
  };

  const goal = body.goal?.trim();
  if (!goal) {
    return NextResponse.json(
      { error: "Describe the campaign goal so the workflow builder can plan steps." },
      { status: 400 },
    );
  }

  await ensureTagDescriptionSchema().catch(() => null);

  const active = await getWorkspaceClient(supabase);
  const clientId = await resolveClientId(supabase);
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
          tagGuidance: body.tagGuidance?.trim(),
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
    return NextResponse.json({ workflow: plan, tags: plan.tags, saved: false });
  }

  // Upsert tag catalogue so descriptions live in Hub CRM tags.
  for (const tag of plan.tags) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id, description")
      .ilike("name", tag.name)
      .maybeSingle();
    if (existing?.id) {
      if (tag.description) {
        await supabase
          .from("tags")
          .update({ description: tag.description })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("tags").insert({
        name: tag.name,
        description: tag.description || null,
        color: "#6366f1",
      });
    }
  }

  const { data, error: insertError } = await supabase
    .from("workflows")
    .insert({
      name: plan.name,
      trigger: plan.trigger,
      graph: plan.graph,
      enabled: false,
      client_id: clientId || null,
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
    tags: plan.tags,
    saved: true,
  });
}
