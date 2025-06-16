import type { Position } from './measurementStore'

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 100
): T & { clearTimeout: () => void } {
  let timeout: number | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = window.setTimeout(() => {
      timeout = null
      func(...args)
    }, wait)
  }) as T & { clearTimeout: () => void }

  debounced.clearTimeout = () => {
    if (timeout) clearTimeout(timeout)
  }

  return debounced
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 100
): T & { clearTimeout: () => void } {
  let lastTime: number | undefined
  let timeout: number | undefined

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now()

    if (lastTime !== undefined && now - lastTime < wait) {
      clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        lastTime = now
        func(...args)
      }, wait - (now - (lastTime ?? 0)))
    } else {
      lastTime = now
      func(...args)
    }
  }) as T & { clearTimeout: () => void }

  throttled.clearTimeout = () => {
    if (timeout) clearTimeout(timeout)
  }

  return throttled
}

/**
 * 获取滚动位置
 */
export function getScrollTop(element: HTMLElement | Window): number {
  if (element === window || element instanceof Window) {
    return window.scrollY !== undefined
      ? window.scrollY
      : document.documentElement?.scrollTop ?? 0
  }
  return element.scrollTop
}

/**
 * 获取容器高度
 */
export function getContainerHeight(element: HTMLElement | Window): number {
  return element instanceof Window ? window.innerHeight : element.clientHeight
}

/**
 * 获取容器偏移量
 */
export function getContainerOffset(element: HTMLElement | Window): number {
  if (element === window || element instanceof Window) {
    return window.scrollY !== undefined
      ? window.scrollY
      : document.documentElement?.scrollTop ?? 0
  }
  return element.scrollTop - element.getBoundingClientRect().top
}

/**
 * 计算列数
 */
export function calculateColumnCount({
  gutter,
  columnWidth,
  width,
  minCols
}: {
  gutter: number
  columnWidth: number
  width: number
  minCols: number
}): number {
  return Math.max(Math.floor(width / (columnWidth + gutter)), minCols)
}

/**
 * 获取最小高度列的索引
 */
export function getMinHeightIndex(heights: number[]): number {
  return heights.length ? heights.indexOf(Math.min(...heights)) : 0
}

/**
 * 计算中心偏移量
 */
export function calculateCenterOffset({
  align,
  columnCount,
  columnWidthAndGutter,
  gutter,
  layout,
  rawItemCount,
  width
}: {
  align: string
  columnCount: number
  columnWidthAndGutter: number
  gutter: number
  layout: string
  rawItemCount: number
  width: number
}): number {
  if (layout === 'basicCentered') {
    return Math.max(Math.floor((width - (Math.min(rawItemCount, columnCount) * columnWidthAndGutter + gutter)) / 2), 0)
  }
  if (align === 'center') {
    return Math.max(Math.floor((width - columnWidthAndGutter * columnCount + gutter) / 2), 0)
  }
  if (align === 'end') {
    return width - (columnWidthAndGutter * columnCount - gutter)
  }
  return 0
}

/**
 * 创建默认位置
 */
export function createDefaultPosition(width: number, height: number = Infinity): Position {
  return {
    top: -9999,
    left: -9999,
    width,
    height
  }
}

/**
 * 安全的CSS值转换
 */
export function toCSSValue(value: number): number | undefined {
  return value && value !== Infinity ? value : undefined
}

/**
 * 检查元素是否在可视区域内
 */
export function isElementVisible({
  itemTop,
  itemHeight,
  scrollTop,
  containerHeight,
  containerOffset,
  virtualBoundsTop,
  virtualBoundsBottom,
  virtualBufferFactor
}: {
  itemTop: number
  itemHeight: number
  scrollTop: number
  containerHeight: number
  containerOffset: number
  virtualBoundsTop?: number
  virtualBoundsBottom?: number
  virtualBufferFactor?: number
}): boolean {
  const bufferZone = virtualBufferFactor ? containerHeight * virtualBufferFactor : 0
  const visibleTop = scrollTop - containerOffset
  const visibleBottom = virtualBoundsBottom
    ? visibleTop + containerHeight + virtualBoundsBottom
    : visibleTop + containerHeight + bufferZone

  const itemBottom = itemTop + itemHeight
  const adjustedTop = virtualBoundsTop ? visibleTop - virtualBoundsTop : visibleTop - bufferZone

  return !(itemBottom < adjustedTop || itemTop > visibleBottom)
}
