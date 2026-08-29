"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { db, type Todo, type Priority } from "@/lib/db"
import { getCurrentPriority } from "@/lib/priority"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { Clock, Check, Link2, Pencil } from "lucide-react"
import { subscribeProgressChanges } from "@/lib/progress-events"

// ========== 类型定义 ==========
interface TodoDetailProps {
  todo: Todo | null         // 要查看的任务（null = 不显示）
  open: boolean             // 弹窗是否打开
  onOpenChange: (open: boolean) => void  // 关闭弹窗的回调
  currentUser: string       // 当前登录用户（用于判断是否是负责人）
  onUpdated?: () => void    // 数据更新后的回调（刷新列表）
}


// ========== 配置 ==========
const priorityConfig: Record<Priority, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  P0: { label: "P0 今天必须干完", variant: "destructive" },
  P1: { label: "P1 今天应该干完", variant: "default" },
  P2: { label: "P2 本周内完成", variant: "secondary" },
  P3: { label: "P3 有空再做", variant: "outline" },
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "pending": { label: "待处理", variant: "outline" },
  "in-progress": { label: "进行中", variant: "default" },
  "done": { label: "已完成", variant: "secondary" },
}

const sourceConfig: Record<string, string> = {
  "manual": "手动创建",
  "production": "内容生产流程",
  "topic": "选题库",
  "review": "复盘",
  "tracking": "数据追踪",
  "flash-thought": "闪念池转入",
}

const moduleConfig: Record<string, string> = {
  "benchmark": "对标拆解",
  "topic": "选题库",
  "publish": "制作发布",
}


// ========== 组件定义 ==========
export function TodoDetail({ todo, open, onOpenChange, currentUser, onUpdated }: TodoDetailProps) {
  const isMobile = useIsMobile()

  // 本地副本：用于显示最新的 todo 数据（事件刷新后更新）
  const [localTodo, setLocalTodo] = useState<Todo | null>(todo)

  // 同步 props 变化
  useEffect(() => {
    setLocalTodo(todo)
  }, [todo])

  // 订阅进度变化事件：对标状态变化时重新加载当前 todo 的最新数据
  useEffect(() => {
    if (!todo?.id) return

    const unsubscribe = subscribeProgressChanges(async () => {
      const updated = await db.todos.get(todo.id!)
      if (updated) {
        setLocalTodo(updated)
        onUpdated?.()
      }
    })

    return unsubscribe
  }, [todo?.id, onUpdated])

  // 如果没有 todo 数据，不渲染
  if (!localTodo) return null

  const data = localTodo

  // 计算当前优先级（实时计算，不存储）
  const priority = data.initialPriority || (data as any).priority || "P2"
  const currentPriority = getCurrentPriority(
    priority,
    data.createdAt,
    data.dueDate
  )

  // 判断当前用户是否是负责人
  const isAssignee = currentUser === data.assignee

  // 格式化时间戳为可读日期
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 格式化日期+时间
  const formatDateTime = (timestamp: number | null) => {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, "0")
    const m = date.getMinutes().toString().padStart(2, "0")
    return `${formatDate(timestamp)} ${h}:${m}`
  }

  // ----- 接受任务 -----
  async function handleAccept() {
    if (!data?.id) return
    await db.todos.update(data.id, {
      status: "in-progress",
    })
    toast.success("已接受任务")
    onOpenChange(false)
  }

  // ----- 标记完成 -----
  async function handleComplete() {
    if (!data?.id) return
    await db.todos.update(data.id, {
      status: "done",
      completedAt: Date.now(),
    })
    toast.success("任务已完成，将在当天 23:59 自动归档")
    onOpenChange(false)
  }


  // ----- 详情内容（JSX 结构） -----
  const detailContent = (
    <div className="space-y-6">
      {/* ===== 标题区域 ===== */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{data.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={priorityConfig[currentPriority].variant}>
            {priorityConfig[currentPriority].label}
          </Badge>
          <Badge variant={statusConfig[data.status].variant}>
            {statusConfig[data.status].label}
          </Badge>
          {currentPriority !== priority && (
            <span className="text-xs text-muted-foreground">
              初始：{priority}
            </span>
          )}
        </div>
      </div>

      {/* ===== 任务详细介绍 ===== */}
      <div>
        <h3 className="text-sm font-medium mb-1.5">任务详细介绍</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {data.description}
        </p>
      </div>

      {/* ===== 字段信息 ===== */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">任务信息</h3>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">负责人</span>
          <span className="font-medium">{data.assignee}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">创建人</span>
          <span className="font-medium">{data.creator}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">任务来源</span>
          <span className="font-medium">{sourceConfig[data.source] || data.source}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">截止日期</span>
          <span className="font-medium flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDate(data.dueDate)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">创建时间</span>
          <span className="font-medium">{formatDateTime(data.createdAt)}</span>
        </div>

        {data.completedAt && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">完成时间</span>
            <span className="font-medium">{formatDateTime(data.completedAt)}</span>
          </div>
        )}
      </div>

      {/* ===== 关联模块与进度 ===== */}
      {(data.linkedModules || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <Link2 className="size-4" />
            关联模块与进度
          </h3>

          {/* 每个关联模块独立展示进度 */}
          {(data.linkedModules || []).map(mod => {
            const target = (data.progressTargets || {})[mod] || 0
            const completed = (data.progressCompleted || {})[mod] || 0
            const percent = target > 0 ? Math.min(100, (completed / target) * 100) : 0
            return (
              <div key={mod} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{moduleConfig[mod] || mod}</span>
                  <span className="font-medium">{completed} / {target}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">
            进度自动同步：关联模块完成记录后，这里会自动更新
          </p>
        </div>
      )}

      {/* ===== 操作按钮 ===== */}
      {isAssignee && (
        <div className="flex gap-2 pt-2 border-t">
          {data.status === "pending" && (
            <Button className="flex-1" onClick={handleAccept}>
              <Check className="size-4" />
              接受任务
            </Button>
          )}

          {/* 有关联模块的待办：不能手动标记完成，进度满了自动完成 */}
          {/* 没有关联模块的待办：可以手动标记完成 */}
          {data.status === "in-progress" && (data.linkedModules || []).length === 0 && (
            <Button className="flex-1" onClick={handleComplete}>
              <Check className="size-4" />
              标记完成
            </Button>
          )}

          {/* 有关联模块的待办进行中：提示自动完成 */}
          {data.status === "in-progress" && (data.linkedModules || []).length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2 w-full">
              关联模块进度满后自动完成
            </p>
          )}

          {data.status === "done" && (
            <p className="text-sm text-muted-foreground text-center py-2 w-full">
              ✓ 任务已完成，将于当天 23:59 自动归档
            </p>
          )}
        </div>
      )}

      {!isAssignee && data.status === "pending" && (
        <p className="text-sm text-muted-foreground text-center py-2 border-t">
          等待负责人 {data.assignee} 接受任务
        </p>
      )}
    </div>
  )


  // ----- 渲染 -----
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[18px] max-h-[92vh] flex flex-col p-0" showCloseButton={false}>
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-border/30">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm font-medium text-foreground active:text-muted-foreground transition-colors"
            >
              完成
            </button>
            <span className="text-sm font-semibold">任务详情</span>
            <button
              className="text-sm font-medium text-foreground active:text-muted-foreground transition-colors"
            >
              <Pencil className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* 详情内容 - 可滚动 */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {/* 标题区 */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight">{data.title}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={priorityConfig[currentPriority].variant} className="text-[11px]">
                  {priorityConfig[currentPriority].label}
                </Badge>
                <Badge variant={statusConfig[data.status].variant} className="text-[11px]">
                  {statusConfig[data.status].label}
                </Badge>
              </div>
            </div>

            {/* 分组1：任务介绍 */}
            {data.description && (
              <div className="bg-secondary/20 rounded-[18px] p-4">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  任务介绍
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {data.description}
                </p>
              </div>
            )}

            {/* 分组2：任务信息 */}
            <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  任务信息
                </h3>
              </div>
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">负责人</span>
                <span className="text-sm font-medium">{data.assignee}</span>
              </div>
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">创建人</span>
                <span className="text-sm font-medium">{data.creator}</span>
              </div>
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">任务来源</span>
                <span className="text-sm font-medium">{sourceConfig[data.source] || data.source}</span>
              </div>
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">截止日期</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatDate(data.dueDate)}
                </span>
              </div>
              <div className="h-11 px-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">创建时间</span>
                <span className="text-sm font-medium">{formatDateTime(data.createdAt)}</span>
              </div>
              {data.completedAt && (
                <div className="h-11 px-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">完成时间</span>
                  <span className="text-sm font-medium">{formatDateTime(data.completedAt)}</span>
                </div>
              )}
            </div>

            {/* 分组3：关联模块与进度 */}
            {(data.linkedModules || []).length > 0 && (
              <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                    <Link2 className="size-3" />
                    关联模块与进度
                  </h3>
                </div>
                {(data.linkedModules || []).map((mod, idx) => {
                  const target = (data.progressTargets || {})[mod] || 0
                  const completed = (data.progressCompleted || {})[mod] || 0
                  const percent = target > 0 ? Math.min(100, (completed / target) * 100) : 0
                  const isLast = idx === (data.linkedModules || []).length - 1
                  return (
                    <div
                      key={mod}
                      className={`px-4 py-3 ${!isLast ? "border-b border-border/20" : ""}`}
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{moduleConfig[mod] || mod}</span>
                        <span className="font-medium">{completed} / {target}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="px-4 pb-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    进度自动同步：关联模块完成记录后自动更新
                  </p>
                </div>
              </div>
            )}

            {/* 底部操作区 */}
            {isAssignee && data.status === "pending" && (
              <Button className="w-full" onClick={handleAccept}>
                <Check className="size-4" />
                接受任务
              </Button>
            )}
            {isAssignee && data.status === "in-progress" && (data.linkedModules || []).length === 0 && (
              <Button className="w-full" onClick={handleComplete}>
                <Check className="size-4" />
                标记完成
              </Button>
            )}
            {isAssignee && data.status === "in-progress" && (data.linkedModules || []).length > 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  关联模块进度满后自动完成
                </p>
              </div>
            )}
            {data.status === "done" && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  ✓ 任务已完成，将于当天 23:59 自动归档
                </p>
              </div>
            )}
            {!isAssignee && data.status === "pending" && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  等待 {data.assignee} 接受任务
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" initialFocus={false}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>任务详情</DialogTitle>
          <DialogDescription>所有字段只读，不可修改</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {detailContent}
        </div>
      </DialogContent>
    </Dialog>
  )
}
