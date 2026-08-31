"use client"

// ========== 对标拆解 · 列表视图（PC）==========
//
// 完整还原 Pixso 画板「PC · 对标拆解列表 1920×HUG」（40:278）的页面结构：
//   PageTitle（标题 30px + 副标题 + 新增对标按钮）
//   StatCardRow（4 张统计卡）
//   FilterTabs（全部 / 拆解中 / 已拆解 / 已转化 / 已归档 + 按时间倒序）
//   BenchmarkCard 列表
//
// 数据来源：真实 Dexie 数据（src/lib/benchmark.ts），非 mock。

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"

import type { Benchmark, BenchmarkStatus } from "@/lib/db"
import { getBenchmarks, statusConfig } from "@/lib/benchmark"
import { PageTitle } from "@/components/shell/pc-shell"
import { StatCard, StatCardRow } from "./stat-card"
import { FilterTabs, type FilterTabItem } from "./filter-tabs"
import { BenchmarkCard, type BenchmarkCardData } from "./benchmark-card"
import type { BadgeTone } from "./status-badge"

/** 筛选值（含 all） */
type FilterValue = BenchmarkStatus | "all"

/** 状态 → 徽章色调（对齐设计的 tint 底 + 主色体系） */
const STATUS_TONE: Record<BenchmarkStatus, BadgeTone> = {
  disassembling: "warning", // 拆解中 → 琥珀 #F5B93D / 底 #261E0E
  disassembled: "brand", // 已拆解 → brand #2DD4A8 / 底 #0E2A22
  converted: "converted", // 已转化 → 紫 #8B7CF6 / 底 #221C36
  archived: "neutral", // 已归档 → 中性灰
}

const FILTER_ITEMS: FilterTabItem<FilterValue>[] = [
  { value: "all", label: "全部" },
  { value: "disassembling", label: "拆解中" },
  { value: "disassembled", label: "已拆解" },
  { value: "converted", label: "已转化" },
  { value: "archived", label: "已归档" },
]

/** 头像色：按用户名稳定分配，保证同一个人始终是同一颜色 */
const AVATAR_COLORS = ["#6366F1", "#F87171"]
function avatarColorOf(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

interface BenchmarkListViewProps {
  /** 点击新增对标 */
  onCreate?: () => void
  /** 点击卡片 */
  onSelect?: (id: string) => void
  /** 点击卡片更多菜单 */
  onMore?: (id: string) => void
}

export function BenchmarkListView({
  onCreate,
  onSelect,
  onMore,
}: BenchmarkListViewProps) {
  const [items, setItems] = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterValue>("all")

  useEffect(() => {
    let alive = true
    getBenchmarks()
      .then((data) => {
        if (!alive) return
        setItems(data)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // 统计：拆解进度分母固定 100（对齐设计稿「87/100」）
  const stats = useMemo(() => {
    const total = 100
    const done =
      items.filter(
        (b) => b.status === "disassembled" || b.status === "converted"
      ).length || 0
    const pending = items.filter((b) => b.status === "disassembling").length
    const disassembled = items.filter((b) => b.status === "disassembled").length
    const converted = items.filter((b) => b.status === "converted").length
    return { total, done, pending, disassembled, converted }
  }, [items])

  const visible = useMemo(() => {
    const list = filter === "all" ? items : items.filter((b) => b.status === filter)
    // 按时间倒序（设计稿右上角标注「按时间倒序」）
    return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }, [items, filter])

  const cards: BenchmarkCardData[] = visible.map((item) => ({
    id: item.id ?? "",
    title: item.title || "未命名对标",
    statusLabel: statusConfig[item.status].label,
    statusTone: STATUS_TONE[item.status],
    source: item.sourceChannel ? `来源 · ${item.sourceChannel}` : undefined,
    completedAt: item.disassemblyCompleteTime
      ? `${formatTime(item.disassemblyCompleteTime)} 完成`
      : undefined,
    assignee: item.assignee,
    avatarColor: avatarColorOf(item.assignee || ""),
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="对标拆解"
        subtitle="拆解爆款视频，沉淀方法论"
        actions={
          <button
            type="button"
            onClick={onCreate}
            className="flex h-10 w-[120px] items-center justify-center gap-2 rounded-lg bg-brand-tint text-brand-500 transition-colors hover:opacity-90"
          >
            <Plus className="size-[14px]" />
            <span className="text-[13px] font-bold">新增对标</span>
          </button>
        }
      />

      <StatCardRow>
        <StatCard
          label="拆解进度"
          value={stats.done}
          suffix={`/ ${stats.total}`}
          tone="brand"
        />
        <StatCard label="待拆解" value={stats.pending} tone="foreground" />
        <StatCard label="已拆解" value={stats.disassembled} tone="brand" />
        <StatCard label="已转化" value={stats.converted} tone="converted" />
      </StatCardRow>

      <FilterTabs
        items={FILTER_ITEMS}
        value={filter}
        onChange={setFilter}
        trailing="按时间倒序"
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl bg-surface text-[13px] text-text-tertiary">
          暂无数据
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <BenchmarkCard
              key={card.id}
              data={card}
              onClick={onSelect}
              onMore={onMore}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** 格式化为「08-30 14:23」 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}
