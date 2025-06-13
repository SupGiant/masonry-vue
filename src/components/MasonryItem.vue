<template>
  <div
    ref="itemRef"
    class="masonry-item"
    :style="itemStyle"
    :data-item-index="index"
  >
    <!-- 如果传入了renderItem，使用渲染函数 -->
    <component
      v-if="renderItem"
      :is="renderItem"
      :item="item"
      :index="index"
    />
    <!-- 否则使用默认插槽 -->
    <slot v-else :item="item" :index="index">
      <!-- 默认渲染 -->
      <div class="default-item">
        {{ item }}
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts" generic="T = any">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

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
    transition: 'all 0.3s ease'
  }
})

// 测量元素高度
const measureHeight = () => {
  if (itemRef.value) {
    const rect = itemRef.value.getBoundingClientRect()
    emit('heightChange', props.item, rect.height)
  }
}

// 监听位置变化，重新测量高度
watch(() => props.position, () => {
  nextTick(() => {
    measureHeight()
  })
}, { flush: 'post' })

onMounted(() => {
  if (itemRef.value) {
    emit('mounted', itemRef.value, props.index)

    // 延迟测量，确保内容已渲染
    nextTick(() => {
      measureHeight()
    })
  }
})

onBeforeUnmount(() => {
  if (itemRef.value) {
    emit('unmounted', itemRef.value)
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
