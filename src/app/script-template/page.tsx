"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef } from "react"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { ScriptTemplateCard } from "@/components/script-template/script-template-card"
import { ScriptTemplateForm } from "@/components/script-template/script-template-form"
import { ScriptTemplateDetail } from "@/components/script-template/script-template-detail"
import {
  getScriptTemplates, getScriptTemplate,
} from "@/lib/script-template"
import type { ScriptTemplate, FrameworkType } from "@/lib/db"
import { Plus, Layers } from "lucide-react"
import { toast } from "sonner"


// ========== 筛选 Tab 配置 ==========
// 全部 + 5种类型
const filterTabs: { value: FrameworkType | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "standard", label: "标准干货型" },
  { value: "story", label: "故事案例型" },
  { value: "correction", label: "纠错对比型" },
  { value: "checklist", label: "清单盘点型" },
  { value: "qa", label: "问答拆解型" },
]


// ========== 页面组件 ==========
export default function ScriptTemplatePage() {
  // ----- 列表状态 -----
  const [templates, setTemplates] = useState<ScriptTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeTab, setActiveTab] = useState<FrameworkType | "all">("all")
  const [searchText, setSearchText] = useState("")

  // ----- 表单状态 -----
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScriptTemplate | null>(null)

  // ----- 详情状态 -----
  const [detailTemplate, setDetailTemplate] = useState<ScriptTemplate | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)


  // ----- 加载数据 -----
  const firstLoadRef = useRef(true)

  const loadTemplates = useCallback(async (showSkeleton: boolean = false) => {
    if (showSkeleton) setIsLoading(true)
    try {
      const params = activeTab !== "all" ? { frameworkType: activeTab } : undefined
      const list = await getScriptTemplates(params)
      setTemplates(list)
    } catch (error) {
      console.error("加载失败:", error)
    } finally {
      if (showSkeleton) setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadTemplates(firstLoadRef.current)
    firstLoadRef.current = false
  }, [loadTemplates])


  // ----- 打开新建 -----
  function handleNew() {
    setEditing(null)
    setFormOpen(true)
  }

  // ----- 打开详情 -----
  async function handleCardClick(template: ScriptTemplate) {
    // 重新查一次最新数据
    const fresh = await getScriptTemplate(template.id!)
    setDetailTemplate(fresh || template)
    setDetailOpen(true)
  }

  // ----- 详情里点编辑 -----
  function handleEdit() {
    setEditing(detailTemplate)
    setDetailOpen(false)
    setFormOpen(true)
  }

  // ----- 保存成功后刷新（静默，不闪骨架屏） -----
  function handleSaved() {
    loadTemplates(false)
    setEditing(null)
  }

  // ----- 删除成功后刷新（静默，不闪骨架屏） -----
  function handleDeleted() {
    loadTemplates(false)
    setDetailTemplate(null)
    toast.success("已删除")
  }


  // ----- 打开新建 -----
  function handleCreate() {
    setEditing(null)
    setFormOpen(true)
  }


  // ----- 搜索筛选 -----
  const filteredTemplates = templates.filter(t => {
    if (searchText) {
      const text = searchText.toLowerCase()
      return (
        t.title.toLowerCase().includes(text) ||
        t.steps.some((s: { name: string; guidance: string }) => s.name.toLowerCase().includes(text) || s.guidance.toLowerCase().includes(text))
      )
    }
    return true
  })


  // ===== 渲染 =====
  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="脚本框架库"
        description="管理 5 种脚本框架模板，供对标拆解和内容生产引用"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索脚本..."
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
      ) : filteredTemplates.length === 0 ? (
        // 2. 空数据 → 空状态
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchText ? "没有匹配的框架" : activeTab === "all" ? "还没有脚本框架" : "该类型暂无框架"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchText ? "试试调整搜索关键词" : "新建一个框架，选类型后自动带出步骤和指导说明"}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            新建框架
          </Button>
        </div>
      ) : (
        // 3. 有数据 → 卡片网格
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <ScriptTemplateCard
              key={template.id}
              template={template}
              onClick={() => handleCardClick(template)}
            />
          ))}
        </div>
      )}

      </div>

      {/* 新建/编辑弹窗 */}
      <ScriptTemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={handleSaved}
      />

      {/* 详情弹窗 */}
      <ScriptTemplateDetail
        template={detailTemplate}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
      />
    </>
  )
}