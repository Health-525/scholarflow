"use client";

import type { GapItem } from "@/types";

interface KnowledgeGapSectionProps {
  gapItems: GapItem[];
  strengthItems: GapItem[];
}

export function KnowledgeGapSection({ gapItems, strengthItems }: KnowledgeGapSectionProps) {
  if (gapItems.length === 0 && strengthItems.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        📊 知识地图
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Strengths */}
        {strengthItems.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(52,199,89,0.06)",
              border: "1px solid rgba(52,199,89,0.2)",
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--status-success)" }}>
              ✅ 优势领域
            </h3>
            <ul className="space-y-1.5">
              {strengthItems.map((item, idx) => (
                <li key={idx} className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.name}
                  {item.description && (
                    <span className="text-xs block" style={{ color: "var(--text-tertiary)" }}>
                      {item.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {gapItems.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(255,59,48,0.06)",
              border: "1px solid rgba(255,59,48,0.2)",
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--status-error)" }}>
              ❌ 待提升
            </h3>
            <ul className="space-y-1.5">
              {gapItems.map((item, idx) => (
                <li key={idx} className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.name}
                  {item.description && (
                    <span className="text-xs block" style={{ color: "var(--text-tertiary)" }}>
                      {item.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default KnowledgeGapSection;
