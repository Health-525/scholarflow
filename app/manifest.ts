import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScholarFlow — 统一学习管理中枢",
    short_name: "ScholarFlow",
    description: "面向大学生的智能学习管理平台 — 课表、作业、跑步、日报、AI助手",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#2a4494",
    background_color: "#faf7f2",
    categories: ["education", "productivity"],
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
