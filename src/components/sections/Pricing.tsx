"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, Sparkles, Tag } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { LOCALE_META } from "@/lib/i18n/config";
import { useLocale, useLocalizedHref, useMessages } from "@/lib/i18n/client";
import { localizePricingItem } from "@/lib/i18n/pricing";
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
  promoDiscountCents,
  promoPercentFor,
  summarizeSelection,
  type PricingItem,
} from "@/lib/pricing";

/** Builder strings, CAD formatting and item wording for the current page language. */
function usePricingText() {
  const locale = useLocale();
  const messages = useMessages();
  const intl = LOCALE_META[locale].intl;
  return {
    locale,
    t: messages.pricingBuilder,
    guaranteeShort: messages.guarantee.short,
    cad: (cents: number, digits = 0) => formatCad(cents, digits, intl),
    item: (item: PricingItem) => localizePricingItem(item, locale),
  };
}

function LaunchBanner({
  applied,
  onApply,
}: {
  applied: boolean;
  onApply: () => void;
}) {
  const { t } = usePricingText();
  const status = launchPromoStatus();
  if (status === "ended") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-left">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">
          <Tag className="h-4 w-4" aria-hidden="true" />
          {t.launchOffer(LAUNCH_PROMO.code)}
        </p>
        <p className="mt-1.5 text-sm text-zinc-200">
          {t.launchBody(LAUNCH_PROMO.buildPercent, LAUNCH_PROMO.otherPercent)}{" "}
          <span className="text-zinc-400">{t.launchWindow}</span>
        </p>
      </div>
      {status === "upcoming" ? (
        <span className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-200">
          {t.launchStarts}
        </span>
      ) : applied ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200">
          <Check className="h-4 w-4" aria-hidden="true" />
          {t.promoApplied(LAUNCH_PROMO.code)}
        </span>
      ) : (
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          {t.applyCode(LAUNCH_PROMO.code)}
        </button>
      )}
    </div>
  );
}

function ItemCard({
  item: baseItem,
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
  const { t, cad, item: localize } = usePricingText();
  const item = localize(baseItem);
  const off = promoDiscountCents(item, promo);
  const recurring = item.kind === "recurring";
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
              {cad(item.amount)}
            </span>
            <span className="text-emerald-300">{cad(item.amount - off)}</span>
          </>
        ) : (
          cad(item.amount)
        )}
        <span className="text-sm font-normal text-zinc-400">
          {recurring ? t.perMonth : t.oneTime}
        </span>
      </p>
      {off && promo ? (
        <p className="mt-1 text-xs font-medium text-emerald-300/90">
          {t.pctOff(promoPercentFor(item, promo), promo, recurring)}
        </p>
      ) : null}
      {item.timeline ? (
        <p className="mt-1 text-xs font-medium text-sky-300">{t.typicalLaunch(item.timeline)}</p>
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
  const { locale, t, guaranteeShort, cad, item: localizeItem } = usePricingText();
  const localize = useLocalizedHref();
  const strong = view === "strong";

  function promoError(raw: string): string {
    const value = raw.trim();
    if (!value) return "";
    if (value.toUpperCase() !== LAUNCH_PROMO.code) return t.promoInvalid(value.slice(0, 40));
    const status = launchPromoStatus();
    if (status === "upcoming") return t.promoUpcoming(LAUNCH_PROMO.code);
    if (status === "ended") return t.promoEnded(LAUNCH_PROMO.code);
    return "";
  }

  const [promoInput, setPromoInput] = useState(
    initialPromo?.trim().toUpperCase() === LAUNCH_PROMO.code ? LAUNCH_PROMO.code : "",
  );
  const [appliedPromo, setAppliedPromo] = useState(normalizePromoCode(initialPromo));
  const [promoErrorText, setPromoErrorText] = useState(
    initialPromo ? promoError(initialPromo) : "",
  );
  const [packageId, setPackageId] = useState(strong ? "" : "growth");
  const [retainerId, setRetainerId] = useState<string>("");
  const [hubSelected, setHubSelected] = useState(true);
  const [addonIds, setAddonIds] = useState<string[]>(
    strong ? [] : ["addon_hub"],
  );
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState(cityHint ? t.cityIndustry(cityHint) : "");
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
      setPromoErrorText("");
      return;
    }
    if (!code) {
      setAppliedPromo(null);
      setPromoErrorText(promoError(raw) || t.promoInvalid(raw.trim().slice(0, 40)));
      return;
    }
    setPromoInput(code);
    setAppliedPromo(code);
    setPromoErrorText("");
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
      setError(t.selectOne);
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
          locale,
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || t.checkoutUnavailable);
      }
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.checkoutFailed);
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
            {t.yourStack}
          </p>
          {totals.items.length === 0 ? (
            <p className="mt-3 text-sm text-amber-200/90">{t.selectSome}</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              {totals.items.map((item) => {
                const off = promoDiscountCents(item, totals.promo);
                const recurring = item.kind === "recurring";
                return (
                  <li key={item.id}>
                    {localizeItem(item).name} ·{" "}
                    {off ? (
                      <>
                        <span className="text-zinc-500 line-through">
                          {cad(item.amount)}
                        </span>{" "}
                        <span className="text-emerald-300">
                          {cad(item.amount - off)}
                        </span>
                      </>
                    ) : (
                      cad(item.amount)
                    )}
                    {recurring ? t.mo : ""}
                    {off ? (
                      <span className="ml-1.5 text-xs text-emerald-300/80">
                        {t.pctOffShort(promoPercentFor(item, totals.promo), recurring)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4">
            <label htmlFor="pricing-promo" className="text-xs text-zinc-400">
              {t.promoLabel}
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
                {t.apply}
              </button>
            </div>
            {promoErrorText ? (
              <p className="mt-1.5 text-xs text-rose-300">{promoErrorText}</p>
            ) : totals.promo ? (
              <p className="mt-1.5 text-xs text-emerald-300">
                {t.promoSaves(totals.promo, cad(totals.oneTimeDiscount + totals.firstMonthDiscount))}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-w-[12rem] space-y-3 text-right text-sm">
          <div>
            <p className="text-zinc-400">{t.oneTimeSubtotal}</p>
            {totals.oneTimeDiscount ? (
              <p className="text-zinc-500 line-through">{cad(totals.oneTimeBase)}</p>
            ) : null}
            <p className="text-lg font-semibold text-white">
              {cad(totals.oneTime)}
            </p>
            <p className="text-zinc-500">
              {t.gst(ALBERTA_GST_PERCENT)} {cad(totals.oneTimeGst, 2)}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {cad(totals.oneTimeTotal, 2)}
            </p>
          </div>
          <div>
            <p className="text-zinc-400">
              {totals.firstMonthDiscount ? t.firstMonth : t.monthlySubtotal}
            </p>
            {totals.firstMonthDiscount ? (
              <p className="text-zinc-500 line-through">{cad(totals.monthly)}</p>
            ) : null}
            <p className="text-lg font-semibold text-white">
              {cad(totals.firstMonth)}
              <span className="text-sm font-normal text-zinc-400"> {t.mo}</span>
            </p>
            <p className="text-zinc-500">
              {t.gst(ALBERTA_GST_PERCENT)} {cad(totals.firstMonthGst, 2)}
              {t.mo}
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {cad(totals.firstMonthTotal, 2)}
              <span className="text-sm font-normal text-zinc-400"> {t.mo}</span>
            </p>
            {totals.firstMonthDiscount ? (
              <p className="text-xs text-zinc-500">{t.thenMonthly(cad(totals.monthlyTotal, 2))}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-zinc-300">
          {t.workEmail}
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
            placeholder={t.emailPlaceholder}
          />
        </label>
        <label className="text-sm text-zinc-300">
          {t.company}
          <input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
            placeholder={t.companyPlaceholder}
          />
        </label>
        <label className="text-sm text-zinc-300">
          {t.industry}
          <input
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
            placeholder={t.industryPlaceholder}
          />
        </label>
        <label className="text-sm text-zinc-300">
          {t.notes}
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="hub-field mt-1.5 border-indigo-400/20 bg-zinc-950/70"
            placeholder={t.notesPlaceholder}
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
          {busy ? t.redirecting : t.pay}
        </button>
        <a
          href={localize("/#contact")}
          className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
        >
          {t.consultFirst}
        </a>
      </div>
      {!stripeReady ? (
        <p className="mt-3 text-xs text-amber-200/90">{t.stripeNotReady}</p>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">{t.stripeReady(ALBERTA_GST_PERCENT)}</p>
      )}
      <p className="mt-1.5 text-xs text-zinc-400">
        {t.invoice}{" "}
        <a href="#quote" className="font-medium text-indigo-300 hover:text-indigo-200">
          {t.requestInvoice}
        </a>
      </p>
      <p className="mt-1.5 text-xs text-zinc-400">
        {guaranteeShort}{" "}
        <a href="#guarantee" className="font-medium text-indigo-300 hover:text-indigo-200">
          {t.seeGuarantee}
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
            {t.strongEyebrow}
          </p>
          <h2
            id="pricing-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.strongTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.strongBody}</p>
        </div>

        <div id="hub">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {t.hubHeading}
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
            {t.retainersHeading}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">{t.retainersBody}</p>
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50">
            {t.monthlyFeeNote}
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
              <h3 className="text-lg font-semibold text-white">{t.noRetainer}</h3>
              <p className="mt-2 text-sm text-zinc-400">{t.noRetainerBody}</p>
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
            {t.addonsHeading}
          </h3>
          <p className="mt-2 text-sm text-zinc-500">{t.addonsBody}</p>
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
            {t.rebuildSummary}
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
              <h3 className="text-lg font-semibold text-white">{t.noPackage}</h3>
              <p className="mt-2 text-sm text-zinc-400">{t.noPackageBody}</p>
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
          {t.defaultEyebrow}
        </p>
        <h2
          id="pricing-heading"
          className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {t.defaultTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.defaultBody(ALBERTA_GST_PERCENT)}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {t.coreHeading}
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
          {t.monthlyHeading}
        </h3>
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50">
          {t.monthlyFeeNote}
        </p>
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
            <h3 className="text-lg font-semibold text-white">{t.launchOnly}</h3>
            <p className="mt-2 text-sm text-zinc-400">{t.launchOnlyBody}</p>
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
          {t.modulesHeading}
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
