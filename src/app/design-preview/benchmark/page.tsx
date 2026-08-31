"use client"

// ========== 设计还原预览：对标拆解列表（PC）==========
//
// 用途：对照 Pixso 画板「PC · 对标拆解列表 1920×HUG」（40:278）验收视觉。
// 这是一个独立路由，不改动现有 /benchmark 页面，便于新旧对比。
// 验收通过后，再将 L-shell 与新组件接入正式页面。

import { toast } from "sonner"

import { PcShell } from "@/components/shell/pc-shell"
import { BenchmarkListView } from "@/components/business/benchmark-list-view"

export default function BenchmarkPreviewPage() {
  return (
    <PcShell
      searchPlaceholder="搜索对标、选题、灵感…"
      onQuickNote={() => toast.info("快记：待接入")}
    >
      <BenchmarkListView
        onCreate={() => toast.info("新增对标：待接入")}
        onSelect={(id) => toast.info(`打开对标 ${id.slice(0, 8)}：详情待接入`)}
        onMore={(id) => toast.info(`更多操作 ${id.slice(0, 8)}：待接入`)}
      />
    </PcShell>
  )
}
