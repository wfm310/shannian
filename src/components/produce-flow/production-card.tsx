"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  stageLabels, statusLabels, modeLabels, stageOrder,
} from "@/lib/produce-flow"
import type { ProductionTask } from "@/lib/db"

interface ProductionCardProps {
  task: ProductionTask
  onClick: () => void
}

export function ProductionCard({ task, onClick }: ProductionCardProps) {
  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return "刚刚"
  }

  const stageIndex = stageOrder.indexOf(task.currentStage)
  const hasPending = task.pendingStages.length > 0

  return (
    <Card
      className="p-4 cursor-pointer hover:border-primary/50 transition-colors space-y-3"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge variant="secondary" className="text-xs">
            {modeLabels[task.mode]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={task.status === "active" ? "default" : "outline"}
          className="text-xs"
        >
          {statusLabels[task.status]}
        </Badge>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="text-sm font-medium">
          {stageLabels[task.currentStage]}
        </span>
        {hasPending && (
          <Badge variant="destructive" className="text-xs">
            待补填
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {stageOrder.map((stage, index) => (
          <div
            key={stage}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= stageIndex
                ? "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        创建于 {formatRelativeTime(task.createdAt)}
      </div>
    </Card>
  )
}
