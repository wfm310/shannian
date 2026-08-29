"use client"

import { useState, useMemo } from "react"
import type { Todo, Priority } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChevronLeft, ChevronRight } from "lucide-react"

const priorityConfig: Record<Priority, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  P0: { label: "P0", color: "bg-destructive", variant: "destructive" },
  P1: { label: "P1", color: "bg-foreground", variant: "default" },
  P2: { label: "P2", color: "bg-muted-foreground/50", variant: "secondary" },
  P3: { label: "P3", color: "bg-muted-foreground/30", variant: "outline" },
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

interface CalendarViewProps {
  todos: (Todo & { currentPriority: Priority })[]
  isArchived?: boolean
  onOpenDetail: (todo: Todo) => void
}

export function TodoCalendarView({ todos, isArchived, onOpenDetail }: CalendarViewProps) {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<"month" | "week">("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { days, title } = useMemo(() => {
    if (mode === "month") {
      return getMonthDays(currentDate)
    }
    return getWeekDays(currentDate)
  }, [currentDate, mode])

  const todosByDate = useMemo(() => {
    const map: Record<string, (Todo & { currentPriority: Priority })[]> = {}
    todos.forEach(t => {
      const dateKey = formatDayKey(t.dueDate)
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(t)
    })
    return map
  }, [todos])

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate)
    if (mode === "month") {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setDate(newDate.getDate() + direction * 7)
    }
    setCurrentDate(newDate)
  }

  const today = new Date()
  const todayKey = formatDayKey(today.getTime())
  const selectedKey = formatDayKey(selectedDate.getTime())

  // ============ 移动端 ============
  if (isMobile) {
    const selectedTodos = todosByDate[selectedKey] || []

    return (
      <div className="space-y-4">
        {/* 顶部：月份 + 切换 + Segmented Control */}
        <div className="space-y-3">
          {/* 月份导航 */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="size-11 flex items-center justify-center active:bg-secondary/40 rounded-xl transition-colors"
            >
              <ChevronLeft className="size-5 text-foreground" strokeWidth={1.5} />
            </button>
            <span className="text-base font-semibold">{title}</span>
            <button
              onClick={() => navigate(1)}
              className="size-11 flex items-center justify-center active:bg-secondary/40 rounded-xl transition-colors"
            >
              <ChevronRight className="size-5 text-foreground" strokeWidth={1.5} />
            </button>
          </div>

          {/* 月/周切换 Segmented Control */}
          <div className="flex bg-secondary/20 rounded-xl p-0.5">
            <button
              onClick={() => setMode("week")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mode === "week"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              周
            </button>
            <button
              onClick={() => setMode("month")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mode === "month"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              月
            </button>
          </div>
        </div>

        {/* 周视图：7 天横向滚动 */}
        {mode === "week" && (
          <div className="bg-secondary/20 rounded-[18px] p-3">
            <div className="grid grid-cols-7 gap-1">
              {/* 星期标题 */}
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="text-center text-[11px] font-medium text-muted-foreground pb-1"
                >
                  {day}
                </div>
              ))}

              {/* 日期 + 任务 */}
              {days.map((day, i) => {
                const dateKey = formatDayKey(day.timestamp)
                const dayTodos = todosByDate[dateKey] || []
                const isToday = dateKey === todayKey
                const isSelected = dateKey === selectedKey

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(day.timestamp))}
                    className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-colors ${
                      isSelected ? "bg-foreground text-background" : "active:bg-secondary/40"
                    } ${!day.isCurrentMonth ? "opacity-30" : ""}`}
                  >
                    {/* 日期数字 */}
                    <div
                      className={`size-7 flex items-center justify-center text-sm font-medium rounded-full ${
                        isToday && !isSelected
                          ? "bg-foreground text-background"
                          : isSelected
                          ? "bg-foreground text-background"
                          : "text-foreground"
                      }`}
                    >
                      {day.date}
                    </div>

                    {/* 任务指示器：圆点 */}
                    <div className="flex gap-0.5 h-1">
                      {dayTodos.slice(0, 3).map((todo, idx) => (
                        <div
                          key={todo.id}
                          className={`size-1 rounded-full ${priorityConfig[todo.currentPriority].color}`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 月视图：紧凑月历 */}
        {mode === "month" && (
          <div className="bg-secondary/20 rounded-[18px] p-3">
            <div className="grid grid-cols-7 gap-1">
              {/* 星期标题 */}
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="text-center text-[11px] font-medium text-muted-foreground pb-1"
                >
                  {day}
                </div>
              ))}

              {/* 日期网格 */}
              {days.map((day, i) => {
                const dateKey = formatDayKey(day.timestamp)
                const dayTodos = todosByDate[dateKey] || []
                const isToday = dateKey === todayKey
                const isSelected = dateKey === selectedKey

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(day.timestamp))}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                      isSelected ? "bg-foreground text-background" : "active:bg-secondary/40"
                    } ${!day.isCurrentMonth ? "opacity-30" : ""}`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isToday && !isSelected ? "text-foreground" : ""
                      }`}
                    >
                      {day.date}
                    </span>
                    {/* 任务指示器 */}
                    <div className="flex gap-0.5 h-1">
                      {dayTodos.slice(0, 3).map((todo, idx) => (
                        <div
                          key={todo.id}
                          className={`size-1 rounded-full ${
                            isSelected ? "bg-background" : priorityConfig[todo.currentPriority].color
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 选中日期的任务列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {formatSelectedDate(selectedDate)}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {selectedTodos.length} 条任务
            </span>
          </div>

          {selectedTodos.length === 0 ? (
            <div className="bg-secondary/20 rounded-[18px] py-8 text-center">
              <p className="text-sm text-muted-foreground">今天没有任务</p>
            </div>
          ) : (
            <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
              {selectedTodos.map((todo, idx) => (
                <button
                  key={todo.id}
                  onClick={() => onOpenDetail(todo)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-secondary/40 transition-colors ${
                    idx !== selectedTodos.length - 1 ? "border-b border-border/20" : ""
                  } ${todo.status === "done" ? "opacity-50" : ""}`}
                >
                  {/* 左侧优先级色条 */}
                  <div className={`w-1 h-5 rounded-full flex-shrink-0 ${priorityConfig[todo.currentPriority].color}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${todo.status === "done" ? "line-through" : ""}`}>
                      {todo.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {todo.assignee}
                    </p>
                  </div>

                  <Badge variant={priorityConfig[todo.currentPriority].variant} className="text-[10px]">
                    {priorityConfig[todo.currentPriority].label}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ 桌面端：保持原样 ============
  const navigateDesktop = (direction: number) => {
    const newDate = new Date(currentDate)
    if (mode === "month") {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setDate(newDate.getDate() + direction * 7)
    }
    setCurrentDate(newDate)
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigateDesktop(-1)} className="size-8 flex items-center justify-center rounded-md border border-border hover:bg-muted/50">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold min-w-[120px] text-center">{title}</span>
        <button onClick={() => navigateDesktop(1)} className="size-8 flex items-center justify-center rounded-md border border-border hover:bg-muted/50">
          <ChevronRight className="size-4" />
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm px-3 h-8 rounded-md border border-border hover:bg-muted/50"
        >
          今天
        </button>
        <div className="ml-auto flex gap-1 bg-secondary/20 rounded-md p-0.5">
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-1 text-sm rounded ${mode === "month" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            月
          </button>
          <button
            onClick={() => setMode("week")}
            className={`px-3 py-1 text-sm rounded ${mode === "week" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            周
          </button>
        </div>
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {days.map((day, i) => {
          const dateKey = formatDayKey(day.timestamp)
          const dayTodos = todosByDate[dateKey] || []
          const isToday = dateKey === todayKey
          const isCurrentMonth = mode === "week" || day.isCurrentMonth

          return (
            <div
              key={i}
              className={`min-h-[70px] md:min-h-[100px] p-2 md:p-3 flex flex-col gap-1.5 border rounded-lg bg-card ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "border-foreground" : "border-border"}`}
            >
              <span className={`text-xs ${isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {day.date}
              </span>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60px]">
                {dayTodos.map(todo => (
                  <button
                    key={todo.id}
                    onClick={() => onOpenDetail(todo)}
                    className="flex items-center gap-1 text-left px-1.5 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant={priorityConfig[todo.currentPriority].variant} className="text-[9px] px-1 py-0 h-3.5 shrink-0">
                      {priorityConfig[todo.currentPriority].label}
                    </Badge>
                    <span className="text-[10px] truncate flex-1">{todo.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ 工具函数 ============
function getMonthDays(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days: { date: number; timestamp: number; isCurrentMonth: boolean }[] = []

  for (let i = 0; i < startWeekday; i++) {
    const prevDate = new Date(year, month, 1 - startWeekday + i)
    days.push({
      date: prevDate.getDate(),
      timestamp: prevDate.getTime(),
      isCurrentMonth: false,
    })
  }

  for (let i = 1; i <= totalDays; i++) {
    const dayDate = new Date(year, month, i)
    days.push({
      date: i,
      timestamp: dayDate.getTime(),
      isCurrentMonth: true,
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i)
    days.push({
      date: i,
      timestamp: nextDate.getTime(),
      isCurrentMonth: false,
    })
  }

  return { days, title: `${year}年${month + 1}月` }
}

function getWeekDays(date: Date) {
  const day = date.getDay()
  const sunday = new Date(date)
  sunday.setDate(date.getDate() - day)

  const days: { date: number; timestamp: number; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    days.push({
      date: d.getDate(),
      timestamp: d.getTime(),
      isCurrentMonth: true,
    })
  }

  const monthLabel = `${sunday.getFullYear()}年${sunday.getMonth() + 1}月`
  const endDate = new Date(days[6].timestamp)
  const endLabel = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`

  return { days, title: monthLabel === endLabel ? monthLabel : `${monthLabel} - ${endLabel}` }
}

function formatDayKey(timestamp: number): string {
  const d = new Date(timestamp)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function formatSelectedDate(date: Date): string {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = weekdays[date.getDay()]

  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  if (isToday) return "今天"
  if (isTomorrow) return "明天"
  return `${month}月${day}日 ${weekday}`
}
