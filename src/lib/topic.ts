// ========== 选题库 API 工具 ==========
// 封装所有选题库的数据库操作
// 注意：本模块无删除功能（项目全局无删除）

import { db, type Topic, type TopicStatus, type TopicSource, type MatchLevel, type DemandLevel, type CompetitionType, type PriorityLevel } from "./db"


// ========== 配置 ==========

// 选题来源中文映射
export const topicSourceConfig: Record<TopicSource, { label: string }> = {
  manual: { label: "手动创建" },
  benchmark: { label: "对标分析" },
  qa: { label: "问答收集" },
  inspiration: { label: "灵感记录" },
  review: { label: "复盘回流" },
  other: { label: "其他" },
}

// 选题状态配置（中文 + Badge variant）
export const topicStatusConfig: Record<TopicStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  reserve: { label: "储备", variant: "outline" },
  pending_production: { label: "待生产", variant: "default" },
  in_production: { label: "生产中", variant: "secondary" },
  published: { label: "已发布", variant: "secondary" },
}

// 定位匹配度配置（中文 + 分值 + 描述）满分 40 分
export const matchLevelConfig: Record<MatchLevel, { label: string; score: number; description: string }> = {
  high: { label: "高", score: 40, description: "跟我的受众人群非常匹配" },
  medium: { label: "中", score: 25, description: "跟我的受众人群不是很匹配" },
  low: { label: "低", score: 10, description: "跟我的受众人群不匹配" },
}

// 需求强度配置（满分 35 分）
export const demandLevelConfig: Record<DemandLevel, { label: string; score: number; description: string }> = {
  high: { label: "高", score: 35, description: "用户现在就想要解决" },
  medium: { label: "中", score: 22, description: "用户现阶段并不着急解决" },
  low: { label: "低", score: 10, description: "用户只是想看看" },
}

// 竞争热点配置（满分 25 分）
export const competitionConfig: Record<CompetitionType, { label: string; score: number; description: string }> = {
  blue_ocean: { label: "蓝海", score: 25, description: "竞争少，有机会" },
  red_ocean: { label: "红海", score: 8, description: "竞争激烈" },
}

// 优先级星级配置
export const priorityLevelConfig: Record<PriorityLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  urgent: { label: "立即做", variant: "destructive" },
  scheduled: { label: "排期做", variant: "default" },
  reserve: { label: "储备", variant: "outline" },
}

// 筛选标签页配置
export const filterTabs = [
  { value: "all", label: "全部" },
  { value: "urgent", label: "立即做" },
  { value: "scheduled", label: "排期做" },
  { value: "reserve", label: "储备" },
] as const


// ========== 优先级计算 ==========

/**
 * 计算优先级得分和星级（含一票否决）
 */
export function calculatePriority(
  positioningMatch: MatchLevel | null,
  demandLevel: DemandLevel | null,
  competition: CompetitionType | null
): { score: number; level: PriorityLevel } {
  if (!positioningMatch || !demandLevel || !competition) {
    return { score: 0, level: "reserve" }
  }

  const score =
    matchLevelConfig[positioningMatch].score +
    demandLevelConfig[demandLevel].score +
    competitionConfig[competition].score

  let level: PriorityLevel
  if (score >= 75) {
    level = "urgent"
  } else if (score >= 50) {
    level = "scheduled"
  } else {
    level = "reserve"
  }

  // 一票否决
  if (positioningMatch === "low") {
    level = "reserve"
  } else if (demandLevel === "low" && level === "urgent") {
    level = "scheduled"
  }

  return { score, level }
}

/**
 * 根据优先级星级确定选题状态
 */
export function determineStatus(level: PriorityLevel): TopicStatus {
  if (level === "reserve") return "reserve"
  return "pending_production"
}


// ========== 创建默认值函数 ==========

function createDefaultTopic(
  topicTitle: string,
  topicNote: string,
  creator: string,
  source: TopicSource = "manual"
): Omit<Topic, "id"> {
  return {
    topicTitle,
    topicNote,
    creator,
    createdAt: Date.now(),
    source,
    sourceId: null,
    audience: "",
    demand: "",
    contentDimension: "",
    copyReference: "",
    copyReferenceLocked: true, // 创建后即锁定
    positioningMatch: null,
    demandLevel: null,
    competition: null,
    contentPositioning: "",
    priorityScore: 0,
    priorityLevel: "reserve",
    status: "reserve",
    updatedAt: Date.now(),
  }
}


// ========== API 函数 ==========

/**
 * 新建选题
 */
export async function createTopic(data: {
  topicTitle: string
  topicNote: string
  creator: string
  source?: TopicSource
  sourceId?: number | null
  audience?: string
  demand?: string
  contentDimension?: string
  positioningMatch?: MatchLevel | null
  demandLevel?: DemandLevel | null
  competition?: CompetitionType | null
  contentPositioning?: string
  copyReference?: string
}): Promise<number> {
  const topic = createDefaultTopic(
    data.topicTitle,
    data.topicNote,
    data.creator,
    data.source || "manual"
  )

  if (data.sourceId !== undefined) topic.sourceId = data.sourceId
  if (data.audience) topic.audience = data.audience
  if (data.demand) topic.demand = data.demand
  if (data.contentDimension) topic.contentDimension = data.contentDimension
  if (data.positioningMatch !== undefined) topic.positioningMatch = data.positioningMatch
  if (data.demandLevel !== undefined) topic.demandLevel = data.demandLevel
  if (data.competition !== undefined) topic.competition = data.competition
  if (data.contentPositioning) topic.contentPositioning = data.contentPositioning
  if (data.copyReference) topic.copyReference = data.copyReference

  // 计算优先级
  const { score, level } = calculatePriority(
    topic.positioningMatch,
    topic.demandLevel,
    topic.competition
  )
  topic.priorityScore = score
  topic.priorityLevel = level
  topic.status = determineStatus(level)

  // 文案参考锁定：创建后即锁定
  topic.copyReferenceLocked = true

  const id = await db.topics.add(topic as any)
  return id as number
}


/**
 * 获取选题列表
 */
export async function getTopics(priorityLevel?: string): Promise<Topic[]> {
  const allData = await db.topics.toArray()
  let filtered = allData

  if (priorityLevel && priorityLevel !== "all") {
    filtered = filtered.filter(t => t.priorityLevel === priorityLevel)
  }

  filtered.sort((a, b) => b.createdAt - a.createdAt)
  return filtered
}


/**
 * 获取单条选题记录
 */
export async function getTopic(id: number): Promise<Topic | undefined> {
  return await db.topics.get(id)
}


/**
 * 更新选题记录（自动重新计算优先级）
 */
export async function updateTopic(
  id: number,
  updates: Partial<Topic>
): Promise<void> {
  const current = await db.topics.get(id)
  if (!current) return

  const merged = { ...current, ...updates }

  // 优先级维度有变化时重新计算
  if (
    updates.positioningMatch !== undefined ||
    updates.demandLevel !== undefined ||
    updates.competition !== undefined
  ) {
    const { score, level } = calculatePriority(
      merged.positioningMatch,
      merged.demandLevel,
      merged.competition
    )
    merged.priorityScore = score
    merged.priorityLevel = level
    merged.status = determineStatus(level)
  }

  merged.updatedAt = Date.now()
  await db.topics.update(id, merged as any)
}


// ========== 工具函数 ==========

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}