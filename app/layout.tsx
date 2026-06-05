import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Geist } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScholarFlow",
  description: "统一学习管理中枢 — 课表、作业、跑步、日报",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/logo.png", type: "image/png" },
    ],
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
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={cn("font-sans", geist.variable)} data-scroll-behavior="smooth">
      <head>
        {/* Inline theme init to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('sf_theme');
                  if (t === 'dark' || t === 'light') {
                    document.documentElement.setAttribute('data-theme', t);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={notoSansSC.variable}>
        <QueryProvider>
          <TooltipProvider>
            <ClientShell>{children}</ClientShell>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

// Client shell is in a separate file to handle auth routing
import ClientShell from "./ClientShell";
import QueryProvider from "./QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

