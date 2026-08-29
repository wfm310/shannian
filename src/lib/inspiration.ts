// ========== 灵感记录 API ==========
// 封装所有灵感记录操作，页面组件只调 API 不直接碰数据库
// 和 flash-thought.ts、qa-collect.ts、benchmark.ts 是同一个模式

// 导入数据库实例和类型
import { db, type Inspiration, type InspirationStatus, type InspirationSource } from "./db"
// 导入 toast 提示
import { toast } from "sonner"

// 当前用户（和其他模块保持一致，系统自动识别）
const CURRENT_USER = "峰岚"


// ========== 工具函数：计算状态 ==========
// 根据结论是否为空 + 是否转选题，自动计算状态
// 规则：有 topicId → converted；有结论 → completed；无结论 → draft
function calcStatus(conclusion: string, topicId: number | null): InspirationStatus {
  if (topicId) return "converted"
  if (conclusion.trim()) return "completed"
  return "draft"
}


// ========== 1. 创建灵感 ==========
// 参数：灵感内容 + 思考过程 + 结论 + 来源 + 来源ID
// 返回：新创建的灵感 ID
export async function createInspiration(params: {
  content: string
  thoughtProcess?: string
  conclusion?: string
  source?: InspirationSource
  sourceId?: number | null
}): Promise<number> {
  const contentTrimmed = params.content.trim()
  if (!contentTrimmed) {
    toast.error("灵感内容不能为空")
    throw new Error("灵感内容不能为空")
  }

  const now = Date.now()
  const conclusion = params.conclusion?.trim() || ""
  const source = params.source || "manual"

  // 根据结论自动计算初始状态
  const status = calcStatus(conclusion, null)

  const id = await db.inspirations.add({
    content: contentTrimmed,
    thoughtProcess: params.thoughtProcess?.trim() || "",
    conclusion,
    source,
    sourceId: params.sourceId ?? null,
    status,
    creator: CURRENT_USER,
    topicId: null,
    createdAt: now,
    updatedAt: now,
  })

  toast.success("灵感已创建")
  return id as number
}


// ========== 2. 获取灵感列表 ==========
// 按更新时间倒序（最近编辑的在最前）
// 支持按状态筛选
export async function getInspirations(params?: {
  status?: InspirationStatus
}): Promise<Inspiration[]> {
  let list = await db.inspirations
    .orderBy("updatedAt")
    .reverse()  // 倒序，最近更新的在前
    .toArray()

  if (params?.status) {
    list = list.filter(i => i.status === params.status)
  }

  return list
}


// ========== 3. 获取单条灵感 ==========
export async function getInspiration(id: number): Promise<Inspiration | undefined> {
  return db.inspirations.get(id)
}


// ========== 4. 更新灵感 ==========
// 可以修改 content / thoughtProcess / conclusion
// 状态会根据结论自动重新计算
export async function updateInspiration(id: number, params: {
  content?: string
  thoughtProcess?: string
  conclusion?: string
}): Promise<void> {
  const current = await db.inspirations.get(id)
  if (!current) {
    toast.error("灵感不存在")
    throw new Error("灵感不存在")
  }

  const updates: any = {}
  if (params.content !== undefined) {
    updates.content = params.content.trim()
  }
  if (params.thoughtProcess !== undefined) {
    updates.thoughtProcess = params.thoughtProcess.trim()
  }
  if (params.conclusion !== undefined) {
    updates.conclusion = params.conclusion.trim()
    // 结论变了，重新计算状态（如果已转选题则保持 converted）
    updates.status = calcStatus(
      updates.conclusion,
      current.topicId
    )
  }
  updates.updatedAt = Date.now()

  await db.inspirations.update(id, updates)
  toast.success("已保存")
}


// ========== 5. 标记选题已创建 ==========
// 转选题成功后调用，把选题 ID 写入灵感记录
export async function markTopicCreated(inspirationId: number, topicId: number): Promise<void> {
  const current = await db.inspirations.get(inspirationId)
  if (!current) return

  await db.inspirations.update(inspirationId, {
    topicId,
    status: "converted",
    updatedAt: Date.now(),
  })
}


// ========== 6. 闪念池联动 - 回写关联 ==========
// 灵感创建成功后调用，把灵感 ID 写入闪念的 relatedId
export async function markFlashThoughtLinked(flashId: number, inspirationId: number): Promise<void> {
  await db.flashThoughts.update(flashId, {
    relatedId: inspirationId,
    status: "categorized",
    processedAt: Date.now(),
  })
}


// ========== 状态配置 ==========
export const inspirationStatusConfig: Record<InspirationStatus, {
  label: string
  variant: "default" | "secondary" | "outline"
}> = {
  draft: { label: "记录中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  converted: { label: "已转选题", variant: "outline" },
}


// ========== 来源配置 ==========
export const inspirationSourceConfig: Record<InspirationSource, { label: string }> = {
  manual: { label: "手动创建" },
  "flash-thought": { label: "闪念池" },
  benchmark: { label: "对标拆解" },
}