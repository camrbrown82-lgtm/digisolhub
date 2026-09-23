import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import {
  digisolInternalAllotment,
  emptyAllotment,
  resolveAllotmentsForPricingIds,
  type AiAllotment,
} from "@/lib/agent/budget/allotments";
import { ensureClientAiWalletSchema } from "@/lib/ensureClientAiWalletSchema";

export type ClientAiWalletRow = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  is_internal: boolean;
  pricing_item_ids: string[];
  token_budget: number;
  token_used: number;
  tool_call_budget: number;
  tool_calls_used: number;
  audit_budget: number;
  audits_used: number;
  email_dispatch_budget: number;
  emails_dispatched: number;
};

export type EstimatedCost = {
  tokens?: number;
  toolCalls?: number;
  audits?: number;
  emails?: number;
};

export function currentBillingPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function isDigisolCompany(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();
  return (
    (data?.name || "").trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase()
  );
}

export async function loadActivePricingItemIds(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("client_subscriptions")
    .select("pricing_item_id, status, current_period_end")
    .eq("client_id", companyId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const now = Date.now();
  return (data ?? [])
    .filter((row) => {
      if (!row.current_period_end) return true;
      return new Date(row.current_period_end).getTime() >= now;
    })
    .map((row) => String(row.pricing_item_id));
}

async function ensureWalletRow(input: {
  supabase: SupabaseClient;
  companyId: string;
  isInternal: boolean;
  pricingItemIds: string[];
  allotment: AiAllotment;
}): Promise<ClientAiWalletRow> {
  await ensureClientAiWalletSchema().catch(() => null);
  const period = currentBillingPeriod();

  const { data: existing } = await input.supabase
    .from("client_ai_wallets")
    .select("*")
    .eq("client_id", input.companyId)
    .eq("period_start", period.startIso)
    .maybeSingle();

  if (existing?.id) {
    // Refresh budgets if subscription mix changed (keep usage counters).
    const needsRefresh =
      JSON.stringify([...(existing.pricing_item_ids || [])].sort()) !==
        JSON.stringify([...input.pricingItemIds].sort()) ||
      existing.token_budget !== input.allotment.tokens ||
      existing.is_internal !== input.isInternal;

    if (!needsRefresh) return existing as ClientAiWalletRow;

    const { data: updated, error } = await input.supabase
      .from("client_ai_wallets")
      .update({
        is_internal: input.isInternal,
        pricing_item_ids: input.pricingItemIds,
        token_budget: input.allotment.tokens,
        tool_call_budget: input.allotment.toolCalls,
        audit_budget: input.allotment.audits,
        email_dispatch_budget: input.allotment.emailDispatches,
        period_end: period.endIso,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated as ClientAiWalletRow;
  }

  const { data: created, error } = await input.supabase
    .from("client_ai_wallets")
    .insert({
      client_id: input.companyId,
      period_start: period.startIso,
      period_end: period.endIso,
      is_internal: input.isInternal,
      pricing_item_ids: input.pricingItemIds,
      token_budget: input.allotment.tokens,
      tool_call_budget: input.allotment.toolCalls,
      audit_budget: input.allotment.audits,
      email_dispatch_budget: input.allotment.emailDispatches,
      token_used: 0,
      tool_calls_used: 0,
      audits_used: 0,
      emails_dispatched: 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return created as ClientAiWalletRow;
}

export async function resolveCompanyWallet(
  supabase: SupabaseClient,
  companyId: string,
) {
  const digisol = await isDigisolCompany(supabase, companyId);

  if (digisol) {
    const allotment = digisolInternalAllotment();
    const wallet = await ensureWalletRow({
      supabase,
      companyId,
      isInternal: true,
      pricingItemIds: ["digisol_internal"],
      allotment,
    });
    return {
      isDigisol: true as const,
      pricingItemIds: ["digisol_internal"] as string[],
      allotment,
      wallet,
      unrecognizedIds: [] as string[],
    };
  }

  const pricingItemIds = await loadActivePricingItemIds(supabase, companyId);
  const resolved = resolveAllotmentsForPricingIds(pricingItemIds);
  const allotment =
    resolved.recognizedIds.length > 0 ? resolved.allotment : emptyAllotment();

  const wallet = await ensureWalletRow({
    supabase,
    companyId,
    isInternal: false,
    pricingItemIds: resolved.recognizedIds,
    allotment,
  });

  return {
    isDigisol: false as const,
    pricingItemIds: resolved.recognizedIds,
    allotment,
    wallet,
    unrecognizedIds: resolved.unrecognizedIds,
  };
}

export function remainingFromWallet(wallet: ClientAiWalletRow) {
  return {
    tokens: Math.max(0, wallet.token_budget - wallet.token_used),
    toolCalls: Math.max(0, wallet.tool_call_budget - wallet.tool_calls_used),
    audits: Math.max(0, wallet.audit_budget - wallet.audits_used),
    emails: Math.max(
      0,
      wallet.email_dispatch_budget - wallet.emails_dispatched,
    ),
  };
}
