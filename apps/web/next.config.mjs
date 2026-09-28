import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // @doloyal/shared publishes CommonJS for the API. Bundling that build
    // defeats tree-shaking, so importing one helper pulled every zod schema
    // into every page. The web app compiles the ESM source instead
    // (already listed in transpilePackages; the package is side-effect free).
    config.resolve.alias = {
      ...config.resolve.alias,
      "@doloyal/shared$": path.resolve(here, "../../packages/shared/src/index.ts"),
    };
    return config;
  },
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
