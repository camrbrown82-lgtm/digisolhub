import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { toAgentHttpError } from "@/lib/agent/errors";
import { resolveAgentAccessScope } from "@/lib/agent/master/accessScope";
import {
  runMasterAgent,
  type MasterAgentRequest,
} from "@/lib/agent/master/runner";
import { getOpenAIApiKey } from "@/lib/openai";
import { getActiveClient, getWorkspaceClient, resolveClientId } from "@/lib/workspace";

/**
 * Master AI Agent — multi-company hub governor.
 * POST /api/agent/master
 *
 * Body: { prompt?, messages?, companyId?, context?, maxToolRounds?, maxTokens? }
 */
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

  let body: MasterAgentRequest;
  try {
    body = (await request.json()) as MasterAgentRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "invalid_json" },
      { status: 400 },
    );
  }

  const active = await getActiveClient(supabase);
  const workspace = active || (await getWorkspaceClient(supabase));
  const workspaceClientId =
    active?.id || (await resolveClientId(supabase)) || workspace?.id || "";
  if (!workspaceClientId) {
    return NextResponse.json(
      { error: "No Working-on company selected", code: "missing_workspace" },
      { status: 400 },
    );
  }

  const access = await resolveAgentAccessScope(supabase, workspace);

  try {
    const result = await runMasterAgent(body, {
      supabase,
      workspaceClientId: access.workspaceClientId || workspaceClientId,
      userId: user!.id,
      access,
    });

    return NextResponse.json({
      ok: true,
      allowedCompanyIds: access.allowedCompanyIds,
      ...result,
    });
  } catch (err) {
    const { status, body: errorBody } = toAgentHttpError(err);
    return NextResponse.json(errorBody, { status });
  }
}
