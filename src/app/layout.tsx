import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { DigiSolSiteBeacon } from "@/components/DigiSolSiteBeacon";
import { PublicKaylevChat } from "@/components/PublicKaylevChat";
import { PublicSiteAnalytics } from "@/components/PublicSiteAnalytics";
import {
  WEBSITE_AUDIT_DESCRIPTION,
  WEBSITE_AUDIT_PAGE_URL,
  WEBSITE_AUDIT_TITLE,
  WEBSITE_AUDIT_UPLOAD_DATE,
  WEBSITE_AUDIT_VIDEO_URL,
} from "@/lib/media";
import {
  DIGISOL_CITY,
  DIGISOL_GOOGLE_LISTING_URL,
  DIGISOL_LINKEDIN_URL,
  DIGISOL_PHONE,
  DIGISOL_POSTAL_CODE,
  DIGISOL_SAME_AS,
  DIGISOL_SITE_URL,
  DIGISOL_STREET_ADDRESS,
} from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DigiSol | Website Design, Development & Marketing",
  description:
    "Custom website design, Next.js development, SEO, and growth marketing for companies everywhere. DigiSol designs the site, engineers the platform, and helps the right people find you and convert.",
  metadataBase: new URL(DIGISOL_SITE_URL),
  verification: {
    google: "QwmR9VlADhodbnOuBT3FM-XaaBAyM9BLcz5bLfRdi8Y",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "DigiSol | Website Design, Development & Marketing",
    description:
      "Custom website design, Next.js development, and growth marketing. One partner from first look to closed deal.",
    url: DIGISOL_SITE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "/logo.jpg",
        alt: "DigiSol — Website Design, Engineering & Growth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiSol | Website Design, Development & Marketing",
    description:
      "Custom website design, Next.js development, and growth marketing. One partner from first look to closed deal.",
    images: ["/logo.jpg"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService"],
  name: "DigiSol",
  legalName: "DigiSol",
  url: DIGISOL_SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${DIGISOL_SITE_URL}/logo.jpg`,
    width: 1024,
    height: 559,
  },
  image: `${DIGISOL_SITE_URL}/logo.jpg`,
  description:
    "Website design, web development, and digital marketing studio. Custom websites, SEO, Google Ads, and Meta campaigns for growing companies — headquartered in Airdrie, Alberta, serving clients everywhere.",
  email: "cam.r.brown82@gmail.com",
  telephone: DIGISOL_PHONE,
  address: {
    "@type": "PostalAddress",
    streetAddress: DIGISOL_STREET_ADDRESS,
    addressLocality: DIGISOL_CITY,
    addressRegion: "AB",
    postalCode: DIGISOL_POSTAL_CODE,
    addressCountry: "CA",
  },
  areaServed: [
    { "@type": "City", name: "Airdrie" },
    { "@type": "City", name: "Calgary" },
    { "@type": "City", name: "Edmonton" },
    { "@type": "City", name: "Red Deer" },
    { "@type": "City", name: "Cochrane" },
    { "@type": "AdministrativeArea", name: "Alberta" },
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "United States" },
  ],
  serviceType: [
    "Website Design",
    "Web Development",
    "Digital Marketing",
    "Local SEO",
    "Google Ads",
    "Meta Ads",
    "Conversion Rate Optimization",
    "E-Commerce Development",
  ],
  hasMap: DIGISOL_GOOGLE_LISTING_URL,
  founder: {
    "@type": "Person",
    name: "Cameron Brown",
    jobTitle: "Founder & CEO",
    url: DIGISOL_LINKEDIN_URL,
    sameAs: [DIGISOL_LINKEDIN_URL],
    description:
      "Certified Full Stack Developer and Digital Marketing and Social Media Specialist",
  },
  sameAs: [...DIGISOL_SAME_AS],
  subjectOf: {
    "@type": "VideoObject",
    name: WEBSITE_AUDIT_TITLE,
    description: WEBSITE_AUDIT_DESCRIPTION,
    url: WEBSITE_AUDIT_PAGE_URL,
    contentUrl: WEBSITE_AUDIT_VIDEO_URL,
    embedUrl: WEBSITE_AUDIT_PAGE_URL,
    thumbnailUrl: `${DIGISOL_SITE_URL}/logo.jpg`,
    uploadDate: WEBSITE_AUDIT_UPLOAD_DATE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={inter.variable}>
      <body className="font-sans min-h-screen bg-zinc-950 text-zinc-100">
        <Script
          src="https://cdn.cookiehub.eu/c2/d9c0b74d.js"
          strategy="beforeInteractive"
        />
        <Script id="cookiehub-init" strategy="beforeInteractive">
          {`
            (function () {
              function loadCookieHub() {
                var cpm = {};
                if (window.cookiehub) window.cookiehub.load(cpm);
              }
              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", loadCookieHub);
              } else {
                loadCookieHub();
              }
            })();
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
        <PublicKaylevChat />
        <PublicSiteAnalytics>
          <DigiSolSiteBeacon />
        </PublicSiteAnalytics>
      </body>
    </html>
  );
}
