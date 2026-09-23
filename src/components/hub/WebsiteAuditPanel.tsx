"use client";

import { useState } from "react";

type ReportItem = {
  kind: "strength" | "weakness";
  area: string;
  title: string;
  detail: string;
};

type AuditRow = {
  id?: string | null;
  url: string;
  final_url?: string | null;
  score: number;
  ttfb_ms?: number | null;
  total_ms?: number | null;
  report?: {
    summary?: string;
    scoreLabel?: string;
    strengths?: ReportItem[];
    weaknesses?: ReportItem[];
  } | null;
  created_at?: string;
};

export function WebsiteAuditPanel({
  companyName,
  domain,
  initialAudit,
}: {
  companyName?: string | null;
  domain?: string | null;
  initialAudit?: AuditRow | null;
}) {
  const [audit, setAudit] = useState<AuditRow | null>(initialAudit ?? null);
  const [url, setUrl] = useState(
    domain
      ? domain.startsWith("http")
        ? domain
        : `https://${domain}`
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runAudit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hub/website-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() || undefined }),
      });
      const json = (await response.json()) as {
        audit?: AuditRow;
        error?: string;
        warning?: string;
      };
      if (!response.ok || !json.audit) {
        throw new Error(json.error || "Audit failed");
      }
      setAudit(json.audit);
      if (json.warning) setError(json.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  const report = audit?.report;
  const strengths = report?.strengths ?? [];
  const weaknesses = report?.weaknesses ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Website audit</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Scrape meta tags, load speed (TTFB), and basic structure
            {companyName ? ` for ${companyName}` : ""}. Results feed the Digital
            Hub analytics report.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="hub-field min-w-[16rem] flex-1 text-sm"
        />
        <button
          type="button"
          onClick={() => void runAudit()}
          disabled={busy}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "Scanning…" : "Run audit"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-amber-300/90">{error}</p>
      ) : null}

      {!audit ? (
        <p className="text-sm text-zinc-500">
          No audit yet — run one against the company domain.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Score</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {audit.score}
                <span className="ml-2 text-base font-normal text-zinc-500">
                  {report?.scoreLabel || ""}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">TTFB</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {audit.ttfb_ms != null ? `${audit.ttfb_ms}ms` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">URL</p>
              <p className="mt-2 truncate text-sm text-zinc-200">
                {audit.final_url || audit.url}
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-400">{report?.summary}</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-sm font-semibold text-emerald-200">Strengths</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {strengths.length === 0 ? (
                  <li className="text-zinc-500">No strengths recorded.</li>
                ) : (
                  strengths.map((item) => (
                    <li key={`${item.title}-${item.detail}`}>
                      <p className="text-zinc-100">{item.title}</p>
                      <p className="text-zinc-500">{item.detail}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
              <h3 className="text-sm font-semibold text-rose-200">Weaknesses</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {weaknesses.length === 0 ? (
                  <li className="text-zinc-500">No weaknesses recorded.</li>
                ) : (
                  weaknesses.map((item) => (
                    <li key={`${item.title}-${item.detail}`}>
                      <p className="text-zinc-100">{item.title}</p>
                      <p className="text-zinc-500">{item.detail}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
