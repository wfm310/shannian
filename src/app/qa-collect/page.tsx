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
import { Plus, MessageSquare } from "lucide-react"
// 页面头部组件
import { PageHeader } from "@/components/layout/page-header"
// 问答收集组件
import { QaForm } from "@/components/qa-collect/qa-form"
import { QaCard } from "@/components/qa-collect/qa-card"
import { QaDetail } from "@/components/qa-collect/qa-detail"
// API 函数
import {
  getQuestions, getQuestion,
  markFlashThoughtLinked,
} from "@/lib/qa-collect"
// 通知函数
import { sendNotification } from "@/lib/notification"
// 类型
import type { QaQuestion, QaStatus } from "@/lib/db"
// toast 提示
import { toast } from "sonner"


// ========== 常量 ==========
// 当前用户（和其它模块保持一致）
const CURRENT_USER = "峰岚"

// 筛选 Tabs 配置
// 和闪念池、对标拆解的筛选方式一致
const filterTabs: { value: QaStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "unanswered", label: "待回答" },
  { value: "answered", label: "已回答" },
  { value: "converted", label: "已转选题" },
]


// ========== 页面组件 ==========
export const dynamic = "force-dynamic"

function QaCollectPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ----- 数据状态 -----
  const [questions, setQuestions] = useState<QaQuestion[]>([])  // 问答列表
  const [isLoading, setIsLoading] = useState(true)               // 加载状态
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<QaStatus | "all">("all")  // 当前筛选 Tab
  const [searchText, setSearchText] = useState("")

  // ----- 新建弹窗状态 -----
  const [formOpen, setFormOpen] = useState(false)
  const [prefillContent, setPrefillContent] = useState<string | undefined>(undefined)
  const [prefillAnswer, setPrefillAnswer] = useState<string | undefined>(undefined)

  // ----- 详情弹窗状态 -----
  const [detailQuestion, setDetailQuestion] = useState<QaQuestion | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ----- 闪念池联动跟踪 -----
  // flashLinkRef：记录闪念 ID 和内容，创建成功后用来回写关联
  // flashLinkedRef：标记是否已成功创建（关闭弹窗时判断是发成功通知还是失败通知）
  const flashLinkRef = useRef<{ flashId: string; content: string } | null>(null)
  const flashLinkedRef = useRef(false)


  // ----- 加载数据 -----
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // activeTab 为 "all" 时不传 status，否则按状态筛选
      const data = await getQuestions(
        activeTab === "all" ? undefined : { status: activeTab }
      )
      setQuestions(data)
    } catch (error) {
      console.error("加载问答列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])


  // ----- 检测闪念池联动 URL 参数 -----
  // URL 格式：/qa-collect?from=flash-thought&flashId=xxx&content=xxx&thought=归类的想法
  useEffect(() => {
    const from = searchParams.get("from")
    const flashIdStr = searchParams.get("flashId")
    const content = searchParams.get("content")
    const thought = searchParams.get("thought")

    if (from === "flash-thought" && content) {
      // 重置创建状态标记
      flashLinkedRef.current = false

      // 解析闪念 ID
      const flashId = flashIdStr ?? ""

      // 记录联动信息
      flashLinkRef.current = {
        flashId,
        content: decodeURIComponent(content),
      }

      // 预填问题内容（闪念内容）和答案（归类的想法）并打开弹窗
      setPrefillContent(decodeURIComponent(content))
      setPrefillAnswer(thought ? decodeURIComponent(thought) : "")
      setFormOpen(true)

      // 清除 URL 参数（避免刷新重复触发）
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])


  // ----- 检测详情打开 URL 参数 -----
  // URL 格式：/qa-collect?id=xxx
  // 从选题详情"查看来源"跳转回来时自动打开问答详情
  useEffect(() => {
    if (isLoading) return
    const idStr = searchParams.get("id")
    if (idStr) {
      const id = idStr
      if (id) {
        getQuestion(id).then(q => {
          if (q) {
            setDetailQuestion(q)
            setDetailOpen(true)
            router.replace(pathname, { scroll: false })
          }
        })
      }
    }
  }, [searchParams, isLoading, router, pathname])


  // ----- 新建成功回调 -----
  // 闪念池联动时，创建成功后回写关联 + 发成功通知
  function handleCreated(id: string) {
    flashLinkedRef.current = true

    // 如果是闪念池联动，回写关联并发通知
    if (flashLinkRef.current?.flashId) {
      // 把 flashId 存到局部变量，避免异步回调执行时 ref 已被清理
      const flashId = flashLinkRef.current.flashId
      markFlashThoughtLinked(flashId, id).then(() => {
        sendNotification({
          type: "module",
          title: "问答创建成功",
          content: `闪念池联动创建的问答已成功`,
          relatedModule: "flash-thought",
          relatedId: flashId,
          receiver: CURRENT_USER,
        })
      })
    }

    // 清理联动状态
    flashLinkRef.current = null
    setPrefillContent(undefined)
    loadData()
  }


  // ----- 表单关闭回调 -----
  // 如果是闪念池联动但未创建成功，发失败通知
  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) {
      // 闪念池联动失败：发通知
      if (flashLinkRef.current && !flashLinkedRef.current && flashLinkRef.current.flashId) {
        sendNotification({
          type: "module",
          title: "问答未创建成功",
          content: `闪念池联动的问答未创建成功，可在闪念池中重新发起`,
          relatedModule: "flash-thought",
          relatedId: flashLinkRef.current.flashId,
          receiver: CURRENT_USER,
        })
      }
      // 清理状态
      flashLinkRef.current = null
      setPrefillContent(undefined)
      loadData()
    }
  }


  // ----- 打开新建弹窗（手动） -----
  function handleCreate() {
    setPrefillContent(undefined)
    flashLinkRef.current = null
    setFormOpen(true)
  }


  // ----- 打开详情 -----
  function handleOpenDetail(id: string) {
    getQuestion(id).then(q => {
      if (q) {
        setDetailQuestion(q)
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


  // ----- 添加答案后刷新 -----
  // 重新获取详情数据（更新答案数量）+ 刷新列表（更新答案数量）
  function handleAnswerAdded() {
    if (detailQuestion?.id) {
      getQuestion(detailQuestion.id).then(q => {
        if (q) setDetailQuestion(q)
      })
    }
    loadData()
  }


  // ----- 搜索筛选 -----
  const filteredQuestions = questions.filter(q => {
    if (searchText) {
      const text = searchText.toLowerCase()
      const matchContent = q.content.toLowerCase().includes(text)
      const matchAnswers = q.answers.some(a => a.content.toLowerCase().includes(text))
      if (!matchContent && !matchAnswers) return false
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="问答收集"
        description="收集问题与答案，可转化为选题"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索问答..."
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
      ) : filteredQuestions.length === 0 ? (
        // ---- 空状态 ----
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {searchText ? "没有匹配的问答" : activeTab !== "all" ? "没有匹配的问答" : "暂无问答"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText || activeTab !== "all" ? "试试调整筛选条件" : "点击右上角按钮开始添加"}
          </p>
          {activeTab === "all" && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-4" />
              新建问答
            </Button>
          )}
        </div>
      ) : (
        // ---- 有数据：卡片网格 ----
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map(q => (
            <QaCard key={q.id} question={q} onOpen={handleOpenDetail} />
          ))}
        </div>
      )}

      </div>

      {/* 新建问答弹窗 */}
      <QaForm
        open={formOpen}
        onOpenChange={handleFormClose}
        prefillContent={prefillContent}
        prefillAnswer={prefillAnswer}
        onCreated={handleCreated}
      />

      {/* 问答详情弹窗 */}
      <QaDetail
        question={detailQuestion}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onAnswerAdded={handleAnswerAdded}
      />
    </>
  )
}

export default function QaCollectPageWrapper() {
  return (
    <Suspense fallback={null}>
      <QaCollectPage />
    </Suspense>
  )
}
