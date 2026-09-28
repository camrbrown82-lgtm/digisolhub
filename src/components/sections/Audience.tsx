import { Building2, Rocket } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { getServerMessages } from "@/lib/i18n/server";
import type { HomeCopy } from "@/lib/visitorRegion";

export function Audience({ copy }: { copy: HomeCopy }) {
  const t = getServerMessages().audience;
  const audiences = [
    {
      icon: Rocket,
      title: t.startupTitle,
      accent: "blue" as BrandAccent,
      body: copy.audienceStartupBody,
      points: [...t.startupPoints, copy.audienceStartupPoint],
    },
    {
      icon: Building2,
      title: t.establishedTitle,
      accent: "indigo" as BrandAccent,
      body: copy.audienceEstablishedBody,
      points: [...t.establishedPoints],
    },
  ];

  return (
    <section
      id="audience"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="audience-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-400">{copy.audienceIntro}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {audiences.map((item) => {
            const Icon = item.icon;
            const styles = brandAccent[item.accent];
            return (
              <BrandCard key={item.title} accent={item.accent}>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-semibold text-white sm:text-2xl">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-200">
                  {item.body}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-200">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className={styles.bullet} aria-hidden="true">
                        —
                      </span>
                      {point}
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
