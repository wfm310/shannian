"use client"

// ========== 导入区域 ==========
import { useEffect } from "react"
// useRouter → Next.js 路由钩子，用来跳转页面
import { useRouter } from "next/navigation"
// 导入类型
import { type Notification } from "@/lib/db"
// 导入消息中心的标记已读函数
import { markAsRead } from "@/lib/notification"
// shadcn-ui 组件
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
// lucide 图标
import { ExternalLink, Clock } from "lucide-react"


// ========== 类型定义 ==========
// 组件接收的参数
interface NotificationDetailProps {
  notification: Notification | null   // 要查看的通知（null = 不显示）
  open: boolean                       // 弹窗是否打开
  onOpenChange: (open: boolean) => void  // 关闭弹窗的回调
}


// ========== 配置 ==========
// 消息类型中文映射 + Badge 样式
const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  todo: { label: "待办通知", variant: "default" },
  system: { label: "系统通知", variant: "destructive" },
  module: { label: "模块通知", variant: "secondary" },
}

// 状态中文映射 + Badge 样式
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  unread: { label: "未读", variant: "default" },
  read: { label: "已读", variant: "outline" },
  handled: { label: "已处理", variant: "secondary" },
}

// 关联模块中文映射 + 路由映射
// 每个模块对应一个页面路由，点击"前往查看"跳过去
const moduleConfig: Record<string, { label: string; path: string }> = {
  "todo": { label: "今日待办", path: "/todo" },
  "benchmark": { label: "对标拆解", path: "/benchmark" },
  "topic": { label: "选题库", path: "/topic-library" },
  "production": { label: "内容生产流程", path: "/produce-flow" },
  "publish": { label: "制作发布", path: "/publish" },
  "dashboard": { label: "数据追踪", path: "/dashboard" },
  "review": { label: "复盘记录", path: "/review" },
  "flash-thought": { label: "闪念池", path: "/flash-thought" },
  "inspiration": { label: "灵感记录", path: "/inspiration" },
  // AI 模块为后续规划功能，页面尚未开发，暂不跳转（避免访问不存在的路由报 404）
  "ai-module": { label: "AI 模块", path: "" },
  "system": { label: "系统通知", path: "" },
}


// ========== 组件定义 ==========
export function NotificationDetail({ notification, open, onOpenChange }: NotificationDetailProps) {
  // Next.js 路由实例，用来跳转页面
  const router = useRouter()

  // 弹窗打开时，如果消息是未读的，自动标记为已读
  // useEffect → 组件渲染后执行
  // 依赖项 [open, notification] → 这两个变了就重新执行
  useEffect(() => {
    if (open && notification && notification.status === "unread") {
      markAsRead(notification.id!)
    }
  }, [open, notification])

  // 如果没有通知数据，不渲染
  if (!notification) return null

  // 格式化时间戳为可读日期时间
  // 输入：时间戳（毫秒）
  // 输出："2026年08月23日 14:30"
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    const d = date.getDate().toString().padStart(2, "0")
    const h = date.getHours().toString().padStart(2, "0")
    const min = date.getMinutes().toString().padStart(2, "0")
    return `${y}年${m}月${d}日 ${h}:${min}`
  }

  // 获取关联模块的中文名称和路由
  const moduleInfo = moduleConfig[notification.relatedModule] || {
    label: notification.relatedModule,
    path: "",
  }

  // 跳转到关联模块的详情页
  // - 有 relatedId 时，带上 id 参数跳转（目标页面读取 id 自动打开详情）
  // - 没有 relatedId 时，跳转到模块列表页
  function handleGoToModule() {
    if (!moduleInfo.path || !notification) return

    if (notification.relatedId) {
      // 跳转到详情页（带 id 查询参数）
      router.push(`${moduleInfo.path}?id=${notification.relatedId}`)
    } else {
      // 跳转到列表页
      router.push(moduleInfo.path)
    }
    onOpenChange(false)  // 跳转后关闭弹窗
  }

  return (
    // Dialog → 居中弹窗组件
    // open → 是否打开
    // onOpenChange → 打开/关闭状态变化时调用
    <Dialog open={open} onOpenChange={onOpenChange}>

      {/* DialogContent → 弹窗内容容器 */}
      {/* sm:max-w-lg → 在大屏上最大宽度 512px */}
      <DialogContent className="sm:max-w-lg" initialFocus={false}>

        {/* 弹窗头部（标题 + 描述） */}
        <DialogHeader>
          <DialogTitle>{notification.title}</DialogTitle>
        </DialogHeader>

        {/* 类型标签 + 状态标签 */}
        {/* 注意：不能放在 DialogDescription 里，因为它渲染为 <p>，p 里不能放 div */}
        <div className="flex items-center gap-2 -mt-2">
          <Badge variant={typeConfig[notification.type].variant}>
            {typeConfig[notification.type].label}
          </Badge>
          <Badge variant={statusConfig[notification.status].variant}>
            {statusConfig[notification.status].label}
          </Badge>
        </div>

        {/* ===== 通知内容 ===== */}
        <div className="space-y-4 py-2">
          {/* 通知正文 */}
          {/* whitespace-pre-wrap → 保留换行符 */}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {notification.content}
          </p>

          {/* 通知信息列表 */}
          <div className="space-y-2 pt-2 border-t">
            {/* 关联模块 */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">关联模块</span>
              <span className="font-medium">{moduleInfo.label}</span>
            </div>

            {/* 接收人 */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">接收人</span>
              <span className="font-medium">{notification.receiver}</span>
            </div>

            {/* 通知时间 */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">通知时间</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatDateTime(notification.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* ===== 底部操作按钮 ===== */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          {/* 关闭按钮 */}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>

          {/* 前往查看按钮（系统通知没有关联页面，不显示） */}
          {moduleInfo.path && (
            <Button onClick={handleGoToModule}>
              <ExternalLink className="size-4" />
              前往查看
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}