import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Production API origin, when known at build time. `/backend/*` is then
 * proxied by Vercel's edge (an external rewrite) instead of invoking the
 * `app/backend/[...path]` route handler, which put a second serverless hop
 * (and its cold start) in front of every API call. Without it the route
 * handler still serves `/backend` and reads API_BASE_URL at request time.
 */
function apiRewriteOrigin() {
  if (process.env.NODE_ENV !== "production") return null;
  const raw = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(raw) || /localhost|127\.0\.0\.1/.test(raw)) return null;
  return raw;
}

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
  async rewrites() {
    const origin = apiRewriteOrigin();
    if (!origin) return [];
    return {
      beforeFiles: [{ source: "/backend/:path*", destination: `${origin}/:path*` }],
    };
  },
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
      // Unverified customer stats / case studies are hidden until real ones exist.
      { source: "/customers", destination: "/", permanent: false },
      { source: "/case-studies", destination: "/", permanent: false },
      { source: "/case-studies/:slug", destination: "/", permanent: false },
      { source: "/careers", destination: "/about", permanent: false },
    ];
  },
};

export default nextConfig;
