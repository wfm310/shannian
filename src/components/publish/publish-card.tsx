"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { statusLabels } from "@/lib/publish"
import type { PublishRecord } from "@/lib/db"


// ========== 类型定义 ==========
interface PublishCardProps {
  record: PublishRecord
  onClick: () => void
}


// ========== 组件定义 ==========
export function PublishCard({ record, onClick }: PublishCardProps) {
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

  const isPublished = record.status === "published"

  return (
    <Card
      className="p-4 cursor-pointer hover:border-primary/50 transition-colors space-y-3"
      onClick={onClick}
    >
      {/* 第一行：标题 + 状态徽章 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm line-clamp-2">{record.title}</h3>
        <Badge
          variant={isPublished ? "default" : "secondary"}
          className="text-xs flex-shrink-0"
        >
          {statusLabels[record.status]}
        </Badge>
      </div>

      {/* 第二行：标签数量 + 视频链接状态 */}
      <div className="flex items-center gap-2 flex-wrap">
        {record.hashtags.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {record.hashtags.length} 个标签
          </span>
        )}
        {record.hashtags.length > 0 && record.videoUrl && (
          <span className="text-muted-foreground text-xs">·</span>
        )}
        {record.videoUrl && (
          <span className="text-xs text-muted-foreground">有视频链接</span>
        )}
      </div>

      {/* 第三行：标签预览 */}
      {record.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {record.hashtags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {record.hashtags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{record.hashtags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 第四行：时间 */}
      <div className="text-xs text-muted-foreground">
        {isPublished && record.publishTime
          ? `发布于 ${formatRelativeTime(record.publishTime)}`
          : `创建于 ${formatRelativeTime(record.createdAt)}`}
      </div>
    </Card>
  )
}