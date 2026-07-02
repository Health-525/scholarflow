import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Geist } from "next/font/google";
import { headers } from "next/headers";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import ClientShell from "./ClientShell";
import QueryProvider from "./QueryProvider";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Microsoft YaHei", "sans-serif"],
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ScholarFlow",
  description:
    "本地优先的校园学习工作台，整合教务数据、图书馆流程、作业、笔记与学习报告。",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/logo.png", type: "image/png" }],
    apple: "/icons/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ScholarFlow",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iOS 安全区：启用后 env(safe-area-inset-*) 才非 0（灵动岛/刘海适配）
  themeColor: [
    { color: "#faf7f2" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(geistSans.variable)}
    >
      <head>
        {/* CSP 由 middleware.ts 统一通过 HTTP Header 下发，此处不再重复设置 meta，
            避免策略冲突或 meta 覆盖更严格的 header。 */}

        {/* 萌系大标题字体(站酷快乐体)— Google Fonts;加载不出则回退黑体,不影响功能
            App Router 下使用 <link> 加载第三方字体是已知模式,此处为特殊中文字体,
            next/font/google 未覆盖该字体,故保留 link 方式。 */}
        {/* eslint-disable @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}

        {/* iOS / PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ScholarFlow" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Inline theme init to prevent flash of wrong theme */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('sf_theme');
                  var effective = 'light';
                  if (t === 'dark') effective = 'dark';
                  else if (t === 'system' || !t) {
                    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', effective);
                  if (effective === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                  var skin = localStorage.getItem('sf_skin');
                  if (skin !== 'blue' && skin !== 'ximi') skin = 'ximi';
                  document.documentElement.setAttribute('data-skin', skin);
                  if (effective === 'dark') {
                    document.documentElement.style.backgroundColor = '#0a0a0f';
                  } else {
                    document.documentElement.style.backgroundColor = '#f7f7f5';
                  }
                } catch(e) {
                  // 主题初始化失败不应阻塞渲染，但开发环境应暴露问题。
                  if (process.env.NODE_ENV === "development") {
                    // eslint-disable-next-line no-console
                    console.error("[ThemeInit] failed:", e);
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={notoSansSC.variable}>
        <ErrorBoundary>
          <QueryProvider>
            <TooltipProvider>
              <ClientShell>{children}</ClientShell>
            </TooltipProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
