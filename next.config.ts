import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/github\/.*schedule\.json/i,
      handler: "CacheFirst",
      options: {
        cacheName: "schedule-cache",
        expiration: { maxEntries: 10, maxAgeSeconds: 300 },
      },
    },
    {
      urlPattern: /\/api\/github\/.*assignments\.json/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "assignments-cache", expiration: { maxEntries: 10 } },
    },
    {
      urlPattern: /\/api\/github\/.*running\.json/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "running-cache", expiration: { maxEntries: 10 } },
    },
    {
      urlPattern: /^https:\/\/api\.github\.com\/repos\/.*/i,
      method: "GET",
      handler: "NetworkFirst",
      options: {
        cacheName: "github-api-cache",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
