import type { ElementType, ReactNode } from "react";

export type BrandAccent = "blue" | "indigo" | "sky";

/**
 * Shared card chrome for Services / DualThreat / Kaylev / Audience.
 * Shell = bright rim. Panel = tinted fill so the accent reads on dark pages.
 */
export const brandAccent = {
  blue: {
    shell:
      "bg-gradient-to-br from-blue-400 via-blue-500/70 to-blue-950/80 shadow-[0_0_40px_-10px_rgba(59,130,246,0.55)]",
    panel:
      "bg-gradient-to-br from-blue-500/25 via-zinc-950/95 to-zinc-950",
    icon: "bg-blue-500/25 text-blue-200 ring-1 ring-blue-400/40",
    heading: "text-blue-300",
    bullet: "text-blue-400",
  },
  indigo: {
    shell:
      "bg-gradient-to-br from-indigo-400 via-indigo-500/70 to-indigo-950/80 shadow-[0_0_40px_-10px_rgba(99,102,241,0.55)]",
    panel:
      "bg-gradient-to-br from-indigo-500/25 via-zinc-950/95 to-zinc-950",
    icon: "bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40",
    heading: "text-indigo-300",
    bullet: "text-indigo-400",
  },
  sky: {
    shell:
      "bg-gradient-to-br from-sky-400 via-sky-500/70 to-cyan-950/80 shadow-[0_0_40px_-10px_rgba(56,189,248,0.55)]",
    panel:
      "bg-gradient-to-br from-sky-500/25 via-zinc-950/95 to-zinc-950",
    icon: "bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/40",
    heading: "text-sky-300",
    bullet: "text-sky-400",
  },
} as const;

type BrandCardProps = {
  accent?: BrandAccent;
  as?: ElementType;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

export function BrandCard({
  accent = "indigo",
  as: Tag = "article",
  className = "",
  innerClassName = "p-8",
  children,
}: BrandCardProps) {
  const styles = brandAccent[accent];
  return (
    <Tag
      className={`rounded-2xl p-[1.5px] ${styles.shell} ${className}`}
    >
      <div
        className={`relative h-full overflow-hidden rounded-[14px] backdrop-blur-md ${styles.panel} ${innerClassName}`}
      >
        <div
          className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">{children}</div>
      </div>
    </Tag>
  );
}
