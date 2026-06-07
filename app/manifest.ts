import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScholarFlow",
    short_name: "SF",
    description: "统一学习管理中枢 — 课表、作业、跑步、日报",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#2563eb",
    background_color: "#fffaf2",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
