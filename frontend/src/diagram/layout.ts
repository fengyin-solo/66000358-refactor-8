import type { QueryPlan } from '../store/sql'
import { FONT } from './theme'

/**
 * 关系图与执行计划树共用的布局 / 尺寸规则。
 * 所有尺寸都在每次重绘时依据「当前容器宽度」现场计算，
 * 两个展示只允许从这里取节点尺寸、间距与缩进，不各自维护。
 */

/* ---- 关系图（ER）尺寸 ---- */
export const ER = {
  height: 200, // 画布固定高度
  nodeWidth: 100, // 表节点框宽
  nodeHeight: 60, // 表节点框高
  nodeRadius: 6, // 圆角
  dash: [4, 4] as const, // JOIN 连线虚线
  /** 节点横向间距：容器等分（columns = 表数 + 1），第 i 张表位于第 i+1 列 */
  spacing(containerWidth: number, tableCount: number): number {
    return containerWidth / (tableCount + 1)
  },
} as const

/* ---- 执行计划树尺寸 ---- */
export const PLAN = {
  indent: 20, // 每层缩进
  rowHeight: 16, // 每行高度（对齐原 DOM 渲染的 text-xs 行高）
  textBaselineY: 12, // 首行文字基线（font=12px，ascent≈10，垂直位置与 DOM 一致）
  minWidth: 0, // 内容不足一屏时仍铺满容器（由 max(容器宽, 内容宽) 决定）
  font: `${FONT.plan} ${FONT.stack}`,
  fontBold: `bold ${FONT.plan} ${FONT.stack}`, // 操作名在原 DOM 中为 bold
} as const

export interface Point { x: number; y: number }

/** 测量当前容器宽度；画布隐藏（display:none）时返回 0，调用方应跳过本次重绘。 */
export function containerWidth(el: HTMLElement): number {
  return el.clientWidth
}

/* ---- 关系图布局 ---- */
export interface ERLayout {
  width: number
  height: number
  positions: Record<string, Point>
}

/** 按当前容器宽度把各表等间距排在同一水平中线上。 */
export function layoutER(containerW: number, tables: string[]): ERLayout {
  const spacing = ER.spacing(containerW, tables.length)
  const positions: Record<string, Point> = {}
  tables.forEach((t, i) => {
    positions[t] = { x: spacing * (i + 1), y: ER.height / 2 }
  })
  return { width: containerW, height: ER.height, positions }
}

/* ---- 执行计划树布局 ---- */
export interface PlanRow {
  node: QueryPlan
  depth: number
  index: number
}

/** 先序展开计划树（父节点在前、子节点依次在后），与原 DOM 递归渲染顺序一致。 */
export function flattenPlan(node: QueryPlan | null | undefined): PlanRow[] {
  const rows: PlanRow[] = []
  const walk = (n: QueryPlan | null | undefined, depth: number) => {
    if (!n) return
    rows.push({ node: n, depth, index: rows.length })
    n.children.forEach(c => walk(c, depth + 1))
  }
  walk(node, 0)
  return rows
}

/** 生成与原 DOM 完全一致的连接线标记：两层空格 → "│ "，末尾 → "└─"。 */
export function treeMarker(depth: number): string {
  return '  '.repeat(depth).replace(/\s\s/g, '│ ').replace(/│ $/, '└─')
}

export interface PlanLayout {
  width: number
  height: number
  rows: PlanRow[]
}

/**
 * 按当前容器宽度布局计划树：
 * 宽度取容器宽与内容所需宽（最深缩进 + 最长文本）的较大值，
 * 高度随行数计算；宽度超出容器时由外层 overflow-x-auto 滚动（与原表现一致）。
 */
export function layoutPlan(containerW: number, plan: QueryPlan | null, measure: (text: string, bold?: boolean) => number): PlanLayout {
  const rows = flattenPlan(plan)
  let contentWidth = 0
  rows.forEach(r => {
    // 与原 DOM 一致：padding-left(缩进) + 连接线标记宽 + 各分段宽（操作名为粗体）
    let rowWidth = PLAN.indent * r.depth + measure(treeMarker(r.depth))
    planContentSegments(r.node).forEach(s => { rowWidth += measure(s.text, s.bold) })
    contentWidth = Math.max(contentWidth, rowWidth)
  })
  return {
    width: Math.max(containerW, contentWidth, PLAN.minWidth),
    height: rows.length * PLAN.rowHeight,
    rows,
  }
}

/** 计划节点的文本分段（顺序与原 DOM span 一致），bold 对应操作名的粗体。 */
export interface PlanSegment {
  text: string
  bold?: boolean
  kind: 'op' | 'table' | 'index' | 'meta'
}

export function planContentSegments(n: QueryPlan): PlanSegment[] {
  const segments: PlanSegment[] = [{ text: n.operation, bold: true, kind: 'op' }]
  if (n.table) segments.push({ text: ` on ${n.table}`, kind: 'table' })
  if (n.index) segments.push({ text: ` [${n.index}]`, kind: 'index' })
  segments.push({ text: ` cost=${n.cost.toFixed(1)} rows=${n.rows}`, kind: 'meta' })
  return segments
}
