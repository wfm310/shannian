// ========== 导入 Dexie ==========
// Dexie 是 IndexedDB 的封装库
// IndexedDB 是浏览器自带的本地数据库
// Dexie 让操作 IndexedDB 变得简单（类似操作 SQL 数据库）
import Dexie from "dexie"


// ========== 定义数据类型 ==========

// 优先级类型：P0 最高，P3 最低
// P0：今天必须干完
// P1：今天应该干完
// P2：本周内完成
// P3：有空再做
type Priority = "P0" | "P1" | "P2" | "P3"

// 状态类型：只有 3 种状态
// pending：待处理（刚创建，等待负责人接受）
// in-progress：进行中（负责人已接受，正在执行）
// done：已完成（已标记完成）
type TodoStatus = "pending" | "in-progress" | "done"

// 任务来源类型：系统根据创建入口自动识别
// manual：用户在待办模块手动创建
// production：内容生产流程自动生成
// topic：选题库转入
// review：复盘触发
// tracking：数据追踪触发
// flash-thought：闪念池转入
type TodoSource =
  | "manual"
  | "production"
  | "topic"
  | "review"
  | "tracking"
  | "flash-thought"

// ========== 待办接口 ==========
// interface 是 TypeScript 的类型定义
// 它告诉编译器：每条待办数据应该长什么样
export interface Todo {
  id?: string                        // 主键，UUID（创建时自动生成，见 lib/id.ts）
  title: string                      // 任务名称（新建填写，不可改）
  description: string                // 任务详细介绍（新建填写，不可改）
  initialPriority: Priority          // 初始优先级（新建填写，不可改，后续系统自动升阶）
  assignee: string                   // 负责人（新建填写，不可改）
  dueDate: number                    // 截止日期（时间戳，新建填写，不可改，驱动优先级升阶）
  linkedModules: string[]            // 关联模块（新建填写，不可改，如 ["benchmark", "topic"]）
  progressTargets: Record<string, number>   // 每个关联模块的进度目标数，如 { benchmark: 50, topic: 5 }
  linkedIds: Record<string, string[]>        // 新增：关联模块的具体记录ID列表
  // 例如 { benchmark: [1, 3, 7] }，表示关联了对标记录 1、3、7
  // 有这个字段时，进度从关联记录实时计算，不用 progressTargets/progressCompleted
  status: TodoStatus                 // 状态（系统自动流转，不可手动改）
  source: TodoSource                 // 任务来源（系统自动识别）
  progressCompleted: Record<string, number> // 每个关联模块的已完成数，如 { benchmark: 32, topic: 2 }
  progressBaseline: Record<string, number>   // 创建待办时各模块的已完成数基准线，如 { benchmark: 5 }
  // 用于计算 delta：当前已完成数 - 基准线 = 本次待办期间新完成的数量
  creator: string                    // 创建人（系统自动识别当前登录账号）
  createdAt: number                 // 创建时间（时间戳，系统自动记录）
  completedAt: number | null        // 完成时间（标记完成时记录，未完成为 null）
  archived: boolean                  // 是否已归档（当天 23:59 自动设为 true）
  archivedAt?: number | null         // 归档时间（自动归档时记录时间戳）
  // ===== 同步字段（云端同步用，见技术决策记录 4.2 #11）=====
  updatedAt: number                  // 最后更新时间（任何修改都会刷新，同步层据此判断增量）
  synced: boolean                    // 是否已同步到云端（本地改动后为 false，同步成功后为 true）
  syncVersion: number                // 乐观并发版本号（每次更新 +1，解决两人同时改同一条的冲突）
}

// ========== 消息通知类型 ==========

// 消息类型：待办/系统/模块
type NotificationType = "todo" | "system" | "module"

// 消息状态：未读/已读/已处理
type NotificationStatus = "unread" | "read" | "handled"

// 关联模块类型（所有可能关联的模块标识）
type RelatedModule =
  | "todo"              // 今日待办
  | "benchmark"         // 对标拆解
  | "topic"             // 选题库
  | "production"        // 内容生产流程
  | "publish"           // 制作发布
  | "dashboard"         // 数据追踪
  | "review"            // 复盘记录
  | "flash-thought"     // 闪念池
  | "inspiration"       // 灵感记录
  | "ai-module"         // AI 模块
  | "system"            // 系统通知（无具体页面）
  | "qa"                // 新增：问答收集

// ========== 通知接口 ==========
export interface Notification {
  id?: string                        // 主键，UUID
  title: string                      // 通知标题
  type: NotificationType             // 通知类型
  content: string                    // 简要内容
  relatedModule: RelatedModule       // 关联模块
  relatedId: string | null           // 关联记录 ID
  receiver: string                   // 接收人
  status: NotificationStatus         // 消息状态
  createdAt: number                  // 通知时间
  // ===== 同步字段 =====
  updatedAt: number                  // 最后更新时间
  synced: boolean                    // 是否已同步到云端
  syncVersion: number                // 乐观并发版本号
}


// ========== 闪念池 ==========

// 闪念状态
type FlashStatus = "pending" | "categorized" | "converted_todo"

// 归类目标
type CategoryTarget = "topic" | "qa" | "inspiration"

// 闪念数据接口
export interface FlashThought {
  id?: string                        // 主键，UUID
  content: string                    // 闪念内容
  status: FlashStatus                // 状态
  categoryTarget: CategoryTarget | null  // 归类目标
  relatedId: string | null           // 关联记录 ID
  thought: string | null             // 处理时的想法
  createdAt: number                  // 创建时间
  processedAt: number | null         // 处理时间
  // ===== 同步字段 =====
  updatedAt: number                  // 最后更新时间
  synced: boolean                    // 是否已同步到云端
  syncVersion: number                // 乐观并发版本号
}

// ========== 对标拆解 ==========

// 对标状态
// pending：待拆解（刚录入，没开始拆）
// in_progress：拆解中（正在拆，没拆完）
// completed：已拆解（五个维度都填完了）
// converted：已转化（已转成选题/灵感，终态）
type BenchmarkStatus = "pending" | "in_progress" | "completed" | "converted"

// 来源渠道
// recommend：推荐页
// search：搜索页
// douyin_index：抖音指数
// other：其他
type SourceChannel = "recommend" | "search" | "douyin_index" | "other"

// 需求类型
// active：主动（用户主动寻找）
// passive：被动（你想让用户知道）
// altruistic：利他（跟用户利益挂钩）
type NeedsType = "active" | "passive" | "altruistic"

// 需求划分
// explicit：显性（嘴上表达的）
// implicit：隐性（真实存在未表达）
// emotional：情绪心理（引起情绪波动）
type NeedsCategory = "explicit" | "implicit" | "emotional"

// 内容价值
// practical：实用干货
// emotional：情绪共鸣
// cognitive：认知提升
type NeedsValue = "practical" | "emotional" | "cognitive"

// 脚本结构类型
// standard：标准干货型
// story：故事案例型
// correction：纠错对比型
// checklist：清单盘点型
// qa：问答拆解型
type StructureType = "standard" | "story" | "correction" | "checklist" | "qa"

// 展现形式
// real_person：真人出镜口播
// voiceover：画面+旁白
// drama：剧情+情景演绎
// animation：动画+文字辅助
// other：其它（文字说明）
type PresentationForm =
  | "real_person"
  | "voiceover"
  | "drama"
  | "animation"
  | "other"

// 做得到吗
// doable：做得到可借鉴
// not_doable：做不到放弃
type DoableLevel = "doable" | "not_doable"

// 需求解决透不透
// thorough：很透可借鉴
// not_thorough：不透有机会点
type ThoroughLevel = "thorough" | "not_thorough"

// 差异化层次
// unique：人无我有
// better：人有我优
// specialized：人优我专
// innovate：人专我抄改超
type DiffLevel = "unique" | "better" | "specialized" | "innovate"

// 竞争热度
// red_ocean：红海
// blue_ocean：蓝海
type CompetitionLevel = "red_ocean" | "blue_ocean"

// 结构拆解步骤
interface StructureStep {
  stepName: string     // 步骤名称（如"开头观点留人"）
  content: string      // 拆解内容
}

// 负责人转让记录
interface AssigneeRecord {
  from: string          // 原负责人
  to: string            // 新负责人
  transferredAt: number // 转让时间
}

// 转化关联 ID
interface ConvertedIds {
  topicId?: string      // 转化为选题的 ID
  inspirationId?: string // 转化为灵感的 ID
}

// ========== 对标拆解接口 ==========
export interface Benchmark {
  // ===== 基础信息 =====
  id?: string                           // 主键，UUID
  title: string                         // 对标视频标题
  videoUrl: string                      // 原视频链接
  sourceChannel: SourceChannel          // 来源渠道
  assignee: string                      // 负责人
  assigneeHistory: AssigneeRecord[]     // 历史负责人记录
  videoScript: string                   // 视频文案内容
  status: BenchmarkStatus               // 状态

  // ===== 维度1：人群维度 =====
  audienceIdentity: string              // 身份
  audienceStage: string                 // 阶段
  audienceGoal: string                  // 目标
  audiencePainPoint: string             // 卡点
  audienceEmotion: string               // 情绪

  // ===== 维度2：需求维度 =====
  needsType: NeedsType | null            // 需求类型
  needsCategory: NeedsCategory | null   // 需求划分
  needsValue: NeedsValue | null         // 内容价值
  coreProblem: string                   // 一句话总结：解决什么核心问题

  // ===== 维度3：内容维度 =====
  presentationForm: PresentationForm | null  // 展现形式
  structureType: StructureType | null        // 结构类型
  structureSteps: StructureStep[]            // 结构步骤

  // ===== 维度4：自身维度 =====
  doable: DoableLevel | null                 // 我做得到吗
  doableNote: string                         // 补充说明
  thorough: ThoroughLevel | null            // 需求解决透不透
  thoroughNote: string                       // 补充说明
  diffLevel: DiffLevel | null               // 差异化层次
  competition: CompetitionLevel | null       // 竞争热度
  diffOpportunity: string                    // 差异化机会

  // ===== 维度5：转化维度 =====
  topicTitle: string                         // 最终凝练选题
  topicCopy: string                          // 凝练出的文案

  // ===== 其他 =====
  tags: string[]                        // 视频主题标签（系统自动生成）
  disassemblyStartTime: number | null   // 拆解开始时间
  disassemblyCompleteTime: number | null // 拆解完成时间
  createdAt: number                     // 记录时间
  convertedTargets: string[]            // 已转化目标
  convertedIds: ConvertedIds            // 转化关联 ID
  // ===== 同步字段 =====
  updatedAt: number                     // 最后更新时间
  synced: boolean                       // 是否已同步到云端
  syncVersion: number                   // 乐观并发版本号
}

// ========== 选题库 ==========

// 选题来源
// manual：手动创建
// benchmark：对标分析（从对标拆解转化）
// qa：问答收集（从问答收集转化）
// inspiration：灵感记录（从灵感记录转化）
// review：复盘回流（从复盘记录转化）
// other：其他
type TopicSource = "manual" | "benchmark" | "qa" | "inspiration" | "review" | "other"

// 选题状态
// reserve：储备（暂不生产）
// pending_production：待生产（优先级为立即做或排期做）
// in_production：生产中（内容生产已关联，第13课实现）
// published：已发布（内容已发布，第13课实现）
type TopicStatus = "reserve" | "pending_production" | "in_production" | "published"

// 定位匹配度
type MatchLevel = "high" | "medium" | "low"

// 需求强度
type DemandLevel = "high" | "medium" | "low"

// 竞争热点
type CompetitionType = "blue_ocean" | "red_ocean"

// 优先级星级
type PriorityLevel = "urgent" | "scheduled" | "reserve"

// ========== 选题接口 ==========
export interface Topic {
  // ===== 基础信息 =====
  id?: string // 主键，UUID
  topicTitle: string // 选题标题（最终凝练选题）
  topicNote: string // 选题备注（凝练出的文案）
  creator: string // 创建人（系统自动识别）
  createdAt: number // 创建时间（时间戳，自动记录）

  // ===== 关联信息（快照复制） =====
  source: TopicSource // 选题来源
  sourceId: string | null // 来源关联记录 ID（点击可跳转）
  audience: string // 人群维度（与对标拆解字段一致，快照）
  demand: string // 需求维度（与对标拆解字段一致，快照）
  contentDimension: string // 内容维度（与对标拆解字段一致，快照）

  // ===== 文案内容参考 =====
  copyReference: string // 文案内容参考（提交保存后自动变为只读）
  copyReferenceLocked: boolean // 文案参考是否已锁定

  // ===== 定位匹配度评估 =====
  positioningMatch: MatchLevel | null // 定位匹配度
  demandLevel: DemandLevel | null // 需求强度
  competition: CompetitionType | null // 竞争热点
  contentPositioning: string // 内容定位
  priorityScore: number // 优先级得分（3-9，自动计算）
  priorityLevel: PriorityLevel // 优先级星级（自动计算，含一票否决）
  status: TopicStatus // 选题状态（自动关联进度，不可编辑）

  // ===== 其他 =====
  updatedAt: number // 更新时间
  // ===== 同步字段 =====
  synced: boolean   // 是否已同步到云端
  syncVersion: number // 乐观并发版本号
}

// ========== 问答收集 ==========

// 问题来源
// comment：评论区（从网友评论中收集的问题）
// self-qa：自问自答（自己提出的问题）
// flash：闪念来源（从闪念池归类过来的问题）
type QaSource = "comment" | "self-qa" | "flash"

// 问答状态
// unanswered：待回答（刚创建，还没添加答案）
// answered：已回答（至少添加了一个答案）
// converted：已转选题（某条答案已转化为选题，但仍可继续添加新答案）
type QaStatus = "unanswered" | "answered" | "converted"

// 答案结构（嵌套在问题的 answers 数组里，不是独立的表）
interface QaAnswer {
  id: string              // 答案唯一ID（UUID），用于追溯和关联选题
  content: string         // 答案内容
  creator: string         // 答案创建人（系统自动识别账号，任何人都可以新增）
  topicId: string | null  // 转选题后关联的选题ID，未转为 null
  createdAt: number       // 创建时间（时间戳）
}

// ========== 问答接口 ==========
export interface QaQuestion {
  id?: string             // 主键，UUID
  content: string         // 问题内容，创建后只读
  source: QaSource        // 问题来源，创建后只读
  creator: string         // 创建人（负责人），系统自动识别当前登录账号
  answers: QaAnswer[]     // 答案列表（一问多答，每条答案创建后只读）
  status: QaStatus        // 状态（系统自动流转）
  createdAt: number       // 创建时间（时间戳，自动记录）
  processedAt: number | null  // 处理时间（首次转选题时记录，未转为 null）
  // ===== 同步字段 =====
  updatedAt: number       // 最后更新时间
  synced: boolean         // 是否已同步到云端
  syncVersion: number     // 乐观并发版本号
}

// ========== 灵感记录 ==========

// 灵感来源
// manual：手动创建
// flash-thought：闪念池归类
// benchmark：对标拆解转化
type InspirationSource = "manual" | "flash-thought" | "benchmark"

// 灵感状态
// draft：记录中（结论为空，还在思考）
// completed：已完成（结论已填写，思考完毕）
// converted：已转选题（某条灵感已转化为选题）
type InspirationStatus = "draft" | "completed" | "converted"

// ========== 灵感记录接口 ==========
export interface Inspiration {
  id?: string                     // 主键，UUID
  content: string                 // 灵感内容（你的灵感是什么？）
  thoughtProcess: string          // 思考过程（你的思考过程是什么？）
  conclusion: string              // 结论（最终得出来什么结论？）
  source: InspirationSource       // 灵感来源
  sourceId: string | null         // 来源关联记录 ID（点击可跳转）
  status: InspirationStatus       // 状态（系统根据结论自动判断，转选题后为 converted）
  creator: string                 // 创建人（系统自动识别）
  topicId: string | null          // 转选题后关联的选题 ID
  createdAt: number               // 创建时间（时间戳）
  updatedAt: number               // 更新时间（时间戳）
  // ===== 同步字段 =====
  synced: boolean                 // 是否已同步到云端
  syncVersion: number             // 乐观并发版本号
}

// ========== 脚本框架库 ==========

// 框架类型（固定5种，不可扩展）
// standard：标准干货型（教方法、讲流程）
// story：故事案例型（讲学员案例、自己踩坑经历）
// correction：纠错对比型（"90%的人都做错了"类内容）
// checklist：清单盘点型（"选品的5个标准""3个必知工具"类）
// qa：问答拆解型（回应评论区高频问题）
type FrameworkType = "standard" | "story" | "correction" | "checklist" | "qa"

// 步骤子结构
// 每个步骤包含：步骤名（可改）+ 指导说明（提示这个步骤要干什么）
interface ScriptStep {
  id: string              // 步骤唯一ID（UUID），用于 React key 和排序
  name: string            // 步骤名（可改，如"抛观点"→"痛点引入"）
  guidance: string        // 指导说明（如"3秒内抛出核心观点，抓住注意力"）
  // ===== 同步字段 =====
  synced: boolean
  syncVersion: number
}

// 脚本框架主结构
interface ScriptTemplate {
  id?: string             // 主键，UUID
  title: string           // 框架名称（如"职场妈妈时间管理干货"）
  frameworkType: FrameworkType  // 框架类型（5选1）
  steps: ScriptStep[]     // 步骤数组，选类型后自动带出预设步骤
  creator: string         // 创建人（系统自动识别）
  createdAt: number       // 创建时间（时间戳）
  updatedAt: number       // 更新时间（时间戳，每次编辑更新）
  // ===== 同步字段 =====
  synced: boolean         // 是否已同步到云端
  syncVersion: number     // 乐观并发版本号
}

// ========== 内容生产流程 ==========

// 生产模式
// standard：标准模式（从选题库取题→选框架→写文案→制作→剪辑→发布）
// impromptu：即兴模式（先写文案→补选题→补框架→制作→剪辑→发布）
type ProductionMode = "standard" | "impromptu"

// 生产阶段（固定5阶段 + 终态）
// topic：选题确认（标准模式关联选题库；即兴模式标记"待补填"）
// script：脚本撰写（选框架 + 写文案，核心工作区）
// material：素材制作（只读展示文案，按文案录口播/拍素材）
// editing：剪辑（去剪映等软件剪辑）
// handoff：发布移交（移交制作发布模块）
// published：已发布（终态）
type ProductionStage = "topic" | "script" | "material" | "editing" | "handoff" | "published"

// 生产状态
// active：进行中（正常推进）
// completed：已完成（发布移交完成，终态）
type ProductionStatus = "active" | "completed"

// 步骤文案内容（选框架后从框架步骤初始化，用户按步骤写文案）
interface ScriptStepContent {
  stepId: string              // 框架步骤ID（从 ScriptStep.id 复制）
  stepName: string            // 步骤名称（快照，从 ScriptStep.name 复制）
  guidance: string            // 引导语（快照，从 ScriptStep.guidance 复制）
  content: string             // 用户写的该步骤文案（初始为空）
}

// ========== 内容生产流程接口 ==========
export interface ProductionTask {
  id?: string                        // 主键，UUID
  title: string                      // 任务标题（标准模式继承选题标题；即兴模式默认"即兴创作"，首次保存文案时自动取前15字）
  mode: ProductionMode               // 生产模式
  topicId: string | null             // 关联选题ID（标准模式创建时必填；即兴模式待补填）
  frameworkId: string | null        // 关联脚本框架ID（脚本撰写阶段必填）
  rawContent: string                 // 即兴模式的自由文本（标准模式为空字符串）
  scriptSteps: ScriptStepContent[]   // 按框架步骤分段的文案内容（选框架后初始化）
  currentStage: ProductionStage      // 当前阶段
  status: ProductionStatus           // 生产状态
  pendingStages: string[]            // 即兴模式待补填阶段列表（如 ["topic", "framework"]）
  assignee: string                   // 负责人（固定"峰岚"）
  createdAt: number                  // 创建时间（时间戳）
  publishedAt: number | null        // 发布移交时间（未移交为 null）
  // ===== 同步字段 =====
  updatedAt: number                  // 最后更新时间
  synced: boolean                    // 是否已同步到云端
  syncVersion: number                // 乐观并发版本号
}

// ========== 制作发布接口 ==========

// 发布状态
// draft：草稿（正在填写，或已填但未发布）
// published：已发布（已记录视频链接）
type PublishStatus = "draft" | "published"

// 标题公式类型（仅参考提示，不强制使用）
type TitleFormula = "T1" | "T2" | "T3" | "T4" | "T5"

// 标签分类（对应"3+1+1"结构的位置）
type TagCategory = "track" | "content" | "audience" | "hot"

// 发布记录
export interface PublishRecord {
  id?: string                        // 主键，UUID
  productionId: string              // 关联生产任务ID
  title: string                      // 发布标题（用户填写，参考公式）
  titleFormula: TitleFormula | null  // 使用的标题公式（仅参考，可不选）
  description: string                // 描述文案（简要概括视频内容）
  hashtags: string[]                 // 话题标签（3+1+1结构，不含 # 号）
  fullContent: string                // 完整文案内容（从生产任务预填，可编辑）
  publishTime: number | null         // 发布时间（未发布为 null）
  videoUrl: string                   // 发布视频链接
  status: PublishStatus              // 发布状态
  assignee: string                   // 负责人（固定"峰岚"）
  createdAt: number                  // 创建时间
  updatedAt: number                  // 更新时间
  // ===== 同步字段 =====
  synced: boolean                    // 是否已同步到云端
  syncVersion: number                // 乐观并发版本号
}

// 标签库
export interface TagLibrary {
  id?: string                        // 主键，UUID
  tag: string                        // 标签文本（不含 # 号）
  category: TagCategory              // 标签分类
  usageCount: number                 // 使用次数（排序用，初始 0）
  createdAt: number                  // 创建时间
  // ===== 同步字段 =====
  updatedAt: number                  // 最后更新时间
  synced: boolean                    // 是否已同步到云端
  syncVersion: number                // 乐观并发版本号
}

// ========== 数据追踪接口 ==========

// 追踪节点类型
// 2h/24h/3d/7d/30d 是固定节点，custom 是长尾触发的自定义节点
type TrackingNode = "2h" | "24h" | "3d" | "7d" | "30d" | "custom"

// 追踪状态
// pending：已创建但未录入数据
// recorded：已录入数据并保存
type TrackingStatus = "pending" | "recorded"

// 追踪记录（每条对应一个节点）
export interface TrackingRecord {
  id?: string                          // 主键，UUID
  publishRecordId: string              // 关联发布记录ID
  node: TrackingNode                    // 追踪节点
  customLabel: string                   // 自定义节点标签（custom 时填写）
  // 流量数据
  views: number | null                  // 播放量
  likes: number | null                  // 点赞量
  comments: number | null                // 评论量
  shares: number | null                 // 分享量
  favorites: number | null               // 收藏量
  followers: number | null               // 涨粉量
  // 内容吸引力
  avgPlayDuration: number | null         // 平均播放时长（秒）
  completionRate: number | null          // 完播率（%）
  bounceRate2s: number | null            // 2s跳出率（%）
  retention5s: number | null             // 5s完播率（%）
  // 搜索关键词
  searchKeywordsIn: string[]             // 用户通过这些词看到作品
  searchKeywordsOut: string[]            // 用户看完作品后常搜的词
  // 状态
  status: TrackingStatus                 // 追踪状态
  scheduledTime: number                  // 预计追踪时间（发布时间 + 偏移量）
  recordedAt: number | null              // 实际录入时间
  assignee: string                       // 负责人（固定"峰岚"）
  createdAt: number                      // 创建时间
  updatedAt: number                      // 更新时间
  // ===== 同步字段 =====
  synced: boolean                        // 是否已同步到云端
  syncVersion: number                    // 乐观并发版本号
}

// ========== 复盘记录接口 ==========

// 复盘类型
type ReviewType = "single" | "periodic"

// 复盘周期（周期性复盘必填）
type ReviewPeriod = "daily" | "weekly" | "monthly"

// 触发方式（本课只实现手动，后续课程扩展自动触发）
type ReviewTrigger = "manual"

// 复盘状态（三态不可逆：待复盘 → 复盘中 → 已完成）
type ReviewStatus = "pending" | "in_progress" | "completed"

// 复盘维度（做得好的/不好的条目分类）
type ReviewDimension = "content" | "process" | "strategy" | "workflow" | "general"

// 经验分类
type ExperienceCategory = "content_creation" | "operation_strategy" | "process_efficiency" | "other"

// 做得好/不好的条目
interface ReviewItem {
  id: string
  dimension: ReviewDimension
  description: string
}

// 可复用经验条目
interface ReviewExperience {
  id: string
  title: string
  content: string
  category: ExperienceCategory
  applicableScene: string
}

// 下一步行动条目
interface ReviewAction {
  id: string
  content: string
  priority: Priority
  dueDate: number | null
  linkedModule: string | null
}

// 复盘记录
export interface ReviewRecord {
  id?: string                          // 主键，UUID
  title: string                         // 复盘标题（自动生成，可修改）
  type: ReviewType                      // 复盘类型
  period: ReviewPeriod | null           // 周期类型（周期性必填）
  publishRecordId: string | null        // 关联发布记录（单条视频必填）
  periodStart: number | null            // 周期开始时间（周期性必填）
  periodEnd: number | null              // 周期结束时间（周期性必填）
  trigger: ReviewTrigger                // 触发方式
  triggerNode: TrackingNode | null      // 触发节点（自动触发时填，手动为 null）
  assignee: string                      // 负责人
  status: ReviewStatus                  // 复盘状态
  // 五模块数据
  dataComment: string                   // 数据简评
  goodItems: ReviewItem[]               // 做得好的
  badItems: ReviewItem[]                // 做得不好的
  experiences: ReviewExperience[]       // 可复用经验
  actions: ReviewAction[]               // 下一步行动
  // 时间戳
  startedAt: number | null              // 开始复盘时间
  completedAt: number | null            // 完成复盘时间
  createdAt: number                      // 创建时间
  updatedAt: number                      // 更新时间
  // ===== 同步字段 =====
  synced: boolean                        // 是否已同步到云端
  syncVersion: number                    // 乐观并发版本号
}

// ========== 大脑知识库 ==========

// 知识节点类型（9种内容节点）
type KnowledgeNodeType =
  | "FlashIdea"
  | "Benchmarking"
  | "Topic"
  | "QA"
  | "Inspiration"
  | "ScriptFramework"
  | "ScriptContent"
  | "PublishRecord"
  | "Review"

// 知识边类型（6种确定性关系 + 1种标签关联）
type KnowledgeEdgeType =
  | "TRANSFORMED_TO"
  | "PRODUCED_AS"
  | "APPLIES"
  | "PUBLISHED_AS"
  | "REVIEWED_FROM"
  | "DERIVED_FROM"
  | "SHARED_TAG"

// 知识节点
export interface KnowledgeNode {
  id?: string
  nodeType: KnowledgeNodeType
  title: string
  summary: string
  sourceModule: string
  sourceRecordId: string
  tags: string[]
  status: string
  links: string[]       // 引用的其他节点ID列表（手动添加的双向链接）
  linkedBy: string[]    // 被哪些节点引用（自动反向计算，不需要手动维护）
  createdAt: number
  updatedAt: number
  // ===== 同步字段 =====
  synced: boolean
  syncVersion: number
}

// 知识边
export interface KnowledgeEdge {
  id?: string
  sourceNodeId: string
  targetNodeId: string
  edgeType: KnowledgeEdgeType
  weight: number
  createdAt: number
  // ===== 同步字段 =====
  synced: boolean
  syncVersion: number
}

// 知识笔记（用户手动创建的 Markdown 笔记）
interface KnowledgeNote {
  id?: string              // 主键，UUID
  title: string            // 笔记标题
  content: string          // Markdown 正文（可包含 [[双向链接]]）
  tags: string[]           // 标签列表
  links: string[]          // 引用的节点ID列表
  createdAt: number       // 创建时间
  updatedAt: number       // 更新时间
  // ===== 同步字段 =====
  synced: boolean
  syncVersion: number
}

// ========== 同步元信息表 ==========
// 记录本地与云端最后一次同步的时间，供同步层判断增量
export interface SyncMeta {
  key: string            // 固定为 "lastSync" 等
  value: number          // 时间戳（毫秒）
}

// 导出类型，供其他文件使用
export type {
  Priority, TodoStatus, TodoSource,
  NotificationType, NotificationStatus, RelatedModule,
  FlashStatus, CategoryTarget,
  // 对标拆解相关类型
  BenchmarkStatus, SourceChannel, NeedsType, NeedsCategory, NeedsValue,
  StructureType, PresentationForm, DoableLevel, ThoroughLevel,
  DiffLevel, CompetitionLevel,
  StructureStep, AssigneeRecord, ConvertedIds,
    // 选题库相关类型
  TopicSource, TopicStatus, MatchLevel, DemandLevel,
  CompetitionType, PriorityLevel,
  // 问答收集相关类型
  QaSource, QaStatus, QaAnswer,
  // 灵感记录相关类型
  InspirationSource, InspirationStatus,
  // 脚本框架库相关类型
  FrameworkType, ScriptStep, ScriptTemplate,
    // 内容生产流程相关类型
  ScriptStepContent, ProductionMode, ProductionStage, ProductionStatus,
  // 制作发布相关类型
  PublishStatus, TitleFormula, TagCategory,
  // 数据追踪相关类型
  TrackingNode, TrackingStatus,
  // 复盘记录相关类型
  ReviewType, ReviewPeriod, ReviewTrigger, ReviewStatus,
  ReviewDimension, ExperienceCategory,
  ReviewItem, ReviewExperience, ReviewAction,
    // 大脑知识库相关类型
  KnowledgeNodeType, KnowledgeEdgeType,
  KnowledgeNote,
}


// ========== 创建数据库 ==========
// 继承 Dexie 类，创建一个名为 "shannian-pro-v2" 的数据库
// （v2 库名用于绕过旧库主键不可变的限制，见构造函数内 version(1).stores 的注释）
class ShannianDatabase extends Dexie {
  // 主键类型已从 number 改为 string（UUID）
  // 原因：自增数字在各设备各自计数，同步到云端会撞号，详见 lib/id.ts
  todos!: Dexie.Table<Todo, string>  // todos 表（!表示在构造函数里赋值）

  notifications!: Dexie.Table<Notification, string>  // 通知表

  flashThoughts!: Dexie.Table<FlashThought, string>  // 闪念池表

  benchmarks!: Dexie.Table<Benchmark, string>  // 对标拆解表

  topics!: Dexie.Table<Topic, string> // 选题库表

  qaQuestions!: Dexie.Table<QaQuestion, string>  // 问答收集表

  inspirations!: Dexie.Table<Inspiration, string>  // 灵感记录表

  scriptTemplates!: Dexie.Table<ScriptTemplate, string>  // 脚本框架库表

  productions!: Dexie.Table<ProductionTask, string>  // 内容生产流程表

  publishRecords!: Dexie.Table<PublishRecord, string>  // 制作发布记录表

  tagLibrary!: Dexie.Table<TagLibrary, string>  // 常用标签库表

  trackingRecords!: Dexie.Table<TrackingRecord, string>  // 数据追踪记录表

  reviewRecords!: Dexie.Table<ReviewRecord, string>  // 复盘记录表

  knowledgeNodes!: Dexie.Table<KnowledgeNode, string>  // 知识节点表

  knowledgeEdges!: Dexie.Table<KnowledgeEdge, string>  // 知识边表

  knowledgeNotes!: Dexie.Table<KnowledgeNote, string>  // 知识笔记表

  syncMeta!: Dexie.Table<SyncMeta, string>  // 同步元信息表（记录最后同步时间）
  constructor() {
    // 数据库名称（在浏览器 IndexedDB 里用这个名字查找）
    // 从 "shannian-pro" 改为 "shannian-pro-v2"：彻底绕开旧库（v1~v11，自增数字主键）
    // 升级到 UUID 主键时 IndexedDB 不允许修改主键、会抛 "changing primary key" 的硬性限制。
    super("shannian-pro-v2")

    // ========== 版本说明（重要） ==========
    // 数据库名已升级为 "shannian-pro-v2"。
    //
    // 原因：历史版本（v1~v11）使用自增数字主键 "++id"，v12 起改为 UUID 字符串主键 "id"。
    // 但 IndexedDB 不允许修改已存在 object store 的主键（Dexie 会抛
    // "Not yet support for changing primary key"），任何持有旧库（v11 及更早）的
    // 用户在打开时都会直接崩溃。由于旧主键（数字）与新主键（UUID）本就不兼容、
    // 旧数据也设计为不保留（测试数据），最稳妥的做法是换一个全新的数据库名，
    // 从 version 1 直接以最终 schema 重建，彻底绕过 upgrade 路径里的主键冲突。
    //
    // 最终 schema（单一版本，干净无历史包袱）：
    //   - 所有业务表主键均为 "id"（UUID 字符串，由代码在写入前生成）
    //   - 所有业务表均带同步字段索引：synced / updatedAt / syncVersion
    //   - 新增 syncMeta 表，记录最后同步时间（键为 "lastSync" 等）
    this.version(1).stores({
      todos: "id, title, initialPriority, assignee, dueDate, status, source, creator, createdAt, completedAt, archived, synced, updatedAt, syncVersion",
      notifications: "id, type, relatedModule, receiver, status, createdAt, synced, updatedAt, syncVersion",
      flashThoughts: "id, status, categoryTarget, createdAt, processedAt, synced, updatedAt, syncVersion",
      benchmarks: "id, status, assignee, sourceChannel, createdAt, synced, updatedAt, syncVersion",
      topics: "id, status, source, priorityLevel, creator, createdAt, synced, updatedAt, syncVersion",
      qaQuestions: "id, status, source, creator, createdAt, synced, updatedAt, syncVersion",
      inspirations: "id, status, source, creator, createdAt, updatedAt, synced, syncVersion",
      scriptTemplates: "id, frameworkType, creator, createdAt, updatedAt, synced, syncVersion",
      productions: "id, mode, currentStage, status, assignee, createdAt, synced, updatedAt, syncVersion",
      publishRecords: "id, productionId, status, assignee, createdAt, updatedAt, synced, syncVersion",
      tagLibrary: "id, category, createdAt, synced, updatedAt, syncVersion",
      trackingRecords: "id, publishRecordId, node, status, assignee, createdAt, updatedAt, synced, syncVersion",
      reviewRecords: "id, type, status, assignee, createdAt, completedAt, synced, updatedAt, syncVersion",
      knowledgeNodes: "id, nodeType, sourceModule, sourceRecordId, createdAt, updatedAt, synced, syncVersion",
      knowledgeEdges: "id, sourceNodeId, targetNodeId, edgeType, createdAt, synced, syncVersion",
      knowledgeNotes: "id, createdAt, updatedAt, synced, syncVersion",
      syncMeta: "key",
    })
  }
}

// 创建数据库实例（全局唯一）
// export 表示这个变量可以被其他文件导入使用
export const db = new ShannianDatabase()

// 清理旧库（shannian-pro，自增数字主键时代的遗留库）
// 换用 "shannian-pro-v2" 后，旧库已成为孤儿，留着会白白占用浏览器空间。
// 这里在打开新库成功后，尝试删除旧库；失败则静默忽略（不阻塞主流程）。
db.open()
  .then(() => Dexie.delete("shannian-pro"))
  .catch(() => {
    /* 旧库可能不存在或已被删除，忽略 */
  })