import Link from "next/link";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { ensureProspectsSchema } from "@/lib/ensureProspectsSchema";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient, resolveClientId } from "@/lib/workspace";

type ProspectRow = {
  id: string;
  business_name: string | null;
  url: string;
  trade: string;
  city: string | null;
  contact_email: string | null;
  audit_status: string;
  audit_score: number | null;
  casl_status: string;
  emailed_at: string | null;
  last_audited_at: string | null;
  engaged_at: string | null;
  contact_id: string | null;
  error_message: string | null;
  created_at: string;
};

export default async function ProspectsPage() {
  await ensureProspectsSchema().catch(() => null);
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";

  let query = supabase
    .from("prospects")
    .select(
      "id, business_name, url, trade, city, contact_email, audit_status, audit_score, casl_status, emailed_at, last_audited_at, engaged_at, contact_id, error_message, created_at",
    )
    .order("last_audited_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  const rows = (data ?? []) as ProspectRow[];

  const emailed = rows.filter((r) => r.emailed_at || r.audit_status === "emailed" || r.audit_status === "promoted").length;
  const pending = rows.filter((r) => r.audit_status === "pending" || r.audit_status === "failed").length;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const auditedToday = rows.filter(
    (r) => r.last_audited_at && r.last_audited_at >= todayIso,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Prospect audits</h1>
          <WorkspaceScope companyName={active?.name} noun="prospect audits" />
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Daily automated website audits (max 5/day, CASL-gated). Each emailed
            audit also lands in Contacts as a lead so you can see exactly who
            received it.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Schedule:{" "}
            <code className="text-zinc-300">/api/cron/prospect-audit</code> runs
            daily at <span className="text-zinc-300">15:00 UTC</span> (9:00 AM
            Mountain Daylight / 8:00 AM Mountain Standard). Results appear in
            this table and under Contacts filtered by prospect audit.
          </p>
        </div>
        <Link href="/hub/contacts?source=prospect_audit" className="hub-btn">
          View audit leads
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Could not load prospects: {error.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Audited today (UTC)" value={auditedToday} />
        <Stat label="Emailed / promoted" value={emailed} />
        <Stat label="Still in queue" value={pending} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Sent to</th>
              <th className="px-4 py-3 font-medium">Trade</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Audited</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-zinc-500">
                  No prospects in the queue yet. Seed rows in{" "}
                  <code className="text-zinc-300">prospects</code> (url, trade,
                  city) and the daily cron will pick them up.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-800 align-top">
                  <td className="px-4 py-3">
                    <div className="text-white">
                      {row.business_name || hostFromUrl(row.url)}
                    </div>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      {row.url.replace(/^https?:\/\//, "").slice(0, 48)}
                    </a>
                    {row.city ? (
                      <div className="text-xs text-zinc-500">{row.city}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.contact_email || (
                      <span className="text-zinc-600">— pending CASL</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{row.trade}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.audit_score != null ? `${row.audit_score}/100` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.audit_status} casl={row.casl_status} />
                    {row.error_message ? (
                      <div className="mt-1 max-w-[220px] text-xs text-amber-200/80">
                        {row.error_message.slice(0, 120)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {row.last_audited_at
                      ? new Date(row.last_audited_at).toLocaleString()
                      : "—"}
                    {row.emailed_at ? (
                      <div className="text-xs text-zinc-500">
                        emailed {new Date(row.emailed_at).toLocaleDateString()}
                      </div>
                    ) : null}
                    {row.engaged_at ? (
                      <div className="text-xs text-emerald-400/90">engaged</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.contact_id ? (
                      <Link
                        href={`/hub/contacts/${row.contact_id}`}
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        Contact
                      </Link>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status, casl }: { status: string; casl: string }) {
  const tone =
    status === "emailed" || status === "promoted"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "casl_blocked"
        ? "bg-amber-500/15 text-amber-200"
        : status === "failed"
          ? "bg-rose-500/15 text-rose-300"
          : status === "processing"
            ? "bg-indigo-500/15 text-indigo-300"
            : "bg-zinc-800 text-zinc-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tone}`}>
      {status}
      {casl && casl !== "pending" && casl !== "eligible" && casl !== "sent"
        ? ` · ${casl}`
        : ""}
    </span>
  );
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
