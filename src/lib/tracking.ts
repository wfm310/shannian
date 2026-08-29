// ========== 数据追踪 API ==========
// 提供追踪记录的 CRUD 操作、节点配置、参与度计算等功能

import { db, type TrackingRecord, type TrackingNode, type TrackingStatus, type PublishRecord } from "./db"
import { sendNotification } from "./notification"
import { toast } from "sonner"

// 当前登录用户（系统自动识别）
const CURRENT_USER = "峰岚"

// ========== 节点配置 ==========

// 每个节点的标签和偏移量（毫秒）
// custom 节点偏移量为 0，因为时间由用户自定义
export const trackingNodeConfig: Record<TrackingNode, {
  label: string
  shortLabel: string
  offset: number
}> = {
  "2h": { label: "发布后2小时", shortLabel: "2小时", offset: 2 * 60 * 60 * 1000 },
  "24h": { label: "发布后24小时", shortLabel: "24小时", offset: 24 * 60 * 60 * 1000 },
  "3d": { label: "发布后3天", shortLabel: "3天", offset: 3 * 24 * 60 * 60 * 1000 },
  "7d": { label: "发布后7天", shortLabel: "7天", offset: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "发布后30天", shortLabel: "30天", offset: 30 * 24 * 60 * 60 * 1000 },
  custom: { label: "长尾追踪", shortLabel: "长尾", offset: 0 },
}

// 固定节点顺序（custom 不在其中，单独添加）
// 注意：2h 节点保留在类型中以兼容历史数据，但不在默认创建列表里
export const fixedNodeOrder: TrackingNode[] = ["24h", "3d", "7d", "30d"]

// 展示用节点顺序（含长尾节点排最后）
export const displayNodeOrder: TrackingNode[] = ["24h", "3d", "7d", "30d", "custom"]

// ========== 状态标签 ==========

export const statusLabels: Record<TrackingStatus, string> = {
  pending: "待录入",
  recorded: "已录入",
}


// ========== 1. 从发布记录创建追踪（创建 5 个固定节点） ==========

export async function createTrackingFromPublish(
  publishRecordId: number
): Promise<number[]> {
  // 检查发布记录是否存在且已发布
  const pub = await db.publishRecords.get(publishRecordId)
  if (!pub) {
    toast.error("发布记录不存在")
    throw new Error("发布记录不存在")
  }
  if (pub.status !== "published") {
    toast.error("只能从已发布的记录创建追踪")
    throw new Error("发布记录未发布")
  }

  // 检查是否已存在追踪记录
  const existing = await db.trackingRecords
    .where("publishRecordId")
    .equals(publishRecordId)
    .first()
  if (existing) {
    toast.error("该记录已有追踪数据")
    throw new Error("追踪记录已存在")
  }

  // 发布时间作为基准
  const publishTime = pub.publishTime || Date.now()
  const now = Date.now()

  // 一次性创建 5 个固定节点
  const ids = await Promise.all(
    fixedNodeOrder.map(node => {
      const config = trackingNodeConfig[node]
      return db.trackingRecords.add({
        publishRecordId,
        node,
        customLabel: "",
        views: null,
        likes: null,
        comments: null,
        shares: null,
        favorites: null,
        followers: null,
        avgPlayDuration: null,
        completionRate: null,
        bounceRate2s: null,
        retention5s: null,
        searchKeywordsIn: [],
        searchKeywordsOut: [],
        status: "pending",
        scheduledTime: publishTime + config.offset,
        recordedAt: null,
        assignee: CURRENT_USER,
        createdAt: now,
        updatedAt: now,
      })
    })
  )

  // 发送通知
  await sendNotification({
    type: "module",
    title: "新建数据追踪",
    content: `${pub.title} → 5 个追踪节点已创建`,
    relatedModule: "publish",
    relatedId: publishRecordId,
    receiver: CURRENT_USER,
  })

  toast.success("追踪记录已创建")
  return ids as number[]
}


// ========== 2. 获取追踪记录列表 ==========

export async function getTrackingRecords(
  filter?: { status?: TrackingStatus | "all" }
): Promise<TrackingRecord[]> {
  let list = await db.trackingRecords.toArray()

  // 按 scheduledTime 升序排序（内存排序，不需要建索引）
  list.sort((a, b) => a.scheduledTime - b.scheduledTime)

  if (filter?.status && filter.status !== "all") {
    list = list.filter(r => r.status === filter.status)
  }

  return list
}


// ========== 3. 获取单条追踪记录 ==========

export async function getTrackingRecord(id: number): Promise<TrackingRecord | undefined> {
  return db.trackingRecords.get(id)
}


// ========== 4. 更新追踪记录（录入数据） ==========

export async function updateTrackingRecord(
  id: number,
  updates: Partial<TrackingRecord>
): Promise<void> {
  const record = await db.trackingRecords.get(id)
  if (!record) return

  const now = Date.now()
  const wasPending = record.status === "pending"

  // 如果有数据填入且状态为 pending，自动改为 recorded
  const hasData = updates.views !== undefined ||
    updates.likes !== undefined ||
    updates.comments !== undefined

  const newStatus: TrackingStatus = wasPending && hasData ? "recorded" : record.status

  await db.trackingRecords.update(id, {
    ...updates,
    status: newStatus,
    recordedAt: wasPending && hasData ? now : record.recordedAt,
    updatedAt: now,
  })
}


// ========== 5. 添加长尾追踪节点 ==========

// 注意：本项目全局无删除功能
// 数据都是灵感来源与思考过程，后续接入 AI 模块可直接调用
// 录入错误的数据不做删除，保留沉淀

export async function addCustomTracking(
  publishRecordId: number,
  label: string
): Promise<number> {
  const trimmed = label.trim()
  if (!trimmed) {
    toast.error("请输入节点标签")
    throw new Error("标签不能为空")
  }

  const now = Date.now()
  const id = await db.trackingRecords.add({
    publishRecordId,
    node: "custom",
    customLabel: trimmed,
    views: null,
    likes: null,
    comments: null,
    shares: null,
    favorites: null,
    followers: null,
    avgPlayDuration: null,
    completionRate: null,
    bounceRate2s: null,
    retention5s: null,
    searchKeywordsIn: [],
    searchKeywordsOut: [],
    status: "pending",
    scheduledTime: now,
    recordedAt: null,
    assignee: CURRENT_USER,
    createdAt: now,
    updatedAt: now,
  })

  toast.success("长尾追踪节点已添加")
  return id as number
}


// ========== 7. 获取待追踪的发布记录 ==========

// 返回已发布但还没有追踪记录的发布记录
export async function getPendingPublishRecords(): Promise<PublishRecord[]> {
  const published = await db.publishRecords
    .filter(r => r.status === "published")
    .reverse()
    .sortBy("createdAt")

  // 获取所有已有追踪记录的 publishRecordId
  const allTracking = await db.trackingRecords.toArray()
  const trackedIds = new Set(allTracking.map(t => t.publishRecordId))

  // 过滤掉已有追踪记录的
  return published.filter(r => !trackedIds.has(r.id!))
}


// ========== 8. 获取同一发布记录的所有追踪记录 ==========

export async function getTrackingByPublish(
  publishRecordId: number
): Promise<TrackingRecord[]> {
  return db.trackingRecords
    .where("publishRecordId")
    .equals(publishRecordId)
    .sortBy("scheduledTime")
}


// ========== 9. 参与度计算 ==========

// 根据流量数据自动计算点赞率、评论率、分享率、收藏率
// views 为 0 或 null 时返回 "—"
export function calculateRates(record: TrackingRecord): {
  likeRate: string
  commentRate: string
  shareRate: string
  favoriteRate: string
} {
  const views = record.views || 0

  if (views === 0) {
    return {
      likeRate: "—",
      commentRate: "—",
      shareRate: "—",
      favoriteRate: "—",
    }
  }

  const calc = (num: number | null) => {
    if (num === null) return "—"
    return ((num / views) * 100).toFixed(1) + "%"
  }

  return {
    likeRate: calc(record.likes),
    commentRate: calc(record.comments),
    shareRate: calc(record.shares),
    favoriteRate: calc(record.favorites),
  }
}


// ========== 10. 按视频分组追踪记录 ==========

// 将追踪记录按发布记录ID分组，返回每条视频的所有节点数据
export function groupByVideo(records: TrackingRecord[]): Map<number, TrackingRecord[]> {
  const map = new Map<number, TrackingRecord[]>()
  for (const r of records) {
    const list = map.get(r.publishRecordId) || []
    list.push(r)
    map.set(r.publishRecordId, list)
  }
  // 每组内按 scheduledTime 排序
  for (const [, list] of map) {
    list.sort((a, b) => a.scheduledTime - b.scheduledTime)
  }
  return map
}


// ========== 11. 计算全局 KPI 汇总 ==========

// 取每个视频最新已录入节点的数据进行汇总
export function calculateKPI(records: TrackingRecord[]): {
  totalViews: number
  totalFavorites: number
  totalFollowers: number
  avgPlayDuration: number  // 加权平均（秒）
  videoCount: number
} {
  const grouped = groupByVideo(records)
  let totalViews = 0
  let totalFavorites = 0
  let totalFollowers = 0
  let totalDurationWeighted = 0  // 播放时长 * 播放量 的加权和
  let totalViewsForDuration = 0 // 用于加权平均的播放量总和
  let videoCount = 0

  for (const [, videoRecords] of grouped) {
    // 取最新已录入的节点
    const recorded = videoRecords.filter(r => r.status === "recorded" && r.views !== null)
    if (recorded.length === 0) continue

    const latest = recorded[recorded.length - 1]
    const views = latest.views || 0
    totalViews += views
    totalFavorites += latest.favorites || 0
    totalFollowers += latest.followers || 0

    if (latest.avgPlayDuration !== null && views > 0) {
      totalDurationWeighted += latest.avgPlayDuration * views
      totalViewsForDuration += views
    }

    videoCount++
  }

  const avgPlayDuration = totalViewsForDuration > 0
    ? totalDurationWeighted / totalViewsForDuration
    : 0

  return { totalViews, totalFavorites, totalFollowers, avgPlayDuration, videoCount }
}


// ========== 12. 获取视频概览列表（表格用） ==========

export interface VideoOverview {
  publishRecordId: number
  title: string
  publishTime: number
  nodes: TrackingRecord[]
  latestRecorded: TrackingRecord | null
  views24h: number | null
  views3d: number | null
  views7d: number | null
  totalViews: number | null   // 最新节点的播放量
  totalFavorites: number | null
  totalFollowers: number | null
  completionRate: number | null
  hasLongTail: boolean
  status: "rising" | "falling" | "flat" | "longtail" | "pending"
}

export async function getVideoOverviews(): Promise<VideoOverview[]> {
  const allRecords = await db.trackingRecords.toArray()
  const grouped = groupByVideo(allRecords)
  const pubIds = [...grouped.keys()]
  const pubs = await Promise.all(pubIds.map(id => db.publishRecords.get(id)))
  const pubMap = new Map<number, { title: string; publishTime: number }>()
  pubs.forEach(p => {
    if (p?.id) pubMap.set(p.id, { title: p.title, publishTime: p.publishTime || p.createdAt })
  })

  const result: VideoOverview[] = []

  for (const [pubId, records] of grouped) {
    const pub = pubMap.get(pubId)
    if (!pub) continue

    const recorded = records.filter(r => r.status === "recorded")
    const latestRecorded = recorded.length > 0 ? recorded[recorded.length - 1] : null

    // 找各节点数据
    const node24h = records.find(r => r.node === "24h")
    const node3d = records.find(r => r.node === "3d")
    const node7d = records.find(r => r.node === "7d")
    const hasLongTail = records.some(r => r.node === "custom")

    // 判断状态
    let status: VideoOverview["status"] = "pending"
    if (recorded.length >= 2) {
      const prev = recorded[recorded.length - 2].views || 0
      const curr = recorded[recorded.length - 1].views || 0
      const change = prev > 0 ? (curr - prev) / prev : 0
      if (hasLongTail) {
        status = "longtail"
      } else if (change > 0.1) {
        status = "rising"
      } else if (change < -0.1) {
        status = "falling"
      } else {
        status = "flat"
      }
    } else if (recorded.length === 1) {
      status = "flat"
    }

    result.push({
      publishRecordId: pubId,
      title: pub.title,
      publishTime: pub.publishTime,
      nodes: records,
      latestRecorded,
      views24h: node24h?.views ?? null,
      views3d: node3d?.views ?? null,
      views7d: node7d?.views ?? null,
      totalViews: latestRecorded?.views ?? null,
      totalFavorites: latestRecorded?.favorites ?? null,
      totalFollowers: latestRecorded?.followers ?? null,
      completionRate: latestRecorded?.completionRate ?? null,
      hasLongTail,
      status,
    })
  }

  // 按发布时间倒序
  result.sort((a, b) => b.publishTime - a.publishTime)
  return result
}


// ========== 13. 生成单视频趋势数据（图表用） ==========

export function buildTrendData(records: TrackingRecord[]): Array<{
  node: string
  nodeLabel: string
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  favorites: number | null
  followers: number | null
  completionRate: number | null
  avgPlayDuration: number | null
}> {
  return records
    .filter(r => r.status === "recorded")
    .map(r => ({
      node: r.node,
      nodeLabel: r.node === "custom" ? (r.customLabel || "长尾") : trackingNodeConfig[r.node].shortLabel,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      favorites: r.favorites,
      followers: r.followers,
      completionRate: r.completionRate,
      avgPlayDuration: r.avgPlayDuration,
    }))
}


// ========== 14. 生成全局趋势数据（按天聚合） ==========

export function buildGlobalTrendData(records: TrackingRecord[], days: number = 30): Array<{
  date: string
  views: number
  favorites: number
  followers: number
}> {
  // 用最新节点的录入时间作为数据点日期
  const grouped = groupByVideo(records)
  const dailyData = new Map<string, { views: number; favorites: number; followers: number }>()

  // 初始化日期范围
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    dailyData.set(key, { views: 0, favorites: 0, followers: 0 })
  }

  // 每个视频取最新已录入节点，按录入时间归入对应日期
  for (const [, videoRecords] of grouped) {
    const recorded = videoRecords.filter(r => r.status === "recorded" && r.recordedAt)
    if (recorded.length === 0) continue
    const latest = recorded[recorded.length - 1]
    if (!latest.recordedAt) continue

    const d = new Date(latest.recordedAt)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    if (dailyData.has(key)) {
      const entry = dailyData.get(key)!
      entry.views += latest.views || 0
      entry.favorites += latest.favorites || 0
      entry.followers += latest.followers || 0
    }
  }

  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    ...data,
  }))
}


// ========== 15. 计算环比变化 ==========

export function calculatePeriodChange(
  records: TrackingRecord[],
  periodDays: number = 30
): {
  viewsChange: number
  favoritesChange: number
  followersChange: number
} {
  const trend = buildGlobalTrendData(records, periodDays * 2)
  const mid = Math.floor(trend.length / 2)
  const firstHalf = trend.slice(0, mid)
  const secondHalf = trend.slice(mid)

  const sum = (arr: typeof trend, key: "views" | "favorites" | "followers") =>
    arr.reduce((s, d) => s + d[key], 0)

  const firstViews = sum(firstHalf, "views")
  const secondViews = sum(secondHalf, "views")
  const firstFavs = sum(firstHalf, "favorites")
  const secondFavs = sum(secondHalf, "favorites")
  const firstFlw = sum(firstHalf, "followers")
  const secondFlw = sum(secondHalf, "followers")

  const calcChange = (curr: number, prev: number) =>
    prev === 0 ? 0 : ((curr - prev) / prev) * 100

  return {
    viewsChange: calcChange(secondViews, firstViews),
    favoritesChange: calcChange(secondFavs, firstFavs),
    followersChange: calcChange(secondFlw, firstFlw),
  }
}