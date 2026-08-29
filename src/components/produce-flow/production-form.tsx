"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import { createProductionTask } from "@/lib/produce-flow"
import { getTopics } from "@/lib/topic"
import type { Topic, ProductionMode } from "@/lib/db"
import { toast } from "sonner"
import { Check } from "lucide-react"

interface ProductionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function ProductionForm({ open, onOpenChange, onCreated }: ProductionFormProps) {
  const [mode, setMode] = useState<ProductionMode>("standard")
  const [topicId, setTopicId] = useState<number | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])

  const draftData = { mode, topicId }
  const { loadDraft, clearDraft } = useAutoSave(
    "production-form-draft",
    draftData,
    open
  )

  useEffect(() => {
    if (open) {
      getTopics("urgent").then(list => {
        setTopics(list.filter(t => t.status === "pending_production"))
      })
      const draft = loadDraft()
      if (draft) {
        setMode(draft.mode)
        setTopicId(draft.topicId)
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    setMode("standard")
    setTopicId(null)
    clearDraft()
    onOpenChange(false)
  }

  async function handleSubmit() {
    try {
      await createProductionTask(mode, topicId || undefined)
      handleClose()
      onCreated?.()
    } catch {
      // 错误已在 API 层处理
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>新建生产任务</DialogTitle>
          <DialogDescription>
            选择创作模式，开始内容生产
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>创作模式</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("standard")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors ${
                  mode === "standard"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="font-medium">标准模式</span>
                <span className="text-xs text-muted-foreground">
                  选题库取题 → 选框架 → 按步骤写文案
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("impromptu")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors ${
                  mode === "impromptu"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="font-medium">即兴模式</span>
                <span className="text-xs text-muted-foreground">
                  先自由写文案 → 补选题 → 选框架
                </span>
              </button>
            </div>
          </div>

          {mode === "standard" && (
            <div className="space-y-2">
              <Label>关联选题（仅显示"立即做"状态）</Label>
              <Select
                value={topicId ? String(topicId) : ""}
                onValueChange={(v) => setTopicId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一条选题" />
                </SelectTrigger>
                <SelectContent className="min-w-[300px]">
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={String(topic.id)}>
                      {topic.topicTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {topics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  没有"立即做"状态的选题，请先在选题库创建
                </p>
              )}
            </div>
          )}

          {mode === "impromptu" && (
            <div className="rounded-lg border border-dashed p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">即兴模式</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                创建后直接进入脚本撰写阶段，先自由写文案。
                选题和框架标记为"待补填"，进入素材制作前必须补完。
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={mode === "standard" && !topicId}
          >
            <Check className="size-4" />
            创建任务
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
