'use client'

// ========== 全局响应式布局 ==========
//
// 这是所有页面共用的外壳。桌面端使用新的 L-shell（PcDock + PcTopbar），
// 移动端沿用 MobileTabBar（APP 端设计尚未产出）。
//
// 变更记录（2026-08-31）：
//   旧实现使用 AppSidebar + 旧 Topbar（浅色主题）。现统一替换为
//   PcDock + PcTopbar（Pixso 设计稿 40:279 / 40:317，Dark 主题）。
//   此前曾为设计预览单独建 /design-preview 路由并在此加特判绕过旧布局，
//   导致同一模块出现两套页面，该做法已废弃（预览路由已删除）。

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { useIsDesktop } from "@/hooks/use-media-query"
import { PcDock } from "@/components/shell/pc-dock"
import { PcTopbar } from "@/components/shell/pc-topbar"
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar"
import { PageTransition } from "@/components/page-transition"
import { getUnreadCount } from "@/lib/notification"
import { subscribeNotifications } from "@/lib/notification-events"

/** 当前用户（与各业务模块保持一致） */
const CURRENT_USER = "峰岚"

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDesktop = useIsDesktop()
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载未读消息数，并订阅通知事件实时刷新（事件驱动，优于轮询）
  useEffect(() => {
    const load = async () => {
      const count = await getUnreadCount(CURRENT_USER)
      setUnreadCount(count)
    }
    load()
    return subscribeNotifications(load)
  }, [])

  // 移动端：APP 端设计尚未产出，沿用现有 TabBar
  if (!isDesktop) {
    return (
      <div className="flex flex-col mobile-vh">
        <main className="flex-1 overflow-y-auto touch-scroll min-w-0 pb-safe-5">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
        <MobileTabBar />
      </div>
    )
  }

  // 桌面端：Pixso 设计稿 L-shell
  //  Dock 208 固定宽 + 主区自适应（Topbar 72 高 + 内容区可滚动）
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PcDock userName={CURRENT_USER} unreadCount={unreadCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <PcTopbar />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 pb-8">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
