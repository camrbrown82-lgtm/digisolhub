import type { SupabaseClient } from "@supabase/supabase-js";

/** Confirmed: contacts with this tag get no emails from any send path. */
export const MAIL_SCANNER_TAG = "mail_scanner";
/** Scanner-speed engagement seen; confirmed only if no real open/click follows within the grace period. */
export const SUSPECTED_SCANNER_TAG = "suspected_scanner";
export const SCANNER_GRACE_MS = 24 * 60 * 60 * 1000;

export type ScannerStatus =
  | { state: "clear" }
  | { state: "suspected"; until: string }
  | { state: "confirmed" };

export function isMailScannerContact(tags: string[] | null | undefined) {
  return (tags ?? []).includes(MAIL_SCANNER_TAG);
}

type ScannerMeta = {
  event?: string;
  sentAt?: string | null;
  eventAt?: string;
  suspectedAt?: string;
  confirmedAt?: string;
  clearedAt?: string;
};

async function prospectRows(db: SupabaseClient, contactId: string) {
  const { data } = await db
    .from("prospects")
    .select("id, metadata")
    .eq("contact_id", contactId);
  return (data ?? []) as Array<{ id: string; metadata: Record<string, unknown> | null }>;
}

async function patchScannerMeta(
  db: SupabaseClient,
  contactId: string,
  patch: ScannerMeta,
) {
  for (const row of await prospectRows(db, contactId)) {
    const metadata = row.metadata ?? {};
    await db
      .from("prospects")
      .update({
        metadata: {
          ...metadata,
          mailScanner: { ...((metadata.mailScanner as ScannerMeta) ?? {}), ...patch },
        },
      })
      .eq("id", row.id);
  }
}

/**
 * Current scanner state for a contact. A suspicion older than the grace
 * period with no real engagement is confirmed here, so whichever send path
 * checks first after the day is up stops the emails.
 */
export async function resolveScannerStatus(
  db: SupabaseClient,
  contactId: string,
): Promise<ScannerStatus> {
  const { data: contact } = await db
    .from("contacts")
    .select("id, tags")
    .eq("id", contactId)
    .maybeSingle();
  const tags = (contact?.tags as string[] | null) ?? [];
  if (tags.includes(MAIL_SCANNER_TAG)) return { state: "confirmed" };
  if (!tags.includes(SUSPECTED_SCANNER_TAG)) return { state: "clear" };

  let suspectedAt = 0;
  for (const row of await prospectRows(db, contactId)) {
    const meta = (row.metadata?.mailScanner as ScannerMeta | undefined) ?? {};
    const at = new Date(meta.suspectedAt || meta.eventAt || 0).getTime();
    if (Number.isFinite(at)) suspectedAt = Math.max(suspectedAt, at);
  }
  const until = suspectedAt + SCANNER_GRACE_MS;
  if (Date.now() < until) {
    return { state: "suspected", until: new Date(until).toISOString() };
  }

  const confirmedAt = new Date().toISOString();
  await db
    .from("contacts")
    .update({
      tags: [...tags.filter((t) => t !== SUSPECTED_SCANNER_TAG), MAIL_SCANNER_TAG],
    })
    .eq("id", contactId);
  await patchScannerMeta(db, contactId, { confirmedAt });
  await db.from("notes").insert({
    contact_id: contactId,
    body: "Confirmed mail security scanner: no real open or click within a day of the scanner hit. No more emails will go to this contact. Remove the mail_scanner tag to allow emails again.",
  });
  return { state: "confirmed" };
}

/** Real engagement (a person, not a scanner) clears any scanner suspicion or confirmation. */
export async function clearScannerFlags(db: SupabaseClient, contactId: string | null | undefined) {
  if (!contactId) return false;
  const { data: contact } = await db
    .from("contacts")
    .select("id, tags")
    .eq("id", contactId)
    .maybeSingle();
  const tags = (contact?.tags as string[] | null) ?? [];
  if (!tags.includes(MAIL_SCANNER_TAG) && !tags.includes(SUSPECTED_SCANNER_TAG)) {
    return false;
  }
  await db
    .from("contacts")
    .update({
      tags: tags.filter((t) => t !== MAIL_SCANNER_TAG && t !== SUSPECTED_SCANNER_TAG),
    })
    .eq("id", contactId);
  await patchScannerMeta(db, contactId, { clearedAt: new Date().toISOString() });
  await db.from("notes").insert({
    contact_id: contactId,
    body: "A real person opened or clicked after the scanner hit, so this is not a mail scanner. Emails are back on.",
  });
  return true;
}

/** Scanner-speed engagement on a cold prospect: start the one-day wait. */
export async function markSuspectedScanner(
  db: SupabaseClient,
  input: {
    contactId: string;
    tags: string[];
    event: string;
    sentAt?: string | null;
    eventAt: string;
  },
) {
  await db
    .from("contacts")
    .update({ tags: [...input.tags, SUSPECTED_SCANNER_TAG] })
    .eq("id", input.contactId);
  await patchScannerMeta(db, input.contactId, {
    event: input.event,
    sentAt: input.sentAt ?? null,
    eventAt: input.eventAt,
    suspectedAt: input.eventAt,
  });
  const gapSec = input.sentAt
    ? Math.round((new Date(input.eventAt).getTime() - new Date(input.sentAt).getTime()) / 1000)
    : null;
  await db.from("notes").insert({
    contact_id: input.contactId,
    body: `Possible mail security scanner (${input.event}${gapSec != null ? ` ${gapSec}s after send` : ""}). If nobody really opens or clicks within a day, follow-ups stop. A real open or click clears this.`,
  });
}
