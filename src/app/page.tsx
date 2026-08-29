'use client'

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { db, type Todo, type FlashThought, type ProductionTask, type TrackingRecord } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { stageOrder, stageLabels } from "@/lib/produce-flow"
import { calculateKPI } from "@/lib/tracking"
import { subscribeProgressChanges } from "@/lib/progress-events"
import { subscribeNotifications } from "@/lib/notification-events"
import { formatRelativeTime } from "@/lib/topic"
import { Sparkles } from "lucide-react"

const statusDotColor: Record<string, string> = {
  pending: "bg-gray-400/40",
  "in-progress": "bg-[#FF9500]",
  done: "bg-[#34C759]",
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "outline",
  "in-progress": "default",
  done: "secondary",
}

const statusLabel: Record<string, string> = {
  pending: "待办",
  "in-progress": "进行中",
  done: "已完成",
}

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [todos, setTodos] = useState<Todo[]>([])
  const [latestFlash, setLatestFlash] = useState<FlashThought | null>(null)
  const [activeProductions, setActiveProductions] = useState<ProductionTask[]>([])
  const [publishedCount, setPublishedCount] = useState(0)
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [allTodos, allFlash, allProductions, pubCount, allTracking] = await Promise.all([
        db.todos.filter(t => !t.archived).toArray(),
        db.flashThoughts.toArray(),
        db.productions.filter(p => p.status === "active").toArray(),
        db.publishRecords.where("status").equals("published").count(),
        db.trackingRecords.toArray(),
      ])

      const statusOrder: Record<string, number> = { "in-progress": 0, "pending": 1, "done": 2 }
      allTodos.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
      allFlash.sort((a, b) => b.createdAt - a.createdAt)

      setTodos(allTodos)
      setLatestFlash(allFlash[0] || null)
      setActiveProductions(allProductions)
      setPublishedCount(pubCount)
      setTrackingRecords(allTracking)
      setLoadError(null)
    } catch (err) {
      // 读取本地数据库失败时，也要结束加载状态
      // 否则页面会永远停在骨架屏，看起来就像所有按钮都点不了
      console.error("首页数据加载失败：", err)
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const unsub1 = subscribeProgressChanges(() => loadData())
    const unsub2 = subscribeNotifications(() => loadData())
    return () => { unsub1(); unsub2() }
  }, [loadData])

  const todoCount = todos.length
  const productionCount = activeProductions.length
  const kpi = calculateKPI(trackingRecords)

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent("quick-flash-open"))
  }

  if (loading) {
    return (
      <div className="min-h-full">
        <PageHeader title="内容工作台" description="加载中..." />
        <div className="px-5 pt-3 space-y-5">
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-20 rounded-[18px]" />
            <Skeleton className="flex-1 h-20 rounded-[18px]" />
            <Skeleton className="flex-1 h-20 rounded-[18px]" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-[18px]" />
          <Skeleton className="h-12 w-full rounded-[18px]" />
        </div>
      </div>
    )
  }

  // 本地数据库读取失败时，显示错误原因，方便排查
  if (loadError) {
    return (
      <div className="min-h-full">
        <PageHeader title="内容工作台" description="数据读取失败" />
        <div className="px-5 pt-4 space-y-3">
          <Card className="rounded-[18px]">
            <CardContent className="space-y-2">
              <p className="text-[15px] font-medium text-foreground">
                无法读取本机数据
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                这个应用把数据存在浏览器本地数据库里。常见原因是手机浏览器开启了无痕/隐私模式，或禁用了网站数据。
              </p>
              <p className="text-[11px] text-muted-foreground/70 font-mono break-all">
                {loadError}
              </p>
            </CardContent>
          </Card>
          <button
            onClick={() => {
              setLoading(true)
              setLoadError(null)
              loadData()
            }}
            className="w-full h-11 rounded-[18px] bg-secondary text-[15px] font-medium text-foreground active:opacity-70"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  const hasContent = todoCount > 0 || latestFlash || productionCount > 0 || kpi.videoCount > 0

  return (
    <div className="min-h-full">
      <PageHeader
        title="内容工作台"
        description={`今日 ${todoCount} 条待办 · ${productionCount} 条生产中`}
        createEnabled
        onCreate={handleCreate}
      />

      <div className="px-5 pb-safe-3">
        {/* 快捷统计 */}
        <div className="flex gap-3 pt-3 mb-5">
          <Card
            className="flex-1 cursor-pointer active:bg-secondary/30 transition-colors"
            onClick={() => router.push("/todo")}
          >
            <CardContent>
              <div className="text-[34px] font-bold tabular-nums leading-[1.21]">{todoCount}</div>
              <div className="text-[13px] text-muted-foreground mt-1">今日待办</div>
            </CardContent>
          </Card>
          <Card
            className="flex-1 cursor-pointer active:bg-secondary/30 transition-colors"
            onClick={() => router.push("/produce-flow")}
          >
            <CardContent>
              <div className="text-[34px] font-bold tabular-nums leading-[1.21]">{productionCount}</div>
              <div className="text-[13px] text-muted-foreground mt-1">生产中</div>
            </CardContent>
          </Card>
          <Card
            className="flex-1 cursor-pointer active:bg-secondary/30 transition-colors"
            onClick={() => router.push("/publish")}
          >
            <CardContent>
              <div className="text-[34px] font-bold tabular-nums leading-[1.21]">{publishedCount}</div>
              <div className="text-[13px] text-muted-foreground mt-1">已发布</div>
            </CardContent>
          </Card>
        </div>

        {/* 今日待办 */}
        {todos.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[13px] font-normal tracking-[0.06em] text-muted-foreground pt-5 pb-1.5">今日待办</h2>
            <div className="bg-secondary/60 rounded-[18px] overflow-hidden">
              {todos.slice(0, 3).map((todo, i, arr) => (
                <div
                  key={todo.id}
                  onClick={() => router.push("/todo")}
                  className={`min-h-11 px-4 flex items-center justify-between gap-3 cursor-pointer active:bg-muted/50 transition-colors ${
                    i < arr.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`size-[9px] rounded-full shrink-0 ${statusDotColor[todo.status]}`} />
                    <span className="text-[17px] text-foreground leading-[1.29] truncate">{todo.title}</span>
                  </div>
                  <Badge variant={statusBadgeVariant[todo.status]}>{statusLabel[todo.status]}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 最近闪念 */}
        {latestFlash && (
          <section className="mb-5">
            <h2 className="text-[13px] font-normal tracking-[0.06em] text-muted-foreground pt-5 pb-1.5">最近闪念</h2>
            <Card
              className="cursor-pointer active:bg-secondary/30 transition-colors"
              onClick={() => router.push("/flash-thought")}
            >
              <CardContent>
                <p className="text-[17px] font-semibold leading-[1.29] line-clamp-2">{latestFlash.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">闪念</Badge>
                  <span className="text-[13px] text-muted-foreground">{formatRelativeTime(latestFlash.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 生产进度 */}
        {activeProductions.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[13px] font-normal tracking-[0.06em] text-muted-foreground pt-5 pb-1.5">生产进度</h2>
            <Card
              className="cursor-pointer active:bg-secondary/30 transition-colors"
              onClick={() => router.push("/produce-flow")}
            >
              <CardContent>
                {activeProductions.slice(0, 1).map(prod => {
                  const stageIdx = stageOrder.indexOf(prod.currentStage)
                  const progress = Math.round(((stageIdx + 1) / stageOrder.length) * 100)
                  return (
                    <div key={prod.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="size-[9px] rounded-full shrink-0 bg-[#FF9500]" />
                        <span className="text-[17px] font-semibold leading-[1.29] flex-1 truncate">{prod.title}</span>
                      </div>
                      <div className="h-1 bg-border/60 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-foreground rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[13px] text-muted-foreground">
                        {stageLabels[prod.currentStage]} · {progress}%
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
        )}

        {/* 数据概览 */}
        {kpi.videoCount > 0 && (
          <section className="mb-5">
            <h2 className="text-[13px] font-normal tracking-[0.06em] text-muted-foreground pt-5 pb-1.5">数据概览</h2>
            <Card
              className="cursor-pointer active:bg-secondary/30 transition-colors"
              onClick={() => router.push("/dashboard")}
            >
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[17px] font-semibold leading-[1.29] mb-1">本周数据</div>
                    <div className="text-[13px] text-muted-foreground">
                      {kpi.videoCount} 个视频 · 总播放
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[34px] font-bold tabular-nums leading-[1.21]">
                      {kpi.totalViews.toLocaleString()}
                    </div>
                    <div className="text-[13px] text-muted-foreground">总播放</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 空状态 */}
        {!hasContent && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="size-16 rounded-full bg-secondary/60 flex items-center justify-center mb-4">
              <Sparkles className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1">开始你的创作</h3>
            <p className="text-[15px] text-muted-foreground">点击右上角按钮记录第一条闪念</p>
          </div>
        )}
      </div>
    </div>
  )
}
