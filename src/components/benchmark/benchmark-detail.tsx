"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, Plus, Check,
  ExternalLink, User, ChevronRight, ArrowRight,
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

// ========== 状态圆点颜色 ==========
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

// ========== 通用子组件：iOS 列表行 ==========
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
        "flex items-center min-h-11 px-4",
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
      <SheetContent side="bottom" showCloseButton={false} initialFocus={false}>
        <SheetHeader className="pb-2 pt-1">
          <SheetTitle className="text-center text-[17px] font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-5 pb-4 space-y-1">
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
                  "w-full flex items-center justify-between px-4 min-h-14 rounded-[14px] text-[17px] transition-colors",
                  isSelected
                    ? "bg-secondary/60 text-foreground font-medium"
                    : "active:bg-secondary/40 text-foreground bg-secondary/20"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-5" />}
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
      <SheetContent side="bottom" showCloseButton={false} initialFocus={false}>
        <SheetHeader className="pb-3 pt-1">
          <SheetTitle className="text-center text-[17px] font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-5 pb-4">
          {multiline ? (
            <Textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="bg-muted/30 border-0 resize-none text-[17px] rounded-xl p-4 min-h-[120px]"
              autoFocus
            />
          ) : (
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={placeholder}
              className="bg-muted/30 border-0 text-[17px] rounded-xl h-11"
              autoFocus
            />
          )}
          <div className="flex gap-3 mt-4">
            <Button
              variant="secondary"
              className="flex-1 h-11 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave} className="flex-1 h-11 rounded-full">确定</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ========== Section Header ==========
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-1.5">
      <span className="text-[13px] font-normal text-muted-foreground uppercase tracking-[0.06em]">
        {children}
      </span>
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
    <div className="space-y-5">
      <IOSGroupCard>
        <SectionHeader>目标人群画像</SectionHeader>
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

  // 内容价值（多选）
  const rawNeedsValues: string[] = (editData as any).needsValues || []
  const needsValues: string[] = rawNeedsValues.length > 0
    ? rawNeedsValues
    : (editData.needsValue ? [editData.needsValue] : [])

  function toggleNeedsValue(value: string) {
    if (isReadOnly) return
    setEditData(prev => {
      if (!prev) return prev
      const rawValues = (prev as any).needsValues || []
      const current = rawValues.length > 0
        ? rawValues
        : ((prev as any).needsValue ? [(prev as any).needsValue] : [])
      const newValues = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value]
      const updated = { ...prev, needsValues: newValues } as any
      updated.needsValue = newValues.length > 0 ? newValues[0] : null
      return updated
    })
  }

  const needsTypeOptions = Object.entries(needsTypeConfig).map(([v, l]) => ({ value: v, label: l }))
  const needsCategoryOptions = Object.entries(needsCategoryConfig).map(([v, l]) => ({ value: v, label: l }))

  return (
    <div className="space-y-5">
      {/* 需求类型 */}
      <IOSGroupCard>
        <SectionHeader>需求类型</SectionHeader>
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
        <SectionHeader>需求划分</SectionHeader>
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
        <SectionHeader>内容价值（多选）</SectionHeader>
        {Object.entries(needsValueConfig).map(([value, label], idx, arr) => (
          <div
            key={value}
            className={cn(
              "flex items-center justify-between min-h-11 px-4",
              idx !== arr.length - 1 && "border-b border-border/40"
            )}
          >
            <span className="text-[17px] text-foreground">{label}</span>
            <Switch
              checked={needsValues.includes(value)}
              onCheckedChange={() => toggleNeedsValue(value)}
              disabled={isReadOnly}
            />
          </div>
        ))}
      </IOSGroupCard>

      {/* 核心问题 */}
      <IOSGroupCard>
        <SectionHeader>核心问题</SectionHeader>
        <div
          className={cn(
            "px-4 py-3",
            !isReadOnly && "active:bg-muted/50 cursor-pointer"
          )}
          onClick={() => !isReadOnly && setCoreProblemSheetOpen(true)}
        >
          <p className="text-[13px] text-muted-foreground mb-1">一句话总结：解决什么核心问题</p>
          <p className={cn(
            "text-[15px] leading-relaxed",
            editData.coreProblem ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {editData.coreProblem || "描述核心问题"}
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
          selectedValue={editData[selectSheet.key] as string || undefined}
          onSelect={(val) => updateField(selectSheet.key, val as any)}
        />
      )}

      {/* 核心问题编辑 Sheet */}
      <IOSTextEditSheet
        open={coreProblemSheetOpen}
        onOpenChange={setCoreProblemSheetOpen}
        title="核心问题"
        value={editData.coreProblem}
        placeholder="一句话总结解决什么核心问题"
        multiline
        rows={4}
        onSave={(val) => updateField("coreProblem", val)}
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
      onUpdateStep(stepEditIndex, "stepName", stepTitle)
      onUpdateStep(stepEditIndex, "content", stepContent)
    } else {
      onCreateStep({ stepName: stepTitle, content: stepContent })
    }
    setStepSheetOpen(false)
  }

  const steps = editData.structureSteps || []

  return (
    <div className="space-y-5">
      {/* 展现形式 */}
      <IOSGroupCard>
        <SectionHeader>展现形式</SectionHeader>
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
        <SectionHeader>结构类型</SectionHeader>
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
          <span className="text-[13px] font-normal text-muted-foreground uppercase tracking-[0.06em]">
            结构步骤
          </span>
          {!isReadOnly && (
            <button
              onClick={openNewStep}
              className="flex items-center gap-0.5 text-[13px] text-primary font-medium"
            >
              <Plus className="size-4" />
              添加步骤
            </button>
          )}
        </div>
        {steps.length > 0 ? (
          steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "px-4 py-3",
                index !== steps.length - 1 && "border-b border-border/40",
                !isReadOnly && "active:bg-muted/50 cursor-pointer"
              )}
              onClick={() => !isReadOnly && openStepEdit(index)}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 size-6 flex items-center justify-center rounded-full bg-secondary/40 text-[12px] font-semibold text-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground leading-snug">
                    {step.stepName || `步骤 ${index + 1}`}
                  </p>
                  {step.content && (
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {step.content}
                    </p>
                  )}
                </div>
                {!isReadOnly && (
                  <ChevronRight className="size-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-[13px] text-muted-foreground/50">
            暂无步骤，点击上方添加
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
            selectSheet.type === "structureType"
              ? editData.structureType || undefined
              : editData.presentationForm || undefined
          }
          onSelect={(val) => {
            if (selectSheet.type === "structureType") {
              onStructureTypeChange(val as StructureType)
            } else {
              onPresentationFormChange(val)
            }
          }}
        />
      )}

      {/* 步骤编辑 Sheet */}
      <Sheet open={stepSheetOpen} onOpenChange={setStepSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} initialFocus={false}>
          <SheetHeader className="pb-3 pt-1">
            <SheetTitle className="text-center text-[17px] font-semibold">
              {stepEditIndex !== null ? "编辑步骤" : "新增步骤"}
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-4 space-y-3">
            <div>
              <label className="text-[13px] text-muted-foreground uppercase tracking-[0.06em]">步骤名称</label>
              <Input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="输入步骤名称"
                className="mt-1.5 bg-muted/30 border-0 text-[17px] rounded-xl h-11"
              />
            </div>
            <div>
              <label className="text-[13px] text-muted-foreground uppercase tracking-[0.06em]">步骤内容</label>
              <Textarea
                value={stepContent}
                onChange={(e) => setStepContent(e.target.value)}
                placeholder="描述这一步怎么做"
                rows={4}
                className="mt-1.5 bg-muted/30 border-0 resize-none text-[15px] rounded-xl p-4 min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1 h-11 rounded-full"
                onClick={() => setStepSheetOpen(false)}
              >
                取消
              </Button>
              <Button onClick={saveStep} className="flex-1 h-11 rounded-full">保存</Button>
            </div>
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
    <div className="space-y-5">
      {/* 可行性 */}
      <IOSGroupCard>
        <SectionHeader>可行性</SectionHeader>
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
              !isReadOnly && "active:bg-muted/50 cursor-pointer"
            )}
            onClick={() => !isReadOnly && setTextareaSheet({
              key: "doableNote",
              label: "哪里能做到，哪里能借鉴",
              placeholder: "请输入...",
            })}
          >
            <p className="text-[13px] text-muted-foreground mb-1">哪里能做到，哪里能借鉴</p>
            <p className={cn(
              "text-[15px] leading-relaxed",
              editData.doableNote ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {editData.doableNote || "描述能做到和借鉴的地方"}
            </p>
          </div>
        )}
      </IOSGroupCard>

      {/* 需求深度 */}
      <IOSGroupCard>
        <SectionHeader>需求深度</SectionHeader>
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
              !isReadOnly && "active:bg-muted/50 cursor-pointer"
            )}
            onClick={() => !isReadOnly && setTextareaSheet({
              key: "thoroughNote",
              label: "哪里没讲透",
              placeholder: "请输入...",
            })}
          >
            <p className="text-[13px] text-muted-foreground mb-1">哪里没讲透</p>
            <p className={cn(
              "text-[15px] leading-relaxed",
              editData.thoroughNote ? "text-foreground" : "text-muted-foreground/50"
            )}>
              {editData.thoroughNote || "描述没讲透的地方"}
            </p>
          </div>
        )}
      </IOSGroupCard>

      {/* 差异化 */}
      <IOSGroupCard>
        <SectionHeader>差异化</SectionHeader>
        <IOSListItem
          label="差异化层次"
          value={editData.diffLevel ? diffLevelConfig[editData.diffLevel] : ""}
          placeholder="选择层次"
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "diffLevel",
            label: "差异化层次",
            options: diffLevelOptions,
          })}
          isLast={false}
        />
        <IOSListItem
          label="竞争热度"
          value={editData.competition ? competitionConfig[editData.competition] : ""}
          placeholder="选择热度"
          onClick={isReadOnly ? undefined : () => setSelectSheet({
            key: "competition",
            label: "竞争热度",
            options: competitionOptions,
          })}
          isLast={true}
        />
      </IOSGroupCard>

      {/* 差异化机会 */}
      <IOSGroupCard>
        <SectionHeader>差异化机会</SectionHeader>
        <div
          className={cn(
            "px-4 py-3",
            !isReadOnly && "active:bg-muted/50 cursor-pointer"
          )}
          onClick={() => !isReadOnly && setTextareaSheet({
            key: "diffOpportunity",
            label: "差异化机会",
            placeholder: "描述差异化机会点",
          })}
        >
          <p className={cn(
            "text-[15px] leading-relaxed",
            editData.diffOpportunity ? "text-foreground" : "text-muted-foreground/50"
          )}>
            {editData.diffOpportunity || "描述差异化机会点"}
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
          selectedValue={editData[selectSheet.key] as string || undefined}
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
          multiline
          rows={4}
          onSave={(val) => updateField(textareaSheet.key, val)}
        />
      )}
    </div>
  )
}

// ========== 主组件：对标详情页（全屏） ==========

interface BenchmarkDetailProps {
  benchmark: Benchmark
  onBack: () => void
  onNext: () => void
  onTransfer: () => void
  onConvert: () => void
  onUpdate: (id: number, updates: Partial<Benchmark>) => void
}

export function BenchmarkDetail({
  benchmark,
  onBack,
  onNext,
  onTransfer,
  onConvert,
  onUpdate,
}: BenchmarkDetailProps) {
  const [editData, setEditData] = useState<Benchmark | null>(null)
  const [activeDim, setActiveDim] = useState<DimensionKey>("audience")
  const isReadOnly = false // 移动端直接编辑

  // 初始化数据
  useEffect(() => {
    setEditData({ ...benchmark })
    // 如果是待拆解状态，自动开始拆解
    if (benchmark.status === "pending") {
      startDisassembly(benchmark.id!).then(() => {
        onUpdate(benchmark.id!, { status: "in_progress" })
      })
    }
  }, [benchmark.id])

  const contentRef = useRef<HTMLDivElement>(null)

  // 更新字段
  const updateField = useCallback(<K extends keyof Benchmark>(field: K, value: Benchmark[K]) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (editData?.id) {
      updateBenchmark(editData.id, { [field]: value })
    }
  }, [editData?.id])

  // 结构步骤操作
  const handleStructureTypeChange = useCallback((type: StructureType) => {
    updateField("structureType", type)
  }, [updateField])

  const handlePresentationFormChange = useCallback((v: string) => {
    updateField("presentationForm", v as any)
  }, [updateField])

  const handleAddStep = useCallback(() => {
    // 通过 onAddStep 的替代实现
    setEditData(prev => {
      if (!prev) return prev
      const newSteps = [...(prev.structureSteps || []), { stepName: "", content: "" }]
      const updated = { ...prev, structureSteps: newSteps }
      if (updated.id) updateBenchmark(updated.id, { structureSteps: newSteps })
      return updated
    })
  }, [])

  const handleRemoveStep = useCallback((index: number) => {
    setEditData(prev => {
      if (!prev) return prev
      const newSteps = prev.structureSteps.filter((_, i) => i !== index)
      const updated = { ...prev, structureSteps: newSteps }
      if (updated.id) updateBenchmark(updated.id, { structureSteps: newSteps })
      return updated
    })
  }, [])

  const handleUpdateStep = useCallback((index: number, field: keyof StructureStep, value: string) => {
    setEditData(prev => {
      if (!prev) return prev
      const newSteps = [...prev.structureSteps]
      newSteps[index] = { ...newSteps[index], [field]: value }
      const updated = { ...prev, structureSteps: newSteps }
      if (updated.id) updateBenchmark(updated.id, { structureSteps: newSteps })
      return updated
    })
  }, [])

  const handleCreateStep = useCallback((step: StructureStep) => {
    setEditData(prev => {
      if (!prev) return prev
      const newSteps = [...(prev.structureSteps || []), step]
      const updated = { ...prev, structureSteps: newSteps }
      if (updated.id) updateBenchmark(updated.id, { structureSteps: newSteps })
      return updated
    })
  }, [])

  if (!editData) return null

  const statusInfo = statusConfig[editData.status]
  const sourceInfo = sourceChannelConfig[editData.sourceChannel]
  const progress = calculateProgress(editData)

  // 计算各维度完成状态
  const completedMap: Record<DimensionKey, boolean> = {
    audience: !!(editData.audienceIdentity && editData.audienceStage),
    needs: !!(editData.needsType && editData.coreProblem),
    content: !!(editData.structureType && editData.structureSteps && editData.structureSteps.length > 0),
    self: !!(editData.doable && editData.diffLevel),
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* 导航栏 */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 z-20">
        {/* 安全区 */}
        <div style={{ height: "env(safe-area-inset-top)" }} />
        <div className="h-11 flex items-center justify-between px-5 relative">
          <button
            onClick={onBack}
            className="flex items-center gap-0.5 text-primary min-w-[60px] z-10 active:opacity-60"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
            <span className="text-[17px]">返回</span>
          </button>
          <h1 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2 truncate max-w-[50%]">
            拆解详情
          </h1>
          <div className="min-w-[60px]" />
        </div>

        {/* 维度 Tab 吸顶 */}
        <div className="flex border-b border-border/30">
          {DIMENSIONS.map((dim) => {
            const isActive = activeDim === dim.key
            const isCompleted = completedMap[dim.key]
            return (
              <button
                key={dim.key}
                onClick={() => {
                  setActiveDim(dim.key)
                  contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className={cn(
                  "flex-1 min-w-0 h-11 flex items-center justify-center gap-1 px-1 relative flex-shrink-0 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className={cn("text-[13px]", isActive && "font-semibold")}>
                  {dim.label}
                </span>
                {isCompleted && (
                  <Check className={cn("size-3", isActive ? "text-foreground" : "text-muted-foreground/50")} />
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-foreground rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区 */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-5 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {/* 基础信息卡 */}
          <div className="rounded-[18px] bg-secondary/15 p-4 mb-5">
            {/* 标题 + 状态 */}
            <div className="flex items-start gap-2 mb-2">
              <span className={cn(
                "size-[9px] rounded-full mt-[7px] shrink-0",
                statusDotClass(editData.status)
              )} />
              <h2 className="flex-1 text-[17px] font-semibold leading-snug">
                {editData.title}
              </h2>
            </div>

            {/* 负责人 + 时间 */}
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground flex-wrap ml-[17px]">
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                {editData.assignee}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>{formatRelativeTime(editData.createdAt)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{sourceInfo?.label}</span>
            </div>

            {/* 进度 */}
            <div className="flex items-center gap-2 mt-3 ml-[17px]">
              <div className="flex items-center gap-[3px]">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={cn(
                      "size-[5px] rounded-full",
                      i < progress ? "bg-foreground" : "bg-muted-foreground/20"
                    )}
                  />
                ))}
              </div>
              <span className="text-[12px] text-muted-foreground">
                {statusInfo.label} · {progress}/4 维度
              </span>
            </div>

            {/* 视频链接 */}
            {editData.videoUrl && (
              <div className="mt-3 ml-[17px]">
                <a
                  href={editData.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] text-blue-500 truncate"
                >
                  <span className="truncate">查看原视频</span>
                  <ExternalLink className="size-3.5 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* 视频文案预览 */}
            {editData.videoScript && (
              <div className="mt-3 ml-[17px]">
                <p className="text-[13px] text-muted-foreground mb-1.5">视频文案</p>
                <p className="text-[14px] text-foreground/70 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {editData.videoScript}
                </p>
              </div>
            )}
          </div>

          {/* 维度内容 */}
          {activeDim === "audience" && (
            <AudienceDimension editData={editData} isReadOnly={isReadOnly} updateField={updateField} />
          )}
          {activeDim === "needs" && (
            <NeedsDimension editData={editData} isReadOnly={isReadOnly} updateField={updateField} setEditData={setEditData} />
          )}
          {activeDim === "content" && (
            <ContentDimension
              editData={editData}
              isReadOnly={isReadOnly}
              onStructureTypeChange={handleStructureTypeChange}
              onPresentationFormChange={handlePresentationFormChange}
              onAddStep={handleAddStep}
              onRemoveStep={handleRemoveStep}
              onUpdateStep={handleUpdateStep}
              onCreateStep={handleCreateStep}
            />
          )}
          {activeDim === "self" && (
            <SelfDimension editData={editData} isReadOnly={isReadOnly} updateField={updateField} />
          )}

          {/* 底部操作：转让/转化 */}
          <div className="mt-6 space-y-3">
            <Button
              variant="secondary"
              className="w-full h-11 rounded-full"
              onClick={onTransfer}
            >
              转让负责人
            </Button>
            <Button
              className="w-full h-11 rounded-full"
              onClick={onConvert}
            >
              转化为选题
            </Button>
          </div>
        </div>
      </div>

      {/* 底部固定：下一条 */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="px-5 py-3">
          <Button
            className="w-full h-11 rounded-full"
            onClick={onNext}
          >
            下一条
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
