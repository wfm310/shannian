"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * 页面过渡动画组件
 * 路由切换时页面整体淡入，掩盖骨架屏闪烁
 * 动画曲线：iOS 风格的减速曲线
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [show, setShow] = useState(true)

  useEffect(() => {
    setShow(false)
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShow(true)
      })
    })
    return () => cancelAnimationFrame(timer)
  }, [pathname])

  return (
    <div
      className="transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ opacity: show ? 1 : 0 }}
    >
      {children}
    </div>
  )
}
