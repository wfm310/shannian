// ========== 文件作用 ==========
// 大脑知识库的 API 层
// 负责数据同步、节点/笔记的 CRUD、双向链接计算、标签系统和搜索

import { db } from "@/lib/db"
import type {
  KnowledgeNode, KnowledgeEdge, KnowledgeNote,
  KnowledgeNodeType, KnowledgeEdgeType,
} from "@/lib/db"

// ========== 节点类型元数据 ==========
// 每种节点类型的显示名称和图标标识（图标在组件里用 lucide 映射）
export const NODE_TYPE_META: Record<
  KnowledgeNodeType,
  { label: string; module: string }
> = {
  FlashIdea:        { label: "闪念",     module: "flash-thought" },
  Benchmarking:     { label: "对标",     module: "benchmark" },
  Topic:            { label: "选题",     module: "topic-library" },
  QA:               { label: "问答",     module: "qa-collect" },
  Inspiration:      { label: "灵感",     module: "inspiration" },
  ScriptFramework:  { label: "框架",     module: "script-template" },
  ScriptContent:    { label: "文案",     module: "produce-flow" },
  PublishRecord:    { label: "发布",     module: "publish" },
  Review:           { label: "复盘",     module: "review" },
}

// ========== 边类型元数据 ==========
export const EDGE_TYPE_META: Record<
  KnowledgeEdgeType,
  { label: string }
> = {
  TRANSFORMED_TO:  { label: "转化为" },
  PRODUCED_AS:     { label: "生产为" },
  APPLIES:         { label: "应用" },
  PUBLISHED_AS:    { label: "发布为" },
  REVIEWED_FROM:   { label: "复盘自" },
  DERIVED_FROM:    { label: "派生自" },
  SHARED_TAG:      { label: "共享标签" },
}

// ========== 辅助函数 ==========
// 生成节点唯一标识 key（模块 + 记录ID）
function makeKey(module: string, recordId: number): string {
  return `${module}:${recordId}`
}

// ========== 同步函数 ==========
// 从所有模块读取数据，生成/更新知识节点和边

export async function syncFromModules(): Promise<{
  nodeCount: number
  edgeCount: number
}> {
  // 1. 读取所有模块的数据
  const [
    flashThoughts,
    benchmarks,
    topics,
    qaQuestions,
    inspirations,
    scriptTemplates,
    productions,
    publishRecords,
    reviewRecords,
  ] = await Promise.all([
    db.flashThoughts.toArray(),
    db.benchmarks.toArray(),
    db.topics.toArray(),
    db.qaQuestions.toArray(),
    db.inspirations.toArray(),
    db.scriptTemplates.toArray(),
    db.productions.toArray(),
    db.publishRecords.toArray(),
    db.reviewRecords.toArray(),
  ])

  // 2. 生成节点
  const nodes: KnowledgeNode[] = []
  const nodeKeyMap = new Map<string, KnowledgeNode>()

  // 闪念
  for (const f of flashThoughts) {
    if (!f.id) continue
    const key = makeKey("flash-thought", f.id)
    const node: KnowledgeNode = {
      nodeType: "FlashIdea",
      title: f.content.slice(0, 50),
      summary: f.content,
      sourceModule: "flash-thought",
      sourceRecordId: f.id,
      tags: [],
      status: f.status,
      links: [],
      linkedBy: [],
      createdAt: f.createdAt,
      updatedAt: f.createdAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 对标拆解
  for (const b of benchmarks) {
    if (!b.id) continue
    const key = makeKey("benchmark", b.id)
    const node: KnowledgeNode = {
      nodeType: "Benchmarking",
      title: b.title,
      summary: b.coreProblem || b.videoScript.slice(0, 100),
      sourceModule: "benchmark",
      sourceRecordId: b.id,
      tags: b.tags || [],
      status: b.status,
      links: [],
      linkedBy: [],
      createdAt: b.createdAt,
      updatedAt: b.createdAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 选题
  for (const t of topics) {
    if (!t.id) continue
    const key = makeKey("topic", t.id)
    const node: KnowledgeNode = {
      nodeType: "Topic",
      title: t.topicTitle,
      summary: t.topicNote || t.copyReference.slice(0, 100),
      sourceModule: "topic-library",
      sourceRecordId: t.id,
      tags: [],
      status: t.status,
      links: [],
      linkedBy: [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 问答
  for (const q of qaQuestions) {
    if (!q.id) continue
    const key = makeKey("qa", q.id)
    const node: KnowledgeNode = {
      nodeType: "QA",
      title: q.content.slice(0, 50),
      summary: q.content,
      sourceModule: "qa-collect",
      sourceRecordId: q.id,
      tags: [],
      status: q.status,
      links: [],
      linkedBy: [],
      createdAt: q.createdAt,
      updatedAt: q.createdAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 灵感
  for (const i of inspirations) {
    if (!i.id) continue
    const key = makeKey("inspiration", i.id)
    const node: KnowledgeNode = {
      nodeType: "Inspiration",
      title: i.content.slice(0, 50),
      summary: i.conclusion || i.content,
      sourceModule: "inspiration",
      sourceRecordId: i.id,
      tags: [],
      status: i.status,
      links: [],
      linkedBy: [],
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 脚本框架
  for (const s of scriptTemplates) {
    if (!s.id) continue
    const key = makeKey("script-template", s.id)
    const node: KnowledgeNode = {
      nodeType: "ScriptFramework",
      title: s.title,
      summary: s.steps.map((st) => st.name).join(", "),
      sourceModule: "script-template",
      sourceRecordId: s.id,
      tags: [],
      status: "active",
      links: [],
      linkedBy: [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 生产任务
  for (const p of productions) {
    if (!p.id) continue
    const key = makeKey("production", p.id)
    const rawSummary = p.rawContent || (p.scriptSteps?.map((s) => s.content).join(" ") ?? "")
    const node: KnowledgeNode = {
      nodeType: "ScriptContent",
      title: p.title,
      summary: rawSummary.slice(0, 200),
      sourceModule: "produce-flow",
      sourceRecordId: p.id,
      tags: [],
      status: p.status,
      links: [],
      linkedBy: [],
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 发布记录
  for (const pub of publishRecords) {
    if (!pub.id) continue
    const key = makeKey("publish", pub.id)
    const node: KnowledgeNode = {
      nodeType: "PublishRecord",
      title: pub.title,
      summary: pub.description,
      sourceModule: "publish",
      sourceRecordId: pub.id,
      tags: pub.hashtags || [],
      status: pub.status,
      links: [],
      linkedBy: [],
      createdAt: pub.createdAt,
      updatedAt: pub.updatedAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 复盘记录
  for (const r of reviewRecords) {
    if (!r.id) continue
    const key = makeKey("review", r.id)
    const node: KnowledgeNode = {
      nodeType: "Review",
      title: r.title,
      summary: r.dataComment || r.goodItems.map((g) => g.description).join(" "),
      sourceModule: "review",
      sourceRecordId: r.id,
      tags: [],
      status: r.status,
      links: [],
      linkedBy: [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
    nodes.push(node)
    nodeKeyMap.set(key, node)
  }

  // 3. 先清空旧数据，存入节点（拿到 Dexie 自增的真实 ID）
  await db.knowledgeNodes.clear()
  await db.knowledgeEdges.clear()

  if (nodes.length > 0) {
    await db.knowledgeNodes.bulkAdd(nodes)
  }

  // 4. 从数据库读回节点，此时已有真实 id
  const savedNodes = await db.knowledgeNodes.toArray()
  // 重建 nodeKeyMap（用真实 id）
  const nodeKeyMapWithId = new Map<string, KnowledgeNode>()
  for (const node of savedNodes) {
    const key = makeKey(node.sourceModule, node.sourceRecordId)
    nodeKeyMapWithId.set(key, node)
  }

  // 5. 生成边（确定性关系）
  const edges: KnowledgeEdge[] = []

  // 选题 → 来源（闪念/对标/灵感/问答/复盘）
  for (const t of topics) {
    if (!t.id || t.sourceId === null) continue
    const sourceMap: Record<string, string> = {
      benchmark: "benchmark",
      qa: "qa",
      inspiration: "inspiration",
      review: "review",
      "flash-thought": "flash-thought",
    }
    const sourceModule = sourceMap[t.source]
    if (!sourceModule) continue
    const sourceKey = makeKey(sourceModule, t.sourceId)
    const targetKey = makeKey("topic-library", t.id)
    const sourceNode = nodeKeyMapWithId.get(sourceKey)
    const targetNode = nodeKeyMapWithId.get(targetKey)
    if (sourceNode?.id && targetNode?.id) {
      edges.push({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        edgeType: "DERIVED_FROM",
        weight: 1,
        createdAt: t.createdAt,
      })
    }
  }

  // 生产任务 → 选题
  for (const p of productions) {
    if (!p.id || p.topicId === null) continue
    const sourceKey = makeKey("topic-library", p.topicId)
    const targetKey = makeKey("produce-flow", p.id)
    const sourceNode = nodeKeyMapWithId.get(sourceKey)
    const targetNode = nodeKeyMapWithId.get(targetKey)
    if (sourceNode?.id && targetNode?.id) {
      edges.push({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        edgeType: "PRODUCED_AS",
        weight: 1,
        createdAt: p.createdAt,
      })
    }
  }

  // 生产任务 → 脚本框架
  for (const p of productions) {
    if (!p.id || p.frameworkId === null) continue
    const sourceKey = makeKey("produce-flow", p.id)
    const targetKey = makeKey("script-template", p.frameworkId)
    const sourceNode = nodeKeyMapWithId.get(sourceKey)
    const targetNode = nodeKeyMapWithId.get(targetKey)
    if (sourceNode?.id && targetNode?.id) {
      edges.push({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        edgeType: "APPLIES",
        weight: 1,
        createdAt: p.createdAt,
      })
    }
  }

  // 发布记录 → 生产任务
  for (const pub of publishRecords) {
    if (!pub.id) continue
    const sourceKey = makeKey("produce-flow", pub.productionId)
    const targetKey = makeKey("publish", pub.id)
    const sourceNode = nodeKeyMapWithId.get(sourceKey)
    const targetNode = nodeKeyMapWithId.get(targetKey)
    if (sourceNode?.id && targetNode?.id) {
      edges.push({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        edgeType: "PUBLISHED_AS",
        weight: 1,
        createdAt: pub.createdAt,
      })
    }
  }

  // 复盘 → 发布记录
  for (const r of reviewRecords) {
    if (!r.id || r.publishRecordId === null) continue
    const sourceKey = makeKey("review", r.id)
    const targetKey = makeKey("publish", r.publishRecordId)
    const sourceNode = nodeKeyMapWithId.get(sourceKey)
    const targetNode = nodeKeyMapWithId.get(targetKey)
    if (sourceNode?.id && targetNode?.id) {
      edges.push({
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        edgeType: "REVIEWED_FROM",
        weight: 1,
        createdAt: r.createdAt,
      })
    }
  }

  // 标签关联：共享相同标签的节点之间建边
  const tagGroups = new Map<string, KnowledgeNode[]>()
  for (const node of savedNodes) {
    if (!node.id || !node.tags || node.tags.length === 0) continue
    for (const tag of node.tags) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, [])
      tagGroups.get(tag)!.push(node)
    }
  }
  for (const [, group] of tagGroups) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        if (!a.id || !b.id) continue
        edges.push({
          sourceNodeId: a.id,
          targetNodeId: b.id,
          edgeType: "SHARED_TAG",
          weight: 0.5,
          createdAt: Math.max(a.createdAt, b.createdAt),
        })
      }
    }
  }

  // 同模块时间关联：同模块内创建时间相近的节点建边（24小时内）
  const moduleGroups = new Map<string, KnowledgeNode[]>()
  for (const node of savedNodes) {
    if (!node.id) continue
    if (!moduleGroups.has(node.sourceModule)) moduleGroups.set(node.sourceModule, [])
    moduleGroups.get(node.sourceModule)!.push(node)
  }
  for (const [, group] of moduleGroups) {
    if (group.length < 2) continue
    group.sort((a, b) => a.createdAt - b.createdAt)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        if (!a.id || !b.id) continue
        const diff = Math.abs(b.createdAt - a.createdAt)
        if (diff > 86400000) break
        edges.push({
          sourceNodeId: a.id,
          targetNodeId: b.id,
          edgeType: "DERIVED_FROM",
          weight: 0.3,
          createdAt: b.createdAt,
        })
      }
    }
  }

  // 6. 写入边
  if (edges.length > 0) {
    await db.knowledgeEdges.bulkAdd(edges)
  }

  // 5. 重新计算双向链接（linkedBy）
  await recalculateBacklinks()

  return { nodeCount: nodes.length, edgeCount: edges.length }
}

// ========== 双向链接计算 ==========
// 遍历所有节点的 links 字段，反向计算 linkedBy

export async function recalculateBacklinks(): Promise<void> {
  const allNodes = await db.knowledgeNodes.toArray()
  const allNotes = await db.knowledgeNotes.toArray()

  // 为每个节点初始化 linkedBy
  const backlinkMap = new Map<number, number[]>()

  for (const node of allNodes) {
    if (!node.id || !node.links) continue
    for (const targetId of node.links) {
      if (!backlinkMap.has(targetId)) {
        backlinkMap.set(targetId, [])
      }
      backlinkMap.get(targetId)!.push(node.id)
    }
  }

  for (const note of allNotes) {
    if (!note.id || !note.links) continue
    for (const targetId of note.links) {
      if (!backlinkMap.has(targetId)) {
        backlinkMap.set(targetId, [])
      }
      backlinkMap.get(targetId)!.push(note.id)
    }
  }

  // 更新到数据库
  for (const node of allNodes) {
    if (!node.id) continue
    const linkedBy = backlinkMap.get(node.id) || []
    await db.knowledgeNodes.update(node.id, { linkedBy })
  }
}

// ========== 节点 CRUD ==========

export async function getNodes(): Promise<KnowledgeNode[]> {
  return db.knowledgeNodes.orderBy("createdAt").reverse().toArray()
}

export async function getNode(id: number): Promise<KnowledgeNode | undefined> {
  return db.knowledgeNodes.get(id)
}

export async function updateNodeLinks(
  nodeId: number,
  links: number[]
): Promise<void> {
  await db.knowledgeNodes.update(nodeId, { links, updatedAt: Date.now() })
  await recalculateBacklinks()
}

// ========== 笔记 CRUD ==========

export async function getNotes(): Promise<KnowledgeNote[]> {
  return db.knowledgeNotes.orderBy("createdAt").reverse().toArray()
}

export async function getNote(id: number): Promise<KnowledgeNote | undefined> {
  return db.knowledgeNotes.get(id)
}

export async function createNote(
  note: Omit<KnowledgeNote, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const now = Date.now()
  const id = await db.knowledgeNotes.add({
    ...note,
    createdAt: now,
    updatedAt: now,
  } as KnowledgeNote)
  await recalculateBacklinks()
  return id
}

export async function updateNote(
  id: number,
  updates: Partial<KnowledgeNote>
): Promise<void> {
  await db.knowledgeNotes.update(id, { ...updates, updatedAt: Date.now() })
  await recalculateBacklinks()
}

// 注意：本项目全局无删除功能
// 原有的删除知识笔记（deleteNote）已移除
// 笔记是知识沉淀的结晶，不做删除

// ========== 标签系统 ==========

export async function getAllTags(): Promise<string[]> {
  const [nodes, notes] = await Promise.all([
    db.knowledgeNodes.toArray(),
    db.knowledgeNotes.toArray(),
  ])

  const tagSet = new Set<string>()
  for (const n of nodes) {
    if (n.tags) n.tags.forEach((t) => tagSet.add(t))
  }
  for (const n of notes) {
    if (n.tags) n.tags.forEach((t) => tagSet.add(t))
  }

  return Array.from(tagSet).sort()
}

// ========== 搜索 ==========

export async function searchKnowledge(
  query: string
): Promise<{ nodes: KnowledgeNode[]; notes: KnowledgeNote[] }> {
  const lowerQuery = query.toLowerCase()

  const [nodes, notes] = await Promise.all([
    db.knowledgeNodes.toArray(),
    db.knowledgeNotes.toArray(),
  ])

  const matchedNodes = nodes.filter(
    (n) =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.summary.toLowerCase().includes(lowerQuery) ||
      n.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  )

  const matchedNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery) ||
      n.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  )

  return { nodes: matchedNodes, notes: matchedNotes }
}

// ========== 图谱数据 ==========

export interface GraphData {
  nodes: { id: number; label: string; type: KnowledgeNodeType; tags: string[] }[]
  edges: { source: number; target: number; type: KnowledgeEdgeType }[]
}

export async function getGraphData(): Promise<GraphData> {
  const [nodes, edges] = await Promise.all([
    db.knowledgeNodes.toArray(),
    db.knowledgeEdges.toArray(),
  ])

  return {
    nodes: nodes.map((n) => ({
      id: n.id!,
      label: n.title,
      type: n.nodeType,
      tags: n.tags,
    })),
    edges: edges.map((e) => ({
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: e.edgeType,
    })),
  }
}

// ========== 解析 Markdown 双向链接 ==========
// 从 Markdown 文本中提取 [[链接标题]] 格式的引用

export function parseMarkdownLinks(content: string): string[] {
  const regex = /\[\[(.+?)\]\]/g
  const matches: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1].trim())
  }
  return matches
}

// ========== 根据标题查找节点ID ==========

export async function findNodeIdByTitle(title: string): Promise<number | null> {
  const node = await db.knowledgeNodes
    .where("title")
    .equalsIgnoreCase(title)
    .first()
  return node?.id ?? null
}