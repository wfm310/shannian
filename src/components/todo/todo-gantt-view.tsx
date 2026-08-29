"use client"

import { useMemo } from "react"
import type { Todo, Priority } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { Clock, AlertCircle } from "lucide-react"

const priorityConfig: Record<Priority, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  P0: { label: "P0", color: "bg-destructive", variant: "destructive" },
  P1: { label: "P1", color: "bg-foreground", variant: "default" },
  P2: { label: "P2", color: "bg-muted-foreground/50", variant: "secondary" },
  P3: { label: "P3", color: "bg-muted-foreground/30", variant: "outline" },
}

interface GanttViewProps {
  todos: (Todo & { currentPriority: Priority })[]
  isArchived?: boolean
  onOpenDetail: (todo: Todo) => void
}

type TimeGroup = "overdue" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "later"

const groupLabels: Record<TimeGroup, string> = {
  overdue: "逾期",
  today: "今天",
  tomorrow: "明天",
  thisWeek: "本周",
  nextWeek: "下周",
  later: "稍后",
}

export function TodoGanttView({ todos, isArchived, onOpenDetail }: GanttViewProps) {
  const isMobile = useIsMobile()

  const grouped = useMemo(() => {
    const result: Record<TimeGroup, (Todo & { currentPriority: Priority })[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const todayStart = now.getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1
    const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000

    // 本周日结束
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() + (6 - now.getDay()))
    weekEnd.setHours(23, 59, 59, 999)

    // 下周日结束
    const nextWeekEnd = new Date(weekEnd)
    nextWeekEnd.setDate(weekEnd.getDate() + 7)

    todos.forEach(todo => {
      const due = todo.dueDate

      if (due < todayStart && todo.status !== "done") {
        result.overdue.push(todo)
      } else if (due >= todayStart && due <= todayEnd) {
        result.today.push(todo)
      } else if (due > todayEnd && due <= tomorrowEnd) {
        result.tomorrow.push(todo)
      } else if (due > tomorrowEnd && due <= weekEnd.getTime()) {
        result.thisWeek.push(todo)
      } else if (due > weekEnd.getTime() && due <= nextWeekEnd.getTime()) {
        result.nextWeek.push(todo)
      } else {
        result.later.push(todo)
      }
    })

    // 每组内按截止日期排序
    Object.keys(result).forEach(key => {
      result[key as TimeGroup].sort((a, b) => a.dueDate - b.dueDate)
    })

    return result
  }, [todos])

  // 桌面端甘特图计算
  const desktopGantt = useMemo(() => {
    if (todos.length === 0) {
      return { dateRange: [] as Date[], totalDays: 0, dayWidth: 80 }
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let minDate = new Date(todos[0].createdAt)
    let maxDate = new Date(todos[0].dueDate)
    todos.forEach(t => {
      if (t.createdAt < minDate.getTime()) minDate = new Date(t.createdAt)
      if (t.dueDate > maxDate.getTime()) maxDate = new Date(t.dueDate)
    })

    minDate.setHours(0, 0, 0, 0)
    maxDate.setHours(23, 59, 59, 999)
    maxDate.setDate(maxDate.getDate() + 1)

    const diff = maxDate.getTime() - minDate.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    const dayW = Math.max(60, Math.min(140, Math.floor(1200 / days)))

    const range: Date[] = []
    const iter = new Date(minDate)
    while (iter <= maxDate) {
      range.push(new Date(iter))
      iter.setDate(iter.getDate() + 1)
    }

    return { dateRange: range, totalDays: days, dayWidth: dayW }
  }, [todos])

  // ============ 移动端：纵向时间线 ============
  if (isMobile) {
    const groupOrder: TimeGroup[] = ["overdue", "today", "tomorrow", "thisWeek", "nextWeek", "later"]
    const visibleGroups = groupOrder.filter(g => grouped[g].length > 0)

    if (visibleGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">暂无任务</p>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {visibleGroups.map(groupKey => {
          const items = grouped[groupKey]
          const isOverdue = groupKey === "overdue"
          const isToday = groupKey === "today"

          return (
            <section key={groupKey}>
              {/* 分组标题 */}
              <div className="flex items-center gap-2 mb-2 px-1">
                {isOverdue && (
                  <AlertCircle className="size-3.5 text-destructive" strokeWidth={2} />
                )}
                <span
                  className={`text-[11px] uppercase tracking-wider font-semibold ${
                    isOverdue
                      ? "text-destructive"
                      : isToday
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {groupLabels[groupKey]}
                </span>
                <span className="text-[11px] text-muted-foreground/60">
                  {items.length}
                </span>
              </div>

              {/* 任务列表 */}
              <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                {items.map((todo, idx) => (
                  <TimelineRow
                    key={todo.id}
                    todo={todo}
                    isLast={idx === items.length - 1}
                    isOverdue={isOverdue}
                    onClick={() => onOpenDetail(todo)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  // ============ 桌面端：保持原甘特图 ============
  const { dateRange, dayWidth } = desktopGantt
  const totalDays = desktopGantt.totalDays

  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">暂无任务</p>
      </div>
    )
  }

  const startDate = dateRange[0]
  const timelineWidth = dateRange.length * dayWidth

  const getDayOffset = (timestamp: number) => {
    const d = new Date(timestamp)
    d.setHours(0, 0, 0, 0)
    const diff = d.getTime() - startDate.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const getBarWidth = (start: number, end: number) => {
    const startDay = getDayOffset(start)
    const endDay = getDayOffset(end)
    return Math.max(1, endDay - startDay + 1) * dayWidth
  }

  return (
    <div className="w-full">
      <div
        className="overflow-auto"
        style={{ maxHeight: "600px", WebkitOverflowScrolling: "touch" }}
      >
        {/* 时间轴头部 - sticky top */}
        <div className="flex border-b sticky top-0 z-20 bg-background">
          <div className="w-28 md:w-40 shrink-0 sticky left-0 z-30 flex items-center px-2 py-2 text-sm font-semibold border-r bg-background">
            任务
          </div>
          <div className="flex" style={{ width: timelineWidth }}>
            {dateRange.map((date, i) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const isToday = formatDayKey(date.getTime()) === formatDayKey(Date.now())
              return (
                <div
                  key={i}
                  className={`text-center text-xs py-2 border-r ${isToday ? "bg-foreground/10 font-bold" : isWeekend ? "bg-muted/40" : ""}`}
                  style={{ width: dayWidth }}
                >
                  <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 任务行 */}
        {todos.map(todo => {
          const startDay = getDayOffset(todo.createdAt)
          const barWidth = getBarWidth(todo.createdAt, todo.dueDate)
          const isDone = todo.status === "done"
          const cfg = priorityConfig[todo.currentPriority]

          return (
            <div
              key={todo.id}
              className="group flex border-b border-muted/50 hover:bg-muted/30 transition-colors"
            >
              {/* 任务名列 - sticky left */}
              <div className="w-28 md:w-40 shrink-0 sticky left-0 z-10 flex items-center px-2 py-2 border-r bg-background group-hover:bg-muted/30">
                <button
                  onClick={() => onOpenDetail(todo)}
                  className="flex items-center gap-1.5 text-left w-full"
                >
                  <Badge variant={cfg.variant} className="text-[9px] px-1 py-0 h-3.5 shrink-0">
                    {cfg.label}
                  </Badge>
                  <span className={`text-xs truncate ${isDone ? "line-through opacity-60" : ""}`}>
                    {todo.title}
                  </span>
                </button>
              </div>
              {/* 时间轴区域 */}
              <div className="relative" style={{ width: timelineWidth, height: 120 }}>
                {/* 今日竖线 */}
                {(() => {
                  const todayOffset = getDayOffset(Date.now())
                  if (todayOffset >= 0 && todayOffset < dateRange.length) {
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-foreground/40"
                        style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                      />
                    )
                  }
                })()}
                {/* 周末背景 */}
                {dateRange.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  if (!isWeekend) return null
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 bg-muted/20"
                      style={{ left: i * dayWidth, width: dayWidth }}
                    />
                  )
                })}
                {/* 任务条 */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-24 rounded-md flex items-center px-2 cursor-pointer ${cfg.color} text-primary-foreground ${isDone ? "opacity-50" : ""} hover:opacity-80 transition-opacity`}
                  style={{
                    left: startDay * dayWidth,
                    width: barWidth,
                  }}
                  onClick={() => onOpenDetail(todo)}
                >
                  <span className="text-[10px] truncate font-medium">{todo.assignee}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ 移动端时间线行 ============
function TimelineRow({
  todo,
  isLast,
  isOverdue,
  onClick,
}: {
  todo: Todo & { currentPriority: Priority }
  isLast: boolean
  isOverdue: boolean
  onClick: () => void
}) {
  const isDone = todo.status === "done"

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, "0")
    return `${h}:${m}`
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  // 计算进度（已过时间 / 总时间）
  const totalDuration = todo.dueDate - todo.createdAt
  const elapsed = Date.now() - todo.createdAt
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 text-left active:bg-secondary/40 transition-colors ${
        !isLast ? "border-b border-border/20" : ""
      } ${isDone ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* 左侧时间 + 圆点 */}
        <div className="flex flex-col items-center pt-0.5 shrink-0 w-12">
          <div className={`w-2 h-2 rounded-full ${priorityConfig[todo.currentPriority].color}`} />
          <span className="text-[10px] text-muted-foreground mt-1">
            {formatDate(todo.dueDate)}
          </span>
        </div>

        {/* 中间内容 */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? "line-through" : ""}`}>
            {todo.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-muted-foreground">{todo.assignee}</span>
            {isOverdue && (
              <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                <AlertCircle className="size-2.5" />
                逾期
              </span>
            )}
          </div>

          {/* 时间进度条 */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isDone ? "bg-foreground" : isOverdue ? "bg-destructive" : "bg-foreground/60"
                }`}
                style={{ width: `${isDone ? 100 : progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {isDone ? "100%" : `${Math.round(progressPercent)}%`}
            </span>
          </div>
        </div>

        {/* 右侧优先级徽章 */}
        <div className="flex-shrink-0">
          <Badge variant={priorityConfig[todo.currentPriority].variant} className="text-[10px]">
            {priorityConfig[todo.currentPriority].label}
          </Badge>
        </div>
      </div>
    </button>
  )
}

function formatDayKey(timestamp: number): string {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}
