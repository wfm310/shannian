"use client"

import { useEffect, useState } from "react"

// ========== 键盘高度探测 hook ==========
// 手机上打字时，键盘会弹起来遮住屏幕下半部分
// 这个 hook 的作用：算出键盘当前挡住了多少像素，好让输入框往上躲
//
// 为什么不用 window.innerHeight？
// 因为 iOS Safari 上键盘弹起时，window 的大小根本不变（不触发 resize 事件）
// 只有 window.visualViewport 能真实反映「用户当前能看到的区域」
// visualViewport.height = 屏幕总高 - 键盘高度
// 所以：键盘高度 = 屏幕总高 - 可视区高度 - 可视区顶部偏移

export function useVisualViewport() {
  // 键盘占据的高度（像素）。0 表示键盘没弹起
  const [keyboardInset, setKeyboardInset] = useState(0)

  useEffect(() => {
    // 服务端渲染时没有 window，直接跳过
    // 某些老浏览器也不支持 visualViewport，同样跳过
    if (typeof window === "undefined" || !window.visualViewport) return

    function measure() {
      const vv = window.visualViewport
      if (!vv) return

      // window.innerHeight 是屏幕总高度（含被键盘遮住的部分）
      // vv.height 是用户当前真正能看到的高度
      // vv.offsetTop 是可视区相对屏幕顶部的偏移（页面被键盘顶上去时会有值）
      const inset = window.innerHeight - vv.height - vv.offsetTop

      // 算出来可能是负数（比如地址栏收缩导致的误差），统一兜底为 0
      // 另外小于 60px 的波动不算键盘（通常是地址栏收缩），忽略掉
      setKeyboardInset(inset > 60 ? inset : 0)
    }

    measure()

    // 键盘弹起/收起会触发 resize，页面被顶起会触发 scroll
    // 两个都要监听，缺一个都会导致某些机型上算不准
    window.visualViewport.addEventListener("resize", measure)
    window.visualViewport.addEventListener("scroll", measure)

    return () => {
      window.visualViewport?.removeEventListener("resize", measure)
      window.visualViewport?.removeEventListener("scroll", measure)
    }
  }, [])

  return {
    keyboardInset,
    // 键盘是否处于弹起状态
    isKeyboardOpen: keyboardInset > 0,
  }
}
