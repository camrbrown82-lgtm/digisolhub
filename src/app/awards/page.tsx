import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ShareButtons } from "@/components/ShareButtons";
import { DIGISOL_SITE_URL } from "@/lib/site";
import WebsiteAwardBadge from "@/components/WebsiteAwardBadge";
import { awardBadgeTheme } from "@/lib/awardTheme";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { AWARD_MIN_SCORE, awardDate, awardLinks, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";

const DESCRIPTION = `Businesses whose websites scored ${AWARD_MIN_SCORE}+ on DigiSol's website audit for speed, security, and technical SEO.`;
const ABOUT_POST = "/blog/digisol-excellence-award-website-badge";

export const metadata: Metadata = {
  title: "DigiSol Excellence Award winners | DigiSol",
  description: DESCRIPTION,
  alternates: { canonical: "/awards" },
  openGraph: {
    title: "DigiSol Excellence Award winners",
    description: DESCRIPTION,
    url: `${DIGISOL_SITE_URL}/awards`,
    type: "website",
    siteName: "DigiSol",
    images: [{ url: `${ABOUT_POST}/card.jpg`, width: 1200, height: 630, alt: "DigiSol Excellence Award" }],
  },
  twitter: { card: "summary_large_image", images: [`${ABOUT_POST}/card.jpg`] },
};

async function featuredWinners() {
  if (!hasAdminClient()) return [];
  const db = createAdminClient();
  const { data } = await db
    .from("website_awards")
    .select("id")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(60);
  const awards = await Promise.all((data ?? []).map((row) => loadAward(db, row.id as string)));
  return awards.filter((a) => a.state === "valid");
}

export default async function AwardWinnersPage() {
  const [winners, theme] = await Promise.all([featuredWinners().catch(() => []), awardBadgeTheme()]);
  const base = getOutboundSiteUrl();

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-5xl px-4 py-20">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">DigiSol Excellence Award winners</h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          The award goes to businesses whose own website scores {AWARD_MIN_SCORE} or higher on DigiSol&apos;s website
          audit. It checks server speed, HTTPS, page titles and descriptions, headings, structured data, and other
          technical SEO basics. Every badge links to a live verification page.{" "}
          <Link href={ABOUT_POST} className="text-sky-300 hover:text-sky-200">
            How the award works
          </Link>
        </p>

        {winners.length === 0 ? (
          <p className="mt-12 text-zinc-500">The first winners will be listed here soon.</p>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {winners.map((w) =>
              w.state === "valid" ? (
                <WebsiteAwardBadge
                  key={w.auditId}
                  companyName={w.companyName}
                  score={w.score}
                  date={awardDate(w.auditedAt)}
                  verifyUrl={awardLinks(base, w.auditId).verify}
                  theme={theme}
                />
              ) : null,
            )}
          </div>
        )}

        <ShareButtons
          className="mt-12"
          url={`${DIGISOL_SITE_URL}/awards`}
          caption={`Meet the DigiSol Excellence Award winners: local businesses whose websites scored ${AWARD_MIN_SCORE}+ on our audit for speed, security, and technical SEO. ${DIGISOL_SITE_URL}/awards`}
          analyticsKey="awards_index"
          heading="Share the winners"
        />

        <section className="mt-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">How does your website score?</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Get a free audit. If your site scores {AWARD_MIN_SCORE}+, the award and badge are yours.
          </p>
          <Link href="/#contact" className="mt-4 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200">
            Request a free website audit
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
