"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef } from "react"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { PublishCard } from "@/components/publish/publish-card"
import { PublishForm } from "@/components/publish/publish-form"
import { PublishDetail } from "@/components/publish/publish-detail"
import { getPublishRecords, getPublishRecord } from "@/lib/publish"
import type { PublishRecord, PublishStatus } from "@/lib/db"
import { Plus, UploadCloud } from "lucide-react"


// ========== 筛选 Tab 配置 ==========
const filterTabs: { value: PublishStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
]


// ========== 页面组件 ==========
export default function PublishPage() {
  // ----- 列表状态 -----
  const [records, setRecords] = useState<PublishRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<PublishStatus | "all">("all")
  const [searchText, setSearchText] = useState("")

  // ----- 表单状态 -----
  const [formOpen, setFormOpen] = useState(false)

  // ----- 详情状态 -----
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)


  // ----- 加载数据 -----
  // 首次加载显示骨架屏，后续切换 Tab 静默刷新（不闪骨架屏）
  const firstLoadRef = useRef(true)

  const loadRecords = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) setIsLoading(true)
    try {
      const params = activeTab !== "all" ? { status: activeTab } : undefined
      const list = await getPublishRecords(params)
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


  // ----- 打开新建 -----
  function handleNew() {
    setFormOpen(true)
  }

  // ----- 打开详情 -----
  async function handleCardClick(record: PublishRecord) {
    if (!record.id) return
    const fresh = await getPublishRecord(record.id)
    setDetailId(fresh?.id || record.id)
    setDetailOpen(true)
  }

  // ----- 创建/更新后刷新（静默） -----
  function handleUpdated() {
    loadRecords(false)
  }

  // ----- 创建后直接打开详情 -----
  function handleCreated(id: number) {
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
      return (
        r.title.toLowerCase().includes(text) ||
        r.description.toLowerCase().includes(text) ||
        r.fullContent.toLowerCase().includes(text) ||
        r.hashtags.some(tag => tag.toLowerCase().includes(text))
      )
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="制作发布"
        description="管理发布信息，标题公式参考 + 常用标签库"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索发布..."
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
        // 1. 加载中 → 骨架屏
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        // 2. 空数据 → 空状态
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UploadCloud className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchText ? "没有匹配的记录" : activeTab === "all" ? "还没有发布记录" : "该状态暂无记录"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText ? "试试调整搜索关键词" : "从已完成的生产任务创建发布记录"}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            从生产任务创建
          </Button>
        </div>
      ) : (
        // 3. 有数据 → 卡片网格
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(record => (
            <PublishCard
              key={record.id}
              record={record}
              onClick={() => handleCardClick(record)}
            />
          ))}
        </div>
      )}

      </div>

      {/* 新建发布记录弹窗 */}
      <PublishForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={handleCreated}
      />

      {/* 详情弹窗 */}
      <PublishDetail
        recordId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
      />
    </>
  )
}