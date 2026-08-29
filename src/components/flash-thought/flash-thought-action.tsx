"use client"

// ========== 闪念操作弹窗 ==========
// 归类和转待办共用一个弹窗，通过 type 切换模式
// type: "categorize" → 归类（选题/问答/灵感）
// type: "convert_todo" → 转待办

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { ChevronRight, Check } from "lucide-react"
import type { FlashThought, CategoryTarget } from "@/lib/db"
import {
  categorizeFlashThought,
  convertToTodo,
  categoryTargetConfig,
} from "@/lib/flash-thought"


type ActionType = "categorize" | "convert_todo"


interface FlashThoughtActionProps {
  flash: FlashThought | null
  type: ActionType | null     // 当前操作类型，null 表示不打开
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void      // 操作成功后的回调（刷新列表等）
}


export function FlashThoughtAction({
  flash,
  type,
  onOpenChange,
  onSuccess,
}: FlashThoughtActionProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [target, setTarget] = useState<CategoryTarget>("topic")
  const [thought, setThought] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [targetSheetOpen, setTargetSheetOpen] = useState(false)

  // 打开时重置表单
  function handleOpenChange(open: boolean) {
    if (open) {
      setTarget("topic")
      setThought("")
      setIsSubmitting(false)
    }
    onOpenChange(open)
  }

  // 确认操作
  async function handleConfirm() {
    if (!flash) return

    // 校验：你的想法必填
    if (!thought.trim()) {
      toast.error("请填写你的想法")
      return
    }

    setIsSubmitting(true)
    try {
      if (type === "categorize") {
        await categorizeFlashThought({
          id: flash.id!,
          target,
          thought: thought.trim(),
        })
        const config = categoryTargetConfig[target]
        if (target === "qa" || target === "topic" || target === "inspiration") {
          router.push(`${config.path}?from=flash-thought&flashId=${flash.id}&content=${encodeURIComponent(flash.content)}&thought=${encodeURIComponent(thought.trim())}`)
        } else {
          router.push(`${config.path}?from=flash-thought&content=${encodeURIComponent(flash.content)}`)
        }
      } else if (type === "convert_todo") {
        const result = await convertToTodo({
          id: flash.id!,
          thought: thought.trim(),
        })
        router.push(`/todo?id=${result.todoId}`)
      }

      onOpenChange(false)
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = type === "categorize" ? "归类闪念" : "转待办"
  const open = !!type

  // 没有闪念或类型时不渲染
  if (!flash || !type) return null

  const targetOptions: { value: CategoryTarget; label: string }[] = [
    { value: "topic", label: "选题库" },
    { value: "qa", label: "问答收集" },
    { value: "inspiration", label: "灵感记录" },
  ]

  // ============ 移动端：底部 Sheet ============
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="rounded-t-[18px] max-h-[92vh] flex flex-col p-0" showCloseButton={false}>
            {/* 顶部导航栏 */}
            <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-border/30">
              <button
                onClick={() => onOpenChange(false)}
                className="text-sm font-medium text-muted-foreground active:text-foreground transition-colors"
              >
                取消
              </button>
              <span className="text-sm font-semibold">{title}</span>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="text-sm font-semibold text-foreground active:text-muted-foreground disabled:opacity-50 transition-colors"
              >
                确认
              </button>
            </div>

            {/* 内容 - 可滚动 */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* 闪念内容预览 */}
              <div className="bg-secondary/20 rounded-[18px] p-4">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  闪念内容
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {flash.content}
                </p>
              </div>

              {/* 归类目标 */}
              {type === "categorize" && (
                <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                  <button
                    onClick={() => setTargetSheetOpen(true)}
                    className="w-full h-11 px-4 flex items-center justify-between active:bg-secondary/40 transition-colors"
                  >
                    <span className="text-sm font-medium">归类目标</span>
                    <div className="flex items-center gap-1 text-foreground">
                      <span className="text-sm font-medium">
                        {categoryTargetConfig[target].label}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  </button>
                </div>
              )}

              {/* 你的想法 */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                  你的想法 <span className="text-destructive">*</span>
                </label>
                <div className="bg-secondary/20 rounded-[18px] p-4">
                  <textarea
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    placeholder="记录你处理这条闪念的原因或想法..."
                    rows={4}
                    className="w-full bg-transparent border-0 p-0 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* 归类目标选择 Sheet */}
        <Sheet open={targetSheetOpen} onOpenChange={setTargetSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[18px] p-0" showCloseButton={false}>
            <div className="px-5 py-4 border-b border-border/30">
              <h3 className="text-base font-semibold text-center">选择归类目标</h3>
            </div>
            <div className="px-5 py-2 space-y-1">
              {targetOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTarget(opt.value)
                    setTargetSheetOpen(false)
                  }}
                  className={`w-full flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                    target === opt.value
                      ? "bg-secondary/60"
                      : "active:bg-secondary/40"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  {target === opt.value && (
                    <Check className="size-4 text-foreground" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
            <div className="px-5 pb-6 pt-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setTargetSheetOpen(false)}
              >
                取消
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // ============ 桌面端：Dialog ============
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* 闪念内容预览 */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm whitespace-pre-wrap line-clamp-3">{flash.content}</p>
        </div>

        {/* 归类模式：选择归类目标 */}
        {type === "categorize" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">归类目标</label>
            <Select value={target} onValueChange={(v) => setTarget(v as CategoryTarget)}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string) => categoryTargetConfig[value as CategoryTarget]?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">选题库</SelectItem>
                <SelectItem value="qa">问答收集</SelectItem>
                <SelectItem value="inspiration">灵感记录</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 你的想法（必填） */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            你的想法 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="记录你处理这条闪念的原因或想法..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>

        {/* 底部按钮 */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "处理中..." : "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
