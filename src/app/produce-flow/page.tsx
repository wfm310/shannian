"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef } from "react"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { ProductionCard } from "@/components/produce-flow/production-card"
import { ProductionForm } from "@/components/produce-flow/production-form"
import { ProductionDetail } from "@/components/produce-flow/production-detail"
import { getProductionTasks, getProductionTask } from "@/lib/produce-flow"
import type { ProductionTask, ProductionStatus } from "@/lib/db"
import { Plus, Workflow } from "lucide-react"


// ========== 筛选 Tab 配置 ==========
const filterTabs: { value: ProductionStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
]


// ========== 页面组件 ==========
export default function ProduceFlowPage() {
  // ----- 列表状态 -----
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<ProductionStatus | "all">("all")
  const [searchText, setSearchText] = useState("")

  // ----- 表单状态 -----
  const [formOpen, setFormOpen] = useState(false)

  // ----- 详情状态 -----
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)


  // ----- 加载数据 -----
  // 首次加载显示骨架屏，后续切换 Tab 静默刷新（不闪骨架屏）
  const firstLoadRef = useRef(true)

  const loadTasks = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) setIsLoading(true)
    try {
      const params = activeTab !== "all" ? { status: activeTab } : undefined
      const list = await getProductionTasks(params)
      setTasks(list)
    } catch (error) {
      console.error("加载失败:", error)
    } finally {
      if (showSkeleton) setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadTasks(firstLoadRef.current)
    firstLoadRef.current = false
  }, [loadTasks])


  // ----- 打开新建 -----
  function handleNew() {
    setFormOpen(true)
  }

  // ----- 打开详情 -----
  async function handleCardClick(task: ProductionTask) {
    if (!task.id) return
    // 重新查一次最新数据
    const fresh = await getProductionTask(task.id)
    setDetailTaskId(fresh?.id || task.id)
    setDetailOpen(true)
  }

  // ----- 创建/更新后刷新（静默） -----
  function handleUpdated() {
    loadTasks(false)
  }


  // ----- 打开新建 -----
  function handleCreate() {
    setFormOpen(true)
  }


  // ----- 搜索筛选 -----
  const filteredTasks = tasks.filter(t => {
    if (searchText) {
      const text = searchText.toLowerCase()
      return (
        t.title.toLowerCase().includes(text) ||
        t.rawContent.toLowerCase().includes(text) ||
        t.scriptSteps.some(s => s.content?.toLowerCase().includes(text))
      )
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="内容生产流程"
        description="追踪每条内容的生产进度，支持标准模式和即兴模式"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索生产..."
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
      <div className="px-5 md:px-6 lg:px-8 pt-4 pb-safe-3">

      {/* 三态渲染 */}
      {showSkeleton ? (
        // 1. 加载中 → 骨架屏
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        // 2. 空数据 → 空状态
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Workflow className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchText ? "没有匹配的任务" : activeTab === "all" ? "还没有生产任务" : "该状态暂无任务"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText ? "试试调整搜索关键词" : "新建一个任务，开始内容生产"}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            新建任务
          </Button>
        </div>
      ) : (
        // 3. 有数据 → 卡片网格
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <ProductionCard
              key={task.id}
              task={task}
              onClick={() => handleCardClick(task)}
            />
          ))}
        </div>
      )}

      </div>

      {/* 新建任务弹窗 */}
      <ProductionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={handleUpdated}
      />

      {/* 详情弹窗 */}
      <ProductionDetail
        taskId={detailTaskId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
      />
    </>
  )
}