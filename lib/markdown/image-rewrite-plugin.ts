import type { Element, Root } from "hast";

/**
 * Remark 插件：将 Obsidian 本地图片引用重写为 GitHub raw URL
 *
 * 处理 `![[file-xxx.png]]` 和 `![alt](file-xxx.png)` 两种格式
 *
 * 图片映射规则：
 *   file-xxx.png → https://raw.githubusercontent.com/Health-525/jiangshu-study/main/{noteDir}/assets/{noteName}/file-xxx.png
 *
 * 由于我们需要知道当前笔记的路径，这个插件接受一个 basePath 参数
 */

export interface ImageRewriteOptions {
  /** 当前笔记在 jiangshu-study 中的目录路径，如 "01-大数据技术基础/笔记" */
  noteDir: string;
  /** 笔记名称（不含扩展名），如 "大数据技术基础期末复习" */
  noteName: string;
}

export function imageRewritePlugin(options: ImageRewriteOptions) {
  const { noteDir, noteName } = options;
  const baseUrl = `https://raw.githubusercontent.com/Health-525/jiangshu-study/main/${noteDir}/assets/${noteName}`;

  return function transform(tree: Root) {
    visitImages(tree, (node) => {
      const src = String(node.properties?.src || "");

      // 匹配 file-xxx.png 格式
      const match = src.match(/^file-(\d+)\.(png|jpg|jpeg|gif|webp|svg)$/i);
      if (match) {
        node.properties = {
          ...node.properties,
          src: `${baseUrl}/${match[0]}`,
          class: "markdown-image",
          loading: "lazy",
        };
      }
    });
  };
}

function visitImages(tree: Root, fn: (node: Element) => void) {
  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      const n = node as { type?: string; tagName?: string; children?: unknown[] };
      if (n.type === "element" && n.tagName === "img") {
        fn(node as Element);
      }
      if (n.children) {
        walk(n.children);
      }
    }
  }
  walk((tree as { children?: unknown[] }).children || []);
}
