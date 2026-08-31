// ========== 统计卡 ==========
//
// 设计来源：Pixso 画板 40:278 的「容器 220」（396 × 96）
// 规格：
//   容器   圆角 12 · 背景 surface #151A22 · 内边距 20
//   标签   12px 400 · text-secondary #7E8CA0
//   主数值 30px 700 · brand #2DD4A8
//   副数值 14px 400 · text-tertiary #566274（如「/100」）
//
//   正文字色默认取 brand；如需强调完成度可传 tone。

import { cn } from "@/lib/utils"

interface StatCardProps {
  /** 标签文案 */
  label: string
  /** 主数值 */
  value: string | number
  /** 副数值（如 "/100"、"%"），显示在数值右侧 */
  suffix?: string
  /** 数值色调 */
  tone?: "brand" | "converted" | "warning" | "foreground"
  className?: string
}

const VALUE_TONE = {
  brand: "text-brand-500",
  converted: "text-converted",
  warning: "text-warning",
  foreground: "text-foreground",
} as const

export function StatCard({
  label,
  value,
  suffix,
  tone = "brand",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex h-24 flex-col justify-center gap-1 rounded-xl bg-surface p-5",
        className
      )}
    >
      <span className="text-[12px] text-text-secondary">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-[30px] font-bold leading-none", VALUE_TONE[tone])}>
          {value}
        </span>
        {suffix && (
          <span className="text-[14px] text-text-tertiary">{suffix}</span>
        )}
      </div>
    </div>
  )
}

/** 统计卡行：等分四列（设计稿 4×396 + 间距，1648 宽） */
export function StatCardRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-6", className)}>{children}</div>
  )
}
