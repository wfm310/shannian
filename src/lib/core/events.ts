// ========== 统一领域事件总线 ==========
//
// 背景：项目此前有两条互不相通的事件总线
//   - notification-events.ts（消息未读数刷新）
//   - progress-events.ts（待办进度刷新）
// 各模块需要联动时只能手动互相调用，导致 23 处 sendNotification 埋点散落各处。
//
// 本模块提供统一的领域事件，业务代码只管 emit，
// 由订阅方（消息规则引擎、进度同步、知识图谱）自行响应，实现解耦。

import type { RelatedModule } from "../db"

/**
 * 模块键。
 * RelatedModule 是「通知可关联的模块」，状态机还需要脚本框架等库类模块，
 * 因此这里是它的超集。
 */
export type ModuleKey =
  | RelatedModule
  | "script-template" // 脚本框架（库类资源）
  | "knowledge-base" // 知识图谱
  | "tag-library" // 标签库（库类资源）

/** 记录引用 */
export interface RecordRef {
  module: ModuleKey
  id: string
}

/** 领域事件 */
export type DomainEvent =
  | {
      type: "record:created"
      module: ModuleKey
      id: string
      record: Record<string, unknown>
      actor: string
      at: number
    }
  | {
      type: "record:updated"
      module: ModuleKey
      id: string
      before: Record<string, unknown>
      after: Record<string, unknown>
      changedFields: string[]
      actor: string
      at: number
    }
  | {
      type: "status:changed"
      module: ModuleKey
      id: string
      from: string
      to: string
      record: Record<string, unknown>
      actor: string
      at: number
    }
  | {
      type: "assignee:changed"
      module: ModuleKey
      id: string
      from: string | null
      to: string
      record: Record<string, unknown>
      actor: string
      at: number
    }
  | {
      type: "record:converted"
      source: RecordRef
      target: RecordRef
      actor: string
      at: number
    }
  | {
      type: "conversion:failed"
      source: RecordRef
      targetModule: ModuleKey
      reason: string
      actor: string
      at: number
    }
  | {
      type: "record:archived"
      module: ModuleKey
      id: string
      reversible: boolean
      actor: string
      at: number
    }

type EventOfType<K extends DomainEvent["type"]> = Extract<DomainEvent, { type: K }>
type Handler<K extends DomainEvent["type"]> = (
  event: EventOfType<K>
) => void | Promise<void>

// 按事件类型分桶存储
const handlers = new Map<string, Set<(e: DomainEvent) => void | Promise<void>>>()

/**
 * 订阅某类事件，返回取消订阅函数
 */
export function on<K extends DomainEvent["type"]>(
  type: K,
  handler: Handler<K>
): () => void {
  let set = handlers.get(type)
  if (!set) {
    set = new Set()
    handlers.set(type, set)
  }
  const wrapped = handler as unknown as (e: DomainEvent) => void | Promise<void>
  set.add(wrapped)
  return () => {
    set?.delete(wrapped)
  }
}

/**
 * 发布事件。
 *
 * 设计要点：
 * - 串行执行：保证写库顺序可预期
 * - 错误隔离：单个订阅者抛错不影响其他订阅者，也不影响主流程
 */
export async function emit(event: DomainEvent): Promise<void> {
  const set = handlers.get(event.type)
  if (!set || set.size === 0) return

  for (const handler of Array.from(set)) {
    try {
      await handler(event)
    } catch (err) {
      console.error(`[events] "${event.type}" 的订阅者执行失败：`, err)
    }
  }
}

/** 清除全部订阅（测试用） */
export function clearAllListeners(): void {
  handlers.clear()
}
