'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  Home,
  SquareCheckBig,
  Bell,
  Zap,
  Plus,
  Library,
  MessageSquare,
  PenLine,
  Layers2,
  ArrowRightLeft,
  Send,
  ChartNoAxesColumn,
  SlidersHorizontal,
  Network,
  Lightbulb,
} from "lucide-react"

const pages = [
  { title: "首页", icon: Home, url: "/" },
  { title: "待办", icon: SquareCheckBig, url: "/todo" },
  { title: "闪念", icon: Zap, url: "/flash-thought" },
  { title: "对标", icon: Plus, url: "/benchmark" },
  { title: "选题", icon: Library, url: "/topic-library" },
  { title: "问答", icon: MessageSquare, url: "/qa-collect" },
  { title: "灵感", icon: PenLine, url: "/inspiration" },
  { title: "脚本", icon: Layers2, url: "/script-template" },
  { title: "生产", icon: ArrowRightLeft, url: "/produce-flow" },
  { title: "发布", icon: Send, url: "/publish" },
  { title: "数据", icon: ChartNoAxesColumn, url: "/dashboard" },
  { title: "复盘", icon: SlidersHorizontal, url: "/review" },
  { title: "知识", icon: Network, url: "/knowledge-base" },
] as const

const PILL_INSET = 6 // 药丸距离 Tab 左右边缘的距离

export function MobileTabBar() {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 80 })
  const [pillVisible, setPillVisible] = useState(false)

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/"
    if (url === "/todo") return pathname === "/todo"
    return pathname.startsWith(url)
  }

  const activeIndex = pages.findIndex(p => isActive(p.url))

  // 用 useLayoutEffect 在浏览器绘制前就计算好位置，避免闪烁
  useLayoutEffect(() => {
    if (activeRef.current && tabsRef.current) {
      const tabEl = activeRef.current
      const tabsEl = tabsRef.current
      const tabRect = tabEl.getBoundingClientRect()
      const tabsRect = tabsEl.getBoundingClientRect()

      const left = tabRect.left - tabsRect.left + PILL_INSET
      const width = tabRect.width - PILL_INSET * 2

      setPillStyle({ left, width })
      setPillVisible(true)
    }
  }, [activeIndex])

  // 滚动到活跃 Tab
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      })
    }
  }, [pathname])

  return (
    <nav className="fixed bottom-5 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] px-5">
      <div className="flex items-center gap-2">
        {/* 左侧：药丸形 Tab 容器 */}
        <div className="flex-1 bg-background/80 backdrop-blur-xl rounded-full h-[60px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
          <div
            ref={scrollRef}
            className="h-full overflow-x-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <div ref={tabsRef} className="relative flex items-stretch h-full w-max px-1">
              {/* 滑动药丸指示器 */}
              <span
                className="absolute top-1/2 -translate-y-1/2 h-[calc(100%-16px)] bg-secondary/80 rounded-full"
                style={{
                  left: pillStyle.left,
                  width: pillStyle.width,
                  opacity: pillVisible ? 1 : 0,
                  transition:
                    "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out",
                }}
              />

              {pages.map((page, index) => {
                const active = index === activeIndex
                const PageIcon = page.icon
                return (
                  <Link
                    key={page.url}
                    href={page.url}
                    ref={active ? activeRef : undefined}
                    className="relative flex flex-col items-center justify-center gap-0.5 min-w-[92px] shrink-0 h-full transition-colors duration-200"
                    style={{
                      color: active ? "var(--foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    <PageIcon
                      className="size-[22px] relative z-10 transition-transform duration-200"
                      strokeWidth={active ? 2.5 : 2}
                      style={{
                        transform: active ? "scale(1.05)" : "scale(1)",
                      }}
                    />
                    <span
                      className={`text-[10px] relative z-10 transition-all duration-200 ${
                        active ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {page.title}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右侧：闪念快记圆形按钮 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("quick-flash-open"))}
          className="shrink-0 flex items-center justify-center size-[60px] bg-background/80 backdrop-blur-xl rounded-full text-muted-foreground active:text-foreground active:scale-95 transition-all duration-150 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <Lightbulb className="size-[24px]" strokeWidth={2} />
        </button>
      </div>
    </nav>
  )
}
