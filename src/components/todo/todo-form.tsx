"use client"

// ========== 导入区域 ==========
import { useState, useEffect } from "react"
import { db, type Todo, type Priority } from "@/lib/db"
import { newId, newSyncFields } from "@/lib/id"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAutoSave } from "@/hooks/use-auto-save"
import { toast } from "sonner"
import { sendNotification } from "@/lib/notification"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ChevronRight, Check } from "lucide-react"
import { zhCN } from "date-fns/locale"
import { format } from "date-fns"
import { WheelDatePicker } from "@/components/ui/wheel-date-picker"


// ========== 类型定义 ==========
interface TodoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}


// ========== 配置 ==========
const priorities = [
  { value: "P0", label: "P0 今天必须干完" },
  { value: "P1", label: "P1 今天应该干完" },
  { value: "P2", label: "P2 本周内完成" },
  { value: "P3", label: "P3 有空再做" },
] as const

const moduleOptions = [
  { value: "benchmark", label: "对标拆解" },
  { value: "topic", label: "选题库" },
  { value: "publish", label: "制作发布" },
] as const

const assigneeOptions = ["峰岚", "佳韵"]


// ========== 组件定义 ==========
export function TodoForm({ open, onOpenChange }: TodoFormProps) {
  const isMobile = useIsMobile()

  // ----- 表单状态 -----
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [initialPriority, setInitialPriority] = useState<Priority>("P2")
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [linkedModules, setLinkedModules] = useState<string[]>([])
  const [progressTargets, setProgressTargets] = useState<Record<string, string>>({})

  // 移动端选择 Sheet 状态
  const [prioritySheetOpen, setPrioritySheetOpen] = useState(false)
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false)
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false)
  const [dateSheetOpen, setDateSheetOpen] = useState(false)


  // ----- 全局自动保存 hook -----
  // 每次表单字段变化时自动保存到 localStorage，打开时恢复草稿
  const { loadDraft, clearDraft } = useAutoSave(
    "todo-form-draft",
    { title, description, initialPriority, assignee, dueDate, linkedModules, progressTargets },
    open
  )


  // ----- 打开时恢复草稿 -----
  useEffect(() => {
    if (open) {
      const draft = loadDraft()
      if (draft) {
        setTitle(draft.title || "")
        setDescription(draft.description || "")
        setInitialPriority(draft.initialPriority || "P2")
        setAssignee(draft.assignee || "")
        setDueDate(draft.dueDate || "")
        setLinkedModules(draft.linkedModules || [])
        setProgressTargets(draft.progressTargets || {})
        if (draft.title || draft.description) {
          toast.info("已恢复上次未完成的草稿")
        }
      } else {
        resetForm()
      }
    }
  }, [open, loadDraft])


  // ----- 清空表单 -----
  function resetForm() {
    setTitle("")
    setDescription("")
    setInitialPriority("P2")
    setAssignee("")
    setDueDate("")
    setLinkedModules([])
    setProgressTargets({})
  }


  // ----- 切换关联模块 -----
  function toggleModule(value: string) {
    setLinkedModules(prev => {
      if (prev.includes(value)) {
        // 取消选中时，移除对应的进度目标数
        setProgressTargets(prevT => {
          const next = { ...prevT }
          delete next[value]
          return next
        })
        return prev.filter(m => m !== value)
      } else {
        return [...prev, value]
      }
    })
  }


  // ----- 更新某个模块的进度目标数 -----
  function updateProgressTarget(module: string, value: string) {
    setProgressTargets(prev => ({
      ...prev,
      [module]: value
    }))
  }


  // ----- 保存 -----
  async function handleSave() {
    // 1. 验证必填字段
    if (!title.trim()) {
      toast.error("请输入任务名称")
      return
    }
    if (!description.trim()) {
      toast.error("请输入任务详细介绍")
      return
    }
    if (!assignee) {
      toast.error("请选择负责人")
      return
    }
    if (!dueDate) {
      toast.error("请选择截止日期")
      return
    }

    // 2. 验证关联模块的进度目标数
    for (const mod of linkedModules) {
      if (!progressTargets[mod]) {
        const label = moduleOptions.find(m => m.value === mod)?.label || mod
        toast.error(`请填写「${label}」的进度目标数`)
        return
      }
    }

    // 3. 处理截止日期
    const dueDateTimestamp = new Date(dueDate).getTime()

    // 4. 构造进度目标数和已完成数（Record 结构）
    const progressTargetsRecord: Record<string, number> = {}
    const progressCompletedRecord: Record<string, number> = {}
    const progressBaselineRecord: Record<string, number> = {}
    linkedModules.forEach(mod => {
      progressTargetsRecord[mod] = parseInt(progressTargets[mod], 10) || 0
      progressCompletedRecord[mod] = 0  // 初始已完成数为 0，系统会自动同步
    })

    // 4.1 记录对标模块的已完成数基准线（用于 delta 计算）
    if (linkedModules.includes("benchmark")) {
      const allBenchmarks = await db.benchmarks.toArray()
      const completedCount = allBenchmarks.filter(
        bm => bm.status === "completed" || bm.status === "converted"
      ).length
      progressBaselineRecord.benchmark = completedCount
    }

    // 4.2 记录选题库模块的总数基准线（新建一条选题 = +1 进度）
    if (linkedModules.includes("topic")) {
      const topicCount = await db.topics.count()
      progressBaselineRecord.topic = topicCount
    }

    // 5. 构造待办数据
    const now = Date.now()
    const todoData: Todo = {
      title: title.trim(),
      description: description.trim(),
      initialPriority,
      assignee,
      dueDate: dueDateTimestamp,
      linkedModules,
      progressTargets: progressTargetsRecord,
      status: "pending",
      source: "manual",
      progressCompleted: progressCompletedRecord,
      progressBaseline: progressBaselineRecord,
      linkedIds: {},
      creator: assignee,
      createdAt: now,
      completedAt: null,
      archived: false,
      ...newSyncFields(),
    }

    // 6. 保存到数据库
    const createdId = await db.todos.add(todoData)
    toast.success("任务已创建，已发送给负责人")

    // 7. 给负责人发通知
    await sendNotification({
      type: "todo",
      title: "你有一条新待办任务",
      content: `${assignee} 给你分配了任务：${title.trim()}`,
      relatedModule: "todo",
      relatedId: newId(),
      receiver: assignee,
    })

    // 8. 清除草稿
    clearDraft()

    // 9. 清空表单 + 关闭弹窗
    resetForm()
    onOpenChange(false)
  }


  // ----- 取消（关闭弹窗，草稿已自动保存） -----
  function handleCancel() {
    onOpenChange(false)
    // 不需要手动保存，useEffect 已经自动保存了
    toast.info("草稿已自动保存，下次打开可恢复")
  }


  // ===== 表单内容 =====
  const formContent = (
    <div className="space-y-4">

      {/* 任务名称（必填） */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">任务名称 *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="这是一条什么任务，要干什么"
        />
      </div>

      {/* 任务详细介绍（必填） */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">任务详细介绍 *</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="任务的详细描述、背景与产出要求"
          rows={3}
        />
      </div>

      {/* 初始优先级 + 负责人 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">初始优先级 *</label>
          <Select
            value={initialPriority}
            onValueChange={(v) => setInitialPriority(v as Priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorities.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">负责人 *</label>
          <Select value={assignee} onValueChange={(v) => setAssignee(v || "")}>
            <SelectTrigger>
              <SelectValue placeholder="选择负责人" />
            </SelectTrigger>
            <SelectContent>
              {assigneeOptions.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 截止日期 */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">截止日期 *</label>
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm hover:bg-accent">
            <CalendarIcon className="size-4 mr-2 text-muted-foreground" />
            {dueDate ? format(new Date(dueDate), "yyyy年MM月dd日", { locale: zhCN }) : <span className="text-muted-foreground">选择截止日期</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate ? new Date(dueDate) : undefined}
              onSelect={(date) => {
                setDueDate(date ? date.toISOString() : "")
                setDatePickerOpen(false)
              }}
              locale={zhCN}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 关联模块（多选） */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          关联模块 {linkedModules.length > 0 && `（已选 ${linkedModules.length} 个）`}
        </label>
        <div className="flex gap-2 flex-wrap">
          {moduleOptions.map(module => (
            <button
              key={module.value}
              type="button"
              onClick={() => toggleModule(module.value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                linkedModules.includes(module.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
              }`}
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>

      {/* 每个关联模块的进度目标数（独立显示） */}
      {linkedModules.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium block">进度目标数 *</label>
          {linkedModules.map(mod => {
            const modOption = moduleOptions.find(m => m.value === mod)
            return (
              <div key={mod} className="flex items-center gap-3">
                {/* 模块名称 */}
                <span className="text-sm text-muted-foreground w-20 flex-shrink-0">
                  {modOption?.label || mod}
                </span>
                {/* 目标数输入框 */}
                <Input
                  type="number"
                  value={progressTargets[mod] || ""}
                  onChange={(e) => updateProgressTarget(mod, e.target.value)}
                  placeholder={`输入${modOption?.label || ""}的目标数`}
                  className="flex-1"
                />
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">
            填写目标数后，已完成数将自动从关联模块同步（如对标拆解完成一条自动 +1）
          </p>
        </div>
      )}
    </div>
  )

  // ===== 底部按钮 =====
  // 按钮间距加大（gap-4），防止误碰
  const footerContent = (
    <div className="flex gap-4 justify-end">
      <Button variant="secondary" onClick={handleCancel}>
        取消
      </Button>
      <Button onClick={handleSave}>
        创建任务
      </Button>
    </div>
  )


  // ===== 响应式渲染 =====
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="rounded-t-[18px] max-h-[92vh] flex flex-col p-0" showCloseButton={false}>
            {/* 顶部导航栏 */}
            <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-border/30">
              <button
                onClick={handleCancel}
                className="text-sm font-medium text-foreground active:text-muted-foreground transition-colors"
              >
                取消
              </button>
              <span className="text-sm font-semibold">新建任务</span>
              <button
                onClick={handleSave}
                className="text-sm font-semibold text-foreground active:text-muted-foreground transition-colors"
              >
                创建
              </button>
            </div>

            {/* 表单内容 - 可滚动 */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* 分组1：基本信息 */}
              <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                <div className="h-11 px-4 flex items-center border-b border-border/20">
                  <span className="text-sm font-medium w-20 shrink-0">任务名称</span>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="请输入"
                    className="flex-1 border-0 bg-transparent h-auto p-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="px-4 py-3">
                  <span className="text-sm font-medium block mb-2">任务介绍</span>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="任务的详细描述、背景与产出要求"
                    rows={3}
                    className="border-0 bg-transparent p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  />
                </div>
              </div>

              {/* 分组2：任务设置 */}
              <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                {/* 优先级 */}
                <button
                  onClick={() => setPrioritySheetOpen(true)}
                  className="w-full h-11 px-4 flex items-center justify-between border-b border-border/20 active:bg-secondary/40 transition-colors"
                >
                  <span className="text-sm font-medium">优先级</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">
                      {priorities.find(p => p.value === initialPriority)?.label || "请选择"}
                    </span>
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </div>
                </button>
                {/* 负责人 */}
                <button
                  onClick={() => setAssigneeSheetOpen(true)}
                  className="w-full h-11 px-4 flex items-center justify-between border-b border-border/20 active:bg-secondary/40 transition-colors"
                >
                  <span className="text-sm font-medium">负责人</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">
                      {assignee || "请选择"}
                    </span>
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </div>
                </button>
                {/* 截止日期 */}
                <button
                  onClick={() => setDateSheetOpen(true)}
                  className="w-full h-11 px-4 flex items-center justify-between active:bg-secondary/40 transition-colors"
                >
                  <span className="text-sm font-medium">截止日期</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">
                      {dueDate ? format(new Date(dueDate), "MM月dd日", { locale: zhCN }) : "请选择"}
                    </span>
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </div>
                </button>
              </div>

              {/* 分组3：关联模块 */}
              <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                <button
                  onClick={() => setModuleSheetOpen(true)}
                  className="w-full h-11 px-4 flex items-center justify-between active:bg-secondary/40 transition-colors"
                >
                  <span className="text-sm font-medium">关联模块</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">
                      {linkedModules.length > 0 ? `已选 ${linkedModules.length} 个` : "未选择"}
                    </span>
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </div>
                </button>
              </div>

              {/* 分组4：进度目标数 */}
              {linkedModules.length > 0 && (
                <div className="bg-secondary/20 rounded-[18px] overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      进度目标数
                    </span>
                  </div>
                  {linkedModules.map((mod, idx) => {
                    const modOption = moduleOptions.find(m => m.value === mod)
                    const isLast = idx === linkedModules.length - 1
                    return (
                      <div
                        key={mod}
                        className={`h-11 px-4 flex items-center gap-3 ${
                          !isLast ? "border-b border-border/20" : ""
                        }`}
                      >
                        <span className="text-sm text-foreground w-20 flex-shrink-0">
                          {modOption?.label || mod}
                        </span>
                        <Input
                          type="number"
                          value={progressTargets[mod] || ""}
                          onChange={(e) => updateProgressTarget(mod, e.target.value)}
                          placeholder="目标数"
                          className="flex-1 border-0 bg-transparent h-auto p-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    )
                  })}
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                      填写目标数后，已完成数将自动从关联模块同步
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* 优先级选择 Sheet */}
        <Sheet open={prioritySheetOpen} onOpenChange={setPrioritySheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[18px] p-0" showCloseButton={false}>
            <div className="px-5 py-4 border-b border-border/30">
              <h3 className="text-base font-semibold text-center">选择优先级</h3>
            </div>
            <div className="px-5 py-2 space-y-1">
              {priorities.map(p => (
                <button
                  key={p.value}
                  onClick={() => {
                    setInitialPriority(p.value)
                    setPrioritySheetOpen(false)
                  }}
                  className={`w-full flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                    initialPriority === p.value
                      ? "bg-secondary/60"
                      : "active:bg-secondary/40"
                  }`}
                >
                  <span className="text-sm font-medium">{p.label}</span>
                  {initialPriority === p.value && (
                    <Check className="size-4 text-foreground" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
            <div className="px-5 pb-6 pt-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setPrioritySheetOpen(false)}
              >
                取消
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* 负责人选择 Sheet */}
        <Sheet open={assigneeSheetOpen} onOpenChange={setAssigneeSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[18px] p-0" showCloseButton={false}>
            <div className="px-5 py-4 border-b border-border/30">
              <h3 className="text-base font-semibold text-center">选择负责人</h3>
            </div>
            <div className="px-5 py-2 space-y-1">
              {assigneeOptions.map(name => (
                <button
                  key={name}
                  onClick={() => {
                    setAssignee(name)
                    setAssigneeSheetOpen(false)
                  }}
                  className={`w-full flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                    assignee === name
                      ? "bg-secondary/60"
                      : "active:bg-secondary/40"
                  }`}
                >
                  <span className="text-sm font-medium">{name}</span>
                  {assignee === name && (
                    <Check className="size-4 text-foreground" strokeWidth={2} />
                  )}
                </button>
              ))}
            </div>
            <div className="px-5 pb-6 pt-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setAssigneeSheetOpen(false)}
              >
                取消
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* 关联模块选择 Sheet */}
        <Sheet open={moduleSheetOpen} onOpenChange={setModuleSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[18px] p-0" showCloseButton={false}>
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <button
                onClick={() => setModuleSheetOpen(false)}
                className="text-sm font-medium text-foreground active:text-muted-foreground"
              >
                取消
              </button>
              <h3 className="text-sm font-semibold">关联模块</h3>
              <button
                onClick={() => setModuleSheetOpen(false)}
                className="text-sm font-semibold text-foreground active:text-muted-foreground"
              >
                完成
              </button>
            </div>
            <div className="px-5 py-2 space-y-1 max-h-[60vh] overflow-y-auto">
              {moduleOptions.map(mod => {
                const checked = linkedModules.includes(mod.value)
                return (
                  <button
                    key={mod.value}
                    onClick={() => toggleModule(mod.value)}
                    className={`w-full flex items-center justify-between py-3.5 px-3 rounded-xl transition-colors ${
                      checked ? "bg-secondary/60" : "active:bg-secondary/40"
                    }`}
                  >
                    <span className="text-sm font-medium">{mod.label}</span>
                    {checked && (
                      <Check className="size-4 text-foreground" strokeWidth={2} />
                    )}
                  </button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* 日期选择 Sheet */}
        <Sheet open={dateSheetOpen} onOpenChange={setDateSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[18px] p-0" showCloseButton={false}>
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <button
                onClick={() => setDateSheetOpen(false)}
                className="text-sm font-medium text-foreground active:text-muted-foreground"
              >
                取消
              </button>
              <h3 className="text-sm font-semibold">截止日期</h3>
              <button
                onClick={() => setDateSheetOpen(false)}
                className="text-sm font-semibold text-foreground active:text-muted-foreground"
              >
                完成
              </button>
            </div>
            <div className="px-5 py-2">
              <WheelDatePicker
                value={dueDate}
                onChange={(date) => setDueDate(date)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
          <DialogDescription>填写任务信息后点击创建，内容自动保存</DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
