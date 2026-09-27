import { resolveMx } from "dns/promises";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Last check before Resend. CASL publication is decided in casl.ts.
 * This stops addresses that would bounce: no mail server, or a prior bounce.
 */
export async function prospectSendBlockReason(
  db: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1] || "";
  if (!domain || !normalized.includes("@")) {
    return "Address is not a usable email. Not sending.";
  }
  if (await previouslyBounced(db, normalized)) {
    return "This address already bounced. Kaylev will not send to it again.";
  }
  if (!(await domainAcceptsMail(domain))) {
    return "This domain has no mail server (MX). Sending would bounce, so Kaylev skipped it.";
  }
  return null;
}

async function previouslyBounced(db: SupabaseClient, email: string) {
  const { data: contacts } = await db
    .from("contacts")
    .select("id")
    .ilike("email", email)
    .limit(5);
  const ids = (contacts ?? [])
    .map((row) => row.id as string)
    .filter(Boolean);
  if (!ids.length) return false;

  const { count: bouncedAt } = await db
    .from("sends")
    .select("id", { count: "exact", head: true })
    .in("contact_id", ids)
    .not("bounced_at", "is", null);
  if ((bouncedAt ?? 0) > 0) return true;

  const { count: bouncedStatus } = await db
    .from("sends")
    .select("id", { count: "exact", head: true })
    .in("contact_id", ids)
    .eq("status", "bounced");
  return (bouncedStatus ?? 0) > 0;
}

async function domainAcceptsMail(domain: string) {
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("mx_timeout")), 4000),
      ),
    ]);
    return records.some((row) => {
      const exchange = (row.exchange || "").replace(/\.$/, "").toLowerCase();
      return Boolean(exchange) && exchange !== ".";
    });
  } catch {
    return false;
  }
}
