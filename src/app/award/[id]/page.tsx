import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AwardEmbedCode } from "@/components/AwardEmbedCode";
import { ShareButtons } from "@/components/ShareButtons";
import WebsiteAwardBadge from "@/components/WebsiteAwardBadge";
import { markAddPageViewed } from "@/lib/awardRegistry";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { AWARD_MIN_SCORE, awardDate, awardEmbedHtml, awardLinks, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const robots = { index: false, follow: true };
  if (!hasAdminClient()) return { title: "Verify a DigiSol Excellence Award", robots };
  const award = await loadAward(createAdminClient(), params.id);
  if (award.state !== "valid") return { title: "Verify a DigiSol Excellence Award", robots };
  const title = `${award.companyName} earned the DigiSol Excellence Award`;
  const description = `${award.companyName}'s website scored ${award.score}/100 on DigiSol's website audit for speed, security, and technical SEO. Only sites scoring ${AWARD_MIN_SCORE}+ earn it.`;
  const { verify, badgePng } = awardLinks(getOutboundSiteUrl(), award.auditId);
  const images = [{ url: badgePng, width: 640, height: 240, alt: title }];
  return {
    title,
    description,
    robots,
    openGraph: { title, description, url: verify, type: "website", siteName: "DigiSol", images },
    twitter: { card: "summary_large_image", title, description, images: [badgePng] },
  };
}

export default async function AwardPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { add?: string };
}) {
  if (!hasAdminClient()) notFound();
  const award = await loadAward(createAdminClient(), params.id);
  if (award.state === "missing" || award.state === "not_eligible") notFound();

  const date = awardDate(award.auditedAt);
  const base = getOutboundSiteUrl();
  const { verify } = awardLinks(base, award.auditId);
  const current = award.state === "valid";
  const adding = current && searchParams.add === "1";
  if (adding) await markAddPageViewed(createAdminClient(), award.auditId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      {adding ? (
        <section className="mb-12 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-6">
          <h1 className="text-2xl font-semibold text-white">Add your award badge</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Congratulations, {award.companyName}. Copy the code below and paste it into your website. The badge
            always shows your verified score and links back to this page.
          </p>
          <AwardEmbedCode className="mt-4" embed={awardEmbedHtml(base, award.auditId, award.companyName, award.score)} />
          <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
            <li>WordPress: add a Custom HTML block (the footer widget area works well) and paste.</li>
            <li>Wix: Add → Embed code → Embed HTML, then paste.</li>
            <li>Squarespace: add a Code block and paste.</li>
            <li>Shopify: Online Store → Themes → Edit code → footer section, then paste.</li>
            <li>Custom site: send the code to your web developer. It goes anywhere in the page.</li>
          </ol>
        </section>
      ) : null}

      <h1 className="text-3xl font-semibold text-white">Award verification</h1>
      <p
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          current
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
            : "border-amber-500/40 bg-amber-500/10 text-amber-100"
        }`}
      >
        {current
          ? `Verified. ${award.companyName}'s website (${award.site}) scored ${award.score}/100 on DigiSol's website audit on ${date}.`
          : `This award is no longer current. ${award.companyName}'s website scored ${award.score}/100 on ${date}, but its latest audit on ${awardDate(award.latest!.auditedAt)} scored ${award.latest!.score}/100, below the ${AWARD_MIN_SCORE} needed.`}
      </p>

      {current ? (
        <div className="mt-8">
          <WebsiteAwardBadge companyName={award.companyName} score={award.score} date={date} verifyUrl={verify} />
          <ShareButtons
            className="mt-8"
            url={verify}
            caption={`${award.companyName}'s website earned the DigiSol Excellence Award, scoring ${award.score}/100 on DigiSol's website audit for speed, security, and technical SEO. Verified: ${verify}`}
            analyticsKey={`award_${award.auditId}`}
            heading="Share this award"
          />
        </div>
      ) : null}

      <section className="mt-10 space-y-3 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-white">What the award means</h2>
        <p>
          DigiSol gives the Excellence Award to businesses whose own website scores {AWARD_MIN_SCORE} or higher on
          its website audit. The audit checks how fast the server responds, HTTPS, page titles and descriptions,
          headings, structured data, and other technical SEO basics.
        </p>
        <p>
          The award reflects the audit on the date shown. If a newer audit of the same site scores below{" "}
          {AWARD_MIN_SCORE}, this page and the badge say so.
        </p>
        {award.latest && current ? (
          <p>
            Latest audit: {award.latest.score}/100 on {awardDate(award.latest.auditedAt)}.
          </p>
        ) : null}
      </section>

      <p className="mt-10 flex gap-6 text-sm">
        <Link href="/awards" className="text-indigo-300 hover:text-indigo-200">
          See award winners
        </Link>
        <Link href="/blog/digisol-excellence-award-website-badge" className="text-indigo-300 hover:text-indigo-200">
          About the award
        </Link>
        <Link href="/" className="text-indigo-300 hover:text-indigo-200">
          About DigiSol
        </Link>
      </p>
    </main>
  );
}
