"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { BenchmarkList } from "@/components/benchmark/benchmark-list"
import { BenchmarkWorkspace } from "@/components/benchmark/benchmark-workspace"
import { BenchmarkForm } from "@/components/benchmark/benchmark-form"
import { BenchmarkTransfer } from "@/components/benchmark/benchmark-transfer"
import { BenchmarkConvert } from "@/components/benchmark/benchmark-convert"
import { BenchmarkDetail } from "@/components/benchmark/benchmark-detail"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { PageHeader } from "@/components/layout/page-header"
import {
  getBenchmarks,
  getBenchmark,
  updateBenchmark,
} from "@/lib/benchmark"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { useIsDesktop } from "@/hooks/use-media-query"
import type { Benchmark } from "@/lib/db"
import { Target, Plus, ChevronDown, Check } from "lucide-react"
import { toast } from "sonner"

const filterTabs = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待拆解" },
  { value: "in_progress", label: "拆解中" },
  { value: "completed", label: "已拆解" },
  { value: "converted", label: "已转化" },
] as const

const CURRENT_USER = "峰岚"

export const dynamic = "force-dynamic"

function BenchmarkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const isMobile = !isDesktop
  const [searchText, setSearchText] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // 详情页显隐 + 动画状态
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailAnimating, setDetailAnimating] = useState(false)

  // 左滑返回手势
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number>(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  // 加载全部数据
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getBenchmarks()
      setBenchmarks(data)
    } catch (error) {
      console.error("加载对标列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // URL 深链接：?id=xxx 自动打开详情
  useEffect(() => {
    const idStr = searchParams.get("id")
    if (idStr) {
      const id = parseInt(idStr, 10)
      if (!isNaN(id)) {
        setSelectedId(id)
        if (isMobile) {
          setDetailVisible(true)
        }
      }
    }
  }, [searchParams, isMobile])

  // 筛选列表数据
  const filteredBenchmarks = useMemo(() => {
    return benchmarks.filter(b => {
      if (activeFilter !== "all" && b.status !== activeFilter) return false
      if (searchText) {
        const text = searchText.toLowerCase()
        if (
          !b.title.toLowerCase().includes(text) &&
          !b.videoScript.toLowerCase().includes(text) &&
          !b.videoUrl.toLowerCase().includes(text)
        ) return false
      }
      return true
    })
  }, [benchmarks, activeFilter, searchText])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: benchmarks.length }
    for (const b of benchmarks) {
      c[b.status] = (c[b.status] || 0) + 1
    }
    return c
  }, [benchmarks])

  // 获取当前选中的 benchmark
  const selectedBenchmark = benchmarks.find(b => b.id === selectedId) || null

  // 选中视频 → 打开详情
  const handleSelect = useCallback((id: number) => {
    setSelectedId(id)
    if (isMobile) {
      setDetailVisible(true)
    }
    router.replace(`${pathname}?id=${id}`, { scroll: false })
  }, [router, pathname, isMobile])

  // 返回列表
  const handleBack = useCallback(() => {
    if (detailAnimating) return
    setDetailAnimating(true)
    setDetailVisible(false)
    setTimeout(() => {
      setSelectedId(null)
      setDetailAnimating(false)
      router.replace(pathname, { scroll: false })
    }, 300)
  }, [detailAnimating, router, pathname])

  // 左滑返回手势处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!detailVisible) return
    const touch = e.touches[0]
    // 只在屏幕左边缘 30px 内开始的滑动才触发返回
    if (touch.clientX > 30) return
    touchStartX.current = touch.clientX
    touchCurrentX.current = touch.clientX
    setSwipeOffset(0)
  }, [detailVisible])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const touch = e.touches[0]
    const diff = touch.clientX - touchStartX.current
    if (diff > 0) {
      touchCurrentX.current = touch.clientX
      setSwipeOffset(diff)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return
    const totalOffset = touchCurrentX.current - touchStartX.current
    touchStartX.current = null

    // 滑动超过 100px 触发返回
    if (totalOffset > 100) {
      handleBack()
    } else {
      // 回弹
      setSwipeOffset(0)
    }
  }, [handleBack])

  // 更新数据
  const handleUpdate = useCallback(async (id: number, updates: Partial<Benchmark>) => {
    await updateBenchmark(id, updates)
    await loadData()
  }, [loadData])

  // 下一条待拆解
  const handleNext = useCallback(() => {
    if (selectedId === null || benchmarks.length === 0) return
    const currentIndex = benchmarks.findIndex(b => b.id === selectedId)
    // 先找当前位置之后的待拆解
    let next = benchmarks.find((b, i) => i > currentIndex && b.status === "pending")
    if (!next) {
      next = benchmarks.find(b => b.status === "pending")
    }
    if (next) {
      handleSelect(next.id!)
    } else {
      next = benchmarks.find((b, i) => i > currentIndex && b.status === "in_progress")
      if (!next) next = benchmarks.find(b => b.status === "in_progress")
      if (next) {
        handleSelect(next.id!)
      } else {
        toast.info("没有待拆解的视频了")
      }
    }
  }, [selectedId, benchmarks, handleSelect])

  // 转让成功后刷新
  const handleTransferSuccess = useCallback(async () => {
    await loadData()
    setTransferOpen(false)
  }, [loadData])

  // 转化成功后刷新
  const handleConvertSuccess = useCallback(async () => {
    await loadData()
    setConvertOpen(false)
    if (selectedId) {
      const updated = await getBenchmark(selectedId)
      if (updated) {
        setBenchmarks(prev => prev.map(b => b.id === selectedId ? updated : b))
      }
    }
  }, [loadData, selectedId])

  function handleCreate() {
    setFormOpen(true)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ===== 页面头部 ===== */}
      <PageHeader
        title="对标拆解"
        description={`${benchmarks.length} 条对标 · ${counts.completed || 0} 条已完成拆解`}
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索对标内容..."
        createEnabled={true}
        onCreate={handleCreate}
      >
        {/* 筛选入口 */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-muted-foreground">
            {activeFilter === "all" ? "全部" : filterTabs.find(t => t.value === activeFilter)?.label}
            <span className="ml-1">· {filteredBenchmarks.length} 条</span>
          </div>
          <button
            onClick={() => setFilterSheetOpen(true)}
            className="flex items-center gap-1 text-[15px] text-foreground active:opacity-60"
          >
            筛选
            <ChevronDown className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </PageHeader>

      {/* ===== 左右分栏内容区 ===== */}
      <div className="flex flex-1 overflow-hidden">
        {showSkeleton ? (
          <div className="flex w-full items-center justify-center">
            <div className="w-full px-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[18px]" />
              ))}
            </div>
          </div>
        ) : benchmarks.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary/60">
              <Target className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-[17px] font-semibold">暂无对标视频</h3>
            <p className="mb-4 text-[15px] text-muted-foreground">
              点击右上角按钮开始添加
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4 mr-1" />
              新增对标视频
            </Button>
          </div>
        ) : (
          <>
            {/* 移动端：全屏列表 + 全屏详情页 */}
            <div className="w-full lg:hidden h-full">
              <div className="h-full pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
                <BenchmarkList
                  benchmarks={filteredBenchmarks}
                  selectedId={null}
                  onSelect={handleSelect}
                />
              </div>
            </div>

            {/* 桌面端：Resizable 分栏 */}
            <ResizablePanelGroup orientation="horizontal" className="hidden w-full lg:flex">
              <ResizablePanel defaultSize="25" minSize="18" maxSize="35">
                <BenchmarkList
                  benchmarks={filteredBenchmarks}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="75">
                <BenchmarkWorkspace
                  benchmark={selectedBenchmark}
                  currentUser={CURRENT_USER}
                  onUpdate={handleUpdate}
                  onTransfer={() => setTransferOpen(true)}
                  onConvert={() => setConvertOpen(true)}
                  onNext={handleNext}
                  onBack={() => setSelectedId(null)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </>
        )}
      </div>

      {/* ===== 移动端全屏详情页 ===== */}
      {isMobile && detailVisible && selectedBenchmark && (
        <div
          className="fixed inset-0 z-50"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset === 0 && touchStartX.current === null ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        >
          <BenchmarkDetail
            benchmark={selectedBenchmark}
            onBack={handleBack}
            onNext={handleNext}
            onTransfer={() => setTransferOpen(true)}
            onConvert={() => setConvertOpen(true)}
            onUpdate={handleUpdate}
          />
        </div>
      )}

      {/* ===== 新建对标弹窗 ===== */}
      <BenchmarkForm
        open={formOpen}
        onOpenChange={setFormOpen}
        currentUser={CURRENT_USER}
        onCreated={loadData}
      />

      {/* ===== 转让负责人弹窗 ===== */}
      <BenchmarkTransfer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        benchmarkId={selectedBenchmark?.id || null}
        currentAssignee={selectedBenchmark?.assignee || ""}
        currentUser={CURRENT_USER}
        onTransferred={handleTransferSuccess}
      />

      {/* ===== 转化弹窗 ===== */}
      <BenchmarkConvert
        open={convertOpen}
        onOpenChange={setConvertOpen}
        benchmark={selectedBenchmark}
        onConverted={handleConvertSuccess}
      />

      {/* ===== 筛选底部 Sheet ===== */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} initialFocus={false}>
          <SheetHeader className="pb-3 pt-2">
            <SheetTitle className="text-center text-[17px] font-semibold">筛选</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-4 space-y-2">
            <div className="bg-secondary/20 rounded-[14px] overflow-hidden">
              {filterTabs.map((tab, idx) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveFilter(tab.value)
                    setFilterSheetOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-4 min-h-14 transition-colors ${
                    idx !== filterTabs.length - 1 ? "border-b border-border/50" : ""
                  } ${
                    activeFilter === tab.value
                      ? "active:bg-secondary/40"
                      : "active:bg-muted/50"
                  }`}
                >
                  <span className="text-[17px] font-normal">{tab.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] text-muted-foreground tabular-nums">
                      {counts[tab.value] || 0}
                    </span>
                    {activeFilter === tab.value && (
                      <Check className="size-5 text-foreground" strokeWidth={2} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function BenchmarkPageWrapper() {
  return (
    <Suspense fallback={null}>
      <BenchmarkPage />
    </Suspense>
  )
}
