import type { SupabaseClient } from "@supabase/supabase-js";
import {
  brandFromClient,
  brandKitPrompt,
  type CompanyBrand,
} from "@/lib/branding";
import { AgentError } from "@/lib/agent/errors";
import {
  assertCompanyAllowed,
  type AgentAccessScope,
} from "@/lib/agent/master/accessScope";

export type MasterCompanyScope = {
  companyId: string;
  companyName: string;
  brand: CompanyBrand;
  domain: string | null;
  siteKey: string | null;
  notes: string | null;
};

/**
 * Resolve a company row + brand kit. Falls back to workspace client when
 * companyId is empty; rejects unknown ids so the agent cannot invent brands.
 */
export async function resolveCompanyScope(
  supabase: SupabaseClient,
  companyId: string,
  fallbackId?: string,
  access?: AgentAccessScope,
): Promise<MasterCompanyScope> {
  const id = (companyId || fallbackId || "").trim();
  if (!id) {
    throw new AgentError("companyId is required", 400, "missing_company_id");
  }

  if (access) assertCompanyAllowed(access, id);

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, domain, site_key, notes, branding")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AgentError(error.message, 400, "company_lookup_failed");
  }
  if (!data) {
    throw new AgentError(`Company not found: ${id}`, 404, "company_not_found");
  }

  const { companyName, brand } = brandFromClient(data);
  return {
    companyId: data.id as string,
    companyName,
    brand,
    domain: (data.domain as string | null) || null,
    siteKey: (data.site_key as string | null) || null,
    notes: (data.notes as string | null) || null,
  };
}

export function companyBrandPrompt(scope: MasterCompanyScope) {
  return brandKitPrompt(scope.companyName, scope.brand, "copy");
}
