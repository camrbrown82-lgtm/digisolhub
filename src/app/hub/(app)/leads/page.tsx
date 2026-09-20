import Link from "next/link";
import { LeadBoard } from "@/components/hub/LeadBoard";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import {
  type LeadRecord,
  summarizeLeadPerformance,
} from "@/lib/lead-pipeline";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

function money(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function LeadsPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  let query = supabase
    .from("leads")
    .select(
      "id, client_id, contact_id, name, email, phone, company, service, source, channel, location, campaign, stage, estimated_value, actual_value, lost_reason, next_follow_up_at, first_touch_at, last_touch_at, closed_at, notes_preview, created_at",
    )
    .order("last_touch_at", { ascending: false });
  if (active) query = query.eq("client_id", active.id);

  const { data } = await query;
  const leads = (data ?? []) as LeadRecord[];
  const stats = summarizeLeadPerformance(leads);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Leads</h1>
          <WorkspaceScope companyName={active?.name} noun="field leads" />
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Log boots-on-the-ground conversations and move each one from first
            contact through close. Performance rolls into Analytics.
          </p>
        </div>
        <Link href="/hub/leads/new" className="hub-btn">
          New lead
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Open", value: String(stats.open) },
          { label: "Won", value: String(stats.won) },
          { label: "Win rate", value: `${stats.winRate}%` },
          { label: "Pipeline", value: money(stats.pipelineValue) },
          { label: "Closed value", value: money(stats.wonValue) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <LeadBoard leads={leads} />
    </div>
  );
}
