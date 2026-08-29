'use client'

// ========== 文件作用 ==========
// 知识图谱组件（D3.js + Canvas）
// 跟 Obsidian 同款技术：d3-force 力导向布局 + Canvas 高性能渲染
// 支持：拖拽节点、抓手平移、滚轮缩放、悬停高亮、Obsidian 风格微交互

// ========== 导入区域 ==========
import { useRef, useEffect, useState, useCallback } from "react"
import * as d3 from "d3"
import type { GraphData } from "@/lib/knowledge-base"
import { NODE_TYPE_META } from "@/lib/knowledge-base"
import type { KnowledgeNodeType } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ZoomIn, ZoomOut, Maximize, Shuffle, Hand } from "lucide-react"

// ========== 节点颜色映射 ==========
const NODE_COLORS: Record<KnowledgeNodeType, string> = {
  FlashIdea:       "var(--chart-1)",
  Benchmarking:    "var(--chart-2)",
  Topic:           "var(--chart-3)",
  QA:              "var(--chart-4)",
  Inspiration:     "var(--chart-5)",
  ScriptFramework: "var(--chart-1)",
  ScriptContent:   "var(--chart-2)",
  PublishRecord:   "var(--chart-3)",
  Review:          "var(--chart-4)",
}

// ========== 内部类型 ==========
interface SimNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: KnowledgeNodeType
  tags: string[]
}

interface SimLink {
  source: SimNode
  target: SimNode
  type: string
}

// ========== 组件属性 ==========
interface KnowledgeGraphProps {
  data: GraphData | null
  isLoading: boolean
  onNodeClick: (nodeId: string) => void
}

// ========== 组件定义 ==========
export function KnowledgeGraph({
  data,
  isLoading,
  onNodeClick,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null)
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const nodesRef = useRef<SimNode[]>([])
  const linksRef = useRef<SimLink[]>([])

  // 状态
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null)
  const [panMode, setPanMode] = useState(false)

  // 用 ref 存储需要在渲染循环中读取但不触发重渲染的值
  const hoveredNodeRef = useRef<SimNode | null>(null)
  const panModeRef = useRef(false)

  // 同步 state 到 ref
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode
  }, [hoveredNode])

  useEffect(() => {
    panModeRef.current = panMode
    if (canvasRef.current) {
      canvasRef.current.style.cursor = panMode ? "grab" : "default"
    }
  }, [panMode])

  // 获取节点邻居关系
  const getNeighbors = useCallback((nodeId: string): Set<string> => {
    const neighbors = new Set<string>()
    for (const link of linksRef.current) {
      if (link.source.id === nodeId) neighbors.add(link.target.id)
      if (link.target.id === nodeId) neighbors.add(link.source.id)
    }
    return neighbors
  }, [])

  // ---------- 初始化图谱 ----------
  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Canvas 尺寸
    const width = container.clientWidth
    const height = container.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // 准备节点
    const nodes: SimNode[] = data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      tags: n.tags,
    }))

    // 准备边
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        type: e.type,
      }))

    nodesRef.current = nodes
    linksRef.current = links

    // D3 力导向模拟
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(80)
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>().radius(30))
      .alphaDecay(0.05)

    simulationRef.current = simulation

    // 动画过渡值
    const nodeRadiusMap = new Map<string, number>()
    const nodeOpacityMap = new Map<string, number>()
    const edgeOpacityMap = new Map<number, number>()

    for (const node of nodes) {
      nodeRadiusMap.set(node.id, 8)
      nodeOpacityMap.set(node.id, 1)
    }
    for (let i = 0; i < links.length; i++) {
      edgeOpacityMap.set(i, 0.6)
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    // 渲染循环
    let animationId: number

    function render() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      ctx.save()
      ctx.translate(transformRef.current.x, transformRef.current.y)
      ctx.scale(transformRef.current.k, transformRef.current.k)

      // 当前悬停的节点（从 ref 读取，实时更新）
      const hovered = hoveredNodeRef.current
      let neighborSet: Set<string> | null = null
      if (hovered) {
        neighborSet = getNeighbors(hovered.id)
        neighborSet.add(hovered.id)
      }

      // 更新动画过渡值
      for (const node of nodes) {
        const id = node.id
        const isHovered = hovered && hovered.id === id
        const isNeighbor = neighborSet && neighborSet.has(id)
        const targetRadius = isHovered ? 13 : 8
        const targetOpacity = !hovered ? 1 : isNeighbor ? 1 : 0.12

        nodeRadiusMap.set(id, lerp(nodeRadiusMap.get(id) ?? 8, targetRadius, 0.2))
        nodeOpacityMap.set(id, lerp(nodeOpacityMap.get(id) ?? 1, targetOpacity, 0.15))
      }

      for (let i = 0; i < links.length; i++) {
        const link = links[i]
        const isConnected = hovered && (link.source.id === hovered.id || link.target.id === hovered.id)
        const targetOpacity = !hovered ? 0.5 : isConnected ? 1 : 0.04
        edgeOpacityMap.set(i, lerp(edgeOpacityMap.get(i) ?? 0.5, targetOpacity, 0.15))
      }

      // 画边
      for (let i = 0; i < links.length; i++) {
        const link = links[i]
        const s = link.source
        const t = link.target
        if (s.x == null || s.y == null || t.x == null || t.y == null) continue

        const opacity = edgeOpacityMap.get(i) ?? 0.5
        ctx.strokeStyle = `rgba(128, 128, 128, ${opacity * 0.6})`
        ctx.lineWidth = link.type === "SHARED_TAG" ? 0.5 : 1
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.stroke()
      }

      // 画节点
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue
        const id = node.id
        const isHovered = hovered && hovered.id === id
        const color = NODE_COLORS[node.type] || "var(--muted-foreground)"
        const radius = nodeRadiusMap.get(id) ?? 8
        const opacity = nodeOpacityMap.get(id) ?? 1

        ctx.globalAlpha = opacity

        // 悬停节点的外发光环
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI)
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.25
          ctx.stroke()
          ctx.globalAlpha = opacity
        }

        // 节点本体
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = "var(--background)"
        ctx.lineWidth = 2
        ctx.stroke()

        // 标签：悬停时显示完整文字，否则截断
        ctx.fillStyle = "var(--foreground)"
        ctx.font = isHovered ? "600 13px Inter, sans-serif" : "12px Inter, sans-serif"
        ctx.textAlign = "center"
        const label = isHovered ? node.label : node.label.slice(0, 10)
        ctx.fillText(label, node.x, node.y + radius + 14)

        ctx.globalAlpha = 1
      }

      ctx.restore()
      animationId = requestAnimationFrame(render)
    }

    render()

    // ---- 鼠标交互 ----
    function getMousePos(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k,
        y: (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k,
      }
    }

    function findNode(x: number, y: number): SimNode | null {
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue
        const dx = x - node.x
        const dy = y - node.y
        if (dx * dx + dy * dy < 400) return node
      }
      return null
    }

    // 拖拽/平移状态
    let draggingNode: SimNode | null = null
    let isPanning = false
    let panStart = { x: 0, y: 0, tx: 0, ty: 0 }
    let mouseDownPos = { x: 0, y: 0 }
    let mouseMoved = false

    function onPointerDown(e: MouseEvent) {
      const pos = getMousePos(e)
      mouseDownPos = { x: e.clientX, y: e.clientY }
      mouseMoved = false

      const node = findNode(pos.x, pos.y)
      if (node) {
        draggingNode = node
        canvas.style.cursor = "grabbing"
      } else {
        isPanning = true
        panStart = {
          x: e.clientX,
          y: e.clientY,
          tx: transformRef.current.x,
          ty: transformRef.current.y,
        }
        canvas.style.cursor = "grabbing"
      }
    }

    function onPointerMove(e: MouseEvent) {
      const dx = e.clientX - mouseDownPos.x
      const dy = e.clientY - mouseDownPos.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        mouseMoved = true
      }

      if (draggingNode) {
        const pos = getMousePos(e)
        draggingNode.fx = pos.x
        draggingNode.fy = pos.y
        simulation.alpha(0.3).restart()
      } else if (isPanning) {
        transformRef.current = d3.zoomIdentity
          .translate(
            panStart.tx + (e.clientX - panStart.x),
            panStart.ty + (e.clientY - panStart.y)
          )
          .scale(transformRef.current.k)
      } else {
        const pos = getMousePos(e)
        const node = findNode(pos.x, pos.y)
        hoveredNodeRef.current = node
        setHoveredNode(node)
        canvas.style.cursor = node ? "pointer" : (panModeRef.current ? "grab" : "default")
      }
    }

    function onPointerUp(e: MouseEvent) {
      if (draggingNode) {
        draggingNode.fx = null
        draggingNode.fy = null
        draggingNode = null
      }
      if (isPanning) {
        isPanning = false
        canvas.style.cursor = panModeRef.current ? "grab" : "default"
      }
      // 没移动过才算点击
      if (!mouseMoved) {
        const pos = getMousePos(e)
        const node = findNode(pos.x, pos.y)
        if (node) {
          onNodeClick(node.id)
        }
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newK = Math.max(0.1, Math.min(5, transformRef.current.k * delta))
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const ratio = newK / transformRef.current.k
      transformRef.current = d3.zoomIdentity
        .translate(
          mx - (mx - transformRef.current.x) * ratio,
          my - (my - transformRef.current.y) * ratio
        )
        .scale(newK)
    }

    canvas.addEventListener("mousedown", onPointerDown)
    canvas.addEventListener("mousemove", onPointerMove)
    canvas.addEventListener("mouseup", onPointerUp)
    canvas.addEventListener("wheel", onWheel)

    // 清理
    return () => {
      cancelAnimationFrame(animationId)
      simulation.stop()
      canvas.removeEventListener("mousedown", onPointerDown)
      canvas.removeEventListener("mousemove", onPointerMove)
      canvas.removeEventListener("mouseup", onPointerUp)
      canvas.removeEventListener("wheel", onWheel)
    }
  }, [data, onNodeClick, getNeighbors])

  // ---- 工具栏操作 ----
  const handleZoomIn = useCallback(() => {
    const k = transformRef.current.k
    transformRef.current = d3.zoomIdentity
      .translate(transformRef.current.x * 1.2, transformRef.current.y * 1.2)
      .scale(k * 1.2)
  }, [])

  const handleZoomOut = useCallback(() => {
    const k = transformRef.current.k
    transformRef.current = d3.zoomIdentity
      .translate(transformRef.current.x * 0.8, transformRef.current.y * 0.8)
      .scale(k * 0.8)
  }, [])

  const handleFitView = useCallback(() => {
    transformRef.current = d3.zoomIdentity
    if (simulationRef.current && containerRef.current) {
      simulationRef.current
        .force("center", d3.forceCenter(
          containerRef.current.clientWidth / 2,
          containerRef.current.clientHeight / 2
        ))
        .alpha(0.3).restart()
    }
  }, [])

  const handleRelayout = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart()
    }
  }, [])

  // ========== 渲染 ==========
  if (isLoading) {
    return <Skeleton className="w-full h-full" />
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />

      {/* 工具栏 */}
      <div className="absolute top-3 right-3 flex gap-1">
        <Button
          variant={panMode ? "default" : "secondary"}
          size="icon"
          onClick={() => setPanMode(!panMode)}
          title="抓手模式"
        >
          <Hand className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomIn} title="放大">
          <ZoomIn className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} title="缩小">
          <ZoomOut className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleFitView} title="适应视图">
          <Maximize className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleRelayout} title="重新布局">
          <Shuffle className="size-4" />
        </Button>
      </div>

      {/* 悬浮提示 */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 bg-background border rounded-lg px-3 py-2 shadow-md max-w-xs">
          <p className="text-sm font-medium truncate">{hoveredNode.label}</p>
          <p className="text-xs text-muted-foreground">
            {NODE_TYPE_META[hoveredNode.type].label}
          </p>
          {hoveredNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {hoveredNode.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 图例 */}
      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 space-y-1">
        {Object.entries(NODE_COLORS).map(([type, color]) => {
          const meta = NODE_TYPE_META[type as KnowledgeNodeType]
          if (!meta) return null
          return (
            <div key={type} className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{meta.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
