// ========== 状态徽章 ==========
//
// 设计规律（取自 Pixso 画板 40:278 的 Card-0/1/2）：
//   徽章 = tint 底色 + 主色圆点 + 主色文字
//   容器 80×24 · 圆角 9999 · 圆点 6×6 · 文字 11px
//
//   已拆解 底 #0E2A22(brand-tint)      字 #2DD4A8(brand)
//   已转化 底 #221C36(converted-tint)  字 #8B7CF6(converted)
//   拆解中 底 #261E0E(warning-tint)    字 #F5B93D(warning)
//
// 注：violet 与 warning 的 tint 底色在 Pixso 中是硬编码（未绑变量），
// 已在 globals.css 中补为 --converted-tint / --warning-tint。

import { cn } from "@/lib/utils"

/** 徽章色调 */
export type BadgeTone = "brand" | "converted" | "warning" | "danger" | "neutral"

const TONE_CLASS: Record<BadgeTone, { bg: string; fg: string }> = {
  brand: { bg: "bg-brand-tint", fg: "text-brand-500" },
  converted: { bg: "bg-converted-tint", fg: "text-converted" },
  warning: { bg: "bg-warning-tint", fg: "text-warning" },
  danger: { bg: "bg-danger/10", fg: "text-danger" },
  neutral: { bg: "bg-surface-hover", fg: "text-text-secondary" },
}

interface StatusBadgeProps {
  /** 文案 */
  label: string
  /** 色调，决定底色与文字色 */
  tone?: BadgeTone
  /** 是否显示左侧圆点（默认显示） */
  dot?: boolean
  className?: string
}

export function StatusBadge({
  label,
  tone = "neutral",
  dot = true,
  className,
}: StatusBadgeProps) {
  const { bg, fg } = TONE_CLASS[tone]
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-20 items-center justify-center gap-1.5 rounded-full px-2.5",
        bg,
        fg,
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      <span className="text-[11px] leading-none">{label}</span>
    </span>
  )
}
