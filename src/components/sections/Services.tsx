import { Code2, Megaphone, TrendingUp, ShoppingBag } from "lucide-react";

const services = [
  {
    icon: Code2,
    title: "Custom Web & App Development",
    body: "React, Next.js, and custom platforms engineered for high performance—no template bloat, no brittle page builders.",
  },
  {
    icon: Megaphone,
    title: "Search & Paid Media Campaigns",
    body: "Targeted Meta Ads, Search Ads, and local SEO built to dominate the queries and audiences that actually convert.",
  },
  {
    icon: TrendingUp,
    title: "Full-Funnel Integration & CRO",
    body: "Turn visitors into leads with custom analytics, conversion paths, and email/lead workflows wired into the product.",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce & Platform Solutions",
    body: "Scalable online stores and custom auction/web platforms designed to sell, list, and grow without fighting the stack.",
  },
];

export function Services() {
  return (
    <section
      id="services"
      className="border-t border-white/10 bg-zinc-900/40 px-4 py-20 sm:px-6 lg:px-8"
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
          {services.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <article className="group h-full rounded-2xl border border-white/10 bg-zinc-950/80 p-8 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-indigo-400/60 hover:shadow-[0_0_40px_-12px] hover:shadow-indigo-500/40">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 transition-colors duration-300 group-hover:bg-indigo-500/25 group-hover:text-indigo-200">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">
                  {body}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
