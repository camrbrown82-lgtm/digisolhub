import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/hub/UnsubscribeForm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe | DigiSol",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string; token?: string };
}) {
  const email = (searchParams.email ?? "").trim().toLowerCase();
  const token = searchParams.token ?? "";
  const valid = Boolean(email && token && verifyUnsubscribeToken(email, token));

  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <h1 className="text-3xl font-semibold text-white">Unsubscribe</h1>
      <p className="mt-3 text-sm text-zinc-400">
        DigiSol campaign email only. Transactional replies to a consultation
        request are separate.
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <UnsubscribeForm email={email} token={token} valid={valid} />
      </div>
    </main>
  );
}
