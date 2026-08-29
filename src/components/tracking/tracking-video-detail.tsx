"use client"

// ========== 导入区域 ==========
import { useMemo, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts"
import {
  trackingNodeConfig, displayNodeOrder, calculateRates, buildTrendData,
} from "@/lib/tracking"
import type { TrackingRecord, TrackingNode } from "@/lib/db"
import type { VideoOverview } from "@/lib/tracking"
import {
  ArrowLeft, Pencil, Plus, Eye, Bookmark, Users, Clock,
  TrendingUp, TrendingDown, Minus, Search,
} from "lucide-react"


// ========== 类型定义 ==========
interface TrackingVideoDetailProps {
  overview: VideoOverview
  onBack: () => void
  onEditNode: (recordId: number) => void
  onAddLongTail: () => void
}


// ========== 辅助函数 ==========
function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—"
  if (seconds <= 0) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, "0")}`
  return `${secs}秒`
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return `${n.toFixed(1)}%`
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getNodeLabel(record: TrackingRecord): string {
  if (record.node === "custom") return record.customLabel || "长尾"
  return trackingNodeConfig[record.node].shortLabel
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rising: { label: "上升", variant: "default" },
  falling: { label: "下滑", variant: "destructive" },
  flat: { label: "平稳", variant: "secondary" },
  longtail: { label: "长尾爆发", variant: "default" },
  pending: { label: "待录入", variant: "outline" },
}


// ========== 组件定义 ==========
export function TrackingVideoDetail({
  overview, onBack, onEditNode, onAddLongTail,
}: TrackingVideoDetailProps) {

  const records = overview.nodes

  // ---------- 节点列表（按展示顺序） ----------
  const nodeList = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.scheduledTime - b.scheduledTime)
    // 按节点类型排序：固定节点在前，custom 在后
    const fixedNodes = displayNodeOrder
      .filter(n => n !== "custom")
      .map(n => sorted.find(r => r.node === n))
      .filter((r): r is TrackingRecord => r !== undefined)
    const customNodes = sorted.filter(r => r.node === "custom")
    return [...fixedNodes, ...customNodes]
  }, [records])

  // ---------- 已录入节点 ----------
  const recordedNodes = useMemo(() =>
    records.filter(r => r.status === "recorded")
  , [records])

  // ---------- 最新 & 上一节点（KPI 用） ----------
  const latestRecorded = overview.latestRecorded
  const prevRecorded = useMemo(() => {
    if (recordedNodes.length < 2) return null
    return recordedNodes[recordedNodes.length - 2]
  }, [recordedNodes])

  // ---------- KPI 趋势计算 ----------
  const calcChange = (latest: number | null, prev: number | null): number => {
    if (latest === null || prev === null || prev === 0) return 0
    return ((latest - prev) / prev) * 100
  }

  const kpiData = useMemo(() => {
    if (!latestRecorded) {
      return [
        { label: "播放量", value: "—", change: 0, icon: <Eye className="size-4" /> },
        { label: "收藏量", value: "—", change: 0, icon: <Bookmark className="size-4" /> },
        { label: "涨粉量", value: "—", change: 0, icon: <Users className="size-4" /> },
        { label: "完播率", value: "—", change: 0, icon: <Clock className="size-4" /> },
      ]
    }
    return [
      {
        label: "播放量",
        value: formatNumber(latestRecorded.views),
        change: calcChange(latestRecorded.views, prevRecorded?.views ?? null),
        icon: <Eye className="size-4" />,
      },
      {
        label: "收藏量",
        value: formatNumber(latestRecorded.favorites),
        change: calcChange(latestRecorded.favorites, prevRecorded?.favorites ?? null),
        icon: <Bookmark className="size-4" />,
      },
      {
        label: "涨粉量",
        value: latestRecorded.followers ? `+${formatNumber(latestRecorded.followers)}` : "—",
        change: calcChange(latestRecorded.followers, prevRecorded?.followers ?? null),
        icon: <Users className="size-4" />,
      },
      {
        label: "完播率",
        value: formatPercent(latestRecorded.completionRate),
        change: calcChange(latestRecorded.completionRate, prevRecorded?.completionRate ?? null),
        icon: <Clock className="size-4" />,
      },
    ]
  }, [latestRecorded, prevRecorded])

  // ---------- 趋势图数据 ----------
  const trendData = useMemo(() => buildTrendData(records), [records])

  const chartColors = {
    views: "hsl(var(--chart-1))",
    likes: "hsl(var(--chart-2))",
    comments: "hsl(var(--chart-3))",
    favorites: "hsl(var(--chart-4))",
  }

  const chartConfig = {
    views: { label: "播放量", color: chartColors.views },
    likes: { label: "点赞量", color: chartColors.likes },
    comments: { label: "评论量", color: chartColors.comments },
    favorites: { label: "收藏量", color: chartColors.favorites },
  } satisfies ChartConfig

  // ---------- 对比表行定义 ----------
  type MetricRow = {
    section: string
    label: string
    key: keyof TrackingRecord | "likeRate" | "commentRate" | "shareRate" | "favoriteRate"
    format: (v: number | null | undefined) => string
  }

  const metricRows: MetricRow[] = [
    // 流量数据
    { section: "流量数据", label: "播放量", key: "views", format: formatNumber },
    { section: "流量数据", label: "点赞量", key: "likes", format: formatNumber },
    { section: "流量数据", label: "评论量", key: "comments", format: formatNumber },
    { section: "流量数据", label: "分享量", key: "shares", format: formatNumber },
    { section: "流量数据", label: "收藏量", key: "favorites", format: formatNumber },
    { section: "流量数据", label: "涨粉量", key: "followers", format: (v) => v ? `+${formatNumber(v)}` : "—" },
    // 互动率（自动计算）
    { section: "互动率", label: "点赞率", key: "likeRate", format: (v) => typeof v === "string" ? v : "—" },
    { section: "互动率", label: "评论率", key: "commentRate", format: (v) => typeof v === "string" ? v : "—" },
    { section: "互动率", label: "分享率", key: "shareRate", format: (v) => typeof v === "string" ? v : "—" },
    { section: "互动率", label: "收藏率", key: "favoriteRate", format: (v) => typeof v === "string" ? v : "—" },
    // 内容吸引力
    { section: "内容吸引力", label: "平均播放时长", key: "avgPlayDuration", format: formatDuration },
    { section: "内容吸引力", label: "完播率", key: "completionRate", format: formatPercent },
    { section: "内容吸引力", label: "2s跳出率", key: "bounceRate2s", format: formatPercent },
    { section: "内容吸引力", label: "5s完播率", key: "retention5s", format: formatPercent },
  ]

  // ---------- 获取单元格值 ----------
  function getCellValue(record: TrackingRecord, row: MetricRow): string {
    if (record.status === "pending") return "待录入"
    if (row.key === "likeRate" || row.key === "commentRate" || row.key === "shareRate" || row.key === "favoriteRate") {
      const rates = calculateRates(record)
      return rates[row.key as "likeRate" | "commentRate" | "shareRate" | "favoriteRate"]
    }
    const val = record[row.key as keyof TrackingRecord] as number | null
    return row.format(val)
  }

  // ---------- 搜索关键词（取最新已录入节点） ----------
  const keywordsIn = latestRecorded?.searchKeywordsIn ?? []
  const keywordsOut = latestRecorded?.searchKeywordsOut ?? []

  // ---------- 渲染 ----------
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ===== 头部 ===== */}
      <div className="flex-shrink-0 border-b bg-background px-4 md:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{overview.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatDate(overview.publishTime)}</span>
                <Badge
                  variant={statusConfig[overview.status]?.variant || "outline"}
                  className="text-xs"
                >
                  {statusConfig[overview.status]?.label || overview.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  已录入 {recordedNodes.length}/{records.length} 节点
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onAddLongTail}>
              <Plus className="size-4" />
              添加长尾
            </Button>
            <Button size="sm" onClick={() => {
              const firstPending = records.find(r => r.status === "pending")
              if (firstPending?.id) onEditNode(firstPending.id)
              else if (latestRecorded?.id) onEditNode(latestRecorded.id)
            }}>
              <Pencil className="size-4" />
              编辑数据
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 内容区 ===== */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 space-y-4">

        {/* --- KPI 卡片 --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiData.map((kpi, i) => {
            const isUp = kpi.change > 0
            const isDown = kpi.change < 0
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-muted-foreground">{kpi.icon}</span>
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {kpi.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {isUp ? (
                          <TrendingUp className="size-3 text-emerald-500 shrink-0" />
                        ) : isDown ? (
                          <TrendingDown className="size-3 text-red-500 shrink-0" />
                        ) : (
                          <Minus className="size-3 text-muted-foreground shrink-0" />
                        )}
                        <span className={
                          isUp ? "text-emerald-600 dark:text-emerald-400"
                          : isDown ? "text-red-500"
                          : "text-muted-foreground"
                        }>
                          {isUp ? "+" : ""}{kpi.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold tracking-tight font-mono tabular-nums">
                        {kpi.value}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* --- 趋势图 --- */}
        {trendData.length >= 1 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">增长趋势</h3>
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="nodeLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={40}
                    tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Line type="monotone" dataKey="views" stroke={chartColors.views} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: chartColors.views, stroke: chartColors.views }} />
                  <Line type="monotone" dataKey="likes" stroke={chartColors.likes} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: chartColors.likes, stroke: chartColors.likes }} />
                  <Line type="monotone" dataKey="comments" stroke={chartColors.comments} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: chartColors.comments, stroke: chartColors.comments }} />
                  <Line type="monotone" dataKey="favorites" stroke={chartColors.favorites} strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: chartColors.favorites, stroke: chartColors.favorites }} />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* --- 数据对比表 --- */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">数据对比</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">指标</TableHead>
                    {nodeList.map(record => (
                      <TableHead key={record.id} className="whitespace-nowrap text-right min-w-[80px]">
                        {getNodeLabel(record)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricRows.map((row, idx) => {
                    const showSection = idx === 0 || metricRows[idx - 1].section !== row.section
                    return (
                      <Fragment key={row.label}>
                        {showSection && (
                          <TableRow key={`section-${row.section}`} className="bg-muted/30">
                            <TableCell colSpan={nodeList.length + 1} className="text-xs font-medium text-muted-foreground py-1.5">
                              {row.section}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow key={row.label}>
                          <TableCell className="text-sm font-medium">{row.label}</TableCell>
                          {nodeList.map(record => (
                            <TableCell key={record.id} className="text-right font-mono text-sm tabular-nums whitespace-nowrap">
                              {getCellValue(record, row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* --- 搜索关键词 --- */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">搜索关键词</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">搜索进入词</div>
                <div className="flex flex-wrap gap-1.5">
                  {keywordsIn.length > 0 ? keywordsIn.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  )) : <span className="text-sm text-muted-foreground">暂无</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">搜索离开词</div>
                <div className="flex flex-wrap gap-1.5">
                  {keywordsOut.length > 0 ? keywordsOut.map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                  )) : <span className="text-sm text-muted-foreground">暂无</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
