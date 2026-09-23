import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyBrand } from "@/lib/branding";

/** High-level jobs the agent can take. Used for model + token routing. */
export type AgentTaskKind =
  | "email_draft"
  | "email_flare"
  | "campaign_strategy"
  | "site_workflow"
  | "general";

export type AgentComplexity = "lightweight" | "complex";

export type AgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
};

export type AgentRequestBody = {
  /** Free-form instruction for the agent. */
  prompt?: string;
  /** Explicit task kind; if omitted, inferred from the prompt. */
  task?: AgentTaskKind;
  /** Optional conversation history (user/assistant only). */
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Extra context the client wants injected (non-secret). */
  context?: Record<string, unknown>;
  /** Cap tool rounds for this request (hard-capped server-side). */
  maxToolRounds?: number;
};

export type AgentRunResult = {
  task: AgentTaskKind;
  complexity: AgentComplexity;
  model: string;
  maxTokens: number;
  content: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    rounds: number;
  };
};

export type AgentToolContext = {
  supabase: SupabaseClient;
  clientId: string;
  companyName: string;
  brand: CompanyBrand;
  userId: string;
};

export type AgentToolParameters = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type AgentToolDefinition = {
  name: string;
  description: string;
  parameters: AgentToolParameters;
  /** Which tasks may use this tool. Empty = all tasks. */
  tasks?: AgentTaskKind[];
  execute: (
    args: Record<string, unknown>,
    ctx: AgentToolContext,
  ) => Promise<unknown>;
};
