import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_OPERATOR } from "@/lib/agent/digisol/scope";

export type AgentActivityLogInput = {
  supabase: SupabaseClient;
  userId?: string | null;
  clientId: string;
  action: string;
  toolName?: string | null;
  status?: "ok" | "error" | "started" | "finished";
  model?: string | null;
  input?: Record<string, unknown> | null;
  output?: unknown;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Best-effort audit row for every automated DigiSol agent action.
 * Never throws into the agent loop — logging failures are swallowed.
 */
export async function logAgentActivity(entry: AgentActivityLogInput): Promise<void> {
  try {
    const payload = {
      client_id: entry.clientId,
      user_id: entry.userId || null,
      operator: DIGISOL_OPERATOR.name,
      action: entry.action.slice(0, 120),
      tool_name: entry.toolName?.slice(0, 120) || null,
      status: entry.status || "ok",
      model: entry.model || null,
      input: sanitizeJson(entry.input) ?? {},
      output: sanitizeJson(entry.output),
      error_message: entry.errorMessage?.slice(0, 2000) || null,
      metadata: {
        ...(sanitizeJson(entry.metadata) as Record<string, unknown> | null),
        scopedTo: DIGISOL_OPERATOR.name,
        domain: DIGISOL_OPERATOR.domain,
      },
    };

    const { error } = await entry.supabase.from("agent_activity_logs").insert(payload);
    if (error) {
      // Table may not exist yet in some environments — do not break the agent.
      console.warn("[agent_activity_logs]", error.message);
    }
  } catch (err) {
    console.warn(
      "[agent_activity_logs]",
      err instanceof Error ? err.message : "failed to write activity log",
    );
  }
}

function sanitizeJson(value: unknown): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (typeof v === "string" && v.length > 4000) {
          return `${v.slice(0, 4000)}…[truncated]`;
        }
        return v;
      }),
    );
  } catch {
    return { note: "unserializable" };
  }
}
