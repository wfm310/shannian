"use client"

import { useEffect, useCallback } from "react"

/**
 * 全局自动保存 hook
 *
 * 功能：
 * 1. 当表单数据变化时，自动保存到 localStorage
 * 2. 提供加载草稿的方法（打开表单时恢复上次未完成的内容）
 * 3. 提供清除草稿的方法（创建成功后清除）
 *
 * 使用方式：
 * const { loadDraft, clearDraft } = useAutoSave("todo-form-draft", formData, open)
 *
 * // 打开表单时恢复草稿
 * useEffect(() => {
 *   if (open) {
 *     const draft = loadDraft()
 *     if (draft) { setTitle(draft.title) ... }
 *   }
 * }, [open])
 *
 * // 创建成功后清除
 * clearDraft()
 *
 * @param key - localStorage 的 key，每个表单用不同的 key
 * @param data - 要自动保存的数据（每次变化时自动触发保存）
 * @param enabled - 是否启用自动保存（默认 true，可以在弹窗关闭时设为 false）
 */
export function useAutoSave<T>(
  key: string,
  data: T,
  enabled: boolean = true
) {
  // ----- 自动保存 -----
  // 每当 data 变化时，自动保存到 localStorage
  useEffect(() => {
    if (!enabled) return
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // localStorage 满了或不可用时静默失败
    }
  }, [key, data, enabled])

  // ----- 加载草稿 -----
  // 从 localStorage 读取之前保存的草稿数据
  const loadDraft = useCallback((): T | null => {
    try {
      const str = localStorage.getItem(key)
      if (!str) return null
      return JSON.parse(str) as T
    } catch {
      return null
    }
  }, [key])

  // ----- 清除草稿 -----
  // 创建成功后调用，清除 localStorage 中的草稿
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // 静默失败
    }
  }, [key])

  return { loadDraft, clearDraft }
}
