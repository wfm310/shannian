// ========== 通知事件总线 ==========
// 用一个简单的发布-订阅模式，让新建通知后
// 所有关心未读数的组件（铃铛、侧边栏）自动刷新
//
// 为什么不用轮询？
// - 轮询有延迟（30秒才刷新一次）
// - 事件驱动更实时，新建通知立刻刷新
// - 更省性能，没事的时候不查数据库

type Listener = () => void

const listeners = new Set<Listener>()

/**
 * 订阅通知变化事件
 * 返回一个取消订阅的函数
 */
export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener)
  // 返回取消订阅函数
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 触发通知变化事件
 * 新建通知、标记已读、标记已处理时都应该调一下
 */
export function notifyNotificationsChanged() {
  listeners.forEach(listener => listener())
}
