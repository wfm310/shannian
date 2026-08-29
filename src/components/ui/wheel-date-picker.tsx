"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface WheelDatePickerProps {
  value?: string         // ISO 日期字符串
  onChange?: (date: string) => void
  className?: string
}

/**
 * iOS 风格滚轮日期选择器
 * 三列：年、月、日，惯性滚动 + 居中对齐
 */
export function WheelDatePicker({ value, onChange, className }: WheelDatePickerProps) {
  const initialDate = value ? new Date(value) : new Date()

  const years = Array.from({ length: 20 }, (_, i) => initialDate.getFullYear() - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate())

  // 获取某月的天数
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // 月份变化时修正日期
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth)
    }
  }, [selectedYear, selectedMonth, daysInMonth, selectedDay])

  // 回调父组件
  useEffect(() => {
    const date = new Date(selectedYear, selectedMonth - 1, selectedDay)
    onChange?.(date.toISOString())
  }, [selectedYear, selectedMonth, selectedDay, onChange])

  return (
    <div className={cn("flex h-56 relative", className)}>
      {/* 中间高亮遮罩 */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-9 border-y border-border/50 pointer-events-none z-10" />

      {/* 渐变遮罩（上下淡出） */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

      {/* 年列 */}
      <WheelColumn
        items={years.map(y => ({ value: y, label: `${y}年` }))}
        value={selectedYear}
        onChange={setSelectedYear}
      />

      {/* 月列 */}
      <WheelColumn
        items={months.map(m => ({ value: m, label: `${m}月` }))}
        value={selectedMonth}
        onChange={setSelectedMonth}
      />

      {/* 日列 */}
      <WheelColumn
        items={days.map(d => ({ value: d, label: `${d}日` }))}
        value={selectedDay}
        onChange={setSelectedDay}
      />
    </div>
  )
}

// ============ 单列滚轮 ============
interface WheelColumnProps {
  items: { value: number; label: string }[]
  value: number
  onChange: (val: number) => void
}

const ITEM_HEIGHT = 36 // 每项高度

function WheelColumn({ items, value, onChange }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  const selectedIndex = items.findIndex(i => i.value === value)

  // 滚动到指定索引
  const scrollToIndex = (index: number, smooth = true) => {
    if (!containerRef.current) return
    const target = index * ITEM_HEIGHT
    containerRef.current.scrollTo({
      top: target,
      behavior: smooth ? "smooth" : "auto",
    })
  }

  // 初始定位
  useEffect(() => {
    scrollToIndex(selectedIndex, false)
  }, [])

  // 外部值变化时同步滚动
  useEffect(() => {
    if (!isScrolling.current) {
      scrollToIndex(selectedIndex)
    }
  }, [selectedIndex])

  // 滚动结束后对齐到最近项
  const handleScroll = () => {
    if (!containerRef.current) return
    isScrolling.current = true

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      const index = Math.round(scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))

      scrollToIndex(clampedIndex)
      onChange(items[clampedIndex].value)
      isScrolling.current = false
    }, 100)
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto touch-scroll snap-y snap-mandatory"
      onScroll={handleScroll}
      style={{ scrollbarWidth: "none" }}
    >
      {/* 顶部留白 */}
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }} />

      {items.map((item) => (
        <div
          key={item.value}
          className={cn(
            "h-9 flex items-center justify-center text-base transition-all snap-center",
            item.value === value
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
          )}
          style={{ height: ITEM_HEIGHT }}
        >
          {item.label}
        </div>
      ))}

      {/* 底部留白 */}
      <div style={{ height: `calc(50% - ${ITEM_HEIGHT / 2}px)` }} />
    </div>
  )
}
