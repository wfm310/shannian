"use client"

// ========== 胶囊筛选 Tab ==========
//
// 设计来源：Pixso 画板 40:278 的「容器 228」（1648 × 32）
// 规格：
//   胶囊   80×32 · 圆角 9999
//     选中   背景 brand-tint #0E2A22 · 文字 12px brand #2DD4A8
//     未选中 背景 surface #151A22    · 文字 12px text-secondary #7E8CA0
//   右侧   排序说明 12px · text-tertiary #566274

import { cn } from "@/lib/utils"

export interface FilterTabItem<T extends string = string> {
  value: T
  label: string
}

interface FilterTabsProps<T extends string = string> {
  items: FilterTabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** 右侧内容（如「按时间倒序」） */
  trailing?: React.ReactNode
  className?: string
}

export function FilterTabs<T extends string = string>({
  items,
  value,
  onChange,
  trailing,
  className,
}: FilterTabsProps<T>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              "flex h-8 min-w-20 items-center justify-center rounded-full px-3 text-[12px] transition-colors",
              active
                ? "bg-brand-tint text-brand-500"
                : "bg-surface text-text-secondary hover:bg-surface-hover"
            )}
          >
            {item.label}
          </button>
        )
      })}
      {trailing && (
        <span className="ml-auto text-[12px] text-text-tertiary">{trailing}</span>
      )}
    </div>
  )
}
