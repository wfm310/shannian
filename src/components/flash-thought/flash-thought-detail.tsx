"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { ExternalLink, FolderInput, FileCheck2 } from "lucide-react"
import type { FlashThought } from "@/lib/db"
import { statusConfig, categoryTargetConfig } from "@/lib/flash-thought"

interface FlashThoughtDetailProps {
  flash: FlashThought | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategorize?: (flash: FlashThought) => void
  onConvertTodo?: (flash: FlashThought) => void
}

export function FlashThoughtDetail({
  flash,
  open,
  onOpenChange,
  onCategorize,
  onConvertTodo,
}: FlashThoughtDetailProps) {
  const router = useRouter()
  const isMobile = useIsMobile()

  if (!flash) return null

  const data = flash
  const statusInfo = statusConfig[data.status]
  const isPending = data.status === "pending"
  const hasCategoryTarget = isPending && !!data.categoryTarget

  function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    const d = date.getDate().toString().padStart(2, "0")
    const h = date.getHours().toString().padStart(2, "0")
    const min = date.getMinutes().toString().padStart(2, "0")
    return `${y}-${m}-${d} ${h}:${min}`
  }

  function handleContinueCategorize() {
    if (data.categoryTarget) {
      const config = categoryTargetConfig[data.categoryTarget]
      router.push(`${config.path}?from=flash-thought&flashId=${data.id}&content=${encodeURIComponent(data.content)}&thought=${encodeURIComponent(data.thought || "")}`)
      onOpenChange(false)
    }
  }

  function handleGoToTarget() {
    if (data.status === "categorized" && data.categoryTarget) {
      const config = categoryTargetConfig[data.categoryTarget]
      if (data.relatedId) {
        if (data.categoryTarget === "qa") {
          router.push(`/qa-collect?id=${data.relatedId}`)
        } else if (data.categoryTarget === "topic") {
          router.push(`/topic-library?openId=${data.relatedId}`)
        } else if (data.categoryTarget === "inspiration") {
          router.push(`/inspiration?id=${data.relatedId}`)
        } else {
          router.push(`${config.path}?from=flash-thought&content=${encodeURIComponent(data.content)}`)
        }
      } else {
        router.push(`${config.path}?from=flash-thought&flashId=${data.id}&content=${encodeURIComponent(data.content)}&thought=${encodeURIComponent(data.thought || "")}`)
      }
      onOpenChange(false)
    } else if (data.status === "converted_todo" && data.relatedId) {
      router.push(`/todo?id=${data.relatedId}`)
      onOpenChange(false)
    }
  }

  const showGoToButton =
    (data.status === "categorized" && data.categoryTarget) ||
    (data.status === "converted_todo" && data.relatedId)

  // ============ 移动端：底部 Sheet ============
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[18px] max-h-[92vh] flex flex-col p-0" showCloseButton={false}>
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-border/30">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm font-medium text-foreground active:text-muted-foreground transition-colors"
            >
              完成
            </button>
            <span className="text-sm font-semibold">闪念详情</span>
            <div className="w-10" />
          </div>

          {/* 内容 - 可滚动 */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* 闪念内容 */}
            <div className="bg-secondary/20 rounded-[18px] p-4">
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                闪念内容
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {data.content}
              </p>
            </div>

            {/* 状态标签 */}
            <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">状态</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    data.status === "pending"
                      ? "bg-foreground/10 text-foreground"
                      : data.status === "categorized"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {statusInfo.label}
                </span>
              </div>
              {data.categoryTarget && (
                <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                  <span className="text-sm text-muted-foreground">归类目标</span>
                  <span className="text-sm font-medium">
                    {categoryTargetConfig[data.categoryTarget].label}
                  </span>
                </div>
              )}
              <div className="h-11 px-4 flex items-center justify-between border-b border-border/20">
                <span className="text-sm text-muted-foreground">创建时间</span>
                <span className="text-sm font-medium">{formatDateTime(data.createdAt)}</span>
              </div>
              {data.processedAt && (
                <div className="h-11 px-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">处理时间</span>
                  <span className="text-sm font-medium">{formatDateTime(data.processedAt)}</span>
                </div>
              )}
            </div>

            {/* 我的想法 */}
            {data.thought && (
              <div className="bg-secondary/20 rounded-[18px] p-4">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  我的想法
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {data.thought}
                </p>
              </div>
            )}

            {/* 操作按钮区 */}
            <div className="space-y-2">
              {isPending && !hasCategoryTarget && onCategorize && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false)
                    onCategorize(data)
                  }}
                >
                  <FolderInput className="size-4" />
                  归类
                </Button>
              )}
              {hasCategoryTarget && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleContinueCategorize}
                >
                  <ExternalLink className="size-4" />
                  继续归类
                </Button>
              )}
              {isPending && onConvertTodo && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false)
                    onConvertTodo(data)
                  }}
                >
                  <FileCheck2 className="size-4" />
                  转待办
                </Button>
              )}
              {showGoToButton && (
                <Button className="w-full" onClick={handleGoToTarget}>
                  <ExternalLink className="size-4" />
                  前往查看
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ============ 桌面端：Dialog ============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                data.status === "pending"
                  ? "bg-foreground/10 text-foreground"
                  : data.status === "categorized"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              {statusInfo.label}
            </span>
            {hasCategoryTarget && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-secondary/40">
                {categoryTargetConfig[data.categoryTarget!].label}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm whitespace-pre-wrap">{data.content}</p>
        </div>

        <div className="space-y-3 pt-2 border-t text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">创建时间</span>
            <span>{formatDateTime(data.createdAt)}</span>
          </div>
          {data.processedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">处理时间</span>
              <span>{formatDateTime(data.processedAt)}</span>
            </div>
          )}
          {data.status === "categorized" && data.categoryTarget && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">归类目标</span>
              <span>{categoryTargetConfig[data.categoryTarget].label}</span>
            </div>
          )}
          {data.thought && (
            <div className="space-y-1">
              <span className="text-muted-foreground">你的想法</span>
              <p className="text-sm">{data.thought}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            {isPending && !hasCategoryTarget && onCategorize && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onCategorize(data)
                }}
              >
                <FolderInput className="size-4" />
                归类
              </Button>
            )}
            {hasCategoryTarget && (
              <Button variant="outline" size="sm" onClick={handleContinueCategorize}>
                <ExternalLink className="size-4" />
                继续归类
              </Button>
            )}
            {isPending && onConvertTodo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onConvertTodo(data)
                }}
              >
                <FileCheck2 className="size-4" />
                转待办
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {showGoToButton && (
              <Button size="sm" onClick={handleGoToTarget}>
                <ExternalLink className="size-4" />
                前往查看
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
