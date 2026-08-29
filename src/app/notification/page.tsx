"use client"

import { useState, useEffect, useCallback } from "react"
import { db, type Notification } from "@/lib/db"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { NotificationDetail } from "@/components/notification/notification-detail"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock } from "lucide-react"

const CURRENT_USER = "峰岚"

const statusTabs = [
  { value: "all", label: "全部" },
  { value: "unread", label: "未读" },
  { value: "read", label: "已读" },
]

const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  todo: { label: "待办通知", variant: "default" },
  system: { label: "系统通知", variant: "destructive" },
  module: { label: "模块通知", variant: "secondary" },
}

const moduleConfig: Record<string, string> = {
  "todo": "今日待办",
  "benchmark": "对标拆解",
  "topic": "选题库",
  "production": "内容生产流程",
  "publish": "制作发布",
  "dashboard": "数据追踪",
  "review": "复盘记录",
  "flash-thought": "闪念池",
  "inspiration": "灵感记录",
  "ai-module": "AI 模块",
  "system": "系统通知",
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)
  const [activeStatus, setActiveStatus] = useState("all")
  const [activeType, setActiveType] = useState("all")
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    const all = await db.notifications
      .where("receiver").equals(CURRENT_USER)
      .sortBy("createdAt")
    setNotifications(all.reverse())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  function handleClickNotification(notification: Notification) {
    setDetailNotification(notification)
    setDetailOpen(true)
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open)
    if (!open) loadNotifications()
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeStatus !== "all" && n.status !== activeStatus) return false
    if (activeType !== "all" && n.type !== activeType) return false
    return true
  })

  return (
    <>
      {/* Sticky 头部 */}
      <PageHeader
        title="消息通知"
        description="所有通知汇总在此，三态流转驱动处理节奏"
        actions={
          <Tabs value={activeType} onValueChange={(v) => setActiveType(v)}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="todo">待办</TabsTrigger>
              <TabsTrigger value="system">系统</TabsTrigger>
              <TabsTrigger value="module">模块</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        className="md:px-6 lg:px-8"
      >
        {/* 筛选栏 - 状态 */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusTabs.map(tab => (
            <Button
              key={tab.value}
              variant={activeStatus === tab.value ? "default" : "ghost"}
              size="xs"
              onClick={() => setActiveStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {/* 内容区 */}
      <div className="px-5 md:px-6 lg:px-8 pt-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {showSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 bg-transparent shadow-none border border-border">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-2.5 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                </div>
                <Skeleton className="h-4 w-3/4 mt-2" />
              </Card>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">
              {activeStatus !== "all" || activeType !== "all" ? "没有匹配的消息" : "暂无消息"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeStatus !== "all" || activeType !== "all" ? "试试调整筛选条件" : "有新消息时会在这里显示"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleClickNotification(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <NotificationDetail
        notification={detailNotification}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}


function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const isHandled = notification.status === "handled"
  const isUnread = notification.status === "unread"

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-transparent shadow-none border border-border ${isHandled ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {isUnread ? (
          <span className="mt-1.5 size-2.5 rounded-full bg-primary flex-shrink-0" />
        ) : (
          <div className="w-2.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={typeConfig[notification.type].variant} className="text-xs">
              {typeConfig[notification.type].label}
            </Badge>
            <span className={`text-sm font-medium ${isHandled ? "line-through" : ""}`}>
              {notification.title}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.content}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{moduleConfig[notification.relatedModule]}</span>
            <span>·</span>
            <span>{formatRelativeTime(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
