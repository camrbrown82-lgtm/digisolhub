"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, Sparkles, Tag } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { GUARANTEE_SHORT } from "@/lib/guarantee";
import {
  ALBERTA_GST_PERCENT,
  LAUNCH_PROMO,
  PRICING_ADDONS,
  PRICING_HUB,
  PRICING_PACKAGES,
  PRICING_RETAINERS,
  formatCad,
  launchPromoStatus,
  normalizePromoCode,
  promoCodeError,
  promoDiscountCents,
  promoPercentFor,
  summarizeSelection,
  type PricingItem,
} from "@/lib/pricing";

function LaunchBanner({
  applied,
  onApply,
}: {
  applied: boolean;
  onApply: () => void;
}) {
  const status = launchPromoStatus();
  if (status === "ended") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-left">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">
          <Tag className="h-4 w-4" aria-hidden="true" />
          Launch offer · code {LAUNCH_PROMO.code}
        </p>
        <p className="mt-1.5 text-sm text-zinc-200">
          {LAUNCH_PROMO.buildPercent}% off website build and design (Foundation,
          Growth Engine, Full Funnel) and {LAUNCH_PROMO.otherPercent}% off
          everything else: the Hub, add-ons, and the first month of any retainer.{" "}
          <span className="text-zinc-400">
            {LAUNCH_PROMO.startLabel} to {LAUNCH_PROMO.endLabel}.
          </span>
        </p>
      </div>
      {status === "upcoming" ? (
        <span className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200">
          Starts {LAUNCH_PROMO.startLabel}
        </span>
      ) : applied ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200">
          <Check className="h-4 w-4" aria-hidden="true" />
          {LAUNCH_PROMO.code} applied
        </span>
      ) : (
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Apply {LAUNCH_PROMO.code}
        </button>
      )}
    </div>
  );
}

function ItemCard({
  item,
  selected,
  onToggle,
  mode,
  promo = null,
}: {
  item: PricingItem;
  selected: boolean;
  onToggle: () => void;
  mode: "radio" | "check";
  promo?: ReturnType<typeof normalizePromoCode>;
}) {
  const off = promoDiscountCents(item, promo);
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
        {off ? (
          <>
            <span className="mr-2 text-base font-normal text-zinc-500 line-through">
              {formatCad(item.amount)}
            </span>
            <span className="text-emerald-300">{formatCad(item.amount - off)}</span>
          </>
        ) : (
          formatCad(item.amount)
        )}
        {item.kind === "recurring" ? (
          <span className="text-sm font-normal text-zinc-400"> / month</span>
        ) : (
          <span className="text-sm font-normal text-zinc-400"> one-time</span>
        )}
      </p>
      {off ? (
        <p className="mt-1 text-xs font-medium text-emerald-300/90">
          {promoPercentFor(item, promo)}% off with {promo}
          {item.kind === "recurring" ? " (first month)" : ""}
        </p>
      ) : null}
      {item.timeline ? (
        <p className="mt-1 text-xs font-medium text-sky-300">
          Typical launch: {item.timeline}
        </p>
      ) : null}
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.blurb}</p>
      <ul className="mt-4 space-y-1.5">
        {item.includes.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-zinc-300">
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400"
              aria-hidden="true"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

const STRONG_ADDON_IDS = ["addon_pages", "addon_city", "addon_brand"];

export function PricingBuilder({
  stripeReady = false,
  cityHint,
  view = "default",
  initialPromo,
}: {
  stripeReady?: boolean;
  cityHint?: string;
  view?: "default" | "strong";
  initialPromo?: string;
}) {
  const strong = view === "strong";
  const [promoInput, setPromoInput] = useState(
    initialPromo?.trim().toUpperCase() === LAUNCH_PROMO.code ? LAUNCH_PROMO.code : "",
  );
  const [appliedPromo, setAppliedPromo] = useState(normalizePromoCode(initialPromo));
  const [promoError, setPromoError] = useState(
    initialPromo ? (promoCodeError(initialPromo) ?? "") : "",
  );
  const [packageId, setPackageId] = useState(strong ? "" : "growth");
  const [retainerId, setRetainerId] = useState<string>("");
  const [hubSelected, setHubSelected] = useState(true);
  const [addonIds, setAddonIds] = useState<string[]>(
    strong ? [] : ["addon_hub"],
  );
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState(
    cityHint ? `${cityHint} businesses` : "",
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const growthAddons = useMemo(
    () => PRICING_ADDONS.filter((item) => STRONG_ADDON_IDS.includes(item.id)),
    [],
  );

  const selectedIds = useMemo(() => {
    if (strong) {
      const ids: string[] = [];
      if (hubSelected) ids.push("addon_hub");
      if (packageId) ids.push(packageId);
      if (retainerId) ids.push(retainerId);
      ids.push(...addonIds);
      return Array.from(new Set(ids));
    }
    const ids = [packageId, ...addonIds];
    if (retainerId) ids.push(retainerId);
    return ids;
  }, [strong, hubSelected, packageId, addonIds, retainerId]);

  const totals = useMemo(
    () => summarizeSelection(selectedIds, appliedPromo),
    [selectedIds, appliedPromo],
  );

  function applyPromo(raw: string) {
    const code = normalizePromoCode(raw);
    if (!raw.trim()) {
      setAppliedPromo(null);
      setPromoError("");
      return;
    }
    if (!code) {
      setAppliedPromo(null);
      setPromoError(promoCodeError(raw) ?? "That promo code isn't valid.");
      return;
    }
    setPromoInput(code);
    setAppliedPromo(code);
    setPromoError("");
    trackEvent("pricing_promo_applied", { code, view });
  }

  const launchBanner = (
    <LaunchBanner
      applied={appliedPromo === LAUNCH_PROMO.code}
      onApply={() => applyPromo(LAUNCH_PROMO.code)}
    />
  );

  function toggleAddon(id: string) {
    setAddonIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function onCheckout(event: FormEvent) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      setError("Select at least one option to continue.");
      return;
    }
    setBusy(true);
    setError("");
    trackEvent("pricing_checkout_click", {
      view,
      package: packageId || "none",
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
          promoCode: appliedPromo ?? "",
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

  const checkoutForm = (
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
          {totals.items.length === 0 ? (
            <p className="mt-3 text-sm text-amber-200/90">
              Select Hub, a retainer, or an add-on.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {totals.items.map((item) => {
                const off = promoDiscountCents(item, totals.promo);
                return (
                  <li key={item.id}>
                    {item.name} ·{" "}
                    {off ? (
                      <>
                        <span className="text-zinc-500 line-through">
                          {formatCad(item.amount)}
                        </span>{" "}
                        <span className="text-emerald-300">
                          {formatCad(item.amount - off)}
                        </span>
                      </>
                    ) : (
                      formatCad(item.amount)
                    )}
                    {item.kind === "recurring" ? "/mo" : ""}
                    {off ? (
                      <span className="ml-1.5 text-xs text-emerald-300/80">
                        {promoPercentFor(item, totals.promo)}% off
                        {item.kind === "recurring" ? " first month" : ""}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4">
            <label htmlFor="pricing-promo" className="text-xs text-zinc-400">
              Promo code
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="pricing-promo"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyPromo(promoInput);
                  }
                }}
                className="hub-field w-36 border-indigo-400/20 bg-zinc-950/70 uppercase"
                placeholder={LAUNCH_PROMO.code}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => applyPromo(promoInput)}
                className="rounded-full border border-white/15 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
              >
                Apply
              </button>
            </div>
            {promoError ? (
              <p className="mt-1.5 text-xs text-rose-300">{promoError}</p>
            ) : totals.promo ? (
              <p className="mt-1.5 text-xs text-emerald-300">
                {totals.promo} saves{" "}
                {formatCad(totals.oneTimeDiscount + totals.firstMonthDiscount)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-w-[12rem] space-y-3 text-right text-sm">
          <div>
            <p className="text-zinc-400">One-time subtotal</p>
            {totals.oneTimeDiscount ? (
              <p className="text-zinc-500 line-through">{formatCad(totals.oneTimeBase)}</p>
            ) : null}
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
            <p className="text-zinc-400">
              {totals.firstMonthDiscount ? "First month" : "Monthly subtotal"}
            </p>
            {totals.firstMonthDiscount ? (
              <p className="text-zinc-500 line-through">{formatCad(totals.monthly)}</p>
            ) : null}
            <p className="text-lg font-semibold text-white">
              {formatCad(totals.firstMonth)}
              <span className="text-sm font-normal text-zinc-400"> /mo</span>
            </p>
            <p className="text-zinc-500">
              GST ({ALBERTA_GST_PERCENT}%) {formatCad(totals.firstMonthGst, 2)}
              /mo
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {formatCad(totals.firstMonthTotal, 2)}
              <span className="text-sm font-normal text-zinc-400"> /mo</span>
            </p>
            {totals.firstMonthDiscount ? (
              <p className="text-xs text-zinc-500">
                Then {formatCad(totals.monthlyTotal, 2)}/mo incl. GST
              </p>
            ) : null}
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
          disabled={busy || !email.trim() || selectedIds.length === 0}
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
      <p className="mt-1.5 text-xs text-zinc-400">
        Website packages can also be paid 50% up front and 50% at launch by
        invoice.{" "}
        <a href="#quote" className="font-medium text-indigo-300 hover:text-indigo-200">
          Request an invoice
        </a>
      </p>
      <p className="mt-1.5 text-xs text-zinc-400">
        {GUARANTEE_SHORT}{" "}
        <a href="#guarantee" className="font-medium text-indigo-300 hover:text-indigo-200">
          See the guarantee
        </a>
      </p>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </form>
  );

  if (strong) {
    return (
      <div className="space-y-10" id="growth">
        {launchBanner}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Your site scored well
          </p>
          <h2
            id="pricing-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Use the traffic you already have
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            A strong audit does not need a rebuild first. These are the Hub,
            retainer, and growth options that turn a good site into booked
            work. A full website package stays optional at the bottom.
          </p>
        </div>

        <div id="hub">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            DigiSol Hub
          </h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {PRICING_HUB.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                promo={appliedPromo}
                selected={hubSelected}
                mode="check"
                onToggle={() => setHubSelected((current) => !current)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Monthly retainers
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Local growth, paid media, or the full growth retainer. Pick one, or
            skip.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
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
              <h3 className="text-lg font-semibold text-white">No retainer</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Hub and one-time add-ons only.
              </p>
            </button>
            {PRICING_RETAINERS.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                promo={appliedPromo}
                selected={retainerId === item.id}
                mode="radio"
                onToggle={() => setRetainerId(item.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Growth add-ons
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Extra pages, city landings, and brand — layered on the site you
            already have.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {growthAddons.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                promo={appliedPromo}
                selected={addonIds.includes(item.id)}
                mode="check"
                onToggle={() => toggleAddon(item.id)}
              />
            ))}
          </div>
        </div>

        <details className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
            Need a full website rebuild instead? Open Foundation, Growth Engine,
            and Full Funnel
          </summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setPackageId("")}
              aria-pressed={!packageId}
              className={`rounded-2xl border p-5 text-left transition ${
                !packageId
                  ? "border-indigo-400/60 bg-indigo-500/15"
                  : "border-white/10 bg-zinc-900/40"
              }`}
            >
              <h3 className="text-lg font-semibold text-white">
                No website package
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Stay on Hub, retainers, and add-ons only.
              </p>
            </button>
            {PRICING_PACKAGES.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                promo={appliedPromo}
                selected={packageId === item.id}
                mode="radio"
                onToggle={() => setPackageId(item.id)}
              />
            ))}
          </div>
        </details>

        {checkoutForm}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {launchBanner}
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
              promo={appliedPromo}
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
              promo={appliedPromo}
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
          {[...PRICING_ADDONS, ...PRICING_HUB].map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              promo={appliedPromo}
              selected={addonIds.includes(item.id)}
              mode="check"
              onToggle={() => toggleAddon(item.id)}
            />
          ))}
        </div>
      </div>

      {checkoutForm}
    </div>
  );
}
