import Link from "next/link";
import { CompetitiveEmailButton } from "@/components/hub/CompetitiveEmailButton";
import { CompetitiveReport } from "@/components/hub/CompetitiveReport";
import { CompetitiveRunForm } from "@/components/hub/CompetitiveRunForm";
import { PrintButton } from "@/components/hub/PrintButton";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import type {
  CompetitiveReport as Report,
  MarketPresence,
  SiteSnapshot,
} from "@/lib/competitive/schema";
import { clientSignUpContact } from "@/lib/clientWins";
import { ensureCompetitiveSchema } from "@/lib/ensureCompetitiveSchema";
import { createClient } from "@/lib/supabase/server";
import { prospectHostKey } from "@/lib/prospectAudit/seedCatalog";
import { companySiteUrl, getWorkspaceClient, resolveClientId } from "@/lib/workspace";

function sameSite(a: string, b: string) {
  const key = (value: string) => prospectHostKey(value.includes("://") ? value : `https://${value}`);
  return Boolean(key(a) && key(a) === key(b));
}

export const dynamic = "force-dynamic";

type Inputs = {
  url: string;
  industry: string;
  location: string;
  competitorUrls: string[];
  companyName?: string;
};

type AnalysisRow = {
  id: string;
  status: string;
  stage: string | null;
  error: string | null;
  inputs: Inputs;
  created_at: string;
  completed_at: string | null;
};

export default async function CompetitivePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  await Promise.race([
    ensureCompetitiveSchema().catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  const companyName = active?.name || "This company";

  const { data: historyData, error: historyError } = await supabase
    .from("competitive_analyses")
    .select("id, status, stage, error, inputs, created_at, completed_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = (historyData ?? []) as AnalysisRow[];

  const running = history.find((r) => r.status === "queued" || r.status === "running");
  // A ?id= from another company's report falls back to this company's latest one.
  const latestCompleted = history.find((r) => r.status === "completed")?.id || null;
  const selectedId =
    searchParams.id && history.some((r) => r.id === searchParams.id) ? searchParams.id : latestCompleted;

  const { data: selected } = selectedId
    ? await supabase
        .from("competitive_analyses")
        .select("id, status, inputs, result, sources, completed_at, client_id")
        .eq("id", selectedId)
        .eq("client_id", clientId)
        .maybeSingle()
    : { data: null };

  const reportCompany = selected
    ? (selected.inputs as Inputs).companyName ||
      ((selected.sources ?? {}) as { company?: SiteSnapshot }).company?.name ||
      companyName
    : companyName;
  const [signUpContact, emailed] = selected?.result
    ? await Promise.all([
        clientSignUpContact(supabase, active?.name || ""),
        supabase
          .from("competitive_analyses")
          .select("emailed_to, emailed_at")
          .eq("id", selected.id)
          .maybeSingle()
          .then((r) => (r.data ?? null) as { emailed_to: string | null; emailed_at: string | null } | null),
      ])
    : [null, null];

  const domain = companySiteUrl(active);
  // Only pre-fill from an analysis of this company's own website.
  const lastInputs = domain
    ? history.find((r) => r.inputs?.url && sameSite(r.inputs.url, domain))?.inputs
    : history[0]?.inputs;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Competitive analysis</h1>
          <WorkspaceScope companyName={active?.name} noun="analyses" />
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            The website you enter is the company being analyzed. DigiSol stays the agency
            writing the report, even when Working on is DigiSol.
          </p>
        </div>
        {selected?.result ? (
          <div className="flex flex-wrap items-start gap-2">
            <CompetitiveEmailButton
              analysisId={selected.id}
              companyName={reportCompany}
              defaultEmail={signUpContact?.email}
              defaultName={signUpContact?.name}
              lastEmailedTo={emailed?.emailed_to}
              lastEmailedAt={emailed?.emailed_at}
            />
            <PrintButton label="Print / save PDF" />
          </div>
        ) : null}
      </div>

      {historyError ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Could not load analyses: {historyError.message}
        </div>
      ) : null}

      <div className="print:hidden">
        <CompetitiveRunForm
          key={clientId}
          companyName={companyName}
          defaults={{
            url: lastInputs?.url || domain,
            industry: lastInputs?.industry || "",
            location: lastInputs?.location || "",
            competitorUrls: [],
          }}
          activeRunId={running?.id ?? null}
          activeStage={running?.stage ?? null}
        />
      </div>

      {history.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
          <span className="text-zinc-500">Past analyses:</span>
          {history.map((r) => (
            <Link
              key={r.id}
              href={`/hub/competitive?id=${r.id}`}
              className={`rounded-full border px-3 py-1 ${
                r.id === selected?.id
                  ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-100"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {new Date(r.created_at).toLocaleDateString()} · {r.status}
            </Link>
          ))}
        </div>
      ) : null}

      {history[0]?.status === "failed" && !running ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          The last analysis failed: {history[0].error || "unknown error"}. Run it again.
        </div>
      ) : null}

      {selected?.result ? (
        <CompetitiveReport
          companyName={reportCompany}
          report={selected.result as Report}
          inputs={selected.inputs as Inputs}
          sources={
            (selected.sources ?? {}) as {
              company?: SiteSnapshot;
              competitors?: SiteSnapshot[];
              presence?: MarketPresence[];
            }
          }
          completedAt={selected.completed_at}
        />
      ) : !running ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
          No analysis for {companyName} yet. Run one above.
        </div>
      ) : null}
    </div>
  );
}
