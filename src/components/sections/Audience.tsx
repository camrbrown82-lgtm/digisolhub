import { Building2, Rocket } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";

const audiences = [
  {
    icon: Rocket,
    title: "For Startups",
    accent: "blue" as BrandAccent,
    body: "A designed site and a lean custom build so you launch looking real — then local Alberta positioning so nearby customers can find you.",
    points: [
      "Brand-true website design without a template look",
      "Rapid deployment and lean launch timelines",
      "Cost-effective full-stack MVP builds",
      "Launch strategy and Alberta market positioning",
    ],
  },
  {
    icon: Building2,
    title: "For Established Companies",
    accent: "indigo" as BrandAccent,
    body: "Redesign the site customers actually use, then modernize the platform under it — with local marketing and conversion work wired in for established Alberta companies.",
    points: [
      "Website redesign that matches how you sell today",
      "Site performance overhauls that restore speed and local SEO",
      "Advanced marketing integration across campaigns and product",
      "CRO and modernization of legacy web platforms",
    ],
  },
];

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
            Local Alberta companies first. Startups and established businesses
            in Airdrie, Calgary, Edmonton, and across the province get the same
            playbook: a designed website, code that converts, and marketing
            that ships.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
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
