<template>
  <div class="masonry-container">

  </div>

</template>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue'
import { createMeasurementStore, type MasonryProps } from './Masonry'

const props = withDefaults(defineProps<MasonryProps>(), {
  columnWidth: 240,
  minCols: 3,
  maxCols: 8,
  gutterWidth: 16,
  virtualize: false,
  virtualBufferFactor: 0.7,
})

const emit = defineEmits<{
  (e: 'loadMore', options: {
    from: number, // 从哪个索引开始加载
  }): void
}>()


// 存储测量和位置信息
const measurementStore = reactive(props.measurementStore || createMeasurementStore())
const positionsStore = reactive(props.positionsStore || createMeasurementStore())

// 宽度状态
const width = ref<number>(-1) // 容器宽度 -1表示未测量





</script>

<style scoped>

</style>