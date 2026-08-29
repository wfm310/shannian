// ========== 脚本框架库 API ==========
// 提供 CRUD 操作和 5 种框架的预设步骤配置

import { db, type ScriptTemplate, type ScriptStep, type FrameworkType } from "./db"
import { toast } from "sonner"

// 当前登录用户（系统自动识别）
const CURRENT_USER = "峰岚"


// ========== 5 种框架预设步骤 ==========

// 每种框架类型对应的中文标签和默认步骤
// 选类型后自动带出这些步骤，用户可以改步骤名和指导说明
export const frameworkPresets: Record<FrameworkType, {
  label: string                                           // 中文标签
  steps: { name: string; guidance: string }[]            // 默认步骤
}> = {
  // 标准干货型：教方法、讲流程
  standard: {
    label: "标准干货型",
    steps: [
      { name: "抛观点", guidance: "开头痛点引入，3秒内抛出核心观点，抓住注意力" },
      { name: "举例佐证", guidance: "用真实案例或数据支撑观点，增加可信度" },
      { name: "给方法", guidance: "给出具体可操作的方法或步骤，让观众能直接用" },
      { name: "引导", guidance: "引导关注、点赞或评论，给出行动指令" },
    ],
  },
  // 故事案例型：讲学员案例、自己踩坑经历
  story: {
    label: "故事案例型",
    steps: [
      { name: "抛悬念/场景", guidance: "用一个悬念或场景开头，引发好奇" },
      { name: "展开冲突", guidance: "展开故事中的矛盾或困境，制造紧张感" },
      { name: "揭示转折/方法", guidance: "揭示转折点，给出解决方法或启示" },
      { name: "引导", guidance: "引导关注、点赞或评论，给出行动指令" },
    ],
  },
  // 纠错对比型："90%的人都做错了"类内容
  correction: {
    label: "纠错对比型",
    steps: [
      { name: "展示错误做法", guidance: "先展示大多数人常犯的错误，引起共鸣" },
      { name: "为什么错", guidance: "分析错误的原因，解释背后的逻辑" },
      { name: "正确做法", guidance: "给出正确的做法，对比突出差异" },
      { name: "引导", guidance: "引导关注、点赞或评论，给出行动指令" },
    ],
  },
  // 清单盘点型："选品的5个标准""3个必知工具"类
  checklist: {
    label: "清单盘点型",
    steps: [
      { name: "抛主题", guidance: "抛出盘点主题，说明价值（如'选品的5个标准'）" },
      { name: "第1点", guidance: "第一个要点，简洁有力" },
      { name: "第2点", guidance: "第二个要点，简洁有力" },
      { name: "第3点", guidance: "第三个要点，简洁有力" },
      { name: "总结+引导", guidance: "总结盘点内容，引导关注或行动" },
    ],
  },
  // 问答拆解型：回应评论区高频问题
  qa: {
    label: "问答拆解型",
    steps: [
      { name: "模拟提问", guidance: "模拟观众高频问题，引起共鸣" },
      { name: "分析原因", guidance: "分析为什么会出现这个问题，挖掘深层原因" },
      { name: "给解答", guidance: "给出具体解答和可操作建议" },
      { name: "引导", guidance: "引导关注、点赞或评论，给出行动指令" },
    ],
  },
}

// 框架类型选项（给 Select 组件用）
export const frameworkTypeOptions: { value: FrameworkType; label: string }[] = [
  { value: "standard", label: "标准干货型" },
  { value: "story", label: "故事案例型" },
  { value: "correction", label: "纠错对比型" },
  { value: "checklist", label: "清单盘点型" },
  { value: "qa", label: "问答拆解型" },
]


// ========== 1. 创建脚本框架 ==========

export async function createScriptTemplate(
  title: string,
  frameworkType: FrameworkType,
  steps: ScriptStep[]
): Promise<number> {
  const trimmed = title.trim()
  if (!trimmed) {
    toast.error("请输入框架名称")
    throw new Error("框架名称不能为空")
  }
  if (steps.length === 0) {
    toast.error("至少需要1个步骤")
    throw new Error("步骤不能为空")
  }

  const now = Date.now()
  const id = await db.scriptTemplates.add({
    title: trimmed,
    frameworkType,
    steps,
    creator: CURRENT_USER,
    createdAt: now,
    updatedAt: now,
  })

  toast.success("脚本框架已创建")
  return id as number
}


// ========== 2. 获取框架列表 ==========

// 支持按类型筛选，按更新时间倒序（最近修改的在前）
export async function getScriptTemplates(
  params?: { frameworkType?: FrameworkType }
): Promise<ScriptTemplate[]> {
  let list = await db.scriptTemplates
    .orderBy("updatedAt")
    .reverse()
    .toArray()

  if (params?.frameworkType) {
    list = list.filter(t => t.frameworkType === params.frameworkType)
  }

  return list
}


// ========== 3. 获取单条框架 ==========

export async function getScriptTemplate(id: number): Promise<ScriptTemplate | undefined> {
  return db.scriptTemplates.get(id)
}


// ========== 4. 更新框架 ==========

export async function updateScriptTemplate(
  id: number,
  updates: { title?: string; steps?: ScriptStep[] }
): Promise<void> {
  if (updates.title !== undefined && !updates.title.trim()) {
    toast.error("框架名称不能为空")
    throw new Error("框架名称不能为空")
  }

  await db.scriptTemplates.update(id, {
    ...updates,
    title: updates.title?.trim() || undefined,
    updatedAt: Date.now(),
  })

  toast.success("脚本框架已更新")
}


// ========== 5. 删除框架 ==========

export async function deleteScriptTemplate(id: number): Promise<void> {
  await db.scriptTemplates.delete(id)
  toast.success("脚本框架已删除")
}


// ========== 6. 根据类型生成预设步骤 ==========

// 选了框架类型后，自动带出默认步骤（带唯一ID）
export function generatePresetSteps(type: FrameworkType): ScriptStep[] {
  const preset = frameworkPresets[type]
  const now = Date.now()
  return preset.steps.map((step, index) => ({
    id: now + index,        // 时间戳+索引，保证唯一
    name: step.name,
    guidance: step.guidance,
  }))
}