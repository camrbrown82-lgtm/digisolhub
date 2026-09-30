import type { DispatchSection } from "@/lib/dispatch";
import { DIGISOL_SITE_URL } from "@/lib/site";

export type BlogLink = { label: string; href: string };

export type BlogSection = DispatchSection & {
  /** Related links shown under the section (internal or official sources). */
  links?: BlogLink[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  keywords: string[];
  sections: BlogSection[];
  /** Official, outside sources worth reading next. */
  furtherReading: BlogLink[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "competitive-analysis-and-weekly-google-checks",
    title: "See Where You Stand Against Local Competitors, and Keep Google Checked Every Week",
    excerpt:
      "A useful comparison looks at the whole path from search to booked work, not just who ranks first. Here is what DigiSol Hub now checks, and how the Monday Google check keeps Analytics, Search Console, and Ads from drifting.",
    category: "Growth",
    publishedAt: "2026-09-29",
    readingMinutes: 6,
    keywords: [
      "competitive analysis local business",
      "competitor website audit Alberta",
      "Google Analytics weekly check",
      "Search Console sitemap",
      "Google Ads wasted spend",
    ],
    sections: [
      {
        heading: "Guessing at the competition is expensive",
        body: [
          "Most owners know one or two rivals by name and assume the rest from what they see on Google. That misses the businesses that are quietly easier to contact, clearer about price, or simply better reviewed. By the time you notice, they already have the calls.",
          "A useful comparison is specific. It looks at your site and a short list of real competitors, then says where you are ahead, where you match, and where a customer would pick them instead.",
        ],
      },
      {
        heading: "What the Hub compares",
        body: [
          "In DigiSol Hub, competitive analysis belongs to the company you are working on. Kaylev can find the top local competitors, or you can paste the ones you already watch. It audits each website, checks Google reviews, listings, and social presence, then writes a prioritized plan. A run takes a few minutes.",
          "The score is built from the same checks every time, so a later run shows exactly which points you gained or lost. The areas it scores are:",
        ],
        bullets: [
          "Website experience and speed.",
          "On-page SEO: titles, headings, and descriptions.",
          "Local SEO and the Google Business Profile.",
          "Reviews and reputation.",
          "Content and authority.",
          "Offer, pricing, and messaging.",
          "Conversion: calls to action, forms, chat, and booking.",
          "Social and brand presence.",
          "Trust signals: credentials, guarantees, and proof.",
        ],
      },
      {
        heading: "Google does not stay set up by itself",
        body: [
          "A competitive gap is only half the story. Plenty of businesses set up Google once and never look again. Analytics stops counting visits properly, a sitemap is never read, and ad money goes to searches that never become leads.",
          "You stay the owner of every Google account. DigiSol is added as a user, and you can remove that access anytime.",
        ],
      },
      {
        heading: "What the Monday check covers",
        body: [
          "Every Monday the Hub checks the Working-on company's Google setup again and emails what changed. Safe fixes can be applied in one click. Nothing about ad spend changes without your OK.",
        ],
        bullets: [
          "Analytics: visits counted once, a full year of history kept, and calls, forms, and bookings treated as conversions.",
          "Search Console: key pages indexed, sitemaps read, and the searches where you are close to page one.",
          "Google Ads: searches that cost money without bringing leads, campaigns on low-intent networks, and broken conversion tracking.",
          "Google reviews: the listing's rating and review count, checked regularly, plus a one-tap link you can send after a finished job.",
        ],
        links: [
          { label: "Google Business Profile checklist for Airdrie and Calgary", href: "/blog/google-business-profile-checklist-airdrie-calgary" },
          { label: "How to get more Google reviews the right way", href: "/blog/how-to-get-more-google-reviews-alberta" },
        ],
      },
      {
        heading: "How to use both",
        body: [
          "Run the competitive analysis first so you know the one or two gaps that actually cost you work. Then let the Monday Google check keep the measurement honest, so the next comparison is based on real visits, real reviews, and ads that are not leaking.",
          "If you want this set up for your business, ask for a Google setup check or a competitive run. We will use your accounts and your competitors, and you keep ownership of both.",
        ],
        links: [
          { label: "See the weekly Google check", href: "/#google-autopilot" },
          { label: "Ask DigiSol to set it up", href: "/#contact" },
        ],
      },
    ],
    furtherReading: [
      { label: "Google: Tips to improve your local ranking", href: "https://support.google.com/business/answer/7091" },
      { label: "Google Search Console: Get started", href: "https://support.google.com/webmasters/answer/9128668" },
      { label: "Google Analytics: Set up a property", href: "https://support.google.com/analytics/answer/9304153" },
    ],
  },
  {
    slug: "how-to-get-more-google-reviews-alberta",
    title: "How to Get More Google Reviews for Your Alberta Business (the Right Way)",
    excerpt:
      "Reviews are one of the few local ranking signals you can influence every week. Here is a simple routine for asking, making it one tap, replying well, and staying inside Google's rules.",
    category: "Reputation",
    publishedAt: "2026-09-27",
    readingMinutes: 6,
    keywords: [
      "get more Google reviews",
      "Google reviews Alberta",
      "Google Business Profile reviews",
      "local SEO Airdrie",
      "online reputation Calgary",
    ],
    sections: [
      {
        heading: "Why reviews matter more than most owners think",
        body: [
          "When someone nearby searches for what you do, Google decides which businesses show in the map results mainly on relevance, distance, and prominence, meaning how well known you are. Google's own help pages say more reviews and positive ratings can help your local ranking, so reviews feed prominence directly.",
          "Reviews also do the selling before you ever talk to the customer. A business with a steady stream of recent, detailed reviews looks active and trustworthy. One with three reviews from two years ago looks like a gamble, even if the work is excellent.",
        ],
      },
      {
        heading: "Ask at the moment the customer is happiest",
        body: [
          "The best time to ask is right after a win: the job is finished, the site goes live, the customer says thank you. Waiting a week means the moment has passed and the ask feels like a chore.",
        ],
        bullets: [
          "Ask in person, simply: \"If you have a minute, an honest Google review would really help a small local business.\"",
          "Follow up the same day by text or email with the direct review link so it is one tap.",
          "Ask every customer, keep it low pressure, and let them write whatever they want. Google's policy does not allow asking for specific content or pushing people to review on the spot.",
        ],
      },
      {
        heading: "Make leaving a review take ten seconds",
        body: [
          "Every extra step loses people. Your Google Business Profile has a share-review link that opens the review box directly. Use it everywhere a happy customer might see it.",
        ],
        bullets: [
          "Your email signature and invoice footer.",
          "A QR code on business cards, receipts, or a sign at your counter or job site.",
          "The thank-you page and follow-up email after a project wraps.",
          "An automated follow-up a day or two after the job, so nobody has to remember to ask.",
        ],
      },
      {
        heading: "What not to do",
        body: [
          "Shortcuts can get reviews removed or your profile penalized, and in Canada misleading reviews can also be a deceptive marketing problem.",
        ],
        bullets: [
          "Do not offer discounts, gifts, or entries into a draw in exchange for reviews.",
          "Do not only ask happy customers while steering unhappy ones elsewhere. Google calls this selectively soliciting positive reviews and does not allow it.",
          "Do not have staff, friends, or family post reviews, and never buy them.",
          "Do not write reviews for your own business or post negative reviews of competitors.",
        ],
      },
      {
        heading: "Reply to every review, including the bad ones",
        body: [
          "Replies show future customers how you treat people. Keep them short, personal, and not salesy: use the reviewer's name and respond to what they actually said, rather than pasting the same thank-you everywhere. For a negative review, stay calm, own what you can, never share the customer's private details, and offer to sort it out by phone or email. A fair reply to a bad review often builds more trust than another five-star rating.",
        ],
      },
      {
        heading: "Build a rhythm, not a burst",
        body: [
          "Ten reviews in one week and then silence looks odd, and Google watches for unusual review patterns. A few a month, every month, keeps your profile fresh. Track your rating and review count monthly so you can see the trend and notice quickly if something slips.",
        ],
        links: [
          { label: "Google Business Profile checklist for Airdrie and Calgary businesses", href: "/blog/google-business-profile-checklist-airdrie-calgary" },
          { label: "Ask DigiSol to set up automatic review requests", href: "/#contact" },
        ],
      },
    ],
    furtherReading: [
      { label: "Google: Tips to improve your local ranking", href: "https://support.google.com/business/answer/7091" },
      { label: "Google: Tips to get more reviews", href: "https://support.google.com/business/answer/3474122" },
      { label: "Google Maps: Prohibited and restricted content policy", href: "https://support.google.com/contributionpolicy/answer/7400114" },
    ],
  },
  {
    slug: "small-business-website-cost-alberta-2026",
    title: "What Does a Small Business Website Cost in Alberta in 2026?",
    excerpt:
      "DIY builder, freelancer, or custom build? What actually drives the price, the hidden costs to ask about, and DigiSol's published package prices as a real reference point.",
    category: "Websites",
    publishedAt: "2026-09-27",
    readingMinutes: 7,
    keywords: [
      "website cost Alberta",
      "small business website price Calgary",
      "web design cost Airdrie",
      "how much does a website cost Canada",
      "custom website Alberta",
    ],
    sections: [
      {
        heading: "The short answer",
        body: [
          "It depends on what the website has to do. A site that only needs to exist costs very little. A site that has to bring in leads, show up in local search, and follow up with customers is a business tool, and it is priced like one. The useful question is not \"how cheap can I get a website\" but \"what will this site do for my business, and what is that worth?\"",
        ],
      },
      {
        heading: "Three ways to get a website",
        body: [],
        bullets: [
          "DIY builders: a monthly subscription and your own time. Good for testing an idea. The catch is the hours you spend and the limits on speed, SEO control, and design.",
          "Freelancer or template setup: a one-time fee to customize a theme. Quality varies a lot, so look at recent work and ask who handles updates after launch.",
          "Custom build: designed around your brand and customers, built for speed, and set up to capture and track leads. Higher upfront cost, but it is built to earn its keep.",
        ],
      },
      {
        heading: "What drives the price",
        body: [],
        bullets: [
          "Number of pages and how much content needs writing.",
          "Custom design versus a template.",
          "Features: booking, payments, quote forms, client portals.",
          "Local SEO setup: Google Business Profile, citations, and city or service pages.",
          "Lead tracking and follow-up: analytics, a CRM, and automated emails.",
          "Ongoing care: updates, security, and improvements after launch.",
        ],
      },
      {
        heading: "A real reference point: DigiSol's published prices",
        body: [
          "Plenty of agencies will not show prices until you call. We publish ours so you can compare. All prices are in Canadian dollars, plus GST.",
        ],
        bullets: [
          "Foundation, $4,500: custom design and a fast build of up to 6 core pages, mobile-first, contact forms that feed straight into your CRM, analytics, and local business schema.",
          "Growth Engine, $7,500: everything in Foundation plus Google Business Profile and citation setup, a local SEO starter, conversion paths, an automated follow-up workflow, and city or service landing pages.",
          "Full Funnel, $12,000: everything in Growth Engine plus Google Ads and Meta campaign setup, landing pages for paid traffic, a campaign dashboard, and a quarterly strategy review.",
        ],
        links: [{ label: "See full DigiSol pricing and add-ons", href: "/pricing" }],
      },
      {
        heading: "Hidden costs to ask about",
        body: [
          "The build price is only part of the picture. Before you sign with anyone, get clear answers on these:",
        ],
        bullets: [
          "Domain and hosting: who pays, and whose name are they in?",
          "Business email: included or separate?",
          "Maintenance: what does it cost after launch, and what does it cover?",
          "Ownership: if you leave, do you keep the site, the content, and the domain?",
          "Changes: how are edits and new pages priced?",
        ],
      },
      {
        heading: "Questions to ask any web designer",
        body: [],
        bullets: [
          "How fast will the site load on a phone, and how do you measure it?",
          "How will I know how many leads the site brings in?",
          "What will you do so local customers find me on Google?",
          "Can I see two or three recent sites you built, and talk to those clients?",
        ],
        after: [
          "If you want a second opinion on your current site first, run a free website audit. It checks speed, SEO basics, and structure in about a minute.",
        ],
        links: [
          { label: "Free website audit", href: "/media/website-audit" },
          { label: "Get a free quote", href: "/#quote" },
        ],
      },
    ],
    furtherReading: [
      { label: "Google Search Central: SEO Starter Guide", href: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
      { label: "web.dev: Core Web Vitals explained", href: "https://web.dev/articles/vitals" },
    ],
  },
  {
    slug: "google-business-profile-checklist-airdrie-calgary",
    title: "Google Business Profile Checklist for Airdrie and Calgary Businesses",
    excerpt:
      "Your Google Business Profile is often the first thing local customers see, before your website. Work through this checklist to make sure it is complete, accurate, and working for you.",
    category: "Local SEO",
    publishedAt: "2026-09-27",
    readingMinutes: 6,
    keywords: [
      "Google Business Profile checklist",
      "Google Business Profile Airdrie",
      "local SEO Calgary",
      "Google Maps ranking Alberta",
      "NAP consistency",
    ],
    sections: [
      {
        heading: "Why your profile matters",
        body: [
          "For \"near me\" searches, many customers call or get directions straight from the map results without ever visiting a website. A complete, active profile makes you easier to find and easier to choose.",
        ],
      },
      {
        heading: "The basics: get these exactly right",
        body: [],
        bullets: [
          "Claim and verify the profile so you control it.",
          "Business name: your real name as it appears on your signage. Adding keywords or city names breaks Google's guidelines and can get the profile suspended.",
          "Primary category: the most specific one that fits, for example \"Plumber\" rather than \"Contractor\". Add a few accurate secondary categories.",
          "Address or service area: if you visit customers and do not serve them at your address, set a service area and hide the address.",
          "Hours, including holiday hours, so nobody drives over to a locked door.",
          "Phone number and website. Add tracking tags to the website link so your analytics shows how many visits come from your profile.",
        ],
      },
      {
        heading: "Fill it out completely",
        body: [],
        bullets: [
          "Services or products, with short descriptions.",
          "A business description in plain language: who you help, where, and what makes you different.",
          "Real photos of your work, team, vehicles, and location. Add new ones regularly; stock photos do not build trust.",
          "Attributes that apply, such as online estimates or wheelchair accessible.",
        ],
      },
      {
        heading: "Keep it active",
        body: [],
        bullets: [
          "Post updates, offers, or recent projects a few times a month.",
          "Ask for reviews after every completed job and reply to all of them.",
          "Check the profile monthly. Anyone can suggest edits, so make sure your details have not been changed.",
        ],
        links: [
          { label: "How to get more Google reviews the right way", href: "/blog/how-to-get-more-google-reviews-alberta" },
        ],
      },
      {
        heading: "Make your details match everywhere",
        body: [
          "Google cross-checks your name, address, and phone number across the web. When they match everywhere, it trusts your listing more. List the exact same details on:",
        ],
        bullets: [
          "Your website footer and contact page.",
          "Bing Places and Apple Business Connect, which power Bing, Apple Maps, and Siri.",
          "Facebook, Instagram, and Yelp.",
          "Local directories such as your chamber of commerce and industry associations.",
        ],
        after: [
          "Local links help too. Sponsoring a community event, joining your local chamber of commerce, or being featured by a local news site all build the kind of reputation Google can see.",
        ],
        links: [
          { label: "DigiSol local SEO for Airdrie businesses", href: "/locations/airdrie" },
          { label: "Get a free quote", href: "/#quote" },
        ],
      },
    ],
    furtherReading: [
      { label: "Google: Guidelines for representing your business", href: "https://support.google.com/business/answer/3038177" },
      { label: "Google: Tips to improve your local ranking", href: "https://support.google.com/business/answer/7091" },
      { label: "Bing Places for Business", href: "https://www.bingplaces.com" },
      { label: "Apple Business Connect", href: "https://businessconnect.apple.com" },
    ],
  },
];

export function blogPath(slug: string) {
  return `/blog/${slug}`;
}

export function blogUrl(slug: string) {
  return `${DIGISOL_SITE_URL}${blogPath(slug)}`;
}

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

/** Newest first, hiding posts scheduled for a future date. */
export function publishedBlogPosts(asOf = new Date()) {
  const today = asOf.toISOString().slice(0, 10);
  return BLOG_POSTS.filter((post) => post.publishedAt <= today).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}
