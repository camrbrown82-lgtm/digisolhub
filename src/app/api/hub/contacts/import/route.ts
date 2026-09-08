import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { findOrCreateClient, getActiveClientId } from "@/lib/workspace";

function parseTags(value: string) {
  return value
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return NextResponse.json(
      {
        error:
          "Excel files can be stored under Files as a data sheet. For contact import, save the sheet as CSV first.",
      },
      { status: 400 },
    );
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  const activeClientId = await getActiveClientId();
  let created = 0;
  let updated = 0;
  const failed: { email: string; error: string }[] = [];

  for (const row of rows.slice(0, 500)) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      failed.push({ email: row.email || "(missing)", error: "Valid email is required" });
      continue;
    }

    const clientId =
      activeClientId ||
      (await findOrCreateClient(supabase, {
        name: row.company,
        domain: row.domain,
      }));

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, tags")
      .ilike("email", email)
      .maybeSingle();

    const tags = Array.from(new Set([...(existing?.tags ?? []), ...parseTags(row.tags ?? "")]));
    const payload = {
      name: row.name || null,
      email,
      company: row.company || null,
      domain: row.domain || null,
      phone: row.phone || null,
      service: row.service || null,
      tags,
      notes_preview: row.notes?.slice(0, 280) || null,
      client_id: clientId || null,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        failed.push({ email, error: updateError.message });
        continue;
      }
      if (row.notes) {
        await supabase.from("notes").insert({ contact_id: existing.id, body: row.notes });
      }
      updated += 1;
      continue;
    }

    const { data, error: insertError } = await supabase
      .from("contacts")
      .insert({ ...payload, source: "csv-import" })
      .select("id")
      .single();
    if (insertError || !data) {
      failed.push({ email, error: insertError?.message || "Insert failed" });
      continue;
    }
    if (row.notes) {
      await supabase.from("notes").insert({ contact_id: data.id, body: row.notes });
    }
    created += 1;
  }

  return NextResponse.json({ created, updated, failed, total: rows.length });
}
