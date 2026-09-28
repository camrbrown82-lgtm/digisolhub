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
import { getServerMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages";
import type { HomeCopy } from "@/lib/visitorRegion";

type Advantage = {
  icon: LucideIcon;
  title: string;
  items: { icon: LucideIcon; text: string }[];
  accent: BrandAccent;
};

function columnsFor(copy: HomeCopy, t: Messages["dualThreat"]): Advantage[] {
  return [
    {
      icon: Palette,
      title: t.design.title,
      accent: "sky",
      items: [
        {
          icon: Palette,
          text: t.design.custom,
        },
        {
          icon: Type,
          text: t.design.layout,
        },
        {
          icon: MousePointerClick,
          text: copy.designBook,
        },
        {
          icon: Layers,
          text: t.design.system,
        },
      ],
    },
    {
      icon: Code2,
      title: t.developer.title,
      accent: "blue",
      items: [
        {
          icon: Code2,
          text: t.developer.stack,
        },
        {
          icon: Zap,
          text: copy.devSpeed,
        },
        {
          icon: LayoutTemplate,
          text: t.developer.noBloat,
        },
        {
          icon: Plug,
          text: t.developer.apis,
        },
      ],
    },
    {
      icon: Megaphone,
      title: t.marketing.title,
      accent: "indigo",
      items: [
        {
          icon: Filter,
          text: t.marketing.funnels,
        },
        {
          icon: Target,
          text: copy.mktPaid,
        },
        {
          icon: MapPin,
          text: copy.mktSeo,
        },
        {
          icon: LineChart,
          text: t.marketing.cro,
        },
      ],
    },
  ];
}

export function DualThreat({ copy }: { copy: HomeCopy }) {
  const t = getServerMessages().dualThreat;
  const columns = columnsFor(copy, t);
  return (
    <section
      id="why-us"
      className="relative border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="why-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {copy.whyTitle}
          </h2>
          <p className="mt-4 text-zinc-400">{copy.whyBody}</p>
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
