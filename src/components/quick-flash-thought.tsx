'use client'

// ========== 文件作用 ==========
// 全局快记组件：快捷键 N / 手机端快记按钮唤出弹窗，随时随地记录想法
//
// 两种形态（按屏幕宽度自动切换）：
//   移动端（< 1024）→ QuickCaptureSheet：底部弹层，下滑关闭，可存成闪念/灵感/问答
//   桌面端（>= 1024）→ Dialog：居中弹窗，只存成闪念（保持原样未改）
//
// 注意：移动端和桌面端的草稿是分开存的，各用各的 localStorage 键

// ========== 导入区域 ==========
import { useEffect, useState, useRef, useCallback } from "react"
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useIsDesktop } from "@/hooks/use-media-query"
import { QuickCaptureSheet } from "@/components/mobile/quick-capture-sheet"
import { Lightbulb } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/db"
import type { FlashThought } from "@/lib/db"

// localStorage 存储键名
const STORAGE_KEY = "quick-flash-draft"

// ========== 组件定义 ==========
export function QuickFlashThought() {
  // 用 !isDesktop 判断是不是移动端，和全局外壳 responsive-layout 保持一致
  // 这样平板宽度下弹窗样式才不会和外壳打架
  const isMobile = !useIsDesktop()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 从 localStorage 读取草稿
  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem(STORAGE_KEY)
      if (draft) return draft
    } catch {}
    return ""
  }, [])

  // 保存草稿到 localStorage
  const saveDraft = useCallback((text: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, text)
    } catch {}
  }, [])

  // 监听快捷键 N 和 Tab 栏快记按钮事件
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.tagName === "SELECT"

      if (isTyping) return

      if (e.key === "n" || e.key === "N") {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        setOpen(true)
      }

      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    function onQuickFlashOpen() {
      setOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("quick-flash-open", onQuickFlashOpen)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("quick-flash-open", onQuickFlashOpen)
    }
  }, [])

  // 弹窗打开/关闭时处理
  useEffect(() => {
    if (open) {
      const draft = loadDraft()
      setContent(draft)
      setTimeout(() => {
        textareaRef.current?.focus()
        const len = draft.length
        textareaRef.current?.setSelectionRange(len, len)
      }, 200)
    }
  }, [open, loadDraft])

  // 内容变化时实时保存
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setContent(text)
    saveDraft(text)
  }

  // 保存闪念
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("请输入内容")
      return
    }

    const now = Date.now()
    const flash: FlashThought = {
      content: content.trim(),
      status: "pending",
      categoryTarget: null,
      relatedId: null,
      thought: null,
      createdAt: now,
      processedAt: null,
    }

    await db.flashThoughts.add(flash)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setContent("")
    toast.success("闪念已记录")
    setOpen(false)
    window.dispatchEvent(new CustomEvent("flash-thought-updated"))
  }

  // Ctrl/Cmd + Enter 快速保存
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
  }

  // ============ 移动端：底部弹层 ============
  // 手机和平板上用新的快记弹层，支持下滑关闭、打开即输入、存成三种类型
  if (isMobile) {
    return <QuickCaptureSheet open={open} onOpenChange={setOpen} />
  }

  // ============ 桌面端：Dialog ============
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col gap-0 p-0" initialFocus={false}>
        <div className="shrink-0 px-5 pt-5 pb-3 flex items-center gap-2 border-b">
          <Lightbulb className="size-5 shrink-0" />
          <DialogTitle className="text-base flex-1">闪念快记</DialogTitle>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="此刻在想什么？写下来，稍后再整理..."
            className="w-full min-h-[120px] max-h-[50vh] resize-none border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed bg-transparent"
          />
        </div>

        <div className="shrink-0 px-5 py-3 border-t flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Ctrl + Enter 快速保存
          </p>
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
