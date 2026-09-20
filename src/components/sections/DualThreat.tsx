import {
  Code2,
  Megaphone,
  Palette,
  Zap,
  LayoutTemplate,
  Plug,
  Filter,
  Target,
  MapPin,
  LineChart,
  Type,
  MousePointerClick,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";

type Advantage = {
  icon: LucideIcon;
  title: string;
  items: { icon: LucideIcon; text: string }[];
  accent: BrandAccent;
};

const columns: Advantage[] = [
  {
    icon: Palette,
    title: "The Design Craft",
    accent: "sky",
    items: [
      {
        icon: Palette,
        text: "Custom website design from your brand — not a template with a logo dropped on",
      },
      {
        icon: Type,
        text: "Layout, type, and color so the next step is obvious",
      },
      {
        icon: MousePointerClick,
        text: "Pages built around how Alberta customers actually book",
      },
      {
        icon: Layers,
        text: "A visual system ads and email can reuse, not a one-off mockup",
      },
    ],
  },
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
        text: "Lightning-fast load times that protect Alberta SEO and conversions",
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
        text: "Targeted Meta & Search campaigns for Alberta local companies",
      },
      {
        icon: MapPin,
        text: "Local SEO that wins the Airdrie, Calgary, Edmonton, and Alberta map pack",
      },
      {
        icon: LineChart,
        text: "Data-driven CRO so every experiment ships with evidence",
      },
    ],
  },
];

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
            Design. Build. Grow.
          </p>
          <h2
            id="why-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            The DigiSol Advantage for Alberta
          </h2>
          <p className="mt-4 text-zinc-400">
            We design the website, engineer it to convert, and market it locally
            — one partner, not a designer, a developer, and an agency.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {columns.map((column) => {
            const styles = brandAccent[column.accent];
            const Icon = column.icon;
            return (
              <BrandCard key={column.title} accent={column.accent}>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
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
                      <span className="text-sm leading-relaxed text-zinc-200">
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </BrandCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
