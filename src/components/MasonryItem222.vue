<template>
  <div
    ref="itemRef"
    class="masonry-item"
    :style="itemStyle"
  >
    <!-- 使用插槽 -->
    <slot :item="item" :index="index">
      <!-- 默认渲染 -->
      <div class="default-item">
        {{ item }}
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts" generic="T = any">
import { ref, computed, onMounted } from 'vue'

interface Position {
  top: number
  left: number
  width: number
  height: number
}

interface Props {
  item: T
  index: number
  position?: Position
  renderItem?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  heightChange: [item: T, height: number]
  mounted: [element: HTMLElement, index: number]
  unmounted: [element: HTMLElement]
}>()

const itemRef = ref<HTMLElement>()

// 计算项目样式
const itemStyle = computed(() => {
  if (!props.position) {
    return {
      position: 'static' as const,
      visibility: 'hidden' as const
    }
  }

  const { top, left, width, height } = props.position

  return {
    position: 'absolute' as const,
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: height ? `${height}px` : 'auto',
    transform: 'translateZ(0)', // 启用硬件加速
  }
})

// 测量元素高度 - 只在mounted时执行一次
const measureHeight = () => {
  if (itemRef.value) {
    const rect = itemRef.value.getBoundingClientRect()
    if (rect.height > 0) {
      emit('heightChange', props.item, rect.height)
    }
  }
}

onMounted(() => {
  if (itemRef.value) {
    emit('mounted', itemRef.value, props.index)

    // 延迟测量，确保内容已渲染
    setTimeout(() => {
      measureHeight()
    }, 10)
  }
})
</script>

<style scoped>
.masonry-item {
  box-sizing: border-box;
  will-change: transform;
}

.default-item {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  word-wrap: break-word;
}
</style>
