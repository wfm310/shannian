// ========== 内容生产流程 API ==========
// 提供任务的 CRUD 操作、阶段推进、框架关联等功能

import { db, type ProductionTask, type ProductionMode, type ProductionStage, type ProductionStatus, type ScriptStepContent, type ScriptStep } from "./db"
import { sendNotification } from "./notification"
import { syncProductionProgressToTodos } from "./progress-events"
import { toast } from "sonner"

// 当前登录用户（系统自动识别）
const CURRENT_USER = "峰岚"

// ========== 阶段配置 ==========

// 阶段顺序（固定，不可调整）
export const stageOrder: ProductionStage[] = [
  "topic", "script", "material", "editing", "handoff", "published"
]

// 阶段中文标签
export const stageLabels: Record<ProductionStage, string> = {
  topic: "选题确认",
  script: "脚本撰写",
  material: "素材制作",
  editing: "剪辑",
  handoff: "发布移交",
  published: "已发布",
}

// 状态中文标签
export const statusLabels: Record<ProductionStatus, string> = {
  active: "进行中",
  completed: "已完成",
}

// 模式中文标签
export const modeLabels: Record<ProductionMode, string> = {
  standard: "标准模式",
  impromptu: "即兴模式",
}


// ========== 1. 创建生产任务 ==========

export async function createProductionTask(
  mode: ProductionMode,
  topicId?: number
): Promise<number> {
  let title = ""
  let pendingStages: string[] = []

  if (mode === "standard") {
    // 标准模式：必须选择选题
    if (!topicId) {
      toast.error("请选择选题")
      throw new Error("选题不能为空")
    }
    const topic = await db.topics.get(topicId)
    if (!topic) {
      toast.error("选题不存在")
      throw new Error("选题不存在")
    }
    // 任务标题继承选题标题
    title = topic.topicTitle
    // 更新选题状态为"生产中"
    await db.topics.update(topicId, { status: "in_production" })
    pendingStages = []
  } else {
    // 即兴模式：标题默认"即兴创作"，首次保存文案时自动更新
    title = "即兴创作"
    pendingStages = ["topic", "framework"]
  }

  const now = Date.now()
  const startingStage = mode === "standard" ? "topic" : "script"
  const startingStageIndex = stageOrder.indexOf(startingStage)

  const id = await db.productions.add({
    title,
    mode,
    topicId: topicId || null,
    frameworkId: null,
    rawContent: "",
    scriptSteps: [],
    currentStage: startingStage,
    status: "active",
    pendingStages,
    assignee: CURRENT_USER,
    createdAt: now,
    publishedAt: null,
  })

  // 创建关联进度的待办（一条任务对应一条待办）
  const task = await db.productions.get(id)
  if (task) {
    await createProductionTodo(task, startingStageIndex)
  }

  // 发送通知
  await sendNotification({
    type: "module",
    title: "新建生产任务",
    content: `${title}（${modeLabels[mode]}）`,
    relatedModule: "production",
    relatedId: id as number,
    receiver: CURRENT_USER,
  })

  toast.success("生产任务已创建")
  return id as number
}


// ========== 2. 获取任务列表 ==========

export async function getProductionTasks(
  filter?: { status?: ProductionStatus | "all" }
): Promise<ProductionTask[]> {
  let list = await db.productions
    .orderBy("createdAt")
    .reverse()
    .toArray()

  if (filter?.status && filter.status !== "all") {
    list = list.filter(t => t.status === filter.status)
  }

  return list
}


// ========== 3. 获取单条任务 ==========

export async function getProductionTask(id: number): Promise<ProductionTask | undefined> {
  return db.productions.get(id)
}


// ========== 4. 更新任务 ==========

export async function updateProductionTask(
  id: number,
  updates: Partial<ProductionTask>
): Promise<void> {
  const task = await db.productions.get(id)
  if (!task) return

  // 即兴模式：首次保存文案时自动更新标题
  if (updates.rawContent !== undefined && task.mode === "impromptu" && task.title === "即兴创作") {
    const trimmed = updates.rawContent.trim()
    if (trimmed) {
      updates.title = trimmed.slice(0, 15)
    }
  }

  await db.productions.update(id, updates)
}


// ========== 5. 推进到下一阶段 ==========

export async function advanceStage(id: number): Promise<void> {
  const task = await db.productions.get(id)
  if (!task) {
    toast.error("任务不存在")
    throw new Error("任务不存在")
  }

  // 即兴模式拦截：从脚本撰写进入素材制作前，必须补填选题和框架
  if (task.mode === "impromptu" && task.currentStage === "script") {
    if (!task.topicId || !task.frameworkId) {
      toast.error("请先补填选题和脚本框架")
      throw new Error("待补填未完成")
    }
  }

  // 计算下一阶段
  const stageIndex = stageOrder.indexOf(task.currentStage)
  const nextStage = stageOrder[stageIndex + 1]
  if (!nextStage) {
    toast.error("已经在最后阶段")
    throw new Error("无法继续推进")
  }

  const now = Date.now()
  const updates: Partial<ProductionTask> = {
    currentStage: nextStage,
  }

  // 如果推进到"已发布"，设置完成状态
  if (nextStage === "published") {
    updates.publishedAt = now
    updates.status = "completed"
    // 更新选题状态为"已发布"
    if (task.topicId) {
      await db.topics.update(task.topicId, { status: "published" })
    }
  }

  await db.productions.update(id, updates)

  // 同步进度到待办
  await syncProductionProgressToTodos()

  // 发送通知
  await sendNotification({
    type: "module",
    title: "生产任务进入新阶段",
    content: `${task.title} → ${stageLabels[nextStage]}`,
    relatedModule: "production",
    relatedId: id,
    receiver: CURRENT_USER,
  })

  toast.success(`已进入「${stageLabels[nextStage]}」阶段`)
}


// ========== 5b. 返回上一阶段 ==========

export async function goBackStage(id: number): Promise<void> {
  const task = await db.productions.get(id)
  if (!task) {
    toast.error("任务不存在")
    throw new Error("任务不存在")
  }

  // 已完成任务不能回退
  if (task.status === "completed") {
    toast.error("已完成的任务不能回退")
    throw new Error("任务已完成")
  }

  const stageIndex = stageOrder.indexOf(task.currentStage)
  if (stageIndex <= 0) {
    toast.error("已经在第一阶段")
    throw new Error("无法继续回退")
  }

  const prevStage = stageOrder[stageIndex - 1]
  await db.productions.update(id, { currentStage: prevStage })

  // 同步进度到待办
  await syncProductionProgressToTodos()

  toast.success(`已回退到「${stageLabels[prevStage]}」阶段`)
}


// ========== 6. 关联框架（初始化步骤文案） ==========

export async function selectFramework(
  taskId: number,
  frameworkId: number
): Promise<void> {
  const framework = await db.scriptTemplates.get(frameworkId)
  if (!framework) {
    toast.error("框架不存在")
    throw new Error("框架不存在")
  }

  // 从框架步骤初始化文案步骤
  const scriptSteps: ScriptStepContent[] = framework.steps.map((step: ScriptStep) => ({
    stepId: step.id,
    stepName: step.name,
    guidance: step.guidance,
    content: "",
  }))

  const task = await db.productions.get(taskId)
  if (!task) throw new Error("任务不存在")

  const newPending = task.pendingStages.filter(s => s !== "framework")

  await db.productions.update(taskId, {
    frameworkId,
    scriptSteps,
    pendingStages: newPending,
  })

  toast.success("框架已关联")
}


// ========== 7. 即兴模式：创建并关联新选题 ==========

export async function createAndLinkTopic(
  taskId: number,
  topicTitle: string,
  rawContent: string
): Promise<void> {
  const trimmed = topicTitle.trim()
  if (!trimmed) {
    toast.error("请输入选题标题")
    throw new Error("选题标题不能为空")
  }

  const now = Date.now()
  // 创建最小选题（用户后续可在选题库补充详细信息）
  const topicId = await db.topics.add({
    topicTitle: trimmed,
    topicNote: "",
    creator: CURRENT_USER,
    createdAt: now,
    source: "manual",
    sourceId: null,
    audience: "",
    demand: "",
    contentDimension: "",
    copyReference: rawContent,
    copyReferenceLocked: true,
    positioningMatch: null,
    demandLevel: null,
    competition: null,
    contentPositioning: "",
    priorityScore: 0,
    priorityLevel: "reserve",
    status: "in_production",
    updatedAt: now,
  })

  // 关联到生产任务，移除 topic 从待补填列表
  const task = await db.productions.get(taskId)
  if (!task) throw new Error("任务不存在")

  const newPending = task.pendingStages.filter(s => s !== "topic")
  await db.productions.update(taskId, {
    topicId: topicId as number,
    pendingStages: newPending,
  })

  toast.success("选题已创建并关联")
}


// ========== 8. 删除任务 ==========

export async function deleteProductionTask(id: number): Promise<void> {
  const task = await db.productions.get(id)
  if (task?.topicId) {
    // 如果关联了选题，恢复选题状态为"待生产"
    await db.topics.update(task.topicId, { status: "pending_production" })
  }
  await db.productions.delete(id)
  toast.success("生产任务已删除")
}


// ========== 内部辅助函数 ==========

// 创建生产进度待办（一条任务对应一条待办，跟踪阶段进度）
async function createProductionTodo(
  task: ProductionTask,
  startingStageIndex: number
): Promise<void> {
  // 总阶段数 = 5（选题确认 → 脚本撰写 → 素材制作 → 剪辑 → 发布移交）
  // 即兴模式从脚本撰写开始，所以目标数 = 5 - startingStageIndex
  const totalStages = 5
  const target = totalStages - startingStageIndex

  await db.todos.add({
    title: `[内容生产] ${task.title}`,
    description: `推进5个阶段完成内容生产`,
    initialPriority: "P2",
    assignee: CURRENT_USER,
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    linkedModules: ["production"],
    linkedIds: { production: [task.id!] },
    progressTargets: { production: target },
    progressBaseline: { production: startingStageIndex },
    progressCompleted: { production: 0 },
    status: "in-progress",
    source: "production",
    creator: CURRENT_USER,
    createdAt: Date.now(),
    completedAt: null,
    archived: false,
  })
}
