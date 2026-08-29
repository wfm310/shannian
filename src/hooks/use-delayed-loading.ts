import { useState, useEffect } from "react"

/**
 * 延迟显示 loading 状态
 * 如果数据在 delay 时间内回来，就不显示骨架屏，避免闪烁
 * 适用于本地 IndexedDB 等快速加载场景
 *
 * @param isLoading - 实际加载状态
 * @param delay - 延迟时间，默认 150ms
 */
export function useDelayedLoading(isLoading: boolean, delay = 150) {
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoading(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      setShowLoading(false)
    }
  }, [isLoading, delay])

  return showLoading
}
