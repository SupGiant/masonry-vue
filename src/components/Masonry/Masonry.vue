<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, reactive, defineExpose } from 'vue';
import ItemWrapper from './ItemWrapper.vue';

const props = withDefaults(defineProps<{
  items: any[];
  columnWidth?: number;
  gutter?: number;
  minCols?: number;
  virtualize?: boolean;
  scrollContainer?: HTMLElement | Window;
  loadItems?: (payload: { from: number }) => void;
  dynamicHeights?: boolean;
  isFetching?: boolean;
}>(), {
  columnWidth: 236,
  gutter: 14,
  minCols: 2,
  virtualize: false,
  scrollContainer: () => window,
  dynamicHeights: false,
  isFetching: false,
});

const masonryWrapper = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const scrollTop = ref(0);

// --- State ---
const measurementStore = reactive(new Map<any, number>());
const positionStore = reactive(new Map<any, { top: number; left: number; width: number; height: number; }>());
const unmeasuredItems = ref<HTMLElement[]>([]);

// --- Throttle utility ---
function throttle<T extends (...args: any[]) => any>(fn: T, delay = 100) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function(...args: Parameters<T>) {
        if (!timeout) {
            timeout = setTimeout(() => {
                fn(...args);
                timeout = null;
            }, delay);
        }
    }
}

// --- Computed properties ---
const columnCount = computed(() => {
  if (!containerWidth.value) return 0;
  // from i6 function in react code
  return Math.max(
    Math.floor(containerWidth.value / (props.columnWidth + props.gutter)),
    props.minCols
  );
});

const layout = computed(() => {
  if (!columnCount.value || props.items.length === 0) {
    return { positions: [], containerHeight: 0 };
  }

  const columnHeights: number[] = Array(columnCount.value).fill(0);
  const result: { data: any; style: Record<string, any>; index: number, top: number, left: number, height: number }[] = [];

  const measuredItems = props.items.filter(item => measurementStore.has(item));

  for (const [index, item] of measuredItems.entries()) {
    // If position is already cached, use it.
    if (positionStore.has(item)) {
        const pos = positionStore.get(item)!;
        const shortestColumnIndex = Math.round(pos.left / (props.columnWidth + props.gutter));
        columnHeights[shortestColumnIndex] = pos.top + pos.height + props.gutter;
        result.push({
            data: item, index, ...pos,
            style: {
                transform: `translate3d(${pos.left}px, ${pos.top}px, 0)`,
                width: `${props.columnWidth}px`,
                height: `${pos.height}px`,
                position: 'absolute',
                top: 0,
                left: 0,
            }
        });
        continue;
    }

    const itemHeight = measurementStore.get(item);
    if (itemHeight === undefined) continue;

    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

    const top = columnHeights[shortestColumnIndex];
    const left = shortestColumnIndex * (props.columnWidth + props.gutter);

    const position = { top, left, width: props.columnWidth, height: itemHeight };
    positionStore.set(item, position);

    columnHeights[shortestColumnIndex] += itemHeight + props.gutter;

    result.push({
      data: item,
      index,
      top,
      left,
      height: itemHeight,
      style: {
        transform: `translate3d(${left}px, ${top}px, 0)`,
        width: `${props.columnWidth}px`,
        height: `${itemHeight}px`,
        position: 'absolute',
        top: 0,
        left: 0,
      }
    });
  }

  const containerHeight = Math.max(...columnHeights, 0);

  return { positions: result, containerHeight };
});

const itemsWithPositions = computed(() => {
    // Re-order based on original items array to keep DOM order consistent
    const itemMap = new Map(layout.value.positions.map(p => [p.data, p]));
    const ordered = props.items.map(item => itemMap.get(item)).filter(Boolean);
    return ordered as { data: any; style: Record<string, any>; index: number, top: number, left: number, height: number }[];
});

const containerHeight = computed(() => layout.value.containerHeight);

const itemsToMeasure = computed(() => {
    return props.items.filter(item => !measurementStore.has(item));
});

const visibleItems = computed(() => {
  if (!props.virtualize) {
    return itemsWithPositions.value;
  }

  const wrapper = props.scrollContainer === window ? document.documentElement : props.scrollContainer as HTMLElement;
  const containerTop = props.scrollContainer === window ? 0 : (props.scrollContainer as HTMLElement).getBoundingClientRect().top;

  const viewportHeight = wrapper.clientHeight;
  const buffer = viewportHeight * 0.5; // 50% buffer top and bottom

  const visibleRange = {
    top: scrollTop.value - buffer - containerTop,
    bottom: scrollTop.value + viewportHeight + buffer - containerTop,
  };

  return itemsWithPositions.value.filter(item => {
    const itemBottom = item.top + item.height;
    return itemBottom >= visibleRange.top && item.top <= visibleRange.bottom;
  });
});

// --- Expose public properties ---
defineExpose({
  visibleItemsCount: computed(() => visibleItems.value.length),
});

// --- Lifecycle hooks & Watchers ---
let currentScrollContainer: HTMLElement | Window | null = null;

const handleScroll = throttle(() => {
  const target = props.scrollContainer === window ? document.documentElement : props.scrollContainer as HTMLElement;
  scrollTop.value = target.scrollTop;
});

watch(() => props.scrollContainer, (newEl, oldEl) => {
    console.log('📦 Scroll container changed:', { oldEl, newEl });
    if (oldEl) {
        oldEl.removeEventListener('scroll', handleScroll);
    }
    if (newEl) {
        newEl.addEventListener('scroll', handleScroll);
        currentScrollContainer = newEl;
        console.log('✅ Scroll listener attached to:', newEl);
    }
}, { immediate: true });

onMounted(() => {
  if (masonryWrapper.value) {
    containerWidth.value = masonryWrapper.value.getBoundingClientRect().width;
  }
  window.addEventListener('resize', handleResize);
  // Initial scroll check in case content is not enough to fill the screen
  handleScroll();
  measureItems();
  console.log('🚀 Masonry mounted, scroll container:', props.scrollContainer);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (currentScrollContainer) {
      currentScrollContainer.removeEventListener('scroll', handleScroll);
  }
});

watch(scrollTop, () => {
    console.log('📏 ScrollTop changed:', scrollTop.value);

    // Infinite scroll check, decoupled from the scroll handler
    if (props.isFetching) {
        console.log('⏳ Already fetching, skipping load check');
        return;
    }

    if (props.loadItems && currentScrollContainer) {
        const target = currentScrollContainer === window ? document.documentElement : currentScrollContainer as HTMLElement;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;

        console.log('🔍 Scroll metrics:', {
            scrollTop: scrollTop.value,
            clientHeight,
            scrollHeight,
            triggerPoint: scrollHeight - (clientHeight * 2),
            shouldTrigger: scrollTop.value + clientHeight >= scrollHeight - (clientHeight * 2)
        });

        // Trigger when less than 2 container heights from the bottom
        if (scrollTop.value + clientHeight >= scrollHeight - (clientHeight * 2)) {
            console.log('🔄 Triggering loadItems!');
            props.loadItems({ from: props.items.length });
        }
    } else {
        console.log('❌ Load check failed:', {
            hasLoadItems: !!props.loadItems,
            hasScrollContainer: !!currentScrollContainer
        });
    }
});

watch(() => props.items, () => {
    // Use nextTick to ensure DOM has updated for new items
    nextTick(() => {
        measureItems();
    });
}, { deep: true });

// --- Methods ---
const measureItems = () => {
    unmeasuredItems.value.forEach(el => {
        const key = props.items[parseInt(el.dataset.index || '0')];
        if (key && !measurementStore.has(key)) {
            measurementStore.set(key, el.clientHeight);
        }
    });
};

const handleResize = () => {
  if (masonryWrapper.value) {
    containerWidth.value = masonryWrapper.value.getBoundingClientRect().width;
  }
  measurementStore.clear();
  positionStore.clear();
  nextTick(() => measureItems());
};

const handleItemResize = ({ item: changedItem, height: newHeight }: { item: any; height: number; }) => {
    const oldHeight = measurementStore.get(changedItem);
    if (oldHeight === undefined || Math.abs(newHeight - oldHeight) < 1) {
        return;
    }

    measurementStore.set(changedItem, newHeight);

    // For simplicity and correctness, we recalculate the layout.
    // A more complex implementation would perform a targeted reflow (like i3).
    positionStore.clear();
};
</script>

<template>
  <div ref="masonryWrapper" class="masonry-wrapper" style="width: 100%;">
    <div class="masonry-container" :style="{ position: 'relative', height: `${containerHeight}px` }">
      <!-- Items with calculated positions -->
      <div v-for="item in visibleItems" :key="props.items.indexOf(item.data)" :style="item.style">
        <ItemWrapper v-if="props.dynamicHeights" :item-data="item.data" @item-resized="handleItemResize">
          <slot :data="item.data" :index="props.items.indexOf(item.data)"></slot>
        </ItemWrapper>
        <template v-else>
          <slot :data="item.data" :index="props.items.indexOf(item.data)"></slot>
        </template>
      </div>

      <!-- Hidden items for measurement -->
      <div
        style="visibility: hidden; position: absolute;"
        @vue:before-update="unmeasuredItems = []"
      >
         <div
            v-for="(item, index) in itemsToMeasure"
            :key="'measure-' + props.items.indexOf(item)"
            :ref="el => { if (el) unmeasuredItems[index] = el as HTMLElement }"
            :data-index="props.items.indexOf(item)"
            :style="{ width: `${props.columnWidth}px` }"
        >
            <slot :data="item" :index="props.items.indexOf(item)"></slot>
        </div>
      </div>
    </div>
  </div>
</template>
