import { Database, Layers, Mail, Sparkles, Terminal, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";

type TechItem = {
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  accent: BrandAccent;
};

const techStack: TechItem[] = [
  {
    name: "Supabase",
    category: "Backend & Database",
    description:
      "PostgreSQL, real-time data, and row-level security for the Hub and client workspaces.",
    icon: Database,
    accent: "sky",
  },
  {
    name: "Cursor & Next.js",
    category: "Architecture & IDE",
    description:
      "AI-assisted development for fast, server-rendered React applications.",
    icon: Terminal,
    accent: "blue",
  },
  {
    name: "Resend",
    category: "Transactional Email",
    description:
      "API email for lead follow-up, workflows, and transactional notices.",
    icon: Mail,
    accent: "indigo",
  },
  {
    name: "OpenAI",
    category: "AI",
    description:
      "The models behind Kaylev, workflow drafts, poster copy, and website-audit writeups.",
    icon: Sparkles,
    accent: "blue",
  },
  {
    name: "Tailwind CSS",
    category: "User Interface",
    description:
      "Utility-first styling for responsive, accessible pages that stay on the DigiSol look.",
    icon: Layers,
    accent: "indigo",
  },
];

export function TechStackSection() {
  return (
    <section
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="tech-stack-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Enterprise infrastructure
          </p>
          <h2
            id="tech-stack-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Engineered with modern tools
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            DigiSol builds fast web applications on a stack we run ourselves:
            the site, the Hub, and the campaigns behind them.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            const styles = brandAccent[tech.accent];
            return (
              <li key={tech.name} className="h-full">
                <BrandCard accent={tech.accent} className="h-full" innerClassName="p-6">
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
                    Custom solutions
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    Need a specific stack?
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                    The tools follow the job: performance, the workflow, and how
                    the business actually sells.
                  </p>
                </div>
                <p className="mt-6 border-t border-sky-400/30 pt-4 text-xs font-semibold text-sky-300">
                  Built for speed and search →
                </p>
              </div>
            </BrandCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
