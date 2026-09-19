import { onBeforeUnmount, onMounted, watch, type WatchSource } from 'vue'

/**
 * Shared drawing, layout and sizing rules for the plan tree and the
 * table relation diagram. Both views read colors, spacing and redraw
 * timing from this single module so the two never drift apart.
 */
export const DIAGRAM_COLORS = {
  scan: '#22c55e',
  join: '#f97316',
  sort: '#8b5cf6',
  default: '#06b6d4',
  nodeFill: '#1e293b',
  nodeBorder: '#3b82f6',
  guide: '#475569',
  table: '#94a3b8',
  index: '#eab308',
  muted: '#64748b',
} as const

export function operationColor(operation: string): string {
  if (operation.includes('Scan')) return DIAGRAM_COLORS.scan
  if (operation.includes('Join')) return DIAGRAM_COLORS.join
  if (operation.includes('Sort')) return DIAGRAM_COLORS.sort
  return DIAGRAM_COLORS.default
}

export const DIAGRAM_LAYOUT = {
  canvasHeight: 200,
  nodeWidth: 100,
  nodeHeight: 60,
  nodeRadius: 6,
  indentPerDepth: 20,
} as const

export interface DiagramPoint {
  x: number
  y: number
}

/** Evenly space `count` nodes across the current container width. */
export function layoutNodePositions(containerWidth: number, count: number, height: number = DIAGRAM_LAYOUT.canvasHeight): DiagramPoint[] {
  const spacing = containerWidth / (count + 1)
  return Array.from({ length: count }, (_, i) => ({ x: spacing * (i + 1), y: height / 2 }))
}

/**
 * Single redraw entry shared by both diagram views: redraw after mount,
 * when the watched data changes, and when the window resizes. Each redraw
 * recomputes layout from the current container size.
 */
export function useDiagramRedraw(redraw: () => void, sources: WatchSource[], delays = { mount: 200, change: 100 }) {
  onMounted(() => setTimeout(redraw, delays.mount))
  watch(sources, () => setTimeout(redraw, delays.change), { deep: true })
  const onResize = () => redraw()
  window.addEventListener('resize', onResize)
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))
}
