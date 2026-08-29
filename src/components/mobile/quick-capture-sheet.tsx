"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { IosSheet } from "./ui/ios-sheet"
import { Lightbulb } from "lucide-react"
import { createFlashThought } from "@/lib/flash-thought"

// ========== 手机端闪念快记 ==========
// 只做一件事：把脑子里冒出来的话原样记下来
//
// 不在这里做归类，是因为整个项目的流程设计是「延迟决策」：
//   快记进来一律是 pending（待处理）
//   之后在闪念池里回看、思考，再决定归到 选题 / 问答 / 灵感，或者转待办
// 这也符合快记的本质——零思考成本，想到什么记什么，写完就走

// 草稿在手机本地的存放键名
const DRAFT_KEY = "quick-capture-draft"

// 草稿保存状态
type SaveState = "idle" | "saving" | "saved"

interface QuickCaptureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCaptureSheet({ open, onOpenChange }: QuickCaptureSheetProps) {
  const [content, setContent] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [isSaving, setIsSaving] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 保存草稿时要用最新的内容，用 ref 存一份避免闭包拿到旧值
  // 注意：ref 只能在事件处理 / effect 里写，不能在渲染期间写
  const contentRef = useRef("")

  // ----- 读取草稿 -----
  const loadDraft = useCallback(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) || ""
    } catch {
      return ""
    }
  }, [])

  // ----- 真正写入本地存储 -----
  const writeDraft = useCallback((text: string) => {
    setSaveState("saving")
    try {
      if (text) {
        localStorage.setItem(DRAFT_KEY, text)
      } else {
        localStorage.removeItem(DRAFT_KEY)
      }
    } catch {
      // 存储不可用（隐私模式等）时静默失败，不影响输入
    }
    setSaveState("saved")
  }, [])

  // ----- 打开时载入草稿 -----
  // setState 放在 setTimeout 里，避免在渲染期间或副作用里同步改状态
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      setContent(loadDraft())
      setSaveState("idle")
    }, 0)
    return () => clearTimeout(timer)
  }, [open, loadDraft])

  // ----- 弹层升起动画结束后，自动聚焦并把光标放到文末 -----
  // 这样用户一打开就能直接打字，不用先点一下输入框
  const handleOpened = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [])

  // ----- 输入时防抖保存 -----
  // 每敲一个字就写一次存储会卡，所以停顿 300ms 才真正写入
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setContent(text)
    // 同步一份到 ref，关闭弹层/切后台时要拿最新内容立即落盘
    contentRef.current = text
    setSaveState("saving")

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => writeDraft(text), 300)
  }

  // ----- 关弹层 / 切后台前，立刻把草稿落盘 -----
  // 手机上切到后台可能被系统杀掉，来不及等防抖
  useEffect(() => {
    if (!open) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
      return
    }

    function flush() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
      writeDraft(contentRef.current)
    }

    document.addEventListener("visibilitychange", flush)
    return () => {
      document.removeEventListener("visibilitychange", flush)
      flush()
    }
  }, [open, writeDraft])

  // ----- 保存 -----
  async function handleSave() {
    const text = content.trim()
    if (!text || isSaving) return

    setIsSaving(true)
    try {
      // 接口内部自带成功提示，这里不重复弹
      await createFlashThought(text)
      // 闪念池页面监听了这个事件，会立即刷新列表
      window.dispatchEvent(new CustomEvent("flash-thought-updated"))

      // 保存成功后清空草稿
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // 静默失败
      }

      setContent("")
      contentRef.current = ""
      setSaveState("idle")
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  // ----- 底部状态文字 -----
  const statusText =
    saveState === "saving" ? "保存中..." : saveState === "saved" ? "已存草稿" : ""

  return (
    <IosSheet open={open} onOpenChange={onOpenChange} onOpened={handleOpened}>
      {/* 顶部：标题 + 保存按钮 */}
      <div className="shrink-0 flex items-center justify-between px-5 pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-foreground" strokeWidth={1.5} />
          <span className="text-[17px] font-semibold text-foreground">闪念快记</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!content.trim() || isSaving}
          className="text-[17px] font-semibold text-foreground disabled:opacity-30 active:opacity-60 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
        >
          保存
        </button>
      </div>

      {/* 输入区 */}
      <div className="flex-1 min-h-0 px-5 pb-2">
        <div className="bg-secondary/40 rounded-[18px] p-4 h-full">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="此刻在想什么？写下来，稍后再整理..."
            className="w-full h-full bg-transparent border-0 p-0 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 resize-none outline-none"
          />
        </div>
      </div>

      {/* 底部状态条 */}
      <div className="shrink-0 px-5 py-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{statusText}</p>
        <p className="text-[11px] text-muted-foreground">{content.length} 字</p>
      </div>
    </IosSheet>
  )
}
