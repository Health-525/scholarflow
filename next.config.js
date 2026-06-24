const isMobile = process.env.BUILD_TARGET === "mobile";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isMobile ? "export" : "standalone",
  images: isMobile ? { unoptimized: true } : undefined,
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["jsdom"],
};

module.exports = nextConfig;
