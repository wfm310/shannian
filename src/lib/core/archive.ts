// ========== 归档：统一 API + 自动归档定时任务 ==========
//
// 背景：总纲规则 7「全局无删除，归档是唯一终态」，此前仅 Todo 有 archived 字段，
// 其余表全无，且 db.ts 注释里承诺的「23:59 自动归档」**从未有任何定时任务实现**。
//
// 本模块提供：
//   1. 统一的归档 / 恢复 API（按库类 / 记录类区分语义）
//   2. 每日 23:59 自动归档「当天已完成待办」的定时器
//
// 语义区分（总纲规则 11）：
//   - 库类资源（脚本框架、标签库）：归档 = 停用，可恢复
//   - 记录类内容（对标、选题、待办等）：归档 = 终态，不可逆

import type { Table } from "dexie"

import { db } from "../db"
import { touchSyncFields } from "../id"
import { ARCHIVE_SEMANTICS, assertTransition, isArchiveReversible } from "./state-machine"
import { emit, type ModuleKey } from "./events"

/** ModuleKey → 数据表 */
const TABLES: Partial<Record<ModuleKey, Table>> = {
  todo: db.todos,
  benchmark: db.benchmarks,
  topic: db.topics,
  production: db.productions,
  publish: db.publishRecords,
  review: db.reviewRecords,
  "flash-thought": db.flashThoughts,
  inspiration: db.inspirations,
  qa: db.qaQuestions,
  "script-template": db.scriptTemplates,
  "tag-library": db.tagLibrary,
}

/** 无 status 字段的表（库类资源用 archived 表达停用，不走状态机） */
const TABLES_WITHOUT_STATUS: ReadonlySet<ModuleKey> = new Set<ModuleKey>([
  "script-template",
  "tag-library",
])

/**
 * 归档一条记录。
 * 记录类归档后为终态；库类归档后停用，可用 restoreRecord 恢复。
 */
export async function archiveRecord(
  module: ModuleKey,
  id: string,
  actor: string
): Promise<void> {
  const table = TABLES[module]
  if (!table) throw new Error(`[archive] 模块 ${module} 不支持归档`)

  const record = (await table.get(id)) as
    | { status?: string; archived?: boolean; syncVersion?: number }
    | undefined
  if (!record) throw new Error(`[archive] 记录不存在：${module}/${id}`)
  if (record.archived) return // 已归档，幂等

  const patch: Record<string, unknown> = {
    archived: true,
    archivedAt: Date.now(),
    ...touchSyncFields(record.syncVersion || 0),
  }

  // 有状态字段的表需走状态机校验
  if (!TABLES_WITHOUT_STATUS.has(module)) {
    const from = record.status ?? ""
    assertTransition(module, from, "archived")
    patch.status = "archived"
  }

  await table.update(id, patch)

  await emit({
    type: "record:archived",
    module,
    id,
    reversible: isArchiveReversible(module),
    actor,
    at: Date.now(),
  })
}

/**
 * 恢复一条已归档记录。
 * 仅库类资源可用（总纲规则 11）；记录类归档为终态，调用将抛错。
 */
export async function restoreRecord(
  module: ModuleKey,
  id: string,
  actor: string
): Promise<void> {
  if (ARCHIVE_SEMANTICS[module] !== "library") {
    throw new Error(
      `[archive] ${module} 属记录类，归档为终态，不可恢复（总纲规则 11）`
    )
  }

  const table = TABLES[module]
  if (!table) throw new Error(`[archive] 模块 ${module} 不支持恢复`)

  const record = (await table.get(id)) as
    | { archived?: boolean; syncVersion?: number }
    | undefined
  if (!record) throw new Error(`[archive] 记录不存在：${module}/${id}`)
  if (!record.archived) return // 未归档，幂等

  await table.update(id, {
    archived: false,
    archivedAt: null,
    ...touchSyncFields(record.syncVersion || 0),
  })
}

/**
 * 归档「当天已完成」的待办。
 *
 * 注意：只归档**当天**完成的，避免把历史已完成任务一次性全部归档
 * （历史数据应保留在列表中供回溯）。
 *
 * @returns 归档条数
 */
export async function archiveCompletedTodos(actor = "system"): Promise<number> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const targets = await db.todos
    .where("status")
    .equals("done")
    .filter((t) => !t.archived && (t.completedAt ?? 0) >= startOfToday.getTime())
    .toArray()

  for (const todo of targets) {
    if (!todo.id) continue
    await archiveRecord("todo", todo.id, actor)
  }
  return targets.length
}

let schedulerTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 启动每日 23:59 自动归档任务。
 *
 * @returns 停止函数
 */
export function startAutoArchiveScheduler(): () => void {
  // 仅在浏览器端运行（Next.js SSR 阶段无定时器语义）
  if (typeof window === "undefined") return () => {}
  if (schedulerTimer) return () => stopAutoArchiveScheduler()

  const schedule = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(23, 59, 0, 0)
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1)
    }
    const delay = next.getTime() - now.getTime()

    schedulerTimer = setTimeout(async () => {
      try {
        await archiveCompletedTodos()
      } catch (err) {
        console.error("[archive] 自动归档失败：", err)
      }
      schedule() // 排下一次
    }, delay)
  }

  schedule()
  return () => stopAutoArchiveScheduler()
}

/** 停止自动归档任务 */
export function stopAutoArchiveScheduler(): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer)
    schedulerTimer = null
  }
}
