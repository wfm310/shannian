// ========== core：业务规则层统一出口 ==========
//
// 分层说明（对应 项目文档/00-项目总纲.md 第七节 L-token / L-shell / L-page）：
//   src/lib/db.ts        数据模型（形）
//   src/lib/core/        业务规则（神）← 本目录
//   src/components/      UI 表现（皮）
//
// core 层不依赖任何 UI，可在 Node / 浏览器 / 测试环境独立运行。

export * from "./events"
export * from "./state-machine"
export * from "./conversion"
export * from "./notification-rules"
export * from "./archive"
