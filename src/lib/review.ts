// ========== 复盘记录 API ==========
// 提供复盘记录的 CRUD 操作、状态流转、数据快照拉取、待办生成等功能

import {
  db, type ReviewRecord, type ReviewType, type ReviewPeriod,
  type ReviewTrigger, type ReviewStatus, type ReviewDimension,
  type ExperienceCategory, type ReviewItem, type ReviewExperience,
  type ReviewAction, type Priority, type PublishRecord,
} from "./db"
import { newId, newSyncFields, touchSyncFields } from "./id"
import { sendNotification } from "./notification"
import { getTrackingByPublish, calculateRates, trackingNodeConfig } from "./tracking"
import { toast } from "sonner"

// 当前登录用户
const CURRENT_USER = "峰岚"

// ========== 配置 ==========

export const reviewTypeLabels: Record<ReviewType, string> = {
  single: "单条视频复盘",
  periodic: "周期性复盘",
}

export const reviewPeriodLabels: Record<ReviewPeriod, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
}

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "待复盘",
  in_progress: "复盘中",
  completed: "已完成",
}

export const reviewDimensionConfig: Record<ReviewDimension, { label: string }> = {
  content: { label: "内容表现" },
  process: { label: "创作过程" },
  strategy: { label: "运营策略" },
  workflow: { label: "工作状态" },
  general: { label: "综合" },
}

export const experienceCategoryConfig: Record<ExperienceCategory, { label: string }> = {
  content_creation: { label: "内容创作" },
  operation_strategy: { label: "运营策略" },
  process_efficiency: { label: "流程效率" },
  other: { label: "其他" },
}

export const priorityConfig: Record<Priority, { label: string }> = {
  P0: { label: "P0 紧急" },
  P1: { label: "P1 高" },
  P2: { label: "P2 中" },
  P3: { label: "P3 低" },
}

// 行动可关联的模块
export const actionLinkedModules = [
  { value: "benchmark", label: "对标拆解" },
  { value: "topic", label: "选题库" },
  { value: "production", label: "内容生产流程" },
  { value: "scriptTemplate", label: "脚本框架库" },
] as const


// ========== 1. 创建复盘记录 ==========

export async function createReview(
  type: ReviewType,
  options: {
    publishRecordId?: string
    period?: ReviewPeriod
    periodStart?: number
    periodEnd?: number
  }
): Promise<string> {
  let title = ""

  if (type === "single") {
    if (!options.publishRecordId) {
      toast.error("请选择发布记录")
      throw new Error("发布记录不能为空")
    }
    const pub = await db.publishRecords.get(options.publishRecordId)
    if (!pub) {
      toast.error("发布记录不存在")
      throw new Error("发布记录不存在")
    }
    title = `【单条视频复盘】${pub.title}`
  } else {
    if (!options.period) {
      toast.error("请选择周期类型")
      throw new Error("周期类型不能为空")
    }
    title = generatePeriodTitle(options.period, options.periodStart || Date.now())
  }

  const now = Date.now()
  const id = newId()
  await db.reviewRecords.add({
    id,
    title,
    type,
    period: options.period || null,
    publishRecordId: options.publishRecordId || null,
    periodStart: options.periodStart || null,
    periodEnd: options.periodEnd || null,
    trigger: "manual",
    triggerNode: null,
    assignee: CURRENT_USER,
    status: "pending",
    dataComment: "",
    goodItems: [],
    badItems: [],
    experiences: [],
    actions: [],
    startedAt: null,
    completedAt: null,
    createdAt: now,
    ...newSyncFields(),
    updatedAt: now,
  })

  // 生成 P1 复盘待办
  await db.todos.add({
    title: `复盘：${title}`,
    description: "",
    initialPriority: "P1",
    assignee: CURRENT_USER,
    dueDate: now + 3 * 24 * 60 * 60 * 1000,
    linkedModules: ["review"],
    progressTargets: { review: 1 },
    linkedIds: { review: [id] },
    progressCompleted: { review: 0 },
    progressBaseline: { review: 0 },
    status: "pending",
    source: "review",
    creator: CURRENT_USER,
    createdAt: now,
    completedAt: null,
    archived: false,
    ...newSyncFields(),
  })

  // 发送通知
  await sendNotification({
    type: "module",
    title: "新建复盘记录",
    content: title,
    relatedModule: "review",
    relatedId: id,
    receiver: CURRENT_USER,
  })

  toast.success("复盘记录已创建")
  return id
}


// ========== 2. 获取复盘记录列表 ==========

export async function getReviewRecords(
  filter?: { status?: ReviewStatus | "all"; type?: ReviewType | "all" }
): Promise<ReviewRecord[]> {
  let list = await db.reviewRecords.toArray()

  if (filter?.status && filter.status !== "all") {
    list = list.filter(r => r.status === filter.status)
  }

  if (filter?.type && filter.type !== "all") {
    list = list.filter(r => r.type === filter.type)
  }

  // 按创建时间降序
  list.sort((a, b) => b.createdAt - a.createdAt)

  return list
}


// ========== 3. 获取单条复盘记录 ==========

export async function getReviewRecord(id: string): Promise<ReviewRecord | undefined> {
  return db.reviewRecords.get(id)
}


// ========== 4. 更新复盘记录 ==========

export async function updateReviewRecord(
  id: string,
  updates: Partial<ReviewRecord>
): Promise<void> {
  const record = await db.reviewRecords.get(id)
  if (!record) return

  await db.reviewRecords.update(id, {
    ...updates,
    ...touchSyncFields(record.syncVersion || 0),
  })
}


// ========== 5. 开始复盘（待复盘 → 复盘中） ==========

export async function startReview(id: string): Promise<void> {
  const record = await db.reviewRecords.get(id)
  if (!record) return

  if (record.status !== "pending") return

  await db.reviewRecords.update(id, {
    status: "in_progress",
    startedAt: Date.now(),
    ...touchSyncFields(record.syncVersion || 0),
  })
}


// ========== 6. 完成复盘（复盘中 → 已完成） ==========

export async function completeReview(id: string): Promise<void> {
  const record = await db.reviewRecords.get(id)
  if (!record) {
    toast.error("复盘记录不存在")
    throw new Error("记录不存在")
  }

  if (record.status !== "in_progress") {
    toast.error("只有复盘中的记录才能完成")
    throw new Error("状态不允许")
  }

  // 校验必填模块
  if (record.goodItems.length === 0) {
    toast.error("请至少添加一条「做得好的」")
    throw new Error("做得好的不能为空")
  }
  if (record.badItems.length === 0) {
    toast.error("请至少添加一条「做得不好的」")
    throw new Error("做得不好的不能为空")
  }

  // 周报/月报要求经验和数据简评
  if (record.type === "periodic" && (record.period === "weekly" || record.period === "monthly")) {
    if (!record.dataComment.trim()) {
      toast.error("请填写数据简评")
      throw new Error("数据简评不能为空")
    }
    if (record.experiences.length === 0) {
      toast.error("请至少添加一条「可复用经验」")
      throw new Error("可复用经验不能为空")
    }
  }

  if (record.actions.length === 0) {
    toast.error("请至少添加一条「下一步行动」")
    throw new Error("下一步行动不能为空")
  }

  const now = Date.now()
  await db.reviewRecords.update(id, {
    status: "completed",
    completedAt: now,
    ...touchSyncFields(record.syncVersion || 0),
  })

  // 自动完成复盘待办
  const reviewTodos = await db.todos
    .filter(t => t.source === "review" && t.linkedIds?.review?.includes(id))
    .toArray()
  for (const todo of reviewTodos) {
    if (todo.status !== "done" && todo.id) {
      await db.todos.update(todo.id, {
        status: "done",
        completedAt: now,
        ...touchSyncFields(todo.syncVersion || 0),
      })
    }
  }

  // 为每条行动生成待办
  for (const action of record.actions) {
    await db.todos.add({
      title: action.content,
      description: "",
      initialPriority: action.priority,
      assignee: record.assignee,
      dueDate: action.dueDate || (now + 7 * 24 * 60 * 60 * 1000),
      linkedModules: action.linkedModule ? [action.linkedModule] : [],
      progressTargets: {},
      linkedIds: {},
      progressCompleted: {},
      progressBaseline: {},
      status: "pending",
      source: "review",
      creator: CURRENT_USER,
      createdAt: now,
      completedAt: null,
      archived: false,
      ...newSyncFields(),
    })
  }

  // 发送通知
  await sendNotification({
    type: "module",
    title: "复盘已完成",
    content: `${record.title} → 已完成，${record.actions.length} 条行动待办已生成`,
    relatedModule: "review",
    relatedId: id,
    receiver: CURRENT_USER,
  })

  toast.success("复盘已完成")
}


// ========== 7. 获取数据快照 ==========

// 单条视频：拉取该视频最新追踪数据
// 周期性：拉取周期内所有追踪数据汇总
export async function getDataSnapshot(
  record: ReviewRecord
): Promise<{
  type: "single" | "periodic"
  // 单条视频
  trackingRecords: Array<{
    node: string
    nodeLabel: string
    status: string
    views: number | null
    likes: number | null
    comments: number | null
    shares: number | null
    favorites: number | null
    followers: number | null
    completionRate: number | null
    bounceRate2s: number | null
    retention5s: number | null
    avgPlayDuration: number | null
    rates: { likeRate: string; commentRate: string; shareRate: string; favoriteRate: string }
  }>
  // 周期性汇总
  summary: {
    videoCount: number
    totalViews: number
    avgCompletionRate: number | null
    avgBounceRate: number | null
    avgRetention: number | null
  } | null
  periodStart: number | null
  periodEnd: number | null
}> {
  if (record.type === "single" && record.publishRecordId) {
    const records = await getTrackingByPublish(record.publishRecordId)
    return {
      type: "single",
      trackingRecords: records.map(r => ({
        node: r.node,
        nodeLabel: r.node === "custom" ? r.customLabel : trackingNodeConfig[r.node].label,
        status: r.status,
        views: r.views,
        likes: r.likes,
        comments: r.comments,
        shares: r.shares,
        favorites: r.favorites,
        followers: r.followers,
        completionRate: r.completionRate,
        bounceRate2s: r.bounceRate2s,
        retention5s: r.retention5s,
        avgPlayDuration: r.avgPlayDuration,
        rates: calculateRates(r),
      })),
      summary: null,
      periodStart: null,
      periodEnd: null,
    }
  }

  if (record.type === "periodic" && record.periodStart && record.periodEnd) {
    const allTracking = await db.trackingRecords
      .filter(t => t.scheduledTime >= record.periodStart! && t.scheduledTime <= record.periodEnd!)
      .toArray()

    const recorded = allTracking.filter(t => t.status === "recorded")
    const videoCount = new Set(allTracking.map(t => t.publishRecordId)).size
    const totalViews = recorded.reduce((sum, r) => sum + (r.views || 0), 0)
    const completionRates = recorded.map(r => r.completionRate).filter((v): v is number => v !== null)
    const bounceRates = recorded.map(r => r.bounceRate2s).filter((v): v is number => v !== null)
    const retentions = recorded.map(r => r.retention5s).filter((v): v is number => v !== null)

    return {
      type: "periodic",
      trackingRecords: [],
      summary: {
        videoCount,
        totalViews,
        avgCompletionRate: completionRates.length > 0
          ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length * 10) / 10
          : null,
        avgBounceRate: bounceRates.length > 0
          ? Math.round(bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length * 10) / 10
          : null,
        avgRetention: retentions.length > 0
          ? Math.round(retentions.reduce((a, b) => a + b, 0) / retentions.length * 10) / 10
          : null,
      },
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
    }
  }

  return {
    type: record.type,
    trackingRecords: [],
    summary: null,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
  }
}


// ========== 8. 获取已发布的记录（用于创建单条视频复盘） ==========

export async function getPublishedRecords(): Promise<PublishRecord[]> {
  return db.publishRecords
    .filter(r => r.status === "published")
    .reverse()
    .sortBy("createdAt")
}


// ========== 辅助函数 ==========

// 生成周期性复盘标题
function generatePeriodTitle(period: ReviewPeriod, timestamp: number): string {
  const date = new Date(timestamp)
  if (period === "daily") {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `【日报】${y}-${m}-${d}`
  }
  if (period === "weekly") {
    const year = date.getFullYear()
    const weekNum = getWeekNumber(date)
    return `【周报】${year}年第${weekNum}周`
  }
  // monthly
  return `【月报】${date.getFullYear()}年${date.getMonth() + 1}月`
}

// 获取周数
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// 格式化数字（万）
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toString()
}