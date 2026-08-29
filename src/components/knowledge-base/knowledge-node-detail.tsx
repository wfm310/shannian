'use client'

// ========== 文件作用 ==========
// 知识节点详情面板（居中弹窗）
// 展示节点基本信息、标签、正向链接、反向链接

// ========== 导入区域 ==========
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Link2 } from "lucide-react"
import Link from "next/link"
import type { KnowledgeNode } from "@/lib/db"
import { NODE_TYPE_META, EDGE_TYPE_META } from "@/lib/knowledge-base"
import type { KnowledgeEdge } from "@/lib/db"

// ========== 组件属性 ==========
interface KnowledgeNodeDetailProps {
  node: KnowledgeNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  edges: KnowledgeEdge[]
  allNodes: KnowledgeNode[]
}

// ========== 组件定义 ==========
export function KnowledgeNodeDetail({
  node,
  open,
  onOpenChange,
  edges,
  allNodes,
}: KnowledgeNodeDetailProps) {
  if (!node) return null

  // 找出与当前节点相关的边
  const outEdges = edges.filter((e) => e.sourceNodeId === node.id)
  const inEdges = edges.filter((e) => e.targetNodeId === node.id)

  // 从边找对应的节点
  const findNode = (id: string) => allNodes.find((n) => n.id === id)

  // 跳转到来源模块
  const moduleHref = `/${node.sourceModule}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0" initialFocus={false}>
        {/* 表头 + 摘要：固定不滚动 */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b space-y-2">
          <DialogTitle className="text-base">
            {node.title}
          </DialogTitle>
          <DialogDescription>
            {NODE_TYPE_META[node.nodeType].label} · 来源模块：{node.sourceModule}
          </DialogDescription>
          <p className="text-sm text-muted-foreground leading-relaxed pt-2">
            {node.summary}
          </p>
        </div>

        {/* 中间内容区：可滚动 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {node.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">标签</h3>
              <div className="flex flex-wrap gap-1">
                {node.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {outEdges.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Link2 className="size-4" />
                  正向链接（{outEdges.length}）
                </h3>
                <div className="space-y-2">
                  {outEdges.map((edge) => {
                    const target = findNode(edge.targetNodeId)
                    if (!target) return null
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {target.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {EDGE_TYPE_META[edge.edgeType].label}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {NODE_TYPE_META[target.nodeType].label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {inEdges.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Link2 className="size-4" />
                  反向链接（{inEdges.length}）
                </h3>
                <div className="space-y-2">
                  {inEdges.map((edge) => {
                    const source = findNode(edge.sourceNodeId)
                    if (!source) return null
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {source.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {EDGE_TYPE_META[edge.edgeType].label}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {NODE_TYPE_META[source.nodeType].label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 表底：固定不滚动 */}
        <div className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" className="w-full" nativeButton={false} render={<Link href={moduleHref} />}>
            <ExternalLink className="size-4" />
            查看原始记录
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
