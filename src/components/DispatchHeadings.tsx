import type { ReactNode } from "react";

/** DigiSol house indigo → ice-blue — same signal as the landing hero. */
export const DISPATCH_GRADIENT =
  "bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent";

export function DispatchEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
      {children}
    </p>
  );
}

export function DispatchTitle({
  as: Tag = "h1",
  id,
  children,
  className = "",
}: {
  as?: "h1" | "h2" | "h3";
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const size =
    Tag === "h1"
      ? "text-3xl sm:text-5xl"
      : Tag === "h2"
        ? "text-3xl sm:text-4xl"
        : "text-2xl";

  return (
    <Tag
      id={id}
      className={`text-balance font-semibold tracking-tight ${DISPATCH_GRADIENT} ${size} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function DispatchSectionHeading({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  return (
    <h2 className="flex gap-3 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
      <span
        className="mt-1.5 h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500"
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Section {index + 1}
        </span>
        <span className={DISPATCH_GRADIENT}>{children}</span>
      </span>
    </h2>
  );
}
