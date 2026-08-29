"use client"

// ========== 导入区域 ==========
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { db, type Notification } from "@/lib/db"
import { getUnreadCount } from "@/lib/notification"
import { subscribeNotifications } from "@/lib/notification-events"
import { NotificationDetail } from "./notification-detail"
// shadcn-ui 组件
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// lucide 图标
import { Bell } from "lucide-react"


// ========== 类型定义 ==========
interface NotificationDropdownProps {
  currentUser: string   // 当前登录用户
}


// ========== 组件定义 ==========
export function NotificationDropdown({ currentUser }: NotificationDropdownProps) {
  // Next.js 路由实例
  const router = useRouter()

  // 未读消息数量（给小红点用）
  const [unreadCount, setUnreadCount] = useState(0)

  // 下拉里的消息列表（最新 5 条未读）
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 详情弹窗状态
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // 下拉菜单是否打开
  const [open, setOpen] = useState(false)


  // ----- 加载未读数量 -----
  // useCallback → 缓存函数，避免每次渲染重新创建
  const loadUnreadCount = useCallback(async () => {
    const count = await getUnreadCount(currentUser)
    setUnreadCount(count)
  }, [currentUser])


  // ----- 加载最新 5 条未读 -----
  const loadNotifications = useCallback(async () => {
    const all = await db.notifications
      .where("receiver").equals(currentUser)
      .sortBy("createdAt")

    // 只取未读的，并且按时间倒序（最新在上），取前 5 条
    const unreadList = all
      .filter(n => n.status === "unread")
      .reverse()
      .slice(0, 5)

    setNotifications(unreadList)
  }, [currentUser])


  // 下拉打开时刷新消息列表和未读数
  useEffect(() => {
    if (open) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [open, loadNotifications, loadUnreadCount])

  // 页面加载时先加载未读数，并订阅通知变化事件
  // 有新通知/已读状态变化时自动刷新（事件驱动，比轮询实时）
  useEffect(() => {
    loadUnreadCount()
    // 订阅通知变化事件，有新消息立刻刷新
    const unsubscribe = subscribeNotifications(() => {
      loadUnreadCount()
      if (open) {
        loadNotifications()  // 下拉打开时也刷新列表
      }
    })
    return unsubscribe
  }, [loadUnreadCount, loadNotifications, open])


  // ----- 点击单条消息 -----
  // 打开详情弹窗，关闭下拉
  function handleClickNotification(notification: Notification) {
    setDetailNotification(notification)
    setDetailOpen(true)
    setOpen(false)           // 关闭下拉
    loadUnreadCount()        // 刷新未读数
  }


  // ----- 跳转到消息页面 -----
  function handleGoToAll() {
    router.push("/notification")
    setOpen(false)
  }


  // 详情关闭后刷新未读数和列表
  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      loadUnreadCount()
      loadNotifications()
    }
  }


  // 格式化相对时间（如"刚刚"、"5分钟前"、"2小时前"）
  function formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)    // 60*1000
    const hours = Math.floor(diff / 3600000)     // 60*60*1000
    const days = Math.floor(diff / 86400000)     // 24*60*60*1000

    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  return (
    <>
      {/* ===== 下拉菜单 ===== */}
      {/* DropdownMenu → 下拉菜单容器 */}
      <DropdownMenu open={open} onOpenChange={setOpen}>

        {/* 触发按钮：铃铛图标 + 小红点 */}
        {/* DropdownMenuTrigger → 下拉触发器，本身就是 button 元素 */}
        {/* 不用再包 Button 组件，否则会变成 button 套 button（HTML 不允许） */}
        {/* size-9 → 宽高 36px，和 size="icon" 的 Button 一样大 */}
        {/* rounded-xl → 圆角和 Button 一致 */}
        {/* inline-flex items-center justify-center → 内容居中 */}
        {/* hover:bg-accent → 悬停背景色，和 Button ghost 一致 */}
        <DropdownMenuTrigger
          className="relative inline-flex items-center justify-center size-9 rounded-xl hover:bg-accent transition-colors"
        >
          <Bell className="size-4" />

          {/* 未读消息小红点（有未读时显示） */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </DropdownMenuTrigger>

        {/* 下拉内容 */}
        {/* align="end" → 右对齐（跟按钮右边对齐） */}
        {/* w-80 → 宽度 320px */}
        <DropdownMenuContent align="end" className="w-80">
          {/* 消息列表分组（DropdownMenuLabel 必须在 DropdownMenuGroup 里） */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>消息通知</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} 条未读
                </Badge>
              )}
            </DropdownMenuLabel>

            {/* 消息列表 */}
            {notifications.length === 0 ? (
              // 没有未读消息时显示空状态
              <div className="py-8 text-center text-sm text-muted-foreground px-2">
                暂无未读消息
              </div>
            ) : (
              // 遍历消息列表，每条渲染一个 DropdownMenuItem
              notifications.map(n => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className="cursor-pointer p-3 flex-col items-start gap-1"
                >
                  {/* 第一行：未读圆点 + 标题 */}
                  <div className="w-full flex items-center gap-2">
                    {/* 未读小圆点（蓝色） */}
                    <span className="size-2 rounded-full bg-blue-500 flex-shrink-0" />
                    {/* 标题（truncate → 超出省略号） */}
                    <span className="font-medium text-sm truncate flex-1">{n.title}</span>
                  </div>
                  {/* 第二行：内容摘要 + 时间 */}
                  <div className="w-full pl-4 text-xs text-muted-foreground truncate">
                    {n.content} · {formatRelativeTime(n.createdAt)}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>

          {/* 分隔线 */}
          <DropdownMenuSeparator />

          {/* 底部：查看全部按钮 */}
          <div className="p-2">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={handleGoToAll}
            >
              查看全部消息
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ===== 详情弹窗 ===== */}
      <NotificationDetail
        notification={detailNotification}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}