# ScholarFlow Landing Page

这是一个独立、静态、响应式的项目展示页，用于向访客介绍 ScholarFlow 并引导下载。

## 特性

- **纯静态**：只需 HTML + CSS + 少量 JS，无需构建工具
- **响应式**：从手机到桌面端自适应
- **暗色模式**：自动跟随系统 `prefers-color-scheme`
- **动效克制**：滚动显现、3D 倾斜、悬浮徽章、毛玻璃效果
- **无障碍**：支持 `prefers-reduced-motion`，语义化标签
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
- 在 `showcaseImages`（`main.js`）中添加更多截图切换
- 调整品牌色可在 `tailwind.config` 覆盖的 `brand` / `ximi` 色板中修改

## 注意事项

- 页面依赖 CDN：Tailwind CSS、Lucide Icons、Google Fonts。如果部署环境无法访问外网，请下载这些资源到本地。
- 截图来自 `screenshots/` 目录，通过 GitHub raw URL 引用。若仓库结构或分支变更，请同步更新 URL。
