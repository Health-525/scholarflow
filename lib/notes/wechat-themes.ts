export type WechatThemeId = "default";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingStyleType = "default" | "color-only" | "border-bottom" | "border-left";

export interface WechatTheme {
  id: WechatThemeId;
  name: string;
  description?: string;
  defaultPrimaryColor?: string;
}

export interface WechatStyleConfig {
  theme: WechatThemeId;
  fontFamily: string;
  fontSize: string;
  primaryColor: string;
  headingStyles: Partial<Record<HeadingLevel, HeadingStyleType>>;
  codeBlockTheme: string;
  previewWidth: "desktop" | "mobile";
  macCodeBlock: boolean;
  showLineNumber: boolean;
  useIndent: boolean;
  useJustify: boolean;
}

export const WECHAT_THEMES: WechatTheme[] = [
  { id: "default", name: "默认", description: "mdnice 经典排版", defaultPrimaryColor: "#1e6bb8" },
];

export const FONT_FAMILY_OPTIONS = [
  {
    label: "无衬线",
    value:
      '-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
  },
  {
    label: "衬线",
    value:
      'Optima-Regular, Optima, "PingFang SC", Cambria, Cochin, Georgia, Times, "Times New Roman", serif',
  },
  { label: "等宽", value: 'Menlo, Monaco, "Courier New", monospace' },
];

export const FONT_SIZE_OPTIONS = [
  { label: "14px", value: "14px", desc: "更小" },
  { label: "15px", value: "15px", desc: "稍小" },
  { label: "16px", value: "16px", desc: "推荐" },
  { label: "17px", value: "17px", desc: "稍大" },
  { label: "18px", value: "18px", desc: "更大" },
];

export const COLOR_OPTIONS = [
  { label: "mdnice 蓝", value: "#1e6bb8", desc: "经典链接蓝" },
  { label: "翡翠绿", value: "#009874", desc: "自然平衡" },
  { label: "墨滴蓝", value: "#40b8fa", desc: "清新明快" },
  { label: "活力橘", value: "#FA5151", desc: "热情活力" },
  { label: "深湖蓝", value: "#3594f7", desc: "专注强调" },
  { label: "经典蓝", value: "#0F4C81", desc: "稳重冷静" },
  { label: "薰衣紫", value: "#92617E", desc: "优雅神秘" },
  { label: "天空蓝", value: "#55C9EA", desc: "清爽自由" },
  { label: "玫瑰金", value: "#B76E79", desc: "奢华现代" },
  { label: "橄榄绿", value: "#556B2F", desc: "沉稳自然" },
  { label: "石墨黑", value: "#333333", desc: "内敛极简" },
  { label: "樱花粉", value: "#FFB7C5", desc: "浪漫甜美" },
];

export const HEADING_LEVEL_OPTIONS = [
  { label: "一级标题", value: "h1" },
  { label: "二级标题", value: "h2" },
  { label: "三级标题", value: "h3" },
  { label: "四级标题", value: "h4" },
  { label: "五级标题", value: "h5" },
  { label: "六级标题", value: "h6" },
];

export const HEADING_STYLE_OPTIONS = [
  { label: "默认", value: "default" },
  { label: "主题色文字", value: "color-only" },
  { label: "下边框", value: "border-bottom" },
  { label: "左边框", value: "border-left" },
] as const;

export const PREVIEW_WIDTH_OPTIONS = [
  { label: "电脑端", value: "desktop" },
  { label: "移动端", value: "mobile" },
] as const;

export const CODE_BLOCK_THEMES = [
  { label: "1c-light", value: "1c-light" },
  { label: "a11y-dark", value: "a11y-dark" },
  { label: "a11y-light", value: "a11y-light" },
  { label: "agate", value: "agate" },
  { label: "an-old-hope", value: "an-old-hope" },
  { label: "androidstudio", value: "androidstudio" },
  { label: "arduino-light", value: "arduino-light" },
  { label: "arta", value: "arta" },
  { label: "ascetic", value: "ascetic" },
  { label: "atom-one-dark-reasonable", value: "atom-one-dark-reasonable" },
  { label: "atom-one-dark", value: "atom-one-dark" },
  { label: "atom-one-light", value: "atom-one-light" },
  { label: "brown-paper", value: "brown-paper" },
  { label: "codepen-embed", value: "codepen-embed" },
  { label: "color-brewer", value: "color-brewer" },
  { label: "dark", value: "dark" },
  { label: "default", value: "default" },
  { label: "devibeans", value: "devibeans" },
  { label: "docco", value: "docco" },
  { label: "far", value: "far" },
  { label: "felipec", value: "felipec" },
  { label: "foundation", value: "foundation" },
  { label: "github-dark-dimmed", value: "github-dark-dimmed" },
  { label: "github-dark", value: "github-dark" },
  { label: "github", value: "github" },
  { label: "gml", value: "gml" },
  { label: "googlecode", value: "googlecode" },
  { label: "gradient-dark", value: "gradient-dark" },
  { label: "gradient-light", value: "gradient-light" },
  { label: "grayscale", value: "grayscale" },
  { label: "hybrid", value: "hybrid" },
  { label: "idea", value: "idea" },
  { label: "intellij-light", value: "intellij-light" },
  { label: "ir-black", value: "ir-black" },
  { label: "isbl-editor-dark", value: "isbl-editor-dark" },
  { label: "isbl-editor-light", value: "isbl-editor-light" },
  { label: "kimbie-dark", value: "kimbie-dark" },
  { label: "kimbie-light", value: "kimbie-light" },
  { label: "lightfair", value: "lightfair" },
  { label: "lioshi", value: "lioshi" },
  { label: "magula", value: "magula" },
  { label: "mono-blue", value: "mono-blue" },
  { label: "monokai-sublime", value: "monokai-sublime" },
  { label: "monokai", value: "monokai" },
  { label: "night-owl", value: "night-owl" },
  { label: "nnfx-dark", value: "nnfx-dark" },
  { label: "nnfx-light", value: "nnfx-light" },
  { label: "nord", value: "nord" },
  { label: "obsidian", value: "obsidian" },
  { label: "panda-syntax-dark", value: "panda-syntax-dark" },
  { label: "panda-syntax-light", value: "panda-syntax-light" },
  { label: "paraiso-dark", value: "paraiso-dark" },
  { label: "paraiso-light", value: "paraiso-light" },
  { label: "pojoaque", value: "pojoaque" },
  { label: "purebasic", value: "purebasic" },
  { label: "qtcreator-dark", value: "qtcreator-dark" },
  { label: "qtcreator-light", value: "qtcreator-light" },
  { label: "rainbow", value: "rainbow" },
  { label: "routeros", value: "routeros" },
  { label: "school-book", value: "school-book" },
  { label: "shades-of-purple", value: "shades-of-purple" },
  { label: "srcery", value: "srcery" },
  { label: "stackoverflow-dark", value: "stackoverflow-dark" },
  { label: "stackoverflow-light", value: "stackoverflow-light" },
  { label: "sunburst", value: "sunburst" },
  { label: "tokyo-night-dark", value: "tokyo-night-dark" },
  { label: "tokyo-night-light", value: "tokyo-night-light" },
  { label: "tomorrow-night-blue", value: "tomorrow-night-blue" },
  { label: "tomorrow-night-bright", value: "tomorrow-night-bright" },
  { label: "vs", value: "vs" },
  { label: "vs2015", value: "vs2015" },
  { label: "xcode", value: "xcode" },
  { label: "xt256", value: "xt256" },
];

export const CODE_BLOCK_CDN_BASE =
  "https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles";

export function codeBlockThemeUrl(theme: string): string {
  return `${CODE_BLOCK_CDN_BASE}/${theme}.min.css`;
}

// ─── 以下 CSS 直接复制自 mdnice/markdown-nice (4K+ stars)
//      src/template/basic.js
//      仅做了 3 处变量替换：
//        #nice → .wechat-output
//        颜色 #1e6bb8 → var(--md-primary-color)
//        font-family/font-size 顶部追加 var() 覆盖
// ───

const BASE_CSS = `
/*默认样式，最佳实践*/

/*全局属性*/
.wechat-output {
  font-size: var(--md-font-size);
  color: black;
  padding: 0 10px;
  line-height: 1.6;
  word-spacing: 0px;
  letter-spacing: 0px;
  word-break: break-word;
  word-wrap: break-word;
  text-align: left;
  font-family: var(--md-font-family);
}

/*段落*/
.wechat-output p {
  font-size: 16px;
  padding-top: 8px;
  padding-bottom: 8px;
  margin: 0;
  line-height: 1.8;
  color: #3a3a3a;
  letter-spacing: 0.5px;
}

/*标题*/
.wechat-output h1,
.wechat-output h2,
.wechat-output h3,
.wechat-output h4,
.wechat-output h5,
.wechat-output h6 {
  margin-top: 30px;
  margin-bottom: 15px;
  padding: 0px;
  font-weight: bold;
  color: black;
}
.wechat-output h1 { font-size: 24px; }
.wechat-output h2 { font-size: 22px; }
.wechat-output h3 { font-size: 20px; }
.wechat-output h4 { font-size: 18px; }
.wechat-output h5 { font-size: 16px; }
.wechat-output h6 { font-size: 16px; }

.wechat-output h1 .prefix,
.wechat-output h2 .prefix,
.wechat-output h3 .prefix,
.wechat-output h4 .prefix,
.wechat-output h5 .prefix,
.wechat-output h6 .prefix {
  display: none;
}

.wechat-output h1 .suffix,
.wechat-output h2 .suffix,
.wechat-output h3 .suffix,
.wechat-output h4 .suffix,
.wechat-output h5 .suffix,
.wechat-output h6 .suffix {
  display: none;
}

/*列表*/
.wechat-output ul,
.wechat-output ol {
  margin-top: 8px;
  margin-bottom: 8px;
  padding-left: 25px;
  color: black;
}
.wechat-output ul { list-style-type: disc; }
.wechat-output ul ul { list-style-type: square; }
.wechat-output ol { list-style-type: decimal; }

.wechat-output li section,
.wechat-output li {
  margin-top: 5px;
  margin-bottom: 5px;
  line-height: 26px;
  text-align: left;
  color: rgb(1,1,1);
  font-weight: 500;
}

/*引用*/
.wechat-output blockquote { border: none; }

.wechat-output .multiquote-1,
.wechat-output blockquote {
  display: block;
  font-size: 0.9em;
  overflow: auto;
  overflow-scrolling: touch;
  border-left: 4px solid var(--md-primary-color);
  background: var(--md-bg-accent, #f7fbff);
  color: #555;
  padding-top: 14px;
  padding-bottom: 14px;
  padding-left: 16px;
  padding-right: 16px;
  margin-bottom: 20px;
  margin-top: 20px;
}

.wechat-output .multiquote-1 p {
  margin: 0px;
  color: #555;
  line-height: 1.8;
}

.wechat-output .multiquote-2 {
  box-shadow: 1px 1px 10px rgba(0,0,0,0.2);
  padding: 20px;
  margin-bottom: 20px;
  margin-top: 20px;
}

.wechat-output .multiquote-3 {
  box-shadow: 1px 1px 10px rgba(0,0,0,0.2);
  padding: 20px;
  margin-bottom: 20px;
  margin-top: 20px;
}

.wechat-output .multiquote-3 p { text-align: center; }
.wechat-output .multiquote-3 h3 { text-align: center; }

.wechat-output .table-of-contents a {
  border: none;
  color: black;
  font-weight: normal;
}

/*链接*/
.wechat-output a {
  text-decoration: none;
  color: var(--md-primary-color);
  word-wrap: break-word;
  font-weight: bold;
  border-bottom: 1px solid var(--md-primary-color);
}

/*加粗*/
.wechat-output strong { font-weight: bold; color: var(--md-primary-color); }

/*斜体*/
.wechat-output em { font-style: italic; color: black; }

/*加粗斜体*/
.wechat-output em strong { font-weight: bold; color: var(--md-primary-color); }

/*删除线*/
.wechat-output del { font-style: italic; color: black; }

/*分隔线*/
.wechat-output hr {
  height: 1px;
  margin: 2em 0;
  border: none;
  background: linear-gradient(to right, transparent, var(--md-primary-color), transparent);
}

/*代码块*/
.wechat-output pre {
  margin-top: 10px;
  margin-bottom: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 8px;
  background: #f6f8fa;
  color: #24292f;
}
.wechat-output pre code {
  display: -webkit-box;
  font-family: Operator Mono, Consolas, Monaco, Menlo, monospace;
  border-radius: 0px;
  font-size: 12px;
  -webkit-overflow-scrolling: touch;
  padding: 16px 18px;
  background: transparent;
}
.wechat-output pre code span { line-height: 26px; }

/*行内代码*/
.wechat-output p code,
.wechat-output li code {
  font-size: 14px;
  word-wrap: break-word;
  padding: 2px 4px;
  border-radius: 4px;
  margin: 0 2px;
  color: var(--md-primary-color);
  background-color: rgba(27,31,35,.05);
  font-family: Operator Mono, Consolas, Monaco, Menlo, monospace;
  word-break: break-all;
}

/*图片*/
.wechat-output img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
}

.wechat-output figure {
  margin: 0;
  margin-top: 10px;
  margin-bottom: 10px;
}

/*图片描述文字*/
.wechat-output figcaption {
  margin-top: 5px;
  text-align: center;
  color: #888;
  font-size: 14px;
}

/*表格容器 */
.wechat-output .table-container { overflow-x: auto; }

/*表格*/
.wechat-output table { display: table; text-align: left; }
.wechat-output tbody { border: 0; }

.wechat-output table tr {
  border: 0;
  border-top: 1px solid #ccc;
  background-color: white;
}

.wechat-output table tr:nth-child(2n) { background-color: #F8F8F8; }

.wechat-output table tr th,
.wechat-output table tr td {
  font-size: 16px;
  border: 1px solid #ccc;
  padding: 5px 10px;
  text-align: left;
}

.wechat-output table tr th {
  font-weight: bold;
  background-color: #f0f0f0;
}

.wechat-output table tr th:nth-of-type(n),
.wechat-output table tr td:nth-of-type(n) {
  min-width: 85px;
}

/*脚注*/
.wechat-output .footnote-word { color: var(--md-primary-color); font-weight: bold; }
.wechat-output .footnote-ref { color: var(--md-primary-color); font-weight: bold; }
.wechat-output .footnote-item { display: flex; }

.wechat-output .footnote-num {
  display: inline;
  width: 10%;
  background: none;
  font-size: 80%;
  opacity: 0.6;
  line-height: 26px;
  font-family: Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;
}

.wechat-output .footnote-item p {
  display: inline;
  font-size: 14px;
  width: 90%;
  padding: 0px;
  margin: 0;
  line-height: 26px;
  color: black;
  word-break: break-all;
}

.wechat-output sub, sup { line-height: 0; }

.wechat-output .footnotes-sep:before {
  content: "参考资料";
  display: block;
}

/* 解决公式问题 */
.wechat-output .block-equation {
  display: block;
  text-align: center;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.wechat-output .block-equation svg {
  max-width: 300% !important;
  -webkit-overflow-scrolling: touch;
}

.wechat-output .inline-equation { }
.wechat-output .inline-equation svg { }

/*图片流*/
.wechat-output .imageflow-layer1 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  white-space: normal;
  border: 0px none;
  padding: 0px;
  overflow: hidden;
}

.wechat-output .imageflow-layer2 {
  white-space: nowrap;
  width: 100%;
  overflow-x: scroll;
}

.wechat-output .imageflow-layer3 {
  display: inline-block;
  word-wrap: break-word;
  white-space: normal;
  vertical-align: middle;
  width: 100%;
}

.wechat-output .imageflow-img { display: inline-block; }

.wechat-output .imageflow-caption {
  text-align: center;
  margin-top: 0px;
  padding-top: 0px;
  color: #888;
}

.wechat-output .nice-suffix-juejin-container { margin-top: 20px !important; }

.wechat-output figure a { border: none; }
.wechat-output figure a img { margin: 0px; }

.wechat-output figure {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 图片链接嵌套 */
.wechat-output figure a {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 图片链接嵌套，图片解释 */
.wechat-output figure a + figcaption {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: -35px;
  background: rgba(0,0,0,0.7);
  color: white;
  line-height: 35px;
  z-index: 20;
}

/* === Callouts (ScholarFlow 扩展) === */

.wechat-output .callout {
  margin: 1em 0;
  padding: 1em;
  border-radius: 6px;
  border-left: 4px solid var(--md-primary-color);
  background: rgba(0, 0, 0, 0.03);
  color: black;
}

.wechat-output .callout-title {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.wechat-output .callout-body > p:first-child { margin-top: 0; }
.wechat-output .callout-body > p:last-child { margin-bottom: 0; }

.wechat-output .callout-info { border-left-color: var(--md-primary-color); }
.wechat-output .callout-tip { border-left-color: #57ab5a; }
.wechat-output .callout-warning { border-left-color: #c69026; }
.wechat-output .callout-danger { border-left-color: #e5534b; }
.wechat-output .callout-note { border-left-color: var(--md-primary-color); }
.wechat-output .callout-summary { border-left-color: #00bfff; }
.wechat-output .callout-abstract { border-left-color: #00bfff; }

/* === Mac 代码块栏 (ScholarFlow 扩展) === */
.wechat-output pre .wechat-mac-bar {
  display: flex;
  align-items: center;
  padding: 10px 14px 0;
}

.wechat-output pre .wechat-mac-bar svg {
  width: 45px;
  height: 13px;
}

/* === 行号 (ScholarFlow 扩展) === */
.wechat-output pre .wechat-code-line {
  display: flex;
  gap: 0.75em;
}

.wechat-output pre .wechat-line-num {
  user-select: none;
  text-align: right;
  min-width: 1.5em;
  color: color-mix(in srgb, currentColor 40%, transparent);
}

.wechat-output pre .wechat-line-code {
  flex: 1;
  min-width: 0;
}
`;

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function generateVariablesCss(config: WechatStyleConfig): string {
  return `:root {
  --md-primary-color: ${config.primaryColor};
  --md-font-family: ${config.fontFamily};
  --md-font-size: ${config.fontSize};
  --md-bg-color: #ffffff;
  --md-bg-accent: ${hexToRgba(config.primaryColor, 0.08)};
}`;
}

function generateHeadingOverrideCss(config: WechatStyleConfig): string {
  const rules: string[] = [];
  const levels: HeadingLevel[] = ["h1", "h2", "h3", "h4", "h5", "h6"];
  for (const level of levels) {
    const style = config.headingStyles[level];
    if (!style || style === "default") continue;
    switch (style) {
      case "color-only":
        rules.push(`.wechat-output ${level} { color: var(--md-primary-color); }`);
        break;
      case "border-bottom":
        rules.push(`.wechat-output ${level} { padding-bottom: 0.3em; border-bottom: 2px solid var(--md-primary-color); }`);
        break;
      case "border-left":
        rules.push(`.wechat-output ${level} { padding-left: 12px; border-left: 4px solid var(--md-primary-color); }`);
        break;
    }
  }
  return rules.join("\n");
}

function generateParagraphCss(config: WechatStyleConfig): string {
  const parts: string[] = [];
  if (config.useIndent) parts.push("text-indent: 2em;");
  if (config.useJustify) parts.push("text-align: justify;");
  if (parts.length === 0) return "";
  return `.wechat-output p { ${parts.join(" ")} }`;
}

export function generateWechatCss(config: WechatStyleConfig): string {
  return [
    generateVariablesCss(config),
    BASE_CSS,
    generateHeadingOverrideCss(config),
    generateParagraphCss(config),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function defaultWechatStyleConfig(): WechatStyleConfig {
  return {
    theme: "default",
    fontFamily: FONT_FAMILY_OPTIONS[1].value,
    fontSize: FONT_SIZE_OPTIONS[2].value,
    primaryColor: "#1e6bb8",
    headingStyles: {},
    codeBlockTheme: CODE_BLOCK_THEMES.find((t) => t.value === "github")?.value ?? CODE_BLOCK_THEMES[0].value,
    previewWidth: "desktop",
    macCodeBlock: true,
    showLineNumber: false,
    useIndent: false,
    useJustify: false,
  };
}
