import Link from "next/link";
import { AwardActions } from "@/components/hub/AwardActions";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { type AwardRow, syncAwards } from "@/lib/awardRegistry";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AWARD_MIN_SCORE, awardDate, awardLinks, loadAward } from "@/lib/websiteAward";
import { getWorkspaceClient, isDigisolClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AwardsPage() {
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);

  if (!isDigisolClient(active)) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-white">Website awards</h1>
        <WorkspaceScope companyName={active?.name} noun="awards" />
        <p className="max-w-2xl text-sm text-zinc-400">
          The DigiSol Excellence Award is DigiSol&apos;s program, so the list of winners lives in the DigiSol
          workspace. Switch Working on to DigiSol to see who has one. If {active?.name || "this company"}&apos;s own
          site scores {AWARD_MIN_SCORE}+, its badge shows in Analytics under Website audit.
        </p>
      </div>
    );
  }

  const db = hasAdminClient() ? createAdminClient() : supabase;
  const synced = await syncAwards(db).catch((err: unknown) => (err instanceof Error ? err.message : "sync failed"));
  const { data, error } = await db.from("website_awards").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as AwardRow[];
  const states = await Promise.all(rows.map((row) => loadAward(db, row.id)));
  const base = getOutboundSiteUrl();

  const current = states.filter((s) => s.state === "valid").length;
  const sent = rows.filter((r) => r.sent_at).length;
  const live = rows.filter((r) => r.claimed_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Website awards</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Every business that earned the DigiSol Excellence Award ({AWARD_MIN_SCORE}+ on the website audit), from
            prospect outreach and Hub companies. &quot;Badge live&quot; means the badge has loaded on their own site.
            Copy a ready-made mention for social posts, or feature a winner on the public winners page.
          </p>
        </div>
        <a href="/awards" target="_blank" rel="noopener noreferrer" className="hub-btn-secondary">
          Public winners page
        </a>
      </div>

      {error || typeof synced === "string" ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Could not load every award: {error?.message || synced}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awards given" value={rows.length} />
        <Stat label="Still current" value={current} />
        <Stat label="Award emails sent" value={sent} />
        <Stat label="Badge live on their site" value={live} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Badge</th>
              <th className="px-4 py-3 font-medium">Winner</th>
              <th className="px-4 py-3 font-medium">Awarded</th>
              <th className="px-4 py-3 font-medium">Sent to</th>
              <th className="px-4 py-3 font-medium">On their site</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-zinc-500">
                  No awards yet. Prospect audits scoring {AWARD_MIN_SCORE}+ get one in their first email, and Hub
                  companies earn one when their own site scores {AWARD_MIN_SCORE}+.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const state = states[i];
                const valid = state.state === "valid";
                const links = awardLinks(base, row.id);
                const latest = state.state !== "missing" ? state.latest : null;
                return (
                  <tr key={row.id} className="border-t border-zinc-800 align-top">
                    <td className="px-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/award/${row.id}/badge.svg`} alt="" width={160} height={60} className="max-w-none" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{row.company_name}</div>
                      <a
                        href={row.target_url.startsWith("http") ? row.target_url : `https://${row.target_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-300 hover:text-indigo-200"
                      >
                        {row.site_host || row.target_url}
                      </a>
                      <div className="mt-1 text-xs text-zinc-500">
                        {row.source === "prospect" ? "Prospect outreach" : "Hub company"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div>{row.audit_score}/100</div>
                      <div className="text-xs text-zinc-500">{awardDate(row.created_at)}</div>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${
                          valid ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {valid ? "Current" : latest ? `Lapsed (now ${latest.score})` : "Not current"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {row.sent_at ? (
                        <>
                          <div>{row.sent_to}</div>
                          <div className="text-xs text-zinc-500">{new Date(row.sent_at).toLocaleDateString()}</div>
                        </>
                      ) : (
                        <span className="text-zinc-600">Not sent</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.claimed_at ? (
                        <div className="text-emerald-300">
                          Badge live
                          <div className="text-xs text-zinc-500">
                            {row.claimed_from} · {new Date(row.claimed_at).toLocaleDateString()}
                          </div>
                          {row.live_emailed_at ? (
                            <div className="text-xs text-zinc-500">Thank-you emailed</div>
                          ) : null}
                        </div>
                      ) : row.add_page_viewed_at ? (
                        <div className="text-sky-200">
                          Opened add page
                          <div className="text-xs text-zinc-500">
                            {new Date(row.add_page_viewed_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {row.help_emailed_at
                              ? `Help email sent ${new Date(row.help_emailed_at).toLocaleDateString()}`
                              : row.sent_to
                                ? "Help email goes out 3 hours after"
                                : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-600">Not yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AwardActions
                        id={row.id}
                        featured={row.featured}
                        canFeature={valid}
                        verifyUrl={links.verify}
                        mention={mentionText(row.company_name, row.audit_score, links.verify)}
                      />
                      {row.contact_id ? (
                        <Link
                          href={`/hub/contacts/${row.contact_id}`}
                          className="mt-2 block text-xs text-indigo-300 hover:text-indigo-200"
                        >
                          Contact
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function mentionText(company: string, score: number, verifyUrl: string) {
  return `Congratulations to ${company} on earning the DigiSol Excellence Award! Their website scored ${score}/100 on our audit of speed, security and technical SEO. Only sites that score ${AWARD_MIN_SCORE} or higher earn it. Verified here: ${verifyUrl}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
