'use client'

// ========== 文件作用 ==========
// 大脑知识库页面
// 只做知识图谱：全屏显示 + 右下角悬浮统计面板 + 同步数据按钮

// ========== 导入区域 ==========
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Network, ChevronUp, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import {
  syncFromModules, getNodes, getGraphData, getNode,
} from "@/lib/knowledge-base"
import { useDelayedLoading } from "@/hooks/use-delayed-loading"
import { db } from "@/lib/db"
import type { KnowledgeNode, KnowledgeEdge } from "@/lib/db"
import { KnowledgeGraph } from "@/components/knowledge-base/knowledge-graph"
import { KnowledgeNodeDetail } from "@/components/knowledge-base/knowledge-node-detail"
import { PageHeader } from "@/components/layout/page-header"

// ========== 页面组件 ==========
export default function KnowledgeBasePage() {
  // ----- 数据状态 -----
  const [nodes, setNodes] = useState<KnowledgeNode[]>([])
  const [edges, setEdges] = useState<KnowledgeEdge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const showSkeleton = useDelayedLoading(isLoading, 150)

  // ----- 图谱数据 -----
  const [graphData, setGraphData] = useState<{
    nodes: { id: string; label: string; type: any; tags: string[] }[]
    edges: { source: string; target: string; type: any }[]
  } | null>(null)

  // ----- 详情面板 -----
  const [detailNode, setDetailNode] = useState<KnowledgeNode | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ----- 同步状态 -----
  const [syncing, setSyncing] = useState(false)

  // ----- 面板展开状态 -----
  const [panelOpen, setPanelOpen] = useState(true)

  // ----- 搜索状态 -----
  const [searchText, setSearchText] = useState("")

  // ---------- 加载数据 ----------
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [nodeList, edgeList, graph] = await Promise.all([
        getNodes(),
        db.knowledgeEdges.toArray(),
        getGraphData(),
      ])
      setNodes(nodeList)
      setEdges(edgeList)
      setGraphData(graph)
    } catch (error) {
      console.error("加载知识库数据失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---------- 同步数据 ----------
  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await syncFromModules()
      toast.success(`同步完成：${result.nodeCount} 个节点，${result.edgeCount} 条关系`)
      await loadData()
    } catch (error) {
      console.error("同步失败:", error)
      toast.error("同步失败")
    } finally {
      setSyncing(false)
    }
  }

  // ---------- 点击节点 ----------
  const handleNodeClick = useCallback(async (nodeId: string) => {
    const node = await getNode(nodeId)
    if (node) {
      setDetailNode(node)
      setDetailOpen(true)
    }
  }, [])


  // ---------- 搜索过滤图谱数据 ----------
  const filteredGraphData = graphData && searchText
    ? (() => {
        const text = searchText.toLowerCase()
        const matchedNodes = graphData.nodes.filter(n =>
          n.label.toLowerCase().includes(text) ||
          n.tags.some(t => t.toLowerCase().includes(text))
        )
        const matchedIds = new Set(matchedNodes.map(n => n.id))
        const matchedEdges = graphData.edges.filter(e =>
          matchedIds.has(e.source) && matchedIds.has(e.target)
        )
        return { nodes: matchedNodes, edges: matchedEdges }
      })()
    : graphData

  // ========== 渲染 ==========
  return (
    <>
      {/* ===== 页面头部 ===== */}
      <PageHeader
        title="大脑知识库"
        description="可视化知识图谱，连接各模块内容节点与关联关系"
        searchEnabled={true}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="搜索知识节点..."
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="size-11 flex items-center justify-center active:bg-secondary/40 rounded-xl transition-colors disabled:opacity-50"
            aria-label="同步数据"
          >
            <RefreshCw className={`size-5 text-foreground ${syncing ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </button>
        }
        className="md:px-6 lg:px-8"
      />

      <div className="relative h-[calc(100vh-8rem)]">
      {/* ===== 图谱：全屏占满内容区 ===== */}
      <div className="absolute inset-0">
        {showSkeleton ? (
          <Skeleton className="w-full h-full" />
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-sm">
              <CardContent className="pt-6 pb-6 text-center">
                <Network className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-semibold">还没有知识节点</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击右下角「同步数据」从各模块生成知识图谱
                </p>
                <Button className="mt-4" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className="size-4" />
                  立即同步
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <KnowledgeGraph
            data={filteredGraphData}
            isLoading={isLoading}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {/* ===== 右下角悬浮面板 ===== */}
      <div className="absolute bottom-4 right-4 z-10">
        {/* 折叠/展开 */}
        <div className="flex justify-end mb-1">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>

        {panelOpen && (
          <Card className="w-64">
            <CardContent className="pt-4 pb-4 space-y-4">
              {/* 同步按钮 */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "同步中" : "同步数据"}
              </Button>

              <Separator />

              {/* 统计数据 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-8" /> : nodes.length}
                  </div>
                  <p className="text-xs text-muted-foreground">知识节点</p>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-8" /> : edges.length}
                  </div>
                  <p className="text-xs text-muted-foreground">关联关系</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 详情面板 */}
      <KnowledgeNodeDetail
        node={detailNode}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        edges={edges}
        allNodes={nodes}
      />
    </div>
    </>
  )
}
