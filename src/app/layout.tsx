import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { DigiSolSiteBeacon } from "@/components/DigiSolSiteBeacon";
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
import { GOOGLE_ADS_ID } from "@/lib/ads";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DigiSol | Website Design, Development & Marketing in Alberta",
  description:
    "Alberta-first website design, custom web development, and digital marketing for local companies. Custom sites, local SEO, Google Ads, and Meta campaigns in Airdrie, Calgary, Edmonton, Red Deer, Cochrane, and across Alberta.",
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
    title: "DigiSol | Website Design, Development & Marketing in Alberta",
    description:
      "Custom website design, Next.js development, and growth marketing for Alberta companies. One partner from first look to closed deal.",
    url: DIGISOL_SITE_URL,
    siteName: "DigiSol",
    locale: "en_CA",
    type: "website",
    images: [{ url: "/logo.jpg", alt: "DigiSol — Website Design, Engineering & Growth in Alberta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiSol | Website Design, Development & Marketing in Alberta",
    description:
      "Custom website design, Next.js development, and growth marketing for Alberta companies. One partner from first look to closed deal.",
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
    "Alberta website design, web development, and digital marketing studio based in Airdrie. Custom websites, local SEO, Google Ads, and Meta campaigns for local companies in Airdrie, Calgary, Edmonton, Red Deer, Cochrane, and across Alberta.",
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4ZBG4VPC9C"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4ZBG4VPC9C');
            gtag('config', 'G-DCKSJLNE4T');
            ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
        <DigiSolSiteBeacon />
      </body>
    </html>
  );
}
