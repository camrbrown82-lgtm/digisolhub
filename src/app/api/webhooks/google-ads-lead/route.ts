import { NextResponse } from "next/server";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";
import { sendLeadAlert } from "@/lib/leadAlert";
import { upsertLead } from "@/lib/leads";
import { emptyAttribution } from "@/lib/meta/attribution";
import { timingSafeStringEqual } from "@/lib/security";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { ensureDigisolClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoogleLeadColumn = {
  column_id?: string;
  column_name?: string;
  string_value?: string;
};

type GoogleLeadPayload = {
  lead_id?: string;
  google_key?: string;
  is_test?: boolean;
  gcl_id?: string;
  campaign_id?: number | string;
  adgroup_id?: number | string;
  creative_id?: number | string;
  form_id?: number | string;
  user_column_data?: GoogleLeadColumn[];
};

const STANDARD_COLUMNS = new Set([
  "FULL_NAME",
  "FIRST_NAME",
  "LAST_NAME",
  "EMAIL",
  "WORK_EMAIL",
  "PHONE_NUMBER",
  "WORK_PHONE",
  "COMPANY_NAME",
]);

function googleAdsLeadKey() {
  return (process.env.GOOGLE_ADS_LEAD_KEY ?? "").trim();
}


/**
 * Google Ads lead form asset → Hub contact. Google POSTs each submission here
 * with the key configured on the form; new contacts start "New lead" workflows.
 */
export async function POST(request: Request) {
  const key = googleAdsLeadKey();
  if (!key || !hasAdminClient()) {
    return NextResponse.json({ error: "Google Ads lead webhook not configured" }, { status: 503 });
  }

  let payload: GoogleLeadPayload;
  try {
    payload = (await request.json()) as GoogleLeadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!timingSafeStringEqual(String(payload.google_key ?? ""), key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const columns = payload.user_column_data ?? [];
  const value = (...ids: string[]) =>
    columns
      .find((col) => ids.includes(String(col.column_id ?? "").toUpperCase()))
      ?.string_value?.trim() || "";

  const name =
    value("FULL_NAME") ||
    [value("FIRST_NAME"), value("LAST_NAME")].filter(Boolean).join(" ");
  const email = value("EMAIL", "WORK_EMAIL").toLowerCase();
  const phone = value("PHONE_NUMBER", "WORK_PHONE");
  const company = value("COMPANY_NAME");
  const answers = columns
    .filter((col) => !STANDARD_COLUMNS.has(String(col.column_id ?? "").toUpperCase()))
    .filter((col) => col.string_value?.trim())
    .map((col) => `${col.column_name || col.column_id}: ${col.string_value!.trim()}`);

  const campaignId = payload.campaign_id ? String(payload.campaign_id) : "";
  const message = [
    `Google Ads lead form${campaignId ? ` · campaign ${campaignId}` : ""}${
      payload.form_id ? ` · form ${payload.form_id}` : ""
    }${payload.lead_id ? ` · lead ${payload.lead_id}` : ""}`,
    ...answers,
  ].join("\n");

  const admin = createAdminClient();
  const houseId = await ensureDigisolClient(admin);

  if (payload.is_test) {
    if (houseId) {
      await logAgentActivity({
        supabase: admin,
        clientId: houseId,
        action: "google_ads_lead_test",
        toolName: "google_ads_lead_webhook",
        input: { formId: payload.form_id, campaignId },
        output: { columns: columns.map((col) => col.column_id) },
      });
    }
    return NextResponse.json({ ok: true, test: true });
  }

  if (!email) {
    // Phone-only form: keep it in the Leads pipeline so it isn't lost.
    if (houseId && (name || phone || company)) {
      await admin.from("leads").insert({
        client_id: houseId,
        name: name || null,
        phone: phone || null,
        company: company || null,
        source: "google_ads",
        channel: "phone",
        stage: "new",
        notes_preview: message.slice(0, 280),
      });
      await sendLeadAlert({
        sourceLabel: "Google Ads lead form",
        name,
        phone,
        company,
        message,
        note: "No email on this form, so they're in the Hub Leads pipeline only. Call them.",
      });
    }
    return NextResponse.json({ ok: true, contact: false, reason: "no_email" });
  }

  const attribution = {
    ...emptyAttribution(),
    gclid: payload.gcl_id?.trim() || null,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: campaignId || null,
  };

  const result = await upsertLead({
    name: name || null,
    email,
    phone: phone || null,
    company: company || null,
    message,
    source: "google_ads_lead_form",
    tags: ["lead", "google_ads", "google_ads_lead_form"],
    attribution,
    pinHouseClient: true,
  });

  await sendLeadAlert({
    sourceLabel: "Google Ads lead form",
    name,
    email,
    phone,
    company,
    message,
    contactId: result.id ?? null,
  });

  return NextResponse.json({ ok: true, contactId: result.id, created: result.created });
}
