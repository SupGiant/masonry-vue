<template>
  <div>
    <component :is="render" />
  </div>
</template>

<script setup lang="tsx">
import { onBeforeMount, onMounted, onUpdated, ref } from 'vue'
import {
  debounce,
  throttle,
  getWindowHeight,
  getContainerScrollOffset,
} from '../composables/useMasonryVue'

const props = withDefaults(
  defineProps<{
    columnWidth: number
    align: string
    minCols: number
    layout: string
    loadItems: (args: { from: number }) => void
    items: any[]
    virtualize: boolean
    virtualBufferFactor: number // 虚拟缓冲因子
    scrollContainer: HTMLElement | Window // 滚动容器
    renderItem: (item: any) => any // 渲染项
    virtualBoundsTop: number // 虚拟边界顶部
    virtualBoundsBottom: number // 虚拟边界底部
  }>(),
  {
    columnWidth: 236,
    align: 'center',
    minCols: 3,
    layout: 'basic',
    loadItems: (args: { from: number }) => {},
    virtualize: false,
    virtualBufferFactor: 0.7,
    items: () => [],
  },
)

const insertAnimationFrame = ref<number | null>(null)
const maxHeight = ref(0)
const gridWrapper = ref<HTMLElement | null>(null)

const width = ref(0)
const hasPendingMeasurements = ref(false) // 是否正在测量
const handleResize = () => {
  if (gridWrapper.value) {
    width.value = gridWrapper.value.getBoundingClientRect().width
  }
}

const scrollContainerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const updateScrollPosition = throttle(() => {
  if (scrollContainerRef.value) {
    scrollTop.value = scrollContainerRef.value.scrollTop
  }
})

const measureContainerAsync = debounce(() => {
  measureContainer()
}, 0)

const containerHeight = ref(0)
const containerOffset = ref(0)

// 测量容器
const measureContainer = () => {
  if (scrollContainerRef.value) {
    containerHeight.value = getWindowHeight(scrollContainerRef.value)

    if (gridWrapper.value instanceof HTMLElement) {
      let offset = getContainerScrollOffset(scrollContainerRef.value)
      containerOffset.value = gridWrapper.value.getBoundingClientRect().top + offset
    }
  }
}

const isFetching = ref(false)

// 加载更多
const fetchMore = () => {
  if (isFetching.value) return
  isFetching.value = true
  if (props.loadItems && typeof props.loadItems === 'function') {
    props.loadItems({
      from: props.items.length,
    })
    isFetching.value = false
  }
}

// 自定义的渲染函数
const renderMasonryComponent = () => {}

// 默认的渲染函数
const render = () => {
  let renderComponent = null

  if (width.value == null && hasPendingMeasurements.value) {
    renderComponent = renderMasonryComponent
  } else if (width.value == null) {
    renderComponent = renderPlaceholder
  } else {
    renderComponent = renderGrid
  }

  return props.scrollContainer ? (
    <div>
      {renderComponent}
    </div>
  ) : renderComponent
}




// 生命周期钩子函数
onMounted(() => {
  // todo something
})

onUpdated(() => {
  // todo something
})
//
onBeforeMount(() => {
  // todo something
})
</script>
