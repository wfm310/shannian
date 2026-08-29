"use client"

// ========== 导入区域 ==========
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import type { ScriptTemplate } from "@/lib/db"
import { frameworkPresets } from "@/lib/script-template"
import { deleteScriptTemplate } from "@/lib/script-template"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"


// ========== 类型定义 ==========
interface ScriptTemplateDetailProps {
  template: ScriptTemplate | null   // 要查看的框架（null = 不显示）
  open: boolean                     // 弹窗是否打开
  onOpenChange: (open: boolean) => void  // 关闭回调
  onEdit?: () => void               // 编辑按钮回调
  onDeleted?: () => void            // 删除成功回调
}


// ========== 组件定义 ==========
export function ScriptTemplateDetail({
  template, open, onOpenChange, onEdit, onDeleted
}: ScriptTemplateDetailProps) {
  if (!template) return null

  // 框架类型中文标签
  const typeLabel = frameworkPresets[template.frameworkType].label

  // 格式化时间
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, "0")
    const m = date.getMinutes().toString().padStart(2, "0")
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${h}:${m}`
  }

  // ----- 删除 -----
  async function handleDelete() {
    if (!template?.id) return
    await deleteScriptTemplate(template.id)
    onOpenChange(false)
    onDeleted?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" initialFocus={false}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>框架详情</DialogTitle>
          <DialogDescription>步骤名和指导说明可点击编辑修改</DialogDescription>
        </DialogHeader>

        {/* 内容（可滚动） */}
        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">

          {/* 标题 + 类型 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{template.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{typeLabel}</Badge>
              <span className="text-xs text-muted-foreground">
                {template.steps.length} 个步骤
              </span>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建人</span>
              <span className="font-medium">{template.creator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间</span>
              <span className="font-medium">{formatDateTime(template.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">更新时间</span>
              <span className="font-medium">{formatDateTime(template.updatedAt)}</span>
            </div>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">步骤详情</h3>
            {template.steps.map((step: { id: number; name: string; guidance: string }, index: number) => (
              <div
                key={step.id}
                className="border rounded-lg p-3 space-y-1 bg-card"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-6">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-sm">{step.name}</span>
                </div>
                {step.guidance && (
                  <p className="text-sm text-muted-foreground pl-8">
                    {step.guidance}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            删除
          </Button>
          <Button onClick={() => {
            onOpenChange(false)
            onEdit?.()
          }}>
            <Pencil className="size-4" />
            编辑
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}