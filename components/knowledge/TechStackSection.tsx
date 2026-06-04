"use client";

import type { TechItem } from "@/types";
import { starRatingToPercent } from "@/lib/knowledge-utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface TechStackSectionProps {
  items: TechItem[];
}

export function TechStackSection({ items }: TechStackSectionProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        🛠 技术栈
      </h2>
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
      >
        {items.map((item, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {item.name}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {"⭐".repeat(item.stars)}
              </span>
            </div>
            <ProgressBar value={starRatingToPercent(item.stars)} height={6} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default TechStackSection;
