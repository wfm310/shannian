"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, MoreHorizontal, ChevronRight, Plus, Trash2, Check,
  ExternalLink, User, Repeat,
} from "lucide-react"
import {
  statusConfig,
  sourceChannelConfig,
  calculateProgress,
  formatRelativeTime,
  structureTypeConfig,
  needsTypeConfig,
  needsCategoryConfig,
  needsValueConfig,
  presentationFormConfig,
  doableConfig,
  thoroughConfig,
  diffLevelConfig,
  competitionConfig,
  getBenchmark,
  updateBenchmark,
  startDisassembly,
} from "@/lib/benchmark"
import type { Benchmark, StructureType, StructureStep, BenchmarkStatus } from "@/lib/db"
import { toast } from "sonner"


// ========== 常量 ==========

const DIMENSIONS = [
  { key: "audience", label: "人群" },
  { key: "needs", label: "需求" },
  { key: "content", label: "内容" },
  { key: "self", label: "自身" },
] as const

type DimensionKey = typeof DIMENSIONS[number]["key"]

// ========== 状态圆点颜色（与 benchmark-list 统一，使用语义色） ==========
function statusDotClass(status: BenchmarkStatus): string {
  switch (status) {
    case "pending": return "bg-muted-foreground/40"
    case "in_progress": return "bg-amber-500"
    case "completed": return "bg-emerald-500"
    case "converted": return "bg-indigo-500"
    default: return "bg-muted-foreground/40"
  }
}


// ========== 通用子组件：iOS 分组卡片 ==========

function IOSGroupCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "rounded-[18px] bg-secondary/15 overflow-hidden",
      className
    )}>
      {children}
    </div>
  )
}


// ========== 通用子组件：iOS 列表行（左标签 + 右内容/箭头） ==========

function IOSListItem({
  label,
  value,
  placeholder = "请选择",
  onClick,
  showDisclosure = true,
  isLast = false,
  rightSlot,
  required = false,
  labelHint,
}: {
  label: string
  value?: string
  placeholder?: string
  onClick?: () => void
  showDisclosure?: boolean
  isLast?: boolean
  rightSlot?: React.ReactNode
  required?: boolean
  labelHint?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center min-h-[44px] px-4",
        !isLast && "border-b border-border/40",
        onClick && "active:bg-muted/50 cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[15px] text-foreground">{label}</span>
        {required && <span className="text-destructive text-xs">*</span>}
      </div>
      {labelHint && (
        <span className="text-xs text-muted-foreground/60 ml-1 flex-shrink-0">{labelHint}</span>
      )}
      <div className="flex-1 flex justify-end items-center gap-1 min-w-0 ml-3">
        {rightSlot ? (
          rightSlot
        ) : (
          <span className={cn(
            "text-[14px] truncate text-right",
            value ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {value || placeholder}
          </span>
        )}
        {showDisclosure && onClick && (
          <ChevronRight className="size-4 text-muted-foreground/40 flex-shrink-0" />
        )}
      </div>
    </div>
  )
}


// ========== 通用子组件：iOS 底部选择 Sheet ==========

function IOSSelectSheet({
  open,
  onOpenChange,
  title,
  options,
  selectedValue,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: { value: string; label: string }[]
  selectedValue?: string
  onSelect: (value: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="!rounded-t-[18px]" initialFocus={false}>
        <SheetHeader className="pb-2 pt-1">
          <SheetTitle className="text-center text-[15px] font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-2 pb-6 space-y-0.5">
          {options.map((opt) => {
            const isSelected = selectedValue === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value)
                  onOpenChange(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] transition-colors",
                  isSelected
                    ? "bg-foreground/5 text-foreground font-medium"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-4" />}
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}


// ========== 通用子组件：iOS 底部文本编辑 Sheet ==========

function IOSTextEditSheet({
  open,
  onOpenChange,
  title,
  value,
  placeholder,
  onSave,
  multiline = false,
  rows = 3,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  value: string
  placeholder?: string
  onSave: (value: string) => void
  multiline?: boolean
  rows?: number
}) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    if (open) setLocalValue(value)
  }, [open, value])

  function handleSave() {
    onSave(localValue)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="!rounded-t-[18px]" initialFocus={false}>
        <SheetHeader className="pb-3 pt-1">
          <SheetTitle className="text-center text-[15px] font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {multiline ? (
            <Textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="bg-muted/30 border-0 resize-none text-[15px] rounded-xl p-3 min-h-[100px]"
              autoFocus
            />
          ) : (
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              className="bg-muted/30 border-0 text-[15px] rounded-xl h-11"
              autoFocus
            />
          )}
          <div className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              className="flex-1 h-10 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave} className="flex-1 h-10 rounded-full">确定</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


// ========== 子组件：顶部导航栏 ==========

function TopNavBar({
  title,
  onBack,
  showMore,
  onTransfer,
  onConvert,
  canConvert,
  canTransfer,
}: {
  title: string
  onBack: () => void
  showMore: boolean
  onTransfer: () => void
  onConvert: () => void
  canConvert: boolean
  canTransfer: boolean
}) {
  if (!showMore) {
    return (
      <div className="flex-shrink-0 h-11 flex items-center justify-between px-4 border-b border-border/50 bg-background">
        <button onClick={onBack} className="flex items-center gap-0.5 text-primary min-w-[60px]">
          <ChevronLeft className="size-5" />
          <span className="text-[15px]">返回</span>
        </button>
        <h1 className="text-[16px] font-semibold absolute left-1/2 -translate-x-1/2 truncate max-w-[50%]">
          {title}
        </h1>
        <div className="min-w-[60px]" />
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 h-11 flex items-center justify-between px-4 border-b border-border/50 bg-background relative">
      <button onClick={onBack} className="flex items-center gap-0.5 text-primary min-w-[60px] z-10">
        <ChevronLeft className="size-5" />
        <span className="text-[15px]">返回</span>
      </button>
      <h1 className="text-[16px] font-semibold absolute left-1/2 -translate-x-1/2 truncate max-w-[40%]">
        {title}
      </h1>
      <div className="min-w-[60px] flex justify-end z-10">
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 text-foreground active:opacity-60">
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {canTransfer && (
              <DropdownMenuItem onClick={onTransfer}>
                <Repeat className="size-4 mr-2" />
                转让
              </DropdownMenuItem>
            )}
            {canConvert && (
              <DropdownMenuItem onClick={onConvert}>
                <ExternalLink className="size-4 mr-2" />
                转化为选题
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}


// ========== 子组件：基础信息区 ==========

function BasicInfoSection({ editData }: { editData: Benchmark }) {
  const statusInfo = statusConfig[editData.status]
  const sourceInfo = sourceChannelConfig[editData.sourceChannel]

  return (
    <div className="flex-shrink-0 px-5 py-4 bg-muted/10 border-b border-border/20">
      {/* 视频标题 */}
      <h2 className="text-[16px] font-semibold leading-snug truncate">
        {editData.title}
      </h2>

      {/* 状态 + 负责人 + 时间 */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className={cn("size-1.5 rounded-full", statusDotClass(editData.status))} />
          <span className="text-[11px] font-medium">{statusInfo.label}</span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="flex items-center gap-1">
          <User className="size-3" />
          {editData.assignee}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>{formatRelativeTime(editData.createdAt)}</span>
      </div>

      {/* 来源 + 链接 */}
      <div className="mt-2 flex items-center gap-1.5 text-[12px]">
        <span className="text-muted-foreground flex-shrink-0">{sourceInfo?.label}</span>
        <span className="text-muted-foreground/40 flex-shrink-0">·</span>
        <a
          href={editData.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-500 truncate hover:underline min-w-0"
        >
          <span className="truncate">{editData.videoUrl || "无链接"}</span>
          {editData.videoUrl && <ExternalLink className="size-3 flex-shrink-0" />}
        </a>
      </div>

      {/* 视频文案（120px 固定高度可滚动卡片，无标题标签） */}
      <div className="mt-3">
        <div className="h-[120px] overflow-y-auto rounded-[18px] bg-muted/30 p-4 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
          {editData.videoScript || <span className="text-muted-foreground/40">暂无文案</span>}
        </div>
      </div>
    </div>
  )
}


// ========== 子组件：维度 Tab 栏 ==========

function DimensionTabs({
  activeTab,
  onTabChange,
  completedMap,
}: {
  activeTab: DimensionKey
  onTabChange: (tab: DimensionKey) => void
  completedMap: Record<DimensionKey, boolean>
}) {
  return (
    <div className="flex-shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/20">
      <div className="flex overflow-x-auto scrollbar-hide">
        {DIMENSIONS.map((dim) => {
          const isActive = activeTab === dim.key
          const isCompleted = completedMap[dim.key]
          return (
            <button
              key={dim.key}
              onClick={() => onTabChange(dim.key)}
              className={cn(
                "flex-1 min-w-0 h-11 flex items-center justify-center gap-1 px-2 relative flex-shrink-0 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className={cn("text-[14px]", isActive && "font-semibold")}>
                {dim.label}
              </span>
              {isCompleted && (
                <Check className={cn("size-3", isActive ? "text-foreground" : "text-muted-foreground/50")} />
              )}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] bg-foreground rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}


// ========== 维度1：人群维度 ==========

function AudienceDimension({
  editData,
  isReadOnly,
  updateField,
}: {
  editData: Benchmark
  isReadOnly: boolean
  updateField: <K extends keyof Benchmark>(field: K, value: Benchmark[K]) => void
}) {
  const [editSheet, setEditSheet] = useState<{ key: keyof Benchmark; label: string } | null>(null)

  const fields: { key: keyof Benchmark; label: string; required?: boolean; placeholder: string }[] = [
    { key: "audienceIdentity", label: "身份", required: true, placeholder: "她是什么身份？" },
    { key: "audienceStage", label: "阶段", placeholder: "处在什么阶段？" },
    { key: "audienceGoal", label: "目标", placeholder: "想达成什么效果？" },
    { key: "audiencePainPoint", label: "卡点", placeholder: "卡在哪个环节？" },
    { key: "audienceEmotion", label: "情绪", placeholder: "情绪状态如何？" },
  ]

  return (
    <div className="space-y-4">
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">基本信息</span>
        </div>
        {fields.map((field, idx) => (
          <IOSListItem
            key={field.key}
            label={field.label}
            value={(editData[field.key] as string) || ""}
            placeholder={field.placeholder}
            required={field.required}
            isLast={idx === fields.length - 1}
            onClick={isReadOnly ? undefined : () => setEditSheet({ key: field.key, label: field.label })}
          />
        ))}
      </IOSGroupCard>

      {/* 编辑 Sheet */}
      {editSheet && (
        <IOSTextEditSheet
          open={!!editSheet}
          onOpenChange={(open) => !open && setEditSheet(null)}
          title={editSheet.label}
          value={(editData[editSheet.key] as string) || ""}
          placeholder="请输入"
          onSave={(val) => updateField(editSheet.key, val as any)}
        />
      )}
    </div>
  )
}


// ========== 维度2：需求维度 ==========

function NeedsDimension({
  editData,
  isReadOnly,
  updateField,
  setEditData,
}: {
  editData: Benchmark
  isReadOnly: boolean
  updateField: <K extends keyof Benchmark>(field: K, value: Benchmark[K]) => void
  setEditData: React.Dispatch<React.SetStateAction<Benchmark | null>>
}) {
  const [selectSheet, setSelectSheet] = useState<{
    key: keyof Benchmark
    label: string
    options: { value: string; label: string }[]
  } | null>(null)

  const [coreProblemSheetOpen, setCoreProblemSheetOpen] = useState(false)

  // 内容价值（多选，用 needsValues 数组存储，通过 any 访问）
  // 兼容旧数据：如果 needsValues 为空但 needsValue 有值，用 needsValue 初始化
  const rawNeedsValues: string[] = (editData as any).needsValues || []
  const needsValues: string[] = rawNeedsValues.length > 0
    ? rawNeedsValues
    : (editData.needsValue ? [editData.needsValue] : [])

  function toggleNeedsValue(value: string) {
    if (isReadOnly) return
    setEditData(prev => {
      if (!prev) return prev
      const rawValues = (prev as any).needsValues || []
      // 兼容旧数据：如果 needsValues 为空但 needsValue 有值，先迁移过来
      const current = rawValues.length > 0
        ? rawValues
        : ((prev as any).needsValue ? [(prev as any).needsValue] : [])
      const newValues = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value]
      const updated = { ...prev, needsValues: newValues } as any
      // 兼容旧字段 needsValue（取第一个）
      updated.needsValue = newValues.length > 0 ? newValues[0] : null
      return updated
    })
  }

  const needsTypeOptions = Object.entries(needsTypeConfig).map(([v, l]) => ({ value: v, label: l }))
  const needsCategoryOptions = Object.entries(needsCategoryConfig).map(([v, l]) => ({ value: v, label: l }))

  return (
    <div className="space-y-4">
      {/* 需求类型 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">需求类型</span>
        </div>
        <IOSListItem
          label="需求类型"
          value={editData.needsType ? needsTypeConfig[editData.needsType] : ""}
          placeholder="选择需求类型"
          isLast={true}
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "needsType",
            label: "需求类型",
            options: needsTypeOptions,
          })}
        />
      </IOSGroupCard>

      {/* 需求划分 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">需求划分</span>
        </div>
        <IOSListItem
          label="需求划分"
          value={editData.needsCategory ? needsCategoryConfig[editData.needsCategory] : ""}
          placeholder="选择需求划分"
          isLast={true}
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "needsCategory",
            label: "需求划分",
            options: needsCategoryOptions,
          })}
        />
      </IOSGroupCard>

      {/* 内容价值（多选开关） */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">内容价值（多选）</span>
        </div>
        {Object.entries(needsValueConfig).map(([value, label], idx, arr) => (
          <div
            key={value}
            className={cn(
              "flex items-center justify-between min-h-[44px] px-4",
              idx !== arr.length - 1 && "border-b border-border/40"
            )}
          >
            <span className="text-[15px] text-foreground">{label}</span>
            <Switch
              checked={needsValues.includes(value)}
              onCheckedChange={() => toggleNeedsValue(value)}
              disabled={isReadOnly}
            />
          </div>
        ))}
      </IOSGroupCard>

      {/* 一句话总结 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">一句话总结</span>
        </div>
        <div
          className={cn(
            "px-4 pb-3 pt-1 min-h-[80px]",
            !isReadOnly && "cursor-pointer active:bg-muted/30"
          )}
          onClick={() => !isReadOnly && setCoreProblemSheetOpen(true)}
        >
          <p className={cn(
            "text-[14px] leading-relaxed",
            editData.coreProblem ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {editData.coreProblem || "这个视频解决了用户的什么核心问题"}
          </p>
        </div>
      </IOSGroupCard>

      {/* 选择 Sheet */}
      {selectSheet && (
        <IOSSelectSheet
          open={!!selectSheet}
          onOpenChange={(open) => !open && setSelectSheet(null)}
          title={selectSheet.label}
          options={selectSheet.options}
          selectedValue={(editData[selectSheet.key] as string) || ""}
          onSelect={(val) => updateField(selectSheet.key, val as any)}
        />
      )}

      {/* 一句话总结编辑 Sheet */}
      <IOSTextEditSheet
        open={coreProblemSheetOpen}
        onOpenChange={setCoreProblemSheetOpen}
        title="一句话总结"
        value={editData.coreProblem || ""}
        placeholder="这个视频解决了用户的什么核心问题"
        onSave={(val) => updateField("coreProblem", val as any)}
        multiline
        rows={4}
      />
    </div>
  )
}


// ========== 维度3：内容维度 ==========

function ContentDimension({
  editData,
  isReadOnly,
  onStructureTypeChange,
  onPresentationFormChange,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onCreateStep,
}: {
  editData: Benchmark
  isReadOnly: boolean
  onStructureTypeChange: (type: StructureType) => void
  onPresentationFormChange: (v: string) => void
  onAddStep: () => void
  onRemoveStep: (index: number) => void
  onUpdateStep: (index: number, field: keyof StructureStep, value: string) => void
  onCreateStep: (step: StructureStep) => void
}) {
  const [selectSheet, setSelectSheet] = useState<{
    type: "presentationForm" | "structureType"
    label: string
    options: { value: string; label: string }[]
  } | null>(null)

  const [stepEditIndex, setStepEditIndex] = useState<number | null>(null)
  const [stepSheetOpen, setStepSheetOpen] = useState(false)
  const [stepTitle, setStepTitle] = useState("")
  const [stepContent, setStepContent] = useState("")

  const presentationOptions = Object.entries(presentationFormConfig).map(([v, l]) => ({ value: v, label: l }))
  const structureOptions = Object.entries(structureTypeConfig).map(([v, c]) => ({ value: v, label: c.label }))

  function openStepEdit(index: number) {
    const step = (editData.structureSteps || [])[index]
    if (step) {
      setStepTitle(step.stepName)
      setStepContent(step.content)
      setStepEditIndex(index)
      setStepSheetOpen(true)
    }
  }

  function openNewStep() {
    setStepTitle("")
    setStepContent("")
    setStepEditIndex(null)
    setStepSheetOpen(true)
  }

  function saveStep() {
    if (stepEditIndex !== null) {
      // 编辑现有步骤
      onUpdateStep(stepEditIndex, "stepName", stepTitle)
      onUpdateStep(stepEditIndex, "content", stepContent)
    } else {
      // 新增步骤
      onCreateStep({ stepName: stepTitle, content: stepContent })
    }
    setStepSheetOpen(false)
  }

  const steps = editData.structureSteps || []

  return (
    <div className="space-y-4">
      {/* 展现形式 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">展现形式</span>
        </div>
        <IOSListItem
          label="展现形式"
          value={editData.presentationForm ? presentationFormConfig[editData.presentationForm] : ""}
          placeholder="选择展现形式"
          isLast={true}
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            type: "presentationForm",
            label: "展现形式",
            options: presentationOptions,
          })}
        />
      </IOSGroupCard>

      {/* 结构类型 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">结构类型</span>
        </div>
        <IOSListItem
          label="结构类型"
          value={editData.structureType ? structureTypeConfig[editData.structureType]?.label : ""}
          placeholder="选择结构类型"
          required
          isLast={true}
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            type: "structureType",
            label: "结构类型",
            options: structureOptions,
          })}
        />
      </IOSGroupCard>

      {/* 结构步骤 */}
      <IOSGroupCard>
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">结构步骤</span>
          {!isReadOnly && (
            <button
              onClick={openNewStep}
              className="flex items-center gap-0.5 text-[12px] text-primary font-medium"
            >
              <Plus className="size-3.5" />
              添加步骤
            </button>
          )}
        </div>
        {steps.length > 0 ? (
          steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "px-4 py-3 flex items-center gap-2",
                index !== steps.length - 1 && "border-b border-border/40",
                !isReadOnly && "active:bg-muted/30 cursor-pointer"
              )}
              onClick={() => !isReadOnly && openStepEdit(index)}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-primary">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate">
                  {step.stepName || `步骤 ${index + 1}`}
                </p>
                {step.content && (
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                    {step.content}
                  </p>
                )}
              </div>
              {!isReadOnly && (
                <ChevronRight className="size-4 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          ))
        ) : (
          <div className="px-4 py-5 text-center">
            <p className="text-[13px] text-muted-foreground/60">
              选择结构类型后会自动加载步骤模板
            </p>
          </div>
        )}
        {!isReadOnly && steps.length > 0 && (
          <div className="px-4 py-2 border-t border-border/40">
            <button
              onClick={openNewStep}
              className="w-full flex items-center justify-center gap-1 text-[13px] text-primary py-2"
            >
              <Plus className="size-4" />
              添加步骤
            </button>
          </div>
        )}
      </IOSGroupCard>

      {/* 选择 Sheet */}
      {selectSheet && (
        <IOSSelectSheet
          open={!!selectSheet}
          onOpenChange={(open) => !open && setSelectSheet(null)}
          title={selectSheet.label}
          options={selectSheet.options}
          selectedValue={
            selectSheet.type === "presentationForm"
              ? editData.presentationForm || ""
              : editData.structureType || ""
          }
          onSelect={(val) => {
            if (selectSheet.type === "presentationForm") {
              onPresentationFormChange(val)
            } else {
              onStructureTypeChange(val as StructureType)
            }
          }}
        />
      )}

      {/* 步骤编辑 Sheet */}
      <Sheet open={stepSheetOpen} onOpenChange={setStepSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="!rounded-t-[18px]" initialFocus={false}>
          <SheetHeader className="pb-2 pt-1">
            <SheetTitle className="text-center text-[15px] font-semibold">
              {stepEditIndex !== null ? "编辑步骤" : "添加步骤"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-3">
            <div>
              <label className="text-[13px] text-muted-foreground mb-1.5 block">步骤标题</label>
              <Input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="输入步骤标题"
                className="bg-muted/30 border-0 text-[15px] rounded-xl h-11"
              />
            </div>
            <div>
              <label className="text-[13px] text-muted-foreground mb-1.5 block">指引 / 说明</label>
              <Textarea
                value={stepContent}
                onChange={(e) => setStepContent(e.target.value)}
                placeholder="拆解这一步的内容..."
                rows={4}
                className="bg-muted/30 border-0 resize-none text-[15px] rounded-xl p-3 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1 h-10 rounded-full"
                onClick={() => setStepSheetOpen(false)}
              >
                取消
              </Button>
              <Button onClick={saveStep} className="flex-1 h-10 rounded-full">保存</Button>
            </div>
            {stepEditIndex !== null && !isReadOnly && (
              <button
                onClick={() => {
                  onRemoveStep(stepEditIndex)
                  setStepSheetOpen(false)
                }}
                className="w-full py-2.5 text-[14px] text-destructive font-medium"
              >
                删除此步骤
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}


// ========== 维度4：自身维度 ==========

function SelfDimension({
  editData,
  isReadOnly,
  updateField,
}: {
  editData: Benchmark
  isReadOnly: boolean
  updateField: <K extends keyof Benchmark>(field: K, value: Benchmark[K]) => void
}) {
  const [selectSheet, setSelectSheet] = useState<{
    key: keyof Benchmark
    label: string
    options: { value: string; label: string }[]
  } | null>(null)

  const [textareaSheet, setTextareaSheet] = useState<{
    key: keyof Benchmark
    label: string
    placeholder: string
  } | null>(null)

  const doableOptions = Object.entries(doableConfig).map(([v, l]) => ({ value: v, label: l }))
  const thoroughOptions = Object.entries(thoroughConfig).map(([v, l]) => ({ value: v, label: l }))
  const diffLevelOptions = Object.entries(diffLevelConfig).map(([v, l]) => ({ value: v, label: l }))
  const competitionOptions = Object.entries(competitionConfig).map(([v, l]) => ({ value: v, label: l }))

  const isDoable = editData.doable === "doable"
  const isNotThorough = editData.thorough === "not_thorough"

  return (
    <div className="space-y-4">
      {/* 可行性 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">可行性</span>
        </div>
        <IOSListItem
          label="我做得到吗"
          value={editData.doable ? doableConfig[editData.doable] : ""}
          placeholder="选择可行性"
          required
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "doable",
            label: "我做得到吗",
            options: doableOptions,
          })}
          isLast={!isDoable}
        />
        {isDoable && (
          <div
            className={cn(
              "px-4 py-3 border-t border-border/40",
              !isReadOnly && "active:bg-muted/30 cursor-pointer"
            )}
            onClick={() => !isReadOnly && setTextareaSheet({
              key: "doableNote",
              label: "哪里能做到，哪里能借鉴",
              placeholder: "请输入...",
            })}
          >
            <p className="text-[13px] text-muted-foreground mb-1">哪里能做到，哪里能借鉴</p>
            <p className={cn(
              "text-[14px] leading-relaxed",
              editData.doableNote ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {editData.doableNote || "描述能做到和借鉴的地方"}
            </p>
          </div>
        )}
      </IOSGroupCard>

      {/* 需求深度 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">需求深度</span>
        </div>
        <IOSListItem
          label="需求解决透不透"
          value={editData.thorough ? thoroughConfig[editData.thorough] : ""}
          placeholder="选择透不透"
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "thorough",
            label: "需求解决透不透",
            options: thoroughOptions,
          })}
          isLast={!isNotThorough}
        />
        {isNotThorough && (
          <div
            className={cn(
              "px-4 py-3 border-t border-border/40",
              !isReadOnly && "active:bg-muted/30 cursor-pointer"
            )}
            onClick={() => !isReadOnly && setTextareaSheet({
              key: "thoroughNote",
              label: "哪里没讲透",
              placeholder: "请输入...",
            })}
          >
            <p className="text-[13px] text-muted-foreground mb-1">哪里没讲透</p>
            <p className={cn(
              "text-[14px] leading-relaxed",
              editData.thoroughNote ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {editData.thoroughNote || "描述没讲透的地方"}
            </p>
          </div>
        )}
      </IOSGroupCard>

      {/* 差异化 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">差异化</span>
        </div>
        <IOSListItem
          label="差异化层次"
          value={editData.diffLevel ? diffLevelConfig[editData.diffLevel] : ""}
          placeholder="选择层次"
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "diffLevel",
            label: "差异化层次",
            options: diffLevelOptions,
          })}
        />
        <IOSListItem
          label="竞争热度"
          value={editData.competition ? competitionConfig[editData.competition] : ""}
          placeholder="选择热度"
          isLast={true}
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "competition",
            label: "竞争热度",
            options: competitionOptions,
          })}
        />
      </IOSGroupCard>

      {/* 差异化机会 */}
      <IOSGroupCard>
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[13px] text-muted-foreground font-medium">差异化机会</span>
        </div>
        <div
          className={cn(
            "px-4 pb-3 pt-1 min-h-[100px]",
            !isReadOnly && "cursor-pointer active:bg-muted/30"
          )}
          onClick={() => !isReadOnly && setTextareaSheet({
            key: "diffOpportunity",
            label: "差异化机会",
            placeholder: "我能做得更好、换角度的具体点，如果是你来做你会怎么做？",
          })}
        >
          <p className={cn(
            "text-[14px] leading-relaxed",
            editData.diffOpportunity ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {editData.diffOpportunity || "我能做得更好、换角度的具体点，如果是你来做你会怎么做？"}
          </p>
        </div>
      </IOSGroupCard>

      {/* 选择 Sheet */}
      {selectSheet && (
        <IOSSelectSheet
          open={!!selectSheet}
          onOpenChange={(open) => !open && setSelectSheet(null)}
          title={selectSheet.label}
          options={selectSheet.options}
          selectedValue={(editData[selectSheet.key] as string) || ""}
          onSelect={(val) => updateField(selectSheet.key, val as any)}
        />
      )}

      {/* 文本编辑 Sheet */}
      {textareaSheet && (
        <IOSTextEditSheet
          open={!!textareaSheet}
          onOpenChange={(open) => !open && setTextareaSheet(null)}
          title={textareaSheet.label}
          value={(editData[textareaSheet.key] as string) || ""}
          placeholder={textareaSheet.placeholder}
          onSave={(val) => updateField(textareaSheet.key, val as any)}
          multiline
          rows={5}
        />
      )}
    </div>
  )
}


// ========== 子组件：底部操作栏 ==========

function BottomActionBar({
  progress,
  isLastDimension,
  onSave,
  onNext,
  onSubmit,
  isSaving,
  isSubmitting,
  canSubmit,
  show,
}: {
  progress: number
  isLastDimension: boolean
  onSave: () => void
  onNext: () => void
  onSubmit: () => void
  isSaving: boolean
  isSubmitting: boolean
  canSubmit: boolean
  show: boolean
}) {
  if (!show) return null

  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-2 border-t border-border/50 bg-background px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
      <div className="text-[12px] text-muted-foreground">
        已完成 {progress}/4 个维度
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || isSubmitting}
          className="h-9 px-4 rounded-full text-[13px] border-border"
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
        {isLastDimension ? (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSaving || isSubmitting || !canSubmit}
            className="h-9 px-5 rounded-full text-[13px] font-medium"
          >
            {isSubmitting ? "提交中..." : "提交拆解"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onNext}
            className="h-9 px-5 rounded-full text-[13px] font-medium"
          >
            下一步
          </Button>
        )}
      </div>
    </div>
  )
}


// ========== 主组件 ==========

interface BenchmarkWorkspaceProps {
  benchmark: Benchmark | null
  currentUser: string
  onUpdate: (id: string, updates: Partial<Benchmark>) => Promise<void>
  onTransfer: () => void
  onConvert: () => void
  onNext: () => void
  onBack: () => void
}

export function BenchmarkWorkspace({
  benchmark,
  currentUser,
  onUpdate,
  onTransfer,
  onConvert,
  onNext,
  onBack,
}: BenchmarkWorkspaceProps) {
  const router = useRouter()
  const [editData, setEditData] = useState<Benchmark | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<DimensionKey>("audience")
  const contentScrollRef = useRef<HTMLDivElement>(null)

  // 切换记录/状态变化/负责人变化时初始化本地编辑状态
  useEffect(() => {
    if (benchmark) {
      try {
        const draftKey = `benchmark-draft-${benchmark.id}`
        const draft = localStorage.getItem(draftKey)
        if (draft && benchmark.status !== "completed" && benchmark.status !== "converted") {
          const parsed = JSON.parse(draft)
          setEditData(parsed)
          toast.info("已恢复未保存的草稿")
        } else {
          setEditData(JSON.parse(JSON.stringify(benchmark)))
        }
      } catch {
        setEditData(JSON.parse(JSON.stringify(benchmark)))
      }
    } else {
      setEditData(null)
    }
    setActiveTab("audience")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benchmark?.id, benchmark?.status, benchmark?.assignee])

  const isAssignee = editData?.assignee === currentUser
  const isReadOnly = !isAssignee || editData?.status === "completed" || editData?.status === "converted"
  const isPending = editData?.status === "pending"
  const isCompleted = editData?.status === "completed"
  const isConverted = editData?.status === "converted"

  // 自动保存草稿到 localStorage
  useEffect(() => {
    if (!editData?.id || isReadOnly) return
    try {
      localStorage.setItem(`benchmark-draft-${editData.id}`, JSON.stringify(editData))
    } catch (e) {
      console.error("保存草稿失败:", e)
    }
  }, [editData, isReadOnly])

  // 清除草稿
  function clearDraft(id: string) {
    try {
      localStorage.removeItem(`benchmark-draft-${id}`)
    } catch (e) {
      console.error("清除草稿失败:", e)
    }
  }

  const progress = editData ? calculateProgress(editData) : 0

  // 更新单个字段
  const updateField = useCallback(<K extends keyof Benchmark>(field: K, value: Benchmark[K]) => {
    if (!editData || isReadOnly) return
    setEditData(prev => prev ? { ...prev, [field]: value } : null)
  }, [editData, isReadOnly])

  // 开始拆解
  async function handleStart() {
    if (!editData?.id) return
    try {
      await startDisassembly(editData.id)
      const updated = await getBenchmark(editData.id)
      if (updated) setEditData(JSON.parse(JSON.stringify(updated)))
      toast.success("开始拆解！")
    } catch (error) {
      toast.error("开始拆解失败")
      console.error(error)
    }
  }

  // 保存
  async function handleSave() {
    if (!editData?.id) return
    setIsSaving(true)
    try {
      await onUpdate(editData.id, editData)
      clearDraft(editData.id)
      toast.success("已保存")
    } catch (error) {
      toast.error("保存失败")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // 提交拆解
  async function handleSubmit() {
    if (!editData?.id) return
    if (!isAllDimensionsCompleted()) {
      toast.warning("请完成所有4个维度后再提交")
      return
    }
    setIsSubmitting(true)
    try {
      await onUpdate(editData.id, editData)
      await onUpdate(editData.id, {
        status: "completed" as BenchmarkStatus,
        disassemblyCompleteTime: Date.now(),
      })
      clearDraft(editData.id)
      const updated = await getBenchmark(editData.id)
      if (updated) setEditData(JSON.parse(JSON.stringify(updated)))
      toast.success("拆解已提交！")
    } catch (error) {
      toast.error("提交失败")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 下一步（切换到下一个维度 Tab）
  function handleNextDimension() {
    const currentIndex = DIMENSIONS.findIndex(d => d.key === activeTab)
    if (currentIndex < DIMENSIONS.length - 1) {
      setActiveTab(DIMENSIONS[currentIndex + 1].key)
      // 滚动到顶部
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0
      }
    }
  }

  function isStepCompleted(stepIndex: number): boolean {
    if (!editData) return false
    switch (stepIndex) {
      case 0: return !!(editData.audienceIdentity || "").trim()
      case 1: return !!(editData.coreProblem || "").trim()
      case 2: return !!(editData.structureType && (editData.structureSteps || []).length > 0)
      case 3: return !!editData.doable
      default: return false
    }
  }

  function isAllDimensionsCompleted(): boolean {
    return isStepCompleted(0) && isStepCompleted(1) && isStepCompleted(2) && isStepCompleted(3)
  }

  const completedMap: Record<DimensionKey, boolean> = {
    audience: isStepCompleted(0),
    needs: isStepCompleted(1),
    content: isStepCompleted(2),
    self: isStepCompleted(3),
  }

  const currentTabIndex = DIMENSIONS.findIndex(d => d.key === activeTab)
  const isLastDimension = currentTabIndex === DIMENSIONS.length - 1

  // 结构步骤操作函数
  function handleStructureTypeChange(type: StructureType) {
    if (!editData) return
    const config = structureTypeConfig[type]
    if (!config) return
    const steps = editData.structureSteps || []
    const shouldOverride =
      steps.length === 0 ||
      confirm(`切换为「${config.label}」结构，将加载默认步骤模板，是否继续？`)
    if (shouldOverride) {
      const newSteps: StructureStep[] = config.defaultSteps.map(stepName => ({
        stepName,
        content: "",
      }))
      setEditData({ ...editData, structureType: type, structureSteps: newSteps })
    }
  }

  function addStep() {
    if (!editData) return
    setEditData({
      ...editData,
      structureSteps: [...(editData.structureSteps || []), { stepName: "", content: "" }],
    })
  }

  function createStep(step: StructureStep) {
    if (!editData) return
    setEditData({
      ...editData,
      structureSteps: [...(editData.structureSteps || []), step],
    })
  }

  function removeStep(index: number) {
    if (!editData) return
    setEditData({
      ...editData,
      structureSteps: (editData.structureSteps || []).filter((_, i) => i !== index),
    })
  }

  function updateStep(index: number, field: keyof StructureStep, value: string) {
    if (!editData) return
    const newSteps = [...(editData.structureSteps || [])]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setEditData({ ...editData, structureSteps: newSteps })
  }

  // 空状态
  if (!editData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">从列表选择一条对标视频开始拆解</p>
      </div>
    )
  }

  const showBottomBar = !isPending && !isCompleted && !isConverted && !isReadOnly

  return (
    <div className="flex h-full flex-col bg-muted/10 lg:hidden">
      {/* 桌面端保留原样 - 隐藏移动端，显示桌面端 */}
      <div className="hidden lg:block h-full">
        <DesktopBenchmarkView
          editData={editData}
          isReadOnly={isReadOnly}
          isAssignee={isAssignee}
          isPending={isPending}
          isCompleted={isCompleted}
          isConverted={isConverted}
          currentUser={currentUser}
          onBack={onBack}
          onTransfer={onTransfer}
          onConvert={onConvert}
          onNext={onNext}
          onUpdate={onUpdate}
          progress={progress}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          handleSave={handleSave}
          handleSubmit={handleSubmit}
          handleStart={handleStart}
          isAllDimensionsCompleted={isAllDimensionsCompleted()}
          handleStructureTypeChange={handleStructureTypeChange}
          addStep={addStep}
          removeStep={removeStep}
          updateStep={updateStep}
          updateField={updateField}
        />
      </div>

      {/* 移动端 iOS 风格 */}
      <div className="flex flex-col h-full lg:hidden">
        {/* 1. 顶部导航栏 */}
        <TopNavBar
          title="对标拆解"
          onBack={onBack}
          showMore={isAssignee && editData.status !== "converted"}
          onTransfer={onTransfer}
          onConvert={onConvert}
          canConvert={isCompleted && isAssignee}
          canTransfer={isAssignee && editData.status !== "converted"}
        />

        {/* 2. 基础信息区 + 3. Tab 栏 + 4. 内容区（整体滚动，Tab 吸顶） */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 基础信息区（随内容滚动） */}
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto">
            {/* 基础信息 */}
            <BasicInfoSection editData={editData} />

            {/* 待拆解状态 */}
            {isPending && (
              <div className="px-4 py-8 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">基础信息已录入，点击「开始拆解」开始</p>
                {isAssignee ? (
                  <Button onClick={handleStart} size="lg" className="rounded-full px-8">
                    开始拆解
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    你不是负责人，无法拆解。请联系负责人 {editData.assignee}
                  </p>
                )}
              </div>
            )}

            {/* 拆解中/已完成状态：Tab + 内容 */}
            {!isPending && (
              <>
                {/* Tab 栏（sticky，iOS 毛玻璃吸顶） */}
                <div className="sticky top-0 z-10">
                  <DimensionTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    completedMap={completedMap}
                  />
                </div>

                {/* 内容区 */}
                <div className="px-5 py-4 pb-6">
                  {activeTab === "audience" && (
                    <AudienceDimension
                      editData={editData}
                      isReadOnly={isReadOnly}
                      updateField={updateField}
                    />
                  )}
                  {activeTab === "needs" && (
                    <NeedsDimension
                      editData={editData}
                      isReadOnly={isReadOnly}
                      updateField={updateField}
                      setEditData={setEditData}
                    />
                  )}
                  {activeTab === "content" && (
                    <ContentDimension
                      editData={editData}
                      isReadOnly={isReadOnly}
                      onStructureTypeChange={handleStructureTypeChange}
                      onPresentationFormChange={(v) => updateField("presentationForm", v as any)}
                      onAddStep={addStep}
                      onRemoveStep={removeStep}
                      onUpdateStep={updateStep}
                      onCreateStep={createStep}
                    />
                  )}
                  {activeTab === "self" && (
                    <SelfDimension
                      editData={editData}
                      isReadOnly={isReadOnly}
                      updateField={updateField}
                    />
                  )}

                  {/* 已转化状态提示 */}
                  {isConverted && (
                    <div className="mt-4 rounded-2xl bg-background p-4">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Check className="size-4 text-primary" />
                        已转化为选题/灵感
                      </p>
                      {editData.topicTitle && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          凝练选题：{editData.topicTitle}
                        </p>
                      )}
                      {editData.topicCopy && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          凝练文案：{editData.topicCopy}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground/60">
                        已转化是对标拆解的终态，不可再次转化。
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 5. 底部操作栏 */}
        <BottomActionBar
          progress={progress}
          isLastDimension={isLastDimension}
          onSave={handleSave}
          onNext={handleNextDimension}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          canSubmit={isAllDimensionsCompleted()}
          show={showBottomBar}
        />

        {/* 已完成/已转化状态：显示下一条 */}
        {(isCompleted || isConverted) && (
          <div className="flex-shrink-0 flex items-center justify-end border-t border-border/50 bg-background px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
            <Button variant="outline" size="sm" onClick={onNext} className="h-9 px-4 rounded-full text-[13px]">
              下一条
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


// ========== 桌面端视图（保留原有逻辑，简化版） ==========

function DesktopBenchmarkView({
  editData,
  isReadOnly,
  isAssignee,
  isPending,
  isCompleted,
  isConverted,
  onBack,
  onTransfer,
  onConvert,
  onNext,
  progress,
  isSaving,
  isSubmitting,
  handleSave,
  handleSubmit,
  handleStart,
  isAllDimensionsCompleted,
  handleStructureTypeChange,
  addStep,
  removeStep,
  updateStep,
  updateField,
}: {
  editData: Benchmark
  isReadOnly: boolean
  isAssignee: boolean
  isPending: boolean
  isCompleted: boolean
  isConverted: boolean
  currentUser: string
  onBack: () => void
  onTransfer: () => void
  onConvert: () => void
  onNext: () => void
  onUpdate: (id: string, updates: Partial<Benchmark>) => Promise<void>
  progress: number
  isSaving: boolean
  isSubmitting: boolean
  handleSave: () => void
  handleSubmit: () => void
  handleStart: () => void
  isAllDimensionsCompleted: boolean
  handleStructureTypeChange: (type: StructureType) => void
  addStep: () => void
  removeStep: (index: number) => void
  updateStep: (index: number, field: keyof StructureStep, value: string) => void
  updateField: <K extends keyof Benchmark>(field: K, value: Benchmark[K]) => void
}) {
  const statusInfo = statusConfig[editData.status]
  const sourceInfo = sourceChannelConfig[editData.sourceChannel]

  const dimensionConfigs = [
    {
      name: "人群维度",
      description: "这条视频是做给谁看的？",
      headerClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      fields: [
        { key: "audienceIdentity", label: "身份", hint: "她现在是一个什么样的身份？", required: true, type: "text" as const },
        { key: "audienceStage", label: "阶段", hint: "处在一个什么样的阶段？", type: "text" as const },
        { key: "audienceGoal", label: "目标", hint: "想要达成一个什么样的效果？", type: "text" as const },
        { key: "audiencePainPoint", label: "卡点", hint: "到底卡在了哪个环节上？", type: "text" as const },
        { key: "audienceEmotion", label: "情绪", hint: "她现在的情绪状态是怎么样的？", type: "text" as const },
      ],
    },
    {
      name: "需求维度",
      description: "这条视频解决了这些人群的什么问题？",
      headerClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      fields: [
        { key: "needsType", label: "需求类型", hint: "主动/被动/利他", type: "select" as const, options: needsTypeConfig },
        { key: "needsCategory", label: "需求划分", hint: "显性/隐性/情绪心理", type: "select" as const, options: needsCategoryConfig },
        { key: "needsValue", label: "内容价值", hint: "实用干货/情绪共鸣/认知提升", type: "select" as const, options: needsValueConfig },
        { key: "coreProblem", label: "一句话总结", hint: "这个视频解决了用户的什么核心问题", required: true, type: "textarea" as const },
      ],
    },
    {
      name: "内容维度",
      description: "解决了没有？用的什么方法？",
      headerClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      isContent: true,
    },
    {
      name: "自身维度",
      description: "从己出发我能不能用上它？",
      headerClass: "bg-green-500/10 text-green-600 dark:text-green-400",
      fields: [
        { key: "doable", label: "我做得到吗？", hint: "做得到可借鉴 / 做不到放弃", required: true, type: "select" as const, options: doableConfig },
        { key: "doableNote", label: "补充说明", hint: "哪里能做到 / 为什么做不到", type: "textarea" as const },
        { key: "thorough", label: "需求解决透不透？", hint: "很透可借鉴 / 不透有机会点", type: "select" as const, options: thoroughConfig },
        { key: "thoroughNote", label: "补充说明", hint: "哪里讲透了 / 哪里没讲透", type: "textarea" as const },
        { key: "diffLevel", label: "差异化层次", type: "select" as const, options: diffLevelConfig },
        { key: "competition", label: "竞争热度", type: "select" as const, options: competitionConfig },
        { key: "diffOpportunity", label: "差异化机会", hint: "我能做得更好、换角度的具体点", type: "textarea" as const },
      ],
    },
  ]

  function isStepCompleted(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: return !!(editData.audienceIdentity || "").trim()
      case 1: return !!(editData.coreProblem || "").trim()
      case 2: return !!(editData.structureType && (editData.structureSteps || []).length > 0)
      case 3: return !!editData.doable
      default: return false
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug">{editData.title}</h2>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("px-2 py-0.5 rounded-full text-[10px]", statusBadgeClass(editData.status))}>
                {statusInfo.label}
              </span>
              <span>{sourceInfo?.label}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {editData.assignee}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>{formatRelativeTime(editData.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {isAssignee && editData.status !== "converted" && (
              <Button size="sm" variant="ghost" onClick={onTransfer}>
                <Repeat className="size-3.5" />
                转让
              </Button>
            )}
            {isPending && isAssignee && (
              <Button size="sm" onClick={handleStart}>开始拆解</Button>
            )}
            {isCompleted && isAssignee && (
              <Button size="sm" onClick={onConvert}>
                <ExternalLink className="size-3.5" />
                转化为选题
              </Button>
            )}
          </div>
        </div>
        {/* 视频链接 + 文案 */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <a
            href={editData.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline truncate"
          >
            <ExternalLink className="size-3" />
            {editData.videoUrl}
          </a>
        </div>
        <div className="mt-2 max-h-32 overflow-y-auto rounded-md bg-muted/30 p-2.5 text-xs text-muted-foreground/80 whitespace-pre-wrap">
          {editData.videoScript}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isPending ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-sm text-muted-foreground">基础信息已录入，点击「开始拆解」开始</p>
            {isAssignee ? (
              <Button onClick={handleStart} size="lg">开始拆解</Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                你不是负责人，无法拆解。请联系负责人 {editData.assignee}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {dimensionConfigs.map((dim, index) => {
              const completed = isStepCompleted(index)
              return (
                <div key={index} className="overflow-hidden rounded-lg border">
                  <div className={cn("flex items-center justify-between px-4 py-2.5", dim.headerClass)}>
                    <div className="flex items-center gap-2">
                      {completed && <Check className="size-3.5" />}
                      <span className="text-sm font-semibold">{dim.name}</span>
                      <span className="text-xs opacity-60">{dim.description}</span>
                    </div>
                    <span className="text-xs opacity-70">
                      {completed ? "已完成" : "未完成"}
                    </span>
                  </div>
                  <div className="space-y-4 p-4">
                    {dim.isContent ? (
                      <DesktopContentDimension
                        editData={editData}
                        isReadOnly={isReadOnly}
                        onStructureTypeChange={handleStructureTypeChange}
                        onPresentationFormChange={(v) => updateField("presentationForm", v as any)}
                        onAddStep={addStep}
                        onRemoveStep={removeStep}
                        onUpdateStep={updateStep}
                      />
                    ) : (
                      (dim.fields as any[]).map((field: any) => (
                        <DesktopFieldRenderer
                          key={field.key}
                          field={field}
                          value={(editData as any)[field.key]}
                          isReadOnly={isReadOnly}
                          onChange={(v: string) => updateField(field.key as keyof Benchmark, v as any)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {isConverted && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Check className="size-4 text-primary" />
                  已转化为选题/灵感
                </p>
                {editData.topicTitle && (
                  <p className="mt-2 text-xs text-muted-foreground">凝练选题：{editData.topicTitle}</p>
                )}
                {editData.topicCopy && (
                  <p className="mt-1 text-xs text-muted-foreground">凝练文案：{editData.topicCopy}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {!isPending && !isCompleted && !isConverted && !isReadOnly && (
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t bg-muted/30 px-6 py-2.5">
          <div className="text-xs text-muted-foreground">进度 {progress}/4</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving || isSubmitting}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving || isSubmitting || !isAllDimensionsCompleted}
            >
              {isSubmitting ? "提交中..." : "提交拆解"}
            </Button>
            <Button variant="outline" size="sm" onClick={onNext}>
              下一条
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      {(isCompleted || isConverted) && (
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t bg-muted/30 px-6 py-2.5">
          <Button variant="outline" size="sm" onClick={onNext}>
            下一条
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}


// ========== 桌面端字段渲染器 ==========

function DesktopFieldRenderer({
  field,
  value,
  isReadOnly,
  onChange,
}: {
  field: { key: string; label: string; hint?: string; required?: boolean; type: "text" | "textarea" | "select"; options?: Record<string, string> }
  value: string | null
  isReadOnly: boolean
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {field.label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
        {field.hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{field.hint}</span>}
      </label>
      {field.type === "text" && (
        <Input value={value || ""} onChange={(e: any) => onChange(e.target.value)} disabled={isReadOnly} placeholder="点击填写" />
      )}
      {field.type === "textarea" && (
        <Textarea value={value || ""} onChange={(e: any) => onChange(e.target.value)} disabled={isReadOnly} placeholder="点击填写" rows={2} />
      )}
      {field.type === "select" && field.options && (
        <Select value={value || ""} onValueChange={(v: string | null) => onChange(v || "")} disabled={isReadOnly}>
          <SelectTrigger><SelectValue placeholder="点击选择" /></SelectTrigger>
          <SelectContent>
            {Object.entries(field.options).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}


// ========== 桌面端内容维度 ==========

function DesktopContentDimension({
  editData,
  isReadOnly,
  onStructureTypeChange,
  onPresentationFormChange,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
}: {
  editData: Benchmark
  isReadOnly: boolean
  onStructureTypeChange: (type: StructureType) => void
  onPresentationFormChange: (v: string) => void
  onAddStep: () => void
  onRemoveStep: (index: number) => void
  onUpdateStep: (index: number, field: keyof StructureStep, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          展现形式
          <span className="ml-2 text-xs font-normal text-muted-foreground">视频内容展现形式</span>
        </label>
        <Select value={editData.presentationForm || ""} onValueChange={(v: string | null) => onPresentationFormChange(v || "")} disabled={isReadOnly}>
          <SelectTrigger><SelectValue placeholder="点击选择" /></SelectTrigger>
          <SelectContent>
            {Object.entries(presentationFormConfig).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          结构类型
          <span className="ml-0.5 text-destructive">*</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">选择后自动加载步骤模板</span>
        </label>
        <Select value={editData.structureType || ""} onValueChange={(v: string | null) => onStructureTypeChange((v || "") as StructureType)} disabled={isReadOnly}>
          <SelectTrigger><SelectValue placeholder="点击选择" /></SelectTrigger>
          <SelectContent>
            {Object.entries(structureTypeConfig).map(([val, config]) => (
              <SelectItem key={val} value={val}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">结构步骤</label>
          {!isReadOnly && (
            <Button size="sm" variant="outline" onClick={onAddStep}>
              <Plus className="size-3.5" />
              添加
            </Button>
          )}
        </div>
        {(editData.structureSteps || []).map((step, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={step.stepName}
                onChange={(e: any) => onUpdateStep(index, "stepName", e.target.value)}
                disabled={isReadOnly}
                placeholder="步骤名称"
                className="font-medium"
              />
              {!isReadOnly && (
                <Button size="icon" variant="ghost" onClick={() => onRemoveStep(index)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <Textarea
              value={step.content}
              onChange={(e: any) => onUpdateStep(index, "content", e.target.value)}
              disabled={isReadOnly}
              placeholder="拆解这一步的内容..."
              rows={2}
            />
          </div>
        ))}
        {(editData.structureSteps || []).length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            选择结构类型后会自动加载步骤模板
          </p>
        )}
      </div>
    </div>
  )
}


// ========== 状态徽章样式 ==========

function statusBadgeClass(status: BenchmarkStatus): string {
  switch (status) {
    case "pending": return "bg-muted text-muted-foreground"
    case "in_progress": return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    case "completed": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "converted": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
    default: return ""
  }
}
