// 导航配置（PC Dock / APP Tabbar 共用）
//
// 图标与顺序对齐 Pixso 画板「PC · 对标拆解列表 1920×HUG」的 Dock（40:279）
// 路由清单以「项目实际存在的页面」为准，避免指向不存在的路由造成 404。
//
// 项目现有页面（src/app 下的目录）：
//   /  /benchmark  /dashboard  /flash-thought  /inspiration  /knowledge-base
//   /notification  /produce-flow  /publish  /qa-collect  /review
//   /script-template  /todo  /topic-library

import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  CheckSquare,
  Zap,
  Target,
  Lightbulb,
  FolderOpen,
  Film,
  Send,
  MoreHorizontal,
  BarChart3,
  ClipboardCheck,
  Network,
  HelpCircle,
  FileText,
  Bell,
} from "lucide-react"

export interface NavItem {
  /** 显示名（与 Pixso 画板文案一致） */
  label: string
  /** 路由 */
  href: string
  icon: LucideIcon
}

/** 主导航（Dock 上半区，8 项） */
export const MAIN_NAV: NavItem[] = [
  { label: "首页", href: "/", icon: LayoutDashboard },
  { label: "今日待办", href: "/todo", icon: CheckSquare },
  { label: "闪念池", href: "/flash-thought", icon: Zap },
  { label: "对标拆解", href: "/benchmark", icon: Target },
  { label: "灵感记录", href: "/inspiration", icon: Lightbulb },
  { label: "选题库", href: "/topic-library", icon: FolderOpen },
  { label: "内容生产", href: "/produce-flow", icon: Film },
  { label: "制作发布", href: "/publish", icon: Send },
]

/** 「更多」里的次级模块（5 项） */
export const MORE_NAV: NavItem[] = [
  { label: "数据追踪", href: "/dashboard", icon: BarChart3 },
  { label: "复盘记录", href: "/review", icon: ClipboardCheck },
  { label: "知识图谱", href: "/knowledge-base", icon: Network },
  { label: "问答收集", href: "/qa-collect", icon: HelpCircle },
  { label: "脚本框架", href: "/script-template", icon: FileText },
]

/** 消息通知入口（Topbar 铃铛与 Dock 均可引用） */
export const NOTIFICATION_NAV: NavItem = {
  label: "消息通知",
  href: "/notification",
  icon: Bell,
}

/** 供「更多」判断：当前路由是否属于次级模块 */
export function isMoreActive(pathname: string): boolean {
  return MORE_NAV.some((item) => pathname.startsWith(item.href))
}

export { MoreHorizontal }
