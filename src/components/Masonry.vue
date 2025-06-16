<template>
  <div
    ref="containerRef"
    class="masonry-container"
    :style="{ width: '100%' }"
  >
        <!-- 测量阶段：隐藏渲染用于获取尺寸 -->
    <div
      v-if="hasPendingMeasurements"
      class="masonry-measuring"
      :style="{
        visibility: 'hidden',
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: state.containerWidth ? `${state.containerWidth}px` : '100%',
        zIndex: -1
      }"
    >
      <div
        v-for="(item, index) in unmeasuredItems.slice(0, 10)"
        :key="`measuring-${index}`"
        ref="measuringRefs"
        class="masonry-measuring-item"
        :style="{
          width: props.layout === 'flexible' ? undefined : `${props.columnWidth}px`,
          display: 'block',
          marginBottom: `${state.gutter}px`
        }"
      >
        <slot
          name="item"
          :data="item"
          :item-idx="index"
          :is-measuring="true"
        />
      </div>
    </div>

    <!-- 正式渲染阶段 -->
    <div
      v-if="state.containerWidth"
      class="masonry-grid"
      role="list"
      :style="{
        height: `${layoutResult.totalHeight}px`,
        width: `${state.containerWidth}px`,
        position: 'relative'
      }"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="`item-${index}`"
        class="masonry-item"
        :class="{ 'masonry-item--mounted': !hasPendingMeasurements }"
        data-grid-item
        role="listitem"
        :style="getItemStyle(item, index)"
      >
        <ItemWrapper
          :idx="index"
          :is-measuring="false"
          :resize-observer="resizeObserver"
        >
          <slot
            name="item"
            :data="item"
            :item-idx="index"
            :is-measuring="false"
          />
        </ItemWrapper>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="state.isFetching" class="masonry-loading">
      加载中...
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  reactive,
  onMounted,
  onUnmounted,
  nextTick,
  watch
} from 'vue'
import { MeasurementStore, PositionStore, type Position } from '../composables/measurementStore'
import { calculateLayout, type LayoutOptions } from '../composables/layoutAlgorithm'
import {
  debounce,
  toCSSValue,
  isElementVisible
} from '../composables/utils'
import ItemWrapper from './ItemWrapper.vue'

interface Props {
  // 基础配置
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  items: any[]
  layout?: 'basic' | 'basicCentered' | 'flexible' | 'uniformRow'
  minCols?: number
  gutterWidth?: number

  // 虚拟化
  virtualize?: boolean
  virtualBufferFactor?: number

  // 数据加载
  loadItems?: (props: { from: number }) => void
  isAtEnd?: boolean

  // 高级配置
  dynamicHeights?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  align: 'center',
  columnWidth: 236,
  layout: 'basic',
  minCols: 3,
  gutterWidth: 14,
  virtualize: false,
  virtualBufferFactor: 0.7,
  isAtEnd: false,
  dynamicHeights: true
})

// 响应式状态
const state = reactive({
  gutter: props.gutterWidth || 14,
  scrollTop: 0,
  containerWidth: undefined as number | undefined,
  measurementStore: new MeasurementStore(),
  positionStore: new PositionStore(),
  isFetching: false
})

// DOM 引用
const containerRef = ref<HTMLElement>()
const measuringRefs = ref<HTMLElement[]>([])
const resizeObserver = ref<ResizeObserver | null>(null)

// 计算属性
const measuredItems = computed(() => {
  return props.items.filter(item => item && state.measurementStore.has(item))
})

const unmeasuredItems = computed(() => {
  return props.items.filter(item => item && !state.measurementStore.has(item))
})

const hasPendingMeasurements = computed(() => {
  return unmeasuredItems.value.length > 0
})

const visibleItems = computed(() => {
  // 如果还有待测量的元素，显示所有项目进行测量
  if (hasPendingMeasurements.value) {
    return props.items.filter(Boolean)
  }

  if (!props.virtualize) {
    return measuredItems.value
  }

  // 简化的虚拟滚动实现
  return measuredItems.value.filter((_, index) => {
    const position = layoutResult.value.positions[index]
    if (!position) return true

    return isElementVisible({
      itemTop: position.top,
      itemHeight: position.height,
      scrollTop: state.scrollTop,
      containerHeight: window.innerHeight,
      containerOffset: 0,
      virtualBufferFactor: props.virtualBufferFactor
    })
  })
})

// 布局计算
const layoutResult = computed(() => {
  if (!state.containerWidth) {
    return { positions: [], totalHeight: 0 }
  }

  const options: LayoutOptions = {
    align: props.align,
    columnWidth: props.columnWidth,
    gutter: state.gutter,
    layout: props.layout,
    minCols: props.minCols,
    width: state.containerWidth,
    measurementStore: state.measurementStore
  }

  return calculateLayout(measuredItems.value, options)
})

// 获取元素样式
const getItemStyle = (item: any, index: number) => {
  const position = layoutResult.value.positions[index]

  if (!position) {
    // 如果没有位置信息，先显示在原位置等待测量
    return {
      position: 'static',
      width: props.layout === 'flexible' ? '100%' : `${props.columnWidth}px`,
      marginBottom: `${state.gutter}px`,
      visibility: 'visible'
    }
  }

  const isRTL = document?.dir === 'rtl'

  return {
    position: 'absolute',
    top: '0px',
    [isRTL ? 'right' : 'left']: '0px',
    transform: `translateX(${isRTL ? -position.left : position.left}px) translateY(${position.top}px)`,
    width: `${toCSSValue(position.width)}px`,
    height: `${toCSSValue(position.height)}px`,
    visibility: 'visible'
  }
}

// 处理窗口大小变化
const handleResize = debounce(() => {
  if (containerRef.value) {
    const newWidth = containerRef.value.getBoundingClientRect().width
    if (newWidth !== state.containerWidth) {
      state.measurementStore.reset()
      state.positionStore.reset()
      state.containerWidth = newWidth
    }
  }
}, 300)

// 测量元素高度
const measureItems = () => {
  nextTick(() => {
    // 测量隐藏的测量元素
    measuringRefs.value.forEach((el, index) => {
      if (el && unmeasuredItems.value[index]) {
        const height = el.clientHeight
        if (height > 0) {
          state.measurementStore.set(unmeasuredItems.value[index], height)
        }
      }
    })

    // 如果隐藏测量失败，尝试测量可见元素
    if (containerRef.value) {
      const visibleElements = containerRef.value.querySelectorAll('.masonry-item')
      visibleElements.forEach((el, index) => {
        const item = props.items[index]
        if (item && !state.measurementStore.has(item)) {
          const height = (el as HTMLElement).clientHeight
          if (height > 0) {
            state.measurementStore.set(item, height)
          }
        }
      })
    }
  })
}

// 获取更多数据
const fetchMore = () => {
  if (props.loadItems && !state.isFetching) {
    state.isFetching = true
    props.loadItems({ from: props.items.length })
    // 设置一个超时来重置加载状态，防止卡住
    setTimeout(() => {
      state.isFetching = false
    }, 10000)
  }
}

// 初始化 ResizeObserver
const initResizeObserver = () => {
  if (props.dynamicHeights && typeof window !== 'undefined') {
    resizeObserver.value = new ResizeObserver((entries) => {
      let hasChanges = false

      entries.forEach(({ target, contentRect }) => {
        const itemIdx = Number(target.getAttribute('data-grid-item-idx'))
        if (typeof itemIdx === 'number' && !isNaN(itemIdx)) {
          const item = props.items[itemIdx]
          const newHeight = contentRect.height

          if (item && state.measurementStore.get(item) !== newHeight) {
            state.measurementStore.set(item, newHeight)
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        nextTick(() => {
          // 触发重新布局
        })
      }
    })
  }
}

// 滚动监听
const handleScroll = () => {
  state.scrollTop = window.scrollY

  // 检查是否需要加载更多
  const scrollHeight = document.documentElement.scrollHeight
  const clientHeight = window.innerHeight
  const scrollTop = window.scrollY

  if (scrollTop + clientHeight >= scrollHeight - 1000 && !state.isFetching && !props.isAtEnd) {
    fetchMore()
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })
  initResizeObserver()

  nextTick(() => {
    state.containerWidth = containerRef.value?.getBoundingClientRect().width
    measureItems()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
  handleResize.clearTimeout()

  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
})

// 监听属性变化
watch(() => props.items, (newItems, oldItems) => {
  state.isFetching = false
  // 如果有新的项目添加，立即测量
  if (newItems.length > (oldItems?.length || 0)) {
    nextTick(() => {
      measureItems()
    })
  }
}, { deep: true })

watch(() => hasPendingMeasurements.value, (pending) => {
  if (pending) {
    measureItems()
  }
})

// 暴露方法和计算属性
defineExpose({
  renderedItemsCount: computed(() => visibleItems.value.length),
  totalItemsCount: computed(() => props.items.length),
  hasPendingMeasurements: computed(() => hasPendingMeasurements.value),
  isFetching: computed(() => state.isFetching)
})
</script>

<style scoped>
.masonry-container {
  width: 100%;
}

.masonry-measuring {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
}

.masonry-measuring-item {
  margin-bottom: 14px;
}

.masonry-grid {
  position: relative;
}

.masonry-item {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.masonry-item--mounted {
  opacity: 1;
  animation: fadeInUp 0.3s ease-out;
}

/* 确保测量阶段也能显示 */
.masonry-item:not(.masonry-item--mounted) {
  opacity: 0.8;
}

.masonry-loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 支持RTL */
[dir="rtl"] .masonry-item {
  right: 0;
  left: auto;
}
</style>
