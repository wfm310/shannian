"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
// UI 组件
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
// 图标
import { Plus, Sparkles } from "lucide-react"
// 页面头部组件
import { PageHeader } from "@/components/layout/page-header"
// 灵感记录组件
import { InspirationForm } from "@/components/inspiration/inspiration-form"
import { InspirationCard } from "@/components/inspiration/inspiration-card"
import { InspirationDetail } from "@/components/inspiration/inspiration-detail"
// API 函数
import {
  getInspirations, getInspiration,
  markFlashThoughtLinked,
} from "@/lib/inspiration"
// 对标 API（从对标转化时用）
import { getBenchmark, markInspirationCreated } from "@/lib/benchmark"
// 通知函数
import { sendNotification } from "@/lib/notification"
// 类型
import type { Inspiration, InspirationStatus } from "@/lib/db"
// toast 提示
import { toast } from "sonner"


// ========== 常量 ==========
const CURRENT_USER = "峰岚"

// 筛选 Tabs 配置
const filterTabs: { value: InspirationStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "draft", label: "记录中" },
  { value: "completed", label: "已完成" },
  { value: "converted", label: "已转选题" },
]


// ========== 页面组件 ==========
export const dynamic = "force-dynamic"

function InspirationPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ----- 数据状态 -----
  const [inspirations, setInspirations] = useState<Inspiration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<InspirationStatus | "all">("all")
  const [searchText, setSearchText] = useState("")

  // ----- 表单弹窗状态 -----
  const [formOpen, setFormOpen] = useState(false)
  const [editingInspiration, setEditingInspiration] = useState<Inspiration | null>(null)
  const [prefillData, setPrefillData] = useState<{
    content: string
    thought?: string
    conclusion?: string
  } | null>(null)

  // ----- 详情弹窗状态 -----
  const [detailInspiration, setDetailInspiration] = useState<Inspiration | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ----- 联动跟踪 -----
  // flashLinkRef：闪念池联动信息（创建成功后回写关联）
  // flashLinkedRef：标记闪念池联动是否已创建
  const flashLinkRef = useRef<{ flashId: string; content: string } | null>(null)
  const flashLinkedRef = useRef(false)

  // benchmarkLinkRef：对标拆解联动信息
  // benchmarkLinkedRef：标记对标联动是否已创建
  const benchmarkLinkRef = useRef<{ benchmarkId: string } | null>(null)
  const benchmarkLinkedRef = useRef(false)


  // ----- 加载数据 -----
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getInspirations(
        activeTab === "all" ? undefined : { status: activeTab }
      )
      setInspirations(data)
    } catch (error) {
      console.error("加载灵感列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])


  // ----- 检测闪念池联动 URL 参数 -----
  // URL 格式：/inspiration?from=flash-thought&flashId=xxx&content=闪念内容&thought=归类的想法
  useEffect(() => {
    const from = searchParams.get("from")
    const flashIdStr = searchParams.get("flashId")
    const content = searchParams.get("content")
    const thought = searchParams.get("thought")

    if (from === "flash-thought" && flashIdStr && content) {
      const flashId = flashIdStr
      if (!flashId) return

      flashLinkedRef.current = false
      flashLinkRef.current = {
        flashId,
        content: decodeURIComponent(content),
      }

      // 闪念内容 → 灵感内容，归类的想法 → 思考过程
      setPrefillData({
        content: decodeURIComponent(content),
        thought: thought ? decodeURIComponent(thought) : "",
      })
      setEditingInspiration(null)
      setFormOpen(true)

      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])


  // ----- 检测对标拆解联动 URL 参数 -----
  // URL 格式：/inspiration?from=benchmark&sourceId=xxx
  useEffect(() => {
    const from = searchParams.get("from")
    const sourceIdStr = searchParams.get("sourceId")

    if (from === "benchmark" && sourceIdStr) {
      const sourceId = sourceIdStr
      if (!sourceId) return

      benchmarkLinkedRef.current = false

      // 获取对标记录，预填三段内容
      getBenchmark(sourceId).then(benchmark => {
        if (!benchmark) {
          toast.error("找不到对应的对标记录")
          return
        }

        // 映射：凝练选题→灵感，视频文案→思考过程，凝练文案→结论
        setPrefillData({
          content: benchmark.topicTitle || "",
          thought: benchmark.videoScript || "",
          conclusion: benchmark.topicCopy || "",
        })
        benchmarkLinkRef.current = { benchmarkId: sourceId }
        setEditingInspiration(null)
        setFormOpen(true)

        router.replace(pathname, { scroll: false })
      }).catch(() => {
        toast.error("获取对标记录失败")
      })
    }
  }, [searchParams, router, pathname])


  // ----- 检测详情打开 URL 参数 -----
  // URL 格式：/inspiration?id=xxx
  useEffect(() => {
    if (isLoading) return
    const idStr = searchParams.get("id")
    if (idStr) {
      const id = idStr
      getInspiration(id).then((ins) => {
        if (ins) {
          setDetailInspiration(ins)
          setDetailOpen(true)
          router.replace(pathname, { scroll: false })
        }
      })
    }
  }, [searchParams, isLoading, router, pathname])


  // ----- 新建成功回调 -----
  function handleCreated(id: string) {
    // 闪念池联动：回写关联 + 发成功通知
    if (flashLinkRef.current?.flashId) {
      flashLinkedRef.current = true
      const flashId = flashLinkRef.current.flashId
      markFlashThoughtLinked(flashId, id).then(() => {
        sendNotification({
          type: "module",
          title: "灵感创建成功",
          content: `闪念池联动的灵感已创建成功`,
          relatedModule: "flash-thought",
          relatedId: flashId,
          receiver: CURRENT_USER,
        })
      })
    }

    // 对标拆解联动：回写关联 + 发成功通知
    if (benchmarkLinkRef.current?.benchmarkId) {
      benchmarkLinkedRef.current = true
      const benchmarkId = benchmarkLinkRef.current.benchmarkId
      markInspirationCreated(benchmarkId, id).then(() => {
        sendNotification({
          type: "module",
          title: "灵感创建成功",
          content: `对标拆解转化的灵感已创建成功`,
          relatedModule: "benchmark",
          relatedId: benchmarkId,
          receiver: CURRENT_USER,
        })
      })
    }

    // 清理状态
    flashLinkRef.current = null
    benchmarkLinkRef.current = null
    setPrefillData(null)
    loadData()
  }


  // ----- 表单关闭回调 -----
  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) {
      // 闪念池联动失败通知
      if (flashLinkRef.current && !flashLinkedRef.current && flashLinkRef.current.flashId) {
        sendNotification({
          type: "module",
          title: "灵感未创建成功",
          content: `闪念池联动的灵感未创建成功，可在闪念池中重新发起`,
          relatedModule: "flash-thought",
          relatedId: flashLinkRef.current.flashId,
          receiver: CURRENT_USER,
        })
      }
      // 对标拆解联动失败通知
      if (benchmarkLinkRef.current && !benchmarkLinkedRef.current && benchmarkLinkRef.current.benchmarkId) {
        sendNotification({
          type: "module",
          title: "灵感未创建成功",
          content: `对标拆解转化的灵感未创建成功，请重新创建`,
          relatedModule: "benchmark",
          relatedId: benchmarkLinkRef.current.benchmarkId,
          receiver: CURRENT_USER,
        })
      }
      // 清理状态
      flashLinkRef.current = null
      benchmarkLinkRef.current = null
      setPrefillData(null)
      setEditingInspiration(null)
      loadData()
    }
  }


  // ----- 打开新建弹窗（手动） -----
  function handleCreate() {
    setEditingInspiration(null)
    setPrefillData(null)
    flashLinkRef.current = null
    benchmarkLinkRef.current = null
    setFormOpen(true)
  }


  // ----- 打开详情 -----
  function handleOpenDetail(id: string) {
    getInspiration(id).then(ins => {
      if (ins) {
        setDetailInspiration(ins)
        setDetailOpen(true)
      }
    })
  }


  // ----- 详情关闭回调 -----
  function handleDetailClose(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      loadData()
    }
  }


  // ----- 编辑保存后刷新详情 -----
  function handleDetailEdited() {
    if (detailInspiration?.id) {
      getInspiration(detailInspiration.id).then(ins => {
        if (ins) setDetailInspiration(ins)
      })
    }
    loadData()
  }


  // ----- 搜索筛选 -----
  const filteredInspirations = inspirations.filter(ins => {
    if (searchText) {
      const text = searchText.toLowerCase()
      return (
        ins.content.toLowerCase().includes(text) ||
        ins.thoughtProcess.toLowerCase().includes(text) ||
        ins.conclusion.toLowerCase().includes(text)
      )
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="灵感记录"
        description="记录灵感，沉淀思考，转化为选题"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索灵感..."
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
        // ---- 加载中：骨架屏 ----
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredInspirations.length === 0 ? (
        // ---- 空状态 ----
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkles className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {searchText ? "没有匹配的灵感" : activeTab !== "all" ? "没有匹配的灵感" : "暂无灵感"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText || activeTab !== "all" ? "试试调整筛选条件" : "点击右上角按钮开始记录灵感"}
          </p>
          {activeTab === "all" && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-4" />
              新建灵感
            </Button>
          )}
        </div>
      ) : (
        // ---- 有数据：卡片网格 ----
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInspirations.map(ins => (
            <InspirationCard key={ins.id} inspiration={ins} onOpen={handleOpenDetail} />
          ))}
        </div>
      )}

      </div>

      {/* 新建/编辑弹窗 */}
      <InspirationForm
        open={formOpen}
        onOpenChange={handleFormClose}
        inspiration={editingInspiration}
        prefillContent={prefillData?.content}
        prefillThought={prefillData?.thought}
        prefillConclusion={prefillData?.conclusion}
        onSaved={loadData}
        onCreated={handleCreated}
      />

      {/* 详情弹窗 */}
      <InspirationDetail
        inspiration={detailInspiration}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdited={handleDetailEdited}
      />
    </>
  )
}

export default function InspirationPageWrapper() {
  return (
    <Suspense fallback={null}>
      <InspirationPage />
    </Suspense>
  )
}
