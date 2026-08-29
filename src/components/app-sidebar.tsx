'use client'

// ========== 导入区域 ==========
// shadcn-ui 侧边栏组件（全部预装，不需要安装）
import {
  Sidebar,               // 侧边栏容器
  SidebarHeader,          // 侧边栏顶部（放 logo）
  SidebarContent,         // 侧边栏内容区（放菜单）
  SidebarFooter,          // 侧边栏底部
  SidebarGroup,           // 菜单分组
  SidebarGroupLabel,     // 分组标题
  SidebarGroupContent,    // 分组内容
  SidebarMenu,            // 菜单列表
  SidebarMenuItem,        // 菜单项
  SidebarMenuButton,      // 菜单按钮
} from "@/components/ui/sidebar"

// shadcn-ui 头像组件
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// shadcn-ui Tooltip 组件（折叠时悬停显示文字）
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// lucide-react 图标库（项目已预装）
import {
  SquareCheckBig,    // 今日待办
  Bell,              // 消息通知
  Zap,               // 闪念池
  Plus,              // 对标拆解
  Library,           // 选题库
  MessageSquare,     // 问答收集
  PenLine,           // 灵感记录
  Layers2,           // 脚本框架库
  ArrowRightLeft,    // 内容生产流程
  Send,              // 制作发布
  ChartNoAxesColumn, // 数据追踪
  SlidersHorizontal, // 复盘记录
  Network,           // 大脑知识库
} from "lucide-react"

// Next.js 客户端路由组件（用于菜单跳转，不刷新页面）
import Link from "next/link"

// React hooks
import { useState, useEffect } from "react"

// 未读消息数 API
import { getUnreadCount } from "@/lib/notification"
// 通知事件总线（实时刷新未读数）
import { subscribeNotifications } from "@/lib/notification-events"

// 当前用户（和其他模块保持一致）
const CURRENT_USER = "峰岚"


// ========== 菜单分组配置 ==========
// 这是侧边栏的核心配置数据
// 后续每做一个新页面，就在对应的分组里加一项即可
const menuGroups = [
  {
    // 第1组：工作台
    label: "工作台",
    items: [
      { title: "今日待办", icon: SquareCheckBig, url: "/todo" },
      { title: "消息通知", icon: Bell, url: "/notification" },
    ]
  },
  {
    // 第2组：灵感素材
    label: "灵感素材",
    items: [
      { title: "闪念池", icon: Zap, url: "/flash-thought" },
      { title: "对标拆解", icon: Plus, url: "/benchmark" },
      { title: "选题库", icon: Library, url: "/topic-library" },
      { title: "问答收集", icon: MessageSquare, url: "/qa-collect" },
      { title: "灵感记录", icon: PenLine, url: "/inspiration" },
    ]
  },
  {
    // 第3组：内容生产
    label: "内容生产",
    items: [
      { title: "脚本框架库", icon: Layers2, url: "/script-template" },
      { title: "内容生产流程", icon: ArrowRightLeft, url: "/produce-flow" },
      { title: "制作发布", icon: Send, url: "/publish" },
    ]
  },
  {
    // 第4组：数据复盘
    label: "数据复盘",
    items: [
      { title: "数据追踪", icon: ChartNoAxesColumn, url: "/dashboard" },
      { title: "复盘记录", icon: SlidersHorizontal, url: "/review" },
    ]
  },
  {
    // 第5组：知识库
    label: "知识库",
    items: [
      { title: "大脑知识库", icon: Network, url: "/knowledge-base" },
    ]
  }
]


// ========== 组件定义 ==========
// AppSidebar 是左侧导航栏组件
// 它读取 menuGroups 配置，渲染出分组导航列表
export function AppSidebar() {
  // 未读消息数（用于侧边栏小红点）
  const [unreadCount, setUnreadCount] = useState(0)

  // 加载未读消息数
  // - 组件挂载时加载一次
  // - 订阅通知变化事件，有新消息/已读变化时自动刷新（事件驱动，比轮询实时）
  useEffect(() => {
    const load = async () => {
      const count = await getUnreadCount(CURRENT_USER)
      setUnreadCount(count)
    }
    load()
    // 订阅通知变化事件
    const unsubscribe = subscribeNotifications(load)
    return unsubscribe
  }, [])

  return (
    <Sidebar collapsible="icon">
      {/* collapsible="icon" → 折叠后显示为图标模式（宽度 3rem） */}
      {/* 官方标准用法，默认是 "offcanvas"（完全滑出） */}

      {/* ===== 顶部 logo 区域 ===== */}
      {/* SidebarHeader 是侧边栏顶部固定区域，不随菜单滚动 */}
      {/* h-16 → 高度 64px，和顶栏高度一致 */}
      {/* 折叠后宽度变为 3rem（48px），logo 水平垂直居中 */}
      <SidebarHeader className="!h-16 !p-0 border-b">
        {/* logo 链接容器：展开时左侧 logo + 文字，折叠时只有 logo 居中 */}
        {/* flex items-center → 垂直居中 */}
        {/* h-16 → 高度 64px，和顶栏一致 */}
        {/* group-data-[collapsible=icon]:justify-center → 折叠时水平居中 */}
        <Link
          href="/"
          className="flex items-center h-16 px-4 gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent/50 transition-colors"
        >
          {/* logo 图片：展开和折叠都是 32px */}
          {/* size-8 → 宽高 32px */}
          {/* flex-shrink-0 → 不被压缩 */}
          <img
            src="/logo.svg"
            alt="闪念 Pro"
            className="size-8 flex-shrink-0"
          />
          {/* logo 文字：折叠后自动隐藏（Sidebar 组件内置） */}
          {/* font-semibold → 半粗体 */}
          {/* group-data-[collapsible=icon]:hidden → 折叠时隐藏 */}
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            闪念 Pro
          </span>
        </Link>
      </SidebarHeader>

      {/* ===== 菜单内容区域 ===== */}
      {/* SidebarContent 是可滚动区域，菜单过多时自动滚动 */}
      <SidebarContent>
        {/* 遍历 menuGroups 数组，每个分组渲染为一个 SidebarGroup */}
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>

            {/* 分组标题（灰色小字，如"工作台"） */}
            {/* 折叠后自动隐藏（上移 + 透明） */}
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

            {/* 分组内容 */}
            <SidebarGroupContent>
              {/* 菜单列表 */}
              <SidebarMenu>
                {/* 遍历分组里的每个菜单项 */}
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>

                    {/* 菜单按钮 */}
                    {/* tooltip → 折叠后悬停显示文字提示 */}
                    {/* render={<Link />} → 渲染为 Link 组件实现客户端路由 */}
                    {/* 图标和文字分开写（同级 children），折叠后图标保留、文字隐藏 */}
                    <SidebarMenuButton
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      {/* 菜单图标：折叠后仍然显示 */}
                      {/* relative → 相对定位，用于放小红点 */}
                      <span className="relative">
                        <item.icon />
                        {/* 消息通知的未读小红点（只在消息通知菜单项显示） */}
                        {/* group-data-[collapsible=icon]: 只在折叠模式显示 */}
                        {item.url === "/notification" && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </span>
                      {/* 菜单文字 + 未读数量：折叠后自动隐藏 */}
                      <span className="flex-1">{item.title}</span>
                      {/* 展开时显示未读数字（只在消息通知菜单项） */}
                      {item.url === "/notification" && unreadCount > 0 && (
                        <span className="ml-auto px-1.5 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ===== 底部区域：用户头像 ===== */}
      {/* SidebarFooter 是侧边栏底部固定区域，不随菜单滚动 */}
      {/* h-16 → 高度 64px，和顶部 logo 区、顶栏对称 */}
      <SidebarFooter className="!h-16 !p-0 border-t">
        {/* 头像容器：展开时头像 + 用户名，折叠时只有头像居中 */}
        {/* flex items-center → 垂直居中 */}
        {/* h-16 → 高度 64px */}
        {/* group-data-[collapsible=icon]:justify-center → 折叠时水平居中 */}
        <Tooltip>
          <TooltipTrigger>
            <div
              className="flex items-center h-16 px-4 gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
            >
              {/* 用户头像：展开和折叠都是 32px */}
              {/* size-8 → 宽高 32px */}
              {/* flex-shrink-0 → 不被压缩 */}
              <Avatar className="size-8 flex-shrink-0">
                <AvatarFallback>SN</AvatarFallback>
              </Avatar>
              {/* 用户信息文字：折叠后隐藏 */}
              {/* group-data-[collapsible=icon]:hidden → 折叠时隐藏 */}
              <span className="group-data-[collapsible=icon]:hidden">
                闪念用户
              </span>
            </div>
          </TooltipTrigger>
          {/* 折叠时悬停显示用户名 */}
          <TooltipContent side="right">闪念用户</TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  )
}
