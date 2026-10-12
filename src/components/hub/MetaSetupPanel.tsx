"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MetaDiscovery, MetaSetupIds, MetaSetupRecord } from "@/lib/meta/setup";

export function MetaSetupPanel({
  companyName,
  initial,
  tokenReady,
  businessId,
}: {
  companyName: string;
  initial: MetaSetupRecord;
  tokenReady: boolean;
  businessId: string;
}) {
  const [setup, setSetup] = useState(initial);
  const [ids, setIds] = useState<MetaSetupIds>(initial.ids);
  const [discovery, setDiscovery] = useState<MetaDiscovery | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const autoTried = useRef(false);

  const discover = useCallback(async () => {
    setBusy("discover");
    setError("");
    try {
      const res = await fetch("/api/hub/meta-setup?discover=1");
      const json = (await res.json()) as MetaDiscovery & { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not look up Meta accounts");
      setDiscovery(json);
      setIds((current) => ({
        adAccountId: current.adAccountId || json.suggested.adAccountId,
        pageId: current.pageId || json.suggested.pageId,
        instagramUserId: current.instagramUserId || json.suggested.instagramUserId,
        pixelId: current.pixelId || json.suggested.pixelId,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not look up Meta accounts");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    if (autoTried.current || !tokenReady || setup.needsMigration) return;
    if (ids.adAccountId && ids.pageId && ids.instagramUserId) return;
    autoTried.current = true;
    void discover();
  }, [discover, ids.adAccountId, ids.instagramUserId, ids.pageId, setup.needsMigration, tokenReady]);

  async function save() {
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/hub/meta-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ids }),
      });
      const json = (await res.json()) as {
        setup?: MetaSetupRecord;
        message?: string;
        warning?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not save");
      if (json.setup) {
        setSetup(json.setup);
        setIds(json.setup.ids);
      }
      if (json.warning) setError(json.warning);
      else if (json.message) setNotice(json.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy("");
    }
  }

  async function copyBusinessId() {
    if (!businessId) return;
    await navigator.clipboard.writeText(businessId).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (setup.needsMigration) {
    return (
      <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90">
        One-time setup: run{" "}
        <code className="text-amber-50">supabase/migrations/20261009000000_meta_setups.sql</code> in the
        Supabase SQL editor, then refresh this page.
      </p>
    );
  }

  const dirty =
    (ids.adAccountId || "") !== (setup.ids.adAccountId || "") ||
    (ids.pageId || "") !== (setup.ids.pageId || "") ||
    (ids.instagramUserId || "") !== (setup.ids.instagramUserId || "") ||
    (ids.pixelId || "") !== (setup.ids.pixelId || "");
  const linked = Boolean(setup.ids.adAccountId && setup.ids.pageId && setup.ids.instagramUserId);
  const pagePixels = discovery?.pixels.filter((pixel) => !ids.adAccountId || pixel.adAccountId === ids.adAccountId) ?? [];

  function choosePage(pageId: string) {
    const page = discovery?.pages.find((item) => item.id === pageId);
    setIds({
      ...ids,
      pageId: pageId || null,
      instagramUserId: page ? page.instagramUserId : ids.instagramUserId,
    });
  }

  return (
    <div className="space-y-4">
      {!tokenReady ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Connect the Hub&apos;s Meta login</p>
          <p className="mt-1 text-amber-100/80">
            This is once for the Hub. After it is set, each company only has to share their ad account, Page, and
            Instagram.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-100/80">
            <li>Business Settings → Users → System users → open the Conversions API system user.</li>
            <li>Generate a token that never expires, with ads_read, ads_management, pages_show_list, pages_manage_posts, instagram_basic, and instagram_content_publish.</li>
            <li>
              Replace <code className="text-amber-50">META_CAPI_ACCESS_TOKEN</code> in Vercel, then redeploy.
            </li>
          </ol>
        </section>
      ) : null}

      <details
        open={!linked}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300"
      >
        <summary className="cursor-pointer font-semibold text-white">
          Give the Hub access {linked ? "(done)" : "(one time per company)"}
        </summary>
        <p className="mt-3 text-zinc-400">
          {companyName} shares their Meta assets with DigiSol once. After that you can post and run ads for them
          from this Hub. Their Page, Instagram, and ad account stay theirs. Switch Working on to link another company.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">DigiSol business ID</span>
          <code className="rounded-lg bg-zinc-950 px-3 py-1.5 text-zinc-100">{businessId || "not set"}</code>
          {businessId ? (
            <button
              type="button"
              onClick={() => void copyBusinessId()}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
        {!businessId ? (
          <p className="mt-2 text-xs text-zinc-500">
            Set <code className="text-zinc-300">META_BUSINESS_ID</code> in Vercel, or copy it from DigiSol&apos;s
            Business settings → Business info.
          </p>
        ) : null}
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-zinc-400">
          <li>
            <span className="text-zinc-200">Partner access:</span> in {companyName}&apos;s Meta Business settings,
            open Partners → Add → Give a partner access to your assets, and enter the business ID above.
          </li>
          <li>
            <span className="text-zinc-200">Share assets:</span> the ad account (Manage campaigns), the Facebook
            Page (content and ads), and the Instagram account (content).
          </li>
          <li>
            <span className="text-zinc-200">Assign them to the Hub:</span> in DigiSol&apos;s Business settings, open
            Users → System users → the Conversions API system user → Add assets, and assign that ad account, Page,
            and Instagram.
          </li>
          <li>
            <span className="text-zinc-200">Save them here</span> so posts and ads for {companyName} go out on their
            accounts, not DigiSol&apos;s.
          </li>
        </ol>
      </details>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Linked Meta accounts</h2>
          <button
            type="button"
            onClick={() => void discover()}
            disabled={Boolean(busy) || !tokenReady}
            className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {busy === "discover" ? "Looking…" : "Find accounts the Hub can see"}
          </button>
        </div>
        {discovery && Object.keys(discovery.errors).length ? (
          <ul className="mt-2 space-y-1 text-xs text-amber-200/80">
            {Object.entries(discovery.errors).map(([product, message]) => (
              <li key={product}>{message}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs text-zinc-400">
            Ad account
            <input
              list="meta-ad-accounts"
              value={ids.adAccountId ?? ""}
              onChange={(e) => setIds({ ...ids, adAccountId: e.target.value || null })}
              placeholder="act_1234567890"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="meta-ad-accounts">
              {discovery?.adAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {`${account.name}${account.currency ? ` · ${account.currency}` : ""}`}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-zinc-400">
            Facebook Page ID
            <input
              list="meta-pages"
              value={ids.pageId ?? ""}
              onChange={(e) => choosePage(e.target.value.trim())}
              placeholder="Page ID"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="meta-pages">
              {discovery?.pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {`${page.name}${page.instagramUsername ? ` · @${page.instagramUsername}` : ""}`}
                </option>
              ))}
            </datalist>
          </label>
          <label className="block text-xs text-zinc-400">
            Instagram account ID
            <input
              value={ids.instagramUserId ?? ""}
              onChange={(e) => setIds({ ...ids, instagramUserId: e.target.value || null })}
              placeholder="Filled from the Page when Meta has one linked"
              className="hub-field mt-1 w-full text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Pixel ID (optional, for lead ads)
            <input
              list="meta-pixels"
              value={ids.pixelId ?? ""}
              onChange={(e) => setIds({ ...ids, pixelId: e.target.value || null })}
              placeholder="Pixel on this ad account"
              className="hub-field mt-1 w-full text-sm"
            />
            <datalist id="meta-pixels">
              {pagePixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name}
                </option>
              ))}
            </datalist>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={Boolean(busy) || !tokenReady}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : dirty || !setup.saved ? "Save Meta link" : "Save"}
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
    </div>
  );
}
