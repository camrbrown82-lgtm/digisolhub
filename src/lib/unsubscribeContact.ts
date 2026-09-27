import type { SupabaseClient } from "@supabase/supabase-js";
import { logAgentActivity } from "@/lib/agent/digisol/activityLog";

export const UNSUBSCRIBED_TAG = "unsubscribed";

export type UnsubscribeSource = "email_link" | "one_click" | "spam_complaint";

const SOURCE_COPY: Record<UnsubscribeSource, string> = {
  email_link: "clicked Unsubscribe in an email",
  one_click: "used their inbox's Unsubscribe button",
  spam_complaint: "marked an email as spam",
};

/** Exact, case-insensitive email match for PostgREST ilike (no wildcards). */
export function ilikeExact(email: string) {
  return email.trim().toLowerCase().replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Kaylev's unsubscribe handler: stamps unsubscribed_at so every send path and
 * audience skips the person, hides them from Contacts, and records why. The row
 * stays as a do-not-contact record so audits/imports can't re-add them.
 */
export async function unsubscribeContactsByEmail(
  admin: SupabaseClient,
  rawEmail: string,
  source: UnsubscribeSource,
) {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return { removed: 0 };

  const now = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("contacts")
    .select("id, tags, client_id, unsubscribed_at")
    .ilike("email", ilikeExact(email));
  if (error) throw new Error(error.message);

  let removed = 0;
  for (const row of rows ?? []) {
    const tags = Array.from(new Set([...(row.tags ?? []), UNSUBSCRIBED_TAG]));
    const firstTime = !row.unsubscribed_at;
    await admin
      .from("contacts")
      .update({
        tags,
        ...(firstTime ? { unsubscribed_at: now } : {}),
      })
      .eq("id", row.id);
    if (!firstTime) continue;
    removed += 1;

    await admin.from("notes").insert({
      contact_id: row.id,
      body: `Unsubscribed: ${email} ${SOURCE_COPY[source]}. Kaylev removed them from Contacts and audiences and stopped any running workflows. Do not email again.`,
    });

    if (row.client_id) {
      await logAgentActivity({
        supabase: admin,
        clientId: row.client_id,
        action: "contact_unsubscribed",
        toolName: "unsubscribe",
        input: { email, source },
        output: { contactId: row.id },
      });
    }
  }

  return { removed };
}
