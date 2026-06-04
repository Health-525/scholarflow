import type { TechItem, GapItem } from "@/types";

/**
 * 将星级（1~5）转换为百分比（20~100）
 */
export function starRatingToPercent(stars: number): number {
  return stars * 20;
}

/**
 * 解析知识画像 Markdown 文件
 * 解析 ⭐ 符号数量（技术栈评分）和 ✅/❌ 标记（优势/薄弱）
 */
export function parseKnowledgePortrait(markdown: string): {
  techItems: TechItem[];
  gapItems: GapItem[];
  strengthItems: GapItem[];
} {
  const techItems: TechItem[] = [];
  const gapItems: GapItem[] = [];
  const strengthItems: GapItem[] = [];

  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Count stars in line
    const starCount = (trimmed.match(/⭐/g) || []).length;

    // Detect ✅ strength items
    if (trimmed.startsWith("✅") || trimmed.includes("✅")) {
      const name = trimmed
        .replace(/^[-*+]\s*/, "")
        .replace(/✅/g, "")
        .replace(/⭐+/g, "")
        .replace(/\|.*$/, "")
        .trim();
      if (name) {
        strengthItems.push({ name, description: undefined });
      }
      continue;
    }

    // Detect ❌ gap items
    if (trimmed.startsWith("❌") || trimmed.includes("❌")) {
      const name = trimmed
        .replace(/^[-*+]\s*/, "")
        .replace(/❌/g, "")
        .replace(/⭐+/g, "")
        .replace(/\|.*$/, "")
        .trim();
      if (name) {
        gapItems.push({ name, description: undefined });
      }
      continue;
    }

    // Detect tech stack items (lines with stars)
    if (starCount > 0) {
      // Parse: "- 技术名称 ⭐⭐⭐" or "| 技术名称 | ⭐⭐⭐ |"
      let name = trimmed
        .replace(/^[-*+]\s*/, "")
        .replace(/⭐+/g, "")
        .replace(/\|.*$/, "")
        .trim();

      // Table row parsing
      if (trimmed.startsWith("|")) {
        const cols = trimmed
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        if (cols.length >= 1) {
          name = cols[0].replace(/⭐+/g, "").trim();
        }
      }

      if (name && starCount > 0) {
        techItems.push({
          name,
          stars: Math.min(5, Math.max(1, starCount)),
          category: undefined,
        });
      }
    }
  }

  return { techItems, gapItems, strengthItems };
}
