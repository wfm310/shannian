"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/layout/page-header"
import { TrackingOverview } from "@/components/tracking/tracking-overview"
import { TrackingForm } from "@/components/tracking/tracking-form"
import { TrackingVideoDetail } from "@/components/tracking/tracking-video-detail"
import { TrackingDetail } from "@/components/tracking/tracking-detail"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  getVideoOverviews, getTrackingRecords, addCustomTracking,
} from "@/lib/tracking"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import type { VideoOverview } from "@/lib/tracking"
import type { TrackingRecord } from "@/lib/db"
import { Plus, BarChart3, Loader2 } from "lucide-react"


// ========== 页面组件 ==========
export default function DashboardPage() {
  // ----- 列表数据 -----
  const [videoOverviews, setVideoOverviews] = useState<VideoOverview[]>([])
  const [allRecords, setAllRecords] = useState<TrackingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const firstLoadRef = useRef(true)

  // ----- 筛选状态 -----
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  // ----- 创建弹窗 -----
  const [formOpen, setFormOpen] = useState(false)

  // ----- 详情视图 -----
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null)

  // ----- 编辑弹窗 -----
  const [editRecordId, setEditRecordId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // ----- 添加长尾弹窗 -----
  const [longTailOpen, setLongTailOpen] = useState(false)
  const [longTailLabel, setLongTailLabel] = useState("")
  const [longTailSaving, setLongTailSaving] = useState(false)

  // ---------- 加载数据 ----------
  const loadData = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) setIsLoading(true)
    try {
      const [overviews, records] = await Promise.all([
        getVideoOverviews(),
        getTrackingRecords(),
      ])
      setVideoOverviews(overviews)
      setAllRecords(records)
    } catch (error) {
      console.error("加载失败:", error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(firstLoadRef.current)
    firstLoadRef.current = false
  }, [loadData])

  // ---------- 创建后刷新 ----------
  function handleCreated() {
    loadData(false)
    setFormOpen(false)
  }

  // ---------- 编辑保存后刷新 ----------
  function handleEditSaved() {
    loadData(false)
  }

  // ---------- 添加长尾节点 ----------
  async function handleAddLongTail() {
    if (!selectedPubId || !longTailLabel.trim()) return
    setLongTailSaving(true)
    try {
      await addCustomTracking(selectedPubId, longTailLabel)
      await loadData(false)
      setLongTailLabel("")
      setLongTailOpen(false)
    } catch (err) {
      console.error("添加长尾失败:", err)
    } finally {
      setLongTailSaving(false)
    }
  }

  // ---------- 选中视频的 overview ----------
  const selectedOverview = videoOverviews.find(v => v.publishRecordId === selectedPubId) ?? null

  // ---------- 编辑的 record ----------
  const editRecord = selectedOverview?.nodes.find(r => r.id === editRecordId) ?? null

  // ---------- 渲染 ----------
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ===== 详情视图（全屏替换） ===== */}
      {selectedOverview ? (
        <TrackingVideoDetail
          overview={selectedOverview}
          onBack={() => setSelectedPubId(null)}
          onEditNode={(recordId) => {
            setEditRecordId(recordId)
            setEditOpen(true)
          }}
          onAddLongTail={() => setLongTailOpen(true)}
        />
      ) : (
        <>
          {/* ===== 页面头部 ===== */}
          <PageHeader
            title="数据追踪"
            description="全维度数据监控，洞察内容表现与增长趋势"
            searchEnabled={true}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="搜索视频标题或描述..."
            createEnabled={true}
            onCreate={() => setFormOpen(true)}
            className="md:px-6 lg:px-8"
          />

          {/* ===== 内容区 ===== */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            {showSkeleton ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-72 rounded-lg" />
                <Skeleton className="h-96 rounded-lg" />
              </div>
            ) : videoOverviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                  <BarChart3 className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">还没有追踪数据</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  从已发布的记录创建追踪，按固定节点录入数据
                </p>
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  从发布记录创建
                </Button>
              </div>
            ) : (
              <TrackingOverview
                videoOverviews={videoOverviews}
                allRecords={allRecords}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onVideoClick={(id) => setSelectedPubId(id)}
              />
            )}
          </div>
        </>
      )}

      {/* ===== 创建追踪弹窗 ===== */}
      <TrackingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={handleCreated}
      />

      {/* ===== 编辑数据弹窗 ===== */}
      <TrackingDetail
        open={editOpen}
        onOpenChange={setEditOpen}
        record={editRecord}
        onSaved={handleEditSaved}
      />

      {/* ===== 添加长尾节点弹窗 ===== */}
      <Dialog open={longTailOpen} onOpenChange={setLongTailOpen}>
        <DialogContent className="max-w-sm" initialFocus={false}>
          <DialogHeader>
            <DialogTitle>添加长尾追踪节点</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              节点标签
            </Label>
            <Input
              value={longTailLabel}
              onChange={e => setLongTailLabel(e.target.value)}
              placeholder="如：发布后60天"
              className="h-9 text-sm"
              onKeyDown={e => {
                if (e.key === "Enter" && !longTailSaving) handleAddLongTail()
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              长尾节点用于追踪视频发布较长时间后的数据表现
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLongTailOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddLongTail} disabled={longTailSaving || !longTailLabel.trim()}>
              {longTailSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
