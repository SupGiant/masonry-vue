<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  itemData: any;
}>();

const emit = defineEmits<{
  (e: 'item-resized', payload: { item: any, height: number }): void;
}>();

const itemEl = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let lastHeight = 0;

onMounted(() => {
  if (itemEl.value) {
    resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const newHeight = entries[0].contentRect.height;
      if (newHeight > 0 && Math.abs(newHeight - lastHeight) > 1) {
        lastHeight = newHeight;
        emit('item-resized', { item: props.itemData, height: newHeight });
      }
    });
    resizeObserver.observe(itemEl.value);
    lastHeight = itemEl.value.clientHeight;
  }
});

onUnmounted(() => {
  if (resizeObserver && itemEl.value) {
    resizeObserver.unobserve(itemEl.value);
  }
  resizeObserver = null;
});
</script>

<template>
  <div ref="itemEl">
    <slot></slot>
  </div>
</template>
