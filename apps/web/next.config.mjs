/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@doloyal/ui",
      "framer-motion",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*.:ext(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  transpilePackages: ["@doloyal/ui", "@doloyal/shared"],
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/sign-in",
        permanent: true,
      },
      {
        source: "/demo",
        destination: "/book-demo",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
