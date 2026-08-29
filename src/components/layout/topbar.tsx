'use client'

// ========== 导入区域 ==========
import { Search, Bell } from "lucide-react"                    // 图标
import { SidebarTrigger } from "@/components/ui/sidebar"        // 侧边栏折叠按钮
import { Input } from "@/components/ui/input"                    // 输入框
import { Button } from "@/components/ui/button"                  // 按钮
import { NotificationDropdown } from "@/components/notification/notification-dropdown"
import { ThemeToggle } from "@/components/layout/theme-toggle"   // 亮色/暗色切换

// ========== 组件定义 ==========
// Topbar 是顶部栏组件
// 包含：侧边栏开关按钮、搜索框、通知按钮
// 这个组件在 layout.tsx 中使用，所有页面都能看到它
export function Topbar() {
  return (
    // <header> 是 HTML5 语义标签，表示页面顶部区域
    // className 含义：
    //   flex            → 弹性布局，子元素水平排列
    //   h-16            → 高度 64px，和侧边栏 logo 区一致
    //   items-center    → 垂直居中
    //   justify-between→ 两端对齐
    //   border-b        → 底部边框线
    //   px-4            → 左右内边距 16px
    //   gap-4           → 子元素间距 16px
    //   bg-background   → 背景色（sticky 时不透明）
    <header className="flex h-16 items-center justify-between border-b px-4 gap-4 bg-background">

      {/* === 左侧：侧边栏折叠按钮 + 搜索框 === */}
      {/* flex items-center → 水平排列、垂直居中 */}
      {/* gap-3 → 子元素间距 12px */}
      {/* flex-1 max-w-md → 占满剩余空间，最大宽度 448px */}
      <div className="flex items-center gap-3 flex-1 max-w-md">

        {/* SidebarTrigger：点击折叠/展开侧边栏 */}
        {/* 内部调用 useSidebar().toggleSidebar() */}
        {/* 支持键盘快捷键 Ctrl+B（Mac 是 Cmd+B） */}
        <SidebarTrigger />

        {/* 搜索框区域 */}
        {/* relative → 相对定位（因为搜索图标要绝对定位在输入框里） */}
        <div className="relative flex-1">
          {/* 搜索图标 */}
          {/* absolute → 绝对定位 */}
          {/* left-3 → 距左 12px */}
          {/* top-1/2 -translate-y-1/2 → 垂直居中 */}
          {/* size-4 → 宽高 16px */}
          {/* text-muted-foreground → 灰色 */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

          {/* 输入框 */}
          {/* pl-9 → 左内边距 36px，给搜索图标留空间 */}
          <Input
            type="text"
            placeholder="找找最近的灵感怎么样？"
            className="pl-9"
          />
        </div>
      </div>

      {/* === 右侧：主题切换 + 通知按钮 === */}
      <div className="flex items-center gap-2">
        {/* 亮色/暗色模式切换 */}
        <ThemeToggle />
        {/* 消息通知铃铛下拉 */}
        <NotificationDropdown currentUser="峰岚" />
      </div>
    </header>
  )
}
