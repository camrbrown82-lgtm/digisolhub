import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { AgentError } from "@/lib/agent/errors";
import { getActiveClientId, listClients } from "@/lib/workspace";

export type AgentAccessMode = "digital_hub" | "company_locked";

export type AgentAccessScope = {
  mode: AgentAccessMode;
  workspaceClientId: string;
  workspaceCompanyName: string;
  allowedCompanyIds: string[];
  companies: Array<{ id: string; name: string; domain: string | null }>;
  promptBlock: string;
};

const PARENT_NAMES = new Set([
  DIGISOL_HOUSE_NAME.toLowerCase(),
  "digital",
  "digital hub",
  "digisol hub",
]);

export function isDigitalHubParentName(name?: string | null) {
  return PARENT_NAMES.has((name || "").trim().toLowerCase());
}

/**
 * Digital Hub (DigiSol / "Digital" / empty Working-on) → query all child companies.
 * Locked child profile → strictly that company's files, contacts, and branding.
 */
export async function resolveAgentAccessScope(
  supabase: SupabaseClient,
  workspaceClient: { id: string; name?: string | null; domain?: string | null } | null,
): Promise<AgentAccessScope> {
  const activeId = await getActiveClientId();
  const all = await listClients(supabase);
  const companies = all.map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Untitled",
    domain: (row.domain as string | null) || null,
  }));

  const workspaceClientId = workspaceClient?.id || companies[0]?.id || "";
  const workspaceCompanyName =
    workspaceClient?.name?.trim() || DIGISOL_HOUSE_NAME;

  const isParent =
    !activeId || isDigitalHubParentName(workspaceCompanyName);

  if (isParent) {
    return {
      mode: "digital_hub",
      workspaceClientId,
      workspaceCompanyName,
      allowedCompanyIds: companies.map((c) => c.id),
      companies,
      promptBlock: [
        "ACCESS MODE: Digital Hub (cross-company).",
        "You may query ANY child company by companyId.",
        "Never mix one company's branding onto another.",
        `Known companies: ${companies
          .map((c) => `${c.name} (${c.id})${c.domain ? ` · ${c.domain}` : ""}`)
          .join("; ") || "(none yet)"}`,
      ].join("\n"),
    };
  }

  return {
    mode: "company_locked",
    workspaceClientId,
    workspaceCompanyName,
    allowedCompanyIds: [workspaceClientId],
    companies: companies.filter((c) => c.id === workspaceClientId),
    promptBlock: [
      "ACCESS MODE: Company-locked.",
      `You are restricted strictly to ${workspaceCompanyName} (${workspaceClientId}).`,
      "Do not read or write another company's contacts, files, campaigns, or branding.",
      "If a tool is called with a different companyId, it will be rejected.",
    ].join("\n"),
  };
}

export function assertCompanyAllowed(
  scope: AgentAccessScope,
  companyId: string,
): void {
  if (!companyId) return;
  if (scope.allowedCompanyIds.includes(companyId)) return;
  throw new AgentError(
    scope.mode === "company_locked"
      ? `Access denied: locked to ${scope.workspaceCompanyName}. Switch Working on to DigiSol / Digital (or All companies) to query other clients.`
      : `Access denied for companyId ${companyId}`,
    403,
    "company_scope_denied",
  );
}
