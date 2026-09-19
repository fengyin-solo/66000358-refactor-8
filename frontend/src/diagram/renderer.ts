import { onBeforeUnmount, onMounted, watch, type WatchSource } from 'vue'

export interface DiagramRenderer {
  /** 无画布 / 无数据 / 容器不可见时自行跳过；不能抛异常 */
  (): void
}

/**
 * 两个展示共用的唯一重绘入口：
 * - 注册的所有渲染器每次一起重绘，重绘时各自按「当前容器尺寸」重新计算布局；
 * - 数据变化（watch）与窗口尺寸变化（window resize，全局只挂这一个监听）
 *   都收敛到同一个 scheduleRedraw，经 requestAnimationFrame 合帧，一帧只画一次。
 *
 * sources 传 getter（store 上的属性已被 Pinia 解包，不能直接传值）。
 */
export function useDiagramRedraw(renderers: DiagramRenderer[], sources: WatchSource<unknown>[] = []) {
  let frame = 0

  const scheduleRedraw = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      renderers.forEach(render => render())
    })
  }

  sources.forEach(source => watch(source, scheduleRedraw))

  onMounted(() => {
    // 等首屏 DOM 布局完成后，按实际容器尺寸首次绘制
    requestAnimationFrame(scheduleRedraw)
    window.addEventListener('resize', scheduleRedraw)
  })

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('resize', scheduleRedraw)
  })

  return { scheduleRedraw }
}
