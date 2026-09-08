/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["grapesjs", "grapesjs-preset-newsletter", "@xyflow/react"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
