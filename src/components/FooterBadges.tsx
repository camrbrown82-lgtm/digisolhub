import { loadDigisolEarnedBadges } from "@/lib/competitive/publicBadge";

const badgeClass = "h-auto w-44 max-w-full";

export async function FooterBadges({ label }: { label: string }) {
  const earned = await loadDigisolEarnedBadges().catch(() => []);

  return (
    <div className="mt-12 border-t border-indigo-500/20 pt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{label}</p>
      <ul className="mt-4 flex flex-wrap items-center gap-4">
        <li>
          <a href="/award/digisol" className="block w-fit" title="Verify our website audit score">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/award/digisol/badge.svg"
              alt="DigiSol passes its own website audit. Verify the score."
              width={192}
              height={72}
              loading="lazy"
              className={badgeClass}
            />
          </a>
        </li>
        {earned.map((badge) => (
          <li key={badge.key}>
            <a
              href={`/award/c/${badge.analysisId}/${badge.key}`}
              className="block w-fit"
              title={`${badge.title}. Verify this badge.`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/award/c/${badge.analysisId}/${badge.key}/badge.svg`}
                alt={`DigiSol award: ${badge.companyName}, ${badge.title}, ${badge.score}/100.`}
                width={192}
                height={72}
                loading="lazy"
                className={badgeClass}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
