"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import {
  getPublishRecord, updatePublishRecord, markAsPublished,
  getTags, addTag, incrementTagUsage,
  titleFormulaConfig, tagCategoryConfig, tagCategoryOrder,
  statusLabels,
} from "@/lib/publish"
import { db, type PublishRecord, type TitleFormula, type TagCategory, type TagLibrary } from "@/lib/db"
import { toast } from "sonner"
import { Save, Check, Link2, Plus, X, Tag, FileText } from "lucide-react"


// ========== 类型定义 ==========
interface PublishDetailProps {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}


// ========== 组件定义 ==========
export function PublishDetail({
  recordId, open, onOpenChange, onUpdated
}: PublishDetailProps) {
  // ----- 发布记录数据 -----
  const [record, setRecord] = useState<PublishRecord | null>(null)

  // ----- 表单字段（本地编辑状态） -----
  const [title, setTitle] = useState("")
  const [titleFormula, setTitleFormula] = useState<TitleFormula | null>(null)
  const [description, setDescription] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [fullContent, setFullContent] = useState("")
  const [videoUrl, setVideoUrl] = useState("")

  // ----- 标签库 -----
  const [tagLibrary, setTagLibrary] = useState<TagLibrary[]>([])
  const [newTag, setNewTag] = useState("")
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>("track")

  // ----- 加载状态 -----
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // ----- 关联生产任务标题 -----
  const [productionTitle, setProductionTitle] = useState("")

  // ----- 自动保存草稿 -----
  const draftData = { title, description, hashtags, fullContent, videoUrl }
  const { loadDraft, clearDraft } = useAutoSave(
    `publish-draft-${recordId}`,
    draftData,
    open && record?.status === "draft"
  )

  // ----- 打开时加载所有数据 -----
  useEffect(() => {
    if (!open || !recordId) return

    let mounted = true

    async function loadData() {
      // 1. 加载发布记录
      const r = await getPublishRecord(recordId!)
      if (!mounted || !r) return
      setRecord(r)
      setTitleFormula(r.titleFormula)

      // 2. 恢复草稿或加载已保存数据
      const draft = loadDraft()
      if (draft && r.status === "draft") {
        setTitle(draft.title || r.title)
        setDescription(draft.description || r.description)
        setHashtags(draft.hashtags || r.hashtags || [])
        setFullContent(draft.fullContent || r.fullContent)
        setVideoUrl(draft.videoUrl || r.videoUrl)
      } else {
        setTitle(r.title)
        setDescription(r.description)
        setHashtags(r.hashtags || [])
        setFullContent(r.fullContent)
        setVideoUrl(r.videoUrl)
      }

      // 3. 加载关联的生产任务标题
      const task = await db.productions.get(r.productionId)
      if (mounted) setProductionTitle(task?.title || "")

      // 4. 加载标签库
      const tags = await getTags()
      if (mounted) setTagLibrary(tags)
    }

    loadData()
    return () => { mounted = false }
  }, [open, recordId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 保存草稿到数据库 -----
  async function handleSave() {
    if (!record?.id) return
    setIsSaving(true)
    try {
      await updatePublishRecord(record.id, {
        title, titleFormula, description, hashtags, fullContent, videoUrl,
      })
      // 更新标签使用次数
      await incrementTagUsage(hashtags)
      clearDraft()
      toast.success("已保存")
      const updated = await getPublishRecord(record.id)
      if (updated) setRecord(updated)
      onUpdated?.()
    } catch {
      toast.error("保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  // ----- 标记为已发布 -----
  async function handlePublish() {
    if (!record?.id) return
    if (!videoUrl.trim()) {
      toast.error("请先填写视频链接")
      return
    }
    setIsPublishing(true)
    try {
      // 先保存当前内容
      await updatePublishRecord(record.id, {
        title, titleFormula, description, hashtags, fullContent, videoUrl,
      })
      await incrementTagUsage(hashtags)
      clearDraft()
      // 再标记为已发布
      await markAsPublished(record.id, videoUrl)
      const updated = await getPublishRecord(record.id)
      if (updated) setRecord(updated)
      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    } finally {
      setIsPublishing(false)
    }
  }

  // ----- 切换标签选中状态 -----
  function toggleTag(tagText: string) {
    setHashtags(prev =>
      prev.includes(tagText)
        ? prev.filter(t => t !== tagText)
        : [...prev, tagText]
    )
  }

  // ----- 添加自定义标签到标签库 -----
  async function handleAddTag() {
    if (!newTag.trim()) return
    try {
      await addTag(newTag, newTagCategory)
      setNewTag("")
      // 刷新标签库
      const tags = await getTags()
      setTagLibrary(tags)
      // 自动选中新添加的标签
      toggleTag(newTag.trim())
    } catch {
      // 错误已在 API 层处理
    }
  }

  // ----- 格式化时间 -----
  function formatDateTime(timestamp: number) {
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, "0")
    const m = date.getMinutes().toString().padStart(2, "0")
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${h}:${m}`
  }

  if (!record) return null

  const isDraft = record.status === "draft"
  const isPublished = record.status === "published"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col" initialFocus={false}>
        {/* ===== 头部（固定） ===== */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>发布详情</DialogTitle>
          <DialogDescription>
            填写发布信息，记录视频链接后标记为已发布
          </DialogDescription>
        </DialogHeader>

        {/* ===== 内容区（可滚动） ===== */}
        <div className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">

          {/* --- 基本信息 --- */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm text-muted-foreground">来源任务：</span>
                <span className="text-sm font-medium">{productionTitle}</span>
              </div>
              <Badge variant={isPublished ? "default" : "secondary"}>
                {statusLabels[record.status]}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              创建于 {formatDateTime(record.createdAt)}
              {record.publishTime && (
                <span className="ml-3">发布于 {formatDateTime(record.publishTime)}</span>
              )}
            </div>
          </div>

          <Separator />

          {/* --- 标题 + 公式参考 --- */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              标题
              <span className="text-muted-foreground ml-1 text-xs">
                （必须包含 1~2 个核心搜索词，关键词放前半段）
              </span>
            </Label>
            <Input
              value={title}
              onChange={(e) => isDraft && setTitle(e.target.value)}
              readOnly={!isDraft}
              placeholder="输入发布标题"
              className={!isDraft ? "bg-muted/30" : ""}
            />

            {/* 标题公式参考 */}
            {isDraft && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">标题公式参考</Label>
                  <span className="text-xs text-muted-foreground">（点击选用）</span>
                </div>
                <div className="space-y-1">
                  {(Object.keys(titleFormulaConfig) as TitleFormula[]).map(key => {
                    const config = titleFormulaConfig[key]
                    const isSelected = titleFormula === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTitleFormula(isSelected ? null : key)}
                        className={`w-full text-left rounded-md border p-2 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                            {key}
                          </Badge>
                          <span className="text-sm font-medium">{config.label}</span>
                          {isSelected && <Check className="size-3 text-primary ml-auto" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {config.structure} · {config.scenario}
                        </div>
                        <div className="text-xs text-muted-foreground italic mt-0.5">
                          示例：{config.example}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* --- 描述文案 --- */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">描述文案</Label>
            <Textarea
              value={description}
              onChange={(e) => isDraft && setDescription(e.target.value)}
              readOnly={!isDraft}
              placeholder={isDraft ? "简要概括该视频内容传达什么意思" : "暂无描述"}
              rows={3}
              className={`resize-y ${!isDraft ? "bg-muted/30" : ""}`}
            />
          </div>

          {/* --- 话题标签 --- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground" />
              <Label className="text-sm font-medium">话题标签</Label>
              <span className="text-xs text-muted-foreground">"3+1+1"结构</span>
            </div>

            {/* 已选标签展示 */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map(tag => (
                  <Badge key={tag} variant="default" className="text-xs">
                    #{tag}
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {/* 标签库（仅草稿状态显示） */}
            {isDraft && (
              <div className="space-y-3 rounded-lg border p-3">
                {tagCategoryOrder.map(cat => {
                  const catConfig = tagCategoryConfig[cat]
                  const catTags = tagLibrary.filter(t => t.category === cat)
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{catConfig.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {catConfig.position} · {catConfig.description}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {catTags.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            暂无标签
                          </span>
                        ) : (
                          catTags.map(tag => {
                            const isSelected = hashtags.includes(tag.tag)
                            return (
                              <div key={tag.id} className="group relative">
                                <button
                                  type="button"
                                  onClick={() => toggleTag(tag.tag)}
                                  className={`text-xs rounded-md border px-2 py-0.5 transition-colors ${
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  #{tag.tag}
                                </button>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* 添加自定义标签 */}
                <Separator />
                <div className="flex gap-2">
                  <Input
                    placeholder="自定义标签（不含 # 号）"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    className="h-8 text-sm"
                  />
                  <select
                    value={newTagCategory}
                    onChange={(e) => setNewTagCategory(e.target.value as TagCategory)}
                    className="h-8 text-sm rounded-md border border-input bg-background px-2"
                  >
                    {tagCategoryOrder.map(cat => (
                      <option key={cat} value={cat}>
                        {tagCategoryConfig[cat].label}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="h-8"
                  >
                    <Plus className="size-3" />
                    添加
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* --- 完整文案 --- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">文案内容</Label>
              </div>
              {isDraft && (
                <p className="text-xs text-muted-foreground">
                  已从生产任务预填，可编辑
                </p>
              )}
            </div>
            <Textarea
              value={fullContent}
              onChange={(e) => isDraft && setFullContent(e.target.value)}
              readOnly={!isDraft}
              placeholder={isDraft ? "完整文案内容..." : "暂无文案内容"}
              rows={10}
              className={`resize-y ${!isDraft ? "bg-muted/30" : ""}`}
            />
          </div>

          {/* --- 发布信息 --- */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">发布信息</Label>

            {/* 视频链接 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">发布视频链接</Label>
              <div className="flex gap-2">
                <Input
                  value={videoUrl}
                  onChange={(e) => isDraft && setVideoUrl(e.target.value)}
                  readOnly={!isDraft}
                  placeholder={isDraft ? "粘贴抖音视频链接" : "暂无链接"}
                  className={!isDraft ? "bg-muted/30" : ""}
                />
                {isDraft && videoUrl && (
                  <a
                    href={videoUrl.startsWith("http") ? videoUrl : `https://${videoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
                  >
                    <Link2 className="size-4" />
                  </a>
                )}
              </div>
            </div>

            {/* 发布时间（已发布才显示） */}
            {isPublished && record.publishTime && (
              <div>
                <Label className="text-xs text-muted-foreground">发布时间</Label>
                <p className="text-sm mt-1">{formatDateTime(record.publishTime)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== 底部按钮（固定） ===== */}
        <DialogFooter className="flex-shrink-0">
          {isDraft && (
            <>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isPublishing}
              >
                <Save className="size-4" />
                {isSaving ? "保存中..." : "保存草稿"}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isSaving || isPublishing || !videoUrl.trim()}
              >
                {isPublishing ? "处理中..." : (
                  <>
                    <Check className="size-4" />
                    标记为已发布
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}