import type { Root, Blockquote, Paragraph, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const CALLOUT_ICONS: Record<string, string> = {
  info: "ℹ️",
  tip: "💡",
  warning: "⚠️",
  danger: "🔴",
  note: "📝",
  summary: "📋",
  abstract: "📖",
};

const KNOWN_TYPES = new Set(Object.keys(CALLOUT_ICONS));

/**
 * remark 插件：识别 > [!TYPE] 标题 语法，转换为 callout div
 */
const calloutPlugin: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote, index, parent) => {
      if (!parent || index === undefined) return;

      // Check if first child is a paragraph starting with [!TYPE]
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== "paragraph") return;

      const firstParagraph = firstChild as Paragraph;
      const firstTextNode = firstParagraph.children[0];
      if (!firstTextNode || firstTextNode.type !== "text") return;

      const firstText = (firstTextNode as Text).value;
      const match = firstText.match(/^\[!([A-Za-z]+)\](?:\s+(.*))?/);
      if (!match) return;

      const rawType = match[1].toLowerCase();
      const calloutType = KNOWN_TYPES.has(rawType) ? rawType : "info";
      const icon = CALLOUT_ICONS[calloutType] ?? CALLOUT_ICONS.info;
      const titleText = match[2] || rawType.charAt(0).toUpperCase() + rawType.slice(1);

      // Build the replacement node as hast-compatible structure via mdast
      // We'll use html nodes to produce the desired output
      const remainingChildren = node.children.slice(1);

      // Build content HTML from remaining children by marking node type
      (node as unknown as { type: string; data: unknown }).type = "calloutBlock";
      (node as unknown as { data: unknown }).data = {
        hName: "div",
        hProperties: {
          className: [`callout`, `callout-${calloutType}`],
          "data-callout-type": calloutType,
        },
      };

      // Replace blockquote children with callout structure
      node.children = [
        {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { className: ["callout-title"] },
          },
          children: [
            {
              type: "text",
              data: {
                hName: "span",
                hProperties: { className: ["callout-icon"], "aria-hidden": "true" },
              },
              value: icon,
            } as unknown as Text,
            {
              type: "text",
              data: {
                hName: "span",
              },
              value: titleText,
            } as unknown as Text,
          ],
        } as Paragraph,
        {
          type: "blockquote",
          data: {
            hName: "div",
            hProperties: { className: ["callout-body"] },
          },
          children: remainingChildren.length > 0 ? remainingChildren : [
            { type: "paragraph", children: [{ type: "text", value: "" } as Text] } as Paragraph,
          ],
        },
      ];
    });
  };
};

export default calloutPlugin;
