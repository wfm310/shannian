"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FlashThought } from "@/lib/db"
import { statusConfig, categoryTargetConfig } from "@/lib/flash-thought"

interface FlashThoughtCardProps {
  flash: FlashThought
  onOpenDetail: (flash: FlashThought) => void
  className?: string
}

export function FlashThoughtCard({
  flash,
  onOpenDetail,
  className = "",
}: FlashThoughtCardProps) {
  const statusInfo = statusConfig[flash.status]

  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  function getTargetLabel(): string | null {
    if (flash.status === "categorized" && flash.categoryTarget) {
      return `→ ${categoryTargetConfig[flash.categoryTarget].label}`
    }
    if (flash.status === "converted_todo") return "→ 今日待办"
    return null
  }

  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-transparent shadow-none border border-border ${className}`}
      onClick={() => onOpenDetail(flash)}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={statusInfo.variant} className="text-xs">
            {statusInfo.label}
          </Badge>
        </div>
        <p className="text-sm line-clamp-3 whitespace-pre-wrap">
          {flash.content}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatRelativeTime(flash.createdAt)}</span>
          {getTargetLabel() && (
            <Badge variant="outline" className="text-xs">
              {getTargetLabel()}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
