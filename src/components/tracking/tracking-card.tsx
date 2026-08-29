"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { trackingNodeConfig, statusLabels, calculateRates } from "@/lib/tracking"
import type { TrackingRecord } from "@/lib/db"


// ========== 类型定义 ==========
interface TrackingCardProps {
  record: TrackingRecord
  publishTitle: string
  onClick: () => void
}


// ========== 组件定义 ==========
export function TrackingCard({ record, publishTitle, onClick }: TrackingCardProps) {
  const isCustom = record.node === "custom"
  const nodeLabel = isCustom ? record.customLabel : trackingNodeConfig[record.node].label
  const isRecorded = record.status === "recorded"
  const rates = calculateRates(record)

  // 格式化数字（万）
  function formatNumber(n: number | null): string {
    if (n === null) return "—"
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
    return n.toString()
  }

  // 格式化时间
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
      {/* 第一行：来源标题 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm line-clamp-1">
          {publishTitle}
        </h3>
        <Badge
          variant={isRecorded ? "default" : "secondary"}
          className="text-xs flex-shrink-0"
        >
          {statusLabels[record.status]}
        </Badge>
      </div>

      {/* 第二行：节点标签 */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {nodeLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(record.scheduledTime)}
        </span>
      </div>

      {/* 第三行：关键指标 */}
      {isRecorded && record.views !== null ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">播放量</p>
            <p className="text-sm font-medium">{formatNumber(record.views)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">点赞率</p>
            <p className="text-sm font-medium">{rates.likeRate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">完播率</p>
            <p className="text-sm font-medium">
              {record.completionRate !== null ? `${record.completionRate}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">涨粉</p>
            <p className="text-sm font-medium">{formatNumber(record.followers)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {isRecorded ? "暂无流量数据" : "等待录入数据"}
        </p>
      )}
    </Card>
  )
}