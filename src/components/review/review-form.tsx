"use client"

// ========== 导入区域 ==========
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { createReview, getPublishedRecords, reviewTypeLabels } from "@/lib/review"
import type { ReviewType, ReviewPeriod, PublishRecord } from "@/lib/db"
import { toast } from "sonner"
import { Check, FileSearch } from "lucide-react"


// ========== 类型定义 ==========
interface ReviewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (id: number) => void
}


// ========== 组件定义 ==========
export function ReviewForm({ open, onOpenChange, onCreated }: ReviewFormProps) {
  const [reviewType, setReviewType] = useState<ReviewType>("single")
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([])
  const [selectedPubId, setSelectedPubId] = useState<number | null>(null)
  const [period, setPeriod] = useState<ReviewPeriod>("daily")
  const [periodDate, setPeriodDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // 切换到单条视频时加载发布记录
  async function loadPublishRecords() {
    setIsLoading(true)
    try {
      const list = await getPublishedRecords()
      setPublishRecords(list)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  function handleTypeChange(value: string) {
    setReviewType(value as ReviewType)
    setSelectedPubId(null)
    if (value === "single" && publishRecords.length === 0) {
      loadPublishRecords()
    }
  }

  // 日期转时间戳
  function dateToTimestamp(dateStr: string, period: ReviewPeriod): { start: number; end: number } {
    const date = new Date(dateStr)
    if (period === "daily") {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const end = start + 24 * 60 * 60 * 1000 - 1
      return { start, end }
    }
    if (period === "weekly") {
      // 找到周一
      const day = date.getDay() || 7
      const monday = new Date(date)
      monday.setDate(date.getDate() - day + 1)
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime()
      const end = start + 7 * 24 * 60 * 60 * 1000 - 1
      return { start, end }
    }
    // monthly
    const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime()
    return { start, end }
  }

  async function handleSubmit() {
    setIsCreating(true)
    try {
      if (reviewType === "single") {
        if (!selectedPubId) {
          toast.error("请选择发布记录")
          return
        }
        const id = await createReview("single", { publishRecordId: selectedPubId })
        onOpenChange(false)
        onCreated?.(id)
      } else {
        if (!periodDate) {
          toast.error("请选择日期")
          return
        }
        const { start, end } = dateToTimestamp(periodDate, period)
        const id = await createReview("periodic", {
          period,
          periodStart: start,
          periodEnd: end,
        })
        onOpenChange(false)
        onCreated?.(id)
      }
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // 格式化日期
  function formatDate(timestamp: number | null): string {
    if (!timestamp) return "—"
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>新建复盘</DialogTitle>
          <DialogDescription>
            选择复盘类型，系统自动拉取数据快照
          </DialogDescription>
        </DialogHeader>

        {/* 复盘类型切换 */}
        <Tabs value={reviewType} onValueChange={handleTypeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">单条视频复盘</TabsTrigger>
            <TabsTrigger value="periodic">周期性复盘</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 单条视频：选择发布记录 */}
        {reviewType === "single" && (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : publishRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileSearch className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">没有已发布的记录</p>
              </div>
            ) : (
              publishRecords.map(pub => (
                <button
                  key={pub.id}
                  type="button"
                  onClick={() => setSelectedPubId(pub.id!)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedPubId === pub.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium line-clamp-1">{pub.title}</span>
                    {selectedPubId === pub.id && (
                      <Check className="size-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">已发布</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(pub.publishTime)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 周期性：选择周期 + 日期 */}
        {reviewType === "periodic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>周期类型</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as ReviewPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  <SelectItem value="daily">日报</SelectItem>
                  <SelectItem value="weekly">周报</SelectItem>
                  <SelectItem value="monthly">月报</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {period === "daily" ? "选择日期" : period === "weekly" ? "选择日期（自动定位所在周）" : "选择日期（自动定位所在月）"}
              </Label>
              <Input
                type="date"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || (reviewType === "single" && !selectedPubId) || (reviewType === "periodic" && !periodDate)}
          >
            {isCreating ? "创建中..." : (
              <>
                <Check className="size-4" />
                创建复盘
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}