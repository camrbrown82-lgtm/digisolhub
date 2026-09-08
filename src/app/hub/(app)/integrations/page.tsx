function status(ok: boolean) {
  return ok ? "Configured" : "Missing";
}

export default function IntegrationsPage() {
  const rows = [
    { name: "Supabase", ok: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "Resend", ok: Boolean(process.env.RESEND_API_KEY) },
    { name: "OpenAI", ok: Boolean(process.env.OPENAI_API_KEY) },
    { name: "Inngest", ok: Boolean(process.env.INNGEST_EVENT_KEY) },
    { name: "Web3Forms", ok: Boolean(process.env.WEB3FORMS_ACCESS_KEY || process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY) },
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
              {status(row.ok)}
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
          Inngest serve path:{" "}
          <code className="text-zinc-200">/api/inngest</code>
        </p>
      </div>
    </div>
  );
}
