const isMobile = process.env.BUILD_TARGET === "mobile";
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isMobile ? "export" : "standalone",
  images: isMobile ? { unoptimized: true } : undefined,
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  serverExternalPackages: ["jsdom"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@base-ui/react",
      "sonner",
      "react-day-picker",
    ],
    reactCompiler: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
