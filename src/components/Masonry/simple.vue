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
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 240,
  gutter: 16,
  minCols: 3,
  maxCols: 8,
  virtualize: false,
  virtualBufferFactor: 0.7
})

const emit = defineEmits<{
  loadMore: []
}>()

// 响应式状态
const containerRef = ref<HTMLElement>()
const itemRefs = new Map<string | number, HTMLElement>()
const state = reactive({
  containerWidth: 0,
  containerHeight: 0,
  containerOffset: 0,
  scrollTop: 0,
  itemHeights: new Map<string | number, number>(),
  positions: new Map<string | number, { top: number; left: number; width: number; height: number }>()
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

// 计算布局 - 仿照React原版逻辑
function calculateLayout() {
  const heights = Array(columnCount.value).fill(0)
  const newPositions = new Map()

  props.items.forEach((item) => {
    const itemHeight = state.itemHeights.get(item.id) || 0

    if (itemHeight === 0) {
      // 未测量的元素，设置默认位置用于测量
      const shortestColumn = heights.indexOf(Math.min(...heights))
      const position = {
        top: heights[shortestColumn],
        left: shortestColumn * (actualColumnWidth.value + props.gutter),
        width: actualColumnWidth.value,
        height: 200 // 默认高度，用于测量
      }
      newPositions.set(item.id, position)
      return
    }

    // 已测量的元素，计算实际位置
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

  state.positions = newPositions
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
  if (!position) {
    return {
      position: 'absolute' as const,
      top: '0px',
      left: '0px',
      width: `${actualColumnWidth.value}px`,
      visibility: 'hidden' as const
    }
  }

  return {
    position: 'absolute' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: `${position.width}px`,
    transform: 'translateZ(0)', // 开启硬件加速
    transition: 'transform 0.3s ease'
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
    // 测量高度
    nextTick(() => {
      const height = el.offsetHeight
      if (height && height !== state.itemHeights.get(item.id)) {
        state.itemHeights.set(item.id, height)
        // 重新计算布局
        calculateLayout()
      }
    })
  }
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

// 生命周期
onMounted(() => {
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
  window.removeEventListener('scroll', throttledScroll)
  window.removeEventListener('resize', debouncedResize)
})

// 暴露方法和调试信息
defineExpose({
  reflow: () => {
    state.itemHeights.clear()
    state.positions.clear()
    nextTick(() => {
      updateContainerSize()
      calculateLayout()
    })
  },
  // 调试信息
  columnCount,
  actualColumnWidth,
  containerWidth: computed(() => state.containerWidth),
  visibleItemsCount: computed(() => visibleItems.value.length)
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
