"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Inspiration } from "@/lib/db"
import { inspirationStatusConfig, inspirationSourceConfig } from "@/lib/inspiration"


// ========== 类型定义 ==========
interface InspirationCardProps {
  inspiration: Inspiration      // 灵感数据
  onOpen: (id: string) => void    // 点击卡片时调用，传入灵感 ID
}


// ========== 组件定义 ==========
export function InspirationCard({ inspiration, onOpen }: InspirationCardProps) {

  // 获取状态和来源的配置
  const statusInfo = inspirationStatusConfig[inspiration.status]
  const sourceInfo = inspirationSourceConfig[inspiration.source]


  // ----- 格式化相对时间 -----
  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }


  // ===== 渲染 =====
  return (
    <Card
      onClick={() => onOpen(inspiration.id!)}
      className="p-4 cursor-pointer hover:shadow-md transition-shadow space-y-3"
    >
      {/* 顶部：状态 Badge + 来源 Badge */}
      <div className="flex items-center justify-between">
        <Badge variant={statusInfo.variant}>
          {statusInfo.label}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {sourceInfo.label}
        </Badge>
      </div>

      {/* 灵感内容（最多显示 2 行） */}
      <p className="text-sm font-medium line-clamp-2">
        {inspiration.content}
      </p>

      {/* 结论预览（有结论才显示，最多显示 2 行） */}
      {inspiration.conclusion && (
        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
          结论：{inspiration.conclusion}
        </p>
      )}

      {/* 底部：创建人 + 更新时间 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{inspiration.creator}</span>
        <span>{formatRelativeTime(inspiration.updatedAt)}</span>
      </div>
    </Card>
  )
}