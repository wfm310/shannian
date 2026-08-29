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
// 图标
import { ExternalLink, Pencil } from "lucide-react"
// 类型
import type { Inspiration } from "@/lib/db"
// API 函数和配置
import { inspirationStatusConfig, inspirationSourceConfig } from "@/lib/inspiration"
// 编辑表单组件
import { InspirationForm } from "./inspiration-form"


// ========== 类型定义 ==========
interface InspirationDetailProps {
  inspiration: Inspiration | null   // 灵感数据，null 时不渲染
  open: boolean                      // 弹窗是否打开
  onOpenChange: (open: boolean) => void  // 控制弹窗开关
  onEdited?: () => void              // 编辑保存后的回调（刷新数据）
}


// ========== 组件定义 ==========
export function InspirationDetail({
  inspiration,
  open,
  onOpenChange,
  onEdited,
}: InspirationDetailProps) {
  const router = useRouter()

  // ----- 编辑模式状态 -----
  // true = 显示编辑表单，false = 显示只读详情
  const [isEditing, setIsEditing] = useState(false)


  // ----- 弹窗打开时重置编辑模式 -----
  useEffect(() => {
    if (open) {
      setIsEditing(false)
    }
  }, [open])


  // 如果没有数据，不渲染
  if (!inspiration) return null

  // 保存到局部变量，TypeScript 才能确定它非空
  const data = inspiration
  const statusInfo = inspirationStatusConfig[data.status]
  const sourceInfo = inspirationSourceConfig[data.source]


  // ----- 格式化完整时间 -----
  function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    const d = date.getDate().toString().padStart(2, "0")
    const h = date.getHours().toString().padStart(2, "0")
    const min = date.getMinutes().toString().padStart(2, "0")
    return `${y}-${m}-${d} ${h}:${min}`
  }


  // ----- 转选题 -----
  // 跳转到选题库，预填：标题=灵感内容，备注=思考过程+结论
  function handleConvertToTopic() {
    if (!data.id) return
    router.push(`/topic-library?from=inspiration&sourceId=${data.id}`)
    onOpenChange(false)
  }


  // ----- 查看已转的选题 -----
  function handleViewTopic() {
    if (data.topicId) {
      router.push(`/topic-library?openId=${data.topicId}`)
      onOpenChange(false)
    }
  }


  // ----- 编辑保存成功 -----
  function handleEditSaved() {
    setIsEditing(false)
    onEdited?.()
  }


  // ===== 渲染 =====
  // 编辑模式：渲染 InspirationForm
  if (isEditing) {
    return (
      <InspirationForm
        open={open}
        onOpenChange={(o) => {
          if (!o) setIsEditing(false)
          onOpenChange(o)
        }}
        inspiration={data}
        onSaved={handleEditSaved}
      />
    )
  }

  // 只读模式：渲染详情
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5">

          {/* 灵感内容 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              你的灵感是什么？
            </label>
            <div className="text-sm">
              {data.content}
            </div>
          </div>

          {/* 思考过程 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              你的思考过程是什么？
            </label>
            {data.thoughtProcess ? (
              <div className="text-sm whitespace-pre-wrap">
                {data.thoughtProcess}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                还没有记录思考过程
              </div>
            )}
          </div>

          {/* 结论 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">
              最终得出来什么结论？
            </label>
            {data.conclusion ? (
              <div className="text-sm whitespace-pre-wrap">
                {data.conclusion}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                还没有得出结论
              </div>
            )}
          </div>

          {/* 信息列表 */}
          <div className="space-y-2 pt-3 border-t text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建人</span>
              <span>{data.creator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间</span>
              <span>{formatDateTime(data.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">更新时间</span>
              <span>{formatDateTime(data.updatedAt)}</span>
            </div>
          </div>

        </div>

        {/* ===== 底部按钮（固定） ===== */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            <Pencil className="size-4 mr-1" />
            编辑
          </Button>

          {/* 已转选题 → 查看选题按钮 */}
          {/* 未转选题 → 转选题按钮 */}
          {data.topicId ? (
            <Button onClick={handleViewTopic}>
              <ExternalLink className="size-4 mr-1" />
              查看选题
            </Button>
          ) : (
            <Button onClick={handleConvertToTopic}>
              转选题
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}