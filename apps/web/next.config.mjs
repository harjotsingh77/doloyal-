/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@doloyal/ui", "lucide-react", "recharts"],
  },
  transpilePackages: ["@doloyal/ui", "@doloyal/shared"],
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/sign-in",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
