"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TopicCard } from "@/components/topic/topic-card"
import { TopicForm } from "@/components/topic/topic-form"
import { TopicDetail } from "@/components/topic/topic-detail"
import { PageHeader } from "@/components/layout/page-header"
import { getTopics, getTopic, filterTabs } from "@/lib/topic"
import { getBenchmark, markTopicCreated, needsTypeConfig, needsCategoryConfig, needsValueConfig, presentationFormConfig, structureTypeConfig } from "@/lib/benchmark"
// 问答收集 API（从问答转选题时用）
import { getQuestion, markAnswerTopicLinked } from "@/lib/qa-collect"
// 灵感记录 API（从灵感转选题时用）
import { getInspiration, markTopicCreated as markInspirationTopicCreated } from "@/lib/inspiration"
// 闪念池 API（从闪念池联动创建选题时用）
import { markFlashThoughtLinked } from "@/lib/flash-thought"
import { sendNotification } from "@/lib/notification"
import { syncTopicProgressToTodos } from "@/lib/progress-events"
import type { Topic, TopicSource } from "@/lib/db"
import { Plus, Search, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"


// ========== 常量 ==========
const CURRENT_USER = "峰岚"


// ========== 预填数据类型 ==========
interface PrefillData {
  source: TopicSource
  sourceId: string | null
  topicTitle: string
  topicNote: string
  audience: string
  demand: string
  contentDimension: string
}


// ========== 页面组件 ==========
export const dynamic = "force-dynamic"

function TopicLibraryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ----- 数据状态 -----
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [searchText, setSearchText] = useState("")

  // ----- 筛选状态 -----
  const [activeFilter, setActiveFilter] = useState("all")

  // ----- 表单弹窗状态 -----
  const [formOpen, setFormOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)

  // ----- 详情弹窗状态 -----
  const [detailTopic, setDetailTopic] = useState<Topic | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ----- 跟踪转化时是否成功创建了选题 -----
  const topicCreatedRef = useRef(false)

  // ----- 跟踪从问答收集转化时的关联信息 -----
  // 记录问题 ID 和答案 ID，选题创建成功后用来回写关联
  const qaConversionRef = useRef<{ questionId: string; answerId: string } | null>(null)

  // ----- 跟踪从闪念池联动时的关联信息 -----
  // 记录闪念 ID，选题创建成功后用来回写关联
  const flashLinkRef = useRef<{ flashId: string; content: string } | null>(null)
    // ----- 跟踪从灵感记录转化时的关联信息 -----
  const inspirationLinkRef = useRef<{ inspirationId: string } | null>(null)
        inspirationLinkRef.current = null


  // ----- 加载数据 -----
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getTopics(activeFilter === "all" ? undefined : activeFilter)
      setTopics(data)
    } catch (error) {
      console.error("加载选题列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    loadData()
  }, [loadData])


  // ----- 读取 URL 参数，从对标拆解转化时自动获取数据并打开表单 -----
  // URL 格式：/topic-library?from=benchmark&sourceId=xxx
  useEffect(() => {
    const from = searchParams.get("from")
    const sourceIdStr = searchParams.get("sourceId")
    if (from === "benchmark" && sourceIdStr) {
      const sourceId = sourceIdStr
      if (!sourceId) return

      // 重置创建状态标记
      topicCreatedRef.current = false

      // 通过 sourceId 获取对标记录，提取快照数据
      getBenchmark(sourceId).then(benchmark => {
        if (!benchmark) {
          toast.error("找不到对应的对标记录")
          return
        }

        // 格式化维度数据（快照复制）
        // 人群维度
        const audienceParts: string[] = []
        if (benchmark.audienceIdentity) audienceParts.push(`身份：${benchmark.audienceIdentity}`)
        if (benchmark.audienceStage) audienceParts.push(`阶段：${benchmark.audienceStage}`)
        if (benchmark.audienceGoal) audienceParts.push(`目标：${benchmark.audienceGoal}`)
        if (benchmark.audiencePainPoint) audienceParts.push(`卡点：${benchmark.audiencePainPoint}`)
        if (benchmark.audienceEmotion) audienceParts.push(`情绪：${benchmark.audienceEmotion}`)

        // 需求维度
        const demandParts: string[] = []
        if (benchmark.needsType) demandParts.push(`需求类型：${needsTypeConfig[benchmark.needsType]}`)
        if (benchmark.needsCategory) demandParts.push(`需求划分：${needsCategoryConfig[benchmark.needsCategory]}`)
        if (benchmark.needsValue) demandParts.push(`内容价值：${needsValueConfig[benchmark.needsValue]}`)
        if (benchmark.coreProblem) demandParts.push(`核心问题：${benchmark.coreProblem}`)

        // 内容维度
        const contentParts: string[] = []
        if (benchmark.presentationForm) contentParts.push(`展现形式：${presentationFormConfig[benchmark.presentationForm]}`)
        if (benchmark.structureType) contentParts.push(`结构类型：${structureTypeConfig[benchmark.structureType]?.label}`)
        if (benchmark.structureSteps && benchmark.structureSteps.length > 0) {
          contentParts.push(`步骤：${benchmark.structureSteps.length}步`)
        }

        // 组装预填数据
        // 选题标题 = 对标分析的最终凝练选题
        // 选题备注 = 对标分析的凝练出的文案
        const prefill: PrefillData = {
          source: "benchmark",
          sourceId,
          topicTitle: benchmark.topicTitle || "",
          topicNote: benchmark.topicCopy || "",
          audience: audienceParts.join("；"),
          demand: demandParts.join("；"),
          contentDimension: contentParts.join("；"),
        }

        setPrefillData(prefill)
        setEditingTopic(null) // 确保是新建模式
        setFormOpen(true)

        // 清除 URL 参数
        router.replace(pathname, { scroll: false })
      }).catch(() => {
        toast.error("获取对标记录失败")
      })
    }
  }, [searchParams, router, pathname])


  // ----- 读取 URL 参数，从问答收集转化时自动获取数据并打开表单 -----
  // URL 格式：/topic-library?from=qa&sourceId=问题ID&answerId=答案ID
  useEffect(() => {
    const from = searchParams.get("from")
    const sourceIdStr = searchParams.get("sourceId")
    const answerIdStr = searchParams.get("answerId")

    if (from === "qa" && sourceIdStr && answerIdStr) {
      const questionId = sourceIdStr
      const answerId = answerIdStr

      // 重置创建状态标记
      topicCreatedRef.current = false

      // 通过问题 ID 获取问答数据
      getQuestion(questionId).then(question => {
        if (!question) {
          toast.error("找不到对应的问答记录")
          return
        }

        // 找到对应的答案
        const answer = question.answers.find(a => a.id === answerId)
        if (!answer) {
          toast.error("找不到对应的答案")
          return
        }

        // 组装预填数据
        // 选题标题 = 问题内容
        // 选题备注 = 答案内容
        // 其它字段留空，让用户在选题表单里自己填
        const prefill: PrefillData = {
          source: "qa",
          sourceId: questionId,
          topicTitle: question.content,
          topicNote: answer.content,
          audience: "",
          demand: "",
          contentDimension: "",
        }

        // 记录问答关联信息（创建成功后回写用）
        qaConversionRef.current = { questionId, answerId }

        setPrefillData(prefill)
        setEditingTopic(null)
        setFormOpen(true)

        // 清除 URL 参数
        router.replace(pathname, { scroll: false })
      }).catch(() => {
        toast.error("获取问答记录失败")
      })
    }
  }, [searchParams, router, pathname])


  // ----- 读取 URL 参数，从闪念池联动时自动获取数据并打开表单 -----
  // URL 格式：/topic-library?from=flash-thought&flashId=闪念ID&content=闪念内容&thought=归类的想法
  useEffect(() => {
    const from = searchParams.get("from")
    const flashIdStr = searchParams.get("flashId")
    const content = searchParams.get("content")
    const thought = searchParams.get("thought")

    if (from === "flash-thought" && flashIdStr && content) {
      const flashId = flashIdStr ?? ""
      if (!flashId) return

      // 重置创建状态标记
      topicCreatedRef.current = false

      // 组装预填数据
      // 选题标题 = 闪念内容
      // 选题备注 = 归类的想法
      // source = "manual"（闪念是灵感来源，不是结构化转化）
      const prefill: PrefillData = {
        source: "manual",
        sourceId: null,
        topicTitle: decodeURIComponent(content),
        topicNote: thought ? decodeURIComponent(thought) : "",
        audience: "",
        demand: "",
        contentDimension: "",
      }

      // 记录闪念关联信息（创建成功后回写用）
      flashLinkRef.current = {
        flashId,
        content: decodeURIComponent(content),
      }

      setPrefillData(prefill)
      setEditingTopic(null)
      setFormOpen(true)

      // 清除 URL 参数
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])


  // ----- 读取 URL 参数 openId，自动打开选题详情 -----
  // URL 格式：/topic-library?openId=xxx
  useEffect(() => {
    if (isLoading) return
    const openIdStr = searchParams.get("openId")
    if (openIdStr) {
      const openId = openIdStr
      const found = topics.find(t => t.id === openId)
      if (found) {
        setDetailTopic(found)
        setDetailOpen(true)
        router.replace(pathname, { scroll: false })
      }
    }
  }, [searchParams, topics, isLoading, router, pathname])

    // ----- 读取 URL 参数，从灵感记录转化时自动获取数据并打开表单 -----
  // URL 格式：/topic-library?from=inspiration&sourceId=xxx
  useEffect(() => {
    const from = searchParams.get("from")
    const sourceIdStr = searchParams.get("sourceId")

    if (from === "inspiration" && sourceIdStr) {
      const sourceId = sourceIdStr
      if (!sourceId) return

      topicCreatedRef.current = false

      getInspiration(sourceId).then(inspiration => {
        if (!inspiration) {
          toast.error("找不到对应的灵感记录")
          return
        }

        // 组装预填数据
        // 选题标题 = 灵感内容
        // 选题备注 = 思考过程 + 结论（拼接）
        const noteParts: string[] = []
        if (inspiration.thoughtProcess) noteParts.push(inspiration.thoughtProcess)
        if (inspiration.conclusion) noteParts.push(inspiration.conclusion)

        const prefill: PrefillData = {
          source: "inspiration",
          sourceId,
          topicTitle: inspiration.content,
          topicNote: noteParts.join("\n\n"),
          audience: "",
          demand: "",
          contentDimension: "",
        }

        inspirationLinkRef.current = { inspirationId: sourceId }

        setPrefillData(prefill)
        setEditingTopic(null)
        setFormOpen(true)

        router.replace(pathname, { scroll: false })
      }).catch(() => {
        toast.error("获取灵感记录失败")
      })
    }
  }, [searchParams, router, pathname])


  // ----- 打开新建弹窗 -----
  function handleCreate() {
    setEditingTopic(null)
    setPrefillData(null)
    setFormOpen(true)
  }

  // ----- 打开详情 -----
  function handleOpenDetail(id: string) {
    const found = topics.find(t => t.id === id)
    if (found) {
      setDetailTopic(found)
      setDetailOpen(true)
    }
  }

  // ----- 点击编辑 -----
  function handleEdit(topic: Topic) {
    setDetailTopic(null)
    setDetailOpen(false)
    setEditingTopic(topic)
    setPrefillData(null)
    setFormOpen(true)
  }

  // ----- 选题创建成功回调（从对标/问答/闪念池转化时）-----
  function handleTopicCreated(topicId: string) {
    topicCreatedRef.current = true

    if (prefillData?.source === "benchmark" && prefillData.sourceId) {
      // 对标拆解转化：回写关联 + 发通知
      const benchmarkId = prefillData.sourceId
      markTopicCreated(benchmarkId, topicId).then(() => {
        sendNotification({
          type: "module",
          title: "选题创建成功",
          content: `对标拆解转化的选题「${prefillData.topicTitle}」已创建成功`,
          relatedModule: "benchmark",
          relatedId: benchmarkId,
          receiver: CURRENT_USER,
        })
      })
    } else if (prefillData?.source === "qa" && qaConversionRef.current) {
      // 问答收集转化：回写答案关联 + 发通知
      const { questionId, answerId } = qaConversionRef.current
      markAnswerTopicLinked(questionId, answerId, topicId).then(() => {
        sendNotification({
          type: "module",
          title: "选题创建成功",
          content: `问答收集转化的选题「${prefillData.topicTitle}」已创建成功`,
          relatedModule: "qa",
          relatedId: questionId,
          receiver: CURRENT_USER,
        })
      })
    } else if (flashLinkRef.current?.flashId) {
      // 闪念池联动：回写闪念关联 + 发通知
      const flashId = flashLinkRef.current.flashId
      markFlashThoughtLinked(flashId, topicId).then(() => {
        sendNotification({
          type: "module",
          title: "选题创建成功",
          content: `闪念池联动的选题「${prefillData?.topicTitle}」已创建成功`,
          relatedModule: "flash-thought",
          relatedId: flashId,
          receiver: CURRENT_USER,
        })
      })
    } else if (inspirationLinkRef.current?.inspirationId) {
      // 灵感记录转化：回写关联 + 发通知
      const inspirationId = inspirationLinkRef.current.inspirationId
      markInspirationTopicCreated(inspirationId, topicId).then(() => {
        sendNotification({
          type: "module",
          title: "选题创建成功",
          content: `灵感记录转化的选题「${prefillData?.topicTitle}」已创建成功`,
          relatedModule: "inspiration",
          relatedId: inspirationId,
          receiver: CURRENT_USER,
        })
      })
    }

    // 无论什么来源，新建了选题就同步待办进度
    syncTopicProgressToTodos()
  }

  // ----- 表单关闭回调 -----
  // 如果是联动转化但未创建成功，发失败通知
  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) {
      // 对标拆解转化失败
      if (prefillData?.source === "benchmark" && !topicCreatedRef.current && prefillData.sourceId) {
        sendNotification({
          type: "module",
          title: "选题未创建成功",
          content: `对标拆解转化的选题「${prefillData.topicTitle}」未创建成功，请重新创建`,
          relatedModule: "benchmark",
          relatedId: prefillData.sourceId,
          receiver: CURRENT_USER,
        })
      }
      // 问答收集转化失败
      if (prefillData?.source === "qa" && !topicCreatedRef.current && qaConversionRef.current) {
        sendNotification({
          type: "module",
          title: "选题未创建成功",
          content: `问答收集转化的选题「${prefillData.topicTitle}」未创建成功，请重新创建`,
          relatedModule: "qa",
          relatedId: qaConversionRef.current.questionId,
          receiver: CURRENT_USER,
        })
      }
      // 闪念池联动失败
      if (!topicCreatedRef.current && flashLinkRef.current?.flashId) {
        const flashId = flashLinkRef.current.flashId
        sendNotification({
          type: "module",
          title: "选题未创建成功",
          content: `闪念池联动的选题未创建成功，可在闪念池中重新发起`,
          relatedModule: "flash-thought",
          relatedId: flashId,
          receiver: CURRENT_USER,
        })
      }
            // 灵感记录联动失败
      if (!topicCreatedRef.current && inspirationLinkRef.current?.inspirationId) {
        sendNotification({
          type: "module",
          title: "选题未创建成功",
          content: `灵感记录转化的选题未创建成功，请重新创建`,
          relatedModule: "inspiration",
          relatedId: inspirationLinkRef.current.inspirationId,
          receiver: CURRENT_USER,
        })
      }
      loadData()
      setEditingTopic(null)
      setPrefillData(null)
      qaConversionRef.current = null
      flashLinkRef.current = null
    }
  }

  // ----- 详情关闭回调 -----
  function handleDetailClose(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      loadData()
    }
  }

  // ----- 搜索筛选 -----
  const filteredTopics = topics.filter(topic => {
    if (searchText) {
      const text = searchText.toLowerCase()
      return (
        topic.topicTitle.toLowerCase().includes(text) ||
        topic.topicNote.toLowerCase().includes(text)
      )
    }
    return true
  })


  // ----- 渲染 -----
  return (
    <>
      {/* 页面头部 - sticky 固定 */}
      <PageHeader
        title="选题库"
        description="收纳灵感素材，汇聚创作选题"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索选题标题或备注..."
        createEnabled={true}
        onCreate={handleCreate}
      >
        {/* 筛选标签 */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="flex w-full overflow-x-auto touch-scroll sm:w-fit sm:overflow-visible">
            {filterTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 px-3">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {/* 内容区 */}
      <div className="px-5 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-safe-3">

      {showSkeleton ? (
        <div className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {searchText || activeFilter !== "all" ? "没有匹配的选题" : "暂无选题"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText || activeFilter !== "all" ? "试试调整筛选条件" : "点击右上角按钮开始添加"}
          </p>
          {activeFilter === "all" && !searchText && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-4" />
              新建选题
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {filteredTopics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onOpen={handleOpenDetail}
            />
          ))}
        </div>
      )}

      </div>

      {/* 表单弹窗 */}
      <TopicForm
        open={formOpen}
        onOpenChange={handleFormClose}
        currentUser={CURRENT_USER}
        topic={editingTopic}
        prefill={prefillData}
        onSaved={loadData}
        onCreated={handleTopicCreated}
      />

      {/* 详情弹窗 */}
      <TopicDetail
        topic={detailTopic}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEdit}
      />
    </>
  )
}

export default function TopicLibraryPageWrapper() {
  return (
    <Suspense fallback={null}>
      <TopicLibraryPage />
    </Suspense>
  )
}
