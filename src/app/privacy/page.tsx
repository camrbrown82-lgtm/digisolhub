import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import {
  DIGISOL_ADDRESS_LINE,
  DIGISOL_EMAIL,
  DIGISOL_PHONE,
  DIGISOL_SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | DigiSol",
  description:
    "How DigiSol collects, uses, and protects personal information when you visit wwwdigisol.com, chat with Kaylev, request a consult, or use DigiSol services.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | DigiSol",
    description:
      "DigiSol’s privacy practices for our website, chat, email, analytics, and client services.",
    url: `${DIGISOL_SITE_URL}/privacy`,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "website",
  },
};

const EFFECTIVE_DATE = "September 23, 2026";

const PRIVACY_EMAIL = DIGISOL_EMAIL;

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-zinc-950 to-zinc-950"
          aria-hidden="true"
        />
        <article className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-medium tracking-wide text-indigo-300">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            Effective date: {EFFECTIVE_DATE}
          </p>
          <p className="mt-6 text-base leading-relaxed text-zinc-300">
            DigiSol (“DigiSol,” “we,” “us,” or “our”) operates{" "}
            <a
              href={DIGISOL_SITE_URL}
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              wwwdigisol.com
            </a>{" "}
            and related services for website design, development, SEO, and
            digital marketing. This policy explains what personal information we
            collect, why we collect it, how we use it, and the choices available
            to you. DigiSol is based in Airdrie, Alberta, Canada.
          </p>

          <div className="mt-12 space-y-10 text-sm leading-relaxed text-zinc-300">
            <Section title="1. Who we are">
              <p>
                DigiSol is operated by Cameron Brown, Founder &amp; CEO.
                Headquarters: {DIGISOL_ADDRESS_LINE}. Phone:{" "}
                <a
                  href={`tel:${DIGISOL_PHONE.replace(/[^\d+]/g, "")}`}
                  className="text-sky-300 underline-offset-2 hover:underline"
                >
                  {DIGISOL_PHONE}
                </a>
                . Privacy requests:{" "}
                <a
                  href={`mailto:${PRIVACY_EMAIL}?subject=Privacy%20request`}
                  className="text-sky-300 underline-offset-2 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
                .
              </p>
            </Section>

            <Section title="2. Information we collect">
              <p>We may collect:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-400">
                <li>
                  <span className="text-zinc-200">Contact and inquiry data</span>{" "}
                  — name, email, business name, service interest, and message
                  details you submit through our contact form, email, phone, or
                  LinkedIn.
                </li>
                <li>
                  <span className="text-zinc-200">Chat data</span> — messages
                  you send to Kaylev (our on-site visitor assistant), plus
                  related context needed to answer and follow up (for example,
                  contact details you choose to share for a consultation).
                </li>
                <li>
                  <span className="text-zinc-200">Marketing &amp; CRM data</span>{" "}
                  — business contact details we use for outreach that complies
                  with Canada’s Anti-Spam Legislation (CASL), including
                  unsubscribe preferences.
                </li>
                <li>
                  <span className="text-zinc-200">Account &amp; client data</span>{" "}
                  — information needed to deliver contracted work and Hub access
                  (for example, company details, project notes, brand assets you
                  provide, and campaign contacts you upload or authorize).
                </li>
                <li>
                  <span className="text-zinc-200">Payment data</span> — billing
                  details processed by Stripe when you purchase services. We do
                  not store full payment card numbers on DigiSol servers.
                </li>
                <li>
                  <span className="text-zinc-200">
                    Usage, device, and analytics data
                  </span>{" "}
                  — pages viewed, approximate location derived from IP, device
                  and browser type, referral source, and interaction events used
                  to understand site performance and advertising results.
                </li>
                <li>
                  <span className="text-zinc-200">Email engagement data</span> —
                  delivery, open, and click signals for emails we send (when
                  tracking is enabled), so we can improve relevance and
                  reporting.
                </li>
              </ul>
            </Section>

            <Section title="3. How we use information">
              <p>We use personal information to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-400">
                <li>Respond to inquiries and provide quotes or consultations</li>
                <li>Operate Kaylev and related follow-up communications</li>
                <li>Deliver website, SEO, marketing, and Hub services</li>
                <li>Process payments and manage subscriptions</li>
                <li>
                  Send service-related and (where permitted) commercial
                  electronic messages, with unsubscribe options where required
                </li>
                <li>
                  Measure and improve our website, campaigns, and conversion
                  paths
                </li>
                <li>Maintain security, prevent abuse, and meet legal obligations</li>
              </ul>
            </Section>

            <Section title="4. Cookies and similar technologies">
              <p>
                We use cookies and similar technologies on the public website for
                analytics and advertising measurement (including Google Analytics
                and Google Ads tags where configured). These help us understand
                traffic and campaign performance. You can control cookies through
                your browser settings. Blocking some cookies may limit analytics
                accuracy but generally will not prevent you from browsing the
                site or contacting us.
              </p>
              <p className="mt-3">
                DigiSol Hub login sessions use authentication cookies necessary
                to keep your account signed in securely.
              </p>
            </Section>

            <Section title="5. AI-assisted features">
              <p>
                Kaylev and certain Hub tools use artificial intelligence (for
                example, OpenAI) to generate responses, drafts, summaries, or
                recommendations. Content you submit in those features may be
                processed by those providers solely to fulfill the request.
                Please avoid submitting sensitive personal information you do not
                want processed for that purpose.
              </p>
            </Section>

            <Section title="6. Who we share information with">
              <p>
                We do not sell your personal information. We share it only as
                needed with service providers who help us operate DigiSol, under
                appropriate contractual or platform terms, including:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-400">
                <li>Hosting and infrastructure (for example, Vercel)</li>
                <li>Databases and authentication (for example, Supabase)</li>
                <li>Email delivery and tracking (for example, Resend)</li>
                <li>Payments (Stripe)</li>
                <li>Analytics and ads measurement (Google)</li>
                <li>AI processing for chat and Hub features (for example, OpenAI)</li>
              </ul>
              <p className="mt-3">
                We may also disclose information if required by law, to protect
                rights and safety, or in connection with a business transfer.
              </p>
            </Section>

            <Section title="7. Email and CASL">
              <p>
                Commercial emails from DigiSol include identification and an
                unsubscribe mechanism where required under CASL. You can also
                email{" "}
                <a
                  href={`mailto:${PRIVACY_EMAIL}?subject=Unsubscribe`}
                  className="text-sky-300 underline-offset-2 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>{" "}
                or use the unsubscribe link in campaign messages. Transactional
                messages about an active request or service may still be sent
                when needed to fulfill that request.
              </p>
            </Section>

            <Section title="8. Retention">
              <p>
                We keep personal information only as long as needed for the
                purposes described above, including to maintain business records,
                resolve disputes, enforce agreements, and meet legal or
                accounting requirements. Inquiry and lead records are typically
                retained while a relationship is active or reasonably expected,
                then deleted or anonymized when no longer required.
              </p>
            </Section>

            <Section title="9. Security">
              <p>
                We use reasonable administrative and technical safeguards
                appropriate to the nature of the information (including encrypted
                transport and access controls for Hub systems). No method of
                transmission or storage is completely secure; please contact us
                promptly if you believe your information has been compromised.
              </p>
            </Section>

            <Section title="10. Your rights and choices">
              <p>
                Depending on applicable Canadian privacy law (including PIPEDA
                and Alberta’s PIPA where it applies), you may request access to,
                correction of, or deletion of personal information we hold about
                you, subject to legal exceptions. You may also withdraw consent
                for optional processing (such as marketing email) without
                affecting processing that is necessary to provide a requested
                service.
              </p>
              <p className="mt-3">
                To exercise these rights, email{" "}
                <a
                  href={`mailto:${PRIVACY_EMAIL}?subject=Privacy%20request`}
                  className="text-sky-300 underline-offset-2 hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
                . We will respond within a reasonable time.
              </p>
            </Section>

            <Section title="11. Children">
              <p>
                DigiSol services are directed to businesses and adults. We do not
                knowingly collect personal information from children under 13. If
                you believe a child has provided information to us, contact us and
                we will take appropriate steps to delete it.
              </p>
            </Section>

            <Section title="12. International transfers">
              <p>
                DigiSol is based in Canada. Some service providers may process
                data in other countries (including the United States). When that
                happens, information may be subject to the laws of those
                jurisdictions.
              </p>
            </Section>

            <Section title="13. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. The
                effective date at the top of this page will change when we do.
                Continued use of the site or services after an update means you
                accept the revised policy.
              </p>
            </Section>

            <Section title="14. Contact">
              <p>
                Questions about this policy or DigiSol’s privacy practices:
              </p>
              <ul className="mt-3 list-none space-y-1 text-zinc-400">
                <li>
                  Email:{" "}
                  <a
                    href={`mailto:${PRIVACY_EMAIL}`}
                    className="text-sky-300 underline-offset-2 hover:underline"
                  >
                    {PRIVACY_EMAIL}
                  </a>
                </li>
                <li>
                  Phone:{" "}
                  <a
                    href={`tel:${DIGISOL_PHONE.replace(/[^\d+]/g, "")}`}
                    className="text-sky-300 underline-offset-2 hover:underline"
                  >
                    {DIGISOL_PHONE}
                  </a>
                </li>
                <li>Mail: DigiSol, {DIGISOL_ADDRESS_LINE}</li>
              </ul>
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
