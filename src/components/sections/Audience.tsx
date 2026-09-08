import { Building2, Rocket } from "lucide-react";

const audiences = [
  {
    icon: Rocket,
    title: "For Startups",
    accent: "blue" as const,
    body: "Rapid deployment, cost-effective full-stack MVP builds, launch strategy, and immediate market positioning—so you ship, get found, and learn in weeks, not quarters.",
    points: [
      "Rapid deployment and lean launch timelines",
      "Cost-effective full-stack MVP builds",
      "Launch strategy and immediate market positioning",
    ],
  },
  {
    icon: Building2,
    title: "For Established Companies",
    accent: "indigo" as const,
    body: "Site performance overhauls, advanced marketing integration, conversion optimization, and modernizing legacy web platforms without stalling the business.",
    points: [
      "Site performance overhauls that restore speed and SEO",
      "Advanced marketing integration across campaigns and product",
      "CRO and modernization of legacy web platforms",
    ],
  },
];

const accent = {
  blue: {
    icon: "bg-blue-500/15 text-blue-300 group-hover:bg-blue-500/25",
    border: "hover:border-blue-400/60 hover:shadow-blue-500/30",
  },
  indigo: {
    icon: "bg-indigo-500/15 text-indigo-300 group-hover:bg-indigo-500/25",
    border: "hover:border-indigo-400/60 hover:shadow-indigo-500/30",
  },
};

export function Audience() {
  return (
    <section
      id="audience"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Target audience
          </p>
          <h2
            id="audience-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Who We Help
          </h2>
          <p className="mt-4 text-zinc-400">
            Different stages. The same dual-threat playbook: code that
            converts, and marketing that can actually ship.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {audiences.map((item) => {
            const Icon = item.icon;
            const styles = accent[item.accent];
            return (
              <article
                key={item.title}
                className={`group rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_40px_-12px] ${styles.border}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300 ${styles.icon}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-semibold text-white sm:text-2xl">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">
                  {item.body}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-200">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="text-indigo-400" aria-hidden="true">
                        —
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
