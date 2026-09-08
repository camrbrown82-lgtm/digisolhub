import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DigiSol | Digital Marketing & Web Development",
  description:
    "DigiSol is a digital marketing and web development studio. We build high-converting websites and run the growth marketing that scales them.",
  metadataBase: new URL("https://wwwdigisol.com"),
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
    title: "DigiSol | Code + Growth, Built Together",
    description:
      "Custom web development and digital marketing that convert. One partner from first click to closed deal.",
    url: "https://wwwdigisol.com",
    siteName: "DigiSol",
    type: "website",
    images: [{ url: "/logo.jpg", alt: "DigiSol — Engineering & Growth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiSol | Code + Growth, Built Together",
    description:
      "Custom web development and digital marketing that convert. One partner from first click to closed deal.",
    images: ["/logo.jpg"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  name: "DigiSol",
  legalName: "DigiSol",
  url: "https://wwwdigisol.com",
  logo: {
    "@type": "ImageObject",
    url: "https://wwwdigisol.com/logo.jpg",
    width: 1024,
    height: 559,
  },
  image: "https://wwwdigisol.com/logo.jpg",
  description:
    "DigiSol provides digital marketing and custom web development. High-converting websites and growth marketing built under one roof.",
  email: "cam.r.brown82@gmail.com",
  telephone: "+1-587-577-0782",
  areaServed: [
    { "@type": "AdministrativeArea", name: "Alberta" },
    { "@type": "Country", name: "Canada" },
  ],
  serviceType: [
    "Digital Marketing",
    "Web Development",
    "Search Engine Optimization",
    "Conversion Rate Optimization",
  ],
  founder: {
    "@type": "Person",
    name: "Cameron Brown",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
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
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}
