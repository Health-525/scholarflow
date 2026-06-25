# ScholarFlow Landing Page

这是一个独立、静态、响应式的项目展示页，用于向访客介绍 ScholarFlow 并引导下载 Windows 桌面版。

## 特性

- **纯静态**：只需 HTML + CSS + 少量 JS，无需构建工具
- **响应式**：从手机到桌面端自适应
- **默认暗色科技蓝主题**：深空蓝黑背景 + 电光蓝/青渐变 + 玻璃拟态
- **炫酷动效**：滚动显现、悬浮徽章、背景光晕、发光边框
- **仅宣传 Windows 桌面端**：不展示 Web / Android / PWA 等其他平台
- **无障碍**：Skip Link、ARIA 标签、语义化标签、可见焦点环、键盘导航
- **返回顶部**：滚动后出现的返回顶部按钮
- **SEO / Open Graph**：完整的 meta 标签和社交分享信息

## 本地预览

直接在浏览器打开 `index.html`：

```bash
# Windows
start landing/index.html

# macOS
open landing/index.html

# Linux
xdg-open landing/index.html
```

或者启动一个本地服务器（推荐，避免跨域问题）：

```bash
# 使用 Python
python -m http.server 8080 --directory landing

# 使用 Node.js
npx serve landing
```

然后访问 http://localhost:8080。

## 部署方式

### 1. GitHub Pages（推荐）

1. 将 `landing/` 目录的内容推送到仓库的 `gh-pages` 分支，或
2. 在仓库 Settings → Pages → Build and deployment 中选择 "Deploy from a branch"，选择 `main` 分支的 `/landing` 目录（GitHub Pages 支持子目录部署）

> 注意：`assets/` 目录已包含页面所需的 logo 和截图，因此 `landing/` 目录可以独立部署，无需依赖外部图片 URL。

### 2. Vercel / Netlify

直接将 `landing/` 目录作为静态站点部署：

- **Vercel**: `vercel --cwd landing`
- **Netlify**: 将 `landing/` 目录拖入 Netlify Drop，或配置 publish directory 为 `landing`

### 3. Cloudflare Pages

上传 `landing/` 目录作为静态资源即可。

## 目录结构

```
landing/
├── index.html    # 页面主体
├── styles.css    # 自定义样式与动画
├── main.js       # 交互逻辑
└── README.md     # 本文件
```

## 自定义

- 修改 `index.html` 中的版本号、下载链接、GitHub 链接
- 修改 Open Graph 图片 URL
- 调整品牌色可在 `tailwind.config` 覆盖的 `brand` 色板中修改
- 背景光晕、网格、卡片样式在 `styles.css` 中调整

## 注意事项

- 页面依赖 CDN：Tailwind CSS、Lucide Icons、Google Fonts。如果部署环境无法访问外网，请下载这些资源到本地。
- GitHub 图标使用内联 SVG，避免 Lucide UMD 版本中缺失该图标。
- 截图来自 `assets/` 目录，请确保该目录存在所需图片。
