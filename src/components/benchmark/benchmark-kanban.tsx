"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusConfig, calculateProgress, isAllRequiredFilled } from "@/lib/benchmark"
import { toast } from "sonner"
import type { Benchmark, BenchmarkStatus } from "@/lib/db"


// 只允许向前流转，不能逆向，已转化为终态
const validTransitions: Record<BenchmarkStatus, BenchmarkStatus[]> = {
  pending: ["in_progress"],
  in_progress: ["completed"],
  completed: ["converted"],
  converted: [],
}

const columnOrder: BenchmarkStatus[] = ["pending", "in_progress", "completed", "converted"]


// ===== 可拖拽卡片 =====
function KanbanCard({
  benchmark,
  onOpenDetail,
  isDragActive,
}: {
  benchmark: Benchmark
  onOpenDetail: (id: number) => void
  isDragActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(benchmark.id),
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  }

  const progress = calculateProgress(benchmark)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragActive) return
        e.stopPropagation()
        onOpenDetail(benchmark.id!)
      }}
      className="bg-card border border-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-colors"
    >
      <p className="text-sm font-medium line-clamp-2">{benchmark.title}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{benchmark.assignee}</span>
        <span>{progress}/4</span>
      </div>
    </div>
  )
}


// ===== 可放置列 =====
function KanbanColumn({
  status,
  benchmarks,
  onOpenDetail,
  isDragActive,
}: {
  status: BenchmarkStatus
  benchmarks: Benchmark[]
  onOpenDetail: (id: number) => void
  isDragActive: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex-shrink-0 w-72 flex flex-col gap-3">
      {/* 列头 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig[status].variant}>
            {statusConfig[status].label}
          </Badge>
          <span className="text-xs text-muted-foreground">{benchmarks.length}</span>
        </div>
      </div>

      {/* 卡片区域 */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] space-y-2 p-2 rounded-lg transition-colors",
          isOver && "bg-muted/50"
        )}
      >
        {benchmarks.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground/50 border border-dashed border-border rounded-lg">
            拖拽到此
          </div>
        ) : (
          benchmarks.map(b => (
            <KanbanCard
              key={b.id}
              benchmark={b}
              onOpenDetail={onOpenDetail}
              isDragActive={isDragActive}
            />
          ))
        )}
      </div>
    </div>
  )
}


// ===== 主组件 =====
interface BenchmarkKanbanProps {
  benchmarks: Benchmark[]
  onOpenDetail: (id: number) => void
  onUpdate: (id: number, updates: Partial<Benchmark>) => Promise<void>
  onConvert: (id: number) => void
}

export function BenchmarkKanban({
  benchmarks,
  onOpenDetail,
  onUpdate,
  onConvert,
}: BenchmarkKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const grouped = useMemo(() => {
    const result: Record<BenchmarkStatus, Benchmark[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      converted: [],
    }
    for (const b of benchmarks) {
      result[b.status].push(b)
    }
    return result
  }, [benchmarks])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    // 延迟重置 activeId，让 onClick 能检测到拖拽刚结束
    setTimeout(() => setActiveId(null), 0)

    if (!over) return

    const cardId = active.id as string
    const targetStatus = over.id as BenchmarkStatus

    const card = benchmarks.find(b => String(b.id) === cardId)
    if (!card) return

    // 同列不处理
    if (card.status === targetStatus) return

    // 检查是否为合法的向前流转
    const validTargets = validTransitions[card.status]
    if (!validTargets.includes(targetStatus)) return

    // 拖拽到"已拆解"：检查四维度必填项
    if (targetStatus === "completed") {
      if (!isAllRequiredFilled(card)) {
        toast.error("拆解内容未完成", {
          description: "请在详情中完成四个维度的拆解后再拖拽到「已拆解」",
        })
        onOpenDetail(card.id!)
        return
      }
      onUpdate(card.id!, {
        status: targetStatus,
        disassemblyCompleteTime: Date.now(),
      })
      return
    }

    // 拖拽到"已转化"：弹出转化弹窗，不直接更新状态
    if (targetStatus === "converted") {
      onConvert(card.id!)
      return
    }

    // 其他流转直接更新
    onUpdate(card.id!, { status: targetStatus })
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setTimeout(() => setActiveId(null), 0)
  }

  const activeCard = activeId
    ? benchmarks.find(b => String(b.id) === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnOrder.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            benchmarks={grouped[status]}
            onOpenDetail={onOpenDetail}
            isDragActive={!!activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="bg-card border border-foreground/20 rounded-lg p-3 space-y-2 shadow-lg w-72 opacity-90">
            <p className="text-sm font-medium line-clamp-2">{activeCard.title}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{activeCard.assignee}</span>
              <span>{calculateProgress(activeCard)}/4</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
