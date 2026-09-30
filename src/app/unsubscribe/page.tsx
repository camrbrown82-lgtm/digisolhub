import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/hub/UnsubscribeForm";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

async function senderName(email: string) {
  if (!hasAdminClient()) return DIGISOL_HOUSE_NAME;
  const { data } = await createAdminClient()
    .from("contacts")
    .select("clients(name)")
    .ilike("email", email)
    .maybeSingle();
  const client = (data as { clients?: { name?: string | null } | null } | null)?.clients;
  return client?.name?.trim() || DIGISOL_HOUSE_NAME;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string; token?: string };
}) {
  const email = (searchParams.email ?? "").trim().toLowerCase();
  const token = searchParams.token ?? "";
  const valid = Boolean(email && token && verifyUnsubscribeToken(email, token));
  const companyName = valid ? await senderName(email) : "";

  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-3xl font-semibold text-white">Unsubscribe</h1>
      <p className="mt-3 text-sm text-zinc-400">
        {companyName || "Campaign"} email only. Transactional messages, like receipts or replies
        to a request, are separate.
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <UnsubscribeForm email={email} token={token} valid={valid} companyName={companyName} />
      </div>
    </main>
  );
}
