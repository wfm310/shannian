"use client"

import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  Plus, Trash2, X, GripVertical, ChevronUp, ChevronDown, ChevronRight, EyeOff, SlidersHorizontal, Layers,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import {
  statusConfig,
  sourceChannelConfig,
  needsTypeConfig,
  needsCategoryConfig,
  needsValueConfig,
  presentationFormConfig,
  structureTypeConfig,
  doableConfig,
  thoroughConfig,
  diffLevelConfig,
} from "@/lib/benchmark"
import type { Benchmark, BenchmarkStatus, StructureType } from "@/lib/db"


// ===== 常量 =====
const WIDTHS_KEY = "benchmark-column-widths"
const HIDDEN_KEY = "benchmark-hidden-columns"
const ORDER_KEY = "benchmark-column-order"
const GROUP_BY_KEY = "benchmark-group-by"
const COLLAPSED_KEY = "benchmark-collapsed-groups"
const CHECKBOX_WIDTH = 40

const DEFAULT_WIDTHS: Record<string, number> = {
  checkbox: CHECKBOX_WIDTH,
  title: 200,
  status: 80,
  assignee: 80,
  sourceChannel: 90,
  audienceIdentity: 90,
  audienceStage: 80,
  audiencePainPoint: 100,
  needsType: 80,
  needsCategory: 80,
  needsValue: 80,
  coreProblem: 180,
  presentationForm: 100,
  structureType: 100,
  structureSteps: 60,
  doable: 100,
  thorough: 80,
  diffLevel: 90,
}

const COLUMN_LABELS: Record<string, string> = {
  status: "状态",
  assignee: "负责人",
  sourceChannel: "来源渠道",
  audienceIdentity: "身份",
  audienceStage: "阶段",
  audiencePainPoint: "痛点",
  needsType: "需求类型",
  needsCategory: "需求划分",
  needsValue: "内容价值",
  coreProblem: "核心问题",
  presentationForm: "展现形式",
  structureType: "结构类型",
  structureSteps: "步骤数",
  doable: "做到吗",
  thorough: "透不透",
  diffLevel: "差异化",
}

type ColumnGroup = {
  name: string
  headerClass: string
  cellClass: string
  columns: string[]
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    name: "基础信息",
    headerClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cellClass: "bg-blue-500/5 text-blue-600 dark:text-blue-400",
    columns: ["status", "assignee", "sourceChannel"],
  },
  {
    name: "人群维度",
    headerClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    cellClass: "bg-purple-500/5 text-purple-600 dark:text-purple-400",
    columns: ["audienceIdentity", "audienceStage", "audiencePainPoint"],
  },
  {
    name: "需求维度",
    headerClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    cellClass: "bg-orange-500/5 text-orange-600 dark:text-orange-400",
    columns: ["needsType", "needsCategory", "needsValue", "coreProblem"],
  },
  {
    name: "内容维度",
    headerClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    cellClass: "bg-green-500/5 text-green-600 dark:text-green-400",
    columns: ["presentationForm", "structureType", "structureSteps"],
  },
  {
    name: "自身维度",
    headerClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    cellClass: "bg-pink-500/5 text-pink-600 dark:text-pink-400",
    columns: ["doable", "thorough", "diffLevel"],
  },
]

type GroupField = "status" | "assignee" | "sourceChannel" | "none"

const GROUP_FIELD_CONFIG: { value: GroupField; label: string }[] = [
  { value: "status", label: "按状态" },
  { value: "assignee", label: "按负责人" },
  { value: "sourceChannel", label: "按来源渠道" },
  { value: "none", label: "不分组" },
]


// ===== 列宽拖拽 Hook =====
function useColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(WIDTHS_KEY)
      return stored ? { ...DEFAULT_WIDTHS, ...JSON.parse(stored) } : { ...DEFAULT_WIDTHS }
    } catch {
      return { ...DEFAULT_WIDTHS }
    }
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths))
    }, 400)
    return () => clearTimeout(timer)
  }, [widths])

  const handleResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widths[key] ?? DEFAULT_WIDTHS[key]

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.max(40, startWidth + delta)
      setWidths(prev => ({ ...prev, [key]: newWidth }))
    }

    const onUp = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [widths])

  return { widths, handleResizeStart }
}


// ===== 行内文本编辑单元格 =====
function InlineTextCell({
  value,
  onSave,
  placeholder = "未填写",
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function handleBlur() {
    const trimmed = draft.trim()
    if (trimmed !== value.trim()) {
      onSave(trimmed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className="h-8"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full text-left truncate cursor-text",
        !value && "text-muted-foreground/50"
      )}
    >
      {value || placeholder}
    </button>
  )
}


// ===== 行内下拉选择单元格 =====
function InlineSelectCell({
  value,
  options,
  onSave,
  placeholder = "未选择",
  renderValue,
  allowClear = false,
}: {
  value: string
  options: { value: string; label: string }[]
  onSave: (v: string) => void
  placeholder?: string
  renderValue: (v: string) => string
  allowClear?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "block w-full text-left truncate cursor-pointer",
          !value && "text-muted-foreground/50"
        )}
      >
        {value ? renderValue(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[120px] p-1 gap-0 rounded-lg" align="start">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onSave(opt.value)
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center px-3 py-1.5 text-sm text-left hover:bg-muted rounded-md",
              value === opt.value && "bg-muted font-medium"
            )}
          >
            {opt.label}
          </button>
        ))}
        {allowClear && (
          <button
            type="button"
            onClick={() => {
              onSave("")
              setOpen(false)
            }}
            className="flex w-full items-center px-3 py-1.5 text-sm text-left text-muted-foreground hover:bg-muted rounded-md border-t mt-1 pt-1.5"
          >
            清除
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}


// ===== 快捷新增行 =====
function QuickAddRow({ onQuickAdd, colSpan }: {
  onQuickAdd: (title: string) => void
  colSpan: number
}) {
  const [title, setTitle] = useState("")

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      onQuickAdd(title.trim())
      setTitle("")
    }
    if (e.key === "Escape") {
      setTitle("")
      e.currentTarget.blur()
    }
  }

  return (
    <TableRow className="hover:bg-muted/30 border-dashed">
      <TableCell className="sticky left-0 z-20 bg-background border-r">
        <Plus className="size-3.5 text-muted-foreground" />
      </TableCell>
      <TableCell className="sticky left-[40px] z-10 bg-background border-r">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入标题，回车快速创建..."
          className="h-7 text-sm border-dashed bg-transparent focus-visible:border-solid"
        />
      </TableCell>
      <TableCell colSpan={colSpan} className="text-xs text-muted-foreground/50">
        其他字段创建后可在表格中直接编辑
      </TableCell>
    </TableRow>
  )
}


// ===== 列宽拖拽手柄 =====
function ResizeHandle({ columnKey, onResizeStart }: {
  columnKey: string
  onResizeStart: (key: string, e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={(e) => onResizeStart(columnKey, e)}
      onClick={(e) => e.stopPropagation()}
      className="absolute -right-1 top-0 h-full w-2 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500/60 z-30"
    />
  )
}


// ===== 可拖拽排序的列头 =====
function SortableFieldHeader({
  columnKey,
  label,
  cellClass,
  rh,
  sortConfig,
  onSort,
  onClearSort,
  onHide,
  onResizeStart,
}: {
  columnKey: string
  label: string
  cellClass: string
  rh: { th: string }
  sortConfig: { key: string; direction: "asc" | "desc" } | null
  onSort: (key: string, direction: "asc" | "desc") => void
  onClearSort: () => void
  onHide: (key: string) => void
  onResizeStart: (key: string, e: React.MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: columnKey })
  const isSorted = sortConfig?.key === columnKey

  return (
    <th
      ref={setNodeRef}
      className={cn(
        "relative px-2 align-middle font-medium whitespace-nowrap text-foreground",
        rh.th,
        cellClass,
        isDragging && "opacity-50"
      )}
      {...attributes}
    >
      <div className="flex items-center gap-0.5">
        <span
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground/60"
        >
          <GripVertical className="size-3" />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-0.5 text-left cursor-pointer hover:text-foreground">
            {label}
            {isSorted && (
              sortConfig!.direction === "asc"
                ? <ChevronUp className="size-3" />
                : <ChevronDown className="size-3" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onSort(columnKey, "asc")}>
              <ChevronUp className="size-3.5" />
              升序
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort(columnKey, "desc")}>
              <ChevronDown className="size-3.5" />
              降序
            </DropdownMenuItem>
            {isSorted && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearSort}>
                  <X className="size-3.5" />
                  清除排序
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onHide(columnKey)}>
              <EyeOff className="size-3.5" />
              隐藏此列
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ResizeHandle columnKey={columnKey} onResizeStart={onResizeStart} />
    </th>
  )
}


// ===== 分组头行 =====
function GroupHeaderRow({
  groupLabel,
  count,
  isCollapsed,
  onToggle,
  visibleColCount,
  rh,
}: {
  groupLabel: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
  visibleColCount: number
  rh: { th: string; td: string }
}) {
  return (
    <TableRow
      className="hover:bg-muted/70 cursor-pointer border-y border-border"
      onClick={onToggle}
    >
      <TableCell className={cn("sticky left-0 z-20 bg-muted/50 border-r", rh.td)}>
        {isCollapsed
          ? <ChevronRight className="size-4 text-muted-foreground" />
          : <ChevronDown className="size-4 text-muted-foreground" />}
      </TableCell>
      <TableCell className={cn("sticky left-[40px] z-10 bg-muted/50 border-r font-medium", rh.td)}>
        {groupLabel}
        <span className="ml-2 text-xs text-muted-foreground">{count}</span>
      </TableCell>
      <TableCell colSpan={visibleColCount} className={cn("bg-muted/50", rh.td)} />
    </TableRow>
  )
}


// ===== 主组件 =====
interface BenchmarkTableProps {
  benchmarks: Benchmark[]
  onOpenDetail: (id: number) => void
  onUpdate: (id: number, updates: Partial<Benchmark>) => Promise<void>
  onQuickAdd: (title: string) => void
  onBatchUpdateStatus: (ids: number[], status: BenchmarkStatus) => Promise<void>
  onBatchDelete: (ids: number[]) => Promise<void>
  rowHeight?: "compact" | "comfortable"
}

export function BenchmarkTable({
  benchmarks,
  onOpenDetail,
  onUpdate,
  onQuickAdd,
  onBatchUpdateStatus,
  onBatchDelete,
  rowHeight = "comfortable",
}: BenchmarkTableProps) {
  const { widths, handleResizeStart } = useColumnWidths()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // 列显示/隐藏
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  // 列排序顺序（组内）
  const [columnOrder, setColumnOrder] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(ORDER_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  // 排序
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)

  // 分组字段
  const [groupBy, setGroupBy] = useState<GroupField>(() => {
    try {
      const stored = localStorage.getItem(GROUP_BY_KEY)
      return (stored as GroupField) || "status"
    } catch {
      return "status"
    }
  })

  // 折叠的分组（按分组字段维度持久化）
  const [collapsedMap, setCollapsedMap] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const rh = rowHeight === "compact"
    ? { th: "h-8 text-xs", td: "py-1 text-xs" }
    : { th: "h-10 text-sm", td: "py-2.5 text-sm" }

  // 持久化
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hiddenColumns)))
    }, 400)
    return () => clearTimeout(timer)
  }, [hiddenColumns])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(ORDER_KEY, JSON.stringify(columnOrder))
    }, 400)
    return () => clearTimeout(timer)
  }, [columnOrder])

  useEffect(() => {
    localStorage.setItem(GROUP_BY_KEY, groupBy)
  }, [groupBy])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedMap))
    }, 400)
    return () => clearTimeout(timer)
  }, [collapsedMap])

  // 清理无效选中
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(benchmarks.map(b => b.id!))
      const next = new Set<number>()
      prev.forEach(id => {
        if (validIds.has(id)) next.add(id)
      })
      return next.size === prev.size ? prev : next
    })
  }, [benchmarks])

  // 计算可见分组
  const visibleGroups = useMemo(() => {
    return COLUMN_GROUPS.map(group => {
      const ordered = columnOrder[group.name] || group.columns
      const visible = ordered.filter(key => !hiddenColumns.has(key))
      return { ...group, visibleColumns: visible }
    }).filter(g => g.visibleColumns.length > 0)
  }, [hiddenColumns, columnOrder])

  // 所有可见列（扁平）
  const allVisibleColumns = useMemo(
    () => visibleGroups.flatMap(g => g.visibleColumns),
    [visibleGroups]
  )

  // 排序后的数据
  const sortedBenchmarks = useMemo(() => {
    if (!sortConfig) return benchmarks
    return [...benchmarks].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key]
      const bVal = (b as any)[sortConfig.key]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }, [benchmarks, sortConfig])

  // 分组后的数据
  const groupedData = useMemo(() => {
    if (groupBy === "none") return null

    const groupMap = new Map<string, Benchmark[]>()

    for (const item of sortedBenchmarks) {
      let groupKey: string
      if (groupBy === "status") {
        groupKey = item.status
      } else if (groupBy === "assignee") {
        groupKey = item.assignee || "未分配"
      } else {
        groupKey = item.sourceChannel
      }
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, [])
      groupMap.get(groupKey)!.push(item)
    }

    const groups: { key: string; label: string; items: Benchmark[] }[] = []

    if (groupBy === "status") {
      const order: BenchmarkStatus[] = ["pending", "in_progress", "completed", "converted"]
      for (const key of order) {
        const items = groupMap.get(key)
        if (items && items.length > 0) {
          groups.push({ key, label: statusConfig[key].label, items })
        }
      }
    } else if (groupBy === "sourceChannel") {
      const order = ["recommend", "search", "douyin_index", "other"]
      for (const key of order) {
        const items = groupMap.get(key)
        if (items && items.length > 0) {
          groups.push({ key, label: sourceChannelConfig[key]?.label || key, items })
        }
      }
    } else {
      for (const key of Array.from(groupMap.keys()).sort()) {
        groups.push({ key, label: key, items: groupMap.get(key)! })
      }
    }

    return groups
  }, [sortedBenchmarks, groupBy])

  // 当前分组字段下的折叠集合
  const collapsedGroups = useMemo(
    () => new Set(collapsedMap[groupBy] || []),
    [collapsedMap, groupBy]
  )

  const allSelected = benchmarks.length > 0 && selectedIds.size === benchmarks.length

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // 总宽度
  const totalWidth = useMemo(() => {
    return CHECKBOX_WIDTH
      + (widths.title ?? DEFAULT_WIDTHS.title)
      + allVisibleColumns.reduce((sum, key) => sum + (widths[key] ?? DEFAULT_WIDTHS[key]), 0)
  }, [widths, allVisibleColumns])

  // ===== 操作函数 =====
  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(benchmarks.map(b => b.id!)))
    }
  }

  function toggleRow(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleColumnVisibility(key: string) {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      // 至少保留一列可见
      if (next.has(key)) {
        next.delete(key)
      } else {
        const visibleCount = allVisibleColumns.length
        if (visibleCount <= 1) return prev
        next.add(key)
      }
      return next
    })
  }

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedMap(prev => {
      const current = new Set(prev[groupBy] || [])
      if (current.has(groupKey)) current.delete(groupKey)
      else current.add(groupKey)
      return { ...prev, [groupBy]: Array.from(current) }
    })
  }

  function collapseAllGroups() {
    if (!groupedData) return
    setCollapsedMap(prev => ({
      ...prev,
      [groupBy]: groupedData.map(g => g.key),
    }))
  }

  function expandAllGroups() {
    setCollapsedMap(prev => ({ ...prev, [groupBy]: [] }))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeKey = active.id as string
    const overKey = over.id as string

    let activeGroup: ColumnGroup | null = null
    let overGroup: ColumnGroup | null = null

    for (const group of COLUMN_GROUPS) {
      if (group.columns.includes(activeKey)) activeGroup = group
      if (group.columns.includes(overKey)) overGroup = group
    }

    if (!activeGroup || !overGroup || activeGroup.name !== overGroup.name) return

    const currentOrder = columnOrder[activeGroup.name] || activeGroup.columns
    const oldIndex = currentOrder.indexOf(activeKey)
    const newIndex = currentOrder.indexOf(overKey)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(currentOrder, oldIndex, newIndex)
    setColumnOrder(prev => ({ ...prev, [activeGroup.name]: newOrder }))
  }

  async function handleBatchStatusChange(status: BenchmarkStatus) {
    const ids = Array.from(selectedIds)
    setSelectedIds(new Set())
    await onBatchUpdateStatus(ids, status)
  }

  async function handleBatchDeleteConfirm() {
    const ids = Array.from(selectedIds)
    setSelectedIds(new Set())
    setDeleteDialogOpen(false)
    await onBatchDelete(ids)
  }

  // ===== 单元格渲染 =====
  function renderCell(key: string, item: Benchmark) {
    switch (key) {
      case "status":
        return (
          <button type="button" onClick={() => onOpenDetail(item.id!)} className="cursor-pointer">
            <Badge variant={statusConfig[item.status].variant}>
              {statusConfig[item.status].label}
            </Badge>
          </button>
        )
      case "assignee":
        return <InlineTextCell value={item.assignee} onSave={(v) => onUpdate(item.id!, { assignee: v })} />
      case "sourceChannel":
        return (
          <InlineSelectCell
            value={item.sourceChannel}
            options={Object.entries(sourceChannelConfig).map(([k, v]) => ({ value: k, label: v.label }))}
            onSave={(v) => onUpdate(item.id!, { sourceChannel: v as any })}
            renderValue={(v) => sourceChannelConfig[v]?.label || v}
          />
        )
      case "audienceIdentity":
        return <InlineTextCell value={item.audienceIdentity} onSave={(v) => onUpdate(item.id!, { audienceIdentity: v })} />
      case "audienceStage":
        return <InlineTextCell value={item.audienceStage} onSave={(v) => onUpdate(item.id!, { audienceStage: v })} />
      case "audiencePainPoint":
        return <InlineTextCell value={item.audiencePainPoint} onSave={(v) => onUpdate(item.id!, { audiencePainPoint: v })} />
      case "needsType":
        return (
          <InlineSelectCell
            value={item.needsType || ""}
            options={Object.entries(needsTypeConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { needsType: (v || null) as any })}
            renderValue={(v) => needsTypeConfig[v] || v}
            allowClear
          />
        )
      case "needsCategory":
        return (
          <InlineSelectCell
            value={item.needsCategory || ""}
            options={Object.entries(needsCategoryConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { needsCategory: (v || null) as any })}
            renderValue={(v) => needsCategoryConfig[v] || v}
            allowClear
          />
        )
      case "needsValue":
        return (
          <InlineSelectCell
            value={item.needsValue || ""}
            options={Object.entries(needsValueConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { needsValue: (v || null) as any })}
            renderValue={(v) => needsValueConfig[v] || v}
            allowClear
          />
        )
      case "coreProblem":
        return <InlineTextCell value={item.coreProblem} onSave={(v) => onUpdate(item.id!, { coreProblem: v })} />
      case "presentationForm":
        return (
          <InlineSelectCell
            value={item.presentationForm || ""}
            options={Object.entries(presentationFormConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { presentationForm: (v || null) as any })}
            renderValue={(v) => presentationFormConfig[v] || v}
            allowClear
          />
        )
      case "structureType":
        return (
          <InlineSelectCell
            value={item.structureType || ""}
            options={Object.entries(structureTypeConfig).map(([k, v]) => ({ value: k, label: v.label }))}
            onSave={(v) => onUpdate(item.id!, { structureType: (v || null) as any })}
            renderValue={(v) => structureTypeConfig[v as StructureType]?.label || v}
            allowClear
          />
        )
      case "structureSteps":
        return <span className="text-muted-foreground">{(item.structureSteps || []).length}步</span>
      case "doable":
        return (
          <InlineSelectCell
            value={item.doable || ""}
            options={Object.entries(doableConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { doable: (v || null) as any })}
            renderValue={(v) => doableConfig[v] || v}
            allowClear
          />
        )
      case "thorough":
        return (
          <InlineSelectCell
            value={item.thorough || ""}
            options={Object.entries(thoroughConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { thorough: (v || null) as any })}
            renderValue={(v) => thoroughConfig[v] || v}
            allowClear
          />
        )
      case "diffLevel":
        return (
          <InlineSelectCell
            value={item.diffLevel || ""}
            options={Object.entries(diffLevelConfig).map(([k, v]) => ({ value: k, label: v }))}
            onSave={(v) => onUpdate(item.id!, { diffLevel: (v || null) as any })}
            renderValue={(v) => diffLevelConfig[v] || v}
            allowClear
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {sortedBenchmarks.length} 条记录
          {selectedIds.size > 0 && ` · 已选 ${selectedIds.size} 项`}
        </span>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm hover:bg-accent transition-colors">
              <Layers className="size-3.5" />
              分组
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1 text-xs text-muted-foreground">分组方式</div>
              {GROUP_FIELD_CONFIG.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setGroupBy(option.value)}
                  className={cn(groupBy === option.value && "bg-muted font-medium")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
              {groupBy !== "none" && groupedData && groupedData.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={collapseAllGroups}>
                    折叠全部
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={expandAllGroups}>
                    展开全部
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm hover:bg-accent transition-colors">
              <SlidersHorizontal className="size-3.5" />
              字段配置
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              {COLUMN_GROUPS.map(group => (
                <div key={group.name} className="mb-2 last:mb-0">
                  <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                    {group.name}
                  </div>
                  {group.columns.map(key => (
                    <label
                      key={key}
                      className="flex items-center gap-2 py-1 px-1 hover:bg-muted rounded-md cursor-pointer"
                    >
                      <Checkbox
                        checked={!hiddenColumns.has(key)}
                        onCheckedChange={() => toggleColumnVisibility(key)}
                      />
                      <span className="text-sm">{COLUMN_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              ))}
              <div className="flex justify-between mt-2 pt-2 border-t">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => { setHiddenColumns(new Set()); setColumnOrder({}) }}
                >
                  重置
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setHiddenColumns(new Set())}
                >
                  全部显示
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 表格（含拖拽排序上下文） */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={allVisibleColumns} strategy={horizontalListSortingStrategy}>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table style={{ tableLayout: "fixed", width: totalWidth }}>
              {/* 列宽定义 */}
              <colgroup>
                <col style={{ width: CHECKBOX_WIDTH }} />
                <col style={{ width: widths.title ?? DEFAULT_WIDTHS.title }} />
                {allVisibleColumns.map(key => (
                  <col key={key} style={{ width: widths[key] ?? DEFAULT_WIDTHS[key] }} />
                ))}
              </colgroup>

              <TableHeader>
                {/* 第一层：维度分组表头 */}
                <TableRow className="hover:bg-transparent">
                  <TableHead rowSpan={2} className={cn(
                    "sticky left-0 z-30 bg-muted/30 border-r", rh.th
                  )}>
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead rowSpan={2} className={cn(
                    "sticky left-[40px] z-20 bg-muted/30 relative", rh.th
                  )}>
                    标题
                    <ResizeHandle columnKey="title" onResizeStart={handleResizeStart} />
                  </TableHead>
                  {visibleGroups.map(group => (
                    <TableHead
                      key={group.name}
                      colSpan={group.visibleColumns.length}
                      className={cn("text-center font-medium", group.headerClass)}
                    >
                      {group.name}
                    </TableHead>
                  ))}
                </TableRow>

                {/* 第二层：可拖拽排序的字段表头 */}
                <TableRow className="hover:bg-transparent">
                  {visibleGroups.flatMap(group =>
                    group.visibleColumns.map(key => (
                      <SortableFieldHeader
                        key={key}
                        columnKey={key}
                        label={COLUMN_LABELS[key]}
                        cellClass={group.cellClass}
                        rh={rh}
                        sortConfig={sortConfig}
                        onSort={(k, dir) => setSortConfig({ key: k, direction: dir })}
                        onClearSort={() => setSortConfig(null)}
                        onHide={toggleColumnVisibility}
                        onResizeStart={handleResizeStart}
                      />
                    ))
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {groupedData ? (
                  <>
                    {groupedData.map(group => {
                      const isCollapsed = collapsedGroups.has(group.key)
                      return (
                        <Fragment key={group.key}>
                          <GroupHeaderRow
                            groupLabel={group.label}
                            count={group.items.length}
                            isCollapsed={isCollapsed}
                            onToggle={() => toggleGroupCollapse(group.key)}
                            visibleColCount={allVisibleColumns.length}
                            rh={rh}
                          />
                          {!isCollapsed && group.items.map(item => (
                            <TableRow
                              key={item.id}
                              data-state={selectedIds.has(item.id!) ? "selected" : undefined}
                            >
                              <TableCell className={cn("sticky left-0 z-20 bg-background border-r", rh.td)}>
                                <Checkbox
                                  checked={selectedIds.has(item.id!)}
                                  onCheckedChange={() => toggleRow(item.id!)}
                                />
                              </TableCell>
                              <TableCell className={cn("sticky left-[40px] z-10 bg-background border-r", rh.td)}>
                                <InlineTextCell
                                  value={item.title}
                                  onSave={(v) => onUpdate(item.id!, { title: v })}
                                />
                              </TableCell>
                              {allVisibleColumns.map(key => (
                                <TableCell key={key} className={rh.td}>
                                  {renderCell(key, item)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </Fragment>
                      )
                    })}
                    <QuickAddRow onQuickAdd={onQuickAdd} colSpan={allVisibleColumns.length} />
                  </>
                ) : (
                  <>
                    {sortedBenchmarks.map(item => (
                      <TableRow
                        key={item.id}
                        data-state={selectedIds.has(item.id!) ? "selected" : undefined}
                      >
                        <TableCell className={cn("sticky left-0 z-20 bg-background border-r", rh.td)}>
                          <Checkbox
                            checked={selectedIds.has(item.id!)}
                            onCheckedChange={() => toggleRow(item.id!)}
                          />
                        </TableCell>
                        <TableCell className={cn("sticky left-[40px] z-10 bg-background border-r", rh.td)}>
                          <InlineTextCell
                            value={item.title}
                            onSave={(v) => onUpdate(item.id!, { title: v })}
                          />
                        </TableCell>
                        {allVisibleColumns.map(key => (
                          <TableCell key={key} className={rh.td}>
                            {renderCell(key, item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <QuickAddRow onQuickAdd={onQuickAdd} colSpan={allVisibleColumns.length} />
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {/* 批量操作浮条 */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background shadow-lg px-4 py-2.5">
          <span className="text-sm font-medium">已选 {selectedIds.size} 项</span>
          <div className="h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors">
              改状态
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(statusConfig).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleBatchStatusChange(key as BenchmarkStatus)}
                >
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-3.5" />
            删除
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="size-3.5" />
            取消
          </Button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {selectedIds.size} 条对标记录，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDeleteConfirm}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
