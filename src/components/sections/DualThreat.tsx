import {
  Code2,
  Megaphone,
  Zap,
  LayoutTemplate,
  Plug,
  Filter,
  Target,
  MapPin,
  LineChart,
  type LucideIcon,
} from "lucide-react";

type Advantage = {
  icon: LucideIcon;
  title: string;
  items: { icon: LucideIcon; text: string }[];
  accent: "blue" | "indigo";
};

const columns: Advantage[] = [
  {
    icon: Code2,
    title: "The Developer Advantage",
    accent: "blue",
    items: [
      {
        icon: Code2,
        text: "Modern Next.js / React engineering built for scale",
      },
      {
        icon: Zap,
        text: "Lightning-fast load times that protect SEO and conversions",
      },
      {
        icon: LayoutTemplate,
        text: "Zero template bloat — custom platforms, not page builders",
      },
      {
        icon: Plug,
        text: "Custom API integrations that connect your real stack",
      },
    ],
  },
  {
    icon: Megaphone,
    title: "The Marketing Engine",
    accent: "indigo",
    items: [
      {
        icon: Filter,
        text: "High-converting funnels from first click to close",
      },
      {
        icon: Target,
        text: "Targeted Meta & Search campaigns that match the product",
      },
      {
        icon: MapPin,
        text: "Local SEO optimization that wins the map pack",
      },
      {
        icon: LineChart,
        text: "Data-driven CRO so every experiment ships with evidence",
      },
    ],
  },
];

const accentClasses = {
  blue: {
    shell:
      "bg-gradient-to-br from-blue-400/60 via-blue-500/20 to-zinc-800/40",
    icon: "bg-blue-500/15 text-blue-300",
    heading: "text-blue-300",
    bullet: "text-blue-400",
  },
  indigo: {
    shell:
      "bg-gradient-to-br from-indigo-400/60 via-indigo-500/20 to-zinc-800/40",
    icon: "bg-indigo-500/15 text-indigo-300",
    heading: "text-indigo-300",
    bullet: "text-indigo-400",
  },
};

export function DualThreat() {
  return (
    <section
      id="why-us"
      className="relative border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Why Code + Marketing
          </p>
          <h2
            id="why-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            The DigiSol Advantage
          </h2>
          <p className="mt-4 text-zinc-400">
            Engineering that can actually convert. Marketing that can actually
            ship. Two disciplines, one accountable team.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {columns.map((column) => {
            const styles = accentClasses[column.accent];
            const Icon = column.icon;
            return (
              <article
                key={column.title}
                className={`rounded-2xl p-[1px] ${styles.shell} shadow-xl shadow-black/30`}
              >
                <div className="h-full rounded-[15px] bg-zinc-900/50 p-8 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {column.title}
                    </h3>
                  </div>
                  <ul className="mt-8 space-y-4">
                    {column.items.map(({ icon: ItemIcon, text }) => (
                      <li key={text} className="flex gap-3">
                        <ItemIcon
                          className={`mt-0.5 h-5 w-5 shrink-0 ${styles.bullet}`}
                          aria-hidden="true"
                        />
                        <span className="text-base leading-relaxed text-zinc-200">
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
