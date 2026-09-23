import Link from "next/link";
import { Activity, FlaskConical, Mail, Workflow } from "lucide-react";
import { AbAuditVideoCampaignPanel } from "@/components/hub/AbAuditVideoCampaignPanel";
import { AbCampaignBuilder } from "@/components/hub/AbCampaignBuilder";
import { AbCampaignResults } from "@/components/hub/AbCampaignResults";
import { AiWorkflowGenerator } from "@/components/hub/AiWorkflowGenerator";
import { NewWorkflowButton } from "@/components/hub/NewWorkflowButton";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { contactIdsForClient, getActiveClient } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

function pct(part: number, whole: number) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function CampaignsPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  const scopedIds = active ? await contactIdsForClient(supabase, active.id) : null;
  const emptySends = Boolean(active && scopedIds && scopedIds.length === 0);

  let workflowsQuery = supabase
    .from("workflows")
    .select("id, name, trigger, enabled, updated_at")
    .order("updated_at", { ascending: false })
    .limit(40);
  if (active) workflowsQuery = workflowsQuery.eq("client_id", active.id);

  let campaignsQuery = supabase
    .from("campaigns")
    .select(
      "id, name, status, sent_at, created_at, is_ab, industry, winner_variant, template_id, template_b_id",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  if (active) campaignsQuery = campaignsQuery.eq("client_id", active.id);

  let sendsQuery = supabase
    .from("sends")
    .select(
      "id, campaign_id, status, opened_at, clicked_at, bounced_at, created_at, contact_id, variant",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (active && scopedIds && scopedIds.length > 0) {
    sendsQuery = sendsQuery.in("contact_id", scopedIds);
  }

  let runsQuery = supabase
    .from("workflow_runs")
    .select("id, workflow_id, status, started_at, finished_at, log")
    .order("started_at", { ascending: false })
    .limit(20);

  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject")
    .order("updated_at", { ascending: false })
    .limit(40);
  if (active) templatesQuery = templatesQuery.eq("client_id", active.id);

  const [workflowsResult, campaignsPrimary, sendsPrimary, runsResult, templatesResult] =
    await Promise.all([
      workflowsQuery,
      campaignsQuery,
      emptySends ? Promise.resolve({ data: [] as never[], error: null }) : sendsQuery,
      runsQuery,
      templatesQuery,
    ]);

  let campaigns =
    campaignsPrimary.data?.map((row) => ({
      ...row,
      is_ab: Boolean((row as { is_ab?: boolean }).is_ab),
      industry: (row as { industry?: string | null }).industry ?? null,
      winner_variant:
        (row as { winner_variant?: string | null }).winner_variant ?? null,
      template_id: (row as { template_id?: string | null }).template_id ?? null,
      template_b_id:
        (row as { template_b_id?: string | null }).template_b_id ?? null,
    })) ?? [];

  // Fallback if A/B columns are not migrated yet.
  if (campaignsPrimary.error) {
    let fallback = supabase
      .from("campaigns")
      .select("id, name, status, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (active) fallback = fallback.eq("client_id", active.id);
    const retry = await fallback;
    campaigns = (retry.data ?? []).map((row) => ({
      ...row,
      is_ab: false,
      industry: null,
      winner_variant: null,
      template_id: null,
      template_b_id: null,
    }));
  }

  let sends = emptySends ? [] : sendsPrimary.data ?? [];
  if (sendsPrimary.error && !emptySends) {
    let fallbackSends = supabase
      .from("sends")
      .select(
        "id, campaign_id, status, opened_at, clicked_at, bounced_at, created_at, contact_id",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (active && scopedIds && scopedIds.length > 0) {
      fallbackSends = fallbackSends.in("contact_id", scopedIds);
    }
    const retrySends = await fallbackSends;
    sends = (retrySends.data ?? []).map((row) => ({ ...row, variant: null }));
  }

  const workflows = workflowsResult.data ?? [];
  const runs = runsResult.data ?? [];
  const templates = templatesResult.data ?? [];

  const abCampaignIds = campaigns.filter((row) => row.is_ab).map((row) => row.id);
  const { data: auditRows } =
    abCampaignIds.length > 0
      ? await supabase
          .from("campaign_audits")
          .select("id, campaign_id, period, note, winner_pick, created_at")
          .in("campaign_id", abCampaignIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] as {
          id: string;
          campaign_id: string;
          period: string;
          note: string;
          winner_pick: string | null;
          created_at: string;
        }[] };

  const auditsByCampaign = new Map<string, NonNullable<typeof auditRows>>();
  for (const audit of auditRows ?? []) {
    const list = auditsByCampaign.get(audit.campaign_id) ?? [];
    list.push(audit);
    auditsByCampaign.set(audit.campaign_id, list);
  }

  const abCampaigns = campaigns.filter((row) => row.is_ab);

  const workflowNameById = new Map(workflows.map((row) => [row.id, row.name]));
  const contactIdsNeeded = Array.from(
    new Set(sends.map((row) => row.contact_id).filter(Boolean)),
  ) as string[];
  const { data: contactRows } =
    contactIdsNeeded.length > 0
      ? await supabase
          .from("contacts")
          .select("id, email, name")
          .in("id", contactIdsNeeded)
      : { data: [] as { id: string; email: string; name: string | null }[] };
  const contactById = new Map(
    (contactRows ?? []).map((row) => [row.id, row]),
  );
  const workflowIds = new Set(workflows.map((row) => row.id));
  const scopedRuns = active
    ? runs.filter((run) => workflowIds.has(run.workflow_id))
    : runs;

  const sent = sends.length;
  const opened = sends.filter((row) => row.opened_at || row.status === "opened" || row.status === "clicked").length;
  const clicked = sends.filter((row) => row.clicked_at || row.status === "clicked").length;
  const activeWorkflows = workflows.filter((row) => row.enabled).length;
  const draftCampaigns = campaigns.filter((row) => row.status === "draft").length;

  const campaignStats = new Map<
    string,
    { sent: number; opened: number; clicked: number }
  >();
  for (const send of sends) {
    if (!send.campaign_id) continue;
    const current = campaignStats.get(send.campaign_id) || {
      sent: 0,
      opened: 0,
      clicked: 0,
    };
    current.sent += 1;
    if (send.opened_at || send.status === "opened" || send.status === "clicked") {
      current.opened += 1;
    }
    if (send.clicked_at || send.status === "clicked") current.clicked += 1;
    campaignStats.set(send.campaign_id, current);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Campaigns</h1>
          <WorkspaceScope companyName={active?.name} noun="campaigns & workflows" />
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Email campaigns with A/B testing, automation workflows, AI
            generation, and live monitoring — scoped to the company you are
            Working on.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hub/email" className="hub-btn-secondary">
            Compose email
          </Link>
          <NewWorkflowButton />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Workflows on", value: String(activeWorkflows) },
          { label: "Campaign drafts", value: String(draftCampaigns) },
          { label: "Sends (recent)", value: String(sent) },
          {
            label: "Open / click",
            value: `${pct(opened, sent)} / ${pct(clicked, sent)}`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <AbAuditVideoCampaignPanel />

      <AbCampaignBuilder templates={templates} />

      <AiWorkflowGenerator />

      {abCampaigns.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">A/B performance</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {abCampaigns.map((campaign) => (
              <AbCampaignResults
                key={campaign.id}
                campaignId={campaign.id}
                campaignName={campaign.name}
                industry={campaign.industry}
                winnerVariant={campaign.winner_variant}
                sends={sends
                  .filter((send) => send.campaign_id === campaign.id)
                  .map((send) => ({
                    variant: send.variant ?? null,
                    status: send.status,
                    opened_at: send.opened_at,
                    clicked_at: send.clicked_at,
                    bounced_at: send.bounced_at,
                    created_at: send.created_at,
                  }))}
                audits={(auditsByCampaign.get(campaign.id) ?? []).map((audit) => ({
                  id: audit.id,
                  period: audit.period,
                  note: audit.note,
                  winner_pick: audit.winner_pick,
                  created_at: audit.created_at,
                }))}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Workflows</h2>
          </div>
          <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
            {workflows.length === 0 ? (
              <li className="px-4 py-8 text-sm text-zinc-500">
                No workflows yet — generate one with AI or create a blank canvas.
              </li>
            ) : (
              workflows.map((workflow) => (
                <li
                  key={workflow.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/hub/workflows/${workflow.id}`}
                    className="truncate text-white hover:text-indigo-300"
                  >
                    {workflow.name}
                  </Link>
                  <span className="shrink-0 text-sm text-zinc-500">
                    {workflow.trigger}
                    {workflow.enabled ? " · on" : " · off"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-300" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-white">Email campaigns</h2>
            </div>
            <Link href="/hub/email" className="text-sm text-indigo-400 hover:text-indigo-300">
              Open composer
            </Link>
          </div>
          <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
            {campaigns.length === 0 ? (
              <li className="px-4 py-8 text-sm text-zinc-500">
                No campaigns yet. Send from Email to start monitoring opens and
                clicks here.
              </li>
            ) : (
              campaigns.map((campaign) => {
                const stats = campaignStats.get(campaign.id);
                return (
                  <li key={campaign.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-white">{campaign.name}</p>
                      <span className="shrink-0 text-sm text-zinc-500">
                        {campaign.is_ab ? "A/B · " : ""}
                        {campaign.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {campaign.sent_at
                        ? `Sent ${new Date(campaign.sent_at).toLocaleString("en-CA")}`
                        : `Created ${new Date(campaign.created_at).toLocaleString("en-CA")}`}
                      {stats
                        ? ` · ${stats.sent} sends · ${pct(stats.opened, stats.sent)} open · ${pct(stats.clicked, stats.sent)} click`
                        : null}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Monitoring</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">Recent email activity</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {sends.length === 0 ? (
                <li className="text-zinc-500">No sends in this workspace yet.</li>
              ) : (
                sends.slice(0, 12).map((send) => {
                  const contact = send.contact_id
                    ? contactById.get(send.contact_id)
                    : null;
                  return (
                    <li
                      key={send.id}
                      className="flex justify-between gap-3 border-b border-zinc-800/80 py-2 last:border-0"
                    >
                      <span className="truncate text-zinc-300">
                        {contact?.name || contact?.email || "Contact"}
                      </span>
                      <span className="shrink-0 text-zinc-500">
                        {send.variant ? `${send.variant} · ` : ""}
                        {send.status}
                        {send.bounced_at ? " · bounce" : ""}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-semibold text-white">Workflow runs</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {scopedRuns.length === 0 ? (
                <li className="text-zinc-500">
                  No runs yet. Open a workflow and use Run on a contact to test.
                </li>
              ) : (
                scopedRuns.map((run) => {
                  const log = Array.isArray(run.log) ? run.log : [];
                  return (
                    <li
                      key={run.id}
                      className="border-b border-zinc-800/80 py-2 last:border-0"
                    >
                      <div className="flex justify-between gap-3">
                        <Link
                          href={`/hub/workflows/${run.workflow_id}`}
                          className="truncate text-zinc-200 hover:text-indigo-300"
                        >
                          {workflowNameById.get(run.workflow_id) || "Workflow"}
                        </Link>
                        <span className="shrink-0 text-zinc-500">{run.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(run.started_at).toLocaleString("en-CA")}
                        {log.length ? ` · ${log.length} log steps` : ""}
                      </p>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
