// ========== 转化引擎 ==========
//
// 背景：此前转化逻辑散落在 benchmark.ts / flash-thought.ts 与 3 个页面组件里，
// 每个转化都要手写「创建目标记录 → 回写源记录 → 改状态 → 发通知」四步，存在三个问题：
//   1. 无事务：目标创建成功但回写失败会留下脏数据
//   2. 无幂等：重复触发会创建多条目标记录（总纲规则 4 要求转化只能一次）
//   3. 无统一入口：无法在转化时统一触发知识图谱同步与消息通知
//
// 本引擎把流程固化为：校验 → 幂等 → 事务（创建目标 + 回写源）→ 发事件。
// 具体表操作由调用方以回调注入，引擎只负责编排，从而可复用于任意模块。

import type { Table } from "dexie"

import { db } from "../db"
import { newId, newSyncFields, touchSyncFields } from "../id"
import { assertTransition } from "./state-machine"
import { emit, type ModuleKey } from "./events"

/** 源记录需具备的最小契约（引擎据此做幂等与状态校验） */
export interface ConvertibleSource {
  id?: string
  status?: string
  convertedIds?: Record<string, string | undefined>
  syncVersion?: number
  updatedAt?: number
}

/** 转化规则定义 */
export interface ConversionRule<TSource extends ConvertibleSource, TTarget> {
  /** 源模块 */
  from: ModuleKey
  /** 目标模块 */
  to: ModuleKey
  /** 写入源记录 convertedIds 的键，用于幂等判定（如 "topicId"） */
  convertedKey: string
  /** 允许转化的源状态；空数组表示不限制 */
  allowedSourceStatuses: readonly string[]
  /** 转化成功后源记录流转到的新状态 */
  sourceNextStatus: string
  /** 是否要求源记录尚未转化过（默认 true，对应总纲规则 4） */
  onlyOnce?: boolean
}

/** 转化结果 */
export interface ConvertResult {
  /** 目标记录 ID */
  targetId: string
  /** true 表示此前已转化过，本次直接复用旧记录，未新建 */
  alreadyConverted: boolean
}

/**
 * 执行一次转化。
 *
 * @param params.rule       转化规则
 * @param params.sourceId   源记录 ID
 * @param params.actor      操作人（动态注册账号）
 * @param params.tables     事务涉及的表，保证创建与回写的原子性
 * @param params.readSource 读取源记录
 * @param params.buildTarget 由源记录生成目标记录（快照拷贝）
 * @param params.insertTarget 写入目标记录，返回新 ID
 * @param params.updateSource 回写源记录
 */
// 注：目标类型多为 interface（无索引签名），故用 object 而非 Record<string, unknown> 约束
export async function convertRecord<
  TSource extends ConvertibleSource,
  TTarget extends object
>(params: {
  rule: ConversionRule<TSource, TTarget>
  sourceId: string
  actor: string
  tables: Table[]
  readSource: (id: string) => Promise<TSource | undefined>
  buildTarget: (source: TSource, actor: string) => Omit<TTarget, "id">
  insertTarget: (record: TTarget) => Promise<string>
  // Dexie 的 update 返回 PromiseExtended<number>，故用 unknown 兼容
  updateSource: (id: string, patch: Partial<TSource>) => Promise<unknown>
}): Promise<ConvertResult> {
  const { rule, sourceId, actor, tables, readSource, buildTarget, insertTarget, updateSource } = params

  // 事务内完成「幂等判定 + 创建目标 + 回写源」，保证原子性
  const result = await db.transaction("rw", tables, async () => {
    const source = await readSource(sourceId)
    if (!source) {
      throw new Error(`[conversion] 源记录不存在：${rule.from}/${sourceId}`)
    }

    // 1) 幂等：已转化过则直接复用，不重复创建（总纲规则 4）
    const existingId = source.convertedIds?.[rule.convertedKey]
    if (existingId) {
      if (rule.onlyOnce !== false) {
        return { targetId: existingId, alreadyConverted: true }
      }
    }

    // 2) 状态校验
    const currentStatus = source.status ?? ""
    if (
      rule.allowedSourceStatuses.length > 0 &&
      !rule.allowedSourceStatuses.includes(currentStatus)
    ) {
      throw new Error(
        `[conversion] ${rule.from} 处于「${currentStatus}」时不可转化为 ${rule.to}`
      )
    }
    assertTransition(rule.from, currentStatus, rule.sourceNextStatus)

    // 3) 快照拷贝 → 创建目标记录
    const draft = buildTarget(source, actor) as TTarget
    const targetId = newId()
    await insertTarget({ ...draft, id: targetId, ...newSyncFields() } as TTarget)

    // 4) 回写源记录：关联 ID + 状态流转
    //    TSource 的 status 常为字面量联合类型，此处按运行时契约构造，故经 unknown 转换
    await updateSource(sourceId, {
      convertedIds: { ...(source.convertedIds ?? {}), [rule.convertedKey]: targetId },
      status: rule.sourceNextStatus,
      ...touchSyncFields(source.syncVersion || 0),
    } as unknown as Partial<TSource>)

    return { targetId, alreadyConverted: false }
  })

  // 事务提交后再发事件：
  // 订阅者（消息规则引擎、知识图谱同步）会写库，必须避开事务上下文
  await emit({
    type: "record:converted",
    source: { module: rule.from, id: sourceId },
    target: { module: rule.to, id: result.targetId },
    actor,
    at: Date.now(),
  })

  return result
}

/**
 * 带失败上报的转化包装。
 * 捕获异常后发出 conversion:failed 事件（供消息规则引擎通知用户），再重新抛出。
 */
export async function convertRecordSafely<
  TSource extends ConvertibleSource,
  TTarget extends object
>(
  params: Parameters<typeof convertRecord<TSource, TTarget>>[0]
): Promise<ConvertResult> {
  try {
    return await convertRecord(params)
  } catch (err) {
    await emit({
      type: "conversion:failed",
      source: { module: params.rule.from, id: params.sourceId },
      targetModule: params.rule.to,
      reason: err instanceof Error ? err.message : String(err),
      actor: params.actor,
      at: Date.now(),
    })
    throw err
  }
}

/**
 * 判断某源记录是否已转化到指定键（供 UI 禁用转化入口）
 */
export function hasConverted(
  source: ConvertibleSource | undefined,
  convertedKey: string
): boolean {
  return Boolean(source?.convertedIds?.[convertedKey])
}
