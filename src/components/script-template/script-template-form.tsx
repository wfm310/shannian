"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { useAutoSave } from "@/hooks/use-auto-save"
import {
  createScriptTemplate, updateScriptTemplate,
  generatePresetSteps, frameworkTypeOptions, frameworkPresets,
} from "@/lib/script-template"
import type { ScriptTemplate, ScriptStep, FrameworkType } from "@/lib/db"
import { toast } from "sonner"
import { Plus, Trash2, GripVertical } from "lucide-react"


// ========== 类型定义 ==========
interface ScriptTemplateFormProps {
  open: boolean                                    // 弹窗是否打开
  onOpenChange: (open: boolean) => void             // 控制开关
  editing?: ScriptTemplate | null                  // 编辑模式：传了 = 编辑，不传 = 新建
  onSaved?: () => void                              // 保存成功回调
}


// ========== 组件定义 ==========
export function ScriptTemplateForm({ open, onOpenChange, editing, onSaved }: ScriptTemplateFormProps) {

  // ----- 表单状态 -----
  const [title, setTitle] = useState("")                         // 框架名称
  const [frameworkType, setFrameworkType] = useState<FrameworkType>("standard")  // 框架类型
  const [steps, setSteps] = useState<ScriptStep[]>([])           // 步骤数组
  const [isSubmitting, setIsSubmitting] = useState(false)        // 提交中

  // ----- 是否编辑模式 -----
  const isEditing = !!editing

  // ----- 自动保存（仅新建模式） -----
  const { loadDraft, clearDraft } = useAutoSave(
    "script-template-form-draft",
    { title, frameworkType, steps },
    open && !isEditing
  )

  // ----- 弹窗打开时初始化 -----
  useEffect(() => {
    if (!open) return

    if (isEditing && editing) {
      // 编辑模式：用现有数据填充
      setTitle(editing.title)
      setFrameworkType(editing.frameworkType)
      setSteps(editing.steps || [])
    } else {
      // 新建模式：尝试恢复草稿
      const draft = loadDraft()
      if (draft) {
        setTitle(draft.title || "")
        setFrameworkType(draft.frameworkType || "standard")
        setSteps(draft.steps || [])
        if (draft.title) toast.info("已恢复上次未完成的草稿")
      } else {
        // 没有草稿，清空 + 带出默认步骤
        setTitle("")
        setFrameworkType("standard")
        setSteps(generatePresetSteps("standard"))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  // ----- 切换框架类型：重新带出预设步骤 -----
  function handleTypeChange(type: FrameworkType) {
    setFrameworkType(type)
    setSteps(generatePresetSteps(type))
  }

  // ----- 更新步骤名 -----
  function updateStepName(stepId: number, name: string) {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, name } : s
    ))
  }

  // ----- 更新步骤指导说明 -----
  function updateStepGuidance(stepId: number, guidance: string) {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, guidance } : s
    ))
  }

  // ----- 添加步骤（清单盘点型常用） -----
  function addStep() {
    const newStep: ScriptStep = {
      id: Date.now(),
      name: `第${steps.length + 1}点`,
      guidance: "",
    }
    setSteps(prev => {
      // 插在"总结+引导"前面（如果有）
      const lastStep = prev[prev.length - 1]
      if (lastStep && lastStep.name.includes("总结")) {
        return [...prev.slice(0, -1), newStep, lastStep]
      }
      return [...prev, newStep]
    })
  }

  // ----- 删除步骤 -----
  function removeStep(stepId: number) {
    setSteps(prev => prev.filter(s => s.id !== stepId))
  }

  // ----- 保存 -----
  async function handleSave() {
    if (!title.trim()) {
      toast.error("请输入框架名称")
      return
    }
    if (steps.length === 0) {
      toast.error("至少需要1个步骤")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && editing?.id) {
        await updateScriptTemplate(editing.id, { title, steps })
      } else {
        await createScriptTemplate(title, frameworkType, steps)
        clearDraft()
      }
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ----- 取消 -----
  function handleCancel() {
    onOpenChange(false)
    if (!isEditing) {
      toast.info("草稿已自动保存，下次打开可恢复")
    }
  }


  // ===== 渲染 =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" initialFocus={false}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "编辑脚本框架" : "新建脚本框架"}</DialogTitle>
          <DialogDescription>
            选择框架类型后自动带出步骤，可修改步骤名和指导说明
          </DialogDescription>
        </DialogHeader>

        {/* 表单内容（可滚动） */}
        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">

          {/* 框架名称 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              框架名称 <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：职场妈妈时间管理干货"
            />
          </div>

          {/* 框架类型 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              框架类型 <span className="text-destructive">*</span>
            </label>
            {isEditing ? (
              // 编辑模式：类型只读
              <Badge variant="secondary">
                {frameworkPresets[frameworkType].label}
              </Badge>
            ) : (
              // 新建模式：可选
              <Select value={frameworkType} onValueChange={(v) => handleTypeChange(v as FrameworkType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frameworkTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {frameworkPresets[frameworkType].steps.length} 个步骤
              {frameworkType === "checklist" && "（可添加/删除步骤）"}
            </p>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">步骤与指导说明</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
              >
                <Plus className="size-3.5" />
                添加步骤
              </Button>
            </div>

            {steps.map((step, index) => (
              <div
                key={step.id}
                className="border rounded-lg p-3 space-y-2 bg-card"
              >
                {/* 步骤头部：序号 + 步骤名 + 删除按钮 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-6 flex-shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Input
                    value={step.name}
                    onChange={(e) => updateStepName(step.id, e.target.value)}
                    placeholder="步骤名称"
                    className="flex-1 h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.id)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
                {/* 指导说明 */}
                <Textarea
                  value={step.guidance}
                  onChange={(e) => updateStepGuidance(step.id, e.target.value)}
                  placeholder="这个步骤要做什么？给创作者的指导提示"
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : isEditing ? "保存修改" : "创建框架"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}