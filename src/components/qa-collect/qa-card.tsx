"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { QaQuestion } from "@/lib/db"
import { qaStatusConfig, qaSourceConfig } from "@/lib/qa-collect"


// ========== 类型定义 ==========
interface QaCardProps {
  question: QaQuestion           // 问答数据
  onOpen: (id: number) => void     // 点击卡片时调用，传入问答 ID
}


// ========== 组件定义 ==========
export function QaCard({ question, onOpen }: QaCardProps) {

  // 获取状态和来源的配置（显示文字 + Badge 颜色）
  const statusInfo = qaStatusConfig[question.status]
  const sourceInfo = qaSourceConfig[question.source]

  // 答案数量
  const answerCount = question.answers?.length || 0
  // 已转选题的答案数量
  const convertedCount = question.answers?.filter(a => a.topicId).length || 0


  // ----- 格式化相对时间 -----
  // 把时间戳转成"刚刚 / X分钟前 / X小时前 / X天前"
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
      // 点击整个卡片打开详情
      onClick={() => onOpen(question.id!)}
      // 鼠标变手指 + 悬停阴影效果 + 过渡动画
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

      {/* 问题内容（最多显示 3 行） */}
      {/* line-clamp-3 → 超过 3 行省略号 */}
      {/* whitespace-pre-wrap → 保留换行 */}
      <p className="text-sm line-clamp-3 whitespace-pre-wrap">
        {question.content}
      </p>

      {/* 底部：答案数 + 创建时间 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {answerCount} 个答案
          {convertedCount > 0 && `（${convertedCount} 已转选题）`}
        </span>
        <span>{formatRelativeTime(question.createdAt)}</span>
      </div>
    </Card>
  )
}