"use client"

// ========== PC 页面骨架（L-shell）==========
//
// 结构：Dock（208 固定宽） + Main（自适应）→ Topbar（72 高） + Content
// 对齐 Pixso 画板 40:278 的整体结构：
//   根 frame 1920 宽 · 背景 background #0C0F14
//   ├─ Dock    208 × 撑满
//   └─ Main    1712（1920 - 208）
//      ├─ Topbar  1712 × 72
//      └─ Content 1712 × 自适应 · 内边距 32

import { cn } from "@/lib/utils"
import { PcDock } from "./pc-dock"
import { PcTopbar } from "./pc-topbar"

interface PcShellProps {
  children: React.ReactNode
  /** 覆盖默认问候语 */
  greeting?: string
  /** 搜索占位文案 */
  searchPlaceholder?: string
  /** 点击快记 */
  onQuickNote?: () => void
  className?: string
}

export function PcShell({
  children,
  greeting,
  searchPlaceholder,
  onQuickNote,
  className,
}: PcShellProps) {
  return (
    <div className={cn("flex min-h-screen bg-background", className)}>
      <PcDock />
      <div className="flex min-w-0 flex-1 flex-col">
        <PcTopbar
          greeting={greeting}
          searchPlaceholder={searchPlaceholder}
          onQuickNote={onQuickNote}
        />
        <main className="min-w-0 flex-1 px-8 pb-8">{children}</main>
      </div>
    </div>
  )
}

// ========== 页面标题区 ==========
//
// 对齐画板节点 40:332（容器 217，1648 × 40）：
//   标题   30px 700 · text-primary #EDF2F8
//   副标题 13px 400 · text-secondary #7E8CA0
//   右侧   操作按钮区

interface PageTitleProps {
  title: string
  subtitle?: string
  /** 右侧操作区（如「新增对标」按钮） */
  actions?: React.ReactNode
  className?: string
}

export function PageTitle({
  title,
  subtitle,
  actions,
  className,
}: PageTitleProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-[30px] font-bold leading-none text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-text-secondary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="ml-auto flex items-center gap-3">{actions}</div>}
    </div>
  )
}
