"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GoogleCheck,
  GoogleDiscovery,
  GoogleProduct,
  GoogleSetupIds,
  GoogleSetupRecord,
} from "@/lib/google/audit";

type Fix = { title: string; ok: boolean; detail: string; applied_by: string | null; created_at: string };

const PRODUCTS: { id: GoogleProduct; label: string }[] = [
  { id: "ga4", label: "Google Analytics" },
  { id: "search_console", label: "Search Console" },
  { id: "ads", label: "Google Ads" },
];

const STATUS_STYLE: Record<GoogleCheck["status"], { icon: string; className: string }> = {
  pass: { icon: "✓", className: "text-emerald-400" },
  warn: { icon: "!", className: "text-amber-300" },
  fail: { icon: "✗", className: "text-rose-400" },
  info: { icon: "i", className: "text-sky-300" },
};

function scoreOf(checks: GoogleCheck[]) {
  const graded = checks.filter((c) => c.status !== "info");
  if (!graded.length) return null;
  return Math.round((graded.filter((c) => c.status === "pass").length / graded.length) * 100);
}

const formatCustomerId = (id: string) =>
  id.length === 10 ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { timeZone: "America/Edmonton", dateStyle: "medium", timeStyle: "short" });

function change(now: number, before: number) {
  if (!before) return now ? "new" : "";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct > 0 ? "+" : ""}${pct}% vs previous 28 days`;
}

export function GoogleSetupPanel({
  companyName,
  domain,
  initial,
  initialFixes,
  robotEmail,
  robotReady,
  adsReady,
  managerId,
}: {
  companyName: string;
  domain?: string | null;
  initial: GoogleSetupRecord;
  initialFixes: Fix[];
  robotEmail: string;
  robotReady: boolean;
  adsReady: boolean;
  managerId: string;
}) {
  const [setup, setSetup] = useState(initial);
  const [fixes, setFixes] = useState(initialFixes);
  const [ids, setIds] = useState<GoogleSetupIds>(initial.ids);
  const [discovery, setDiscovery] = useState<GoogleDiscovery | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const autoTried = useRef(false);

  const call = useCallback(async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/hub/google-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        setup?: GoogleSetupRecord;
        fixes?: Fix[];
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Request failed");
      if (json.setup) {
        setSetup(json.setup);
        setIds(json.setup.ids);
      }
      if (json.fixes) setFixes(json.fixes);
      if (json.message) setNotice(json.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy("");
    }
  }, []);

  const discover = useCallback(async () => {
    setBusy("discover");
    setError("");
    try {
      const res = await fetch("/api/hub/google-setup?discover=1");
      const json = (await res.json()) as GoogleDiscovery & { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not look up Google accounts");
      setDiscovery(json);
      setIds((current) => ({
        ga4PropertyId: current.ga4PropertyId || json.suggested.ga4PropertyId,
        searchConsoleSite: current.searchConsoleSite || json.suggested.searchConsoleSite,
        adsCustomerId: current.adsCustomerId || json.suggested.adsCustomerId,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not look up Google accounts");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    if (autoTried.current || !robotReady || setup.needsMigration) return;
    autoTried.current = true;
    void discover();
  }, [discover, robotReady, setup.needsMigration]);

  function applyFix(check: GoogleCheck) {
    if (!check.fix) return;
    if (
      check.fix.spend &&
      !window.confirm(
        `${check.fix.label}: this changes where ${companyName}'s ads show. Apply it in Google Ads now?`,
      )
    ) {
      return;
    }
    void call({ action: "fix", checkId: check.id }, `fix:${check.id}`);
  }

  async function copyRobot() {
    await navigator.clipboard.writeText(robotEmail).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const audit = setup.audit;
  const checks = audit?.checks ?? [];
  const score = scoreOf(checks);
  const fixable = checks.filter((c) => c.fix && c.status !== "pass" && !c.fix.spend);
  const dirty =
    ids.ga4PropertyId !== setup.ids.ga4PropertyId ||
    ids.searchConsoleSite !== setup.ids.searchConsoleSite ||
    ids.adsCustomerId !== setup.ids.adsCustomerId;
  const allConnected = audit ? PRODUCTS.every((p) => audit.products[p.id]?.connected || (p.id === "ads" && !ids.adsCustomerId)) : false;

  async function fixAllSafe() {
    for (const check of fixable) {
      await call({ action: "fix", checkId: check.id }, `fix:${check.id}`);
    }
  }

  if (setup.needsMigration) {
    return (
      <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
        One-time setup: run{" "}
        <code className="text-amber-50">supabase/migrations/20261001000000_google_setup.sql</code> in
        the Supabase SQL editor, then refresh this page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {!robotReady ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
          Add <code className="text-amber-50">GA4_CLIENT_EMAIL</code> and{" "}
          <code className="text-amber-50">GA4_PRIVATE_KEY</code> (DigiSol&apos;s Google service account)
          on Vercel and redeploy.
        </p>
      ) : null}

      <details
        open={!allConnected}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300"
      >
        <summary className="cursor-pointer font-semibold text-white">
          Give DigiSol access {allConnected ? "(done)" : "(one time per company)"}
        </summary>
        <p className="mt-3 text-zinc-400">
          {companyName} adds DigiSol&apos;s robot login once. After that the weekly check and fixes run
          without anyone signing in.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-100">{robotEmail || "not set"}</code>
          {robotEmail ? (
            <button
              type="button"
              onClick={() => void copyRobot()}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-200">Google Analytics:</span> Admin → Property access management →
            add the email above as <strong>Editor</strong>.
          </li>
          <li>
            <span className="text-zinc-200">Search Console:</span> Settings → Users and permissions → Add
            user → the email above with <strong>Full</strong> permission.
          </li>
          <li>
            <span className="text-zinc-200">Google Ads:</span>{" "}
            {managerId
              ? `accept DigiSol's manager account link (${formatCustomerId(managerId)}). Send the request from the manager account: Accounts → + → Link existing account.`
              : "link the account under DigiSol's Google Ads manager account."}
            {!adsReady ? (
              <span className="mt-1 block text-amber-200/80">
                Ads checks start once GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_MANAGER_ID are set on Vercel.
              </span>
            ) : null}
          </li>
        </ol>
      </details>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Linked accounts</h2>
          <button
            type="button"
            onClick={() => void discover()}
            disabled={Boolean(busy) || !robotReady}
            className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {busy === "discover" ? "Looking…" : "Find accounts DigiSol can see"}
          </button>
        </div>
        {discovery && Object.keys(discovery.errors).length ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
            {Object.entries(discovery.errors).map(([product, message]) => (
              <li key={product}>{message}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-xs text-zinc-400">
            GA4 property ID
            <input
              list="ga4-properties"
              value={ids.ga4PropertyId ?? ""}
              onChange={(e) => setIds({ ...ids, ga4PropertyId: e.target.value || null })}
              placeholder="e.g. 500705696"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="ga4-properties">
              {discovery?.properties.map((p) => (
                <option key={p.propertyId} value={p.propertyId}>
                  {`${p.name} (${p.account})${p.matches ? " · matches site" : ""}`}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-zinc-400">
            Search Console property
            <input
              list="gsc-sites"
              value={ids.searchConsoleSite ?? ""}
              onChange={(e) => setIds({ ...ids, searchConsoleSite: e.target.value || null })}
              placeholder="https://example.com/ or sc-domain:example.com"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="gsc-sites">
              {discovery?.sites.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl}>
                  {`${s.permissionLevel}${s.matches ? " · matches site" : ""}`}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-zinc-400">
            Google Ads customer ID (optional)
            <input
              list="ads-accounts"
              value={ids.adsCustomerId ?? ""}
              onChange={(e) => setIds({ ...ids, adsCustomerId: e.target.value || null })}
              placeholder="123-456-7890"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="ads-accounts">
              {discovery?.adsAccounts.map((a) => (
                <option key={a.customerId} value={a.customerId}>
                  {a.name}
                </option>
              ))}
            </datalist>
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Website: {domain || "no domain on this company yet (add it under Companies)"}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void call({ action: "save", ids }, "save")}
            disabled={Boolean(busy) || !robotReady}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy === "save" ? "Saving and checking…" : dirty || !setup.saved ? "Save and run check" : "Save"}
          </button>
          {setup.saved ? (
            <button
              type="button"
              onClick={() => void call({ action: "audit" }, "audit")}
              disabled={Boolean(busy) || !robotReady}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
            >
              {busy === "audit" ? "Checking Google… (up to a minute)" : "Run check now"}
            </button>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      {audit ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Setup score</p>
              <p className="mt-2 text-3xl font-semibold text-white">{score ?? "-"}</p>
              <p className="text-xs text-zinc-500">Share of checks passing. Checked {when(audit.ranAt)}.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">To fix</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {checks.filter((c) => c.status === "warn" || c.status === "fail").length}
              </p>
              <p className="text-xs text-zinc-500">
                {checks.filter((c) => c.fix && c.status !== "pass").length} can be fixed from here
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm text-zinc-400">Safe fixes</p>
              <button
                type="button"
                onClick={() => void fixAllSafe()}
                disabled={Boolean(busy) || fixable.length === 0}
                className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {fixable.length ? `Apply ${fixable.length} safe fix${fixable.length === 1 ? "" : "es"}` : "Nothing to apply"}
              </button>
              <p className="mt-2 text-xs text-zinc-500">Settings and tracking only. Ad changes ask first.</p>
            </div>
          </div>

          {PRODUCTS.map((product) => {
            const state = audit.products[product.id];
            const rows = checks.filter((c) => c.product === product.id);
            return (
              <section key={product.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">{product.label}</h2>
                  <span className={`text-xs ${state?.connected ? "text-emerald-400" : "text-zinc-500"}`}>
                    {state?.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                {!state?.connected && state?.error ? (
                  <p className="mt-2 text-sm text-amber-200/90">
                    {state.error}{" "}
                    {state.helpUrl ? (
                      <a href={state.helpUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                        Open in Google
                      </a>
                    ) : null}
                  </p>
                ) : null}
                {rows.length ? (
                  <ul className="mt-3 divide-y divide-zinc-800">
                    {rows.map((check) => {
                      const style = STATUS_STYLE[check.status];
                      return (
                        <li key={check.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <span className={`mt-0.5 w-4 shrink-0 text-center font-bold ${style.className}`}>
                              {style.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{check.title}</p>
                              <p className="mt-0.5 text-sm text-zinc-400">{check.detail}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {check.link ? (
                              <a
                                href={check.link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-indigo-400 hover:text-indigo-300"
                              >
                                {check.link.label}
                              </a>
                            ) : null}
                            {check.fix && check.status !== "pass" ? (
                              <button
                                type="button"
                                onClick={() => applyFix(check)}
                                disabled={Boolean(busy)}
                                className={`rounded-xl px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                                  check.fix.spend
                                    ? "border border-amber-500/60 text-amber-200 hover:bg-amber-500/10"
                                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                                }`}
                              >
                                {busy === `fix:${check.id}` ? "Applying…" : check.fix.label}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {product.id === "search_console" && audit.search ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 p-4 text-sm">
                      <p className="text-zinc-400">Google search, last 28 days</p>
                      <p className="mt-1 text-white">
                        {audit.search.clicks} clicks · {audit.search.impressions} impressions · avg position{" "}
                        {audit.search.position}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Clicks {change(audit.search.clicks, audit.search.prevClicks)}
                        {audit.search.prevImpressions
                          ? ` · impressions ${change(audit.search.impressions, audit.search.prevImpressions)}`
                          : ""}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 p-4 text-sm">
                      <p className="text-zinc-400">Top searches</p>
                      <ul className="mt-1 space-y-1">
                        {audit.search.topQueries.slice(0, 6).map((q) => (
                          <li key={q.query} className="flex justify-between gap-3">
                            <span className="truncate text-zinc-300">{q.query}</span>
                            <span className="shrink-0 tabular-nums text-zinc-500">
                              {q.clicks} / {q.impressions} · #{q.position}
                            </span>
                          </li>
                        ))}
                        {audit.search.topQueries.length === 0 ? (
                          <li className="text-zinc-500">No search data yet.</li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {product.id === "ads" && audit.ads ? (
                  <p className="mt-4 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
                    Last 30 days:{" "}
                    {new Intl.NumberFormat("en-CA", { style: "currency", currency: audit.ads.currency }).format(audit.ads.cost)}{" "}
                    spent · {audit.ads.clicks} clicks · {audit.ads.conversions} conversions
                    {audit.ads.conversions > 0
                      ? ` · ${new Intl.NumberFormat("en-CA", { style: "currency", currency: audit.ads.currency }).format(audit.ads.cost / audit.ads.conversions)} per conversion`
                      : ""}
                  </p>
                ) : null}
              </section>
            );
          })}
        </>
      ) : setup.saved ? null : (
        <p className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
          Link {companyName}&apos;s accounts above and click Save and run check.
        </p>
      )}

      {fixes.length ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-white">Recent fixes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {fixes.map((f) => (
              <li key={`${f.created_at}-${f.title}`} className="flex flex-wrap justify-between gap-2">
                <span className={f.ok ? "text-zinc-300" : "text-rose-300"}>
                  {f.ok ? "✓" : "✗"} {f.title}: {f.detail}
                </span>
                <span className="text-xs text-zinc-500">
                  {when(f.created_at)}
                  {f.applied_by ? ` · ${f.applied_by}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
