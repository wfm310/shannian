// ========== 消息中心 API ==========
// 这是一个统一的发通知工具，所有模块都调它来发消息
// 好处：1. 代码复用  2. 格式统一  3. 以后要改只改一个地方

// 导入数据库和类型
import { db, type NotificationType, type RelatedModule } from "./db"
import { newId, newSyncFields } from "./id"

// 导入 toast 提示（项目已预装 sonner）
import { toast } from "sonner"

// 导入通知事件总线（新建/更新通知时通知所有组件刷新）
import { notifyNotificationsChanged } from "./notification-events"


// ========== 发送通知的函数 ==========
// 调用后自动做两件事：
// 1. 把通知存到数据库
// 2. 弹出 toast 提示（右上角）
//
// 参数说明：
// - type: 通知类型（todo / system / module）
// - title: 通知标题
// - content: 通知内容
// - relatedModule: 关联模块
// - relatedId: 关联记录 ID（可选，系统通知没有）
// - receiver: 接收人（用户昵称）
// - showToast: 是否弹 toast（默认 true）
export async function sendNotification(params: {
  type: NotificationType
  title: string
  content: string
  relatedModule: RelatedModule
  relatedId?: string
  receiver: string
  showToast?: boolean
}) {
  // 1. 存到数据库
  const id = newId()
  await db.notifications.add({
    id,
    title: params.title,
    type: params.type,
    content: params.content,
    relatedModule: params.relatedModule,
    relatedId: params.relatedId ?? null,
    receiver: params.receiver,
    status: "unread",         // 新通知默认未读
    createdAt: Date.now(),    // 记录当前时间
    ...newSyncFields(),
  })

  // 2. 弹 toast 提示（默认弹）
  if (params.showToast !== false) {
    toast(params.title, {
      description: params.content,
      duration: 4000,         // 4 秒后自动消失
    })
  }

  // 3. 触发事件，通知所有组件刷新未读数
  notifyNotificationsChanged()

  return id
}


// ========== 标记为已读 ==========
// 用户点击消息后调用，把状态从 unread 改成 read
export async function markAsRead(id: string) {
  await db.notifications.update(id, { status: "read" })
  // 状态变了，通知组件刷新
  notifyNotificationsChanged()
}


// ========== 标记为已处理 ==========
// 关联模块的记录完成时调用，系统自动标记
// 比如任务完成了，对应的待办通知自动变成"已处理"
export async function markAsHandled(
  relatedModule: RelatedModule,
  relatedId: string
) {
  // 找到对应模块和 ID 的所有通知，标记为已处理
  const notifications = await db.notifications
    .where("relatedModule").equals(relatedModule)
    .toArray()

  for (const n of notifications) {
    if (n.relatedId === relatedId && n.status !== "handled") {
      await db.notifications.update(n.id!, { status: "handled" })
    }
  }
  // 状态变了，通知组件刷新
  notifyNotificationsChanged()
}


// ========== 获取未读数量 ==========
// 给顶栏铃铛显示小红点数字用
export async function getUnreadCount(receiver: string): Promise<number> {
  const all = await db.notifications
    .where("receiver").equals(receiver)
    .toArray()
  return all.filter(n => n.status === "unread").length
}