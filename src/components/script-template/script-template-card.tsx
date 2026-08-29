"use client"

// ========== 导入区域 ==========
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ScriptTemplate } from "@/lib/db"
import { frameworkPresets } from "@/lib/script-template"
import { Layers } from "lucide-react"


// ========== 类型定义 ==========
interface ScriptTemplateCardProps {
  template: ScriptTemplate      // 框架数据
  onClick?: () => void          // 点击卡片回调
}


// ========== 组件定义 ==========
export function ScriptTemplateCard({ template, onClick }: ScriptTemplateCardProps) {
  // 框架类型中文标签
  const typeLabel = frameworkPresets[template.frameworkType].label
  // 步骤数量
  const stepCount = (template.steps || []).length

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* 类型 Badge */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary">{typeLabel}</Badge>
        <span className="text-xs text-muted-foreground">
          {stepCount} 步
        </span>
      </div>

      {/* 标题 */}
      <h3 className="font-medium text-sm mb-1 line-clamp-1">
        {template.title}
      </h3>

      {/* 步骤预览 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {(template.steps || []).slice(0, 4).map((step: { id: string; name: string }, i: number) => (
          <span key={step.id} className="text-xs text-muted-foreground">
            {i > 0 && " → "}
            {step.name}
          </span>
        ))}
        {stepCount > 4 && (
          <span className="text-xs text-muted-foreground">...</span>
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{template.creator}</span>
        <span>{formatDate(template.updatedAt)}</span>
      </div>
    </Card>
  )
}