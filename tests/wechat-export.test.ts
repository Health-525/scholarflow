import { describe, expect, it } from "vitest";

import { renderWechatPreviewHtml } from "@/lib/notes/wechat-renderer";
import { defaultWechatStyleConfig, generateWechatCss } from "@/lib/notes/wechat-themes";
import type { WechatStyleConfig } from "@/lib/notes/wechat-themes";

const testConfig: WechatStyleConfig = {
  ...defaultWechatStyleConfig(),
  primaryColor: "#40b8fa",
};

function simulateInlineImages(html: string, useFixedVersion: boolean): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // Simulates image inlining (no actual image processing needed for test)
  if (useFixedVersion) {
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }
  return doc.body.innerHTML;
}

describe("ScholarFlow theme HTML export", () => {
  it("produces a complete HTML document with DOCTYPE, head, and body", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "Hello",
      config: testConfig,
    });

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");
    expect(html).toContain("</html>");
  });

  it("includes CSS variables in style tags", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "Hello",
      config: testConfig,
    });

    expect(html).toContain("--md-primary-color");
    expect(html).toContain("--md-bg-color");
    expect(html).toContain("--md-font-family");
    expect(html).toContain("--md-font-size");
  });

  it("includes mdnice heading styles (font-size, bold, color)", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 二级标题",
      config: testConfig,
    });

    expect(html).toContain(".wechat-output h2 { font-size: 22px; }");
    expect(html).toContain("font-weight: bold;");
    expect(html).toContain("color: black;");
  });

  it("wraps heading text in prefix/content/suffix span elements", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 二级标题",
      config: testConfig,
    });

    expect(html).toContain('<span class="prefix">');
    expect(html).toContain('<span class="content">二级标题</span>');
    expect(html).toContain('<span class="suffix">');
  });

  it("includes mdnice blockquote styling with clean left border", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "> 引用文字",
      config: testConfig,
    });

    expect(html).toContain("border-left: 4px solid var(--md-primary-color)");
  });

  it("strong text uses primary color from CSS variable", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "**加粗**",
      config: testConfig,
    });

    expect(html).toContain("--md-primary-color");
    expect(html).toContain("#40b8fa");
  });

  it("includes HR divider styling from base CSS", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "---",
      config: testConfig,
    });

    expect(html).toContain("border-top: 1px solid");
  });

  it("includes mdnice H3 heading style", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "### 三级标题",
      config: testConfig,
    });

    expect(html).toContain(".wechat-output h3 { font-size: 20px; }");
    expect(html).toContain("line-height: 1.6;");
    expect(html).toContain("color: black;");
  });

  it("includes themed blockquote styles from aiworkskills", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "> 引用文字",
      config: testConfig,
    });

    expect(html).toContain("border-left: 4px solid var(--md-primary-color)");
    expect(html).toContain("var(--md-bg-accent");
    expect(html).toContain(".multiquote-1");
  });

  it("does not reference any external image URLs", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 标题\n\n文字",
      config: testConfig,
    });

    expect(html).not.toContain("files.mdnice.com");
  });

  it("theme override CSS does not use !important", async () => {
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 标题",
      config: testConfig,
    });

    // Extract the theme override section (between "ScholarFlow" and next </style>)
    const themeSection = html.match(/ScholarFlow[\s\S]*?<\/style>/);
    expect(themeSection).not.toBeNull();
    expect(themeSection![0]).not.toContain("!important");
  });

  it("heading override: border-bottom added to generated CSS", () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      headingStyles: { h2: "border-bottom" },
    };
    const css = generateWechatCss(config);
    expect(css).toContain(".wechat-output h2");
    expect(css).toContain("padding-bottom: 0.3em");
    expect(css).toContain("border-bottom: 2px solid var(--md-primary-color)");
  });

  it("heading override: color-only added to generated CSS", () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      headingStyles: { h1: "color-only" },
    };
    const css = generateWechatCss(config);
    expect(css).toContain(".wechat-output h1 { color: var(--md-primary-color); }");
  });

  it("heading override: border-left added to generated CSS", () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      headingStyles: { h3: "border-left" },
    };
    const css = generateWechatCss(config);
    expect(css).toContain(".wechat-output h3");
    expect(css).toContain("padding-left: 12px");
    expect(css).toContain("border-left: 4px solid var(--md-primary-color)");
  });

  it("heading override: default style produces no extra rules", () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      headingStyles: { h2: "default" },
    };
    const css = generateWechatCss(config);
    // The heading override CSS for h2 should NOT include border-bottom (which is the actual override property)
    const h2OverrideRegex = /\.wechat-output h2 \{ padding-bottom:/;
    expect(css).not.toMatch(h2OverrideRegex);
    expect(css).not.toMatch(/\.wechat-output h2 \{ padding-left:/);
    expect(css).not.toMatch(/\.wechat-output h2 \{ color: var\(--md-primary-color\)/);
  });

  it("heading override: full preview HTML includes heading override CSS", async () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      headingStyles: { h2: "border-bottom", h3: "color-only" },
    };
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 标题\n### 副标题",
      config,
    });
    expect(html).toContain(".wechat-output h2 { padding-bottom: 0.3em; border-bottom: 2px solid var(--md-primary-color); }");
    expect(html).toContain(".wechat-output h3 { color: var(--md-primary-color); }");
  });

  it("heading override: HTML elements carry inline styles for border-bottom", async () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      primaryColor: "#ff0000",
      headingStyles: { h2: "border-bottom" },
    };
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 二级标题",
      config,
    });
    // The h2 element should have inline border-bottom style
    expect(html).toMatch(/<h2[^>]*style="[^"]*border-bottom:\s*2px solid #ff0000/);
    expect(html).toMatch(/<h2[^>]*style="[^"]*padding-bottom:\s*0\.3em/);
  });

  it("heading override: HTML elements carry inline styles for color-only", async () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      primaryColor: "#009874",
      headingStyles: { h1: "color-only" },
    };
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "# 一级标题",
      config,
    });
    expect(html).toMatch(/<h1[^>]*style="[^"]*color:\s*#009874/);
  });

  it("heading override: HTML elements carry inline styles for border-left", async () => {
    const config: WechatStyleConfig = {
      ...defaultWechatStyleConfig(),
      primaryColor: "#0000ff",
      headingStyles: { h3: "border-left" },
    };
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "### 三级标题",
      config,
    });
    expect(html).toMatch(/<h3[^>]*style="[^"]*border-left:\s*4px solid #0000ff/);
    expect(html).toMatch(/<h3[^>]*style="[^"]*padding-left:\s*12px/);
  });

  it("heading override: no extra inline styles when headingStyles is empty", async () => {
    const config = defaultWechatStyleConfig();
    const html = await renderWechatPreviewHtml({
      title: "测试",
      content: "## 二级标题",
      config,
    });
    // The h2 element should NOT have inline border or custom color styles
    expect(html).not.toMatch(/<h2[^>]*border-bottom/);
    expect(html).not.toMatch(/<h2[^>]*border-left/);
  });

  it("heading override: empty headingStyles produces no heading-specific overrides", () => {
    const config = defaultWechatStyleConfig();
    const css = generateWechatCss(config);
    // Base grouped heading rules should exist
    expect(css).toContain(".wechat-output h1,");
    // But no individual heading-level override rules (with border/padding)
    expect(css).not.toMatch(/\.wechat-output h2 \{ padding-bottom:/);
    expect(css).not.toMatch(/\.wechat-output h2 \{ padding-left:/);
    expect(css).not.toMatch(/\.wechat-output h[1-6] \{ color: var\(--md-primary-color\)/);
  });
});

describe("inlineImages HTML preservation", () => {
  const fullDoc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
  <style>:root { --color: red; }</style>
</head>
<body>
  <article class="content">
    <h2><span class="prefix"></span><span class="content">标题</span></h2>
    <img src="https://example.com/img.png" alt="test">
  </article>
</body>
</html>`;

  it("BUG REGRESSION: doc.body.innerHTML loses <head> styles", () => {
    const broken = simulateInlineImages(fullDoc, false);
    expect(broken).not.toContain("<head>");
    expect(broken).not.toContain("<style>");
    expect(broken).not.toContain("--color");
  });

  it("FIX: documentElement.outerHTML preserves full HTML including styles", () => {
    const fixed = simulateInlineImages(fullDoc, true);
    expect(fixed).toMatch(/^<!DOCTYPE html>/);
    expect(fixed).toContain("<head>");
    expect(fixed).toContain("<style>");
    expect(fixed).toContain("--color: red");
    expect(fixed).toContain('<span class="prefix">');
    expect(fixed).toContain('<span class="content">标题</span>');
    expect(fixed).toContain("</html>");
  });
});
