"use client"

// ========== 导入区域 ==========
import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { transferAssignee } from "@/lib/benchmark"
import { useIsDesktop } from "@/hooks/use-media-query"
import { toast } from "sonner"


// ========== 类型定义 ==========
interface BenchmarkTransferProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  benchmarkId: string | null     // 要转让的对标记录 ID
  currentAssignee: string        // 当前负责人
  currentUser: string            // 当前操作人
  onTransferred?: () => void     // 转让成功后的回调
}


// ========== 组件定义 ==========
export function BenchmarkTransfer({
  open,
  onOpenChange,
  benchmarkId,
  currentAssignee,
  currentUser,
  onTransferred,
}: BenchmarkTransferProps) {
  const isDesktop = useIsDesktop()

  // ----- 表单状态 -----
  const [newAssignee, setNewAssignee] = useState("")   // 新负责人名称
  const [isSubmitting, setIsSubmitting] = useState(false)


  // ----- 确认转让 -----
  async function handleConfirm() {
    if (!benchmarkId) return

    // 1. 验证
    if (!newAssignee.trim()) {
      toast.error("请输入新负责人名称")
      return
    }
    if (newAssignee.trim() === currentAssignee) {
      toast.error("新负责人不能和当前负责人相同")
      return
    }

    // 2. 设置提交中状态
    setIsSubmitting(true)

    try {
      // 3. 调用 API 转让
      await transferAssignee(benchmarkId, newAssignee.trim(), currentUser)

      toast.success(`已转让给 ${newAssignee.trim()}`)

      // 4. 清空输入
      setNewAssignee("")

      // 5. 关闭弹窗
      onOpenChange(false)

      // 6. 通知父组件刷新
      onTransferred?.()

    } catch (error: any) {
      toast.error(error.message || "转让失败")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  // ----- 取消 -----
  function handleCancel() {
    setNewAssignee("")
    onOpenChange(false)
  }


  // ===== 表单内容 =====
  const formContent = (
    <div className="space-y-4 py-2">
      {/* 当前负责人（只读显示） */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">当前负责人</label>
        <div className="px-3 py-2 bg-muted rounded-md text-sm">
          {currentAssignee}
        </div>
      </div>

      {/* 新负责人（输入） */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">新负责人 *</label>
        <Input
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          placeholder="输入新负责人名称"
        />
        <p className="text-xs text-muted-foreground mt-1">
          转让后，你将变为只读权限，不可撤销
        </p>
      </div>
    </div>
  )


  // ===== 底部按钮 =====
  const footerContent = (
    <div className="flex gap-4 justify-end">
      <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
        取消
      </Button>
      <Button onClick={handleConfirm} disabled={isSubmitting}>
        {isSubmitting ? "转让中..." : "确认转让"}
      </Button>
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
              转让负责人
            </span>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="text-[15px] font-semibold text-foreground active:opacity-60 disabled:opacity-30 transition-opacity"
            >
              确认
            </button>
          </div>

          {/* 表单内容 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              转让后原负责人变为只读权限
            </p>
            {formContent}
          </div>

          {/* 底部安全区 */}
          <div className="pb-safe" />
        </SheetContent>
      </Sheet>
    )
  }


  // ============ 桌面端：Dialog ============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>转让负责人</DialogTitle>
          <DialogDescription>转让后原负责人变为只读权限</DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
