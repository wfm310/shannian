"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { db, type Todo, type Priority } from "@/lib/db"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { getCurrentPriority } from "@/lib/priority"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TodoForm } from "@/components/todo/todo-form"
import { TodoDetail } from "@/components/todo/todo-detail"
import { TodoBoardView } from "@/components/todo/todo-board-view"
import { TodoCalendarView } from "@/components/todo/todo-calendar-view"
import { TodoGanttView } from "@/components/todo/todo-gantt-view"
import { PageHeader } from "@/components/layout/page-header"
import { toast } from "sonner"
import { Plus, Check, ChevronDown, Clock, Archive } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { subscribeProgressChanges } from "@/lib/progress-events"

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "P0", label: "P0 · 今天必须干完", color: "bg-destructive" },
  { value: "P1", label: "P1 · 今天应该干完", color: "bg-foreground" },
  { value: "P2", label: "P2 · 本周内完成", color: "bg-muted-foreground/50" },
  { value: "P3", label: "P3 · 有空再做", color: "bg-muted-foreground/30" },
]

const CURRENT_USER = "峰岚"

type ViewMode = "board" | "calendar" | "gantt"

export const dynamic = "force-dynamic"

function TodoPage() {
  const [progressTick, setProgressTick] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeProgressChanges(() => {
      setProgressTick(t => t + 1)
    })
    return unsubscribe
  }, [])

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [searchText, setSearchText] = useState("")
  const [priorityFilters, setPriorityFilters] = useState<Set<Priority>>(new Set(["P0", "P1", "P2", "P3"]))
  const [isArchivedView, setIsArchivedView] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("board")
  const [formOpen, setFormOpen] = useState(false)
  const [detailTodo, setDetailTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const userClosedDetailRef = useRef(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const migrateTodo = (todo: any): Todo => {
    if (todo.initialPriority) return todo as Todo
    return {
      ...todo,
      initialPriority: todo.priority || "P2",
      archived: todo.archived ?? false,
      source: todo.source || "manual",
      creator: todo.creator || CURRENT_USER,
      linkedModules: todo.linkedModules || [],
      progressTargets: todo.progressTargets || (todo.progressTarget ? { default: todo.progressTarget } : {}),
      progressCompleted: todo.progressCompleted
        ? (typeof todo.progressCompleted === "number"
            ? { default: todo.progressCompleted }
            : todo.progressCompleted)
        : {},
      completedAt: todo.completedAt ?? null,
    }
  }

  const loadTodos = useCallback(async () => {
    setIsLoading(true)
    const allData = await db.todos.toArray()
    const migrated = allData.map(migrateTodo)
    const filtered = migrated
      .filter(t => !t.archived || isArchivedView)
      .sort((a, b) => b.createdAt - a.createdAt)
    setTodos(filtered)
    setIsLoading(false)
  }, [isArchivedView])

  const autoArchive = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    const allTodos = await db.todos.toArray()
    const toArchive = allTodos.filter(t =>
      t.status === "done" &&
      !t.archived &&
      t.completedAt &&
      t.completedAt < todayStart
    )

    if (toArchive.length > 0) {
      const now = Date.now()
      await Promise.all(toArchive.map(t =>
        db.todos.update(t.id!, { archived: true, archivedAt: now })
      ))
      toast.success(`已自动归档 ${toArchive.length} 条已完成任务`)
      loadTodos()
    }
  }, [loadTodos])

  useEffect(() => {
    loadTodos()
  }, [loadTodos, progressTick])

  useEffect(() => {
    autoArchive()

    const now = new Date()
    const midnight = new Date()
    midnight.setHours(23, 59, 0, 0)
    if (now < midnight) {
      const msUntilMidnight = midnight.getTime() - now.getTime()
      const timer = setTimeout(() => autoArchive(), msUntilMidnight)
      return () => clearTimeout(timer)
    }
  }, [autoArchive])

  useEffect(() => {
    const idStr = searchParams.get("id")
    if (!idStr || todos.length === 0) return
    if (userClosedDetailRef.current) return
    const found = todos.find(t => t.id === idStr)
    if (found) {
      setDetailTodo(found)
      setDetailOpen(true)
    }
  }, [searchParams, todos])

  const filteredTodos = todos.filter(todo => {
    if (isArchivedView) {
      return todo.archived === true
    }
    if (todo.archived) return false
    // 优先级筛选
    const currentP = getCurrentPriority(todo.initialPriority || "P2", todo.createdAt, todo.dueDate)
    if (!priorityFilters.has(currentP)) return false
    // 搜索
    if (searchText) {
      const text = searchText.toLowerCase()
      return todo.title.toLowerCase().includes(text) ||
             todo.description.toLowerCase().includes(text)
    }
    return true
  })

  const todoWithPriority = filteredTodos.map(todo => {
    const priority = todo.initialPriority || (todo as any).priority || "P2"
    return { ...todo, currentPriority: getCurrentPriority(priority, todo.createdAt, todo.dueDate) }
  })

  function handleCreate() {
    setFormOpen(true)
  }

  function handleOpenDetail(todo: Todo) {
    setDetailTodo(todo)
    setDetailOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) loadTodos()
  }

  function handleDetailClose(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      userClosedDetailRef.current = true
      if (searchParams.get("id")) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("id")
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
      loadTodos()
    }
  }

  return (
    <>
      <PageHeader
        title="今日待办"
        description={isArchivedView ? "已归档任务" : `${todos.length} 条待办 · 今日 23:59 自动归档`}
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索任务..."
        createEnabled={true}
        onCreate={handleCreate}
      >
        {/* 视图切换 + 筛选入口 */}
        <div className="flex items-center gap-3">
          {!isArchivedView && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex-1">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="board">看板</TabsTrigger>
                <TabsTrigger value="calendar">日历</TabsTrigger>
                <TabsTrigger value="gantt">甘特</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {isArchivedView && <div className="flex-1" />}
          <button
            onClick={() => setFilterSheetOpen(true)}
            className="shrink-0 size-11 lg:size-8 flex items-center justify-center active:bg-secondary/40 rounded-xl transition-colors"
            aria-label="筛选"
          >
            <ChevronDown className="size-5 text-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </PageHeader>

      {/* 内容区 */}
      <div className="px-5 md:px-6 lg:px-8 pt-3 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {showSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-[18px]" />
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-secondary/60 flex items-center justify-center mb-4">
              <Check className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1">
              {isArchivedView ? "暂无归档任务" : searchText || priorityFilters.size < 4 ? "没有匹配的任务" : "暂无任务"}
            </h3>
            <p className="text-[15px] text-muted-foreground mb-4">
              {isArchivedView ? "已完成的任务会在当天 23:59 自动归档" : searchText || priorityFilters.size < 4 ? "试试调整筛选条件" : "点击右上角按钮开始创建"}
            </p>
            {!searchText && priorityFilters.size === 4 && !isArchivedView && (
              <Button onClick={handleCreate}>
                <Plus className="size-4" />
                新建任务
              </Button>
            )}
          </div>
        ) : (
          <>
            {isArchivedView ? (
              <ArchivedList todos={todoWithPriority} onOpenDetail={handleOpenDetail} />
            ) : (
              <>
                {viewMode === "board" && (
                  <TodoBoardView
                    todos={todoWithPriority}
                    isArchived={isArchivedView}
                    onOpenDetail={handleOpenDetail}
                  />
                )}
                {viewMode === "calendar" && (
                  <TodoCalendarView
                    todos={todoWithPriority}
                    isArchived={isArchivedView}
                    onOpenDetail={handleOpenDetail}
                  />
                )}
                {viewMode === "gantt" && (
                  <TodoGanttView
                    todos={todoWithPriority}
                    isArchived={isArchivedView}
                    onOpenDetail={handleOpenDetail}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      <TodoForm open={formOpen} onOpenChange={handleFormClose} />
      <TodoDetail
        todo={detailTodo}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        currentUser={CURRENT_USER}
        onUpdated={loadTodos}
      />

      {/* 筛选底部 Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[18px]">
          <SheetHeader>
            <SheetTitle className="text-center">筛选</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4">
            <div className="text-[13px] text-muted-foreground mb-2 ml-1">按优先级</div>
            <div className="bg-secondary/60 rounded-[14px] overflow-hidden">
              {priorityOptions.map((opt, idx) => {
                const selected = priorityFilters.has(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPriorityFilters(prev => {
                        const next = new Set(prev)
                        if (next.has(opt.value)) next.delete(opt.value)
                        else next.add(opt.value)
                        return next
                      })
                    }}
                    className={`w-full flex items-center gap-3 min-h-14 px-4 active:bg-secondary/40 transition-colors ${
                      idx < priorityOptions.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <div className={`size-[9px] rounded-full shrink-0 ${opt.color}`} />
                    <span className="text-[17px] text-foreground flex-1 text-left">{opt.label}</span>
                    {selected && <Check className="size-5 text-foreground" strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>

            <div className="h-4" />

            <button
              onClick={() => {
                setIsArchivedView(true)
                setFilterSheetOpen(false)
              }}
              className="w-full min-h-14 px-4 bg-secondary/60 rounded-[14px] text-[17px] text-foreground active:bg-secondary/40 transition-colors flex items-center justify-center"
            >
              查看归档
            </button>

            {isArchivedView && (
              <>
                <div className="h-3" />
                <button
                  onClick={() => {
                    setIsArchivedView(false)
                    setFilterSheetOpen(false)
                  }}
                  className="w-full min-h-14 px-4 bg-destructive/10 rounded-[14px] text-[17px] text-destructive active:bg-destructive/20 transition-colors flex items-center justify-center"
                >
                  返回待办
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ========== 归档列表 ==========
function ArchivedList({
  todos,
  onOpenDetail,
}: {
  todos: (Todo & { currentPriority: Priority })[]
  onOpenDetail: (todo: Todo) => void
}) {
  const sorted = [...todos].sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))

  const formatArchivedDate = (ts?: number | null) => {
    if (!ts) return ""
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日归档`
  }

  if (sorted.length === 0) return null

  return (
    <div className="bg-secondary/60 rounded-[18px] overflow-hidden">
      {sorted.map((todo, idx) => (
        <button
          key={todo.id}
          onClick={() => onOpenDetail(todo)}
          className={`w-full px-4 min-h-14 flex items-center gap-3 text-left active:bg-muted/50 transition-colors ${
            idx < sorted.length - 1 ? "border-b border-border/50" : ""
          }`}
        >
          <div className="size-[9px] rounded-full shrink-0 bg-[#34C759]/40" />
          <div className="flex-1 min-w-0">
            <p className="text-[17px] text-muted-foreground leading-[1.29] truncate line-through">
              {todo.title}
            </p>
          </div>
          <span className="text-[13px] text-muted-foreground/60 shrink-0">
            {formatArchivedDate(todo.archivedAt)}
          </span>
        </button>
      ))}
    </div>
  )
}

export default function TodoPageWrapper() {
  return (
    <Suspense fallback={null}>
      <TodoPage />
    </Suspense>
  )
}
