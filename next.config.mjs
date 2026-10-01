/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hub pages depend on the Working-on cookie. Don't reuse a page from a few
  // seconds ago after the company changes.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    outputFileTracingIncludes: {
      "/api/hub/business-card": ["./src/lib/fonts/**/*"],
      "/api/hub/ai/image": ["./src/lib/fonts/**/*"],
    },
  },
  transpilePackages: ["grapesjs", "grapesjs-preset-newsletter", "@xyflow/react"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wwwdigisol.com" }],
        destination: "https://wwwdigisol.com/:path*",
        permanent: true,
      },
      {
        source: "/dispatch/whats-new-at-digisol-september-2026",
        destination: "/dispatch/digisol-launch-growth-platform-for-alberta-businesses",
        permanent: true,
      },
      {
        source: "/hub/leads",
        destination: "/hub/contacts",
        permanent: true,
      },
      {
        source: "/hub/leads/new",
        destination: "/hub/contacts/new",
        permanent: true,
      },
      {
        source: "/hub/leads/:id",
        destination: "/hub/contacts",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
