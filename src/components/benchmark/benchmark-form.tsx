"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { useAutoSave } from "@/hooks/use-auto-save"
import { createBenchmark, sourceChannelConfig } from "@/lib/benchmark"
import { useIsDesktop } from "@/hooks/use-media-query"
import { toast } from "sonner"
import { ChevronRight, Check } from "lucide-react"


// ========== 类型定义 ==========
interface BenchmarkFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: string
  onCreated?: () => void
}


// ========== 配置 ==========
const sourceChannelOptions = Object.entries(sourceChannelConfig).map(
  ([value, config]) => ({ value, label: config.label })
)


// ========== 组件定义 ==========
export function BenchmarkForm({
  open,
  onOpenChange,
  currentUser,
  onCreated,
}: BenchmarkFormProps) {
  const isDesktop = useIsDesktop()

  // ----- 表单状态 -----
  const [title, setTitle] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [sourceChannel, setSourceChannel] = useState("")
  const [videoScript, setVideoScript] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [channelSheetOpen, setChannelSheetOpen] = useState(false)

  // ----- 自动保存 -----
  const { loadDraft, clearDraft } = useAutoSave(
    "benchmark-form-draft",
    { title, videoUrl, sourceChannel, videoScript },
    open
  )

  // ----- 打开时恢复草稿 -----
  useEffect(() => {
    if (open) {
      const draft = loadDraft()
      if (draft) {
        setTitle(draft.title || "")
        setVideoUrl(draft.videoUrl || "")
        setSourceChannel(draft.sourceChannel || "")
        setVideoScript(draft.videoScript || "")
        if (draft.title || draft.videoUrl) {
          toast.info("已恢复上次未完成的草稿")
        }
      } else {
        resetForm()
      }
    }
  }, [open, loadDraft])

  // ----- 清空表单 -----
  function resetForm() {
    setTitle("")
    setVideoUrl("")
    setSourceChannel("")
    setVideoScript("")
  }

  // ----- 创建 -----
  async function handleCreate() {
    if (!title.trim()) {
      toast.error("请输入对标视频标题")
      return
    }
    if (!videoUrl.trim()) {
      toast.error("请输入原视频链接")
      return
    }
    if (!sourceChannel) {
      toast.error("请选择来源渠道")
      return
    }
    if (!videoScript.trim()) {
      toast.error("请输入视频文案内容")
      return
    }

    setIsSubmitting(true)
    try {
      await createBenchmark({
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        sourceChannel,
        videoScript: videoScript.trim(),
        assignee: currentUser,
      })
      toast.success("对标视频已创建，快去拆解吧！")
      clearDraft()
      resetForm()
      onOpenChange(false)
      onCreated?.()
    } catch (error) {
      toast.error("创建失败，请重试")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ----- 取消 -----
  function handleCancel() {
    onOpenChange(false)
    toast.info("草稿已自动保存，下次打开可恢复")
  }

  const selectedChannelName = sourceChannelOptions.find(o => o.value === sourceChannel)?.label || ""
  const canSubmit = title.trim() && videoUrl.trim() && sourceChannel && videoScript.trim()

  // ============ 移动端 ============
  if (!isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-[18px] max-h-[92vh] flex flex-col p-0"
          showCloseButton={false}
        >
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-between px-5 h-11 flex-shrink-0 border-b border-border/30">
            <button
              onClick={handleCancel}
              className="text-[15px] font-normal text-muted-foreground active:text-foreground active:opacity-60 transition-colors"
            >
              取消
            </button>
            <span className="text-[15px] font-semibold text-foreground">
              新增对标
            </span>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !canSubmit}
              className="text-[15px] font-semibold text-foreground active:opacity-60 disabled:opacity-30 transition-opacity"
            >
              创建
            </button>
          </div>

          {/* 表单内容 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* 分组：基本信息 */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                基本信息
              </p>
              <div className="bg-secondary/15 rounded-[18px] overflow-hidden">
                {/* 标题 */}
                <div className="h-11 px-4 flex items-center border-b border-border/15">
                  <span className="text-[14px] text-foreground w-14 shrink-0">
                    标题
                  </span>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="请输入"
                    className="flex-1 h-9 border-0 bg-transparent px-0 text-[14px] text-foreground text-right placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {/* 链接 */}
                <div className="h-11 px-4 flex items-center border-b border-border/15">
                  <span className="text-[14px] text-foreground w-14 shrink-0">
                    链接
                  </span>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="请输入"
                    className="flex-1 h-9 border-0 bg-transparent px-0 text-[14px] text-foreground text-right placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {/* 渠道 */}
                <button
                  onClick={() => setChannelSheetOpen(true)}
                  className="w-full h-11 px-4 flex items-center active:bg-secondary/40 transition-colors"
                >
                  <span className="text-[14px] text-foreground w-14 shrink-0 text-left">
                    渠道
                  </span>
                  <span className={`flex-1 text-[14px] text-right ${sourceChannel ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {selectedChannelName || "请选择"}
                  </span>
                  <ChevronRight
                    className="size-[17px] text-muted-foreground/30 ml-1 shrink-0"
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>

            {/* 分组：视频文案 */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                视频文案
              </p>
              <div className="bg-secondary/15 rounded-[18px] p-4">
                <Textarea
                  value={videoScript}
                  onChange={(e) => setVideoScript(e.target.value)}
                  placeholder="粘贴视频的完整文案"
                  rows={6}
                  className="w-full border-0 bg-transparent p-0 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none leading-relaxed"
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2 ml-1">
                把视频的完整文案贴进来，拆解时对照着看
              </p>
            </div>
          </div>

          {/* 渠道选择 Sheet */}
          <Sheet open={channelSheetOpen} onOpenChange={setChannelSheetOpen}>
            <SheetContent
              side="bottom"
              className="rounded-t-[18px] p-0"
              showCloseButton={false}
            >
              <div className="flex items-center justify-between px-5 h-11 border-b border-border/30">
                <button
                  onClick={() => setChannelSheetOpen(false)}
                  className="text-[15px] font-normal text-muted-foreground active:text-foreground active:opacity-60 transition-colors"
                >
                  取消
                </button>
                <span className="text-[15px] font-semibold text-foreground">
                  来源渠道
                </span>
                <div className="w-[34px]" />
              </div>
              <div className="px-5 py-2 space-y-1">
                {sourceChannelOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSourceChannel(opt.value)
                      setChannelSheetOpen(false)
                    }}
                    className={`w-full flex items-center justify-between h-11 px-3 rounded-xl transition-colors ${
                      sourceChannel === opt.value
                        ? "bg-secondary/60"
                        : "active:bg-secondary/40"
                    }`}
                  >
                    <span className="text-[14px] font-normal text-foreground">
                      {opt.label}
                    </span>
                    {sourceChannel === opt.value && (
                      <Check
                        className="size-[17px] text-foreground"
                        strokeWidth={2}
                      />
                    )}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </SheetContent>
      </Sheet>
    )
  }

  // ============ 桌面端 ============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" initialFocus={false}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>新增对标视频</DialogTitle>
          <DialogDescription>录入基础信息，开始深度拆解</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">对标视频标题 *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入视频标题，方便后续查找"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">原视频链接 *</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="粘贴视频链接"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">来源渠道 *</label>
              <Select value={sourceChannel} onValueChange={(v) => setSourceChannel(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道" />
                </SelectTrigger>
                <SelectContent>
                  {sourceChannelOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">视频文案内容 *</label>
              <Textarea
                value={videoScript}
                onChange={(e) => setVideoScript(e.target.value)}
                placeholder="粘贴视频的完整文案，方便拆解分析"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                把视频的完整文案贴进来，拆解时对照着看
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0">
          <div className="flex gap-4 justify-end w-full">
            <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "创建中..." : "创建对标"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
