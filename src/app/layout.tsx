// ========== 导入区域 ==========
import type { Metadata, Viewport } from "next"
// 设计令牌（色阶 + 语义层）已合并进 globals.css 顶部的「设计令牌」区块。
// 不可拆为独立文件，也不可用 @import 引入：Tailwind 只在含
// @import "tailwindcss" 的入口文件里处理 @theme，独立文件会导致色阶失效。
import "./globals.css"

// 响应式布局（自动切换 PC 侧边栏 / 移动底部 Tab）
import { ResponsiveLayout } from "@/components/layout/responsive-layout"
// Tooltip 提供者（shadcn 需要）
import { TooltipProvider } from "@/components/ui/tooltip"
// Toast 提供者（sonner，全局消息提示）
import { ToasterProvider } from "@/components/toaster-provider"
// 全局闪念快记（快捷键 N 唤出）
import { QuickFlashThought } from "@/components/quick-flash-thought"
// PWA Service Worker 注册（仅生产环境生效）
import { SWRegister } from "@/components/sw-register"
// 业务规则层启动器（消息规则引擎 + 自动归档定时任务）
import { CoreBootstrap } from "@/components/core-bootstrap"


// ========== 元数据配置 ==========
export const metadata: Metadata = {
  title: "闪念 Pro - 创作者的第二大脑",
  description: "记录你一闪而过的想法，从灵感到爆款的创作旅程",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "闪念Pro",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#6366f1",
}


// ========== 根布局组件 ==========
// RootLayout 是所有页面的外壳
// children 参数 → 当前页面的内容
//   访问 /todo 时，children 就是 todo/page.tsx 的内容
//   访问 / 时，children 就是 page.tsx 的内容
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          // 主题策略（2026-08-31 改）：Dark 优先 —— Pixso 变量集合以 Dark 为默认模式
          //   - 默认 / 显式 dark / system 且系统偏好暗色 → html 加 .dark
          //     （.dark 仅作 Tailwind dark: 变体的开关，不再承载变量定义）
          //   - 显式 light → 加 .light，由 globals.css 的 .light 提供亮色语义值
          __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';var d=document.documentElement;if(t==='light'){d.classList.add('light')}else if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}else{d.classList.add('dark')}}catch(e){}})()`
        }} />
      </head>
      <body className="antialiased">
        <TooltipProvider>
          <ToasterProvider />
          <QuickFlashThought />
          <ResponsiveLayout>{children}</ResponsiveLayout>
          <SWRegister />
          <CoreBootstrap />
        </TooltipProvider>
      </body>
    </html>
  )
}
