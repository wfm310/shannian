"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { createPublishRecord, getPendingProductions } from "@/lib/publish"
import { stageLabels, modeLabels } from "@/lib/produce-flow"
import type { ProductionTask } from "@/lib/db"
import { toast } from "sonner"
import { Check, UploadCloud } from "lucide-react"


// ========== 类型定义 ==========
interface PublishFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (id: string) => void
}


// ========== 组件定义 ==========
export function PublishForm({ open, onOpenChange, onCreated }: PublishFormProps) {
  const [pendingTasks, setPendingTasks] = useState<ProductionTask[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // 打开时加载待发布的生产任务
  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setSelectedId(null)
    getPendingProductions()
      .then(list => setPendingTasks(list))
      .catch(err => console.error("加载失败:", err))
      .finally(() => setIsLoading(false))
  }, [open])

  // 关闭时重置
  function handleClose() {
    setSelectedId(null)
    onOpenChange(false)
  }

  // 提交创建
  async function handleSubmit() {
    if (!selectedId) return
    setIsCreating(true)
    try {
      const id = await createPublishRecord(selectedId)
      handleClose()
      onCreated?.(id)
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>从生产任务创建发布记录</DialogTitle>
          <DialogDescription>
            选择一条已完成的生产任务，自动预填文案内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            // 加载中
            [1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
          ) : pendingTasks.length === 0 ? (
            // 空数据
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UploadCloud className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                没有待发布的生产任务
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                请先在内容生产流程完成「发布移交」
              </p>
            </div>
          ) : (
            // 待发布任务列表
            pendingTasks.map(task => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedId(task.id!)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedId === task.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium line-clamp-1">
                    {task.title}
                  </span>
                  {selectedId === task.id && (
                    <Check className="size-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {modeLabels[task.mode]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {stageLabels[task.currentStage]}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || isCreating || pendingTasks.length === 0}
          >
            {isCreating ? "创建中..." : (
              <>
                <Check className="size-4" />
                创建发布记录
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}