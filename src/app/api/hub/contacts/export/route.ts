import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { CONTACT_CSV_COLUMNS, toCsv } from "@/lib/csv";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { getActiveClient, getActiveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  await ensureCampaignChannelSchema().catch(() => null);

  const template = new URL(request.url).searchParams.get("template") === "1";
  const clientId = await getActiveClientId();
  const active = await getActiveClient(supabase);

  let rows: Record<string, string>[] = [];
  if (!template) {
    let query = supabase
      .from("contacts")
      .select(
        "name, email, company, domain, phone, service, tags, notes_preview, campaign_channel, ab_variant",
      )
      .order("created_at", { ascending: false });
    if (clientId) query = query.eq("client_id", clientId);
    const { data, error: queryError } = await query;
    if (queryError) {
      // Columns may not exist yet — fall back without channel/ab.
      let fallback = supabase
        .from("contacts")
        .select("name, email, company, domain, phone, service, tags, notes_preview")
        .order("created_at", { ascending: false });
      if (clientId) fallback = fallback.eq("client_id", clientId);
      const retry = await fallback;
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 400 });
      }
      rows = (retry.data ?? []).map((contact) => ({
        name: contact.name ?? "",
        email: contact.email ?? "",
        company: contact.company ?? "",
        domain: contact.domain ?? "",
        phone: contact.phone ?? "",
        service: contact.service ?? "",
        tags: (contact.tags ?? []).join("; "),
        notes: contact.notes_preview ?? "",
        campaign_channel: "",
        ab_variant: "",
      }));
    } else {
      rows = (data ?? []).map((contact) => ({
        name: contact.name ?? "",
        email: contact.email ?? "",
        company: contact.company ?? "",
        domain: contact.domain ?? "",
        phone: contact.phone ?? "",
        service: contact.service ?? "",
        tags: (contact.tags ?? []).join("; "),
        notes: contact.notes_preview ?? "",
        campaign_channel: contact.campaign_channel ?? "",
        ab_variant: contact.ab_variant ?? "",
      }));
    }
  }

  const csv = toCsv(rows, [...CONTACT_CSV_COLUMNS]);
  const slug = (active?.name || "all-companies")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = template ? "contacts-template.csv" : `${slug || "contacts"}-contacts.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
