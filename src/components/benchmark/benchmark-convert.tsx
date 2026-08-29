"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { convertBenchmark, updateBenchmark } from "@/lib/benchmark"
import type { Benchmark } from "@/lib/db"
import { useIsDesktop } from "@/hooks/use-media-query"
import { toast } from "sonner"


// ========== 类型定义 ==========
interface BenchmarkConvertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  benchmark: Benchmark | null     // 要转化的对标记录
  onConverted?: () => void        // 转化成功后的回调
}


// ========== 组件定义 ==========
export function BenchmarkConvert({
  open,
  onOpenChange,
  benchmark,
  onConverted,
}: BenchmarkConvertProps) {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  // ----- 表单状态 -----
  const [topicTitle, setTopicTitle] = useState("")      // 最终凝练选题
  const [topicCopy, setTopicCopy] = useState("")        // 凝练出的文案
  const [topicChecked, setTopicChecked] = useState(true)    // 选题库（默认勾选）
  const [inspirationChecked, setInspirationChecked] = useState(false)  // 灵感记录
  const [isSubmitting, setIsSubmitting] = useState(false)


  // ----- 打开时回填已有内容 -----
  useEffect(() => {
    if (open && benchmark) {
      setTopicTitle(benchmark.topicTitle || "")
      setTopicCopy(benchmark.topicCopy || "")
    }
  }, [open, benchmark?.id])


  // ----- 确认转化 -----
  async function handleConfirm() {
    if (!benchmark?.id) return

    // 1. 验证：凝练选题必填
    if (!topicTitle.trim()) {
      toast.error("请填写最终凝练选题")
      return
    }

    // 2. 验证：凝练文案必填
    if (!topicCopy.trim()) {
      toast.error("请填写凝练出的文案")
      return
    }

    // 3. 验证至少勾选一个转化目标
    if (!topicChecked && !inspirationChecked) {
      toast.error("请至少选择一个转化目标")
      return
    }

    // 4. 收集目标列表
    const targets: string[] = []
    if (topicChecked) targets.push("topic")
    if (inspirationChecked) targets.push("inspiration")

    // 5. 设置提交中
    setIsSubmitting(true)

    try {
      // 6. 先把凝练选题和文案写回对标记录
      await updateBenchmark(benchmark.id, {
        topicTitle: topicTitle.trim(),
        topicCopy: topicCopy.trim(),
      })

      // 7. 调用转化 API（更新状态为已转化）
      await convertBenchmark(benchmark.id, targets)

      toast.success("转化成功！")

      // 8. 重置状态
      setTopicTitle("")
      setTopicCopy("")
      setTopicChecked(true)
      setInspirationChecked(false)

      // 9. 关闭弹窗
      onOpenChange(false)

      // 10. 通知父组件刷新
      onConverted?.()

      // 11. 跳转
      if (topicChecked) {
        router.push(`/topic-library?from=benchmark&sourceId=${benchmark.id}`)
      } else if (inspirationChecked) {
        router.push(`/inspiration?from=benchmark&sourceId=${benchmark.id}`)
      }

    } catch (error) {
      toast.error("转化失败")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  // ----- 取消 -----
  function handleCancel() {
    setTopicTitle("")
    setTopicCopy("")
    setTopicChecked(true)
    setInspirationChecked(false)
    onOpenChange(false)
  }


  // 如果没有 benchmark 数据，不渲染
  if (!benchmark) return null


  // ===== 表单内容 =====
  const formContent = (
    <div className="space-y-4 py-2">
      {/* 最终凝练选题 */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          最终凝练选题 <span className="text-destructive">*</span>
          <span className="text-muted-foreground text-xs ml-2">一句话选题，你感觉这条选题你会怎么讲？</span>
        </label>
        <Input
          value={topicTitle}
          onChange={(e) => setTopicTitle(e.target.value)}
          placeholder="如：3个方法帮职场妈妈找回时间掌控感"
          disabled={isSubmitting}
        />
      </div>

      {/* 凝练出的文案 */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          凝练出的文案 <span className="text-destructive">*</span>
          <span className="text-muted-foreground text-xs ml-2">理解选题的一句话</span>
        </label>
        <Textarea
          value={topicCopy}
          onChange={(e) => setTopicCopy(e.target.value)}
          placeholder="如：时间不够不是你的错，是方法没对，3个实操方法帮你找回掌控感"
          rows={3}
          disabled={isSubmitting}
        />
      </div>
    </div>
  )


  // ===== 转化目标选择 =====
  const targetSelector = (
    <div className="space-y-2 pt-2 border-t">
      <p className="text-sm font-medium">转化目标</p>

      {/* 选题库选项 */}
      <div className="flex items-start space-x-3 p-3 border rounded-lg">
        <Checkbox
          id="topic"
          checked={topicChecked}
          onCheckedChange={(checked) => setTopicChecked(checked as boolean)}
          disabled={isSubmitting}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="topic"
            className="text-sm font-medium cursor-pointer"
          >
            选题库
          </label>
          <p className="text-xs text-muted-foreground">
            将凝练选题作为新选题的标题，自动同步相同字段
          </p>
        </div>
      </div>

      {/* 灵感记录选项 */}
      <div className="flex items-start space-x-3 p-3 border rounded-lg">
        <Checkbox
          id="inspiration"
          checked={inspirationChecked}
          onCheckedChange={(checked) => setInspirationChecked(checked as boolean)}
          disabled={isSubmitting}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="inspiration"
            className="text-sm font-medium cursor-pointer"
          >
            灵感记录
          </label>
          <p className="text-xs text-muted-foreground">
            将差异化机会 + 凝练文案作为灵感内容
          </p>
        </div>
      </div>
    </div>
  )


  // ============ 移动端：Sheet side=bottom ============
  if (!isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-[18px] max-h-[90vh] flex flex-col p-0"
          showCloseButton={false}
          initialFocus={false}
        >
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-between px-5 h-11 flex-shrink-0 border-b border-border/30">
            <button
              onClick={handleCancel}
              className="text-[15px] font-normal text-muted-foreground active:text-foreground active:opacity-60 transition-colors"
            >
              取消
            </button>
            <span className="text-[15px] font-semibold text-foreground">
              转化对标
            </span>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="text-[15px] font-semibold text-foreground active:opacity-60 disabled:opacity-30 transition-opacity"
            >
              提交
            </button>
          </div>

          {/* 表单内容 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              填写凝练选题和文案，选择转化目标后提交
            </p>
            {formContent}
            {targetSelector}
            <p className="text-xs text-muted-foreground">
              注意：转化为终态操作，确认后不可撤销
            </p>
          </div>

          {/* 底部安全区 */}
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </SheetContent>
      </Sheet>
    )
  }


  // ============ 桌面端：Dialog ============
  const desktopFormContent = (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        填写凝练选题和文案，选择转化目标后提交
      </p>
      {formContent}
      {targetSelector}
      <p className="text-xs text-muted-foreground">
        注意：转化为终态操作，确认后不可撤销
      </p>
    </div>
  )

  const footerContent = (
    <div className="flex gap-4 justify-end">
      <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
        取消
      </Button>
      <Button onClick={handleConfirm} disabled={isSubmitting}>
        {isSubmitting ? "转化中..." : "提交转化"}
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>转化对标</DialogTitle>
          <DialogDescription>填写凝练选题和文案，转化为选题或灵感记录</DialogDescription>
        </DialogHeader>
        {desktopFormContent}
        <DialogFooter>
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
