"use client"

// ========== PC 左侧 Dock ==========
//
// 设计来源：Pixso 画板「PC · 对标拆解列表」节点 40:279
// 规格：
//   容器     208 宽 · 撑满视口高 · 背景 surface #151A22 · 左右内边距 16
//   Logo     48×48 · 圆角 12 · 背景 brand #2DD4A8
//   品牌文字 11px · 颜色 text-secondary #7E8CA0
//   导航项   176×32 · 圆角 10 · 图标 20×20 · 文字 13px
//     未选中 图标 #566274(text-tertiary) · 文字 #7E8CA0(text-secondary) 400
//     选中   背景 brand-tint #0E2A22 · 图标与文字 brand #2DD4A8 · 文字 700
//   分隔线   176×1 · 背景 border #232B38
//   底部头像 24×24 圆形 · 用户名 13px · 文字 text-primary #EDF2F8
//
// 「更多」为次级模块下拉入口（数据追踪 / 复盘记录 / 知识图谱 /
// 问答收集 / 脚本框架），否则这些页面在 Dock 上不可达。

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { MAIN_NAV, MORE_NAV, NOTIFICATION_NAV, isMoreActive } from "./nav-config"

interface PcDockProps {
  /** 当前用户名（头像首字母） */
  userName?: string
  /** 头像背景色 */
  avatarColor?: string
  /** 未读消息数（显示红点） */
  unreadCount?: number
  className?: string
}

export function PcDock({
  userName = "峰岚",
  avatarColor = "#6366F1",
  unreadCount = 0,
  className,
}: PcDockProps) {
  const pathname = usePathname()
  const moreActive = isMoreActive(pathname)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭「更多」下拉
  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [moreOpen])

  // 路由变化后收起下拉
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  return (
    <aside
      className={cn(
        "flex w-[208px] shrink-0 flex-col bg-surface px-4 py-4",
        className
      )}
    >
      {/* 品牌区 */}
      <Link href="/" className="flex flex-col items-center gap-1">
        <div className="size-12 rounded-xl bg-brand-500" />
        <span className="text-[11px] text-text-secondary">闪念</span>
      </Link>

      {/* 主导航 */}
      <nav className="mt-4 flex flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}

        {/* 更多（次级模块下拉） */}
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn(
              "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
              moreActive || moreOpen
                ? "bg-brand-tint text-brand-500"
                : "text-text-secondary hover:bg-surface-hover"
            )}
          >
            <MoreHorizontal
              className={cn(
                "size-5 shrink-0",
                moreActive || moreOpen ? "text-brand-500" : "text-text-tertiary"
              )}
            />
            <span
              className={cn(
                "text-[13px]",
                moreActive || moreOpen ? "font-bold text-brand-500" : "font-normal"
              )}
            >
              更多
            </span>
            <ChevronDown
              className={cn(
                "ml-auto size-4 transition-transform",
                moreOpen && "rotate-180",
                moreActive || moreOpen ? "text-brand-500" : "text-text-tertiary"
              )}
            />
          </button>

          {moreOpen && (
            <div className="absolute left-0 top-9 z-50 flex w-[176px] flex-col gap-1 rounded-xl border border-border bg-elevated p-2 shadow-lg">
              {MORE_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* 底部区 */}
      <div className="mt-auto flex flex-col gap-1">
        <div className="mx-auto h-px w-[176px] bg-border" />

        {/* 消息通知（带未读红点） */}
        <Link
          href={NOTIFICATION_NAV.href}
          className={cn(
            "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
            pathname === NOTIFICATION_NAV.href
              ? "bg-brand-tint text-brand-500"
              : "text-text-secondary hover:bg-surface-hover"
          )}
        >
          <span className="relative shrink-0">
            <NOTIFICATION_NAV.icon
              className={cn(
                "size-5",
                pathname === NOTIFICATION_NAV.href
                  ? "text-brand-500"
                  : "text-text-tertiary"
              )}
            />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "text-[13px]",
              pathname === NOTIFICATION_NAV.href ? "font-bold text-brand-500" : "font-normal"
            )}
          >
            {NOTIFICATION_NAV.label}
          </span>
        </Link>

        {/* 当前用户（页面尚未实现，暂不可点） */}
        <div className="flex h-8 w-[176px] items-center gap-2 rounded-lg px-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {userName.slice(0, 1)}
          </span>
          <span className="text-[13px] text-foreground">{userName}</span>
        </div>
      </div>
    </aside>
  )
}

/** 单个导航项 */
function NavLink({
  item,
  active,
}: {
  item: { label: string; href: string; icon: typeof MoreHorizontal }
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
        active ? "bg-brand-tint text-brand-500" : "text-text-secondary hover:bg-surface-hover"
      )}
    >
      <item.icon
        className={cn("size-5 shrink-0", active ? "text-brand-500" : "text-text-tertiary")}
      />
      <span className={cn("text-[13px]", active ? "font-bold text-brand-500" : "font-normal")}>
        {item.label}
      </span>
    </Link>
  )
}
