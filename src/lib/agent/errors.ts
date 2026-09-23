import { openaiErrorMessage } from "@/lib/openai";

export class AgentError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "agent_error") {
    super(message);
    this.name = "AgentError";
    this.status = status;
    this.code = code;
  }
}

export function toAgentHttpError(err: unknown): {
  status: number;
  body: { error: string; code: string };
} {
  if (err instanceof AgentError) {
    return {
      status: err.status,
      body: { error: err.message, code: err.code },
    };
  }

  const message = openaiErrorMessage(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("budget exceeded") ||
    lower.includes("no active digisol subscription") ||
    lower.includes("daily automated cap") ||
    lower.includes("digisol bootstrap")
  ) {
    return {
      status: 402,
      body: {
        error: message,
        code: "budget_exceeded",
      },
    };
  }

  if (lower.includes("unauthorized") || lower.includes("api key")) {
    return {
      status: 503,
      body: {
        error: message,
        code: "openai_unauthorized",
      },
    };
  }

  if (lower.includes("rate limit") || lower.includes("429")) {
    return {
      status: 429,
      body: {
        error: "OpenAI rate limit hit. Retry shortly — token caps are already applied.",
        code: "openai_rate_limit",
      },
    };
  }

  if (lower.includes("context length") || lower.includes("maximum context")) {
    return {
      status: 413,
      body: {
        error: "Prompt exceeded the model context window. Shorten the brief or history.",
        code: "context_overflow",
      },
    };
  }

  return {
    status: 502,
    body: {
      error: message || "Agent request failed",
      code: "openai_error",
    },
  };
}
