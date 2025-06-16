<template>
  <div
    ref="itemRef"
    :data-grid-item-idx="idx"
    class="masonry-item-wrapper"
    :class="{
      'masonry-item-wrapper--measuring': isMeasuring,
      'masonry-item-wrapper--mounted': !isMeasuring
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  idx: number
  isMeasuring?: boolean
  resizeObserver?: ResizeObserver | null
}

const props = withDefaults(defineProps<Props>(), {
  isMeasuring: false,
  resizeObserver: null
})

const itemRef = ref<HTMLElement>()

onMounted(() => {
  nextTick(() => {
    if (props.resizeObserver && itemRef.value) {
      props.resizeObserver.observe(itemRef.value)
    }
  })
})

onUnmounted(() => {
  if (props.resizeObserver && itemRef.value) {
    props.resizeObserver.unobserve(itemRef.value)
  }
})
</script>

<style scoped>
.masonry-item-wrapper {
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.masonry-item-wrapper--measuring {
  opacity: 0;
  visibility: hidden;
}

.masonry-item-wrapper--mounted {
  opacity: 1;
  visibility: visible;
}

/* 支持淡入淡出动画 */
.masonry-item-wrapper--mounted {
  animation: fadeInUp 0.3s ease-out;
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
</style>
