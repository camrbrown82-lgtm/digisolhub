import { type CompanyBrand } from "@/lib/branding";

export function BrandConsistencyNote({
  companyName,
  brand,
}: {
  companyName: string;
  brand: Pick<CompanyBrand, "backgroundColor" | "textColor" | "highlightColor">;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-zinc-300">
      <p className="font-medium text-white">Brand consistency for {companyName}</p>
      <p className="mt-1 text-zinc-400">
        Every company you open under Working on gets its own kit. Posters,
        email, and AI use this company only — never mix DigiSol house colors
        or logo into another business.
      </p>
      <ul className="mt-3 space-y-1 text-xs text-zinc-400">
        <li>
          Background{" "}
          <span className="font-mono text-zinc-200">{brand.backgroundColor}</span>{" "}
          fills the page.
        </li>
        <li>
          Text <span className="font-mono text-zinc-200">{brand.textColor}</span>{" "}
          and highlights{" "}
          <span className="font-mono text-zinc-200">{brand.highlightColor}</span>{" "}
          stay locked.
        </li>
        <li>
          Official logo sits on a matching bar above the art, never over the
          message.
        </li>
      </ul>
    </div>
  );
}
