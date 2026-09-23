import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DIGISOL_HOUSE_DOMAIN,
  DIGISOL_HOUSE_NAME,
  brandFromClient,
  brandKitPrompt,
  type CompanyBrand,
} from "@/lib/branding";
import { getDigisolClient } from "@/lib/workspace";
import { AgentError } from "@/lib/agent/errors";

/**
 * DigiSol is the sole operator profile. Every agent tool, DB query, and
 * contact lookup is hardcoded to this single house context — never accept
 * external companyId overrides.
 */
export const DIGISOL_OPERATOR = {
  name: DIGISOL_HOUSE_NAME,
  domain: DIGISOL_HOUSE_DOMAIN,
} as const;

export type DigisolAgentContext = {
  supabase: SupabaseClient;
  userId: string;
  clientId: string;
  companyName: typeof DIGISOL_HOUSE_NAME;
  domain: string;
  siteKey: string | null;
  notes: string | null;
  brand: CompanyBrand;
  brandPrompt: string;
};

/**
 * Resolve DigiSol's house client from Supabase and refuse anything else.
 */
export async function resolveDigisolScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<DigisolAgentContext> {
  const client = await getDigisolClient(supabase);
  if (!client?.id) {
    throw new AgentError(
      "DigiSol house profile is missing in Supabase. Create the DigiSol client first.",
      503,
      "digisol_profile_missing",
    );
  }

  const name = (client.name || "").trim();
  if (name.toLowerCase() !== DIGISOL_HOUSE_NAME.toLowerCase()) {
    throw new AgentError(
      "Agent scope leaked outside DigiSol. Aborting to prevent cross-contamination.",
      500,
      "scope_violation",
    );
  }

  const { companyName, brand } = brandFromClient(client);
  const domain =
    (typeof client.domain === "string" && client.domain.trim()) ||
    DIGISOL_HOUSE_DOMAIN;

  return {
    supabase,
    userId,
    clientId: client.id,
    companyName: DIGISOL_HOUSE_NAME,
    domain,
    siteKey: typeof client.site_key === "string" ? client.site_key : null,
    notes: typeof client.notes === "string" ? client.notes : null,
    brand,
    brandPrompt: brandKitPrompt(companyName, brand, "copy"),
  };
}

/** Absolute DigiSol-only filter for CRM / send rows. */
export function digisolClientFilter(clientId: string) {
  return { client_id: clientId, operator: DIGISOL_OPERATOR.name };
}
