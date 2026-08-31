// ========== 状态机：集中定义各模块合法状态流转 ==========
//
// 背景：此前状态流转逻辑散落在各 lib 与页面组件里，
// 同一个模块的状态在 lib 和组件里各写一套判断，难以保证一致。
//
// 本模块集中定义「从哪个状态可以到哪个状态」，并提供校验函数。
// 数据源：项目文档/ 各模块 L2 文档的「状态流转」小节。

import type { ModuleKey } from "./events"

/**
 * 归档语义（总纲规则 7 + 规则 11）
 * - record：记录类内容，归档 = 终态，不可逆
 * - library：库类资源，归档 = 停用，可恢复
 */
export type ArchiveSemantics = "record" | "library"

export const ARCHIVE_SEMANTICS: Record<ModuleKey, ArchiveSemantics> = {
  // 记录类：归档为终态
  todo: "record",
  benchmark: "record",
  topic: "record",
  production: "record",
  publish: "record",
  dashboard: "record", // 数据追踪
  review: "record",
  "flash-thought": "record",
  inspiration: "record",
  qa: "record",
  // 库类：归档可恢复
  "script-template": "library",
  "tag-library": "library",
  "knowledge-base": "library",
  // 非业务模块
  "ai-module": "record",
  system: "record",
}

/**
 * 状态流转表：{ 当前状态: [可流转到的状态] }
 * 空数组 = 终态。
 */
export const TRANSITIONS: Record<ModuleKey, Record<string, readonly string[]>> = {
  // ---- 07 对标拆解（状态自动跟随拆解进度，不可手动编辑）----
  benchmark: {
    disassembling: ["disassembled", "archived"],
    disassembled: ["converted", "archived"],
    converted: ["archived"],
    archived: [], // 记录类：终态
  },

  // ---- 10 选题库 ----
  // 已搁置可重新激活回草稿（文档 §3：已搁置 → 草稿）
  topic: {
    draft: ["pending_evaluation", "shelved", "abandoned", "archived"],
    pending_evaluation: ["confirmed", "shelved", "abandoned", "archived"],
    confirmed: ["produced", "shelved", "abandoned", "archived"],
    produced: ["archived"],
    shelved: ["draft", "abandoned", "archived"],
    abandoned: ["archived"],
    archived: [],
  },

  // ---- 09 灵感记录 ----
  // 注：代码的 completed 对应文档中文「已沉淀」
  inspiration: {
    draft: ["completed", "converted", "archived"],
    completed: ["converted", "archived"],
    converted: ["archived"],
    archived: [],
  },

  // ---- 06 闪念池 ----
  // 注：「超 48h」是提醒标记而非独立状态，故不在此表
  "flash-thought": {
    pending: ["categorized", "converted_todo", "archived"],
    categorized: ["archived"],
    converted_todo: ["archived"],
    archived: [],
  },

  // ---- 08 问答收集 ----
  qa: {
    unanswered: ["answered", "archived"],
    answered: ["converted", "archived"],
    converted: ["archived"],
    archived: [],
  },

  // ---- 12 内容生产（阶段顺序固定，不可回退、不可暂停、无删除）----
  production: {
    topic: ["script"],
    script: ["material"],
    material: ["editing"],
    editing: ["handoff"],
    handoff: ["published"],
    published: [],
  },

  // ---- 13 制作发布 ----
  publish: {
    pending: ["published", "archived"],
    published: ["archived"],
    archived: [],
  },

  // ---- 14 数据追踪（主状态机）----
  // 注：「异常标记」是叠加角标，不是独立状态
  dashboard: {
    pending: ["tracking", "archived"],
    tracking: ["completed", "archived"],
    completed: ["archived"],
    archived: [],
  },

  // ---- 15 复盘记录 ----
  review: {
    pending: ["in_progress", "archived"],
    in_progress: ["completed", "archived"],
    completed: ["archived"],
    archived: [],
  },

  // ---- 04 今日待办 ----
  todo: {
    pending: ["in-progress", "done", "archived"],
    "in-progress": ["done", "archived"],
    done: ["archived"],
    archived: [],
  },

  // ---- 11 脚本框架（库类：归档 = 停用，可恢复）----
  "script-template": {
    draft: ["in_use", "archived"],
    in_use: ["archived"],
    archived: ["in_use"], // 库类：可恢复
  },

  // ---- 标签库（库类）----
  "tag-library": {
    in_use: ["archived"],
    archived: ["in_use"],
  },

  "knowledge-base": {},
  "ai-module": {},
  system: {},
}

/**
 * 数据追踪的节点录入子状态机（每节点独立，不属主状态机）
 *
 * 要点：文档 §2 明确「始终允许补录，不锁死节点」，
 * 故 recorded / delayed / skipped 之间允许互相转换。
 */
export const TRACKING_NODE_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["recorded", "delayed", "skipped"],
  recorded: ["delayed"], // 补录时改判为延迟
  delayed: ["recorded"],
  skipped: ["recorded", "delayed"], // 已跳过也可补录
}

/**
 * 判断能否从 from 流转到 to
 */
export function canTransition(
  module: ModuleKey,
  from: string,
  to: string
): boolean {
  const table =
    module === "dashboard" && isTrackingNodeStatus(from)
      ? TRACKING_NODE_TRANSITIONS
      : TRANSITIONS[module]
  if (!table) return false
  const allowed = table[from]
  if (!allowed) return false
  return allowed.includes(to)
}

/**
 * 校验流转，非法则抛错。
 * 用于业务代码在写库前做前置校验。
 */
export function assertTransition(
  module: ModuleKey,
  from: string,
  to: string
): void {
  if (from === to) return // 同状态视为无变化，允许
  if (!canTransition(module, from, to)) {
    throw new Error(
      `[state-machine] 非法状态流转：${module} 不允许 ${from} → ${to}`
    )
  }
}

/**
 * 判断是否为终态（无任何出边）
 */
export function isTerminal(module: ModuleKey, status: string): boolean {
  const table = TRANSITIONS[module]
  if (!table) return false
  const allowed = table[status]
  return !allowed || allowed.length === 0
}

/**
 * 归档是否可逆（库类可恢复，记录类不可逆）
 */
export function isArchiveReversible(module: ModuleKey): boolean {
  return ARCHIVE_SEMANTICS[module] === "library"
}

function isTrackingNodeStatus(status: string): boolean {
  return status in TRACKING_NODE_TRANSITIONS
}

/**
 * 获取某状态可流转到的全部目标状态（供 UI 渲染可选操作）
 */
export function getNextStatuses(module: ModuleKey, from: string): readonly string[] {
  const table = TRANSITIONS[module]
  return table?.[from] ?? []
}
