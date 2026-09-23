import { ArrowRight, Sparkles } from "lucide-react";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { TrackedLink } from "@/components/TrackedLink";
import type { HomeCopy } from "@/lib/visitorRegion";

export function Hero({ copy }: { copy: HomeCopy }) {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/20 via-zinc-950 to-zinc-950"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium tracking-wide text-indigo-300 sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.heroEyebrow}
        </p>
        <h1
          id="hero-heading"
          className="text-balance text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          {copy.heroTitleLead}{" "}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {copy.heroTitleAccent}
          </span>
          {copy.heroTitleTail ? <> {copy.heroTitleTail}</> : null}
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-balance text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
          {copy.heroTagline}
        </p>
        <p className="mx-auto mt-4 max-w-3xl text-balance text-lg font-medium tracking-tight text-zinc-300 sm:text-xl">
          {copy.heroSub}
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg">
          {copy.heroBody}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-medium tracking-wide text-indigo-300">
          {copy.heroMarkets}
        </p>
        <p className="mx-auto mt-2 text-sm text-zinc-400">
          <a
            href="https://wwwdigisol.com"
            className="font-medium text-zinc-300 underline-offset-4 transition hover:text-white hover:underline"
          >
            wwwdigisol.com
          </a>
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrackedLink
            href="#contact"
            eventName="cta_click"
            eventParams={{ cta_name: "book_consultation", location: "hero" }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:w-auto"
          >
            Book a Free Consultation
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
          <TrackedLink
            href="#services"
            eventName="cta_click"
            eventParams={{ cta_name: "explore_services", location: "hero" }}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 sm:w-auto"
          >
            Explore Services
          </TrackedLink>
        </div>
        <ListingLinks location="hero" />
        <div className="mt-5 flex justify-center">
          <GoogleRating location="hero" />
        </div>
      </div>
    </section>
  );
}
