"use client"

// ========== Sonner Toast 提供者 ==========
// 放在根布局里，所有页面都能弹 toast
// 必须是 client component，因为 sonner 的 Toaster 用了 React hooks
import { Toaster } from "sonner"

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      duration={4000}
    />
  )
}
