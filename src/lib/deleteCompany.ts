import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { isDigisolClient } from "@/lib/workspace";

const CLIENT_SCOPED = [
  "social_plans",
  "meta_ad_drafts",
  "digisol_daily_usage",
  "leads",
  "campaigns",
  "workflows",
  "email_templates",
  "contacts",
  "assets",
] as const;

function missingTable(message: string) {
  return /does not exist|schema cache|could not find the table/i.test(message);
}

async function deleteWhere(
  db: SupabaseClient,
  table: string,
  column: string,
  value: string,
) {
  const { error } = await db.from(table).delete().eq(column, value);
  if (error && !missingTable(error.message)) {
    throw new Error(error.message);
  }
}

async function removeStoredFiles(db: SupabaseClient, clientId: string) {
  const { data, error } = await db.from("assets").select("bucket, path").eq("client_id", clientId);
  if (error) {
    if (missingTable(error.message)) return;
    throw new Error(error.message);
  }
  const byBucket = new Map<string, string[]>();
  for (const row of data ?? []) {
    const bucket = String(row.bucket || "").trim();
    const path = String(row.path || "").trim();
    if (!bucket || !path) continue;
    const list = byBucket.get(bucket) ?? [];
    list.push(path);
    byBucket.set(bucket, list);
  }
  for (const [bucket, paths] of byBucket) {
    const unique = Array.from(new Set(paths));
    for (let index = 0; index < unique.length; index += 100) {
      const { error: storageError } = await db.storage.from(bucket).remove(unique.slice(index, index + 100));
      if (storageError && !/not found|does not exist/i.test(storageError.message)) {
        throw new Error(storageError.message);
      }
    }
  }
}

/** Removes DigiSol's sign-up lead and Hub contact for a company that is going away. */
async function removeHouseSignup(db: SupabaseClient, companyName: string) {
  const name = companyName.trim().toLowerCase();
  if (!name) return;
  const { data: house } = await db.from("clients").select("id, name").ilike("name", DIGISOL_HOUSE_NAME).maybeSingle();
  if (!house?.id || isDigisolClient({ name: companyName })) return;

  const { data: leads } = await db.from("leads").select("id, company").eq("client_id", house.id).eq("stage", "won");
  const leadIds = (leads ?? [])
    .filter((lead) => String(lead.company || "").trim().toLowerCase() === name)
    .map((lead) => lead.id as string);
  if (leadIds.length) {
    const { error } = await db.from("leads").delete().in("id", leadIds);
    if (error && !missingTable(error.message)) throw new Error(error.message);
  }

  const { data: contacts } = await db
    .from("contacts")
    .select("id, company, source, tags")
    .eq("client_id", house.id)
    .ilike("company", companyName.trim());
  const contactIds = (contacts ?? [])
    .filter((contact) => {
      if (String(contact.company || "").trim().toLowerCase() !== name) return false;
      const tags = Array.isArray(contact.tags) ? contact.tags.map((tag) => String(tag)) : [];
      return contact.source === "hub_client" || tags.includes("client");
    })
    .map((contact) => contact.id as string);
  if (contactIds.length) {
    const { error } = await db.from("contacts").delete().in("id", contactIds);
    if (error && !missingTable(error.message)) throw new Error(error.message);
  }
}

/**
 * Deletes one company and the Hub records stored for it.
 * DigiSol cannot be deleted. Rows that only null their company link are removed first.
 */
export async function deleteCompany(db: SupabaseClient, clientId: string) {
  const { data: client, error } = await db.from("clients").select("id, name").eq("id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) return { ok: false as const, missing: true };
  if (isDigisolClient(client)) {
    return { ok: false as const, protected: true, name: client.name as string };
  }

  await removeStoredFiles(db, clientId);
  await deleteWhere(db, "analytics_events", "company_id", clientId);
  for (const table of CLIENT_SCOPED) {
    await deleteWhere(db, table, "client_id", clientId);
  }
  await removeHouseSignup(db, client.name as string);

  const { error: deleteError } = await db.from("clients").delete().eq("id", clientId);
  if (deleteError) throw new Error(deleteError.message);
  return { ok: true as const, name: client.name as string };
}
