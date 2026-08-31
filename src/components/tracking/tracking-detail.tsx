"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { updateTrackingRecord, calculateRates, trackingNodeConfig } from "@/lib/tracking"
import type { TrackingRecord, SearchKeyword } from "@/lib/db"
import { Loader2, Save } from "lucide-react"


// ========== 类型定义 ==========
interface TrackingDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: TrackingRecord | null
  onSaved: () => void
}

interface FormState {
  views: string
  likes: string
  comments: string
  shares: string
  favorites: string
  followers: string
  avgPlayDuration: string
  completionRate: string
  bounceRate2s: string
  retention5s: string
  searchKeywordsIn: string
  searchKeywordsOut: string
}


// ========== 辅助函数 ==========
function toFormState(record: TrackingRecord): FormState {
  return {
    views: record.views?.toString() ?? "",
    likes: record.likes?.toString() ?? "",
    comments: record.comments?.toString() ?? "",
    shares: record.shares?.toString() ?? "",
    favorites: record.favorites?.toString() ?? "",
    followers: record.followers?.toString() ?? "",
    avgPlayDuration: record.avgPlayDuration?.toString() ?? "",
    completionRate: record.completionRate?.toString() ?? "",
    bounceRate2s: record.bounceRate2s?.toString() ?? "",
    retention5s: record.retention5s?.toString() ?? "",
    searchKeywordsIn: record.searchKeywordsIn?.join(", ") ?? "",
    searchKeywordsOut: record.searchKeywordsOut?.join(", ") ?? "",
  }
}

function parseNumber(s: string): number | null {
  if (!s.trim()) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// 解析关键词输入为「词 + 频次」结构（14 文档 §3.4）
// 支持两种写法：纯词（频次默认 1）或 "词:频次"
function parseKeywords(s: string | undefined | null): SearchKeyword[] {
  if (!s) return []
  return s
    .split(",")
    .map(raw => raw.trim())
    .filter(Boolean)
    .map(item => {
      const idx = item.lastIndexOf(":")
      if (idx > 0) {
        const count = Number(item.slice(idx + 1).trim())
        const word = item.slice(0, idx).trim()
        if (word && Number.isFinite(count)) return { word, count }
      }
      return { word: item, count: 1 }
    })
}

function getNodeLabel(record: TrackingRecord): string {
  if (record.node === "custom") return record.customLabel || "长尾"
  return trackingNodeConfig[record.node].shortLabel
}


// ========== 组件定义 ==========
export function TrackingDetail({
  open, onOpenChange, record, onSaved,
}: TrackingDetailProps) {
  const [form, setForm] = useState<FormState>(toFormState(record ?? {} as TrackingRecord))
  const [saving, setSaving] = useState(false)

  const draftKey = record ? `tracking-draft-${record.id}` : ""

  // ---------- 打开时恢复草稿 ----------
  useEffect(() => {
    if (!open || !record) return

    const saved = localStorage.getItem(draftKey)
    if (saved) {
      try {
        setForm(JSON.parse(saved))
      } catch {
        setForm(toFormState(record))
      }
    } else {
      setForm(toFormState(record))
    }
  }, [open, record, draftKey])

  // ---------- 自动保存到 localStorage ----------
  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (draftKey) {
        localStorage.setItem(draftKey, JSON.stringify(next))
      }
      return next
    })
  }, [draftKey])

  // ---------- 保存数据 ----------
  const handleSave = async () => {
    if (!record?.id) return
    setSaving(true)
    try {
      await updateTrackingRecord(record.id, {
        views: parseNumber(form.views),
        likes: parseNumber(form.likes),
        comments: parseNumber(form.comments),
        shares: parseNumber(form.shares),
        favorites: parseNumber(form.favorites),
        followers: parseNumber(form.followers),
        avgPlayDuration: parseNumber(form.avgPlayDuration),
        completionRate: parseNumber(form.completionRate),
        bounceRate2s: parseNumber(form.bounceRate2s),
        retention5s: parseNumber(form.retention5s),
        searchKeywordsIn: parseKeywords(form.searchKeywordsIn),
        searchKeywordsOut: parseKeywords(form.searchKeywordsOut),
        status: "recorded",
        recordedAt: Date.now(),
      })
      localStorage.removeItem(draftKey)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error("保存失败:", err)
    } finally {
      setSaving(false)
    }
  }

  // ---------- 实时计算互动率 ----------
  const rates = calculateRates({
    ...record!,
    views: parseNumber(form.views),
    likes: parseNumber(form.likes),
    comments: parseNumber(form.comments),
    shares: parseNumber(form.shares),
    favorites: parseNumber(form.favorites),
  } as TrackingRecord)

  if (!record) return null

  // ---------- 输入框配置 ----------
  const trafficFields: { key: keyof FormState; label: string; placeholder: string }[] = [
    { key: "views", label: "播放量", placeholder: "如 5200" },
    { key: "likes", label: "点赞量", placeholder: "如 120" },
    { key: "comments", label: "评论量", placeholder: "如 35" },
    { key: "shares", label: "分享量", placeholder: "如 18" },
    { key: "favorites", label: "收藏量", placeholder: "如 89" },
    { key: "followers", label: "涨粉量", placeholder: "如 45" },
  ]

  const contentFields: { key: keyof FormState; label: string; placeholder: string; suffix?: string }[] = [
    { key: "avgPlayDuration", label: "平均播放时长", placeholder: "秒，如 32", suffix: "秒" },
    { key: "completionRate", label: "完播率", placeholder: "如 42.5", suffix: "%" },
    { key: "bounceRate2s", label: "2s跳出率", placeholder: "如 15.3", suffix: "%" },
    { key: "retention5s", label: "5s完播率", placeholder: "如 68.2", suffix: "%" },
  ]

  const rateDisplays: { label: string; value: string }[] = [
    { label: "点赞率", value: rates.likeRate },
    { label: "评论率", value: rates.commentRate },
    { label: "分享率", value: rates.shareRate },
    { label: "收藏率", value: rates.favoriteRate },
  ]

  // ---------- 渲染 ----------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        initialFocus={false}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            录入数据
            <Badge variant="secondary" className="text-xs">{getNodeLabel(record)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {/* --- 流量数据 --- */}
          <section>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">流量数据</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {trafficFields.map(field => (
                <div key={field.key}>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {field.label}
                  </Label>
                  <Input
                    type="number"
                    value={form[field.key]}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* --- 互动率（自动计算） --- */}
          <section>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">互动率（自动计算）</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {rateDisplays.map(item => (
                <div key={item.label} className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                  <div className="text-sm font-semibold font-mono tabular-nums">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* --- 内容吸引力 --- */}
          <section>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">内容吸引力</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {contentFields.map(field => (
                <div key={field.key}>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {field.label}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={form[field.key]}
                      onChange={e => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="h-8 text-sm pr-7"
                    />
                    {field.suffix && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        {field.suffix}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* --- 搜索关键词 --- */}
          <section>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">搜索关键词</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">搜索进入词</Label>
                <Textarea
                  value={form.searchKeywordsIn}
                  onChange={e => updateField("searchKeywordsIn", e.target.value)}
                  placeholder="多个关键词用逗号分隔"
                  rows={2}
                  className="resize-y text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">搜索离开词</Label>
                <Textarea
                  value={form.searchKeywordsOut}
                  onChange={e => updateField("searchKeywordsOut", e.target.value)}
                  placeholder="多个关键词用逗号分隔"
                  rows={2}
                  className="resize-y text-sm"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存数据
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
