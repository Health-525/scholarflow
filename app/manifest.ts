import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScholarFlow - 本地优先的校园学习工作台",
    short_name: "ScholarFlow",
    description:
      "整合教务数据、图书馆流程、作业、笔记与学习报告的本地优先校园学习工作台。",
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
