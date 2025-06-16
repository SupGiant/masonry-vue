<template>
  <div id="app">
    <header class="controls-header">
      <div class="control-group">
        <label for="columnWidth">Column Width: {{ columnWidth }}px</label>
        <input type="range" id="columnWidth" min="100" max="400" v-model.number="columnWidth" />
      </div>
      <div class="control-group">
        <label for="gutter">Gutter: {{ gutter }}px</label>
        <input type="range" id="gutter" min="0" max="50" v-model.number="gutter" />
      </div>
      <div class="control-group">
        <label for="virtualize">
          <input type="checkbox" id="virtualize" v-model="virtualizeEnabled" />
          Virtualize
        </label>
      </div>
      <div class="control-group">
        <label for="dynamicHeights">
          <input type="checkbox" id="dynamicHeights" v-model="dynamicHeightsEnabled" />
          Dynamic Heights
        </label>
      </div>
      <div class="info-group">
        <span>DOM: {{ domCount }} / Total: {{ totalCount }}</span>
      </div>
    </header>

    <main class="content-area" ref="scrollContainerEl">
      <Masonry
        v-if="scrollContainerEl"
        ref="masonryRef"
        :items="items"
        :column-width="columnWidth"
        :gutter="gutter"
        :min-cols="1"
        :virtualize="virtualizeEnabled"
        :dynamic-heights="dynamicHeightsEnabled"
        :scroll-container="scrollContainerEl"
        :is-fetching="isFetching"
        :load-items="loadItems"
      >
        <template #default="{ data }">
          <div class="card">
            <img :src="data.src" :alt="`Image ${data.id}`" class="card-image" @load="e => (e.target as HTMLImageElement).style.opacity = '1'" />
          </div>
        </template>
      </Masonry>
      <div v-if="isFetching" class="loading-indicator">Loading more...</div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Masonry from './components/Masonry/Masonry.vue';

// --- Refs for DOM elements and component instance ---
const scrollContainerEl = ref<HTMLElement | null>(null);
const masonryRef = ref<InstanceType<typeof Masonry> | null>(null);

// --- Reactive State for Controls ---
const columnWidth = ref(236);
const gutter = ref(14);
const virtualizeEnabled = ref(true);
const dynamicHeightsEnabled = ref(true);

// --- Computed values for display ---
const domCount = computed(() => masonryRef.value?.visibleItemsCount || 0);
const totalCount = computed(() => items.value.length);

// --- Mock Data ---
interface ImageItem {
  src: string;
  height: number;
  id: number;
}

let currentId = 0;
const generateItems = (count = 20): ImageItem[] => {
  const newItems: ImageItem[] = [];
  for (let i = 0; i < count; i++) {
    const height = Math.floor(Math.random() * 200) + 200; // Random height between 200 and 400
    newItems.push({
      id: currentId++,
      src: `https://picsum.photos/${columnWidth.value}/${height}?random=${currentId}`,
      height,
    });
  }
  return newItems;
};

const items = ref<ImageItem[]>(generateItems());

// --- Infinite Scroll Handler ---
const isFetching = ref(false);
const loadItems = async () => {
  if (isFetching.value) return;
  isFetching.value = true;
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  const newItems = generateItems();
  items.value.push(...newItems);
  isFetching.value = false;
};

</script>

<style>
:root {
  --header-height: 60px;
  --header-bg: #f8f9fa;
  --border-color: #dee2e6;
  --text-color: #212529;
  --body-bg: #fff;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--body-bg);
  color: var(--text-color);
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.controls-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--header-bg);
  flex-shrink: 0;
  gap: 20px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-size: 14px;
  min-width: auto;
  display: flex;
  align-items: center;
  gap: 5px;
}

.content-area {
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
}

.card {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: #e9ecef;
}

.card-image {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.loading-indicator {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 20px;
    z-index: 10;
}

.info-group {
    font-size: 14px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    background-color: #e9ecef;
    padding: 5px 10px;
    border-radius: 4px;
}
</style>
