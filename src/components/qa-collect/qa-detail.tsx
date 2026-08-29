"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// Dialog 弹窗
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
// Badge 标签
import { Badge } from "@/components/ui/badge"
// 按钮
import { Button } from "@/components/ui/button"
// 多行文本输入
import { Textarea } from "@/components/ui/textarea"
// Card 卡片
import { Card } from "@/components/ui/card"
// 图标
import { ExternalLink } from "lucide-react"
// 类型
import type { QaQuestion } from "@/lib/db"
// API 函数和配置
import { qaStatusConfig, qaSourceConfig, addAnswer } from "@/lib/qa-collect"
// toast 提示
import { toast } from "sonner"


// ========== 类型定义 ==========
interface QaDetailProps {
  question: QaQuestion | null              // 问答数据，null 时不渲染
  open: boolean                            // 弹窗是否打开
  onOpenChange: (open: boolean) => void     // 控制弹窗开关
  onAnswerAdded?: () => void                // 添加答案后的回调（刷新数据）
}


// ========== 组件定义 ==========
export function QaDetail({ question, open, onOpenChange, onAnswerAdded }: QaDetailProps) {
  const router = useRouter()

  // ----- 状态 -----
  const [newAnswer, setNewAnswer] = useState("")    // 新答案输入内容
  const [isAdding, setIsAdding] = useState(false)   // 添加中状态


  // ----- 弹窗打开时重置输入框 -----
  useEffect(() => {
    if (open) {
      setNewAnswer("")
      setIsAdding(false)
    }
  }, [open])


  // 如果没有数据，不渲染
  if (!question) return null

  // 保存到局部变量，TypeScript 才能确定它非空
  const data = question
  const statusInfo = qaStatusConfig[data.status]
  const sourceInfo = qaSourceConfig[data.source]


  // ----- 格式化完整时间 -----
  // 把时间戳转成 "2026-08-24 14:30" 格式
  function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    const d = date.getDate().toString().padStart(2, "0")
    const h = date.getHours().toString().padStart(2, "0")
    const min = date.getMinutes().toString().padStart(2, "0")
    return `${y}-${m}-${d} ${h}:${min}`
  }


  // ----- 添加答案 -----
  async function handleAddAnswer() {
    if (!data.id) return

    // 校验
    if (!newAnswer.trim()) {
      toast.error("请输入答案内容")
      return
    }

    setIsAdding(true)
    try {
      // 调用 API 添加答案
      await addAnswer(data.id, newAnswer)
      // 清空输入框
      setNewAnswer("")
      // 触发回调（刷新详情和列表）
      onAnswerAdded?.()
    } catch (error) {
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }


  // ----- 用某条答案转选题 -----
  // 跳转到选题库，预填：标题=问题内容，备注=答案内容
  function handleConvertToTopic(answerId: string) {
    if (!data.id) return
    // 跳转参数：from=qa 表示从问答收集来，sourceId=问题ID，answerId=答案ID
    router.push(`/topic-library?from=qa&sourceId=${data.id}&answerId=${answerId}`)
    // 关闭详情弹窗
    onOpenChange(false)
  }


  // ----- 查看已转的选题 -----
  // 跳转到选题库，自动打开对应选题的详情
  function handleViewTopic(topicId: string) {
    router.push(`/topic-library?openId=${topicId}`)
    onOpenChange(false)
  }


  // ===== 渲染 =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h-[90vh] → 最大高度 90% 视口，内容多时可滚动 */}
      {/* flex flex-col → 弹性布局，头部和底部固定，中间可滚动 */}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" initialFocus={false}>

        {/* ===== 头部（固定） ===== */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sourceInfo.label}
            </Badge>
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>

        {/* ===== 内容区域（可滚动） ===== */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-6">

          {/* ----- 问题内容（只读） ----- */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              问题内容
            </label>
            {/* 用 Card 展示，灰底表示只读 */}
            <Card className="p-3 bg-muted/30">
              {/* whitespace-pre-wrap → 保留换行 */}
              <p className="text-sm whitespace-pre-wrap">{data.content}</p>
            </Card>
            {/* 创建人 + 创建时间 */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>创建人：{data.creator}</span>
              <span>{formatDateTime(data.createdAt)}</span>
            </div>
          </div>

          {/* ----- 答案列表 ----- */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-muted-foreground">
              答案（{data.answers?.length || 0}）
            </label>

            {/* 没有答案时的提示 */}
            {(data.answers?.length || 0) === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                还没有答案，在下方添加第一条答案
              </div>
            ) : (
              /* 有答案时，逐条展示 */
              <div className="space-y-3">
                {data.answers.map((answer, index) => (
                  <Card key={answer.id} className="p-3 space-y-2">

                    {/* 答案内容 + 状态标记 */}
                    <div className="flex items-start justify-between gap-2">
                      {/* 答案内容（只读） */}
                      <p className="text-sm whitespace-pre-wrap flex-1">
                        {answer.content}
                      </p>
                      {/* 已转选题标记 或 序号 */}
                      {answer.topicId ? (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          已转选题
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          #{index + 1}
                        </Badge>
                      )}
                    </div>

                    {/* 底部：创建人 + 时间 + 操作按钮 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{answer.creator}</span>
                        <span>{formatDateTime(answer.createdAt)}</span>
                      </div>

                      {/* 已转选题 → 显示"查看选题"按钮 */}
                      {/* 未转选题 → 显示"用此答案转选题"按钮 */}
                      {answer.topicId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewTopic(answer.topicId!)}
                        >
                          <ExternalLink className="size-3 mr-1" />
                          查看选题
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertToTopic(answer.id)}
                        >
                          用此答案转选题
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ----- 添加答案 ----- */}
          {/* 分隔线 + 添加区域 */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-semibold text-muted-foreground">
              添加答案
            </label>
            <Textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="输入答案内容，点击按钮添加..."
              rows={3}
            />
            {/* 添加按钮（右对齐） */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddAnswer}
                disabled={isAdding || !newAnswer.trim()}
              >
                {isAdding ? "添加中..." : "添加答案"}
              </Button>
            </div>
          </div>

        </div>

        {/* ===== 底部按钮（固定） ===== */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}