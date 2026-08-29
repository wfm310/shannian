'use client'

// ========== 文件作用 ==========
// Markdown 笔记编辑器（Dialog 弹窗）
// 支持新建和编辑笔记，支持 [[双向链接]] 语法

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { toast } from "sonner"
import {
  createNote, updateNote, parseMarkdownLinks, findNodeIdByTitle,
} from "@/lib/knowledge-base"
import type { KnowledgeNote } from "@/lib/db"

// ========== 组件属性 ==========
interface KnowledgeNoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNote: KnowledgeNote | null
  onSaved: () => void
}

// ========== 组件定义 ==========
export function KnowledgeNoteEditor({
  open,
  onOpenChange,
  editingNote,
  onSaved,
}: KnowledgeNoteEditorProps) {
  // ---------- 状态 ----------
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)

  // ---------- 编辑时填充数据 ----------
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title)
      setContent(editingNote.content)
      setTags(editingNote.tags)
    } else {
      setTitle("")
      setContent("")
      setTags([])
    }
    setTagInput("")
  }, [editingNote, open])

  // ---------- 添加标签 ----------
  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput("")
  }

  // ---------- 删除标签 ----------
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // ---------- 保存 ----------
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("请输入笔记标题")
      return
    }

    setSaving(true)
    try {
      // 解析 [[双向链接]]，找出引用的节点ID
      const linkTitles = parseMarkdownLinks(content)
      const linkIds: number[] = []
      for (const t of linkTitles) {
        const id = await findNodeIdByTitle(t)
        if (id !== null) linkIds.push(id)
      }

      if (editingNote?.id) {
        await updateNote(editingNote.id, {
          title: title.trim(),
          content,
          tags,
          links: linkIds,
        })
        toast.success("笔记已更新")
      } else {
        await createNote({
          title: title.trim(),
          content,
          tags,
          links: linkIds,
        })
        toast.success("笔记已创建")
      }

      onSaved()
      onOpenChange(false)
    } catch (error) {
      console.error("保存笔记失败:", error)
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  // ========== 渲染 ==========
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>
            {editingNote ? "编辑笔记" : "新建笔记"}
          </DialogTitle>
          <DialogDescription>
            支持 Markdown 语法，用 [[标题]] 创建双向链接
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="note-title">标题</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入笔记标题"
            />
          </div>

          {/* 内容 */}
          <div className="space-y-2">
            <Label htmlFor="note-content">内容（Markdown）</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在这里写笔记内容...&#10;&#10;用 [[标题]] 引用其他知识节点&#10;用 # 标签 标记分类"
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="输入标签后按回车"
                className="max-w-[200px]"
              />
              <Button variant="secondary" onClick={handleAddTag}>
                添加
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}