<template>
  <div
    ref="containerRef"
    class="masonry-container"
    :style="containerStyle"
    @scroll="onScroll"
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
  virtualize?: boolean
  bufferSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 240,
  gutter: 2,
  minCols: 3,
  virtualize: false,
  bufferSize: 5
})

const emit = defineEmits<{
  loadMore: []
}>()

// 响应式状态
const containerRef = ref<HTMLElement>()
const itemRefs = new Map<string | number, HTMLElement>()
const state = reactive({
  containerWidth: 0,
  scrollTop: 0,
  itemHeights: new Map<string | number, number>(),
  positions: new Map<string | number, { top: number; left: number; width: number; height: number }>()
})

// 计算列数
const columnCount = computed(() => {
  if (!state.containerWidth) return props.minCols
  return Math.max(
    Math.floor(state.containerWidth / (props.columnWidth + props.gutter)),
    props.minCols
  )
})

// 计算实际列宽
const actualColumnWidth = computed(() => {
  if (!state.containerWidth || !columnCount.value) return props.columnWidth
  return (state.containerWidth - (columnCount.value - 1) * props.gutter) / columnCount.value
})

// 计算布局
function calculateLayout() {
  const heights = Array(columnCount.value).fill(0)
  const newPositions = new Map()

  props.items.forEach((item, index) => {
    const itemHeight = state.itemHeights.get(item.id) || 200 // 默认高度
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

// 计算可见项目（虚拟滚动）
const visibleItems = computed(() => {
  if (!props.virtualize) return props.items

  const bufferHeight = window.innerHeight * 2
  const viewportTop = state.scrollTop - bufferHeight
  const viewportBottom = state.scrollTop + window.innerHeight + bufferHeight

  return props.items.filter(item => {
    const position = state.positions.get(item.id)
    if (!position) return true

    return !(position.top + position.height < viewportTop || position.top > viewportBottom)
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
      opacity: '0.5'
    }
  }

  return {
    position: 'absolute' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    width: `${position.width}px`,
    transform: 'translateZ(0)', // 开启硬件加速
    transition: 'all 0.3s ease'
  }
}

// 容器样式
const containerStyle = computed(() => {
  const maxHeight = Math.max(...Array.from(state.positions.values()).map(p => p.top + p.height), 0)
  const overflow = props.virtualize ? 'auto' : 'visible'
  return {
    position: 'relative' as const,
    width: '100%',
    height: `${maxHeight}px`,
    overflow: overflow as const
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
        calculateLayout()
      }
    })
  }
}

// 滚动处理
function onScroll(event: Event) {
  if (props.virtualize) {
    state.scrollTop = (event.target as HTMLElement).scrollTop
  }

  // 检查是否需要加载更多
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
    emit('loadMore')
  }
}

// 更新容器宽度
function updateContainerWidth() {
  if (containerRef.value) {
    state.containerWidth = containerRef.value.clientWidth
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

const debouncedResize = debounce(updateContainerWidth, 300)

// 监听器
watch([() => props.items.length, () => state.containerWidth], () => {
  nextTick(() => {
    calculateLayout()
  })
})

// 生命周期
onMounted(() => {
  updateContainerWidth()
  window.addEventListener('resize', debouncedResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
})

// 暴露方法
defineExpose({
  reflow: () => {
    state.itemHeights.clear()
    state.positions.clear()
    nextTick(() => {
      calculateLayout()
    })
  }
})
</script>

<style scoped>
.masonry-container {
  width: 100%;
}

.masonry-item {
  box-sizing: border-box;
}
</style>
