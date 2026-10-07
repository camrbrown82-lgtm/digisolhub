import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AwardEmbedCode } from "@/components/AwardEmbedCode";
import {
  competitiveBadgeDate,
  competitiveBadgeEmbedHtml,
  competitiveBadgeLinks,
  loadPublicCompetitiveBadge,
} from "@/lib/competitive/publicBadge";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getOutboundSiteUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string; key: string };
}): Promise<Metadata> {
  const robots = { index: false, follow: true };
  if (!hasAdminClient()) return { title: "DigiSol award", robots };
  const badge = await loadPublicCompetitiveBadge(createAdminClient(), params.id, params.key);
  if (!badge) return { title: "DigiSol award", robots };
  const title = `${badge.companyName} earned a DigiSol award`;
  const description = `${badge.companyName} earned ${badge.title} (${badge.score}/100) on a DigiSol competitive analysis.`;
  return { title, description, robots };
}

export default async function CompetitiveBadgePage({
  params,
  searchParams,
}: {
  params: { id: string; key: string };
  searchParams: { add?: string };
}) {
  if (!hasAdminClient()) notFound();
  const badge = await loadPublicCompetitiveBadge(createAdminClient(), params.id, params.key);
  if (!badge) notFound();

  const base = getOutboundSiteUrl();
  const links = competitiveBadgeLinks(base, badge.analysisId, badge.key);
  const embed = competitiveBadgeEmbedHtml(base, badge);
  const adding = searchParams.add === "1";
  const date = competitiveBadgeDate(badge.earnedAt);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-6">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {adding ? "Add this badge to your site" : "Award verification"}
        </h1>
        <p className="mt-2 text-sm text-zinc-300">
          {badge.companyName} earned <strong className="text-white">{badge.title}</strong> ({badge.score}/100) on{" "}
          {date}. {badge.covers}.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={links.badge}
          alt={`${badge.companyName}: ${badge.title}, ${badge.score}/100`}
          width={480}
          height={180}
          className="mx-auto mt-6 max-w-full"
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href={links.download}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Download badge (PNG)
          </a>
          <a
            href={`${links.badge}?download=1`}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-indigo-400"
          >
            Download badge (SVG)
          </a>
        </div>
        <p className="mt-6 text-sm text-zinc-300">
          Paste the code below anywhere on your website. The badge image stays on DigiSol, and clicking it opens this
          page so visitors can check the score.
        </p>
        <AwardEmbedCode className="mt-3" embed={embed} />
        <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
          <li>WordPress: add a Custom HTML block (the footer works well) and paste.</li>
          <li>Wix: Add → Embed code → Embed HTML, then paste.</li>
          <li>Squarespace: add a Code block and paste.</li>
          <li>Shopify: Online Store → Themes → Edit code → footer section, then paste.</li>
          <li>Custom site: send the code to whoever runs the website. It goes anywhere on the page.</li>
        </ol>
      </section>

      <p className="mt-8 text-sm text-zinc-400">{badge.detail}</p>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          About DigiSol
        </Link>
      </p>
    </main>
  );
}
