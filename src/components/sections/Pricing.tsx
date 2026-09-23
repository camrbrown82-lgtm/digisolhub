"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  ALBERTA_GST_PERCENT,
  PRICING_ADDONS,
  PRICING_PACKAGES,
  PRICING_RETAINERS,
  PRICING_TESTING,
  formatCad,
  gstCents,
  summarizeSelection,
  type PricingItem,
} from "@/lib/pricing";

function ItemCard({
  item,
  selected,
  onToggle,
  mode,
}: {
  item: PricingItem;
  selected: boolean;
  onToggle: () => void;
  mode: "radio" | "check";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-indigo-400/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
          : "border-white/10 bg-zinc-900/40 hover:border-indigo-400/30"
      } ${item.featured ? "ring-1 ring-indigo-400/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.badge ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {item.badge}
            </p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold text-white">{item.name}</h3>
        </div>
        <span
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-indigo-400 bg-indigo-500 text-white"
              : "border-zinc-600 text-transparent"
          }`}
          aria-hidden="true"
        >
          {mode === "check" || selected ? <Check className="h-3 w-3" /> : null}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">
        {formatCad(item.amount)}
        {item.kind === "recurring" ? (
          <span className="text-sm font-normal text-zinc-400"> / month</span>
        ) : (
          <span className="text-sm font-normal text-zinc-400"> one-time</span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.blurb}</p>
      <ul className="mt-4 space-y-1.5">
        {item.includes.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-zinc-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

export function PricingBuilder({
  stripeReady = false,
  cityHint,
}: {
  stripeReady?: boolean;
  cityHint?: string;
}) {
  const [packageId, setPackageId] = useState("growth");
  const [retainerId, setRetainerId] = useState<string>("");
  const [addonIds, setAddonIds] = useState<string[]>(["addon_hub"]);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState(cityHint ? `${cityHint} businesses` : "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState("");

  const selectedIds = useMemo(() => {
    const ids = [packageId, ...addonIds];
    if (retainerId) ids.push(retainerId);
    return ids;
  }, [packageId, addonIds, retainerId]);

  const totals = useMemo(() => summarizeSelection(selectedIds), [selectedIds]);

  function toggleAddon(id: string) {
    setAddonIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onCheckout(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    trackEvent("pricing_checkout_click", {
      package: packageId,
      retainer: retainerId || "none",
      addons: addonIds.join(","),
    });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedIds,
          email,
          company,
          industry,
          notes,
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Checkout unavailable");
      }
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  async function onTestingCheckout() {
    setTestBusy(true);
    setTestError("");
    trackEvent("pricing_checkout_click", {
      package: "testing",
      retainer: "none",
      addons: "",
    });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: [PRICING_TESTING.id],
          email: email.trim() || undefined,
          company: company.trim() || "DigiSol Stripe test",
          industry: "internal_testing",
          notes: "Temporary $2 live Stripe verification — remove after success",
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Checkout unavailable");
      }
      window.location.href = result.url;
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Checkout failed");
      setTestBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
              {PRICING_TESTING.badge} · remove after verify
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {PRICING_TESTING.name} · {formatCad(PRICING_TESTING.amount)}
            </h3>
            <p className="mt-1 max-w-xl text-sm text-amber-100/80">
              {PRICING_TESTING.blurb} GST ({ALBERTA_GST_PERCENT}%) is added at
              Stripe Checkout (~{formatCad(PRICING_TESTING.amount + gstCents(PRICING_TESTING.amount), 2)} total).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onTestingCheckout()}
            disabled={testBusy || !stripeReady}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {testBusy ? "Opening Stripe…" : "Pay $2 test"}
          </button>
        </div>
        {testError ? <p className="mt-3 text-sm text-rose-300">{testError}</p> : null}
        {!stripeReady ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Add live <code className="text-amber-100">STRIPE_SECRET_KEY</code> on
            Vercel Production, then redeploy, before running this test.
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          Scalable pricing
        </p>
        <h2
          id="pricing-heading"
          className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Build the engagement your industry needs
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
          Pick a core package, add a monthly growth engine if you want ongoing
          SEO or ads, then stack modules for cities, e-commerce, or custom apps.
          Same DigiSol dual threat — design, engineering, and marketing — for
          every Alberta industry. Listed prices exclude {ALBERTA_GST_PERCENT}%
          GST; tax is added at Stripe Checkout.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          1 · Core package
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {PRICING_PACKAGES.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              selected={packageId === item.id}
              mode="radio"
              onToggle={() => setPackageId(item.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          2 · Monthly growth (optional)
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setRetainerId("")}
            aria-pressed={!retainerId}
            className={`rounded-2xl border p-5 text-left transition ${
              !retainerId
                ? "border-indigo-400/60 bg-indigo-500/15"
                : "border-white/10 bg-zinc-900/40 hover:border-indigo-400/30"
            }`}
          >
            <h3 className="text-lg font-semibold text-white">Launch only</h3>
            <p className="mt-2 text-sm text-zinc-400">
              No monthly retainer — pay for the build and run campaigns later.
            </p>
          </button>
          {PRICING_RETAINERS.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              selected={retainerId === item.id}
              mode="radio"
              onToggle={() => setRetainerId(item.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          3 · Scale modules
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_ADDONS.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              selected={addonIds.includes(item.id)}
              mode="check"
              onToggle={() => toggleAddon(item.id)}
            />
          ))}
        </div>
      </div>

      <form
        onSubmit={onCheckout}
        className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
              Your stack
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {totals.items.map((item) => (
                <li key={item.id}>
                  {item.name} · {formatCad(item.amount)}
                  {item.kind === "recurring" ? "/mo" : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-[12rem] space-y-3 text-right text-sm">
            <div>
              <p className="text-zinc-400">One-time subtotal</p>
              <p className="text-lg font-semibold text-white">
                {formatCad(totals.oneTime)}
              </p>
              <p className="text-zinc-500">
                GST ({ALBERTA_GST_PERCENT}%) {formatCad(totals.oneTimeGst, 2)}
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatCad(totals.oneTimeTotal, 2)}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Monthly subtotal</p>
              <p className="text-lg font-semibold text-white">
                {formatCad(totals.monthly)}
                <span className="text-sm font-normal text-zinc-400"> /mo</span>
              </p>
              <p className="text-zinc-500">
                GST ({ALBERTA_GST_PERCENT}%) {formatCad(totals.monthlyGst, 2)}
                /mo
              </p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatCad(totals.monthlyTotal, 2)}
                <span className="text-sm font-normal text-zinc-400"> /mo</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
              placeholder="you@company.ca"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Company
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
              placeholder="Your company"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Industry
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
              placeholder="Trades, retail, clinic, hospitality…"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Notes
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
              placeholder="Cities served, must-haves…"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {busy ? "Redirecting to Stripe…" : "Pay securely with Stripe"}
          </button>
          <a
            href="/#contact"
            className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
          >
            Prefer a consult first
          </a>
        </div>
        {!stripeReady ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Stripe checkout activates once DigiSol&apos;s Stripe keys are on
            Vercel. You can still build your stack now — if payment is offline,
            use Book a consult and we&apos;ll invoice the same package.
          </p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Secure Stripe Checkout · CAD · {ALBERTA_GST_PERCENT}% GST (Alberta)
            added at payment · scope confirmed after payment.
          </p>
        )}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </form>
    </div>
  );
}
