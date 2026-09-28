import { CalendarCheck, MessageCircle, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";
import { BrandCard, type BrandAccent } from "@/components/BrandCard";
import { getServerMessages } from "@/lib/i18n/server";

const icons: Record<string, LucideIcon> = {
  revisions: RefreshCw,
  on_time: CalendarCheck,
  response: MessageCircle,
};
const accents: BrandAccent[] = ["sky", "indigo", "blue"];

export function Guarantee() {
  const t = getServerMessages().guarantee;
  return (
    <section
      id="guarantee"
      className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="guarantee-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h2
            id="guarantee-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-300">{t.intro}</p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {t.items.map((g, i) => {
            const Icon = icons[g.id] ?? ShieldCheck;
            return (
              <li key={g.id} className="h-full">
                <BrandCard as="div" accent={accents[i % accents.length]} className="h-full" innerClassName="p-6">
                  <Icon className="h-6 w-6 text-sky-300" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{g.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{g.body}</p>
                </BrandCard>
              </li>
            );
          })}
        </ul>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-zinc-500">{t.finePrint}</p>
      </div>
    </section>
  );
}
