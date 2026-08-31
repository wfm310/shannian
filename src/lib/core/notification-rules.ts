// ========== 消息规则引擎 ==========
//
// 背景：总纲规则 9/62 要求「所有含负责人的记录创建 / 改派时自动发消息」，
// 原实现是在 23 处业务代码里手动调用 sendNotification（其中 16 处在页面组件里），
// 每新增一个模块就要补埋点，遗漏与文案不一致难以避免。
//
// 本模块改为「订阅领域事件 → 按规则生成消息」：
// 业务代码只需 emit 事件，消息自动产生。
//
// 使用：应用启动时调用一次 registerNotificationRules()

import { sendNotification } from "../notification"
import type { RelatedModule } from "../db"
import { on, type ModuleKey } from "./events"

/** 模块中文名（消息文案用，需与 L2 文档术语表一致） */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  todo: "今日待办",
  benchmark: "对标拆解",
  topic: "选题库",
  production: "内容生产",
  publish: "制作发布",
  dashboard: "数据追踪",
  review: "复盘记录",
  "flash-thought": "闪念池",
  inspiration: "灵感记录",
  qa: "问答收集",
  "script-template": "脚本框架",
  "tag-library": "标签库",
  "knowledge-base": "知识图谱",
  "ai-module": "AI 模块",
  system: "系统",
}

/** 从记录里取标题（各模块字段名不同，统一兜底） */
function pickTitle(record: Record<string, unknown>): string {
  for (const key of ["title", "name", "content", "thought"]) {
    const v = record[key]
    if (typeof v === "string" && v.trim()) {
      return v.trim().length > 20 ? `${v.trim().slice(0, 20)}...` : v.trim()
    }
  }
  return "新记录"
}

/** 取负责人 */
function pickAssignee(record: Record<string, unknown>): string | null {
  const v = record.assignee ?? record.receiver
  return typeof v === "string" && v.trim() ? v.trim() : null
}

let registered = false

/**
 * 注册消息规则。重复调用安全。
 */
export function registerNotificationRules(): void {
  if (registered) return
  registered = true

  // ---- 规则 1：创建含负责人的记录 → 通知负责人 ----
  // 对应总纲规则 9：所有含负责人的记录创建时自动发消息
  on("record:created", async (e) => {
    const assignee = pickAssignee(e.record)
    if (!assignee) return
    if (assignee === e.actor) return // 指派给自己不通知

    await sendNotification({
      type: "todo",
      title: `新任务：${pickTitle(e.record)}`,
      content: `${e.actor} 在「${MODULE_LABELS[e.module]}」指派了任务给你`,
      relatedModule: toRelatedModule(e.module),
      relatedId: e.id,
      receiver: assignee,
      showToast: false, // 避免弹窗轰炸，仅进消息中心
    })
  })

  // ---- 规则 2：改派负责人 → 通知新负责人 ----
  on("assignee:changed", async (e) => {
    if (!e.to) return
    if (e.to === e.actor) return

    await sendNotification({
      type: "todo",
      title: `任务转交：${pickTitle(e.record)}`,
      content: `${e.actor} 将「${MODULE_LABELS[e.module]}」的任务转交给你`,
      relatedModule: toRelatedModule(e.module),
      relatedId: e.id,
      receiver: e.to,
      showToast: false,
    })
  })

  // ---- 规则 3：转化成功 → 通知目标记录负责人（含去向）----
  on("record:converted", async (e) => {
    // 目标记录尚无详情，此处只通知操作人确认结果
    await sendNotification({
      type: "module",
      title: "转化成功",
      content: `「${MODULE_LABELS[e.source.module]}」的记录已转化为「${MODULE_LABELS[e.target.module]}」`,
      relatedModule: toRelatedModule(e.target.module),
      relatedId: e.target.id,
      receiver: e.actor,
      showToast: false,
    })
  })

  // ---- 规则 4：转化失败 → 通知操作人（这是原页面组件里 6 处重复埋点的来源）----
  on("conversion:failed", async (e) => {
    await sendNotification({
      type: "system",
      title: "转化未完成",
      content: `「${MODULE_LABELS[e.source.module]}」转化为「${MODULE_LABELS[e.targetModule]}」未成功：${e.reason}`,
      relatedModule: toRelatedModule(e.source.module),
      relatedId: e.source.id,
      receiver: e.actor,
      showToast: true, // 失败需要即时提示
    })
  })

  // ---- 规则 5：归档 → 仅库类资源可恢复时提示操作人 ----
  on("record:archived", async (e) => {
    if (!e.reversible) return // 记录类归档是终态，无需提示
    await sendNotification({
      type: "system",
      title: "已归档",
      content: `「${MODULE_LABELS[e.module]}」的资源已归档停用，可随时恢复`,
      relatedModule: toRelatedModule(e.module),
      relatedId: e.id,
      receiver: e.actor,
      showToast: false,
    })
  })
}

/**
 * ModuleKey 转 RelatedModule。
 * 库类模块不在通知的关联模块枚举内，统一落到 system。
 */
function toRelatedModule(module: ModuleKey): RelatedModule {
  const related: readonly string[] = [
    "todo", "benchmark", "topic", "production", "publish",
    "dashboard", "review", "flash-thought", "inspiration",
    "qa", "ai-module", "system",
  ]
  return (related.includes(module) ? module : "system") as RelatedModule
}

/** 供测试：重置注册状态 */
export function __resetNotificationRules(): void {
  registered = false
}
