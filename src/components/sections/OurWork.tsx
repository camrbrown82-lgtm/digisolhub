import { Briefcase, ExternalLink } from "lucide-react";
import { BrandCard, type BrandAccent } from "@/components/BrandCard";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { PUBLIC_PROJECTS } from "@/lib/projects";

const accents: BrandAccent[] = ["sky", "indigo", "blue"];

export function OurWork() {
  const locale = getLocale();
  const t = getMessages(locale).ourWork;
  if (PUBLIC_PROJECTS.length === 0) return null;

  return (
    <section
      id="our-work"
      className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="our-work-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h2
            id="our-work-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-300">{t.intro}</p>
        </div>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4">
          {PUBLIC_PROJECTS.map((project, i) => {
            const copy = t.projects[project.id];
            return (
              <li key={project.id} className="h-full">
                <BrandCard
                  as="div"
                  accent={accents[i % accents.length]}
                  className="h-full"
                  innerClassName="flex h-full flex-col p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{project.company}</h3>
                    <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                      {t.status[project.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {copy?.summary ?? project.summary}
                  </p>
                  <div className="mt-4 flex-1 border-t border-white/10 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {t.roleLabel}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-200">
                      {copy?.role ?? project.role}
                    </p>
                  </div>
                  {project.video ? (
                    <video
                      className="mt-5 aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={`A look at the ${project.company} website`}
                    >
                      <source src={project.video} type="video/mp4" />
                    </video>
                  ) : null}
                  {project.mediaPage ? (
                    <a
                      href={project.mediaPage}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      {t.watchMedia}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                  {project.url ? (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener"
                      className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      {t.visitSite}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </BrandCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
