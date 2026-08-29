"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useVisualViewport } from "@/hooks/use-visual-viewport"

// ========== 移动端底部弹层 ==========
// 从屏幕底部升起的一张卡片，顶部有一条小横杠
// 手指按住小横杠往下滑，卡片跟着走；松手滑够了就关闭，不够就弹回去
//
// 实现说明：
// 显示/隐藏完全由 open 属性驱动 CSS 类名，不使用内部状态
// 这样组件在任何时候渲染出来的结果都只取决于输入，不会出现
// 「渲染中途改状态」导致的加载期异常

interface IosSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  // 弹层打开动画结束后触发（用来让输入框自动获得焦点）
  onOpened?: () => void
}

// 关闭判定阈值：往下滑超过这个距离就关闭
const CLOSE_DISTANCE = 100
// 或者往下甩的速度超过这个值也关闭（单位：像素/毫秒）
const CLOSE_VELOCITY = 0.5
// 动画时长，与下面的 CSS transition 保持一致
const ANIM_MS = 300

export function IosSheet({ open, onOpenChange, children, onOpened }: IosSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragStartTime = useRef(0)
  const isDragging = useRef(false)

  const { keyboardInset } = useVisualViewport()

  // ----- 每次打开时清掉上次拖动残留的内联样式 -----
  // 否则关闭时设置的 translateY(100%) 会覆盖掉类名里的归位样式
  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.style.transform = ""
    }
  }, [open])

  // ----- 升起动画结束后通知外部（此时输入框可以聚焦了）-----
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => onOpened?.(), ANIM_MS)
    return () => clearTimeout(timer)
  }, [open, onOpened])

  // ----- 下滑关闭手势 -----
  // 用 ref 直接改样式，不走 React state
  // 因为手指每移动一像素就触发一次，走 state 会导致疯狂重渲染，滑动会卡
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartTime.current = Date.now()

    const sheet = sheetRef.current
    if (sheet) {
      // 拖动时关掉过渡，否则卡片会「追」着手指走，有延迟感
      sheet.style.transition = "none"
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return

    let delta = e.clientY - dragStartY.current
    // 往上滑（delta 为负）时不让卡片跑上去，做阻尼衰减
    if (delta < 0) delta = -Math.sqrt(-delta) * 2

    const sheet = sheetRef.current
    if (sheet) {
      sheet.style.transform = `translateY(${delta}px)`
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDragging.current) return
    isDragging.current = false

    const sheet = sheetRef.current
    if (!sheet) return

    // 恢复过渡动画，让回弹/离场有流畅感
    sheet.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`

    const delta = e.clientY - dragStartY.current
    const elapsed = Date.now() - dragStartTime.current
    const velocity = elapsed > 0 ? delta / elapsed : 0

    // 满足「滑得够远」或「甩得够快」其中一个，就关闭
    if (delta > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      sheet.style.transform = "translateY(100%)"
      onOpenChange(false)
      return
    }

    // 否则弹回原位
    sheet.style.transform = "translateY(0)"
  }

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* 背景遮罩：点它也能关闭 */}
      <div
        onClick={() => onOpenChange(false)}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 弹层主体 */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-[18px] flex flex-col max-h-[85vh] shadow-2xl ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          // 键盘弹起时，整张卡片上移，保证输入框不被遮住
          paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined,
        }}
      >
        {/* 顶部小横杠：整个区域都是拖拽热区 */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="shrink-0 flex items-center justify-center h-7 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-9 h-1 rounded-full bg-foreground/20" />
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>

        {/* 底部安全区：适配 iPhone 底部小黑条 */}
        <div style={{ height: "env(safe-area-inset-bottom)" }} className="shrink-0" />
      </div>
    </div>
  )
}
