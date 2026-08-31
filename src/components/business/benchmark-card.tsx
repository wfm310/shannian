"use client"

// ========== 对标拆解列表卡片 ==========
//
// 设计来源：Pixso 画板 40:278 的「Card-0」（节点 40:374，1648 × 78）
// 规格：
//   容器     圆角 12 · 背景 surface #151A22 · 内边距 20 · 元素间距 16
//   状态徽章 80×24 · 圆角 9999（见 StatusBadge）
//   标题     16px 700 · text-primary #EDF2F8
//   元信息   12px · 来源 text-secondary #7E8CA0 + 时间 text-tertiary #566274
//   负责人   头像 28×28 圆形 · 姓名 12px text-secondary
//   菜单     32×32 · 圆角 8
//     已转化态 背景 converted-tint #221C36 · 图标 converted #8B7CF6
//     其余态   背景 surface-hover #1B222D · 图标 text-tertiary #566274

import { MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatusBadge, type BadgeTone } from "./status-badge"

export interface BenchmarkCardData {
  id: string
  /** 标题 */
  title: string
  /** 状态文案，如「已转化」 */
  statusLabel: string
  /** 状态色调 */
  statusTone: BadgeTone
  /** 来源，如「来源 · 推荐页」 */
  source?: string
  /** 完成时间，如「08-30 14:23 完成」 */
  completedAt?: string
  /** 负责人 */
  assignee?: string
  /** 负责人头像色 */
  avatarColor?: string
}

interface BenchmarkCardProps {
  data: BenchmarkCardData
  /** 点击卡片主体 */
  onClick?: (id: string) => void
  /** 点击更多菜单 */
  onMore?: (id: string) => void
  className?: string
}

export function BenchmarkCard({
  data,
  onClick,
  onMore,
  className,
}: BenchmarkCardProps) {
  const isConverted = data.statusTone === "converted"

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(data.id)}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(data.id)
        }
      }}
      className={cn(
        "flex items-center gap-4 rounded-xl bg-surface p-5 transition-colors",
        onClick && "cursor-pointer hover:bg-surface-hover",
        className
      )}
    >
      <StatusBadge label={data.statusLabel} tone={data.statusTone} />

      {/* 标题 + 元信息 */}
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate text-[16px] font-bold text-foreground">
          {data.title}
        </h3>
        <div className="flex items-center text-[12px]">
          {data.source && (
            <span className="text-text-secondary">{data.source}</span>
          )}
          {data.completedAt && (
            <span className="text-text-tertiary"> · {data.completedAt}</span>
          )}
        </div>
      </div>

      {/* 负责人 */}
      {data.assignee && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className="flex size-7 items-center justify-center rounded-full text-[10px] text-white"
            style={{ backgroundColor: data.avatarColor ?? "#6366F1" }}
          >
            {data.assignee.slice(0, 1)}
          </span>
          <span className="text-[12px] text-text-secondary">
            {data.assignee}
          </span>
        </div>
      )}

      {/* 更多 */}
      <button
        type="button"
        aria-label="更多操作"
        onClick={(e) => {
          e.stopPropagation()
          onMore?.(data.id)
        }}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isConverted
            ? "bg-converted-tint text-converted"
            : "bg-surface-hover text-text-tertiary hover:text-text-secondary"
        )}
      >
        <MoreHorizontal className="size-3" />
      </button>
    </div>
  )
}
