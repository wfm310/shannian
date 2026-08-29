// ========== 优先级自动升阶工具 ==========
// 这个文件提供优先级升阶的计算函数
// 优先级根据"时间比例"自动升阶：距离截止日期越近，优先级越高

// 从 db.ts 导入 Priority 类型
import type { Priority } from "@/lib/db"

// 优先级顺序数组，索引越小优先级越高
// P0 的索引是 0（最高），P3 的索引是 3（最低）
const PRIORITY_ORDER: Priority[] = ["P0", "P1", "P2", "P3"]

/**
 * 计算当前优先级（实时计算，不存储）
 *
 * 升阶规则（按时间比例）：
 * - 0% ~ 50%：保持初始优先级
 * - 50% ~ 75%：升一级
 * - 75% ~ 100%：再升一级
 * - ≥ 100%（到期当天）：直接升到 P0
 *
 * @param initialPriority - 创建时用户选的初始优先级
 * @param createdAt - 创建时间（时间戳，毫秒）
 * @param dueDate - 截止日期（时间戳，毫秒）
 * @returns 当前应该显示的优先级
 */
export function getCurrentPriority(
  initialPriority: Priority,
  createdAt: number,
  dueDate: number
): Priority {
  // P0 已经是最高优先级，不需要升阶
  if (initialPriority === "P0") return "P0"

  // 当前时间
  const now = Date.now()

  // 任务寿命 = 截止日期 - 创建时间（毫秒）
  const lifespan = dueDate - createdAt

  // 已过时间 = 当前时间 - 创建时间（毫秒）
  const elapsed = now - createdAt

  // 时间比例 = 已过时间 / 任务寿命
  // 0 = 刚创建，1 = 到期，>1 = 已过期
  const ratio = lifespan > 0 ? elapsed / lifespan : 1

  // 到期当天或过期 → 直接升到 P0
  if (ratio >= 1) return "P0"

  // 升阶级别（0=不升，1=升一级，2=升两级）
  let levels = 0
  if (ratio >= 0.5) levels = 1    // 过了一半 → 升一级
  if (ratio >= 0.75) levels = 2   // 过了 3/4 → 再升一级

  // 找到初始优先级在数组中的位置
  const index = PRIORITY_ORDER.indexOf(initialPriority)

  // 计算升阶后的位置（不能小于 0，即不能超过 P0）
  const newIndex = Math.max(0, index - levels)

  // 返回升阶后的优先级
  return PRIORITY_ORDER[newIndex]
}

/**
 * 计算时间比例（用于 UI 展示进度条等）
 *
 * @returns 0~1 之间的数字，表示任务寿命已过的比例
 */
export function getTimeRatio(createdAt: number, dueDate: number): number {
  const now = Date.now()
  const lifespan = dueDate - createdAt
  if (lifespan <= 0) return 1
  const elapsed = now - createdAt
  return Math.min(1, Math.max(0, elapsed / lifespan))
}