export interface WechatTheme {
  id: string;
  name: string;
  description?: string;
}

export const WECHAT_THEMES: WechatTheme[] = [
  { id: "default", name: "默认", description: "白底黑字，通用简洁" },
  { id: "light-blue", name: "浅蓝", description: "淡蓝背景，清新阅读" },
  { id: "dark", name: "暗夜", description: "深色背景，护眼沉浸" },
  { id: "warm", name: "暖橙", description: "暖黄便签，轻松亲切" },
];

export function getWechatThemeCss(themeId: string): string {
  const base = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 16px;
      line-height: 1.8;
    }
    .wrapper {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .article {
      overflow-wrap: break-word;
    }
    .article h1, .article h2, .article h3, .article h4, .article h5, .article h6 {
      line-height: 1.4;
      font-weight: 600;
      margin-top: 1.4em;
      margin-bottom: 0.6em;
    }
    .article h1 { font-size: 24px; }
    .article h2 { font-size: 21px; }
    .article h3 { font-size: 18px; }
    .article p { margin: 14px 0; }
    .article img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 18px auto;
      border-radius: 6px;
    }
    .article ul, .article ol { margin: 14px 0; padding-left: 1.6em; }
    .article li { margin: 6px 0; }
    .article blockquote {
      margin: 18px 0;
      padding: 12px 18px;
      border-radius: 6px;
    }
    .article code {
      font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 0.9em;
      padding: 2px 5px;
      border-radius: 4px;
    }
    .article pre {
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 18px 0;
    }
    .article pre code { padding: 0; background: transparent; }
    .article a { text-decoration: none; }
    .article hr { border: 0; margin: 22px 0; }
    .article table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 14px;
    }
    .article th, .article td {
      padding: 10px 12px;
      border: 1px solid;
      text-align: left;
    }
    .article th { font-weight: 600; }
  `;

  const themes: Record<string, string> = {
    default: `
      body { background: #ffffff; color: #333333; }
      .article h1 { color: #1a1a1a; border-bottom: 1px solid #eeeeee; padding-bottom: 8px; }
      .article h2 { color: #222222; }
      .article h3 { color: #333333; }
      .article a { color: #576b95; }
      .article blockquote { color: #555555; background: #f8f9fa; border-left: 4px solid #dddddd; }
      .article code { background: #f2f2f2; color: #333333; }
      .article pre { background: #f7f7f7; }
      .article hr { border-top: 1px solid #eeeeee; }
      .article th { background: #f7f7f7; border-color: #e0e0e0; }
      .article td { border-color: #e0e0e0; }
    `,
    "light-blue": `
      body { background: #eaf6fb; color: #1a3a52; }
      .wrapper { padding: 32px 16px; }
      .article {
        background: #ffffff;
        border-radius: 14px;
        padding: 32px;
        box-shadow: 0 6px 24px rgba(25, 118, 210, 0.08);
      }
      .article h1 { color: #0d47a1; border-bottom: 1px solid #bbdefb; padding-bottom: 10px; }
      .article h2 { color: #1565c0; }
      .article h3 { color: #1976d2; }
      .article a { color: #0d47a1; border-bottom: 1px solid #90caf9; }
      .article blockquote { color: #1a3a52; background: #e3f2fd; border-left: 4px solid #42a5f5; }
      .article code { background: #e1f5fe; color: #01579b; }
      .article pre { background: #e1f5fe; }
      .article hr { border-top: 1px solid #bbdefb; }
      .article img { box-shadow: 0 2px 8px rgba(13, 71, 161, 0.1); border: 1px solid #e3f2fd; }
      .article th { background: #e3f2fd; border-color: #bbdefb; color: #0d47a1; }
      .article td { border-color: #bbdefb; }
    `,
    dark: `
      body { background: #1a1a1a; color: #e0e0e0; }
      .article {
        background: #242424;
        border-radius: 14px;
        padding: 32px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      }
      .article h1 { color: #90caf9; border-bottom: 1px solid #424242; padding-bottom: 10px; }
      .article h2 { color: #81d4fa; }
      .article h3 { color: #4fc3f7; }
      .article a { color: #82b1ff; }
      .article blockquote { color: #b0bec5; background: #2c2c2c; border-left: 4px solid #42a5f5; }
      .article code { background: #2c2c2c; color: #80cbc4; }
      .article pre { background: #2c2c2c; }
      .article hr { border-top: 1px solid #424242; }
      .article img { border: 1px solid #424242; }
      .article th { background: #2c2c2c; border-color: #424242; color: #90caf9; }
      .article td { border-color: #424242; }
    `,
    warm: `
      body { background: #fff8e1; color: #4e342e; }
      .wrapper { padding: 32px 16px; }
      .article {
        background: #ffffff;
        border-radius: 14px;
        padding: 32px;
        box-shadow: 0 6px 24px rgba(230, 81, 0, 0.08);
      }
      .article h1 { color: #bf360c; border-bottom: 1px solid #ffe0b2; padding-bottom: 10px; }
      .article h2 { color: #d84315; }
      .article h3 { color: #e65100; }
      .article a { color: #bf360c; border-bottom: 1px solid #ffcc80; }
      .article blockquote { color: #5d4037; background: #fff3e0; border-left: 4px solid #ff9800; }
      .article code { background: #fff3e0; color: #bf360c; }
      .article pre { background: #fff3e0; }
      .article hr { border-top: 1px solid #ffe0b2; }
      .article img { box-shadow: 0 2px 8px rgba(191, 54, 12, 0.1); border: 1px solid #ffe0b2; }
      .article th { background: #fff3e0; border-color: #ffe0b2; color: #bf360c; }
      .article td { border-color: #ffe0b2; }
    `,
  };

  return base + (themes[themeId] || themes.default);
}
