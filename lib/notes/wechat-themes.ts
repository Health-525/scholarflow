export type WechatThemeId = "default" | "grace" | "simple" | "light-blue" | "dark" | "warm";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingStyleType = "default" | "color-only" | "border-bottom" | "border-left";

export interface WechatTheme {
  id: WechatThemeId;
  name: string;
  description?: string;
}

export interface WechatStyleConfig {
  theme: WechatThemeId;
  fontFamily: string;
  fontSize: string;
  primaryColor: string;
  headingStyles: Partial<Record<HeadingLevel, HeadingStyleType>>;
  codeBlockTheme: string;
  previewWidth: "pc" | "mobile";
  macCodeBlock: boolean;
  showLineNumber: boolean;
  useIndent: boolean;
  useJustify: boolean;
}

export const WECHAT_THEMES: WechatTheme[] = [
  { id: "default", name: "经典", description: "白底黑字，通用简洁" },
  { id: "grace", name: "优雅", description: "柔和阴影与圆角" },
  { id: "simple", name: "简洁", description: "现代扁平风格" },
  { id: "light-blue", name: "浅蓝", description: "淡蓝背景，清新阅读" },
  { id: "dark", name: "暗夜", description: "深色背景，护眼沉浸" },
  { id: "warm", name: "暖橙", description: "暖黄便签，轻松亲切" },
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
  { label: "经典蓝", value: "#0F4C81", desc: "稳重冷静" },
  { label: "翡翠绿", value: "#009874", desc: "自然平衡" },
  { label: "活力橘", value: "#FA5151", desc: "热情活力" },
  { label: "柠檬黄", value: "#FECE00", desc: "明亮温暖" },
  { label: "薰衣紫", value: "#92617E", desc: "优雅神秘" },
  { label: "天空蓝", value: "#55C9EA", desc: "清爽自由" },
  { label: "玫瑰金", value: "#B76E79", desc: "奢华现代" },
  { label: "橄榄绿", value: "#556B2F", desc: "沉稳自然" },
  { label: "石墨黑", value: "#333333", desc: "内敛极简" },
  { label: "雾烟灰", value: "#A9A9A9", desc: "柔和低调" },
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
  { label: "电脑端", value: "pc" },
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

interface ThemeVariables {
  "--md-bg-color": string;
  "--md-text-color": string;
  "--md-blockquote-bg": string;
  "--md-blockquote-border": string;
  "--md-code-bg": string;
  "--md-code-text": string;
  "--md-pre-bg": string;
  "--md-link-color": string;
  "--md-hr-color": string;
  "--md-table-border": string;
  "--md-table-header-bg": string;
  "--md-table-header-text": string;
  "--md-callout-info": string;
  "--md-callout-tip": string;
  "--md-callout-warning": string;
  "--md-callout-danger": string;
  "--md-callout-note": string;
  "--md-callout-summary": string;
  "--md-callout-abstract": string;
}

const THEME_VARIABLES: Record<WechatThemeId, ThemeVariables> = {
  default: {
    "--md-bg-color": "#ffffff",
    "--md-text-color": "#2d2d2d",
    "--md-blockquote-bg": "#f8f9fa",
    "--md-blockquote-border": "#e0e0e0",
    "--md-code-bg": "#f2f2f2",
    "--md-code-text": "#333333",
    "--md-pre-bg": "#f7f7f7",
    "--md-link-color": "#576b95",
    "--md-hr-color": "#eeeeee",
    "--md-table-border": "#e0e0e0",
    "--md-table-header-bg": "#f7f7f7",
    "--md-table-header-text": "#2d2d2d",
    "--md-callout-info": "#478be6",
    "--md-callout-tip": "#57ab5a",
    "--md-callout-warning": "#c69026",
    "--md-callout-danger": "#e5534b",
    "--md-callout-note": "#478be6",
    "--md-callout-summary": "#00bfff",
    "--md-callout-abstract": "#00bfff",
  },
  grace: {
    "--md-bg-color": "#ffffff",
    "--md-text-color": "#2d2d2d",
    "--md-blockquote-bg": "#ffffff",
    "--md-blockquote-border": "#e0e0e0",
    "--md-code-bg": "#f5f5f5",
    "--md-code-text": "#333333",
    "--md-pre-bg": "#fafafa",
    "--md-link-color": "#576b95",
    "--md-hr-color": "#e5e5e5",
    "--md-table-border": "#e5e5e5",
    "--md-table-header-bg": "#f0f0f0",
    "--md-table-header-text": "#2d2d2d",
    "--md-callout-info": "#478be6",
    "--md-callout-tip": "#57ab5a",
    "--md-callout-warning": "#c69026",
    "--md-callout-danger": "#e5534b",
    "--md-callout-note": "#478be6",
    "--md-callout-summary": "#00bfff",
    "--md-callout-abstract": "#00bfff",
  },
  simple: {
    "--md-bg-color": "#ffffff",
    "--md-text-color": "#333333",
    "--md-blockquote-bg": "#fafafa",
    "--md-blockquote-border": "#eeeeee",
    "--md-code-bg": "#f5f5f5",
    "--md-code-text": "#333333",
    "--md-pre-bg": "#fafafa",
    "--md-link-color": "#576b95",
    "--md-hr-color": "#e0e0e0",
    "--md-table-border": "#eeeeee",
    "--md-table-header-bg": "#f5f5f5",
    "--md-table-header-text": "#333333",
    "--md-callout-info": "#478be6",
    "--md-callout-tip": "#57ab5a",
    "--md-callout-warning": "#c69026",
    "--md-callout-danger": "#e5534b",
    "--md-callout-note": "#478be6",
    "--md-callout-summary": "#00bfff",
    "--md-callout-abstract": "#00bfff",
  },
  "light-blue": {
    "--md-bg-color": "#ffffff",
    "--md-text-color": "#1a3a52",
    "--md-blockquote-bg": "#e3f2fd",
    "--md-blockquote-border": "#42a5f5",
    "--md-code-bg": "#e1f5fe",
    "--md-code-text": "#01579b",
    "--md-pre-bg": "#e1f5fe",
    "--md-link-color": "#0d47a1",
    "--md-hr-color": "#bbdefb",
    "--md-table-border": "#bbdefb",
    "--md-table-header-bg": "#e3f2fd",
    "--md-table-header-text": "#0d47a1",
    "--md-callout-info": "#1976d2",
    "--md-callout-tip": "#009874",
    "--md-callout-warning": "#f57c00",
    "--md-callout-danger": "#d32f2f",
    "--md-callout-note": "#1976d2",
    "--md-callout-summary": "#0288d1",
    "--md-callout-abstract": "#0288d1",
  },
  dark: {
    "--md-bg-color": "#1a1a1a",
    "--md-text-color": "#e0e0e0",
    "--md-blockquote-bg": "#2c2c2c",
    "--md-blockquote-border": "#42a5f5",
    "--md-code-bg": "#2c2c2c",
    "--md-code-text": "#80cbc4",
    "--md-pre-bg": "#2c2c2c",
    "--md-link-color": "#82b1ff",
    "--md-hr-color": "#424242",
    "--md-table-border": "#424242",
    "--md-table-header-bg": "#2c2c2c",
    "--md-table-header-text": "#90caf9",
    "--md-callout-info": "#64b5f6",
    "--md-callout-tip": "#81c784",
    "--md-callout-warning": "#ffb74d",
    "--md-callout-danger": "#e57373",
    "--md-callout-note": "#64b5f6",
    "--md-callout-summary": "#4fc3f7",
    "--md-callout-abstract": "#4fc3f7",
  },
  warm: {
    "--md-bg-color": "#ffffff",
    "--md-text-color": "#4e342e",
    "--md-blockquote-bg": "#fff3e0",
    "--md-blockquote-border": "#ff9800",
    "--md-code-bg": "#fff3e0",
    "--md-code-text": "#bf360c",
    "--md-pre-bg": "#fff3e0",
    "--md-link-color": "#bf360c",
    "--md-hr-color": "#ffe0b2",
    "--md-table-border": "#ffe0b2",
    "--md-table-header-bg": "#fff3e0",
    "--md-table-header-text": "#bf360c",
    "--md-callout-info": "#ef6c00",
    "--md-callout-tip": "#558b2f",
    "--md-callout-warning": "#f9a825",
    "--md-callout-danger": "#c62828",
    "--md-callout-note": "#ef6c00",
    "--md-callout-summary": "#f57c00",
    "--md-callout-abstract": "#f57c00",
  },
};

const BASE_CSS = `
.wechat-output {
  font-family: var(--md-font-family);
  font-size: var(--md-font-size);
  line-height: 1.75;
  text-align: left;
  color: var(--md-text-color);
  word-break: break-word;
}

.wechat-output > :first-child {
  margin-top: 0 !important;
}

.wechat-output h1,
.wechat-output h2,
.wechat-output h3,
.wechat-output h4,
.wechat-output h5,
.wechat-output h6 {
  line-height: 1.4;
  font-weight: bold;
  color: var(--md-text-color);
}

.wechat-output p {
  margin: 1.5em 8px;
  letter-spacing: 0.03em;
  color: var(--md-text-color);
}

.wechat-output a {
  color: var(--md-link-color);
  text-decoration: none;
}

.wechat-output strong {
  color: var(--md-primary-color);
  font-weight: bold;
}

.wechat-output em {
  font-style: italic;
}

.wechat-output img {
  display: block;
  max-width: 100%;
  margin: 0.75em auto;
  border-radius: 4px;
}

.wechat-output hr {
  border: 0;
  border-top: 1px solid var(--md-hr-color);
  margin: 1.5em 0;
}

.wechat-output blockquote {
  margin: 1em 8px;
  padding: 1em;
  border-left: 4px solid var(--md-primary-color);
  border-radius: 6px;
  background: var(--md-blockquote-bg);
  color: var(--md-text-color);
}

.wechat-output blockquote > p {
  margin: 0;
}

.wechat-output ul,
.wechat-output ol {
  padding-left: 1.5em;
  margin: 1em 0;
  color: var(--md-text-color);
}

.wechat-output ul {
  list-style: circle;
}

.wechat-output li {
  margin: 0.25em 0;
}

.wechat-output li > p {
  margin: 0.25em 0;
}

.wechat-output :not(pre) > code {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 90%;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--md-code-bg);
  color: var(--md-code-text);
}

.wechat-output pre {
  position: relative;
  background: var(--md-pre-bg);
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 8px;
  padding: 0;
  line-height: 1.6;
}

.wechat-output pre code.hljs {
  display: block;
  padding: 0.75em 1em;
  font-size: 90%;
}

.wechat-output pre .wechat-mac-bar {
  display: flex;
  align-items: center;
  padding: 10px 14px 0;
}

.wechat-output pre .wechat-mac-bar svg {
  width: 45px;
  height: 13px;
}

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

.wechat-output table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  color: var(--md-text-color);
  font-size: 0.95em;
}

.wechat-output th,
.wechat-output td {
  border: 1px solid var(--md-table-border);
  padding: 0.5em 0.75em;
  text-align: left;
}

.wechat-output th {
  background: var(--md-table-header-bg);
  color: var(--md-table-header-text);
  font-weight: bold;
}

.wechat-output .callout {
  margin: 1em 0;
  padding: 1em;
  border-radius: 6px;
  border-left: 4px solid var(--md-primary-color);
  background: var(--md-blockquote-bg);
  color: var(--md-text-color);
}

.wechat-output .callout-title {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.wechat-output .callout-body > p:first-child {
  margin-top: 0;
}

.wechat-output .callout-body > p:last-child {
  margin-bottom: 0;
}

.wechat-output .callout-info { border-left-color: var(--md-callout-info); }
.wechat-output .callout-tip { border-left-color: var(--md-callout-tip); }
.wechat-output .callout-warning { border-left-color: var(--md-callout-warning); }
.wechat-output .callout-danger { border-left-color: var(--md-callout-danger); }
.wechat-output .callout-note { border-left-color: var(--md-callout-note); }
.wechat-output .callout-summary { border-left-color: var(--md-callout-summary); }
.wechat-output .callout-abstract { border-left-color: var(--md-callout-abstract); }
`;

const THEME_OVERRIDES: Record<WechatThemeId, string> = {
  default: `
.wechat-output h1 {
  display: table;
  padding: 0 1em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  font-size: calc(var(--md-font-size) * 1.2);
  text-align: center;
}
.wechat-output h2 {
  display: table;
  padding: 0 0.2em;
  margin: 4em auto 2em;
  color: #ffffff;
  background: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 1.2);
  text-align: center;
}
.wechat-output h3 {
  padding-left: 8px;
  border-left: 3px solid var(--md-primary-color);
  margin: 2em 8px 0.75em 0;
  font-size: calc(var(--md-font-size) * 1.1);
}
.wechat-output h4 {
  margin: 2em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
.wechat-output h5,
.wechat-output h6 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
`,
  grace: `
.wechat-output h1 {
  display: table;
  padding: 0.5em 1em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  font-size: calc(var(--md-font-size) * 1.4);
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}
.wechat-output h2 {
  display: table;
  padding: 0.3em 1em;
  margin: 3em auto 1.5em;
  color: #ffffff;
  background: var(--md-primary-color);
  border-radius: 8px;
  font-size: calc(var(--md-font-size) * 1.3);
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.wechat-output h3 {
  padding-left: 12px;
  border-left: 4px solid var(--md-primary-color);
  border-bottom: 1px dashed var(--md-primary-color);
  margin: 2em 8px 0.75em 0;
  font-size: calc(var(--md-font-size) * 1.2);
}
.wechat-output h4 {
  margin: 2em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 1.1);
}
.wechat-output h5,
.wechat-output h6 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
.wechat-output blockquote {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
.wechat-output img {
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.wechat-output table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}
`,
  simple: `
.wechat-output h1 {
  padding: 0.5em 1em;
  font-size: calc(var(--md-font-size) * 1.4);
  text-align: center;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.05);
}
.wechat-output h2 {
  padding: 0.3em 1.2em;
  font-size: calc(var(--md-font-size) * 1.3);
  text-align: center;
  border-radius: 8px 24px 8px 24px;
  background: color-mix(in srgb, var(--md-primary-color) 12%, transparent);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.wechat-output h3 {
  padding-left: 12px;
  font-size: calc(var(--md-font-size) * 1.2);
  line-height: 2.4em;
  border-radius: 6px;
  border-left: 4px solid var(--md-primary-color);
  border-right: 1px solid color-mix(in srgb, var(--md-primary-color) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--md-primary-color) 10%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--md-primary-color) 10%, transparent);
  background: color-mix(in srgb, var(--md-primary-color) 8%, transparent);
}
.wechat-output h4 {
  font-size: calc(var(--md-font-size) * 1.1);
  border-radius: 6px;
}
.wechat-output h5,
.wechat-output h6 {
  font-size: var(--md-font-size);
  border-radius: 6px;
}
.wechat-output blockquote {
  font-style: italic;
  padding: 1em 1em 1em 2em;
  border-bottom: 0.2px solid rgba(0, 0, 0, 0.04);
  border-top: 0.2px solid rgba(0, 0, 0, 0.04);
  border-right: 0.2px solid rgba(0, 0, 0, 0.04);
}
.wechat-output hr {
  height: 1px;
  border: none;
  background: linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0));
}
`,
  "light-blue": `
.wechat-output h1 {
  display: table;
  padding: 0 1em 0.3em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  font-size: calc(var(--md-font-size) * 1.2);
  text-align: center;
  color: #0d47a1;
}
.wechat-output h2 {
  display: table;
  padding: 0.2em 0.6em;
  margin: 3em auto 1.5em;
  color: #ffffff;
  background: var(--md-primary-color);
  border-radius: 6px;
  font-size: calc(var(--md-font-size) * 1.15);
  text-align: center;
}
.wechat-output h3 {
  padding-left: 10px;
  border-left: 3px solid var(--md-primary-color);
  margin: 2em 8px 0.75em 0;
  font-size: calc(var(--md-font-size) * 1.1);
  color: #1565c0;
}
.wechat-output h4 {
  margin: 2em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
.wechat-output h5,
.wechat-output h6 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
`,
  dark: `
.wechat-output h1 {
  display: table;
  padding: 0 1em 0.3em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  font-size: calc(var(--md-font-size) * 1.2);
  text-align: center;
  color: #90caf9;
}
.wechat-output h2 {
  display: table;
  padding: 0.2em 0.6em;
  margin: 3em auto 1.5em;
  color: #1a1a1a;
  background: var(--md-primary-color);
  border-radius: 6px;
  font-size: calc(var(--md-font-size) * 1.15);
  text-align: center;
}
.wechat-output h3 {
  padding-left: 10px;
  border-left: 3px solid var(--md-primary-color);
  margin: 2em 8px 0.75em 0;
  font-size: calc(var(--md-font-size) * 1.1);
  color: #81d4fa;
}
.wechat-output h4 {
  margin: 2em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
.wechat-output h5,
.wechat-output h6 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
`,
  warm: `
.wechat-output h1 {
  display: table;
  padding: 0 1em 0.3em;
  border-bottom: 2px solid var(--md-primary-color);
  margin: 2em auto 1em;
  font-size: calc(var(--md-font-size) * 1.2);
  text-align: center;
  color: #bf360c;
}
.wechat-output h2 {
  display: table;
  padding: 0.2em 0.6em;
  margin: 3em auto 1.5em;
  color: #ffffff;
  background: var(--md-primary-color);
  border-radius: 6px;
  font-size: calc(var(--md-font-size) * 1.15);
  text-align: center;
}
.wechat-output h3 {
  padding-left: 10px;
  border-left: 3px solid var(--md-primary-color);
  margin: 2em 8px 0.75em 0;
  font-size: calc(var(--md-font-size) * 1.1);
  color: #d84315;
}
.wechat-output h4 {
  margin: 2em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
.wechat-output h5,
.wechat-output h6 {
  margin: 1.5em 8px 0.5em;
  color: var(--md-primary-color);
  font-size: var(--md-font-size);
}
`,
};

export function getWechatThemeVariables(themeId: WechatThemeId): ThemeVariables {
  return THEME_VARIABLES[themeId] ?? THEME_VARIABLES.default;
}

function generateVariablesCss(config: WechatStyleConfig): string {
  const vars = getWechatThemeVariables(config.theme);
  const lines = [
    `:root {`,
    `  --md-primary-color: ${config.primaryColor};`,
    `  --md-font-family: ${config.fontFamily};`,
    `  --md-font-size: ${config.fontSize};`,
    ...Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`),
    `}`,
  ];
  return lines.join("\n");
}

function generateHeadingOverrideCss(config: WechatStyleConfig): string {
  const rules: string[] = [];
  const levels: HeadingLevel[] = ["h1", "h2", "h3", "h4", "h5", "h6"];
  for (const level of levels) {
    const style = config.headingStyles[level];
    if (!style || style === "default") continue;
    switch (style) {
      case "color-only":
        rules.push(`.wechat-output ${level} { color: var(--md-primary-color); background: transparent; }`);
        break;
      case "border-bottom":
        rules.push(
          `.wechat-output ${level} { display: block; text-align: left; background: transparent; padding-bottom: 0.3em; border-bottom: 2px solid var(--md-primary-color); color: var(--md-primary-color); }`
        );
        break;
      case "border-left":
        rules.push(
          `.wechat-output ${level} { display: block; text-align: left; background: transparent; margin-left: 0; padding-left: 10px; border-left: 4px solid var(--md-primary-color); color: var(--md-primary-color); }`
        );
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
    THEME_OVERRIDES[config.theme] ?? "",
    generateHeadingOverrideCss(config),
    generateParagraphCss(config),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function defaultWechatStyleConfig(): WechatStyleConfig {
  return {
    theme: "default",
    fontFamily: FONT_FAMILY_OPTIONS[0].value,
    fontSize: FONT_SIZE_OPTIONS[2].value,
    primaryColor: COLOR_OPTIONS[0].value,
    headingStyles: {},
    codeBlockTheme: CODE_BLOCK_THEMES.find((t) => t.value === "github")?.value ?? CODE_BLOCK_THEMES[0].value,
    previewWidth: "pc",
    macCodeBlock: true,
    showLineNumber: false,
    useIndent: false,
    useJustify: false,
  };
}
