"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
// Dialog 弹窗组件
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
// 按钮
import { Button } from "@/components/ui/button"
// 输入框
import { Input } from "@/components/ui/input"
// 多行文本输入
import { Textarea } from "@/components/ui/textarea"
// 自动保存 hook
import { useAutoSave } from "@/hooks/use-auto-save"
// API 函数
import { createInspiration, updateInspiration } from "@/lib/inspiration"
// 类型
import type { Inspiration } from "@/lib/db"
// toast 提示
import { toast } from "sonner"


// ========== 类型定义 ==========
interface InspirationFormProps {
  open: boolean                          // 弹窗是否打开
  onOpenChange: (open: boolean) => void   // 控制弹窗开关
  inspiration?: Inspiration | null        // 传了 = 编辑模式，没传 = 新建模式
  prefillContent?: string                 // 从闪念池/对标联动预填的灵感内容
  prefillThought?: string                 // 预填的思考过程
  prefillConclusion?: string              // 预填的结论
  onSaved?: () => void                    // 保存成功回调
  onCreated?: (id: number) => void        // 新建成功回调，传回新灵感 ID
}


// ========== 组件定义 ==========
export function InspirationForm({
  open,
  onOpenChange,
  inspiration,
  prefillContent,
  prefillThought,
  prefillConclusion,
  onSaved,
  onCreated,
}: InspirationFormProps) {

  // ----- 表单字段状态 -----
  const [content, setContent] = useState("")           // 灵感内容
  const [thoughtProcess, setThoughtProcess] = useState("")  // 思考过程
  const [conclusion, setConclusion] = useState("")     // 结论
  const [isSubmitting, setIsSubmitting] = useState(false)  // 提交中状态

  // ----- 模式判断 -----
  const isEditing = !!inspiration          // 编辑模式
  const isPrefill = !!(prefillContent && !isEditing)  // 联动预填模式（有预填内容且不是编辑）

  // ----- 自动保存 -----
  // 只有纯新建模式（非编辑、非预填）才自动保存草稿
  // 编辑模式直接操作数据库，不需要草稿
  // 预填模式是联动过来的，也不需要草稿
  const { loadDraft, clearDraft } = useAutoSave(
    "inspiration-form-draft",
    { content, thoughtProcess, conclusion },
    open && !isEditing && !isPrefill
  )


  // ----- 弹窗打开时初始化 -----
  useEffect(() => {
    if (!open) return

    if (isEditing && inspiration) {
      // 编辑模式：用已有数据填充
      setContent(inspiration.content)
      setThoughtProcess(inspiration.thoughtProcess || "")
      setConclusion(inspiration.conclusion || "")
    } else if (isPrefill) {
      // 预填模式：用联动传入的数据填充
      setContent(prefillContent || "")
      setThoughtProcess(prefillThought || "")
      setConclusion(prefillConclusion || "")
    } else {
      // 纯新建模式：尝试恢复草稿
      const draft = loadDraft()
      if (draft) {
        setContent(draft.content || "")
        setThoughtProcess(draft.thoughtProcess || "")
        setConclusion(draft.conclusion || "")
        if (draft.content) {
          toast.info("已恢复上次未完成的草稿")
        }
      } else {
        // 没有草稿，清空表单
        setContent("")
        setThoughtProcess("")
        setConclusion("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inspiration?.id, prefillContent, prefillThought, prefillConclusion])


  // ----- 提交表单 -----
  async function handleSubmit() {
    // 校验：灵感内容不能为空
    if (!content.trim()) {
      toast.error("请输入灵感内容")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && inspiration?.id) {
        // 编辑模式：更新
        await updateInspiration(inspiration.id, {
          content,
          thoughtProcess,
          conclusion,
        })
      } else {
        // 新建模式
        const id = await createInspiration({
          content,
          thoughtProcess,
          conclusion,
        })
        clearDraft()
        onCreated?.(id)
      }

      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  // ----- 取消 -----
  function handleCancel() {
    onOpenChange(false)
    // 只有纯新建模式才提示"草稿已自动保存"
    if (!isEditing && !isPrefill) {
      toast.info("草稿已自动保存，下次打开可恢复")
    }
  }


  // ===== 渲染 =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h-[90vh] → 最大高度 90% 视口，内容多时可滚动 */}
      {/* flex flex-col → 弹性布局，头部和底部固定，中间可滚动 */}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" initialFocus={false}>

        {/* ===== 头部（固定） ===== */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "编辑灵感" : "新建灵感"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改灵感内容，保存后更新" : "记录你的灵感，逐步完善思考和结论"}
          </DialogDescription>
        </DialogHeader>

        {/* ===== 内容区域（可滚动） ===== */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-4">

          {/* 灵感内容 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              你的灵感是什么？ <span className="text-destructive">*</span>
            </label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="用一句话概括你的灵感"
            />
          </div>

          {/* 思考过程 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              你的思考过程是什么？
            </label>
            <Textarea
              value={thoughtProcess}
              onChange={(e) => setThoughtProcess(e.target.value)}
              placeholder="记录你是怎么一步步想到的..."
              rows={5}
            />
          </div>

          {/* 结论 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              最终得出来什么结论？
              <span className="text-muted-foreground text-xs ml-2">
                填了结论会自动变为"已完成"状态
              </span>
            </label>
            <Textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="一句话总结，这个灵感最终产出了什么结论？"
              rows={3}
            />
          </div>

        </div>

        {/* ===== 底部按钮（固定） ===== */}
        <DialogFooter className="flex-shrink-0">
          <div className="flex gap-4 justify-end w-full">
            <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : (isEditing ? "保存修改" : "创建灵感")}
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}