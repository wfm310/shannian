"use client"

// ========== 闪念池顶部输入框 ==========
// 回车或点按钮保存，保存后清空保留焦点

import { useState, useRef, type KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import { createFlashThought } from "@/lib/flash-thought"


interface FlashThoughtInputProps {
  onCreated?: () => void  // 创建成功后的回调（用来刷新列表）
}


export function FlashThoughtInput({ onCreated }: FlashThoughtInputProps) {
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 保存闪念
  async function handleSave() {
    if (!content.trim() || isSaving) return

    setIsSaving(true)
    try {
      await createFlashThought(content)
      setContent("")               // 清空输入框
      inputRef.current?.focus()    // 保持焦点，可继续输入
      onCreated?.()                // 通知父组件刷新列表
    } finally {
      setIsSaving(false)
    }
  }

  // 回车保存
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 左侧图标 */}
      <div className="flex-shrink-0 text-muted-foreground">
        <Lightbulb className="size-5" />
      </div>

      {/* 输入框 */}
      {/* flex-1 → 占满剩余宽度 */}
      <Input
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="记录你的闪念..."
        className="flex-1"
      />

      {/* 保存按钮 */}
      <Button onClick={handleSave} disabled={!content.trim() || isSaving}>
        {isSaving ? "保存中..." : "保存"}
      </Button>
    </div>
  )
}
