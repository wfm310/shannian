// ========== 全局唯一 ID 生成 ==========
//
// 为什么不用数据库自增数字（++id）？
//
// 自增是「各设备各自计数」的：
//   你电脑上第 1 条对标 = 某个视频
//   小伙伴手机上第 1 条对标 = 另一个视频
//   两条完全不同的记录，编号却都叫 1
//   → 同步到云端就会打架，数据错乱
//
// 改用 UUID 后，每条记录在全世界范围内有唯一编号，永远不会冲突。
// 这是双人协作 + 云端同步的前提。

/**
 * 生成一个新的全局唯一 ID
 * 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function newId(): string {
  // 优先使用浏览器原生 API（现代浏览器都支持，且是真随机）
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  // 兜底方案：极老浏览器或特殊环境
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 生成新建记录时的同步字段初始值
 * synced=false（本地新建，尚未同步云端）、updatedAt=现在、syncVersion=1
 * 供所有 create 函数在写入数据时统一附带，避免每个文件手写
 */
export function newSyncFields(): {
  synced: boolean
  updatedAt: number
  syncVersion: number
} {
  const now = Date.now()
  return {
    synced: false,
    updatedAt: now,
    syncVersion: 1,
  }
}

/**
 * 生成更新记录时的同步字段（标记本地已改动、待同步）
 * @param currentVersion 当前记录的 syncVersion，+1 用于乐观并发控制
 */
export function touchSyncFields(currentVersion: number): {
  synced: boolean
  updatedAt: number
  syncVersion: number
} {
  return {
    synced: false,
    updatedAt: Date.now(),
    syncVersion: currentVersion + 1,
  }
}
