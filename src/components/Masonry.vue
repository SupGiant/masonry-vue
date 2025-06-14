<template>


</template>


<script setup lang="ts">
import { ref } from 'vue'

const insertAnimationFrame = ref<number | null>(null)
const maxHeight = ref(0)
const gridWrapper = ref<HTMLElement | null>(null)

const width = ref(0)
const handleResize = () => {
  if (gridWrapper.value) {
    width.value = gridWrapper.value.getBoundingClientRect().width
  }
}
const updateScrollPosition = () => {
  if (!scrollContainer.value) return
  const scrollContainerRef = scrollContainer.value.getScrollContainerRef()
  if (scrollContainerRef) {
    scrollTop.value = scrollContainerRef.scrollTop
  }
}



</script>