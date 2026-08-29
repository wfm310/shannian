import * as React from "react"
import { MOBILE_BREAKPOINT } from "@/lib/breakpoints"

// 注意：这个 hook 判定的是「严格意义的手机」（宽度 < 768）
// 如果你要判断「该用移动端界面还是桌面界面」，请用 useIsDesktop()
// 详细原因见 src/lib/breakpoints.ts 的注释
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // 首次渲染后同步一次（放在回调里统一处理，与 use-media-query 保持一致）
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
