type LogoProps = {
  className?: string;
  size?: "header" | "footer" | "hub";
  href?: string;
};

const sizeClass = {
  header: "h-24 w-auto sm:h-32 lg:h-40",
  footer: "h-24 w-auto sm:h-32",
  hub: "h-10 w-auto",
};

export function Logo({ className = "", size = "header", href = "/" }: LogoProps) {
  return (
    <a
      href={href}
      className={`inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${className}`}
      aria-label="DigiSol home"
    >
      <img
        src="/logo.jpg"
        alt="DigiSol — Engineering & Growth"
        width={480}
        height={156}
        className={`${sizeClass[size]} max-w-none object-contain object-left`}
      />
    </a>
  );
}
