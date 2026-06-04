"use client";

import { useState, useEffect } from "react";
import { useGitHubClient } from "@/hooks/useGitHubClient";
import { parseKnowledgePortrait } from "@/lib/knowledge-utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { TechStackSection } from "@/components/knowledge/TechStackSection";
import { KnowledgeGapSection } from "@/components/knowledge/KnowledgeGapSection";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { GitHubError } from "@/lib/github/errors";

export default function KnowledgePage() {
  const client = useGitHubClient();
  const [rawContent, setRawContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GitHubError | null>(null);

  function load() {
    if (!client) return;
    setIsLoading(true);
    setError(null);
    client
      .getFile("content", "_meta/知识画像.md")
      .then((file) => {
        setRawContent(file.content);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err as GitHubError);
        setIsLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  const portrait = rawContent ? parseKnowledgePortrait(rawContent) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        知识画像
      </h1>

      {isLoading && (
        <div className="py-12">
          <LoadingSpinner label="加载知识画像..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorFallback message={error.message} onRetry={load} />
      )}

      {portrait && !isLoading && !error && (
        <div className="space-y-6">
          <TechStackSection items={portrait.techItems} />
          <KnowledgeGapSection
            gapItems={portrait.gapItems}
            strengthItems={portrait.strengthItems}
          />
          {/* Full rendered markdown */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              📝 完整画像
            </h2>
            <MarkdownRenderer content={rawContent} />
          </section>
        </div>
      )}
    </div>
  );
}
