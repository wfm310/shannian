"use client"

import { useState } from "react"
import type { Todo, Priority } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChevronDown, Clock, Check } from "lucide-react"

const priorityConfig: Record<Priority, { label: string; title: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  P0: { label: "P0", title: "今天必须干完", color: "bg-[#FF3B30]", variant: "destructive" },
  P1: { label: "P1", title: "今天应该干完", color: "bg-foreground", variant: "default" },
  P2: { label: "P2", title: "本周内完成", color: "bg-muted-foreground/50", variant: "secondary" },
  P3: { label: "P3", title: "有空再做", color: "bg-muted-foreground/30", variant: "outline" },
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "pending": { label: "待办", variant: "outline" },
  "in-progress": { label: "进行中", variant: "default" },
  "done": { label: "已完成", variant: "secondary" },
}

interface BoardViewProps {
  todos: (Todo & { currentPriority: Priority })[]
  isArchived?: boolean
  onOpenDetail: (todo: Todo) => void
}

export function TodoBoardView({ todos, isArchived, onOpenDetail }: BoardViewProps) {
  const isMobile = useIsMobile()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (p: string) => setCollapsed(prev => ({ ...prev, [p]: !prev[p] }))

  const grouped: Record<Priority, (Todo & { currentPriority: Priority })[]> = {
    P0: [], P1: [], P2: [], P3: [],
  }
  todos.forEach(t => {
    const p = t.currentPriority
    if (grouped[p]) grouped[p].push(t)
  })

  // 移动端：状态分组横向滚动看板（对齐原型）
  if (isMobile) {
    const statusGroups: Record<string, (Todo & { currentPriority: Priority })[]> = {
      "pending": [],
      "in-progress": [],
      "done": [],
    }
    todos.forEach(t => {
      if (statusGroups[t.status]) statusGroups[t.status].push(t)
    })

    const columns = [
      { key: "pending", label: "待办", dotColor: "bg-gray-400/40" },
      { key: "in-progress", label: "进行中", dotColor: "bg-[#FF9500]" },
      { key: "done", label: "已完成", dotColor: "bg-[#34C759]" },
    ]

    const priorityOrder: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

    return (
      <div
        className="flex gap-3 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {columns.map(col => {
          const items = [...(statusGroups[col.key] || [])].sort(
            (a, b) => priorityOrder[a.currentPriority] - priorityOrder[b.currentPriority]
          )
          return (
            <div key={col.key} className="w-[280px] flex-shrink-0 flex flex-col">
              <div className="flex items-center justify-between px-1 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`size-[9px] rounded-full ${col.dotColor}`} />
                  <h3 className="text-[17px] font-semibold text-foreground">{col.label}</h3>
                </div>
                <span className="text-[13px] text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="flex-1 space-y-3 flex flex-col">
                {items.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[13px] text-muted-foreground">暂无</p>
                  </div>
                ) : (
                  items.map(todo => {
                    const totalTarget = Object.values(todo.progressTargets || {}).reduce((a: number, b: number) => a + b, 0)
                    const totalCompleted = Object.values(todo.progressCompleted || {}).reduce((a: number, b: number) => a + b, 0)
                    const percent = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
                    const isDone = todo.status === "done"
                    const dueDate = new Date(todo.dueDate)
                    const now = new Date()
                    const isToday = dueDate.getDate() === now.getDate() && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()

                    return (
                      <div
                        key={todo.id}
                        className={`flex-1 flex flex-col bg-card rounded-[14px] border border-border/50 cursor-pointer active:bg-secondary/30 transition-colors overflow-hidden ${isDone ? "opacity-60" : ""}`}
                        onClick={() => onOpenDetail(todo)}
                      >
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start gap-2">
                            <div className={`size-[9px] rounded-full shrink-0 mt-[7px] ${priorityConfig[todo.currentPriority].color}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-[17px] leading-[1.29] truncate ${isDone ? "line-through" : ""}`}>
                                {todo.title}
                              </p>
                            </div>
                          </div>
                          {todo.description && (
                            <p className="text-[16px] text-muted-foreground leading-[1.33] truncate mt-1 ml-[17px]">
                              {todo.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-2 ml-[17px]">
                            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                              <span>{todo.assignee}</span>
                              <span>·</span>
                              <span>{isToday ? "今日" : `${dueDate.getMonth() + 1}月${dueDate.getDate()}日`}</span>
                            </div>
                            {todo.status === "in-progress" && percent > 0 && (
                              <span className="text-[13px] text-muted-foreground tabular-nums">
                                {percent}%
                              </span>
                            )}
                          </div>
                        </div>
                        {/* 底部进度条（仅进行中显示） */}
                        {todo.status === "in-progress" && percent > 0 && (
                          <div className="h-1 shrink-0 bg-border/30">
                            <div className="h-full bg-foreground" style={{ width: `${percent}%` }} />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 桌面端：保持原 2x2 网格
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-auto md:h-[calc(100vh-18rem)] min-h-[300px] md:min-h-[400px] md:[grid-template-rows:1fr_1fr_auto]">
      {/* P0: 左侧大区域，跨2行 */}
      <div className="md:row-span-2 overflow-hidden flex flex-col bg-card border border-border rounded-lg">
        <div className="shrink-0 pb-3 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1 h-4 rounded-full ${priorityConfig.P0.color}`} />
              <span className="text-sm font-semibold">P0 {priorityConfig.P0.title}</span>
              <Badge variant="secondary" className="text-xs">{grouped.P0.length}</Badge>
            </div>
          </div>
        </div>
        <div className="flex-none md:flex-1 overflow-visible md:overflow-y-auto space-y-3 p-3">
          {grouped.P0.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>
          ) : (
            grouped.P0.map(todo => (
              <DesktopTodoCard
                key={todo.id}
                todo={todo}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </div>
      </div>

      {/* P1: 右上 */}
      <div className="overflow-hidden flex flex-col bg-card border border-border rounded-lg">
        <div className="shrink-0 pb-3 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1 h-4 rounded-full ${priorityConfig.P1.color}`} />
              <span className="text-sm font-semibold">P1 {priorityConfig.P1.title}</span>
              <Badge variant="secondary" className="text-xs">{grouped.P1.length}</Badge>
            </div>
          </div>
        </div>
        <div className="flex-none md:flex-1 overflow-visible md:overflow-y-auto space-y-3 p-3">
          {grouped.P1.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>
          ) : (
            grouped.P1.map(todo => (
              <DesktopTodoCard
                key={todo.id}
                todo={todo}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </div>
      </div>

      {/* P2: 右下 */}
      <div className="overflow-hidden flex flex-col bg-card border border-border rounded-lg">
        <div className="shrink-0 pb-3 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1 h-4 rounded-full ${priorityConfig.P2.color}`} />
              <span className="text-sm font-semibold">P2 {priorityConfig.P2.title}</span>
              <Badge variant="secondary" className="text-xs">{grouped.P2.length}</Badge>
            </div>
          </div>
        </div>
        <div className="flex-none md:flex-1 overflow-visible md:overflow-y-auto space-y-3 p-3">
          {grouped.P2.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>
          ) : (
            grouped.P2.map(todo => (
              <DesktopTodoCard
                key={todo.id}
                todo={todo}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </div>
      </div>

      {/* P3: 底部通栏 */}
      <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-lg">
        <div className="pb-3 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1 h-4 rounded-full ${priorityConfig.P3.color}`} />
              <span className="text-sm font-semibold">P3 {priorityConfig.P3.title}</span>
              <Badge variant="secondary" className="text-xs">{grouped.P3.length}</Badge>
            </div>
          </div>
        </div>
        <div className="p-3">
          {grouped.P3.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无任务</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped.P3.map(todo => (
                <DesktopTodoCard
                  key={todo.id}
                  todo={todo}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ 移动端：列表行 ============
function MobileTodoRow({
  todo,
  isLast,
  onClick,
}: {
  todo: Todo & { currentPriority: Priority }
  isLast: boolean
  onClick: () => void
}) {
  const isDone = todo.status === "done"

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-secondary/40 transition-colors ${
        !isLast ? "border-b border-border/20" : ""
      } ${isDone ? "opacity-50" : ""}`}
    >
      {/* 左侧优先级圆点 */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConfig[todo.currentPriority].color}`} />

      {/* 中间内容 */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDone ? "line-through" : ""}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {todo.assignee}
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="size-2.5" />
            {formatDate(todo.dueDate)}
          </span>
        </div>
      </div>

      {/* 右侧状态 */}
      <div className="flex-shrink-0">
        {isDone ? (
          <Check className="size-5 text-foreground" strokeWidth={2} />
        ) : (
          <Badge variant={statusConfig[todo.status].variant} className="text-[10px]">
            {statusConfig[todo.status].label}
          </Badge>
        )}
      </div>
    </button>
  )
}

// ============ 桌面端：卡片 ============
function DesktopTodoCard({
  todo,
  onOpenDetail,
}: {
  todo: Todo & { currentPriority: Priority }
  onOpenDetail: (todo: Todo) => void
}) {
  const isDone = todo.status === "done"

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const totalTarget = Object.values(todo.progressTargets || {}).reduce((a: number, b: number) => a + b, 0)
  const totalCompleted = Object.values(todo.progressCompleted || {}).reduce((a: number, b: number) => a + b, 0)
  const percent = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0

  return (
    <div
      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg border border-border bg-card"
      onClick={() => onOpenDetail(todo)}
    >
      <div className="flex items-center gap-2">
        <div className={`mt-0.5 size-2 rounded-full flex-shrink-0 ${priorityConfig[todo.currentPriority].color} ${isDone ? "opacity-40" : ""}`} />
        <span className={`text-sm font-medium flex-1 truncate ${isDone ? "line-through" : ""}`}>
          {todo.title}
        </span>
        <Badge variant={priorityConfig[todo.currentPriority].variant} className="text-xs">
          {priorityConfig[todo.currentPriority].label}
        </Badge>
        <Badge variant={statusConfig[todo.status].variant} className="text-xs">
          {statusConfig[todo.status].label}
        </Badge>
      </div>

      {todo.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{todo.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
        <span>{todo.assignee}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatDate(todo.dueDate)}
        </span>
      </div>

      {totalTarget > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{totalCompleted}/{totalTarget}</span>
        </div>
      )}
    </div>
  )
}
