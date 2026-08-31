// ========== 进度同步事件总线 ==========
// 跨模块进度同步：对标模块状态变化时通知待办刷新
//
// 为什么不用轮询？
// - 轮询有延迟（每隔几秒才查一次）
// - 事件驱动更实时，对标状态一变，待办立刻刷新
// - 更省性能，没事的时候不查数据库
//
// 和 notification-events.ts 是同一个模式

import { db } from "./db"

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * 订阅进度变化事件
 * 在待办页面/详情组件的 useEffect 里调用
 * 返回一个取消订阅的函数（组件卸载时调）
 */
export function subscribeProgressChanges(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 触发进度变化事件
 * 所有订阅了的待办组件会自动刷新
 */
export function emitProgressChanged() {
  listeners.forEach(listener => listener())
}

/**
 * 检查待办的所有关联模块是否都已完成
 *
 * 只有当所有模块的 progressCompleted >= progressTargets 时，才返回 true
 * 如果任何一个模块未达标，返回 false
 *
 * 这样修复了之前的 bug：一条待办关联了多个模块（如对标+选题），
 * 其中一个模块进度满了就自动标记待办完成，但其他模块还没完成。
 */
function checkAllModulesComplete(
  targets: Record<string, number>,
  completed: Record<string, number>
): boolean {
  const keys = Object.keys(targets)
  if (keys.length === 0) return false
  return keys.every(key => {
    const target = targets[key] || 0
    if (target === 0) return true // 目标为 0 的模块视为已完成
    const done = completed[key] || 0
    return done >= target
  })
}

/**
 * 同步对标拆解进度到所有待办
 *
 * Delta 计算逻辑：
 * 1. 统计当前对标表里所有"已拆解"+"已转化"的记录数量（currentCompleted）
 * 2. 找到所有 linkedModules 包含 "benchmark" 的待办
 * 3. 读取每个待办创建时记录的基准线（progressBaseline.benchmark）
 * 4. 计算：本次新完成数 = currentCompleted - baseline（不低于 0，不超过目标数）
 * 5. 写入 progressCompleted.benchmark
 * 6. 只有所有关联模块的进度都达标时，才自动标记待办为已完成
 * 7. 触发事件，通知 UI 刷新
 *
 * 为什么用 delta 而不是直接统计？
 * - 直接统计会把"创建待办之前就已经完成的对标"也算进去，进度一开始就 > 0
 * - delta 只统计"创建待办之后新完成的"，从 0 开始递增，符合实际工作进度
 *
 * 调用时机：对标状态变化时（新建、开始拆解、完成拆解、转化）
 */
export async function syncBenchmarkProgressToTodos(): Promise<void> {
  // 1. 统计当前已完成的对标记录数量
  const allBenchmarks = await db.benchmarks.toArray()
  const currentCompleted = allBenchmarks.filter(
    bm => bm.status === "disassembled" || bm.status === "converted"
  ).length

  // 2. 找到所有关联了对标模块的待办
  const todos = await db.todos.toArray()
  const benchmarkTodos = todos.filter(
    t => (t.linkedModules || []).includes("benchmark")
  )

  // 3. 更新每个待办的进度
  for (const todo of benchmarkTodos) {
    if (!todo.id) continue

    const target = (todo.progressTargets || {}).benchmark || 0
    const baseline = (todo.progressBaseline || {}).benchmark || 0
    // delta：当前已完成 - 基准线 = 本次待办期间新完成的数量
    const completed = Math.max(0, Math.min(target, currentCompleted - baseline))
    const newProgress = { ...todo.progressCompleted, benchmark: completed }

    // 只有所有关联模块的进度都达标时，才自动标记完成
    const allMet = checkAllModulesComplete(
      todo.progressTargets || {},
      newProgress
    )
    if (allMet && todo.status !== "done") {
      await db.todos.update(todo.id, {
        progressCompleted: newProgress,
        status: "done",
        completedAt: Date.now(),
      })
    } else {
      await db.todos.update(todo.id, { progressCompleted: newProgress })
    }
  }

  // 4. 触发事件，通知 UI 刷新
  emitProgressChanged()
}

/**
 * 同步选题库进度到所有待办
 *
 * Delta 计算逻辑（和对标一样）：
 * 1. 统计选题表当前总记录数（currentCount）
 * 2. 找到所有 linkedModules 包含 "topic" 的待办
 * 3. 读取基准线（progressBaseline.topic）
 * 4. 计算：本次新建数 = currentCount - baseline（不低于 0，不超过目标数）
 * 5. 只有所有关联模块的进度都达标时，才自动标记完成
 * 6. 触发事件
 *
 * 调用时机：选题库新建选题成功后
 */
export async function syncTopicProgressToTodos(): Promise<void> {
  // 1. 统计当前选题总数
  const currentCount = await db.topics.count()

  // 2. 找到所有关联了选题库的待办
  const todos = await db.todos.toArray()
  const topicTodos = todos.filter(
    t => (t.linkedModules || []).includes("topic")
  )

  // 3. 更新每个待办的进度
  for (const todo of topicTodos) {
    if (!todo.id) continue

    const target = (todo.progressTargets || {}).topic || 0
    const baseline = (todo.progressBaseline || {}).topic || 0
    const completed = Math.max(0, Math.min(target, currentCount - baseline))
    const newProgress = { ...todo.progressCompleted, topic: completed }

    // 只有所有关联模块的进度都达标时，才自动标记完成
    const allMet = checkAllModulesComplete(
      todo.progressTargets || {},
      newProgress
    )
    if (allMet && todo.status !== "done") {
      await db.todos.update(todo.id, {
        progressCompleted: newProgress,
        status: "done",
        completedAt: Date.now(),
      })
    } else {
      await db.todos.update(todo.id, { progressCompleted: newProgress })
    }
  }

  // 4. 触发事件
  emitProgressChanged()
}

/**
 * 同步内容生产进度到所有待办
 *
 * 进度计算逻辑：
 * 1. 找到所有 linkedModules 包含 "production" 的待办
 * 2. 通过 linkedIds.production 获取关联的生产任务
 * 3. 计算每个任务的阶段索引（stageOrder 中的位置）
 * 4. Delta：当前阶段索引 - 基准线 = 本次待办期间推进的阶段数
 * 5. 只有所有关联模块的进度都达标时，才自动标记完成
 * 6. 触发事件，通知 UI 刷新
 *
 * 调用时机：生产任务推进阶段时（advanceStage 函数内调用）
 */
export async function syncProductionProgressToTodos(): Promise<void> {
  // 阶段顺序（局部定义，避免与 produce-flow.ts 循环依赖）
  const stageOrder = ["topic", "script", "material", "editing", "handoff", "published"] as const

  // 1. 获取所有生产任务
  const allProductions = await db.productions.toArray()

  // 2. 找到所有关联了生产模块的待办
  const todos = await db.todos.toArray()
  const productionTodos = todos.filter(
    t => (t.linkedModules || []).includes("production")
  )

  // 3. 更新每个待办的进度
  for (const todo of productionTodos) {
    if (!todo.id) continue

    // 获取关联的生产任务ID列表
    const taskIds = (todo.linkedIds || {}).production || []
    if (taskIds.length === 0) continue

    // 获取关联的生产任务
    const linkedTasks = allProductions.filter(p => taskIds.includes(p.id!))

    // 计算已完成阶段数（stageOrder 中的索引）
    const completedStages = linkedTasks.reduce((sum, task) => {
      return sum + stageOrder.indexOf(task.currentStage)
    }, 0)

    const target = (todo.progressTargets || {}).production || 0
    const baseline = (todo.progressBaseline || {}).production || 0
    const completed = Math.max(0, Math.min(target, completedStages - baseline))
    const newProgress = { ...todo.progressCompleted, production: completed }

    // 只有所有关联模块的进度都达标时，才自动标记完成
    const allMet = checkAllModulesComplete(
      todo.progressTargets || {},
      newProgress
    )
    if (allMet && todo.status !== "done") {
      await db.todos.update(todo.id, {
        progressCompleted: newProgress,
        status: "done",
        completedAt: Date.now(),
      })
    } else {
      await db.todos.update(todo.id, { progressCompleted: newProgress })
    }
  }

  // 4. 触发事件，通知 UI 刷新
  emitProgressChanged()
}
