"use client"

import { Card } from "@/components/ui/card"
import type { Topic } from "@/lib/db"
import {
  topicSourceConfig,
  topicStatusConfig,
  priorityLevelConfig,
  formatRelativeTime,
} from "@/lib/topic"
import { cn } from "@/lib/utils"

interface TopicCardProps {
  topic: Topic
  onOpen: (id: number) => void
}

export function TopicCard({ topic, onOpen }: TopicCardProps) {
  const sourceInfo = topicSourceConfig[topic.source]
  const statusInfo = topicStatusConfig[topic.status]
  const priorityInfo = priorityLevelConfig[topic.priorityLevel]

  return (
    <Card
      className={cn(
        "group relative cursor-pointer gap-0 p-[18px] ring-0 border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/10 hover:shadow-md",
        topic.priorityLevel === "urgent" &&
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] before:bg-brand",
        topic.priorityLevel === "reserve" && "opacity-60 hover:opacity-[0.85]"
      )}
      onClick={() => topic.id && onOpen(topic.id)}
    >
      {/* 优先级徽章 */}
      <div
        className={cn(
          "mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          topic.priorityLevel === "urgent" && "bg-brand-tint text-brand-foreground",
          topic.priorityLevel === "scheduled" && "bg-muted text-muted-foreground",
          topic.priorityLevel === "reserve" && "bg-muted/50 text-muted-foreground/70"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            topic.priorityLevel === "urgent" && "bg-brand",
            topic.priorityLevel === "scheduled" && "bg-muted-foreground",
            topic.priorityLevel === "reserve" && "bg-muted-foreground/50"
          )}
        />
        {priorityInfo.label}
      </div>

      {/* 标题 */}
      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-[1.45]">
        {topic.topicTitle}
      </h3>

      {/* 备注 */}
      {topic.topicNote ? (
        <p className="mb-3 line-clamp-1 text-xs leading-[1.5] text-muted-foreground">
          {topic.topicNote}
        </p>
      ) : (
        <div className="mb-3" />
      )}

      {/* 底部：来源·时间·状态 | 分数 */}
      <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{sourceInfo.label}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatRelativeTime(topic.createdAt)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{statusInfo.label}</span>
        </div>
        {topic.priorityScore > 0 ? (
          <div
            className={cn(
              "text-base font-bold tabular-nums tracking-tight",
              topic.priorityLevel === "urgent" && "text-brand",
              topic.priorityLevel === "scheduled" && "text-foreground",
              topic.priorityLevel === "reserve" && "text-muted-foreground/50"
            )}
          >
            {topic.priorityScore}
            <span className="ml-px text-[10px] font-medium text-muted-foreground">
              分
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">未评估</span>
        )}
      </div>
    </Card>
  )
}
