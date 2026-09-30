interface AwardProps {
  companyName: string;
  score: number;
  date: string;
  verifyUrl: string;
}

export default function WebsiteAwardBadge({ companyName, score, date, verifyUrl }: AwardProps) {
  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center text-white shadow-2xl">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" aria-hidden="true" />

      <span className="mb-4 inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-950">
        DigiSol Excellence Award
      </span>

      <h2 className="mb-2 text-2xl font-extrabold">{companyName}</h2>
      <p className="mb-6 text-sm text-slate-300">
        Recognized for website speed, SEO, and technical quality with a website audit score of{" "}
        <span className="font-bold text-amber-400">{score}/100</span>.
      </p>

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs text-slate-400">
        Verified &amp; audited on {date} by DigiSol
      </div>

      <div className="flex justify-center gap-3">
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300"
        >
          Verify award on DigiSol
        </a>
      </div>
    </div>
  );
}
