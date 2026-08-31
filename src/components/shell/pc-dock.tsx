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

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { MAIN_NAV, MORE_NAV, FOOTER_NAV, isMoreActive } from "./nav-config"

interface PcDockProps {
  /** 当前用户名（头像首字母取第一个字） */
  userName?: string
  /** 头像背景色，默认靛蓝 #6366F1（设计稿中「峰岚」的头像色） */
  avatarColor?: string
  className?: string
}

export function PcDock({
  userName = "峰岚",
  avatarColor = "#6366F1",
  className,
}: PcDockProps) {
  const pathname = usePathname()
  const moreActive = isMoreActive(pathname)

  return (
    <aside
      className={cn(
        "flex w-[208px] shrink-0 flex-col bg-surface px-4 py-4",
        className
      )}
    >
      {/* 品牌区 */}
      <div className="flex flex-col items-center gap-1">
        <div className="size-12 rounded-xl bg-brand-500" />
        <span className="text-[11px] text-text-secondary">闪念</span>
      </div>

      {/* 主导航 */}
      <nav className="mt-4 flex flex-col gap-1">
        {MAIN_NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
                active
                  ? "bg-brand-tint text-brand-500"
                  : "text-text-secondary hover:bg-surface-hover"
              )}
            >
              <item.icon
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-brand-500" : "text-text-tertiary"
                )}
              />
              <span
                className={cn(
                  "text-[13px]",
                  active ? "font-bold text-brand-500" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* 更多（次级模块） */}
        <div
          className={cn(
            "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
            moreActive ? "bg-brand-tint text-brand-500" : "text-text-secondary"
          )}
        >
          <MoreHorizontal
            className={cn(
              "size-5 shrink-0",
              moreActive ? "text-brand-500" : "text-text-tertiary"
            )}
          />
          <span
            className={cn(
              "text-[13px]",
              moreActive ? "font-bold text-brand-500" : "font-normal"
            )}
          >
            更多
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4",
              moreActive ? "text-brand-500" : "text-text-tertiary"
            )}
          />
          {/* 次级模块入口：默认收起，展开后列出 MORE_NAV */}
          <span className="sr-only">
            {MORE_NAV.map((n) => n.label).join("、")}
          </span>
        </div>
      </nav>

      {/* 底部区 */}
      <div className="mt-auto flex flex-col gap-1">
        <div className="mx-auto h-px w-[176px] bg-border" />
        {FOOTER_NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors",
                active
                  ? "bg-brand-tint text-brand-500"
                  : "text-text-secondary hover:bg-surface-hover"
              )}
            >
              <item.icon
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-brand-500" : "text-text-tertiary"
                )}
              />
              <span
                className={cn(
                  "text-[13px]",
                  active ? "font-bold text-brand-500" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* 个人中心 */}
        <Link
          href="/profile"
          className="flex h-8 w-[176px] items-center gap-2 rounded-lg px-2 transition-colors hover:bg-surface-hover"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {userName.slice(0, 1)}
          </span>
          <span className="text-[13px] text-foreground">{userName}</span>
        </Link>
      </div>
    </aside>
  )
}
