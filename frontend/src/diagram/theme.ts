/**
 * 关系图（ER）与执行计划树共用的唯一配色 / 字体规则。
 * 两个展示的所有颜色、字号都从这里取，禁止再在各组件内硬编码。
 */
export const THEME = {
  /* ---- 节点框（ER 表节点） ---- */
  nodeFill: '#1e293b', // slate-800
  nodeStroke: '#3b82f6', // blue-500
  nodeTitle: '#06b6d4', // cyan-500
  nodeSubtitle: '#64748b', // slate-500

  /* ---- 连接线（ER 的 JOIN 连线 / 高亮色） ---- */
  link: '#f97316', // orange-500

  /* ---- 执行计划树 ---- */
  marker: '#475569', // slate-600，树状连接线标记 │ └─
  planTable: '#94a3b8', // slate-400，" on table"
  planIndex: '#eab308', // yellow-500，" [index]"
  planMeta: '#64748b', // slate-500，cost/rows
  opScan: '#22c55e', // green-500
  opJoin: '#f97316', // orange-500，与连接线高亮同色
  opSort: '#8b5cf6', // violet-500
  opDefault: '#06b6d4', // cyan-500

  /* ---- 共用描边宽度 ---- */
  lineWidth: 2,
} as const

/** 两个展示统一使用的字体栈（与 Tailwind font-mono 一致）与字号。 */
export const FONT = {
  stack: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  nodeTitle: 'bold 13px', // ER 表名
  nodeSubtitle: '10px', // ER 行数 / JOIN 类型
  plan: '12px', // 执行计划树文本（对应 text-xs）
} as const

/** 执行计划节点操作类型 → 颜色，ER 与计划树统一走这一份判定。 */
export function operationColor(operation: string): string {
  if (operation.includes('Scan')) return THEME.opScan
  if (operation.includes('Join')) return THEME.opJoin
  if (operation.includes('Sort')) return THEME.opSort
  return THEME.opDefault
}
