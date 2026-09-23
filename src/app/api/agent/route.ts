import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { toAgentHttpError } from "@/lib/agent/errors";
import { runAgent } from "@/lib/agent/runner";
import type { AgentRequestBody, AgentTaskKind } from "@/lib/agent/types";
import { getOpenAIApiKey } from "@/lib/openai";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

const ALLOWED_TASKS = new Set<AgentTaskKind>([
  "email_draft",
  "email_flare",
  "campaign_strategy",
  "site_workflow",
  "general",
]);

export async function POST(request: Request) {
  const { supabase, user, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it in Vercel Production and .env.local, then redeploy.",
        code: "missing_api_key",
      },
      { status: 503 },
    );
  }

  let body: AgentRequestBody;
  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "invalid_json" },
      { status: 400 },
    );
  }

  if (body.task && !ALLOWED_TASKS.has(body.task)) {
    return NextResponse.json(
      {
        error: `Unknown task. Use one of: ${Array.from(ALLOWED_TASKS).join(", ")}`,
        code: "invalid_task",
      },
      { status: 400 },
    );
  }

  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  if (!clientId || !active) {
    return NextResponse.json(
      { error: "No Working-on company selected", code: "missing_workspace" },
      { status: 400 },
    );
  }

  const { companyName, brand } = brandFromClient(active);

  try {
    const result = await runAgent(body, {
      supabase,
      clientId,
      companyName,
      brand,
      userId: user!.id,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      companyName,
    });
  } catch (err) {
    const { status, body: errorBody } = toAgentHttpError(err);
    return NextResponse.json(errorBody, { status });
  }
}
