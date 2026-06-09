"use client";

import { useParams, useRouter } from "next/navigation";
import { useReportContent } from "@/hooks/useReports";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export default function DailyReportPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;
  const { content, isLoading, error } = useReportContent("daily", date);

  let dateLabel = date;
  try {
    dateLabel = new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } catch {
    // keep raw
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm mb-4 text-muted-foreground"
        aria-label="返回日报列表"
      >
        ← 返回
      </button>

      <h1 className="text-xl font-bold mb-4 text-foreground">
        {dateLabel}
      </h1>

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载日报..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback
          message={error.type === "not_found" ? "该日报不存在" : error.message}
        />
      )}

      {content && !isLoading && !error && (
        <MarkdownRenderer content={content} />
      )}
    </div>
  );
}
