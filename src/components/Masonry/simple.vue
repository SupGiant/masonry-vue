<template>
  <div
    ref="containerRef"
    class="masonry-container"
    :style="containerStyle"
  >
    <div
      v-for="(item, index) in visibleItems"
      :key="item.id"
      class="masonry-item"
      :style="getItemStyle(item, index)"
      :ref="(el) => setItemRef(el, item, index)"
    >
      <slot name="item" :item="item" :index="index">
        {{ item }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue'

export interface MasonryItem {
  id: string | number
  [key: string]: any
}

interface Props {
  items: MasonryItem[]
  columnWidth?: number
  gutter?: number
  minCols?: number
  maxCols?: number
  virtualize?: boolean
  virtualBufferFactor?: number
  // 新增：是否启用动态高度测量
  dynamicHeights?: boolean
  // 新增：是否使用 RAF 优化
  useRAF?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 240,
  gutter: 16,
  minCols: 3,
  maxCols: 8,
  virtualize: false,
  virtualBufferFactor: 0.7,
  dynamicHeights: true,
  useRAF: true
})

const emit = defineEmits<{
  loadMore: []
}>()

// 响应式状态
const containerRef = ref<HTMLElement>()
const itemRefs = new Map<string | number, HTMLElement>()

// ResizeObserver 实例
let resizeObserver: ResizeObserver | null = null

// RAF 相关
let pendingMeasurements = false
let rafId: number | null = null

const state = reactive({
  containerWidth: 0,
  containerHeight: 0,
  containerOffset: 0,
  scrollTop: 0,
  itemHeights: new Map<string | number, number>(),
  positions: new Map<string | number, { top: number; left: number; width: number; height: number }>(),
  // 新增：是否有待处理的测量
  hasPendingMeasurements: false,
  // 新增：是否正在测量中
  isMeasuring: false
})

// 计算列数 - columnWidth作为最小宽度
const columnCount = computed(() => {
  if (!state.containerWidth) return props.minCols

  // 计算基于最小列宽的最大可能列数
  const maxPossibleCols = Math.floor(state.containerWidth / (props.columnWidth + props.gutter))

  // 在最小和最大列数之间取值
  return Math.max(
    Math.min(maxPossibleCols, props.maxCols),
    props.minCols
  )
})

// 计算实际列宽 - 基于列数重新分配剩余空间
const actualColumnWidth = computed(() => {
  if (!state.containerWidth || !columnCount.value) return props.columnWidth

  // 计算总的间距宽度
  const totalGutterWidth = (columnCount.value - 1) * props.gutter
  // 可用于列的宽度
  const availableWidth = state.containerWidth - totalGutterWidth
  // 实际列宽（均分剩余空间）
  const calculatedWidth = availableWidth / columnCount.value

  // 确保列宽不小于最小值
  return Math.max(calculatedWidth, props.columnWidth)
})

// 计算布局 - 支持分步测量和渲染
function calculateLayout() {
  const heights = Array(columnCount.value).fill(0)
  const newPositions = new Map()

  // 分离已测量和未测量的元素
  const measuredItems: MasonryItem[] = []
  const unmeasuredItems: MasonryItem[] = []

  props.items.forEach((item) => {
    const itemHeight = state.itemHeights.get(item.id)
    if (itemHeight && itemHeight > 0) {
      measuredItems.push(item)
    } else {
      unmeasuredItems.push(item)
    }
  })

  // 首先放置已测量的元素
  measuredItems.forEach((item) => {
    const itemHeight = state.itemHeights.get(item.id)!
    const shortestColumn = heights.indexOf(Math.min(...heights))

    const position = {
      top: heights[shortestColumn],
      left: shortestColumn * (actualColumnWidth.value + props.gutter),
      width: actualColumnWidth.value,
      height: itemHeight
    }

    newPositions.set(item.id, position)
    heights[shortestColumn] += itemHeight + props.gutter
  })

  // 然后放置未测量的元素，用于初始渲染和测量
  unmeasuredItems.forEach((item) => {
    const shortestColumn = heights.indexOf(Math.min(...heights))

    // 为未测量元素设置默认高度，用于初始布局
    const defaultHeight = 200
    const position = {
      top: heights[shortestColumn],
      left: shortestColumn * (actualColumnWidth.value + props.gutter),
      width: actualColumnWidth.value,
      height: defaultHeight
    }

    newPositions.set(item.id, position)

    // 只有在虚拟化模式下才预估高度影响后续元素
    if (props.virtualize) {
      heights[shortestColumn] += defaultHeight + props.gutter
    }
  })

  state.positions = newPositions

  // 更新测量状态
  state.hasPendingMeasurements = unmeasuredItems.length > 0
}

// 判断元素是否可见 - 仿照React原版逻辑
function isItemVisible(position: { top: number; left: number; width: number; height: number }): boolean {
  if (!props.virtualize || !props.virtualBufferFactor) {
    return true
  }

  // 避免无效位置
  if (position.top < 0 || position.top === Infinity) {
    return false
  }

  const bufferHeight = state.containerHeight * props.virtualBufferFactor
  const scrollTop = state.scrollTop - state.containerOffset
  const viewportBottom = scrollTop + state.containerHeight + bufferHeight
  const viewportTop = scrollTop - bufferHeight

  return !(position.top + position.height < viewportTop || position.top > viewportBottom)
}

// 计算可见项目 - 修复虚拟滚动逻辑
const visibleItems = computed(() => {
  if (!props.virtualize) {
    return props.items
  }

  // 如果容器尺寸未初始化，显示所有元素以便测量
  if (state.containerHeight === 0) {
    return props.items
  }

  return props.items.filter(item => {
    const position = state.positions.get(item.id)
    if (!position) return true // 未定位的元素需要渲染以便测量

    return isItemVisible(position)
  })
})

// 获取项目样式
function getItemStyle(item: MasonryItem, index: number) {
  const position = state.positions.get(item.id)
  const isItemMeasured = state.itemHeights.has(item.id) && (state.itemHeights.get(item.id) || 0) > 0

  if (!position) {
    return {
      position: 'absolute' as const,
      top: '0px',
      left: '0px',
      width: `${actualColumnWidth.value}px`,
      visibility: 'hidden' as const,
      opacity: 0
    }
  }

  const baseStyle = {
    position: 'absolute' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: `${position.width}px`,
    transform: 'translateZ(0)', // 开启硬件加速
  }

  // 如果元素还未测量，设为隐藏但参与布局
  if (!isItemMeasured) {
    return {
      ...baseStyle,
      visibility: 'hidden' as const,
      opacity: 0,
      transition: 'opacity 0.3s ease'
    }
  }

  // 已测量的元素正常显示
  return {
    ...baseStyle,
    visibility: 'visible' as const,
    opacity: 1,
    transition: 'transform 0.3s ease, opacity 0.3s ease'
  }
}

// 容器样式
const containerStyle = computed(() => {
  const maxHeight = Math.max(...Array.from(state.positions.values()).map(p => p.top + p.height), 0)
  return {
    position: 'relative' as const,
    width: '100%',
    height: props.virtualize ? `${maxHeight}px` : 'auto',
    overflow: props.virtualize ? 'hidden' : 'visible'
  }
})

// 设置项目引用
function setItemRef(el: any, item: MasonryItem, index: number) {
  if (el) {
    itemRefs.set(item.id, el)

    // 设置 data 属性用于 ResizeObserver 识别
    el.setAttribute('data-grid-item-idx', index.toString())
    el.setAttribute('data-grid-item-id', item.id.toString())

    // 如果启用了 ResizeObserver，则使用它来监听
    if (props.dynamicHeights && resizeObserver) {
      resizeObserver.observe(el)
    }

    // 立即测量高度
    measureItem(el, item)
  } else {
    // 元素被移除时，从 ResizeObserver 中取消监听
    const existingEl = itemRefs.get(item.id)
    if (existingEl && resizeObserver) {
      resizeObserver.unobserve(existingEl)
    }
    itemRefs.delete(item.id)
  }
}

// 测量单个项目
function measureItem(el: HTMLElement, item: MasonryItem) {
  nextTick(() => {
    const height = el.offsetHeight
    const currentHeight = state.itemHeights.get(item.id)

    if (height > 0 && height !== currentHeight) {
      state.itemHeights.set(item.id, height)

      // 标记有待处理的测量
      state.hasPendingMeasurements = true

      // 根据配置决定是否使用 RAF
      if (props.useRAF) {
        scheduleLayoutUpdate()
      } else {
        calculateLayout()
      }
    }
  })
}

// 调度布局更新（使用 RAF 优化）
function scheduleLayoutUpdate() {
  if (rafId !== null) return

  rafId = requestAnimationFrame(() => {
    rafId = null
    state.hasPendingMeasurements = false
    calculateLayout()
  })
}

// 更新滚动位置 - 仿照React原版
function updateScrollPosition() {
  if (props.virtualize) {
    const scrollElement = window
    state.scrollTop = window.pageYOffset || document.documentElement.scrollTop

    // 更新容器偏移量
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      state.containerOffset = rect.top + state.scrollTop
    }
  }
}

// 更新容器尺寸
function updateContainerSize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    state.containerWidth = rect.width
    state.containerHeight = window.innerHeight
    state.containerOffset = rect.top + (window.pageYOffset || document.documentElement.scrollTop)
  }
}

// 检查是否需要加载更多
function checkLoadMore() {
  if (!props.virtualize) return

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  if (scrollTop + windowHeight >= documentHeight - 200) {
    emit('loadMore')
  }
}

// 防抖函数
function debounce(fn: Function, delay: number) {
  let timer: number | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 节流函数
function throttle(fn: Function, delay: number) {
  let lastTime = 0
  return (...args: any[]) => {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn(...args)
    }
  }
}

const debouncedResize = debounce(updateContainerSize, 300)
const throttledScroll = throttle(() => {
  updateScrollPosition()
  checkLoadMore()
}, 16) // 60fps

// 滚动处理 - 移除，改为全局监听
function onScroll() {
  // 不需要了，改为监听window滚动
}

// 监听器
watch([() => props.items.length, () => state.containerWidth], () => {
  nextTick(() => {
    calculateLayout()
  })
}, { flush: 'post' })

// 监听 items 变化，重新初始化测量
watch(() => props.items, (newItems, oldItems) => {
  // 检测新增的 items
  const newItemIds = new Set(newItems.map(item => item.id))
  const oldItemIds = new Set((oldItems || []).map(item => item.id))

  // 清理已删除项目的测量缓存
  oldItems?.forEach(item => {
    if (!newItemIds.has(item.id)) {
      state.itemHeights.delete(item.id)
      state.positions.delete(item.id)

      // 从 ResizeObserver 中移除
      const el = itemRefs.get(item.id)
      if (el && resizeObserver) {
        resizeObserver.unobserve(el)
      }
      itemRefs.delete(item.id)
    }
  })

  // 重新计算布局
  nextTick(() => {
    calculateLayout()
  })
}, { deep: false })

// 监听 dynamicHeights 配置变化
watch(() => props.dynamicHeights, (enabled) => {
  if (enabled && !resizeObserver && typeof ResizeObserver !== 'undefined') {
    initResizeObserver()
  } else if (!enabled && resizeObserver) {
    destroyResizeObserver()
  }
})

// 初始化 ResizeObserver
function initResizeObserver() {
  if (!props.dynamicHeights || typeof ResizeObserver === 'undefined') {
    return
  }

  resizeObserver = new ResizeObserver((entries) => {
    let shouldUpdate = false

    entries.forEach(({ target, contentRect }) => {
      const index = Number(target.getAttribute('data-grid-item-idx'))
      const itemId = target.getAttribute('data-grid-item-id')

      if (typeof index === 'number' && index >= 0 && itemId) {
        const item = props.items.find(item => item.id.toString() === itemId)
        if (item) {
          const newHeight = contentRect.height
          const currentHeight = state.itemHeights.get(item.id)

          if (newHeight > 0 && Math.abs(newHeight - (currentHeight || 0)) > 1) {
            state.itemHeights.set(item.id, newHeight)
            shouldUpdate = true
          }
        }
      }
    })

    if (shouldUpdate) {
      state.hasPendingMeasurements = true

      if (props.useRAF) {
        scheduleLayoutUpdate()
      } else {
        calculateLayout()
      }
    }
  })
}

// 销毁 ResizeObserver
function destroyResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// 生命周期
onMounted(() => {
  // 初始化 ResizeObserver
  initResizeObserver()

  updateContainerSize()

  // 监听窗口滚动和尺寸变化
  window.addEventListener('scroll', throttledScroll, { passive: true })
  window.addEventListener('resize', debouncedResize)

  // 初始计算
  nextTick(() => {
    calculateLayout()
  })
})

onUnmounted(() => {
  // 清理 ResizeObserver
  destroyResizeObserver()

  window.removeEventListener('scroll', throttledScroll)
  window.removeEventListener('resize', debouncedResize)
})

// 强制重新测量所有元素
function forceRemeasure() {
  // 清理所有缓存
  state.itemHeights.clear()
  state.positions.clear()
  state.hasPendingMeasurements = true

  // 如果有 ResizeObserver，重新监听所有元素
  if (resizeObserver) {
    itemRefs.forEach((el, itemId) => {
      if (el) {
        resizeObserver!.unobserve(el)
        resizeObserver!.observe(el)
      }
    })
  }

  // 重新测量容器和计算布局
  nextTick(() => {
    updateContainerSize()

    // 对所有现有元素重新测量
    itemRefs.forEach((el, itemId) => {
      const item = props.items.find(item => item.id === itemId)
      if (el && item) {
        measureItem(el, item)
      }
    })

    calculateLayout()
  })
}

// 暴露方法和调试信息
defineExpose({
  reflow: forceRemeasure,
  // 新增的方法
  forceRemeasure,
  measureItem: (itemId: string | number) => {
    const el = itemRefs.get(itemId)
    const item = props.items.find(item => item.id === itemId)
    if (el && item) {
      measureItem(el, item)
    }
  },
  // 调试信息
  columnCount,
  actualColumnWidth,
  containerWidth: computed(() => state.containerWidth),
  visibleItemsCount: computed(() => visibleItems.value.length),
  // 新增调试信息
  hasPendingMeasurements: computed(() => state.hasPendingMeasurements),
  measuredItemsCount: computed(() => {
    let count = 0
    state.itemHeights.forEach(height => {
      if (height > 0) count++
    })
    return count
  }),
  unmeasuredItemsCount: computed(() => {
    const total = props.items.length
    const measured = computed(() => {
      let count = 0
      state.itemHeights.forEach(height => {
        if (height > 0) count++
      })
      return count
    }).value
    return total - measured
  })
})
</script>

<style scoped>
.masonry-container {
  position: relative;
  width: 100%;
}

.masonry-item {
  position: absolute;
  will-change: transform;
}
</style>
