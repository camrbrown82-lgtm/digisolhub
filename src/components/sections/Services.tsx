import { Code2, Megaphone, Palette, TrendingUp, ShoppingBag, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";

const services: {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: BrandAccent;
  featured?: boolean;
}[] = [
  {
    icon: Palette,
    title: "Website Design",
    body: "Every engagement starts here. We design the look, the layout, and the path to inquire — then we build and market that same design. You are not buying a template with a logo slapped on.",
    accent: "sky",
    featured: true,
  },
  {
    icon: Code2,
    title: "Custom Web & App Development",
    body: "React, Next.js, and custom platforms that ship the design as a fast, durable site — high performance, no template bloat, no brittle page builders.",
    accent: "blue",
  },
  {
    icon: Megaphone,
    title: "Search & Paid Media Campaigns",
    body: "Google Ads, Meta Ads, and local SEO for Airdrie, Calgary, Edmonton, and nearby Alberta markets — so local searches turn into customers.",
    accent: "indigo",
  },
  {
    icon: TrendingUp,
    title: "Full-Funnel Integration & CRO",
    body: "Turn local visitors into leads with analytics, conversion paths, and email/lead workflows wired into the product.",
    accent: "blue",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce & Platform Solutions",
    body: "Online stores and custom auction/web platforms for Alberta retailers and service businesses that need to sell, list, and grow.",
    accent: "indigo",
  },
];

export function Services() {
  return (
    <section
      id="services"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="services-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Design, engineering &amp; marketing
          </p>
          <h2
            id="services-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            One Roof, From Look to Lead
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            We design the website, build the platform, and fill the local
            funnel. Same partner from first mockup to booked work.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map(({ icon: Icon, title, body, accent, featured }) => {
            const styles = brandAccent[accent];
            return (
              <li
                key={title}
                className={featured ? "h-full sm:col-span-2" : "h-full"}
              >
                <BrandCard accent={accent} className="h-full">
                  <div
                    className={
                      featured
                        ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
                        : ""
                    }
                  >
                    <span
                      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className={`text-xl font-semibold text-white ${featured ? "" : "mt-5"}`}>
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                        {body}
                      </p>
                    </div>
                  </div>
                </BrandCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
