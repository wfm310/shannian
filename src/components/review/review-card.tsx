"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  reviewTypeLabels, reviewPeriodLabels, reviewStatusLabels, formatNumber,
} from "@/lib/review"
import type { ReviewRecord } from "@/lib/db"


// ========== 类型定义 ==========
interface ReviewCardProps {
  record: ReviewRecord
  onClick: () => void
}


// ========== 组件定义 ==========
export function ReviewCard({ record, onClick }: ReviewCardProps) {
  const isCompleted = record.status === "completed"
  const isPending = record.status === "pending"
  const isInProgress = record.status === "in_progress"

  // 格式化相对时间
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

  return (
    <Card
      className="p-4 cursor-pointer hover:border-primary/50 transition-colors space-y-3"
      onClick={onClick}
    >
      {/* 第一行：标题 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm line-clamp-2">{record.title}</h3>
        <Badge
          variant={isCompleted ? "default" : isInProgress ? "secondary" : "outline"}
          className="text-xs flex-shrink-0"
        >
          {reviewStatusLabels[record.status]}
        </Badge>
      </div>

      {/* 第二行：类型 + 周期 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {reviewTypeLabels[record.type]}
        </Badge>
        {record.period && (
          <Badge variant="outline" className="text-xs">
            {reviewPeriodLabels[record.period]}
          </Badge>
        )}
      </div>

      {/* 第三行：条目统计 */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {record.goodItems.length > 0 && (
          <span>好的 {record.goodItems.length}</span>
        )}
        {record.badItems.length > 0 && (
          <span>不足 {record.badItems.length}</span>
        )}
        {record.experiences.length > 0 && (
          <span>经验 {record.experiences.length}</span>
        )}
        {record.actions.length > 0 && (
          <span>行动 {record.actions.length}</span>
        )}
        {record.goodItems.length === 0 && record.badItems.length === 0 && (
          <span className="italic">等待填写</span>
        )}
      </div>

      {/* 第四行：时间 */}
      <div className="text-xs text-muted-foreground">
        {isCompleted && record.completedAt
          ? `完成于 ${formatRelativeTime(record.completedAt)}`
          : `创建于 ${formatRelativeTime(record.createdAt)}`}
      </div>
    </Card>
  )
}