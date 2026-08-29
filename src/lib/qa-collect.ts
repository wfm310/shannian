// ========== 问答收集 API ==========
// 封装所有问答收集操作，页面组件只调 API 不直接碰数据库
// 和 flash-thought.ts、benchmark.ts 是同一个模式

// 导入数据库实例和类型
import { db, type QaQuestion, type QaAnswer, type QaStatus, type QaSource } from "./db"
// 导入 UUID 生成函数
import { newId, newSyncFields, touchSyncFields } from "./id"
// 导入 toast 提示
import { toast } from "sonner"
// 导入通知发送函数
import { sendNotification } from "./notification"

// 当前用户（和其他模块保持一致，系统自动识别）
const CURRENT_USER = "峰岚"


// ========== 1. 创建问答 ==========
// 参数：问题内容 + 问题来源
// 返回：新创建的问答 ID
export async function createQuestion(
  content: string,
  source: QaSource,
  initialAnswer?: string
): Promise<string> {
  // 去除首尾空格
  const trimmed = content.trim()
  if (!trimmed) {
    toast.error("问题内容不能为空")
    throw new Error("问题内容不能为空")
  }

  // 如果有初始答案（闪念归类联动），构造答案数组
  const answers: QaAnswer[] = []
  let status: QaStatus = "unanswered"
  if (initialAnswer && initialAnswer.trim()) {
    answers.push({
      id: newId(),               // 答案唯一ID（UUID）
      content: initialAnswer.trim(),  // 答案内容
      creator: CURRENT_USER,    // 答案创建人
      topicId: null,            // 转选题前为 null
      createdAt: Date.now(),    // 创建时间
      ...newSyncFields(),
    })
    status = "answered"  // 有答案就不是"待回答"了
  }

  // 写入数据库
  const id = newId()
  await db.qaQuestions.add({
    id,
    content: trimmed,        // 问题内容
    source,                  // 问题来源
    creator: CURRENT_USER,   // 创建人，系统自动识别
    answers,                 // 答案列表（可能含初始答案）
    status,                  // 状态：有初始答案为"已回答"，否则"待回答"
    createdAt: Date.now(),   // 创建时间
    processedAt: null,        // 处理时间初始为 null
    ...newSyncFields(),
  })

  toast.success("问答已创建")
  return id
}


// ========== 2. 获取问答列表 ==========
// 按创建时间倒序（最新的在最前）
// 支持按状态筛选
export async function getQuestions(params?: {
  status?: QaStatus
}): Promise<QaQuestion[]> {
  // orderBy("createdAt") → 按创建时间排序
  // reverse() → 倒序，最新的在前
  let list = await db.qaQuestions
    .orderBy("createdAt")
    .reverse()
    .toArray()

  // 如果传了状态参数，过滤出对应状态的问答
  if (params?.status) {
    list = list.filter(q => q.status === params.status)
  }

  return list
}


// ========== 3. 获取单条问答 ==========
// 用于打开详情弹窗时获取完整数据（含答案列表）
export async function getQuestion(id: string): Promise<QaQuestion | undefined> {
  return db.qaQuestions.get(id)
}


// ========== 4. 添加答案 ==========
// 在已有问答中追加一条新答案
// 答案创建后只读，不可编辑或删除
// 如果问题状态是"待回答"，添加答案后自动变为"已回答"
export async function addAnswer(questionId: string, content: string): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) {
    toast.error("答案内容不能为空")
    throw new Error("答案内容不能为空")
  }

  // 先拿到当前问答数据
  const question = await db.qaQuestions.get(questionId)
  if (!question) {
    toast.error("问答不存在")
    throw new Error("问答不存在")
  }

  // 构造新答案对象
  const newAnswer: QaAnswer = {
    id: newId(),             // 答案唯一ID（UUID），用于追溯和关联选题
    content: trimmed,         // 答案内容
    creator: CURRENT_USER,    // 答案创建人，系统自动识别
    topicId: null,            // 转选题前为 null
    createdAt: Date.now(),    // 创建时间
    ...newSyncFields(),
  }

  // 把新答案追加到 answers 数组末尾
  // 注意：要用展开运算符创建新数组，否则 Dexie 可能检测不到变化
  const updatedAnswers = [...(question.answers || []), newAnswer]

  // 更新数据库
  // 如果当前状态是"待回答"，添加答案后变为"已回答"
  // 如果已经是"已回答"或"已转选题"，状态不变
  await db.qaQuestions.update(questionId, {
    answers: updatedAnswers,
    status: question.status === "unanswered" ? "answered" : question.status,
    ...touchSyncFields(question.syncVersion || 0),
  })

  toast.success("答案已添加")
}


// ========== 5. 答案关联选题 ==========
// 转选题成功后调用，把选题 ID 写入对应答案的 topicId
// 同时更新问题状态为"已转选题"
export async function markAnswerTopicLinked(
  questionId: string,
  answerId: string,
  topicId: string
): Promise<void> {
  // 获取当前问答
  const question = await db.qaQuestions.get(questionId)
  if (!question) return

  // 遍历答案数组，找到对应的那条，写入 topicId
  const updatedAnswers = question.answers.map(a =>
    a.id === answerId ? { ...a, topicId } : a
  )

  // 更新数据库
  await db.qaQuestions.update(questionId, {
    answers: updatedAnswers,
    status: "converted",                        // 状态变为"已转选题"
    processedAt: question.processedAt || Date.now(),  // 记录处理时间（只记第一次）
    ...touchSyncFields(question.syncVersion || 0),
  })
}


// ========== 6. 闪念池联动 - 回写关联 ==========
// 问答创建成功后调用，把问答 ID 写入闪念的 relatedId
// 这样闪念池详情就能跳转到关联的问答
export async function markFlashThoughtLinked(flashId: string, questionId: string): Promise<void> {
  const flash = await db.flashThoughts.get(flashId)
  if (!flash) return
  await db.flashThoughts.update(flashId, {
    relatedId: questionId,
    status: "categorized",
    processedAt: Date.now(),
    ...touchSyncFields(flash.syncVersion || 0),
  })
}


// ========== 状态配置 ==========
// 给 Badge 组件用，控制显示文字和颜色
export const qaStatusConfig: Record<QaStatus, {
  label: string
  variant: "default" | "secondary" | "outline"
}> = {
  unanswered: { label: "待回答", variant: "default" },
  answered: { label: "已回答", variant: "secondary" },
  converted: { label: "已转选题", variant: "outline" },
}


// ========== 来源配置 ==========
// 给 Badge 组件用，显示问题来源的中文标签
export const qaSourceConfig: Record<QaSource, { label: string }> = {
  comment: { label: "评论区" },
  "self-qa": { label: "自问自答" },
  flash: { label: "闪念来源" },
}