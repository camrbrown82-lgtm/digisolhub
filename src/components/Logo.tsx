type LogoProps = {
  className?: string;
  size?: "header" | "footer" | "hub";
  href?: string;
};

const sizeClass = {
  /** Sized for the taller h-20 / sm:h-24 / lg:h-[6.5rem] navbar */
  header: "h-12 w-auto sm:h-14 lg:h-16",
  footer: "h-24 w-auto sm:h-32",
  hub: "h-10 w-auto",
};

export function Logo({ className = "", size = "header", href = "/" }: LogoProps) {
  return (
    <a
      href={href}
      className={`inline-flex shrink-0 items-center justify-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${className}`}
      aria-label="DigiSol home"
    >
      <img
        src="/logo.jpg"
        alt="DigiSol — Engineering & Growth"
        width={480}
        height={156}
        className={`${sizeClass[size]} max-w-[min(100%,18rem)] object-contain object-left`}
      />
    </a>
  );
}
