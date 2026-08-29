// ========== 制作发布 API ==========
// 提供发布记录的 CRUD 操作、标签库管理、标题公式配置等功能

import { db, type PublishRecord, type PublishStatus, type TitleFormula, type TagCategory, type TagLibrary, type ProductionTask } from "./db"
import { newId, newSyncFields, touchSyncFields } from "./id"
import { sendNotification } from "./notification"
import { toast } from "sonner"

// 当前登录用户（系统自动识别）
const CURRENT_USER = "峰岚"

// ========== 标题公式配置 ==========

export const titleFormulaConfig: Record<TitleFormula, {
  label: string
  structure: string
  scenario: string
  example: string
}> = {
  T1: {
    label: "干货教学型",
    structure: "人群 + 痛点 + 解决方案暗示",
    scenario: "干货教学类",
    example: "带货新人别再乱选品了，这3步帮你避开90%的坑",
  },
  T2: {
    label: "纠错对比型",
    structure: "反常识/颠覆认知 + 悬念",
    scenario: "纠错对比类",
    example: "我劝你千万别做短视频带货……除非你看完这条",
  },
  T3: {
    label: "案例故事型",
    structure: "数字 + 结果 + 时间",
    scenario: "案例故事类",
    example: "7天出了第一单，我只做了这1件事",
  },
  T4: {
    label: "搜索SEO型",
    structure: "关键词前置 + 问题句式",
    scenario: "搜索SEO型",
    example: "短视频带货怎么选品？新手最容易忽略的1个细节",
  },
  T5: {
    label: "共鸣信任型",
    structure: "情绪共鸣 + 身份认同",
    scenario: "共鸣信任类",
    example: "做了3个月带货还没出单的人，我懂你的焦虑",
  },
}

// ========== 标签分类配置 ==========

export const tagCategoryConfig: Record<TagCategory, {
  label: string
  description: string
  position: string
}> = {
  track: {
    label: "赛道大词",
    description: "搜索量高，固定不变",
    position: "第1~2个",
  },
  content: {
    label: "内容精准词",
    description: "中等搜索量，匹配主题",
    position: "第3个",
  },
  audience: {
    label: "人群场景词",
    description: "锁定目标用户",
    position: "第4个",
  },
  hot: {
    label: "热点活动词",
    description: "有时效性，根据热点更换",
    position: "第5个",
  },
}

// 标签分类顺序（对应 3+1+1 结构）
export const tagCategoryOrder: TagCategory[] = ["track", "content", "audience", "hot"]

// ========== 状态标签 ==========

export const statusLabels: Record<PublishStatus, string> = {
  draft: "草稿",
  published: "已发布",
}


// ========== 1. 从生产任务创建发布记录 ==========

export async function createPublishRecord(productionId: string): Promise<string> {
  // 检查生产任务是否存在且已完成
  const task = await db.productions.get(productionId)
  if (!task) {
    toast.error("生产任务不存在")
    throw new Error("生产任务不存在")
  }
  if (task.status !== "completed") {
    toast.error("只能从已完成的生产任务创建")
    throw new Error("生产任务未完成")
  }

  // 检查是否已存在发布记录
  const existing = await db.publishRecords
    .where("productionId")
    .equals(productionId)
    .first()
  if (existing) {
    toast.error("该任务已有发布记录")
    throw new Error("发布记录已存在")
  }

  // 合并脚本步骤内容为完整文案
  let fullContent = ""
  if (task.scriptSteps && task.scriptSteps.length > 0) {
    fullContent = task.scriptSteps
      .map(step => {
        const header = step.stepName
        const body = step.content || ""
        return `${header}：\n${body}`
      })
      .join("\n\n")
  } else if (task.rawContent) {
    fullContent = task.rawContent
  }

  const now = Date.now()
  const id = newId()
  await db.publishRecords.add({
    id,
    productionId,
    title: task.title,
    titleFormula: null,
    description: "",
    hashtags: [],
    fullContent,
    publishTime: null,
    videoUrl: "",
    status: "draft",
    assignee: CURRENT_USER,
    createdAt: now,
    ...newSyncFields(),
    updatedAt: now,
  })

  // 发送通知
  await sendNotification({
    type: "module",
    title: "新建发布记录",
    content: `${task.title} → 草稿`,
    relatedModule: "publish",
    relatedId: id,
    receiver: CURRENT_USER,
  })

  toast.success("发布记录已创建")
  return id
}


// ========== 2. 获取发布记录列表 ==========

export async function getPublishRecords(
  filter?: { status?: PublishStatus | "all" }
): Promise<PublishRecord[]> {
  let list = await db.publishRecords
    .orderBy("createdAt")
    .reverse()
    .toArray()

  if (filter?.status && filter.status !== "all") {
    list = list.filter(r => r.status === filter.status)
  }

  return list
}


// ========== 3. 获取单条发布记录 ==========

export async function getPublishRecord(id: string): Promise<PublishRecord | undefined> {
  return db.publishRecords.get(id)
}


// ========== 4. 更新发布记录 ==========

export async function updatePublishRecord(
  id: string,
  updates: Partial<PublishRecord>
): Promise<void> {
  const record = await db.publishRecords.get(id)
  if (!record) return

  await db.publishRecords.update(id, {
    ...updates,
    ...touchSyncFields(record.syncVersion || 0),
  })
}


// ========== 5. 标记为已发布 ==========

export async function markAsPublished(
  id: string,
  videoUrl: string
): Promise<void> {
  const record = await db.publishRecords.get(id)
  if (!record) {
    toast.error("记录不存在")
    throw new Error("记录不存在")
  }

  if (!videoUrl.trim()) {
    toast.error("请填写视频链接")
    throw new Error("视频链接不能为空")
  }

  const now = Date.now()
  await db.publishRecords.update(id, {
    status: "published",
    videoUrl: videoUrl.trim(),
    publishTime: record.publishTime || now,
    ...touchSyncFields(record.syncVersion || 0),
  })

  // 发送通知
  await sendNotification({
    type: "module",
    title: "内容已发布",
    content: `${record.title} → 已发布`,
    relatedModule: "publish",
    relatedId: id,
    receiver: CURRENT_USER,
  })

  toast.success("已标记为发布")
}


// ========== 6. 获取待发布的生产任务 ==========

// 注意：本项目全局无删除功能，发布记录不做删除

// 返回已完成但还没有发布记录的生产任务
export async function getPendingProductions(): Promise<ProductionTask[]> {
  const completedTasks = await db.productions
    .filter(t => t.status === "completed")
    .reverse()
    .sortBy("createdAt")

  // 获取所有已有发布记录的 productionId
  const allRecords = await db.publishRecords.toArray()
  const hasRecordIds = new Set(allRecords.map(r => r.productionId))

  // 过滤掉已有发布记录的
  return completedTasks.filter(t => !hasRecordIds.has(t.id!))
}


// ========== 标签库 API ==========

// ========== 8. 获取标签列表 ==========

export async function getTags(category?: TagCategory): Promise<TagLibrary[]> {
  let list = await db.tagLibrary.toArray()

  if (category) {
    list = list.filter(t => t.category === category)
  }

  // 按使用次数降序排序
  return list.sort((a, b) => b.usageCount - a.usageCount)
}


// ========== 9. 添加标签 ==========

export async function addTag(tag: string, category: TagCategory): Promise<string> {
  const trimmed = tag.trim()
  if (!trimmed) {
    toast.error("标签不能为空")
    throw new Error("标签不能为空")
  }

  // 检查是否已存在（同分类下同名）
  const existing = await db.tagLibrary
    .filter(t => t.tag === trimmed && t.category === category)
    .first()
  if (existing) {
    toast.error("该分类下已存在此标签")
    throw new Error("标签已存在")
  }

  const id = newId()
  await db.tagLibrary.add({
    id,
    tag: trimmed,
    category,
    usageCount: 0,
    ...newSyncFields(),
    createdAt: Date.now(),
  })

  toast.success("标签已添加")
  return id
}


// ========== 10. 批量增加标签使用次数 ==========

// 注意：本项目全局无删除功能
// 原有的删除标签（deleteTag）已移除
// 不用的标签不再显示即可，不做删除

// 发布记录保存时，把选中的标签使用次数 +1
export async function incrementTagUsage(tags: string[]): Promise<void> {
  const allTags = await db.tagLibrary.toArray()
  for (const tagText of tags) {
    const match = allTags.find(t => t.tag === tagText)
    if (match && match.id) {
      await db.tagLibrary.update(match.id, {
        usageCount: match.usageCount + 1,
        ...touchSyncFields(match.syncVersion || 0),
      })
    }
  }
}