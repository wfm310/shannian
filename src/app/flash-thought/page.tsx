"use client"

import { useState, useCallback, useEffect } from "react"
import { type FlashThought } from "@/lib/db"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { getFlashThoughts, statusConfig } from "@/lib/flash-thought"
import { PageHeader } from "@/components/layout/page-header"
import { FlashThoughtDetail } from "@/components/flash-thought/flash-thought-detail"
import { FlashThoughtAction } from "@/components/flash-thought/flash-thought-action"
import { FlashThoughtGraph } from "@/components/flash-thought/flash-thought-d3-graph"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Lightbulb, ChevronDown, Check } from "lucide-react"

const filterOptions = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "categorized", label: "已归类" },
  { value: "converted_todo", label: "已转待办" },
]

export default function FlashThoughtPage() {
  const [allFlashes, setAllFlashes] = useState<FlashThought[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeFilter, setActiveFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"list" | "graph">("list")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [detailFlash, setDetailFlash] = useState<FlashThought | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionFlash, setActionFlash] = useState<FlashThought | null>(null)
  const [actionType, setActionType] = useState<"categorize" | "convert_todo" | null>(null)
  const [searchText, setSearchText] = useState("")

  const loadFlashes = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await getFlashThoughts()
      setAllFlashes(list)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFlashes()
  }, [loadFlashes])

  useEffect(() => {
    function handleFlashUpdate() {
      loadFlashes()
    }
    window.addEventListener("flash-thought-updated", handleFlashUpdate)
    return () => window.removeEventListener("flash-thought-updated", handleFlashUpdate)
  }, [loadFlashes])

  const pendingCount = allFlashes.filter(f => f.status === "pending").length

  const filteredFlashes = allFlashes.filter(f => {
    if (activeFilter !== "all" && f.status !== activeFilter) return false
    if (searchText && !f.content.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  const formatTime = (ts: number) => {
    const date = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "刚刚"
    if (mins < 60) return `${mins} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  function handleOpenDetail(flash: FlashThought) {
    setDetailFlash(flash)
    setDetailOpen(true)
  }

  function handleCategorize(flash: FlashThought) {
    setActionFlash(flash)
    setActionType("categorize")
  }

  function handleConvertTodo(flash: FlashThought) {
    setActionFlash(flash)
    setActionType("convert_todo")
  }

  function handleCreate() {
    window.dispatchEvent(new CustomEvent("quick-flash-open"))
  }

  const getCategoryLabel = (flash: FlashThought): string => {
    if (flash.status === "pending") return "待处理"
    if (flash.status === "categorized") {
      const targetMap: Record<string, string> = {
        topic: "选题库",
        qa: "问答收集",
        inspiration: "灵感记录",
      }
      return flash.categoryTarget ? targetMap[flash.categoryTarget] || "已归类" : "已归类"
    }
    if (flash.status === "converted_todo") return "已转待办"
    return ""
  }

  return (
    <>
      <PageHeader
        title="闪念池"
        description={`${allFlashes.length} 条闪念 · ${pendingCount} 条待处理`}
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索闪念内容..."
        createEnabled={true}
        onCreate={handleCreate}
      >
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "graph")} className="flex-1">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="list">列表</TabsTrigger>
              <TabsTrigger value="graph">网络图</TabsTrigger>
            </TabsList>
          </Tabs>
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
      <div className="px-5 pt-3 pb-safe-3">
        {showSkeleton ? (
          viewMode === "list" ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[18px]" />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px]">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          )
        ) : filteredFlashes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-secondary/60 flex items-center justify-center mb-4">
              <Lightbulb className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1">暂无闪念</h3>
            <p className="text-[15px] text-muted-foreground">
              点击右下角快记按钮，随时记录灵感
            </p>
          </div>
        ) : viewMode === "graph" ? (
          <div className="h-[500px]">
            <FlashThoughtGraph thoughts={filteredFlashes} onOpenDetail={handleOpenDetail} />
          </div>
        ) : (
          /* 列表视图：卡片流 */
          <div className="space-y-3">
            {filteredFlashes.map(flash => (
              <Card
                key={flash.id}
                className="cursor-pointer active:bg-secondary/30 transition-colors"
                onClick={() => handleOpenDetail(flash)}
              >
                <CardContent>
                  <p className="text-[17px] leading-[1.29] line-clamp-3">
                    {flash.content}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant={statusConfig[flash.status]?.variant || "outline"}>
                      {getCategoryLabel(flash)}
                    </Badge>
                    <span className="text-[13px] text-muted-foreground">
                      {formatTime(flash.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <FlashThoughtDetail
        flash={detailFlash}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCategorize={handleCategorize}
        onConvertTodo={handleConvertTodo}
      />

      {/* 操作弹窗 */}
      <FlashThoughtAction
        flash={actionFlash}
        type={actionType}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null)
            setActionFlash(null)
          }
        }}
        onSuccess={loadFlashes}
      />

      {/* 筛选底部 Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[18px]">
          <SheetHeader>
            <SheetTitle className="text-center">筛选</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4">
            <div className="bg-secondary/60 rounded-[14px] overflow-hidden">
              {filterOptions.map((opt, idx) => {
                const count = opt.value === "all"
                  ? allFlashes.length
                  : allFlashes.filter(f => f.status === opt.value).length
                const selected = activeFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setActiveFilter(opt.value)
                      setFilterSheetOpen(false)
                    }}
                    className={`w-full flex items-center min-h-11 px-4 active:bg-secondary/40 transition-colors ${
                      idx < filterOptions.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <span className="text-[17px] text-foreground flex-1 text-left">{opt.label}</span>
                    <span className="text-[13px] text-muted-foreground tabular-nums mr-2">{count}</span>
                    {selected && <Check className="size-5 text-foreground" strokeWidth={2.5} />}
                  </button>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
