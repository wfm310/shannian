"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import {
  getProductionTask, updateProductionTask, advanceStage, goBackStage,
  selectFramework, createAndLinkTopic,
  stageOrder, stageLabels, statusLabels, modeLabels,
} from "@/lib/produce-flow"
import {
  getTopics, topicSourceConfig, topicStatusConfig,
  matchLevelConfig, demandLevelConfig, competitionConfig,
  priorityLevelConfig,
} from "@/lib/topic"
import { getScriptTemplates, getScriptTemplate, frameworkPresets } from "@/lib/script-template"
import { db, type ProductionTask, type ProductionStage, type Topic, type ScriptTemplate, type ScriptStepContent } from "@/lib/db"
import { toast } from "sonner"
import { ArrowRight, ArrowLeft, Save, Check, Link2, FileText } from "lucide-react"

interface ProductionDetailProps {
  taskId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function ProductionDetail({
  taskId, open, onOpenChange, onUpdated
}: ProductionDetailProps) {
  const [task, setTask] = useState<ProductionTask | null>(null)
  const [rawContent, setRawContent] = useState("")
  const [scriptSteps, setScriptSteps] = useState<ScriptStepContent[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [frameworks, setFrameworks] = useState<ScriptTemplate[]>([])
  const [selectedFramework, setSelectedFramework] = useState<ScriptTemplate | null>(null)
  const [topicDetail, setTopicDetail] = useState<Topic | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [isGoingBack, setIsGoingBack] = useState(false)
  const [viewStage, setViewStage] = useState<ProductionStage | null>(null)

  const { loadDraft: loadRawDraft, clearDraft: clearRawDraft } = useAutoSave(
    `production-raw-${taskId}`,
    rawContent,
    open && task?.currentStage === "script" && task?.mode === "impromptu"
  )
  const { loadDraft: loadStepsDraft, clearDraft: clearStepsDraft } = useAutoSave(
    `production-steps-${taskId}`,
    scriptSteps,
    open && task?.currentStage === "script"
  )

  useEffect(() => {
    if (!open || !taskId) return

    let mounted = true

    async function loadData() {
      const t = await getProductionTask(taskId!)
      if (!mounted || !t) return
      setTask(t)
      setViewStage(t.currentStage)

      const rawDraft = loadRawDraft()
      if (rawDraft && t.currentStage === "script" && t.mode === "impromptu") {
        setRawContent(rawDraft)
      } else {
        setRawContent(t.rawContent || "")
      }

      const stepsDraft = loadStepsDraft()
      if (stepsDraft && stepsDraft.length > 0 && t.currentStage === "script") {
        setScriptSteps(stepsDraft)
      } else {
        setScriptSteps(t.scriptSteps || [])
      }

      const topicList = await getTopics()
      if (!mounted) return
      setTopics(topicList.filter(tp => tp.status !== "published"))

      if (t.topicId) {
        const topic = await db.topics.get(t.topicId)
        if (mounted) setTopicDetail(topic || null)
      }

      const fwList = await getScriptTemplates()
      if (!mounted) return
      setFrameworks(fwList)

      if (t.frameworkId) {
        const fw = await getScriptTemplate(t.frameworkId)
        if (mounted) setSelectedFramework(fw || null)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [open, taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveRaw() {
    if (!task?.id) return
    setIsSaving(true)
    try {
      await updateProductionTask(task.id, { rawContent })
      clearRawDraft()
      toast.success("文案已保存")
      const updated = await getProductionTask(task.id)
      if (updated) setTask(updated)
      onUpdated?.()
    } catch {
      toast.error("保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveSteps() {
    if (!task?.id) return
    setIsSaving(true)
    try {
      await updateProductionTask(task.id, { scriptSteps })
      clearStepsDraft()
      toast.success("文案已保存")
      onUpdated?.()
    } catch {
      toast.error("保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAdvance() {
    if (!task?.id) return
    setIsAdvancing(true)
    try {
      if (task.currentStage === "script") {
        if (task.mode === "impromptu" && rawContent) {
          await updateProductionTask(task.id, { rawContent })
          clearRawDraft()
        }
        if (scriptSteps.length > 0) {
          await updateProductionTask(task.id, { scriptSteps })
          clearStepsDraft()
        }
      }

      await advanceStage(task.id)

      const updated = await getProductionTask(task.id)
      if (updated) {
        setTask(updated)
        setViewStage(updated.currentStage)
      }

      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    } finally {
      setIsAdvancing(false)
    }
  }

  async function handleGoBack() {
    if (!task?.id) return
    setIsGoingBack(true)
    try {
      await goBackStage(task.id)
      const updated = await getProductionTask(task.id)
      if (updated) {
        setTask(updated)
        setViewStage(updated.currentStage)
      }
      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    } finally {
      setIsGoingBack(false)
    }
  }

  async function handleTopicSelect(value: string) {
    if (!task?.id) return
    const topicIdNum = Number(value)
    setSelectedTopicId(topicIdNum)

    const newPending = task.pendingStages.filter(s => s !== "topic")
    await updateProductionTask(task.id, {
      topicId: topicIdNum,
      pendingStages: newPending,
    })

    const topic = await db.topics.get(topicIdNum)
    setTopicDetail(topic || null)

    const updated = await getProductionTask(task.id)
    if (updated) setTask(updated)
    toast.success("选题已关联")
    onUpdated?.()
  }

  async function handleTopicCreate() {
    if (!task?.id || !newTopicTitle.trim()) return
    try {
      await createAndLinkTopic(task.id, newTopicTitle, rawContent)
      setNewTopicTitle("")
      const updated = await getProductionTask(task.id)
      if (updated) setTask(updated)
      if (updated?.topicId) {
        const topic = await db.topics.get(updated.topicId)
        setTopicDetail(topic || null)
      }
      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    }
  }

  async function handleFrameworkSelect(value: string) {
    if (!task?.id) return
    const fwId = Number(value)
    try {
      await selectFramework(task.id, fwId)
      const fw = await getScriptTemplate(fwId)
      setSelectedFramework(fw || null)
      const updated = await getProductionTask(task.id)
      if (updated) {
        setTask(updated)
        setScriptSteps(updated.scriptSteps || [])
      }
      onUpdated?.()
    } catch {
      // 错误已在 API 层处理
    }
  }

  function handleStepContentChange(stepId: number, content: string) {
    setScriptSteps(prev => prev.map(step =>
      step.stepId === stepId ? { ...step, content } : step
    ))
  }

  function formatDateTime(timestamp: number) {
    const date = new Date(timestamp)
    const h = date.getHours().toString().padStart(2, "0")
    const m = date.getMinutes().toString().padStart(2, "0")
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${h}:${m}`
  }

  if (!task) return null

  const currentViewStage = viewStage ?? task.currentStage
  const canEditScript = currentViewStage === task.currentStage && task.currentStage === "script" && task.status === "active"
  const isPublished = task.currentStage === "published"
  const hasFramework = !!task.frameworkId
  const isViewingScript = currentViewStage === "script"
  const isViewingMaterial = currentViewStage === "material"
  const isViewingTopic = currentViewStage === "topic"
  const isViewingEditing = currentViewStage === "editing"
  const isViewingHandoff = currentViewStage === "handoff"
  const isViewingPublished = currentViewStage === "published"
  const isViewingPast = currentViewStage !== task.currentStage
  const startingIndex = task.mode === "impromptu" ? 1 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col" initialFocus={false}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>生产任务详情</DialogTitle>
          <DialogDescription>
            按顺序推进 5 个阶段，不可跳过
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">
          {/* 任务基本信息 */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{task.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary">{modeLabels[task.mode]}</Badge>
                <Badge variant={task.status === "active" ? "default" : "outline"}>
                  {statusLabels[task.status]}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">关联选题：</span>
                {task.topicId ? (
                  <span className="font-medium">
                    {topicDetail?.topicTitle || `选题#${task.topicId}`}
                  </span>
                ) : task.pendingStages.includes("topic") ? (
                  <Badge variant="destructive" className="ml-1">待补填</Badge>
                ) : (
                  <span className="text-muted-foreground">无</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">关联框架：</span>
                {task.frameworkId ? (
                  <span className="font-medium">
                    {selectedFramework?.title || `框架#${task.frameworkId}`}
                  </span>
                ) : task.pendingStages.includes("framework") ? (
                  <Badge variant="destructive" className="ml-1">待补填</Badge>
                ) : (
                  <span className="text-muted-foreground">无</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">负责人：</span>
                <span className="font-medium">{task.assignee}</span>
              </div>
              <div>
                <span className="text-muted-foreground">创建时间：</span>
                <span className="font-medium">{formatDateTime(task.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* 阶段进度 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">阶段进度</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {stageOrder.map((stage, index) => {
                const isCurrent = stage === task.currentStage
                const stageIdx = stageOrder.indexOf(task.currentStage)
                const isPast = index < stageIdx
                const isViewing = stage === currentViewStage
                const canView = index >= startingIndex && index <= stageIdx
                return (
                  <div key={stage} className="flex items-center gap-1">
                    {index > 0 && (
                      <span className="text-muted-foreground text-xs">→</span>
                    )}
                    <button
                      type="button"
                      disabled={!canView}
                      onClick={() => canView && setViewStage(stage)}
                      className={canView ? "cursor-pointer" : "cursor-not-allowed"}
                    >
                      <Badge
                        variant={isViewing ? "default" : isPast ? "secondary" : "outline"}
                        className={isViewing ? "" : "text-muted-foreground"}
                      >
                        {stageLabels[stage]}
                      </Badge>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 查看历史阶段提示 */}
          {isViewingPast && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              正在查看「{stageLabels[currentViewStage]}」阶段的历史内容（只读），点击「{stageLabels[task.currentStage]}」返回当前阶段
            </div>
          )}

          {/* 选题确认阶段（查看历史） */}
          {isViewingTopic && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">选题确认阶段</Label>
              {topicDetail ? (
                <TopicInfoPanel topic={topicDetail} />
              ) : task.topicId ? (
                <p className="text-sm text-muted-foreground">选题 #{task.topicId}</p>
              ) : (
                <p className="text-sm text-muted-foreground">无关联选题</p>
              )}
            </div>
          )}

          {/* 脚本撰写阶段 */}
          {isViewingScript && (
            <>
              {/* 即兴补填区 */}
              {task.mode === "impromptu" && task.pendingStages.length > 0 && (
                <div className="space-y-4 rounded-lg border border-dashed p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">待补填</Badge>
                    <span className="text-sm font-medium">进入素材制作前必须补完</span>
                  </div>

                  {task.pendingStages.includes("topic") && (
                    <div className="space-y-2">
                      <Label className="text-sm">关联选题</Label>
                      <Select
                        value={selectedTopicId ? String(selectedTopicId) : ""}
                        onValueChange={(v) => v && handleTopicSelect(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择已有选题" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[300px]">
                          {topics.map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.topicTitle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input
                          placeholder="或输入新选题标题"
                          value={newTopicTitle}
                          onChange={(e) => setNewTopicTitle(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleTopicCreate}
                          disabled={!newTopicTitle.trim()}
                        >
                          <Link2 className="size-4" />
                          创建并关联
                        </Button>
                      </div>
                    </div>
                  )}

                  {task.pendingStages.includes("framework") && (
                    <div className="space-y-2">
                      <Label className="text-sm">关联脚本框架</Label>
                      <Select
                        value={task.frameworkId ? String(task.frameworkId) : ""}
                        onValueChange={(v) => v && handleFrameworkSelect(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择脚本框架" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[300px]">
                          {frameworks.map(fw => (
                            <SelectItem key={fw.id} value={String(fw.id)}>
                              {fw.title}（{frameworkPresets[fw.frameworkType].label}）
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {frameworks.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          脚本框架库中没有框架，请先在脚本框架库创建
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 标准模式：未选框架时显示框架选择 */}
              {task.mode === "standard" && !hasFramework && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">选择脚本框架</Label>
                  <Select
                    value=""
                    onValueChange={(v) => v && handleFrameworkSelect(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择脚本框架（必填）" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[300px]">
                      {frameworks.map(fw => (
                        <SelectItem key={fw.id} value={String(fw.id)}>
                          {fw.title}（{frameworkPresets[fw.frameworkType].label}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 即兴模式：未选框架时显示自由文本框 */}
              {task.mode === "impromptu" && !hasFramework && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">自由文案</Label>
                    {canEditScript && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveRaw}
                        disabled={isSaving}
                      >
                        <Save className="size-4" />
                        {isSaving ? "保存中..." : "保存文案"}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={rawContent}
                    onChange={(e) => canEditScript && setRawContent(e.target.value)}
                    readOnly={!canEditScript}
                    placeholder={canEditScript ? "想到什么写什么，选框架后再拆分到各步骤..." : "暂无文案内容"}
                    rows={12}
                    className="resize-y"
                  />
                  {canEditScript && (
                    <p className="text-xs text-muted-foreground">
                      文案会自动保存草稿，选框架后将拆分到各步骤
                    </p>
                  )}
                </div>
              )}

              {/* 已选框架：分段写文案 */}
              {hasFramework && (
                <div className="grid grid-cols-2 gap-4">
                  {/* 左侧 */}
                  <div className="space-y-3">
                    {task.mode === "standard" && topicDetail ? (
                      <TopicInfoPanel topic={topicDetail} />
                    ) : task.mode === "impromptu" ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">自由文案（只读）</Label>
                        <Textarea
                          value={rawContent}
                          readOnly
                          placeholder="暂无自由文案"
                          rows={16}
                          className="resize-y bg-muted/30"
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* 右侧：框架步骤分段写 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          框架步骤 — {selectedFramework?.title}
                        </span>
                      </div>
                      {canEditScript && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveSteps}
                          disabled={isSaving}
                        >
                          <Save className="size-4" />
                          {isSaving ? "保存中..." : "保存"}
                        </Button>
                      )}
                    </div>
                    {scriptSteps.map((step, index) => (
                      <div key={step.stepId} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-sm">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium">{step.stepName}</span>
                        </div>
                        {step.guidance && (
                          <p className="text-xs text-muted-foreground pl-6">
                            {step.guidance}
                          </p>
                        )}
                        <Textarea
                          value={step.content}
                          onChange={(e) => canEditScript && handleStepContentChange(step.stepId, e.target.value)}
                          readOnly={!canEditScript}
                          placeholder={canEditScript ? "在此撰写该步骤文案..." : "暂无内容"}
                          rows={4}
                          className="resize-y"
                        />
                      </div>
                    ))}
                    {canEditScript && (
                      <p className="text-xs text-muted-foreground">
                        每步文案自动保存草稿，点击"保存"写入数据库
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 素材制作阶段：只读展示文案 */}
          {isViewingMaterial && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">文案内容（只读，对着录口播）</Label>
              {task.mode === "impromptu" && task.rawContent && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">自由文案</Label>
                  <Textarea
                    value={task.rawContent}
                    readOnly
                    rows={6}
                    className="resize-y bg-muted/30"
                  />
                </div>
              )}
              {scriptSteps.length > 0 && (
                <div className="space-y-3">
                  {scriptSteps.map((step, index) => (
                    <div key={step.stepId} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-sm">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-medium">{step.stepName}</span>
                      </div>
                      {step.content && (
                        <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                          {step.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isViewingPast && task.status === "active" && (
                <p className="text-xs text-muted-foreground">
                  按文案内容录制口播或拍摄素材，完成后点击下方"完成素材"
                </p>
              )}
            </div>
          )}

          {/* 剪辑阶段 */}
          {isViewingEditing && (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <p className="text-sm font-medium">剪辑阶段</p>
              {!isViewingPast && task.status === "active" && (
                <p className="text-xs text-muted-foreground">
                  去剪映等剪辑软件完成剪辑，完成后点击下方"完成剪辑"
                </p>
              )}
            </div>
          )}

          {/* 发布移交阶段 */}
          {isViewingHandoff && (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <p className="text-sm font-medium">确认移交到制作发布模块</p>
              {!isViewingPast && task.status === "active" && (
                <p className="text-xs text-muted-foreground">
                  移交后任务标记为"已完成"，选题状态更新为"已发布"。
                  发布详情（标题/描述/标签等）在制作发布模块记录。
                </p>
              )}
            </div>
          )}

          {/* 已发布终态 */}
          {isViewingPublished && (
            <div className="rounded-lg border p-4 text-center space-y-2">
              <Check className="size-8 mx-auto text-green-500" />
              <p className="text-sm font-medium">已发布</p>
              {task.publishedAt && (
                <p className="text-xs text-muted-foreground">
                  发布时间：{formatDateTime(task.publishedAt)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 justify-between">
          <div>
            {task.status === "active" && stageOrder.indexOf(task.currentStage) > startingIndex && (
              <Button
                variant="outline"
                onClick={handleGoBack}
                disabled={isGoingBack || isAdvancing}
              >
                <ArrowLeft className="size-4" />
                {isGoingBack ? "处理中..." : "返回上一步"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isPublished && (
              <Button
                onClick={handleAdvance}
                disabled={isAdvancing || isGoingBack}
              >
                {isAdvancing ? "处理中..." : (
                  <>
                    <ArrowRight className="size-4" />
                    {task.currentStage === "topic" ? "进入脚本撰写" :
                     task.currentStage === "script" ? "完成脚本" :
                     task.currentStage === "material" ? "完成素材" :
                     task.currentStage === "editing" ? "完成剪辑" :
                     "确认移交"}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// 选题信息只读面板组件
function TopicInfoPanel({ topic }: { topic: Topic }) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">选题信息（只读参考）</Label>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">选题标题：</span>
          <span className="font-medium">{topic.topicTitle}</span>
        </div>

        {topic.topicNote && (
          <div>
            <span className="text-muted-foreground">选题备注：</span>
            <span>{topic.topicNote}</span>
          </div>
        )}

        <div>
          <span className="text-muted-foreground">来源：</span>
          <span>{topicSourceConfig[topic.source].label}</span>
        </div>

        <div>
          <span className="text-muted-foreground">状态：</span>
          <Badge variant={topicStatusConfig[topic.status].variant} className="text-xs">
            {topicStatusConfig[topic.status].label}
          </Badge>
        </div>

        {topic.audience && (
          <div>
            <span className="text-muted-foreground">人群：</span>
            <span>{topic.audience}</span>
          </div>
        )}

        {topic.demand && (
          <div>
            <span className="text-muted-foreground">需求：</span>
            <span>{topic.demand}</span>
          </div>
        )}

        {topic.contentDimension && (
          <div>
            <span className="text-muted-foreground">内容维度：</span>
            <span>{topic.contentDimension}</span>
          </div>
        )}

        {topic.copyReference && (
          <div className="pt-2">
            <span className="text-muted-foreground">文案参考：</span>
            <Textarea
              value={topic.copyReference}
              readOnly
              rows={4}
              className="resize-y bg-muted/30 mt-1"
            />
          </div>
        )}

        {topic.positioningMatch && (
          <div>
            <span className="text-muted-foreground">定位匹配度：</span>
            <span>{matchLevelConfig[topic.positioningMatch].label}</span>
          </div>
        )}

        {topic.demandLevel && (
          <div>
            <span className="text-muted-foreground">需求强度：</span>
            <span>{demandLevelConfig[topic.demandLevel].label}</span>
          </div>
        )}

        {topic.competition && (
          <div>
            <span className="text-muted-foreground">竞争热点：</span>
            <span>{competitionConfig[topic.competition].label}</span>
          </div>
        )}

        {topic.contentPositioning && (
          <div>
            <span className="text-muted-foreground">内容定位：</span>
            <span>{topic.contentPositioning}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">优先级：</span>
          <Badge variant={priorityLevelConfig[topic.priorityLevel].variant} className="text-xs">
            {priorityLevelConfig[topic.priorityLevel].label}
          </Badge>
          <span className="text-muted-foreground text-xs">
            得分 {topic.priorityScore}
          </span>
        </div>
      </div>
    </div>
  )
}
