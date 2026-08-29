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
import { createTrackingFromPublish, getPendingPublishRecords } from "@/lib/tracking"
import type { PublishRecord } from "@/lib/db"
import { toast } from "sonner"
import { Check, BarChart3 } from "lucide-react"


// ========== 类型定义 ==========
interface TrackingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ids: string[]) => void
}


// ========== 组件定义 ==========
export function TrackingForm({ open, onOpenChange, onCreated }: TrackingFormProps) {
  const [pendingRecords, setPendingRecords] = useState<PublishRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // 打开时加载待追踪的发布记录
  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setSelectedId(null)
    getPendingPublishRecords()
      .then(list => setPendingRecords(list))
      .catch(err => console.error("加载失败:", err))
      .finally(() => setIsLoading(false))
  }, [open])

  function handleClose() {
    setSelectedId(null)
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (!selectedId) return
    setIsCreating(true)
    try {
      const ids = await createTrackingFromPublish(selectedId)
      handleClose()
      onCreated?.(ids)
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // 格式化时间
  function formatDate(timestamp: number | null): string {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>从发布记录创建追踪</DialogTitle>
          <DialogDescription>
            选择一条已发布的记录，自动创建 4 个固定节点（24h/3天/7天/30天），后续可追加长尾节点
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
          ) : pendingRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                没有待追踪的发布记录
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                请先在制作发布中标记为已发布
              </p>
            </div>
          ) : (
            pendingRecords.map(record => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedId(record.id!)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedId === record.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium line-clamp-1">
                    {record.title}
                  </span>
                  {selectedId === record.id && (
                    <Check className="size-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    已发布
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(record.publishTime)}
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
            disabled={!selectedId || isCreating || pendingRecords.length === 0}
          >
            {isCreating ? "创建中..." : (
              <>
                <Check className="size-4" />
                创建追踪记录
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}