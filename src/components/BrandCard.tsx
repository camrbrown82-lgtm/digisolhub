import type { ElementType, ReactNode } from "react";

export type BrandAccent = "blue" | "indigo" | "sky";

export const brandAccent = {
  blue: {
    shell: "bg-gradient-to-br from-blue-400/60 via-blue-500/20 to-zinc-800/40",
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
  sky: {
    shell: "bg-gradient-to-br from-sky-400/60 via-sky-500/20 to-zinc-800/40",
    icon: "bg-sky-500/15 text-sky-300",
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
  return (
    <Tag
      className={`rounded-2xl p-[1px] ${brandAccent[accent].shell} shadow-xl shadow-black/30 ${className}`}
    >
      <div
        className={`h-full rounded-[15px] bg-zinc-900/50 backdrop-blur-md ${innerClassName}`}
      >
        {children}
      </div>
    </Tag>
  );
}
