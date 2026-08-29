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
// 多行文本输入
import { Textarea } from "@/components/ui/textarea"
// 下拉选择
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
// 自动保存 hook
import { useAutoSave } from "@/hooks/use-auto-save"
// API 函数和配置
import { createQuestion } from "@/lib/qa-collect"
// 类型
import type { QaSource } from "@/lib/db"
// toast 提示
import { toast } from "sonner"


// ========== 类型定义 ==========
interface QaFormProps {
  open: boolean                                     // 弹窗是否打开
  onOpenChange: (open: boolean) => void              // 控制弹窗开关
  prefillContent?: string                            // 从闪念池联动预填的问题内容
  prefillAnswer?: string                             // 从闪念池联动预填的答案（归类的想法）
  onCreated?: (id: string) => void                   // 创建成功回调，传回新问答 ID
}


// ========== 组件定义 ==========
export function QaForm({ open, onOpenChange, prefillContent, prefillAnswer, onCreated }: QaFormProps) {

  // ----- 表单字段状态 -----
  const [content, setContent] = useState("")         // 问题内容
  const [source, setSource] = useState<QaSource>("comment")  // 问题来源，默认"评论区"
  const [isSubmitting, setIsSubmitting] = useState(false)     // 提交中状态

  // ----- 是否是联动预填模式 -----
  const isPrefill = !!prefillContent

  // ----- 自动保存（仅普通新建模式，联动模式不自动保存） -----
  const { loadDraft, clearDraft } = useAutoSave(
    "qa-form-draft",
    { content, source },
    open && !isPrefill
  )


  // ----- 弹窗打开时初始化 -----
  useEffect(() => {
    if (!open) return

    if (isPrefill && prefillContent) {
      // 联动模式：闪念内容 → 问题内容，来源固定为"闪念来源"（只读）
      setContent(prefillContent)
      setSource("flash")
    } else {
      // 普通新建模式：尝试恢复草稿
      const draft = loadDraft()
      if (draft) {
        setContent(draft.content || "")
        setSource(draft.source || "comment")
        if (draft.content) {
          toast.info("已恢复上次未完成的草稿")
        }
      } else {
        setContent("")
        setSource("comment")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillContent])


  // ----- 提交表单 -----
  async function handleSubmit() {
    if (!content.trim()) {
      toast.error("请输入问题内容")
      return
    }

    setIsSubmitting(true)
    try {
      // 联动模式：把归类的想法作为初始答案一起创建
      const id = await createQuestion(content, source, prefillAnswer)
      clearDraft()
      onCreated?.(id)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  // ----- 取消 -----
  function handleCancel() {
    onOpenChange(false)
    if (!isPrefill) {
      toast.info("草稿已自动保存，下次打开可恢复")
    }
  }


  // ===== 渲染 =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>

        {/* 头部 */}
        <DialogHeader>
          <DialogTitle>新建问答</DialogTitle>
          <DialogDescription>
            创建后问题和来源不可修改，答案在详情中填写
          </DialogDescription>
        </DialogHeader>

        {/* 表单内容 */}
        <div className="space-y-4 py-2">

          {/* 问题内容 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              问题内容 <span className="text-destructive">*</span>
              <span className="text-muted-foreground text-xs ml-2">
                这是一条什么样的问题呢？
              </span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="如：职场妈妈如何高效管理碎片时间？"
              rows={3}
            />
          </div>

          {/* 问题来源 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              问题来源
            </label>
            {isPrefill ? (
              // 联动模式：来源只读，显示"闪念来源"
              <Select value="flash" disabled>
                <SelectTrigger className="bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flash">闪念来源</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              // 普通模式：可选
              <Select
                value={source}
                onValueChange={(v) => setSource(v as QaSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">评论区</SelectItem>
                  <SelectItem value="self-qa">自问自答</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 联动模式：显示预填的答案（只读提示） */}
          {isPrefill && prefillAnswer && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                初始答案（来自归类的想法）
              </label>
              <Textarea
                value={prefillAnswer}
                readOnly
                className="bg-muted"
                rows={2}
              />
            </div>
          )}

        </div>

        {/* 底部按钮 */}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "创建中..." : "创建问答"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
