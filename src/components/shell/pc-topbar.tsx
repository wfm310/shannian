"use client"

// ========== PC 顶栏 ==========
//
// 设计来源：Pixso 画板「PC · 对标拆解列表」节点 40:317
// 规格：
//   容器       高 72 · 背景 background #0C0F14 · 左右内边距 32
//   问候语     18px 700 · 文字 text-primary #EDF2F8
//   搜索框     320×40 · 圆角 10 · 背景 surface #151A22 · 图标 16×16
//             占位文字 13px · 颜色 text-tertiary #566274
//   同步状态   圆点 8×8 brand #2DD4A8 · 文字 12px text-secondary #7E8CA0
//   通知按钮   40×40 · 圆角 10 · 背景 surface · 图标 16×16 text-secondary
//   快记按钮   108×40 · 圆角 10 · 背景 brand-tint #0E2A22
//             图标 14×14 brand · 文字 13px 700 brand

import { Search, Bell, Zap } from "lucide-react"

import { cn } from "@/lib/utils"

interface PcTopbarProps {
  /** 问候语（默认按时段生成） */
  greeting?: string
  /** 搜索占位文案 */
  searchPlaceholder?: string
  /** 同步状态文案 */
  syncLabel?: string
  /** 点击快记 */
  onQuickNote?: () => void
  /** 点击通知 */
  onNotification?: () => void
  className?: string
}

export function PcTopbar({
  greeting,
  searchPlaceholder = "搜索对标、选题、灵感…",
  syncLabel = "已同步",
  onQuickNote,
  onNotification,
  className,
}: PcTopbarProps) {
  const text = greeting ?? defaultGreeting()

  return (
    <header
      className={cn(
        "flex h-[72px] items-center gap-4 bg-background px-8",
        className
      )}
    >
      <h1 className="text-[18px] font-bold text-foreground">{text}</h1>

      {/* 搜索框 */}
      <label className="flex h-10 w-[320px] items-center gap-2 rounded-lg bg-surface px-3">
        <Search className="size-4 shrink-0 text-text-tertiary" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-text-tertiary"
        />
      </label>

      {/* 右侧区 */}
      <div className="ml-auto flex items-center gap-3">
        {/* 同步状态 */}
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brand-500" />
          <span className="text-[12px] text-text-secondary">{syncLabel}</span>
        </div>

        {/* 通知 */}
        <button
          type="button"
          onClick={onNotification}
          aria-label="消息通知"
          className="flex size-10 items-center justify-center rounded-lg bg-surface text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <Bell className="size-4" />
        </button>

        {/* 快记 */}
        <button
          type="button"
          onClick={onQuickNote}
          className="flex h-10 w-[108px] items-center justify-center gap-2 rounded-lg bg-brand-tint text-brand-500 transition-colors hover:opacity-90"
        >
          <Zap className="size-[14px]" />
          <span className="text-[13px] font-bold">快记 N</span>
        </button>
      </div>
    </header>
  )
}

/** 按时段生成问候语（对齐设计稿「早上好，峰岚」） */
function defaultGreeting(): string {
  const hour = new Date().getHours()
  const period =
    hour < 6 ? "凌晨好" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好"
  return `${period}，峰岚`
}
