import { Database, Layers, Mail, Sparkles, Terminal, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { getServerMessages } from "@/lib/i18n/server";

/** Order matches `techStack.items`. */
const TECH_STYLE: { icon: LucideIcon; accent: BrandAccent }[] = [
  { icon: Database, accent: "sky" },
  { icon: Terminal, accent: "blue" },
  { icon: Mail, accent: "indigo" },
  { icon: Sparkles, accent: "blue" },
  { icon: Layers, accent: "indigo" },
];

export function TechStackSection() {
  const t = getServerMessages().techStack;
  return (
    <section
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="tech-stack-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="tech-stack-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.intro}</p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((tech, index) => {
            const { icon: Icon, accent } = TECH_STYLE[index % TECH_STYLE.length];
            const styles = brandAccent[accent];
            return (
              <li key={tech.name} className="h-full">
                <BrandCard accent={accent} className="h-full" innerClassName="p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className={`text-right text-xs font-medium ${styles.heading}`}>
                      {tech.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{tech.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                    {tech.description}
                  </p>
                </BrandCard>
              </li>
            );
          })}

          <li className="h-full">
            <BrandCard accent="sky" className="h-full" innerClassName="p-6">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                    {t.customEyebrow}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {t.customTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">{t.customBody}</p>
                </div>
                <p className="mt-6 border-t border-sky-400/30 pt-4 text-xs font-semibold text-sky-300">
                  {t.customFoot}
                </p>
              </div>
            </BrandCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
