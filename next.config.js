const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const isMobile = process.env.BUILD_TARGET === "mobile";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isMobile ? "export" : "standalone",
  images: isMobile ? { unoptimized: true } : undefined,
};

module.exports = withPWA(nextConfig);
