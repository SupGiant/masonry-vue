<template>
  <!-- 无限滚动组件，不需要DOM渲染 -->
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  containerHeight: number
  fetchMore?: () => void
  isAtEnd?: boolean
  isFetching?: boolean
  scrollHeight: number
  scrollTop: number
}

const props = withDefaults(defineProps<Props>(), {
  fetchMore: () => {},
  isAtEnd: false,
  isFetching: false
})

let timeoutId: number | null = null

const checkShouldFetchMore = () => {
  const {
    containerHeight,
    fetchMore,
    isAtEnd,
    isFetching,
    scrollHeight,
    scrollTop
  } = props

  // 如果已经在加载中、已经到达末尾、没有fetchMore函数，则不触发加载
  if (isFetching || isAtEnd || !fetchMore) {
    return
  }

  // 检查是否接近底部（提前3个屏幕高度开始加载）
  const threshold = scrollTop + 3 * containerHeight
  if (threshold > scrollHeight) {
    fetchMore()
  }
}

// 监听滚动相关属性变化
watch(
  () => [props.scrollTop, props.containerHeight, props.scrollHeight, props.isFetching, props.isAtEnd],
  () => {
    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // 延迟执行检查，避免频繁触发
    timeoutId = window.setTimeout(checkShouldFetchMore, 100)
  },
  { immediate: true }
)

onMounted(() => {
  checkShouldFetchMore()
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>
