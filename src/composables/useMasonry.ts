import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

// 测量存储类，用于缓存项目高度
class MeasurementStore {
  private measurements = new Map<any, number>()

  has(item: any): boolean {
    return this.measurements.has(item)
  }

  get(item: any): number | undefined {
    return this.measurements.get(item)
  }

  set(item: any, height: number): void {
    this.measurements.set(item, height)
  }

  reset(): void {
    this.measurements.clear()
  }
}

// 位置信息接口
interface Position {
  top: number
  left: number
  width: number
  height: number
}

// 瀑布流配置
interface MasonryConfig {
  columnWidth?: number
  gutterWidth?: number
  minCols?: number
  align?: 'left' | 'center' | 'right'
}

// 防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: number
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }) as T
}

// 节流函数
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}

// 计算列数
function getColumnCount(containerWidth: number, columnWidth: number, gutterWidth: number, minCols: number): number {
  if (!containerWidth || !columnWidth) return minCols

  const availableWidth = containerWidth + gutterWidth
  const itemWidth = columnWidth + gutterWidth
  const cols = Math.floor(availableWidth / itemWidth)

  return Math.max(cols, minCols)
}

// 计算项目位置的核心算法
function calculatePositions(
  items: any[],
  measurementStore: MeasurementStore,
  containerWidth: number,
  columnWidth: number,
  gutterWidth: number,
  minCols: number,
  align: string = 'center'
): Position[] {
  if (!containerWidth) return []

  const columnCount = getColumnCount(containerWidth, columnWidth, gutterWidth, minCols)
  const positions: Position[] = []
  const columnHeights = new Array(columnCount).fill(0)

  // 计算左偏移量用于对齐
  const totalColumnsWidth = columnCount * columnWidth + (columnCount - 1) * gutterWidth
  let leftOffset = 0

  if (align === 'center') {
    leftOffset = Math.max(0, (containerWidth - totalColumnsWidth) / 2)
  } else if (align === 'right') {
    leftOffset = Math.max(0, containerWidth - totalColumnsWidth)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) continue

    const height = measurementStore.get(item) || 0

    // 找到高度最小的列
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
    const left = leftOffset + shortestColumnIndex * (columnWidth + gutterWidth)
    const top = columnHeights[shortestColumnIndex]

    positions.push({
      top,
      left,
      width: columnWidth,
      height
    })

    // 更新该列的高度
    columnHeights[shortestColumnIndex] += height + gutterWidth
  }

  return positions
}

export function useMasonry(config: MasonryConfig = {}) {
  const {
    columnWidth = 240,
    gutterWidth = 20,
    minCols = 2,
    align = 'center'
  } = config

  // 状态管理
  const containerRef = ref<HTMLElement>()
  const containerWidth = ref<number>(0)
  const measurementStore = new MeasurementStore()
  const positions = ref<Position[]>([])
  const containerHeight = ref<number>(0)
  const items = ref<any[]>([])

  // ResizeObserver 用于监听元素高度变化
  let resizeObserver: ResizeObserver | null = null

  // 测量容器宽度
  const measureContainer = () => {
    if (containerRef.value) {
      containerWidth.value = containerRef.value.getBoundingClientRect().width
    }
  }

  // 防抖的测量函数
  const debouncedMeasure = debounce(measureContainer, 100)

  // 重新计算布局
  const recalculateLayout = () => {
    const newPositions = calculatePositions(
      items.value,
      measurementStore,
      containerWidth.value,
      columnWidth,
      gutterWidth,
      minCols,
      align
    )

    positions.value = newPositions

    // 计算容器高度
    if (newPositions.length > 0) {
      containerHeight.value = Math.max(...newPositions.map(pos => pos.top + pos.height))
    } else {
      containerHeight.value = 0
    }
  }

  // 更新项目高度
  const updateItemHeight = (item: any, height: number) => {
    measurementStore.set(item, height)
    recalculateLayout()
  }

  // 重置布局
  const reset = () => {
    measurementStore.reset()
    positions.value = []
    containerHeight.value = 0
    nextTick(() => {
      recalculateLayout()
    })
  }

  // 监听容器宽度变化
  watch(containerWidth, (newWidth, oldWidth) => {
    if (newWidth !== oldWidth && newWidth > 0) {
      reset()
    }
  })

  // 监听项目变化
  watch(() => items.value.length, () => {
    nextTick(() => {
      recalculateLayout()
    })
  }, { flush: 'post' })

  // 处理窗口大小变化
  const handleResize = throttle(() => {
    measureContainer()
  }, 100)

  // 设置ResizeObserver
  const setupResizeObserver = () => {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        let needsRecalculation = false

        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          const itemIndex = element.getAttribute('data-item-index')

          if (itemIndex !== null) {
            const index = parseInt(itemIndex, 10)
            const item = items.value[index]
            const newHeight = entry.contentRect.height

            if (item && measurementStore.get(item) !== newHeight) {
              measurementStore.set(item, newHeight)
              needsRecalculation = true
            }
          }
        })

        if (needsRecalculation) {
          recalculateLayout()
        }
      })
    }
  }

  // 观察项目元素
  const observeItem = (element: HTMLElement, index: number) => {
    if (resizeObserver && element) {
      element.setAttribute('data-item-index', index.toString())
      resizeObserver.observe(element)
    }
  }

  // 停止观察项目元素
  const unobserveItem = (element: HTMLElement) => {
    if (resizeObserver && element) {
      resizeObserver.unobserve(element)
    }
  }

  onMounted(() => {
    setupResizeObserver()
    window.addEventListener('resize', handleResize)
    measureContainer()
  })

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    window.removeEventListener('resize', handleResize)
  })

  return {
    // Refs
    containerRef,
    containerWidth: computed(() => containerWidth.value),
    containerHeight: computed(() => containerHeight.value),
    positions: computed(() => positions.value),
    items,

    // Methods
    updateItemHeight,
    reset,
    observeItem,
    unobserveItem,
    measureContainer: debouncedMeasure
  }
}
