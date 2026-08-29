"use client"

import { useRouter } from "next/navigation"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  topicSourceConfig, topicStatusConfig,
  matchLevelConfig, demandLevelConfig, competitionConfig,
  priorityLevelConfig, formatRelativeTime,
} from "@/lib/topic"
import type { Topic } from "@/lib/db"
import { toast } from "sonner"
import { Pencil, ExternalLink, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsDesktop } from "@/hooks/use-media-query"


interface TopicDetailProps {
  topic: Topic | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (topic: Topic) => void
}

const tagStyles: Record<string, string> = {
  brand: "bg-brand-tint text-brand-foreground",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  neutral: "bg-muted text-muted-foreground",
}


export function TopicDetail({
  topic,
  open,
  onOpenChange,
  onEdit,
}: TopicDetailProps) {
  const router = useRouter()
  const isDesktop = useIsDesktop()

  function handleEdit() {
    if (!topic) return
    onOpenChange(false)
    onEdit?.(topic)
  }

  function handleSourceJump() {
    if (!topic?.sourceId) return
    switch (topic.source) {
      case "benchmark":
        router.push(`/benchmark?id=${topic.sourceId}`)
        break
      case "qa":
        router.push(`/qa-collect?id=${topic.sourceId}`)
        break
      case "inspiration":
        router.push(`/inspiration?id=${topic.sourceId}`)
        break
      case "review":
        router.push(`/review?id=${topic.sourceId}`)
        break
      default:
        toast.info("该来源暂不支持跳转")
    }
  }

  if (!topic) return null

  const sourceInfo = topicSourceConfig[topic.source]
  const statusInfo = topicStatusConfig[topic.status]
  const priorityInfo = priorityLevelConfig[topic.priorityLevel]
  const matchInfo = topic.positioningMatch ? matchLevelConfig[topic.positioningMatch] : null
  const demandInfo = topic.demandLevel ? demandLevelConfig[topic.demandLevel] : null
  const competitionInfo = topic.competition ? competitionConfig[topic.competition] : null
  const canJumpToSource = !!topic.sourceId && topic.source !== "manual"

  const scoreColor = topic.priorityLevel === "urgent" ? "text-brand"
    : topic.priorityLevel === "scheduled" ? "text-foreground"
    : "text-muted-foreground/50"

  const matchTag = topic.positioningMatch === "high" ? "success"
    : topic.positioningMatch === "medium" ? "warning"
    : topic.positioningMatch === "low" ? "danger" : "neutral"

  const demandTag = topic.demandLevel === "high" ? "success"
    : topic.demandLevel === "medium" ? "warning"
    : "neutral"

  const competitionTag = topic.competition === "blue_ocean" ? "success"
    : topic.competition === "red_ocean" ? "danger" : "neutral"

  const statusTag = topic.status === "published" ? "success" : "neutral"

  const dotColor = topic.priorityLevel === "urgent" ? "bg-brand"
    : topic.priorityLevel === "scheduled" ? "bg-muted-foreground"
    : "bg-muted-foreground/50"


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        initialFocus={false}
        className={cn(
          "p-0",
          isDesktop
            ? "data-[side=right]:w-[440px] data-[side=right]:max-w-[440px]"
            : "data-[side=bottom]:h-[85vh] data-[side=bottom]:rounded-t-2xl"
        )}
      >
        {/* ===== Mobile drag handle ===== */}
        {!isDesktop && (
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* ===== Header ===== */}
        <SheetHeader className="flex-shrink-0 border-b border-border px-4 sm:px-6 py-4">
          <SheetTitle className="text-[15px] font-bold">选题详情</SheetTitle>
          <SheetDescription className="sr-only">选题详情面板</SheetDescription>
        </SheetHeader>

        {/* ===== Content (scrollable) ===== */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-5 space-y-6">

          {/* 优先级 + 分数 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                tagStyles.brand
              )}>
                <span className={cn("size-1.5 rounded-full", dotColor)} />
                {priorityInfo.label}
              </span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                tagStyles[statusTag]
              )}>
                {statusInfo.label}
              </span>
            </div>
            {topic.priorityScore > 0 && (
              <div className={cn(
                "text-[32px] font-bold tabular-nums tracking-tight leading-none",
                scoreColor
              )}>
                {topic.priorityScore}
                <span className="ml-1 text-sm font-medium text-muted-foreground">分</span>
              </div>
            )}
          </div>

          {/* 标题 + 备注 */}
          <div>
            <h2 className="text-lg font-bold leading-[1.4] tracking-tight mb-2">
              {topic.topicTitle}
            </h2>
            {topic.topicNote && (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {topic.topicNote}
              </p>
            )}
          </div>

          {/* 基础信息 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                基础信息
              </span>
              <span className="flex-1 h-px bg-border/50" />
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">来源</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {sourceInfo.label}
                {canJumpToSource && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-1 h-5 text-[11px] px-1.5"
                    onClick={handleSourceJump}
                  >
                    <ExternalLink className="size-3" />
                    查看
                  </Button>
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">状态</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {statusInfo.label}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">创建时间</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {formatRelativeTime(topic.createdAt)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">创建人</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.creator}
              </span>
            </div>
          </div>

          {/* 关联信息 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                关联信息
              </span>
              <span className="flex-1 h-px bg-border/50" />
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">人群维度</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.audience || "未填写"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">需求维度</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.demand || "未填写"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">内容维度</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.contentDimension || "未填写"}
              </span>
            </div>
          </div>

          {/* 文案内容参考 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                文案内容参考
              </span>
              {topic.copyReferenceLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="size-3" />
                  已锁定
                </span>
              )}
              <span className="flex-1 h-px bg-border/50" />
            </div>
            <p className="text-[13px] leading-relaxed text-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">
              {topic.copyReference || "未填写"}
            </p>
          </div>

          {/* 定位匹配度评估 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                定位匹配度评估
              </span>
              <span className="flex-1 h-px bg-border/50" />
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">定位匹配</span>
              <span className="flex-1 text-right">
                {matchInfo ? (
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    tagStyles[matchTag]
                  )}>
                    {matchInfo.label} · {matchInfo.description}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">未评估</span>
                )}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">需求强度</span>
              <span className="flex-1 text-right">
                {demandInfo ? (
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    tagStyles[demandTag]
                  )}>
                    {demandInfo.label} · {demandInfo.description}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">未评估</span>
                )}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">竞争热度</span>
              <span className="flex-1 text-right">
                {competitionInfo ? (
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    tagStyles[competitionTag]
                  )}>
                    {competitionInfo.label} · {competitionInfo.description}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/50">未评估</span>
                )}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">内容定位</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.contentPositioning || "未填写"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">优先级得分</span>
              <span className="flex-1 text-right text-[13px] font-medium text-foreground">
                {topic.priorityScore} 分
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">优先级星级</span>
              <span className="flex-1 text-right">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  tagStyles.brand
                )}>
                  <span className={cn("size-1.5 rounded-full", dotColor)} />
                  {priorityInfo.label}
                </span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 py-2">
              <span className="shrink-0 w-20 text-xs text-muted-foreground">选题状态</span>
              <span className="flex-1 text-right">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  tagStyles[statusTag]
                )}>
                  {statusInfo.label}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="flex-shrink-0 flex gap-2.5 border-t border-border px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button className="flex-1" onClick={handleEdit}>
            <Pencil className="size-4" />
            编辑
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
