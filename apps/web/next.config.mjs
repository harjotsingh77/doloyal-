/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@doloyal/ui", "lucide-react", "recharts"],
  },
  transpilePackages: ["@doloyal/ui", "@doloyal/shared"],
};

export default nextConfig;
