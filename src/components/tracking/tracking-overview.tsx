"use client"

// ========== 导入区域 ==========
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { VideoOverview } from "@/lib/tracking"
import {
  Eye, Bookmark, Users, Clock,
  TrendingUp, TrendingDown, Minus, Flame,
  Search, Download, ChevronUp, ChevronDown,
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts"


// ========== 类型定义 ==========
interface TrackingOverviewProps {
  videoOverviews: VideoOverview[]
  allRecords: any[]
  searchQuery: string
  onSearchChange: (v: string) => void
  activeFilter: string
  onFilterChange: (v: string) => void
  onVideoClick: (publishRecordId: string) => void
}


// ========== 辅助函数 ==========
function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, "0")}`
  return `${secs}秒`
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rising: { label: "上升", variant: "default" },
  falling: { label: "下滑", variant: "destructive" },
  flat: { label: "平稳", variant: "secondary" },
  longtail: { label: "长尾爆发", variant: "default" },
  pending: { label: "待录入", variant: "outline" },
}


// ========== 组件定义 ==========
export function TrackingOverview({
  videoOverviews, allRecords, searchQuery, onSearchChange,
  activeFilter, onFilterChange, onVideoClick,
}: TrackingOverviewProps) {

  // ---------- 日/周/月切换 ----------
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day")

  // ---------- 筛选 & 搜索 ----------
  const filteredList = useMemo(() => {
    let list = videoOverviews
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(v => v.title.toLowerCase().includes(q))
    }
    if (activeFilter !== "all") {
      list = list.filter(v => v.status === activeFilter)
    }
    return list
  }, [videoOverviews, searchQuery, activeFilter])

  // ---------- KPI 计算 ----------
  const kpi = useMemo(() => {
    let totalViews = 0
    let totalFavorites = 0
    let totalFollowers = 0
    let totalDurationWeighted = 0
    let totalViewsForDuration = 0

    for (const v of videoOverviews) {
      if (v.totalViews === null) continue
      totalViews += v.totalViews
      totalFavorites += v.totalFavorites || 0
      totalFollowers += v.totalFollowers || 0

      const latest = v.latestRecorded
      if (latest?.avgPlayDuration !== null && latest?.avgPlayDuration !== undefined && v.totalViews > 0) {
        totalDurationWeighted += (latest.avgPlayDuration || 0) * v.totalViews
        totalViewsForDuration += v.totalViews
      }
    }

    const avgPlayDuration = totalViewsForDuration > 0
      ? totalDurationWeighted / totalViewsForDuration
      : 0

    return { totalViews, totalFavorites, totalFollowers, avgPlayDuration }
  }, [videoOverviews])

  // ---------- 环比变化（模拟数据） ----------
  const changes = useMemo(() => ({
    views: 18.5,
    favorites: 23.1,
    followers: -5.2,
    avgDuration: 8.7,
  }), [])

  // ---------- 趋势图数据（模拟，按时间范围变化） ----------
  const trendData = useMemo(() => {
    const pointCount = timeRange === "day" ? 30 : timeRange === "week" ? 12 : 6
    const data = []
    const today = new Date()
    for (let i = pointCount - 1; i >= 0; i--) {
      const d = new Date(today)
      let label = ""
      if (timeRange === "day") {
        d.setDate(d.getDate() - i)
        label = `${d.getMonth() + 1}/${d.getDate()}`
      } else if (timeRange === "week") {
        d.setDate(d.getDate() - i * 7)
        label = `第${12 - i}周`
      } else {
        d.setMonth(d.getMonth() - i)
        label = `${d.getMonth() + 1}月`
      }
      const base = 8000 + Math.sin(i / 4) * 2000 + i * 150
      const favBase = 400 + Math.sin(i / 3) * 100 + i * 8
      const flwBase = 100 + Math.cos(i / 5) * 30 + i * 3
      const durBase = 60 + Math.sin(i / 3) * 15 + i * 1.5
      data.push({
        date: label,
        views: Math.round(base),
        favorites: Math.round(favBase),
        followers: Math.round(flwBase),
        avgDuration: Math.round(durBase),
      })
    }
    return data
  }, [timeRange])

  const chartConfig = {
    views: {
      label: "播放量",
      color: "hsl(var(--chart-1))",
    },
    favorites: {
      label: "收藏量",
      color: "hsl(var(--chart-2))",
    },
    followers: {
      label: "涨粉量",
      color: "hsl(var(--chart-3))",
    },
    avgDuration: {
      label: "平均播放时长(秒)",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig

  // ---------- 分页 ----------
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const currentPage = 1
  const pagedList = filteredList.slice(0, pageSize)

  return (
    <div className="space-y-6">

      {/* ===== KPI 卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="总播放量"
          value={formatNumber(kpi.totalViews)}
          icon={<Eye className="size-4" />}
          iconColor="text-chart-1"
          change={changes.views}
        />
        <KpiCard
          label="总收藏量"
          value={formatNumber(kpi.totalFavorites)}
          icon={<Bookmark className="size-4" />}
          iconColor="text-chart-2"
          change={changes.favorites}
        />
        <KpiCard
          label="总涨粉量"
          value={formatNumber(kpi.totalFollowers)}
          icon={<Users className="size-4" />}
          iconColor="text-chart-3"
          change={changes.followers}
        />
        <KpiCard
          label="平均播放时长"
          value={formatDuration(kpi.avgPlayDuration)}
          icon={<Clock className="size-4" />}
          iconColor="text-chart-4"
          change={changes.avgDuration}
        />
      </div>

      {/* ===== 全局趋势图 ===== */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold">全局流量趋势</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {timeRange === "day" ? "近30天数据表现" : timeRange === "week" ? "近12周数据表现" : "近6个月数据表现"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "day" | "week" | "month")} className="w-auto">
                <TabsList>
                  <TabsTrigger value="day" className="text-xs">日</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">周</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">月</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={40}
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={40}
                tickFormatter={(v) => `${v}秒`}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <defs>
                <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillFavorites" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-favorites)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-favorites)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--color-views)"
                strokeWidth={2}
                fill="url(#fillViews)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--background))", strokeWidth: 2 }}
                yAxisId="left"
              />
              <Area
                type="monotone"
                dataKey="favorites"
                stroke="var(--color-favorites)"
                strokeWidth={1.5}
                fill="url(#fillFavorites)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="avgDuration"
                stroke="var(--color-avgDuration)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--background))", strokeWidth: 2 }}
                yAxisId="right"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ===== 视频数据表格 ===== */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">视频数据列表</h3>
              <Badge variant="outline" className="text-xs">
                共 {filteredList.length} 条
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索视频标题..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="size-3.5" />
                导出
              </Button>
            </div>
          </div>

          {/* 筛选栏 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto">
            {[
              { value: "all", label: "全部" },
              { value: "rising", label: "上升" },
              { value: "falling", label: "下滑" },
              { value: "flat", label: "平稳" },
              { value: "longtail", label: "长尾爆发" },
              { value: "pending", label: "待录入" },
            ].map(tab => (
              <Button
                key={tab.value}
                variant={activeFilter === tab.value ? "default" : "ghost"}
                size="xs"
                onClick={() => onFilterChange(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[260px]">视频标题</TableHead>
                  <TableHead className="whitespace-nowrap">发布时间</TableHead>
                  <TableHead className="whitespace-nowrap text-right">24h播放</TableHead>
                  <TableHead className="whitespace-nowrap text-right">3天播放</TableHead>
                  <TableHead className="whitespace-nowrap text-right">7天播放</TableHead>
                  <TableHead className="whitespace-nowrap text-right">收藏量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">涨粉量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">完播率</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-sm">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedList.map(video => (
                    <TableRow
                      key={video.publishRecordId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onVideoClick(video.publishRecordId)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-md bg-muted flex items-center justify-center text-base flex-shrink-0">
                            🎬
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate max-w-[280px]">
                              {video.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              已录入 {video.nodes.filter(n => n.status === "recorded").length} / {video.nodes.length} 节点
                              {video.hasLongTail && " · 含长尾"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(video.publishTime)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {formatNumber(video.views24h)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {formatNumber(video.views3d)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {formatNumber(video.views7d)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {formatNumber(video.totalFavorites)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {video.totalFollowers !== null && video.totalFollowers > 0
                          ? <span className="text-emerald-600 dark:text-emerald-400">+{formatNumber(video.totalFollowers)}</span>
                          : formatNumber(video.totalFollowers)
                        }
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {video.completionRate !== null ? `${video.completionRate}%` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusConfig[video.status]?.variant || "outline"}
                          className="text-xs"
                        >
                          {video.status === "longtail" && <Flame className="size-3 mr-1" />}
                          {statusConfig[video.status]?.label || video.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {filteredList.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                显示 <span className="font-medium text-foreground">1-{Math.min(pageSize, filteredList.length)}</span> 条，
                共 <span className="font-medium text-foreground">{filteredList.length}</span> 条
              </p>
              <Pagination className="w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">{totalPages}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


// ========== 子组件：KPI 卡片 ==========
function KpiCard({
  label, value, icon, iconColor, change,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconColor: string
  change: number
}) {
  const isUp = change > 0
  const isDown = change < 0
  const changeStr = `${isUp ? "+" : ""}${change.toFixed(1)}%`

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧：图标 + 标题 + 趋势 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={iconColor}>{icon}</span>
              <span className="text-sm text-muted-foreground font-medium truncate">
                {label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {isUp ? (
                <TrendingUp className="size-3 text-emerald-500 shrink-0" />
              ) : isDown ? (
                <TrendingDown className="size-3 text-red-500 shrink-0" />
              ) : (
                <Minus className="size-3 text-muted-foreground shrink-0" />
              )}
              <span className={isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-red-500" : "text-muted-foreground"}>
                {changeStr}
              </span>
              <span className="text-muted-foreground">较上周期</span>
            </div>
          </div>
          {/* 右侧：大数字，视觉重点 */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold tracking-tight font-mono tabular-nums">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
