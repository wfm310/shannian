// ========== 闪念池 API ==========
// 封装所有闪念池操作，页面组件只调 API 不直接碰数据库

import { db, type FlashThought, type FlashStatus, type CategoryTarget } from "./db"
import { newId, newSyncFields } from "./id"
import { toast } from "sonner"

// 当前用户（和其他模块保持一致）
const CURRENT_USER = "峰岚"


// ========== 1. 创建闪念 ==========
export async function createFlashThought(content: string): Promise<string> {
  const trimmed = content.trim()
  if (!trimmed) {
    toast.error("闪念内容不能为空")
    throw new Error("闪念内容不能为空")
  }

  const id = newId()
  await db.flashThoughts.add({
    id,
    content: trimmed,
    status: "pending",
    categoryTarget: null,
    relatedId: null,
    thought: null,
    createdAt: Date.now(),
    processedAt: null,
    ...newSyncFields(),
  })

  toast.success("已记录 ✓")
  return id
}


// ========== 2. 获取列表 ==========
// 按创建时间倒序（最新的在最前）
// 支持按状态筛选
export async function getFlashThoughts(params?: {
  status?: FlashStatus
}): Promise<FlashThought[]> {
  let list = await db.flashThoughts
    .orderBy("createdAt")
    .reverse()  // 倒序，最新的在前
    .toArray()

  if (params?.status) {
    list = list.filter(n => n.status === params.status)
  }

  return list
}


// ========== 3. 获取单条 ==========
export async function getFlashThought(id: string): Promise<FlashThought | undefined> {
  return db.flashThoughts.get(id)
}


// ========== 4. 归类（选题 / 问答 / 灵感） ==========
// 延迟状态变更：只保存归类目标和想法，不改状态
// 状态在目标模块创建成功后由 markFlashThoughtLinked 确认
export async function categorizeFlashThought(params: {
  id: string
  target: CategoryTarget
  thought: string
}): Promise<{ flashId: string; targetId: string | null }> {
  const thoughtTrimmed = params.thought.trim()
  if (!thoughtTrimmed) {
    toast.error("请填写你的想法")
    throw new Error("请填写你的想法")
  }

  if (!["topic", "qa", "inspiration"].includes(params.target)) {
    toast.error("归类目标不合法")
    throw new Error("归类目标不合法")
  }

  await db.flashThoughts.update(params.id, {
    categoryTarget: params.target,
    thought: thoughtTrimmed,
  })

  return { flashId: params.id, targetId: null }
}


// ========== 5. 转待办 ==========
// 在今日待办创建一条记录，闪念状态改为已转待办
export async function convertToTodo(params: {
  id: string
  thought: string
}): Promise<{ flashId: string; todoId: string }> {
  const thoughtTrimmed = params.thought.trim()
  if (!thoughtTrimmed) {
    toast.error("请填写你的想法")
    throw new Error("请填写你的想法")
  }

  // 先拿到闪念内容
  const flash = await db.flashThoughts.get(params.id)
  if (!flash) {
    toast.error("闪念不存在")
    throw new Error("闪念不存在")
  }

  // 标题取前 20 字
  const title = flash.content.length > 20
    ? flash.content.slice(0, 20) + "..."
    : flash.content

  // 截止日期默认 7 天后
  const dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000

  // 在今日待办创建任务
  const todoId = newId()
  await db.todos.add({
    id: todoId,
    title,
    description: flash.content,
    initialPriority: "P2",
    assignee: CURRENT_USER,
    dueDate,
    linkedModules: [],
    progressTargets: {},
    linkedIds: {},
    status: "pending",
    source: "flash-thought",
    progressCompleted: {},
    progressBaseline: {},
    creator: CURRENT_USER,
    createdAt: Date.now(),
    completedAt: null,
    archived: false,
    ...newSyncFields(),
  })

  // 更新闪念状态
  await db.flashThoughts.update(params.id, {
    status: "converted_todo",
    relatedId: todoId,
    thought: thoughtTrimmed,
    processedAt: Date.now(),
  })

  toast.success("已转待办")
  return { flashId: params.id, todoId }
}


// ========== 归类目标路由映射 ==========
// 每个归类目标对应模块的路由
export const categoryTargetConfig: Record<CategoryTarget, { label: string; path: string }> = {
  topic: { label: "选题库", path: "/topic-library" },
  qa: { label: "问答收集", path: "/qa-collect" },
  inspiration: { label: "灵感记录", path: "/inspiration" },
}


// ========== 状态配置 ==========
export const statusConfig: Record<FlashStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "待处理", variant: "default" },
  categorized: { label: "已归类", variant: "secondary" },
  converted_todo: { label: "已转待办", variant: "outline" },
}


// ========== 6. 回写关联 ID ==========
// 其它模块（选题库/问答收集）创建成功后调用
// 写入 relatedId 并确认状态为已归类（延迟状态变更的确认步骤）
export async function markFlashThoughtLinked(flashId: string, targetId: string): Promise<void> {
  await db.flashThoughts.update(flashId, {
    relatedId: targetId,
    status: "categorized",
    processedAt: Date.now(),
  })
}
