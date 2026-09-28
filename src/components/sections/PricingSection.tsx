import { PricingBuilder } from "@/components/sections/Pricing";
import { stripeConfigured } from "@/lib/stripe";

export function PricingSection({
  cityHint,
  view = "default",
  promo,
}: {
  cityHint?: string;
  /** strong = high-score audit email: Hub, retainers, and growth add-ons first. */
  view?: "default" | "strong";
  promo?: string;
}) {
  const stripeReady = stripeConfigured();
  return (
    <section
      id="pricing"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl">
        <PricingBuilder
          stripeReady={stripeReady}
          cityHint={cityHint}
          view={view}
          initialPromo={promo}
        />
      </div>
    </section>
  );
}
