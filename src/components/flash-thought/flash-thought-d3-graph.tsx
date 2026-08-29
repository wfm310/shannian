"use client"

import { useRef, useEffect, useState } from "react"
import * as d3 from "d3"
import type { FlashThought } from "@/lib/db"
import { Lightbulb } from "lucide-react"

interface GraphProps {
  thoughts: FlashThought[]
  onOpenDetail: (flash: FlashThought) => void
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  content: string
  status: string
  categoryTarget: string | null
  degree: number
  radius: number
  flash: FlashThought
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  keywords: string[]
}

function isDarkMode(): boolean {
  if (typeof window === "undefined") return false
  return document.documentElement.classList.contains("dark")
}

function getColors() {
  const dark = isDarkMode()
  return {
    pending: dark ? "#A78BFA" : "#7C3AED",
    categorized: dark ? "#2DD4BF" : "#0D9488",
    converted_todo: dark ? "#60A5FA" : "#2563EB",
    edge: dark ? "rgba(148,163,184,0.25)" : "rgba(100,116,139,0.2)",
    edgeActive: dark ? "#A78BFA" : "#7C3AED",
    edgeDim: dark ? "rgba(71,85,105,0.06)" : "rgba(100,116,139,0.05)",
    nodeDim: dark ? "rgba(71,85,105,0.15)" : "rgba(100,116,139,0.12)",
    label: dark ? "#CBD5E1" : "#475569",
    labelDim: dark ? "rgba(148,163,184,0.25)" : "rgba(100,116,139,0.2)",
  }
}

const statusLabels: Record<string, string> = {
  pending: "待处理",
  categorized: "已归类",
  converted_todo: "已转待办",
}

function extractBigrams(content: string): Set<string> {
  const cleaned = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "")
  const bigrams = new Set<string>()
  if (cleaned.length <= 4) {
    bigrams.add(cleaned)
    return bigrams
  }
  for (let i = 0; i < cleaned.length - 1; i++) {
    bigrams.add(cleaned.slice(i, i + 2))
  }
  return bigrams
}

function getSharedKeywords(a: Set<string>, b: Set<string>): string[] {
  const shared: string[] = []
  a.forEach(k => { if (b.has(k)) shared.push(k) })
  return shared
}

function generateGraphData(thoughts: FlashThought[]) {
  const bigramMap = new Map<number, Set<string>>()
  thoughts.forEach(t => {
    bigramMap.set(t.id!, extractBigrams(t.content))
  })

  const links: GraphLink[] = []

  for (let i = 0; i < thoughts.length; i++) {
    for (let j = i + 1; j < thoughts.length; j++) {
      const a = thoughts[i]
      const b = thoughts[j]
      const shared = getSharedKeywords(bigramMap.get(a.id!)!, bigramMap.get(b.id!)!)

      if (shared.length >= 2) {
        links.push({
          source: String(a.id),
          target: String(b.id),
          keywords: shared.slice(0, 3),
        })
      }
    }
  }

  const degreeMap = new Map<string, number>()
  thoughts.forEach(t => degreeMap.set(String(t.id), 0))
  links.forEach(l => {
    const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id
    const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id
    degreeMap.set(s, (degreeMap.get(s) || 0) + 1)
    degreeMap.set(t, (degreeMap.get(t) || 0) + 1)
  })

  const nodes: GraphNode[] = thoughts.map(t => {
    const degree = degreeMap.get(String(t.id)) || 0
    return {
      id: String(t.id),
      content: t.content,
      status: t.status,
      categoryTarget: t.categoryTarget,
      degree,
      radius: Math.min(28, 8 + degree * 5),
      flash: t,
    }
  })

  return { nodes, links }
}

function nodeColor(status: string, colors: ReturnType<typeof getColors>) {
  if (status === "pending") return colors.pending
  if (status === "categorized") return colors.categorized
  return colors.converted_todo
}

function linkNodeId(link: GraphLink, key: "source" | "target"): string {
  const v = link[key]
  return typeof v === "string" ? v : (v as GraphNode).id
}

export function FlashThoughtGraph({ thoughts, onOpenDetail }: GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const onOpenDetailRef = useRef(onOpenDetail)
  onOpenDetailRef.current = onOpenDetail
  const thoughtsRef = useRef(thoughts)
  thoughtsRef.current = thoughts
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; status: string } | null>(null)
  const [edgeTooltip, setEdgeTooltip] = useState<{ x: number; y: number; keywords: string[] } | null>(null)

  const dataKey = JSON.stringify(
    thoughts.map(t => ({ id: t.id, content: t.content, status: t.status, categoryTarget: t.categoryTarget }))
  )

  useEffect(() => {
    if (!svgRef.current || thoughts.length === 0) return

    const colors = getColors()
    const svgEl = svgRef.current
    const svg = d3.select(svgEl)
    svg.selectAll("*").remove()

    const container = svgEl.parentElement
    const width = container?.clientWidth || 800
    const height = container?.clientHeight || 600

    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.style("background", "transparent")

    const g = svg.append("g")

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })

    svg.call(zoom)

    const { nodes, links } = generateGraphData(thoughts)

    const simulation = d3.forceSimulation<GraphNode, GraphLink>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>().radius(d => d.radius + 4))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaDecay(0.0228)
      .alphaMin(0.001)

    const linkGroup = g.append("g").attr("class", "links")
    const link = linkGroup.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", colors.edge)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer")

    const nodeGroup = g.append("g").attr("class", "nodes")
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")

    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => nodeColor(d.status, colors))
      .attr("stroke", d => nodeColor(d.status, colors))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.3)
      .attr("fill-opacity", 1)

    node.append("text")
      .text(d => {
        const c = d.content || ""
        return c.length > 10 ? c.slice(0, 10) + "..." : c
      })
      .attr("font-size", 11)
      .attr("fill", colors.label)
      .attr("text-anchor", "middle")
      .attr("dy", d => d.radius + 14)
      .attr("opacity", 0)
      .attr("pointer-events", "none")
      .style("font-family", "var(--font-sans)")
      .style("user-select", "none")

    function highlightNode(d: GraphNode) {
      const connectedNodes = new Set<string>([d.id])

      links.forEach(l => {
        const s = linkNodeId(l, "source")
        const t = linkNodeId(l, "target")
        if (s === d.id) connectedNodes.add(t)
        else if (t === d.id) connectedNodes.add(s)
      })

      node.select("circle")
        .attr("fill-opacity", n => connectedNodes.has((n as GraphNode).id) ? 1 : 0.15)
        .attr("stroke-opacity", n => connectedNodes.has((n as GraphNode).id) ? 0.6 : 0.05)

      node.select("text")
        .attr("opacity", n => connectedNodes.has((n as GraphNode).id) ? 1 : 0.08)
        .attr("font-weight", n => (n as GraphNode).id === d.id ? 600 : 400)

      link
        .attr("stroke-opacity", l => {
          const s = linkNodeId(l, "source")
          const t = linkNodeId(l, "target")
          return (s === d.id || t === d.id) ? 0.9 : 0.03
        })
        .attr("stroke", l => {
          const s = linkNodeId(l, "source")
          const t = linkNodeId(l, "target")
          return (s === d.id || t === d.id) ? colors.edgeActive : colors.edgeDim
        })
        .attr("stroke-width", l => {
          const s = linkNodeId(l, "source")
          const t = linkNodeId(l, "target")
          return (s === d.id || t === d.id) ? 2 : 1
        })
    }

    function resetHighlight() {
      node.select("circle")
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 0.3)

      node.select("text")
        .attr("opacity", 0)
        .attr("font-weight", 400)

      link
        .attr("stroke", colors.edge)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.6)
    }

    node.on("mouseenter", function (event, d) {
      highlightNode(d)
      const flash = thoughtsRef.current.find(t => String(t.id) === d.id)
      if (flash) {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: flash.content,
          status: flash.status,
        })
      }
    })

    node.on("mousemove", function (event) {
      setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null)
    })

    node.on("mouseleave", function () {
      resetHighlight()
      setTooltip(null)
    })

    node.on("click", function (event, d) {
      event.stopPropagation()
      const flash = thoughtsRef.current.find(t => String(t.id) === d.id)
      if (flash) onOpenDetailRef.current(flash)
    })

    link.on("mouseenter", function (event, d) {
      const l = d as GraphLink
      const keywords = l.keywords || []
      if (keywords.length > 0) {
        setEdgeTooltip({
          x: event.clientX,
          y: event.clientY,
          keywords,
        })
      }
    }).on("mouseleave", function () {
      setEdgeTooltip(null)
    })

    const drag = d3.drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x || 0)
        .attr("y1", d => (d.source as GraphNode).y || 0)
        .attr("x2", d => (d.target as GraphNode).x || 0)
        .attr("y2", d => (d.target as GraphNode).y || 0)

      node.attr("transform", d => `translate(${d.x || 0}, ${d.y || 0})`)
    })

    return () => {
      simulation.stop()
      svg.selectAll("*").remove()
      svg.on(".zoom", null)
    }
  }, [dataKey])

  if (thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lightbulb className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">暂无闪念</h3>
        <p className="text-sm text-muted-foreground">按 N 键快速记录想法</p>
      </div>
    )
  }

  const colors = getColors()

  return (
    <>
      <svg ref={svgRef} className="w-full h-[calc(100vh-220px)] min-h-[500px]" />

      <div className="absolute top-4 right-4 flex flex-col gap-1.5 text-xs p-3 bg-popover/80 border border-border rounded-md backdrop-blur-sm pointer-events-none z-20">
        <div className="font-semibold text-muted-foreground mb-1">状态</div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.pending }} />
          <span>待处理</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.categorized }} />
          <span>已归类</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.converted_todo }} />
          <span>已转待办</span>
        </div>
        <div className="font-semibold text-muted-foreground mt-2 mb-1">连线</div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0" style={{ borderTop: `1.5px solid ${colors.edgeActive}` }} />
          <span>内容关联</span>
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 max-w-xs p-3 bg-popover border border-border rounded-md shadow-md text-sm pointer-events-none"
          style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: nodeColor(tooltip.status, colors) }}
            />
            <span className="text-xs text-muted-foreground">{statusLabels[tooltip.status]}</span>
          </div>
          <p className="whitespace-pre-wrap">{tooltip.content}</p>
        </div>
      )}

      {edgeTooltip && (
        <div
          className="fixed z-50 max-w-xs p-3 bg-popover border border-border rounded-md shadow-md text-sm pointer-events-none"
          style={{ left: edgeTooltip.x + 15, top: edgeTooltip.y + 15 }}
        >
          <div className="text-xs text-muted-foreground mb-1">共享关键词</div>
          <div className="flex flex-wrap gap-1">
            {edgeTooltip.keywords.map((k, i) => (
              <span key={i} className="px-1.5 py-0.5 text-xs bg-muted rounded">{k}</span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
