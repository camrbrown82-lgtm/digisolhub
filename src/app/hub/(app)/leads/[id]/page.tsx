import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/hub/LeadForm";
import { LeadTimeline } from "@/components/hub/LeadTimeline";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  labelFor,
  leadDisplayName,
  type LeadRecord,
} from "@/lib/lead-pipeline";
import { createClient } from "@/lib/supabase/server";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lead) notFound();

  const { data: activities } = await supabase
    .from("lead_activities")
    .select("id, type, body, from_stage, to_stage, occurred_at")
    .eq("lead_id", params.id)
    .order("occurred_at", { ascending: false });

  const record = lead as LeadRecord;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/hub/leads" className="hover:text-indigo-300">
            Leads
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-white">
          {leadDisplayName(record)}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {labelFor(LEAD_SOURCES, record.source)} · {labelFor(LEAD_STAGES, record.stage)}
          {record.location ? ` · ${record.location}` : ""}
        </p>
      </div>
      <LeadForm leadId={record.id} initial={record} clients={clients ?? []} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Conversation</h2>
        <LeadTimeline leadId={record.id} activities={activities ?? []} />
      </section>
    </div>
  );
}
