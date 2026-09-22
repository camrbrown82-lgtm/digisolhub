/** @type {import('next').NextConfig} */
const nextConfig = {
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
