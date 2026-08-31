// ========== 对标拆解 API 工具 ==========
// 封装所有对标拆解的数据库操作
// 页面组件只调用这里的函数，不直接操作数据库

import { db, type Benchmark, type BenchmarkStatus, type StructureType } from "@/lib/db"
import { newId, newSyncFields } from "./id"
import { syncBenchmarkProgressToTodos } from "./progress-events"

// ========== 配置 ==========

// 来源渠道中文映射
export const sourceChannelConfig: Record<string, { label: string }> = {
  recommend: { label: "推荐页" },
  search: { label: "搜索页" },
  douyin_index: { label: "抖音指数" },
  other: { label: "其他" },
}

// 状态配置（中文 + Badge variant）
export const statusConfig: Record<BenchmarkStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  disassembling: { label: "拆解中", variant: "default" },
  disassembled: { label: "已拆解", variant: "secondary" },
  converted: { label: "已转化", variant: "outline" },
  archived: { label: "已归档", variant: "outline" },
}

// 需求类型中文映射
export const needsTypeConfig: Record<string, string> = {
  active: "主动",
  passive: "被动",
  altruistic: "利他",
}

// 需求划分中文映射
export const needsCategoryConfig: Record<string, string> = {
  explicit: "显性",
  implicit: "隐性",
  emotional: "情绪心理",
}

// 内容价值中文映射
export const needsValueConfig: Record<string, string> = {
  practical: "实用干货",
  emotional: "情绪共鸣",
  cognitive: "认知提升",
}

// 脚本结构类型中文映射 + 默认步骤
export const structureTypeConfig: Record<StructureType, { label: string; defaultSteps: string[] }> = {
  standard: {
    label: "标准干货型",
    defaultSteps: ["开头观点留人", "举例佐证", "给解决方案", "结尾引导铺垫"],
  },
  story: {
    label: "故事案例型",
    defaultSteps: ["抛悬念/场景", "展开冲突", "揭示转折/方法", "引导"],
  },
  correction: {
    label: "纠错对比型",
    defaultSteps: ["展示错误做法", "为什么错", "正确做法", "引导"],
  },
  checklist: {
    label: "清单盘点型",
    defaultSteps: ["抛主题", "第1点", "第2点", "第3点", "总结+引导"],
  },
  qa: {
    label: "问答拆解型",
    defaultSteps: ["模拟提问", "分析为什么", "给解答", "引导"],
  },
}

// 展现形式中文映射
export const presentationFormConfig: Record<string, string> = {
  real_person: "真人出镜口播",
  voiceover: "画面+旁白",
  drama: "剧情+情景演绎",
  animation: "动画+文字辅助",
  other: "其它（文字说明）",
}

// 做得到吗中文映射
export const doableConfig: Record<string, string> = {
  doable: "做得到可借鉴",
  not_doable: "做不到放弃",
}

// 透不透中文映射
export const thoroughConfig: Record<string, string> = {
  thorough: "很透可借鉴",
  not_thorough: "不透有机会点",
}

// 差异化层次中文映射
export const diffLevelConfig: Record<string, string> = {
  unique: "人无我有",
  better: "人有我优",
  specialized: "人优我专",
  innovate: "人专我抄改超",
}

// 竞争热度中文映射
export const competitionConfig: Record<string, string> = {
  red_ocean: "红海",
  blue_ocean: "蓝海",
}


// ========== 创建默认值函数 ==========
// 创建一条新的对标记录时，给所有字段设置初始默认值
// 这样就不会出现 undefined 导致的报错

function createDefaultBenchmark(
  title: string,
  videoUrl: string,
  sourceChannel: string,
  videoScript: string,
  assignee: string
): Omit<Benchmark, "id"> {
  return {
    // 基础信息
    title,
    videoUrl,
    sourceChannel: sourceChannel as any,
    assignee,
    assigneeHistory: [],
    videoScript,
    status: "disassembling",

    // 维度1：人群维度（默认空字符串，用户填写）
    audienceIdentity: "",
    audienceStage: "",
    audienceGoal: "",
    audiencePainPoint: "",
    audienceEmotion: "",

    // 维度2：需求维度
    needsType: null,
    needsCategory: null,
    needsValue: null,
    coreProblem: "",

    // 维度3：内容维度
    presentationForm: null,
    structureType: null,
    structureSteps: [],

    // 维度4：自身维度
    doable: null,
    doableNote: "",
    thorough: null,
    thoroughNote: "",
    diffLevel: null,
    competition: null,
    diffOpportunity: "",

    // 维度5：转化维度
    topicTitle: "",
    topicCopy: "",

    // 其他
    tags: [],
    disassemblyStartTime: null,
    disassemblyCompleteTime: null,
    createdAt: Date.now(),
    convertedTargets: [],
    convertedIds: {},
    ...newSyncFields(),
  }
}


// ========== 四维度完成度计算 ==========
// 计算拆解完成度，返回 0-4 的数字
// 四个核心维度：人群维度 / 需求维度 / 内容维度 / 自身维度
// 转化维度（第5步）为可选，不计入拆解进度

export function calculateProgress(benchmark: Benchmark): number {
  let count = 0

  // 1. 人群维度：身份有内容
  if ((benchmark.audienceIdentity || "").trim()) {
    count++
  }

  // 2. 需求维度：一句话总结有内容
  if ((benchmark.coreProblem || "").trim()) {
    count++
  }

  // 3. 内容维度：结构类型有值 + 至少1步
  if (benchmark.structureType && (benchmark.structureSteps || []).length > 0) {
    count++
  }

  // 4. 自身维度：我做得到吗有值
  if (benchmark.doable) {
    count++
  }

  return count
}


// ========== 检查是否所有必填字段都填完了 ==========
// 用于判断是否可以从"拆解中"自动变"已拆解"
// 只检查 4 个核心分析维度，转化维度为可选

export function isAllRequiredFilled(benchmark: Benchmark): boolean {
  // 维度1：人群维度必填
  if (!(benchmark.audienceIdentity || "").trim()) return false

  // 维度2：需求维度必填
  if (!(benchmark.coreProblem || "").trim()) return false

  // 维度3：内容维度必填
  if (!benchmark.structureType) return false
  if (!benchmark.structureSteps || benchmark.structureSteps.length === 0) return false

  // 维度4：自身维度必填
  if (!benchmark.doable) return false

  return true
}


// ========== API 函数 ==========

/**
 * 新增对标视频（录入基础信息）
 * @param data - 基础信息字段
 * @returns 新记录的 id
 */
export async function createBenchmark(data: {
  title: string
  videoUrl: string
  sourceChannel: string
  videoScript: string
  assignee: string
}): Promise<string> {
  const benchmark = createDefaultBenchmark(
    data.title,
    data.videoUrl,
    data.sourceChannel,
    data.videoScript,
    data.assignee
  )
  const id = newId()
  await db.benchmarks.add({ id, ...benchmark } as any)
  // 新建了对标记录，通知待办刷新
  syncBenchmarkProgressToTodos()
  return id
}


/**
 * 获取对标列表
 * @param status - 可选，按状态筛选
 * @returns 对标数组，按创建时间倒序
 */
export async function getBenchmarks(status?: BenchmarkStatus): Promise<Benchmark[]> {
  // 先读全部数据，再在 JS 层面过滤和排序
  // 跟今日待办一样的模式，避免 Dexie 索引查询不稳定
  const allData = await db.benchmarks.toArray()
  let filtered = allData

  if (status) {
    filtered = filtered.filter(b => b.status === status)
  }

  // 按创建时间倒序（最新的在前面）
  filtered.sort((a, b) => b.createdAt - a.createdAt)

  return filtered
}


/**
 * 获取单条对标记录
 * @param id - 记录 id
 * @returns 对标记录，找不到返回 undefined
 */
export async function getBenchmark(id: string): Promise<Benchmark | undefined> {
  return await db.benchmarks.get(id)
}


/**
 * 更新对标记录（保存拆解内容）
 * 自动检查是否需要变更状态
 * @param id - 记录 id
 * @param updates - 要更新的字段对象
 */
export async function updateBenchmark(
  id: string,
  updates: Partial<Benchmark>
): Promise<void> {
  // 先获取当前记录
  const current = await db.benchmarks.get(id)
  if (!current) return

  // 状态流转由用户手动触发（提交拆解按钮），不在保存时自动流转
  await db.benchmarks.update(id, updates as any)
  // 如果状态变了，通知待办刷新进度
  if (updates.status) {
    syncBenchmarkProgressToTodos()
  }
}


/**
 * 开始拆解（记录拆解开始时间）
 * @param id - 记录 id
 *
 * 注：新模型下「待拆解」与「拆解中」已合并为 disassembling
 * （07 文档 §3：状态跟随拆解进度自动更新，不可自主编辑），
 * 本函数保留的意义是记录首次开始拆解的时间戳。
 */
export async function startDisassembly(id: string): Promise<void> {
  const current = await db.benchmarks.get(id)
  if (!current) return
  if (current.status !== "disassembling") return
  if (current.disassemblyStartTime) return // 已开始过，不重复记录

  await db.benchmarks.update(id, {
    status: "disassembling",
    disassemblyStartTime: Date.now(),
  } as any)
  // 状态变了，通知待办刷新进度
  syncBenchmarkProgressToTodos()
}


/**
 * 转让负责人
 * @param id - 记录 id
 * @param newAssignee - 新负责人名称
 * @param currentUser - 当前操作人（用于校验是不是当前负责人）
 */
export async function transferAssignee(
  id: string,
  newAssignee: string,
  currentUser: string
): Promise<void> {
  const current = await db.benchmarks.get(id)
  if (!current) return
  if (current.assignee !== currentUser) {
    throw new Error("只有当前负责人可以转让")
  }

  const now = Date.now()
  const newHistory = [
    ...current.assigneeHistory,
    { from: current.assignee, to: newAssignee, transferredAt: now },
  ]

  await db.benchmarks.update(id, {
    assignee: newAssignee,
    assigneeHistory: newHistory,
  } as any)
}


/**
 * 转化对标记录为选题/灵感
 * @param id - 记录 id
 * @param targets - 要转化的目标列表（["topic", "inspiration"]）
 * @returns 转化结果（包含生成的 id）
 */
export async function convertBenchmark(
  id: string,
  targets: string[]
): Promise<{ topicId?: string; inspirationId?: string }> {
  const current = await db.benchmarks.get(id)
  if (!current) return {}

  const result: { topicId?: string; inspirationId?: string } = {}

  // TODO：选题库和灵感记录模块开发后，在这里创建对应记录
  // 目前先更新状态和 convertedTargets，跳转带参数

  // 更新状态为"已转化"
  await db.benchmarks.update(id, {
    status: "converted",
    convertedTargets: targets,
  } as any)
  // 状态变了，通知待办刷新进度
  syncBenchmarkProgressToTodos()

  return result
}


/**
 * 标记选题已创建（更新 convertedIds.topicId）
 * @param benchmarkId - 对标记录 ID
 * @param topicId - 新创建的选题 ID
 */
export async function markTopicCreated(benchmarkId: string, topicId: string): Promise<void> {
  const current = await db.benchmarks.get(benchmarkId)
  if (!current) return
  await db.benchmarks.update(benchmarkId, {
    convertedIds: { ...current.convertedIds, topicId }
  } as any)
}

/**
 * 标记灵感已创建（更新 convertedIds.inspirationId）
 * @param benchmarkId - 对标记录 ID
 * @param inspirationId - 新创建的灵感 ID
 */
export async function markInspirationCreated(benchmarkId: string, inspirationId: string): Promise<void> {
  const current = await db.benchmarks.get(benchmarkId)
  if (!current) return
  await db.benchmarks.update(benchmarkId, {
    convertedIds: { ...current.convertedIds, inspirationId }
  } as any)
}

/**
 * 快速创建对标记录（仅需标题）
 * @param title - 对标视频标题
 * @param assignee - 负责人
 * @returns 新记录的 id
 */
export async function quickCreateBenchmark(title: string, assignee: string): Promise<string> {
  const benchmark = createDefaultBenchmark(title, "", "recommend", "", assignee)
  const id = newId()
  await db.benchmarks.add({ id, ...benchmark } as any)
  syncBenchmarkProgressToTodos()
  return id
}

/**
 * 批量更新对标记录
 * @param ids - 要更新的记录 id 列表
 * @param updates - 要更新的字段
 */
export async function batchUpdateBenchmarks(ids: string[], updates: Partial<Benchmark>): Promise<void> {
  await db.transaction('rw', db.benchmarks, async () => {
    for (const id of ids) {
      await db.benchmarks.update(id, updates as any)
    }
  })
  if (updates.status) {
    syncBenchmarkProgressToTodos()
  }
}

// 注意：本项目全局无删除功能
// 原有的批量删除对标记录（batchDeleteBenchmarks）已移除
// 拆错或不想要的记录保留沉淀，不做删除

/**
 * 格式化相对时间（时间戳 → 几分钟前/几小时前/几天前）
 * @param timestamp - 时间戳（毫秒）
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}