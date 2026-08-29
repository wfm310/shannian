"use client"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsDesktop } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { Bell, Settings, LogOut, ChevronRight, CheckSquare, BarChart, Workflow, Info } from "lucide-react"

type NotificationType = "task" | "data" | "workflow" | "system"

interface Notification {
  id: string
  type: NotificationType
  title: string
  summary: string
  time: string
  read: boolean
  relatedModule?: string
  relatedId?: string
}

interface UserInfo {
  name: string
  email: string
  todoCount: number
  produceCount: number
  publishCount: number
}

interface UserAvatarProps {
  unreadCount?: number
  notifications?: Notification[]
  userInfo?: UserInfo
  onNotificationClick?: (notification: Notification) => void
  onViewAllNotifications?: () => void
  onSettingsClick?: () => void
  onLogout?: () => void
}

const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  task: CheckSquare,
  data: BarChart,
  workflow: Workflow,
  system: Info,
}

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  task: "text-ios-blue",
  data: "text-ios-green",
  workflow: "text-ios-amber",
  system: "text-muted-foreground",
}

export function UserAvatar({
  unreadCount = 0,
  notifications = [],
  userInfo,
  onNotificationClick,
  onViewAllNotifications,
  onSettingsClick,
  onLogout,
}: UserAvatarProps) {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleAvatarClick = () => setOpen(true)

  const recentUnread = notifications.filter(n => !n.read).slice(0, 3)

  const handleNotificationClick = (n: Notification) => {
    onNotificationClick?.(n)
    setOpen(false)
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setOpen(false)
    onLogout?.()
  }

  const avatarContent = (
    <button
      onClick={handleAvatarClick}
      className="relative size-8 rounded-full bg-secondary flex items-center justify-center p-1.5 active:opacity-60 transition-opacity"
      aria-label={unreadCount > 0 ? `${unreadCount} 条未读通知` : "用户菜单"}
    >
      <span className="text-sm font-medium text-muted-foreground">
        {userInfo?.name?.[0] ?? "U"}
      </span>
      {unreadCount > 0 && (
        <>
          {unreadCount > 99 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-[10px] text-white font-medium flex items-center justify-center">
              99+
            </span>
          ) : unreadCount > 3 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-[10px] text-white font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#FF3B30]" />
          )}
        </>
      )}
    </button>
  )

  const sheetContent = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          isDesktop ? "w-80" : "max-h-[85vh]",
          "flex flex-col p-0"
        )}
        showCloseButton={false}
      >
        {showLogoutConfirm ? (
          <div className="flex flex-col items-center pt-8 px-5 pb-6">
            <p className="text-[17px] font-medium text-foreground mb-1">退出登录</p>
            <p className="text-[13px] text-muted-foreground mb-6 text-center">确定要退出当前账号吗？</p>
            <div className="w-full space-y-2.5">
              <button
                onClick={handleLogout}
                className="w-full h-11 rounded-[10px] bg-[#FF3B30] text-white text-[17px] font-medium active:opacity-60 transition-opacity"
              >
                退出登录
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full h-11 rounded-[10px] bg-secondary text-foreground text-[17px] font-medium active:opacity-60 transition-opacity"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-foreground/15" />
            </div>

            <div className="flex-1 overflow-y-auto touch-scroll">
              <div className="px-5 pt-2 pb-3">
                <h2 className="text-[13px] font-normal uppercase tracking-wider text-muted-foreground mb-3">
                  通知
                </h2>
                <div className="rounded-[18px] bg-secondary/15 overflow-hidden">
                  {recentUnread.length > 0 ? (
                    <>
                      {recentUnread.map((n, i) => {
                        const Icon = NOTIFICATION_ICONS[n.type]
                        const colorClass = NOTIFICATION_COLORS[n.type]
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "w-full flex items-start gap-3 p-3.5 text-left active:bg-secondary/40 transition-colors",
                              i < recentUnread.length - 1 && "border-b border-border/30"
                            )}
                          >
                            <Icon className={cn("size-5 shrink-0 mt-0.5", colorClass)} strokeWidth={1.5} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-medium text-foreground truncate">{n.title}</p>
                              <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">{n.summary}</p>
                              <p className="text-[12px] text-muted-foreground/60 mt-1">{n.time}</p>
                            </div>
                            <span className="size-2 rounded-full bg-[#007AFF] shrink-0 mt-1.5" />
                          </button>
                        )
                      })}
                      <button
                        onClick={() => { onViewAllNotifications?.(); setOpen(false) }}
                        className="w-full p-3.5 text-center text-[15px] text-ios-blue font-medium active:bg-secondary/40 transition-colors border-t border-border/30"
                      >
                        查看全部通知
                      </button>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="size-7 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1} />
                      <p className="text-[15px] text-muted-foreground">暂无新通知</p>
                    </div>
                  )}
                </div>
              </div>

              {userInfo && (
                <div className="px-5 pb-3">
                  <h2 className="text-[13px] font-normal uppercase tracking-wider text-muted-foreground mb-3">
                    账号
                  </h2>
                  <div className="rounded-[18px] bg-secondary/15 overflow-hidden">
                    <div className="p-4 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-lg font-medium text-muted-foreground">
                            {userInfo.name[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[17px] font-semibold text-foreground truncate">{userInfo.name}</p>
                          <p className="text-[13px] text-muted-foreground truncate">{userInfo.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-6 mt-3.5">
                        <div className="flex flex-col">
                          <span className="text-[20px] font-semibold text-foreground tabular-nums">{userInfo.todoCount}</span>
                          <span className="text-[12px] text-muted-foreground">待办</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[20px] font-semibold text-foreground tabular-nums">{userInfo.produceCount}</span>
                          <span className="text-[12px] text-muted-foreground">生产</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[20px] font-semibold text-foreground tabular-nums">{userInfo.publishCount}</span>
                          <span className="text-[12px] text-muted-foreground">发布</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { onSettingsClick?.(); setOpen(false) }}
                      className="w-full flex items-center justify-between p-3.5 active:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="size-5 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-[17px] text-foreground">设置</span>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground/50" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full flex items-center gap-3 p-3.5 active:bg-secondary/40 transition-colors border-t border-border/30"
                    >
                      <LogOut className="size-5 text-[#FF3B30]" strokeWidth={1.5} />
                      <span className="text-[17px] text-[#FF3B30]">退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {avatarContent}
      {sheetContent}
    </>
  )
}
