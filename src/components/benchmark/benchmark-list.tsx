"use client"

import { cn } from "@/lib/utils"
import {
  statusConfig,
  sourceChannelConfig,
  calculateProgress,
} from "@/lib/benchmark"
import type { Benchmark, BenchmarkStatus } from "@/lib/db"
import { ChevronRight, User } from "lucide-react"

const statusDotClass: Record<BenchmarkStatus, string> = {
  pending: "bg-muted-foreground/40",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  converted: "bg-indigo-500",
}

interface BenchmarkListProps {
  benchmarks: Benchmark[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function BenchmarkList({
  benchmarks,
  onSelect,
}: BenchmarkListProps) {
  return (
    <div className="h-full overflow-y-auto px-5 pt-3 pb-4 space-y-3">
      {benchmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[15px] text-muted-foreground">暂无对标视频</p>
        </div>
      ) : (
        benchmarks.map(item => {
          const progress = calculateProgress(item)
          const statusInfo = statusConfig[item.status]
          const sourceInfo = sourceChannelConfig[item.sourceChannel]
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id!)}
              className="w-full text-left rounded-[18px] bg-secondary/15 p-4 active:bg-secondary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* 状态圆点 */}
                <div className={cn(
                  "size-[9px] rounded-full mt-[7px] shrink-0",
                  statusDotClass[item.status]
                )} />

                {/* 标题 + 元信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-normal text-foreground leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1 shrink-0">
                      <User className="size-3.5" />
                      <span className="truncate">{item.assignee || "未分配"}</span>
                    </span>
                    <span className="text-muted-foreground/40 shrink-0">·</span>
                    <span className="shrink-0">{sourceInfo?.label || item.sourceChannel}</span>
                    <span className="text-muted-foreground/40 shrink-0">·</span>
                    {/* 进度点 */}
                    <div className="flex items-center gap-[3px] shrink-0">
                      {[0, 1, 2, 3].map(i => (
                        <span
                          key={i}
                          className={cn(
                            "size-[5px] rounded-full",
                            i < progress ? "bg-foreground" : "bg-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] shrink-0">{progress}/4</span>
                  </div>
                </div>

                {/* 右侧箭头 */}
                <ChevronRight
                  className="size-[17px] text-muted-foreground/30 mt-[5px] shrink-0"
                  strokeWidth={1.5}
                />
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
