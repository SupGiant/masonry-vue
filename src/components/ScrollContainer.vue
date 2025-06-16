<template>
  <slot />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  scrollContainer?: () => HTMLElement | Window
  onScroll?: (event: Event) => void
}

const props = withDefaults(defineProps<Props>(), {
  scrollContainer: () => window,
  onScroll: () => {}
})

const scrollElement = ref<HTMLElement | Window>()

const handleScroll = (event: Event) => {
  props.onScroll?.(event)
}

const updateScrollContainer = (element: HTMLElement | Window) => {
  // 移除旧的事件监听器
  if (scrollElement.value) {
    scrollElement.value.removeEventListener('scroll', handleScroll)
  }

  // 设置新的滚动容器
  scrollElement.value = element

  // 添加新的事件监听器
  if (scrollElement.value) {
    scrollElement.value.addEventListener('scroll', handleScroll, { passive: true })
  }
}

const getScrollContainerRef = (): HTMLElement | Window | undefined => {
  return scrollElement.value
}

onMounted(() => {
  nextTick(() => {
    const element = props.scrollContainer()
    if (element) {
      updateScrollContainer(element)
    }
  })
})

onUnmounted(() => {
  if (scrollElement.value) {
    scrollElement.value.removeEventListener('scroll', handleScroll)
  }
})

// 暴露方法给父组件
defineExpose({
  getScrollContainerRef,
  updateScrollContainer
})
</script>
