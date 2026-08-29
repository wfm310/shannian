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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import {
  getReviewRecord, updateReviewRecord, startReview, completeReview,
  getDataSnapshot,
  reviewTypeLabels, reviewPeriodLabels, reviewStatusLabels,
  reviewDimensionConfig, experienceCategoryConfig, priorityConfig,
  actionLinkedModules, formatNumber,
} from "@/lib/review"
import { db, type ReviewRecord, type ReviewDimension, type ExperienceCategory, type ReviewItem, type ReviewExperience, type ReviewAction } from "@/lib/db"
import type { Priority } from "@/lib/db"
import { toast } from "sonner"
import {
  Save, Check, Plus, Trash2, TrendingUp, ThumbsUp, ThumbsDown,
  Lightbulb, Target, BarChart3,
} from "lucide-react"


// ========== 类型定义 ==========
interface ReviewDetailProps {
  recordId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

// 条目 ID 生成器
let itemIdCounter = Date.now()
function nextItemId(): number {
  return ++itemIdCounter
}


// ========== 组件定义 ==========
export function ReviewDetail({
  recordId, open, onOpenChange, onUpdated
}: ReviewDetailProps) {
  // ----- 复盘记录数据 -----
  const [record, setRecord] = useState<ReviewRecord | null>(null)

  // ----- 五模块编辑状态 -----
  const [dataComment, setDataComment] = useState("")
  const [goodItems, setGoodItems] = useState<ReviewItem[]>([])
  const [badItems, setBadItems] = useState<ReviewItem[]>([])
  const [experiences, setExperiences] = useState<ReviewExperience[]>([])
  const [actions, setActions] = useState<ReviewAction[]>([])

  // ----- 数据快照 -----
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDataSnapshot>> | null>(null)

  // ----- 加载状态 -----
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // ----- 自动保存草稿 -----
  const draftData = { dataComment, goodItems, badItems, experiences, actions }
  const { loadDraft, clearDraft } = useAutoSave(
    `review-draft-${recordId}`,
    draftData,
    open && record?.status !== "completed"
  )

  // ----- 打开时加载 -----
  useEffect(() => {
    if (!open || !recordId) return

    let mounted = true

    async function loadData() {
      const r = await getReviewRecord(recordId!)
      if (!mounted || !r) return
      setRecord(r)

      // 自动开始复盘（待复盘 → 复盘中）
      if (r.status === "pending") {
        await startReview(recordId!)
        const updated = await getReviewRecord(recordId!)
        if (mounted && updated) setRecord(updated)
      }

      // 恢复草稿或加载已保存数据
      const draft = loadDraft()
      if (draft && r.status !== "completed") {
        setDataComment(draft.dataComment || r.dataComment || "")
        setGoodItems(draft.goodItems || r.goodItems || [])
        setBadItems(draft.badItems || r.badItems || [])
        setExperiences(draft.experiences || r.experiences || [])
        setActions(draft.actions || r.actions || [])
      } else {
        setDataComment(r.dataComment || "")
        setGoodItems(r.goodItems || [])
        setBadItems(r.badItems || [])
        setExperiences(r.experiences || [])
        setActions(r.actions || [])
      }

      // 拉取数据快照
      const snap = await getDataSnapshot(r)
      if (mounted) setSnapshot(snap)
    }

    loadData()
    return () => { mounted = false }
  }, [open, recordId]) // eslint-disable-line react-hooks/exhaustive-deps


  // ----- 保存 -----
  async function handleSave() {
    if (!record?.id) return
    setIsSaving(true)
    try {
      await updateReviewRecord(record.id, {
        dataComment, goodItems, badItems, experiences, actions,
      })
      clearDraft()
      toast.success("已保存")
      const updated = await getReviewRecord(record.id)
      if (updated) setRecord(updated)
      onUpdated?.()
    } catch {
      toast.error("保存失败")
    } finally {
      setIsSaving(false)
    }
  }


  // ----- 完成复盘 -----
  async function handleComplete() {
    if (!record?.id) return
    // 先保存
    setIsSaving(true)
    try {
      await updateReviewRecord(record.id, {
        dataComment, goodItems, badItems, experiences, actions,
      })
      clearDraft()
    } catch {
      toast.error("保存失败")
      setIsSaving(false)
      return
    }
    setIsSaving(false)

    // 再完成
    setIsCompleting(true)
    try {
      await completeReview(record.id)
      const updated = await getReviewRecord(record.id)
      if (updated) setRecord(updated)
      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    } finally {
      setIsCompleting(false)
    }
  }


  // ----- 条目操作 -----
  function addGoodItem() {
    setGoodItems(prev => [...prev, { id: nextItemId(), dimension: "general", description: "" }])
  }
  function addBadItem() {
    setBadItems(prev => [...prev, { id: nextItemId(), dimension: "general", description: "" }])
  }
  function addExperience() {
    setExperiences(prev => [...prev, {
      id: nextItemId(), title: "", content: "", category: "content_creation", applicableScene: "",
    }])
  }
  function addAction() {
    setActions(prev => [...prev, {
      id: nextItemId(), content: "", priority: "P2", dueDate: null, linkedModule: null,
    }])
  }

  function removeGoodItem(id: number) {
    setGoodItems(prev => prev.filter(i => i.id !== id))
  }
  function removeBadItem(id: number) {
    setBadItems(prev => prev.filter(i => i.id !== id))
  }
  function removeExperience(id: number) {
    setExperiences(prev => prev.filter(i => i.id !== id))
  }
  function removeAction(id: number) {
    setActions(prev => prev.filter(i => i.id !== id))
  }


  // ----- 格式化时间 -----
  function formatDateTime(timestamp: number | null): string {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, "0")
    const m = date.getMinutes().toString().padStart(2, "0")
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${h}:${m}`
  }

  if (!record) return null

  const isCompleted = record.status === "completed"
  const isEditing = !isCompleted

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col" initialFocus={false}>
        {/* ===== 头部 ===== */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{record.title}</DialogTitle>
          <DialogDescription>
            {reviewTypeLabels[record.type]}
            {record.period && ` · ${reviewPeriodLabels[record.period]}`}
          </DialogDescription>
        </DialogHeader>

        {/* ===== 内容区 ===== */}
        <div className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">

          {/* 基本信息 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {reviewStatusLabels[record.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                创建于 {formatDateTime(record.createdAt)}
              </span>
              {record.completedAt && (
                <span className="text-xs text-muted-foreground">
                  · 完成于 {formatDateTime(record.completedAt)}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* ===== 模块1：数据表现回顾 ===== */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <Label className="text-sm font-medium">数据表现回顾</Label>
            </div>

            {/* 数据快照（只读） */}
            {snapshot && (
              <div className="rounded-lg border p-3 space-y-3">
                {snapshot.type === "single" ? (
                  // 单条视频：显示各节点数据
                  snapshot.trackingRecords.length > 0 ? (
                    <div className="space-y-2">
                      {snapshot.trackingRecords.map((tr, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <Badge variant="outline" className="text-xs min-w-[80px] justify-center">
                            {tr.nodeLabel}
                          </Badge>
                          <span className="text-muted-foreground">播放 {formatNumber(tr.views)}</span>
                          <span className="text-muted-foreground">点赞率 {tr.rates.likeRate}</span>
                          <span className="text-muted-foreground">完播 {tr.completionRate !== null ? `${tr.completionRate}%` : "—"}</span>
                          <span className="text-muted-foreground">跳出 {tr.bounceRate2s !== null ? `${tr.bounceRate2s}%` : "—"}</span>
                          <Badge variant={tr.status === "recorded" ? "default" : "secondary"} className="text-xs">
                            {tr.status === "recorded" ? "已录入" : "待录入"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">暂无追踪数据</p>
                  )
                ) : (
                  // 周期性：显示汇总
                  snapshot.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">发布视频数</p>
                        <p className="text-lg font-medium">{snapshot.summary.videoCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">总播放量</p>
                        <p className="text-lg font-medium">{formatNumber(snapshot.summary.totalViews)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">平均完播率</p>
                        <p className="text-lg font-medium">{snapshot.summary.avgCompletionRate !== null ? `${snapshot.summary.avgCompletionRate}%` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">平均5s完播</p>
                        <p className="text-lg font-medium">{snapshot.summary.avgRetention !== null ? `${snapshot.summary.avgRetention}%` : "—"}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* 数据简评 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                数据简评{record.type === "periodic" && record.period !== "daily" ? "（必填）" : "（选填）"}
              </Label>
              <Textarea
                value={dataComment}
                onChange={(e) => isEditing && setDataComment(e.target.value)}
                readOnly={!isEditing}
                placeholder={isEditing ? "基于数据快照写简要分析..." : "暂无"}
                rows={3}
                className={`resize-y text-sm ${!isEditing ? "bg-muted/30" : ""}`}
              />
            </div>
          </div>

          <Separator />

          {/* ===== 模块2：做得好的 ===== */}
          <ItemSection
            icon={<ThumbsUp className="size-4 text-muted-foreground" />}
            title="做得好的"
            items={goodItems}
            isEditing={isEditing}
            onAdd={addGoodItem}
            onRemove={removeGoodItem}
            onUpdate={(id, field, value) => setGoodItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))}
          />

          <Separator />

          {/* ===== 模块3：做得不好的 ===== */}
          <ItemSection
            icon={<ThumbsDown className="size-4 text-muted-foreground" />}
            title="做得不好的"
            items={badItems}
            isEditing={isEditing}
            onAdd={addBadItem}
            onRemove={removeBadItem}
            onUpdate={(id, field, value) => setBadItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))}
          />

          <Separator />

          {/* ===== 模块4：可复用经验 ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  可复用经验
                  {record.type === "periodic" && record.period !== "daily" && (
                    <span className="text-xs text-muted-foreground ml-1">（必填）</span>
                  )}
                </Label>
              </div>
              {isEditing && (
                <Button size="sm" variant="outline" onClick={addExperience}>
                  <Plus className="size-4" />
                  添加
                </Button>
              )}
            </div>

            {experiences.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                {isEditing ? "点击「添加」录入经验..." : "暂无"}
              </p>
            ) : (
              <div className="space-y-3">
                {experiences.map(exp => (
                  <div key={exp.id} className="rounded-lg border p-3 space-y-2">
                    {isEditing && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => removeExperience(exp.id)}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Input
                        value={exp.title}
                        onChange={(e) => setExperiences(prev => prev.map(i => i.id === exp.id ? { ...i, title: e.target.value } : i))}
                        readOnly={!isEditing}
                        placeholder={isEditing ? "经验标题，如：前3秒抛出痛点问题能有效降低2s跳出率" : "暂无"}
                        className={`text-sm ${!isEditing ? "bg-muted/30" : ""}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Textarea
                        value={exp.content}
                        onChange={(e) => setExperiences(prev => prev.map(i => i.id === exp.id ? { ...i, content: e.target.value } : i))}
                        readOnly={!isEditing}
                        placeholder={isEditing ? "详细描述：背景 + 做法 + 效果" : "暂无"}
                        rows={3}
                        className={`resize-y text-sm ${!isEditing ? "bg-muted/30" : ""}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">分类</Label>
                        <Select
                          value={exp.category}
                          onValueChange={(v) => isEditing && setExperiences(prev => prev.map(i => i.id === exp.id ? { ...i, category: v as ExperienceCategory } : i))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="min-w-[150px]">
                            {Object.entries(experienceCategoryConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">适用场景</Label>
                        <Input
                          value={exp.applicableScene}
                          onChange={(e) => setExperiences(prev => prev.map(i => i.id === exp.id ? { ...i, applicableScene: e.target.value } : i))}
                          readOnly={!isEditing}
                          placeholder={isEditing ? "适用什么场景" : "—"}
                          className={`h-8 text-sm ${!isEditing ? "bg-muted/30" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* ===== 模块5：下一步行动 ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">下一步行动</Label>
              </div>
              {isEditing && (
                <Button size="sm" variant="outline" onClick={addAction}>
                  <Plus className="size-4" />
                  添加
                </Button>
              )}
            </div>

            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                {isEditing ? "点击「添加」录入行动..." : "暂无"}
              </p>
            ) : (
              <div className="space-y-3">
                {actions.map(act => (
                  <div key={act.id} className="rounded-lg border p-3 space-y-2">
                    {isEditing && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => removeAction(act.id)}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    <Input
                      value={act.content}
                      onChange={(e) => setActions(prev => prev.map(i => i.id === act.id ? { ...i, content: e.target.value } : i))}
                      readOnly={!isEditing}
                      placeholder={isEditing ? "行动内容，如：下周尝试前3秒用痛点问题开场" : "暂无"}
                      className={`text-sm ${!isEditing ? "bg-muted/30" : ""}`}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">优先级</Label>
                        <Select
                          value={act.priority}
                          onValueChange={(v) => isEditing && setActions(prev => prev.map(i => i.id === act.id ? { ...i, priority: v as Priority } : i))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="min-w-[120px]">
                            {Object.entries(priorityConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">截止日期</Label>
                        <Input
                          type="date"
                          value={act.dueDate ? new Date(act.dueDate).toISOString().split("T")[0] : ""}
                          onChange={(e) => setActions(prev => prev.map(i => i.id === act.id ? { ...i, dueDate: e.target.value ? new Date(e.target.value).getTime() : null } : i))}
                          readOnly={!isEditing}
                          className={`h-8 text-sm ${!isEditing ? "bg-muted/30" : ""}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">关联模块</Label>
                        <Select
                          value={act.linkedModule || "none"}
                          onValueChange={(v) => isEditing && setActions(prev => prev.map(i => i.id === act.id ? { ...i, linkedModule: v === "none" ? null : v } : i))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="min-w-[150px]">
                            <SelectItem value="none">不关联</SelectItem>
                            {actionLinkedModules.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 底部按钮 ===== */}
        <DialogFooter className="flex-shrink-0">
          {isEditing && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving || isCompleting}>
                <Save className="size-4" />
                {isSaving ? "保存中..." : "保存"}
              </Button>
              <Button onClick={handleComplete} disabled={isSaving || isCompleting}>
                {isCompleting ? "处理中..." : (
                  <>
                    <Check className="size-4" />
                    完成复盘
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ========== 子组件：做得好/不好条目区 ==========
function ItemSection({
  icon, title, items, isEditing, onAdd, onRemove, onUpdate,
}: {
  icon: React.ReactNode
  title: string
  items: ReviewItem[]
  isEditing: boolean
  onAdd: () => void
  onRemove: (id: number) => void
  onUpdate: (id: number, field: "dimension" | "description", value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm font-medium">{title}</Label>
        </div>
        {isEditing && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="size-4" />
            添加
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          {isEditing ? "点击「添加」录入条目..." : "暂无"}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex gap-2 items-start rounded-lg border p-2">
              {isEditing && (
                <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)} className="flex-shrink-0">
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              )}
              <div className="w-32 flex-shrink-0">
                <Select
                  value={item.dimension}
                  onValueChange={(v) => isEditing && v && onUpdate(item.id, "dimension", v)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[120px]">
                    {Object.entries(reviewDimensionConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={item.description}
                onChange={(e) => onUpdate(item.id, "description", e.target.value)}
                readOnly={!isEditing}
                placeholder={isEditing ? "具体描述..." : "暂无"}
                rows={2}
                className={`resize-y text-sm flex-1 ${!isEditing ? "bg-muted/30" : ""}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}