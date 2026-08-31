// ========== 闪念池 API ==========
// 封装所有闪念池操作，页面组件只调 API 不直接碰数据库

import { db, type FlashThought, type FlashStatus, type CategoryTarget, type Todo } from "./db"
import { newId, newSyncFields } from "./id"
import { toast } from "sonner"

// 引入转化引擎：替代原先手写的「创建待办 + 改闪念状态」两步操作，
// 以获得事务原子性、幂等去重（总纲规则 4：转化只能一次）与统一事件通知
import { convertRecordSafely, hasConverted, type ConversionRule } from "./core/conversion"

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
//
// 已改用转化引擎（src/lib/core/conversion.ts）实现，相比原先的手写两步操作：
//   - 事务：待办创建与闪念回写要么都成功，要么都不生效
//   - 幂等：重复调用直接复用首次创建的待办，不会重复生成（总纲规则 4）
//   - 校验：状态流转经状态机校验，非「待处理」的闪念会被拒绝
//   - 通知：转化成功 / 失败由消息规则引擎统一处理，无需在此埋点

/** 闪念 → 待办 的转化规则 */
const FLASH_TO_TODO_RULE: ConversionRule<FlashThought, Todo> = {
  from: "flash-thought",
  to: "todo",
  convertedKey: "todoId", // 写入 flashThought.convertedIds.todoId
  allowedSourceStatuses: ["pending"], // 仅「待处理」可转化
  sourceNextStatus: "converted_todo",
  onlyOnce: true,
}

export async function convertToTodo(params: {
  id: string
  thought: string
}): Promise<{ flashId: string; todoId: string }> {
  const thoughtTrimmed = params.thought.trim()
  if (!thoughtTrimmed) {
    toast.error("请填写你的想法")
    throw new Error("请填写你的想法")
  }

  const result = await convertRecordSafely<FlashThought, Todo>({
    rule: FLASH_TO_TODO_RULE,
    sourceId: params.id,
    actor: CURRENT_USER,
    // 事务涉及的两张表
    tables: [db.flashThoughts, db.todos],
    readSource: (id) => db.flashThoughts.get(id),

    // 快照拷贝：闪念内容 → 待办标题与描述
    buildTarget: (source, actor) => ({
      title:
        source.content.length > 20
          ? source.content.slice(0, 20) + "..."
          : source.content,
      description: source.content,
      initialPriority: "P2",
      assignee: actor,
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 默认 7 天后
      linkedModules: [],
      progressTargets: {},
      linkedIds: {},
      status: "pending",
      source: "flash-thought",
      progressCompleted: {},
      progressBaseline: {},
      creator: actor,
      createdAt: Date.now(),
      completedAt: null,
      archived: false,
    } as unknown as Omit<Todo, "id">),

    insertTarget: async (record) => {
      await db.todos.add(record as Todo)
      return record.id as string
    },

    updateSource: (id, patch) =>
      db.flashThoughts.update(id, {
        ...patch,
        relatedId: (patch as { convertedIds?: { todoId?: string } }).convertedIds
          ?.todoId,
        thought: thoughtTrimmed,
        processedAt: Date.now(),
      }),
  })

  if (result.alreadyConverted) {
    toast.info("该闪念已转过待办")
  } else {
    toast.success("已转待办")
  }

  return { flashId: params.id, todoId: result.targetId }
}

/**
 * 查询某闪念是否已转待办（供 UI 禁用入口）
 */
export async function hasConvertedToTodo(flashId: string): Promise<boolean> {
  const flash = await db.flashThoughts.get(flashId)
  return hasConverted(flash as FlashThought | undefined, "todoId")
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
