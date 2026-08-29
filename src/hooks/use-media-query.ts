import * as React from "react"
import { DESKTOP_BREAKPOINT } from "@/lib/breakpoints"

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

// 判定「该用桌面界面还是移动端界面」
// 全局外壳 responsive-layout.tsx 用这个 hook 决定布局
// 因此业务组件判断端类型时请统一用它，避免与外壳不一致
export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
}
