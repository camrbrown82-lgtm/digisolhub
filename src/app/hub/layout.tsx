import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DigiSol Hub",
  robots: { index: false, follow: false },
};

export default function HubRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
