import { PricingBuilder } from "@/components/sections/Pricing";
import { stripeConfigured } from "@/lib/stripe";

export function PricingSection({ cityHint }: { cityHint?: string }) {
  const stripeReady = stripeConfigured();
  return (
    <section
      id="pricing"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl">
        <PricingBuilder stripeReady={stripeReady} cityHint={cityHint} />
      </div>
    </section>
  );
}
