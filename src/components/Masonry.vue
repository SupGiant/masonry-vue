<template>
  <div
    ref="containerRef"
    class="masonry-container"
    :style="{ height: `${containerHeight}px` }"
  >
    <MasonryItem
      v-for="(item, index) in items"
      :key="getItemKey ? getItemKey(item, index) : index"
      :item="item"
      :index="index"
      :position="positions[index]"
      :render-item="renderItem"
      @height-change="updateItemHeight"
      @mounted="observeItem"
      @unmounted="unobserveItem"
    >
      <template v-slot="slotProps">
        <slot v-bind="slotProps" />
      </template>
    </MasonryItem>
  </div>
</template>

<script setup lang="ts" generic="T = any">
import { computed, watch } from 'vue'
import { useMasonry } from '../composables/useMasonry'
import MasonryItem from './MasonryItem.vue'

interface Props {
  items: T[]
  columnWidth?: number
  gutterWidth?: number
  minCols?: number
  align?: 'left' | 'center' | 'right'
  renderItem?: (item: T, index: number) => any
  getItemKey?: (item: T, index: number) => string | number
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 240,
  gutterWidth: 20,
  minCols: 2,
  align: 'center',
  getItemKey: undefined,
  renderItem: undefined
})

const {
  containerRef,
  containerHeight,
  positions,
  items: masonryItems,
  updateItemHeight,
  observeItem,
  unobserveItem,
  reset
} = useMasonry({
  columnWidth: props.columnWidth,
  gutterWidth: props.gutterWidth,
  minCols: props.minCols,
  align: props.align
})

// 监听props.items变化，更新内部items
watch(() => props.items, (newItems) => {
  masonryItems.value = newItems
}, { immediate: true })

// 暴露方法供父组件调用
defineExpose({
  reset,
  containerHeight: computed(() => containerHeight.value)
})
</script>

<style scoped>
.masonry-container {
  position: relative;
  width: 100%;
  transition: height 0.3s ease;
}
</style>
