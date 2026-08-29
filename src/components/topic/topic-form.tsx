"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { useAutoSave } from "@/hooks/use-auto-save"
import {
  createTopic, updateTopic,
  topicSourceConfig,
  matchLevelConfig, demandLevelConfig, competitionConfig,
  priorityLevelConfig,
  calculatePriority,
} from "@/lib/topic"
import type { Topic, TopicSource, MatchLevel, DemandLevel, CompetitionType } from "@/lib/db"
import { toast } from "sonner"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"


interface PrefillData {
  source: TopicSource
  sourceId: number | null
  topicTitle: string
  topicNote: string
  audience: string
  demand: string
  contentDimension: string
}

interface TopicFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: string
  topic?: Topic | null
  prefill?: PrefillData | null
  onSaved?: () => void
  onCreated?: (id: number) => void
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="flex-1 h-px bg-border/50" />
    </div>
  )
}


export function TopicForm({
  open,
  onOpenChange,
  currentUser,
  topic,
  prefill,
  onSaved,
  onCreated,
}: TopicFormProps) {

  const [topicTitle, setTopicTitle] = useState("")
  const [topicNote, setTopicNote] = useState("")
  const [source, setSource] = useState<TopicSource>("manual")
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [audience, setAudience] = useState("")
  const [demand, setDemand] = useState("")
  const [contentDimension, setContentDimension] = useState("")
  const [positioningMatch, setPositioningMatch] = useState<MatchLevel | "">("")
  const [demandLevel, setDemandLevel] = useState<DemandLevel | "">("")
  const [competition, setCompetition] = useState<CompetitionType | "">("")
  const [contentPositioning, setContentPositioning] = useState("")
  const [copyReference, setCopyReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!topic
  const isPrefill = !!prefill

  const currentSource = isEditing ? topic!.source : (isPrefill ? prefill!.source : "manual")
  const isManualSource = currentSource === "manual"
  const isCopyLocked = isEditing


  const { loadDraft, clearDraft } = useAutoSave(
    "topic-form-draft",
    { topicTitle, topicNote, source, audience, demand, contentDimension,
      positioningMatch, demandLevel, competition, contentPositioning, copyReference },
    open && !isEditing && !isPrefill
  )


  useEffect(() => {
    if (!open) return

    if (isEditing && topic) {
      setTopicTitle(topic.topicTitle)
      setTopicNote(topic.topicNote)
      setSource(topic.source)
      setSourceId(topic.sourceId)
      setAudience(topic.audience || "")
      setDemand(topic.demand || "")
      setContentDimension(topic.contentDimension || "")
      setPositioningMatch(topic.positioningMatch || "")
      setDemandLevel(topic.demandLevel || "")
      setCompetition(topic.competition || "")
      setContentPositioning(topic.contentPositioning || "")
      setCopyReference(topic.copyReference || "")
    } else if (isPrefill && prefill) {
      setTopicTitle(prefill.topicTitle)
      setTopicNote(prefill.topicNote)
      setSource(prefill.source)
      setSourceId(prefill.sourceId)
      setAudience(prefill.audience)
      setDemand(prefill.demand)
      setContentDimension(prefill.contentDimension)
      setPositioningMatch("")
      setDemandLevel("")
      setCompetition("")
      setContentPositioning("")
      setCopyReference("")
    } else {
      const draft = loadDraft()
      if (draft) {
        setTopicTitle(draft.topicTitle || "")
        setTopicNote(draft.topicNote || "")
        setSource(draft.source || "manual")
        setAudience(draft.audience || "")
        setDemand(draft.demand || "")
        setContentDimension(draft.contentDimension || "")
        setPositioningMatch(draft.positioningMatch || "")
        setDemandLevel(draft.demandLevel || "")
        setCompetition(draft.competition || "")
        setContentPositioning(draft.contentPositioning || "")
        setCopyReference(draft.copyReference || "")
        if (draft.topicTitle) {
          toast.info("已恢复上次未完成的草稿")
        }
      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, topic?.id, prefill])


  function resetForm() {
    setTopicTitle("")
    setTopicNote("")
    setSource("manual")
    setSourceId(null)
    setAudience("")
    setDemand("")
    setContentDimension("")
    setPositioningMatch("")
    setDemandLevel("")
    setCompetition("")
    setContentPositioning("")
    setCopyReference("")
  }


  const { score: currentScore, level: currentLevel } = calculatePriority(
    positioningMatch || null,
    demandLevel || null,
    competition || null
  )
  const isPriorityComplete = !!(positioningMatch && demandLevel && competition)

  const scoreColor = currentLevel === "urgent" ? "text-brand"
    : currentLevel === "scheduled" ? "text-foreground"
    : "text-muted-foreground/50"

  const dotColor = currentLevel === "urgent" ? "bg-brand"
    : currentLevel === "scheduled" ? "bg-muted-foreground"
    : "bg-muted-foreground/50"


  async function handleSubmit() {
    if (!topicTitle.trim()) {
      toast.error("请输入选题标题")
      return
    }
    if (!topicNote.trim()) {
      toast.error("请输入选题备注")
      return
    }

    setIsSubmitting(true)

    try {
      const { score, level } = calculatePriority(
        positioningMatch || null,
        demandLevel || null,
        competition || null
      )

      if (isEditing && topic?.id) {
        await updateTopic(topic.id, {
          positioningMatch: positioningMatch || null,
          demandLevel: demandLevel || null,
          competition: competition || null,
          contentPositioning: contentPositioning.trim(),
        })
        toast.success("选题已更新")
      } else {
        const newId = await createTopic({
          topicTitle: topicTitle.trim(),
          topicNote: topicNote.trim(),
          creator: currentUser,
          source,
          sourceId,
          audience: audience.trim(),
          demand: demand.trim(),
          contentDimension: contentDimension.trim(),
          positioningMatch: positioningMatch || null,
          demandLevel: demandLevel || null,
          competition: competition || null,
          contentPositioning: contentPositioning.trim(),
          copyReference: copyReference.trim(),
        })
        toast.success("选题已创建")
        clearDraft()
        onCreated?.(newId)
      }

      resetForm()
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast.error("保存失败，请重试")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  function handleCancel() {
    onOpenChange(false)
    if (!isEditing && !isPrefill) {
      toast.info("草稿已自动保存，下次打开可恢复")
    }
  }


  const matchOptions = Object.entries(matchLevelConfig).map(
    ([value, config]) => ({ value, label: config.label, description: config.description })
  )
  const demandOptions = Object.entries(demandLevelConfig).map(
    ([value, config]) => ({ value, label: config.label, description: config.description })
  )
  const competitionOptions = Object.entries(competitionConfig).map(
    ([value, config]) => ({ value, label: config.label, description: config.description })
  )


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0"
        initialFocus={false}
      >
        {/* ===== Header ===== */}
        <DialogHeader className="flex-shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-[15px] font-bold">
            {isEditing ? "编辑选题" : "新建选题"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "修改定位匹配度评估" : "填写选题信息，系统自动计算优先级"}
          </DialogDescription>
        </DialogHeader>

        {/* ===== Content (scrollable) ===== */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6">

          {/* ----- 基础信息 ----- */}
          <div>
            <SectionTitle>基础信息</SectionTitle>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  选题标题 <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-xs ml-2">一句话选题，你感觉这条选题你会怎么讲？</span>
                </label>
                <Input
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="如：3个方法帮职场妈妈找回时间掌控感"
                  disabled={isEditing || isPrefill}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  选题备注 <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-xs ml-2">理解选题的一句话</span>
                </label>
                <Input
                  value={topicNote}
                  onChange={(e) => setTopicNote(e.target.value)}
                  placeholder="如：时间不够不是你的错，3个实操方法帮你"
                  disabled={isEditing || isPrefill}
                />
              </div>
            </div>
          </div>

          {/* ----- 关联信息 ----- */}
          <div>
            <SectionTitle>关联信息</SectionTitle>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">选题来源</label>
                <Input
                  value={topicSourceConfig[source].label}
                  disabled
                  className="bg-muted/50"
                />
                {!isManualSource && (
                  <p className="text-xs text-muted-foreground mt-1">来源自动关联，不可修改</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  人群维度
                  <span className="text-muted-foreground text-xs ml-2">
                    {isManualSource ? "（建议填写）目标受众是谁" : "（自动关联）"}
                  </span>
                </label>
                <Textarea
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="如：25-35岁职场妈妈"
                  disabled={!isManualSource}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  需求维度
                  <span className="text-muted-foreground text-xs ml-2">
                    {isManualSource ? "（建议填写）解决什么问题" : "（自动关联）"}
                  </span>
                </label>
                <Textarea
                  value={demand}
                  onChange={(e) => setDemand(e.target.value)}
                  placeholder="如：主动 · 显性 · 实用干货 · 时间管理"
                  disabled={!isManualSource}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  内容维度
                  <span className="text-muted-foreground text-xs ml-2">
                    {isManualSource ? "（建议填写）什么展现形式" : "（自动关联）"}
                  </span>
                </label>
                <Textarea
                  value={contentDimension}
                  onChange={(e) => setContentDimension(e.target.value)}
                  placeholder="如：真人出镜 · 标准干货型"
                  disabled={!isManualSource}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ----- 文案内容参考 ----- */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                文案内容参考
              </span>
              {isCopyLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="size-3" />
                  已锁定
                </span>
              )}
              <span className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <span className="text-muted-foreground text-xs">
                    这条选题的文案内容打算怎么写
                  </span>
                </label>
                <Textarea
                  value={copyReference}
                  onChange={(e) => setCopyReference(e.target.value)}
                  placeholder="如：开头用痛点引入，中间讲3个方法，结尾引导关注..."
                  rows={4}
                  disabled={isCopyLocked}
                />
                {isCopyLocked ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    提交保存后文案参考已锁定，不可修改
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    提交保存后将自动锁定为只读
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ----- 定位匹配度评估 ----- */}
          <div>
            <SectionTitle>定位匹配度评估</SectionTitle>
            <div className="space-y-4">
              {/* 定位匹配度 */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  定位匹配度
                  <span className="text-muted-foreground text-xs ml-2">跟我的受众人群匹配吗？</span>
                </label>
                <Select
                  value={positioningMatch}
                  onValueChange={(v) => setPositioningMatch(v as MatchLevel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择匹配度" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {positioningMatch && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {matchLevelConfig[positioningMatch as MatchLevel].description}
                  </p>
                )}
              </div>

              {/* 需求强度 */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  需求强度
                  <span className="text-muted-foreground text-xs ml-2">用户现在有多想要？</span>
                </label>
                <Select
                  value={demandLevel}
                  onValueChange={(v) => setDemandLevel(v as DemandLevel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择需求强度" />
                  </SelectTrigger>
                  <SelectContent>
                    {demandOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {demandLevel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {demandLevelConfig[demandLevel as DemandLevel].description}
                  </p>
                )}
              </div>

              {/* 竞争热点 */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  竞争热点
                  <span className="text-muted-foreground text-xs ml-2">这个赛道竞争激烈吗？</span>
                </label>
                <Select
                  value={competition}
                  onValueChange={(v) => setCompetition(v as CompetitionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择竞争热点" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitionOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {competition && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {competitionConfig[competition as CompetitionType].description}
                  </p>
                )}
              </div>

              {/* 内容定位 */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  内容定位
                  <span className="text-muted-foreground text-xs ml-2">这条内容为了达到什么目的？</span>
                </label>
                <Textarea
                  value={contentPositioning}
                  onChange={(e) => setContentPositioning(e.target.value)}
                  placeholder="如：帮职场妈妈建立时间管理意识，提供可落地的方法"
                  rows={2}
                />
              </div>

              {/* 优先级得分 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">优先级</span>
                  {isPriorityComplete ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-base font-bold tabular-nums tracking-tight",
                        scoreColor
                      )}>
                        {currentScore}
                        <span className="ml-px text-[10px] font-medium text-muted-foreground">分</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand-tint text-brand-foreground">
                        <span className={cn("size-1.5 rounded-full", dotColor)} />
                        {priorityLevelConfig[currentLevel].label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      请选择全部3个维度后自动计算
                    </span>
                  )}
                </div>
                {isPriorityComplete && positioningMatch === "low" && (
                  <p className="text-xs text-destructive mt-2">
                    定位匹配度为低，一票否决降级为「储备」
                  </p>
                )}
                {isPriorityComplete && demandLevel === "low" && positioningMatch !== "low" && (
                  <p className="text-xs text-destructive mt-2">
                    需求强度为低，一票否决降级为「排期做」
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="flex-shrink-0 flex gap-2.5 border-t border-border px-6 py-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : (isEditing ? "保存修改" : "创建选题")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
