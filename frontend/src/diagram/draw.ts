import type { ParsedQuery, QueryPlan } from '../store/sql'
import { SCHEMA_TABLES } from '../store/sql'
import { FONT, THEME, operationColor } from './theme'
import { ER, PLAN, layoutER, layoutPlan, planContentSegments, treeMarker, type Point } from './layout'

/*
 * 共享绘制层：ER 关系图与执行计划树都经由这些原语绘制，
 * 颜色 / 线宽 / 字体全部取自统一规则，绘制前按当前容器尺寸重新布局。
 */

type Ctx = CanvasRenderingContext2D

function setFont(ctx: Ctx, font: string) {
  ctx.font = `${font} ${FONT.stack}`
}

/** 虚线连接线（ER 的 JOIN 连线）。 */
function drawDashedLink(ctx: Ctx, src: Point, dst: Point) {
  ctx.beginPath()
  ctx.moveTo(src.x, src.y)
  ctx.lineTo(dst.x, dst.y)
  ctx.strokeStyle = THEME.link
  ctx.lineWidth = THEME.lineWidth
  ctx.setLineDash([...ER.dash])
  ctx.stroke()
  ctx.setLineDash([])
}

/** 圆角节点框（ER 的表节点）。 */
function drawNodeBox(ctx: Ctx, cx: number, cy: number) {
  ctx.beginPath()
  ctx.roundRect(cx - ER.nodeWidth / 2, cy - ER.nodeHeight / 2, ER.nodeWidth, ER.nodeHeight, ER.nodeRadius)
  ctx.fillStyle = THEME.nodeFill
  ctx.fill()
  ctx.strokeStyle = THEME.nodeStroke
  ctx.lineWidth = THEME.lineWidth
  ctx.stroke()
}

/**
 * 统一重绘入口：按当前容器尺寸重新计算并重绘 ER 关系图。
 * 保持原有绘制顺序（先 JOIN 连线，再表节点）与连接线标记不变。
 */
export function renderER(canvas: HTMLCanvasElement, parsed: ParsedQuery | null) {
  if (!parsed) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const containerW = canvas.clientWidth
  if (!containerW) return
  const tables = parsed.tables
  const layout = layoutER(containerW, tables)

  canvas.width = layout.width
  canvas.height = layout.height
  ctx.clearRect(0, 0, layout.width, layout.height)

  // JOIN 连线 + 中点的连接类型标记
  parsed.joins.forEach(j => {
    const src = tables.length ? layout.positions[tables[0]] : undefined
    const dst = layout.positions[j.table]
    if (!src || !dst) return
    drawDashedLink(ctx, src, dst)
    const mx = (src.x + dst.x) / 2
    const my = (src.y + dst.y) / 2
    setFont(ctx, FONT.nodeSubtitle)
    ctx.fillStyle = THEME.link
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(j.type, mx, my - 5)
  })

  // 表节点框 + 表名 + 行数
  tables.forEach(t => {
    const pos = layout.positions[t]
    if (!pos) return
    drawNodeBox(ctx, pos.x, pos.y)
    setFont(ctx, FONT.nodeTitle)
    ctx.fillStyle = THEME.nodeTitle
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t, pos.x, pos.y - 10)
    const schema = SCHEMA_TABLES.find(s => s.name === t)
    if (schema) {
      setFont(ctx, FONT.nodeSubtitle)
      ctx.fillStyle = THEME.nodeSubtitle
      ctx.fillText(schema.rowCount.toLocaleString() + ' rows', pos.x, pos.y + 10)
    }
  })
}

/**
 * 统一重绘入口：按当前容器尺寸重新计算并重绘执行计划树。
 * 缩进、连接线标记（│ └─）、分段配色与原 DOM 渲染完全一致。
 */
export function renderPlan(canvas: HTMLCanvasElement, plan: QueryPlan | null) {
  if (!plan) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 计划树宽度超出时由外层 overflow-x-auto 滚动，因此容器取滚动父元素的可视宽度
  const host = canvas.parentElement ?? canvas
  const containerW = host.clientWidth
  if (!containerW) return

  setFont(ctx, PLAN.font)
  const measure = (text: string, bold?: boolean) => {
    ctx.font = bold ? PLAN.fontBold : PLAN.font
    return ctx.measureText(text).width
  }
  const layout = layoutPlan(containerW, plan, measure)

  canvas.width = layout.width
  canvas.height = layout.height
  ctx.clearRect(0, 0, layout.width, layout.height)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  layout.rows.forEach(({ node: n, depth, index }) => {
    const x = PLAN.indent * depth
    const y = index * PLAN.rowHeight + PLAN.textBaselineY

    // 连接线标记
    ctx.font = PLAN.font
    ctx.fillStyle = THEME.marker
    ctx.fillText(treeMarker(depth), x, y)
    let cursor = x + measure(treeMarker(depth))

    // 操作名 / 表 / 索引 / cost 分段：字重与配色与原 DOM 各 span 一致
    planContentSegments(n).forEach(seg => {
      ctx.font = seg.bold ? PLAN.fontBold : PLAN.font
      ctx.fillStyle = segmentColor(seg.kind, n.operation)
      ctx.fillText(seg.text, cursor, y)
      cursor += measure(seg.text, seg.bold)
    })
  })
}

function segmentColor(kind: 'op' | 'table' | 'index' | 'meta', operation: string): string {
  switch (kind) {
    case 'op': return operationColor(operation)
    case 'table': return THEME.planTable
    case 'index': return THEME.planIndex
    case 'meta': return THEME.planMeta
  }
}
