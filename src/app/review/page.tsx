"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef } from "react"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { ReviewCard } from "@/components/review/review-card"
import { ReviewForm } from "@/components/review/review-form"
import { ReviewDetail } from "@/components/review/review-detail"
import { getReviewRecords, getReviewRecord } from "@/lib/review"
import type { ReviewRecord, ReviewStatus } from "@/lib/db"
import { Plus, ClipboardList } from "lucide-react"


// ========== 筛选 Tab 配置 ==========
const filterTabs: { value: ReviewStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待复盘" },
  { value: "in_progress", label: "复盘中" },
  { value: "completed", label: "已完成" },
]


// ========== 页面组件 ==========
export default function ReviewPage() {
  // ----- 列表状态 -----
  const [records, setRecords] = useState<ReviewRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<ReviewStatus | "all">("all")
  const [searchText, setSearchText] = useState("")

  // ----- 表单状态 -----
  const [formOpen, setFormOpen] = useState(false)

  // ----- 详情状态 -----
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ----- 首次加载用骨架屏 -----
  const firstLoadRef = useRef(true)

  const loadRecords = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) setIsLoading(true)
    try {
      const params = activeTab !== "all" ? { status: activeTab } : undefined
      const list = await getReviewRecords(params)
      setRecords(list)
    } catch (error) {
      console.error("加载失败:", error)
    } finally {
      if (showSkeleton) setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadRecords(firstLoadRef.current)
    firstLoadRef.current = false
  }, [loadRecords])


  // ----- 操作处理 -----
  function handleNew() {
    setFormOpen(true)
  }

  async function handleCardClick(record: ReviewRecord) {
    if (!record.id) return
    const fresh = await getReviewRecord(record.id)
    setDetailId(fresh?.id || record.id)
    setDetailOpen(true)
  }

  function handleUpdated() {
    loadRecords(false)
  }

  function handleCreated(id: string) {
    loadRecords(false)
    setDetailId(id)
    setDetailOpen(true)
  }


  // ----- 打开新建 -----
  function handleCreate() {
    setFormOpen(true)
  }


  // ----- 搜索筛选 -----
  const filteredRecords = records.filter(r => {
    if (searchText) {
      const text = searchText.toLowerCase()
      const matchTitle = r.title.toLowerCase().includes(text)
      const matchComment = r.dataComment?.toLowerCase().includes(text)
      const matchGood = r.goodItems?.some(item => item.description?.toLowerCase().includes(text))
      const matchBad = r.badItems?.some(item => item.description?.toLowerCase().includes(text))
      return matchTitle || matchComment || matchGood || matchBad
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="复盘记录"
        description="五模块复盘结构，经验指导下次创作"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索复盘..."
        createEnabled={true}
        onCreate={handleCreate}
        className="md:px-6 lg:px-8"
      >
        {/* 筛选栏 */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterTabs.map(tab => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "ghost"}
              size="xs"
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {/* 内容区 */}
      <div className="px-5 md:px-6 lg:px-8 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">

      {/* 三态渲染 */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchText ? "没有匹配的复盘" : activeTab === "all" ? "还没有复盘记录" : "该状态暂无记录"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText ? "试试调整搜索关键词" : "单条视频复盘或周期性汇总复盘"}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            新建复盘
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(record => (
            <ReviewCard
              key={record.id}
              record={record}
              onClick={() => handleCardClick(record)}
            />
          ))}
        </div>
      )}

      </div>

      {/* 新建复盘弹窗 */}
      <ReviewForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={handleCreated}
      />

      {/* 详情弹窗 */}
      <ReviewDetail
        recordId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
      />
    </>
  )
}