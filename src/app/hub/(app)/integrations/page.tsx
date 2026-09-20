import { parseFromAddress } from "@/lib/email";
import { DispatchSendButton } from "@/components/hub/DispatchSendButton";

function status(ok: boolean) {
  return ok ? "Configured" : "Missing";
}

export default function IntegrationsPage() {
  const from = parseFromAddress(
    process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || "",
  );
  const rows = [
    { name: "Supabase", ok: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "Resend", ok: Boolean(process.env.RESEND_API_KEY) },
    {
      name: "Resend From",
      ok: Boolean(from.email) && !from.isTest,
      detail: from.email || "Missing",
    },
    { name: "OpenAI", ok: Boolean(process.env.OPENAI_API_KEY?.trim()) },
    { name: "Inngest", ok: Boolean(process.env.INNGEST_EVENT_KEY) },
    { name: "Dispatch cron secret", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    { name: "Web3Forms", ok: Boolean(process.env.WEB3FORMS_ACCESS_KEY || process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY) },
    { name: "Google Ads", ok: Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()) },
    {
      name: "GA4 Data API",
      ok: Boolean(
        process.env.GA4_PROPERTY_ID?.trim() &&
          (process.env.GA4_CLIENT_EMAIL?.trim() || process.env.GOOGLE_CLIENT_EMAIL?.trim()) &&
          (process.env.GA4_PRIVATE_KEY?.trim() || process.env.GOOGLE_PRIVATE_KEY?.trim()),
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-400">
          API keys stay in Vercel / .env.local. This page only shows whether each
          connector is present — never the secret itself.
        </p>
      </div>
      <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-white">{row.name}</span>
            <span className={row.ok ? "text-indigo-300" : "text-zinc-500"}>
              {"detail" in row && row.detail ? row.detail : status(row.ok)}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <p>
          Point Web3Forms (or any form webhook) at{" "}
          <code className="text-zinc-200">/api/leads</code>. The landing form
          already posts there after a successful Web3Forms submit.
        </p>
        <p className="mt-3">
          Resend webhook URL:{" "}
          <code className="text-zinc-200">/api/webhooks/resend</code> for
          opened/clicked/bounced.
        </p>
        <p className="mt-3">
          DigiSol Dispatch: readers subscribe after an issue. A daily cron at{" "}
          <code className="text-zinc-200">/api/cron/dispatch</code> emails the
          list when a new issue is published. Set{" "}
          <code className="text-zinc-200">CRON_SECRET</code> in Vercel. Contacts
          are tagged <code className="text-zinc-200">dispatch</code>.
        </p>
        <DispatchSendButton />
        <p className="mt-3">
          Google Ads: set <code className="text-zinc-200">NEXT_PUBLIC_GOOGLE_ADS_ID</code>{" "}
          to the <code className="text-zinc-200">AW-***********</code> ID, and{" "}
          <code className="text-zinc-200">NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL</code>{" "}
          to the consult conversion label. Then open{" "}
          <a
            href="https://ads.google.com/"
            className="text-indigo-300 underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ads.google.com
          </a>{" "}
          and link that account to Analytics property G-4ZBG4VPC9C.
        </p>
        <p className="mt-3">
          GA4 into Hub Analytics: set{" "}
          <code className="text-zinc-200">GA4_PROPERTY_ID</code> (numeric ID),{" "}
          <code className="text-zinc-200">GA4_CLIENT_EMAIL</code>, and{" "}
          <code className="text-zinc-200">GA4_PRIVATE_KEY</code>. Create a Google
          Cloud service account, enable the Google Analytics Data API, download a
          JSON key, and add that email as a Viewer on the DigiSol GA4 property.
        </p>
        <p className="mt-3">
          AI posters need <code className="text-zinc-200">OPENAI_API_KEY</code> on
          Vercel Production. Use a secret key from platform.openai.com. If
          gpt-image-1 is unauthorized, set{" "}
          <code className="text-zinc-200">OPENAI_IMAGE_MODEL=dall-e-3</code>.
        </p>
      </div>
    </div>
  );
}
