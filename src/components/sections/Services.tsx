import { Code2, Megaphone, TrendingUp, ShoppingBag, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";

const services: {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: BrandAccent;
}[] = [
  {
    icon: Code2,
    title: "Custom Web & App Development",
    body: "React, Next.js, and custom platforms engineered for high performance—no template bloat, no brittle page builders.",
    accent: "blue",
  },
  {
    icon: Megaphone,
    title: "Search & Paid Media Campaigns",
    body: "Targeted Meta Ads, Search Ads, and local SEO built to dominate the queries and audiences that actually convert.",
    accent: "indigo",
  },
  {
    icon: TrendingUp,
    title: "Full-Funnel Integration & CRO",
    body: "Turn visitors into leads with custom analytics, conversion paths, and email/lead workflows wired into the product.",
    accent: "blue",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce & Platform Solutions",
    body: "Scalable online stores and custom auction/web platforms designed to sell, list, and grow without fighting the stack.",
    accent: "indigo",
  },
];

export function Services() {
  return (
    <section
      id="services"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="services-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Core services
          </p>
          <h2
            id="services-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Engineering &amp; Marketing Solutions
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Four practices, one engagement. Ship the platform, fill the funnel,
            and keep both in the same loop.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map(({ icon: Icon, title, body, accent }) => {
            const styles = brandAccent[accent];
            return (
              <li key={title} className="h-full">
                <BrandCard accent={accent} className="h-full">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                    {body}
                  </p>
                </BrandCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
