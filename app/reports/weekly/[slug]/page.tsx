"use client";

import { useParams, useRouter } from "next/navigation";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useReportContent } from "@/hooks/useReports";

export default function WeeklyReportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { content, isLoading, error } = useReportContent("weekly", slug);

  let weekLabel = slug;
  try {
    const parts = slug.split("_");
    if (parts.length >= 2) {
      const start = new Date(parts[0]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      const end = new Date(parts[1]).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
      weekLabel = `${start} — ${end}`;
    }
  } catch {
    // keep raw
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm mb-4 text-muted-foreground"
        aria-label="返回周报列表"
      >
        ← 返回
      </button>

      <h1 className="text-xl font-bold mb-4 text-foreground">
        {weekLabel}
      </h1>

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载周报..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback
          message={error.message || "该周报不存在"}
        />
      )}

      {content && !isLoading && !error && (
        <MarkdownRenderer content={content} />
      )}
    </div>
  );
}
