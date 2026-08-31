"use client"

// ========== 业务规则层启动器（仅客户端执行）==========
//
// 职责：应用启动时装配 src/lib/core/ 的订阅者与定时任务
//   1. 注册消息规则引擎（替代散落在 23 处的 sendNotification 手动埋点）
//   2. 启动每日 23:59 自动归档待办的定时器
//
// 说明：core 层本身不依赖 UI，但订阅者需要「被注册」才会响应事件，
// 因此需要一个挂载点。放在此处而非模块顶层，可避免 SSR 阶段执行副作用。

import { useEffect } from "react"

import { registerNotificationRules } from "@/lib/core/notification-rules"
import { startAutoArchiveScheduler } from "@/lib/core/archive"

// 模块级标记：React 18 StrictMode 下 effect 会执行两次，需防止重复注册
let bootstrapped = false

export function CoreBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (bootstrapped) return
    bootstrapped = true

    // 1) 消息规则引擎：订阅领域事件，自动生成消息
    registerNotificationRules()

    // 2) 自动归档：每日 23:59 归档当天已完成的待办
    const stopScheduler = startAutoArchiveScheduler()

    return () => {
      stopScheduler()
      bootstrapped = false
    }
  }, [])

  return null
}
