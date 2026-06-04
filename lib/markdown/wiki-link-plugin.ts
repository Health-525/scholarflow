import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, PhrasingContent, Parent } from "mdast";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * remark 插件：识别 [[文件名]] 和 [[文件名|显示文本]] 语法
 * 日报格式（YYYY-MM-DD）→ 链接到 /reports/daily/YYYY-MM-DD
 * 其他 → .wiki-link-unresolved span
 */
const wikiLinkPlugin: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const text = node.value;
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

      // Check if there are any wiki links
      if (!wikiLinkRegex.test(text)) return;

      // Reset regex
      wikiLinkRegex.lastIndex = 0;

      const newNodes: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = wikiLinkRegex.exec(text)) !== null) {
        const [fullMatch, inner] = match;
        const matchStart = match.index;

        // Add text before this match
        if (matchStart > lastIndex) {
          newNodes.push({ type: "text", value: text.slice(lastIndex, matchStart) });
        }

        // Parse [[filename|display]] or [[filename]]
        const pipeIndex = inner.indexOf("|");
        const fileName = pipeIndex >= 0 ? inner.slice(0, pipeIndex).trim() : inner.trim();
        const displayText = pipeIndex >= 0 ? inner.slice(pipeIndex + 1).trim() : fileName;

        if (DATE_REGEX.test(fileName)) {
          // Date-based link → /reports/daily/YYYY-MM-DD
          newNodes.push({
            type: "link",
            url: `/reports/daily/${fileName}`,
            title: null,
            children: [{ type: "text", value: displayText }],
          } as unknown as PhrasingContent);
        } else {
          // Unresolved wiki link → span with class
          newNodes.push({
            type: "html",
            value: `<span class="wiki-link-unresolved">${displayText}</span>`,
          } as unknown as PhrasingContent);
        }

        lastIndex = matchStart + fullMatch.length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({ type: "text", value: text.slice(lastIndex) });
      }

      if (newNodes.length > 0) {
        // Replace current node with new nodes
        (parent as Parent).children.splice(index, 1, ...newNodes);
        // Return the index to not skip newly inserted nodes
        return index + newNodes.length;
      }
    });
  };
};

export default wikiLinkPlugin;
