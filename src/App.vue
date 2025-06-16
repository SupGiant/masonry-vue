<template>
  <div id="app">
    <div class="container">
      <ControlPanel
        :settings="settings"
        :rendered-count="masonryRef?.renderedItemsCount || 0"
        :total-count="masonryRef?.totalItemsCount || 0"
        :is-fetching="masonryRef?.isFetching || false"
        @update:settings="handleSettingsUpdate"
        @load-more="loadMoreImages"
      />

      <Masonry
        ref="masonryRef"
        :items="images"
        :align="settings.align"
        :column-width="settings.columnWidth"
        :layout="settings.layout"
        :min-cols="settings.minCols"
        :gutter-width="settings.gutterWidth"
        :virtualize="settings.virtualize"
        :virtual-buffer-factor="settings.virtualBufferFactor"
        :dynamic-heights="settings.dynamicHeights"
        :load-items="loadMoreImages"
        :is-at-end="isAtEnd"
      >
        <template #item="{ data, itemIdx, isMeasuring }">
          <ImageItem
            :data="data"
            :item-idx="itemIdx"
            :is-measuring="isMeasuring"
          />
        </template>
      </Masonry>

      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-spinner"></div>
        <p>正在加载图片...</p>
      </div>

      <div v-if="isAtEnd && images.length > 0" class="end-indicator">
        <p>已加载全部图片 ({{ images.length }} 张)</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Masonry from './components/Masonry.vue'
import ControlPanel, { type MasonrySettings } from './components/ControlPanel.vue'
import ImageItem, { type ImageData } from './components/ImageItem.vue'

// 瀑布流组件引用
const masonryRef = ref<InstanceType<typeof Masonry>>()

// 瀑布流设置
const settings = reactive<MasonrySettings>({
  layout: 'basic',
  align: 'center',
  columnWidth: 236,
  gutterWidth: 14,
  minCols: 3,
  virtualize: false,
  dynamicHeights: true,
  virtualBufferFactor: 0.7
})

// 图片数据
const images = ref<ImageData[]>([])
const isLoading = ref(false)
const isAtEnd = ref(false)
const currentPage = ref(0)

// 示例图片数据生成器
const generateSampleImages = (count: number = 20): ImageData[] => {
  const sampleImages = []
  const categories = ['nature', 'city', 'technology', 'abstract', 'people']
  const widths = [300, 400, 500, 600]
  const heights = [200, 300, 400, 500, 600, 700, 800]

  for (let i = 0; i < count; i++) {
    const width = widths[Math.floor(Math.random() * widths.length)]
    const height = heights[Math.floor(Math.random() * heights.length)]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const id = currentPage.value * count + i + 1

    sampleImages.push({
      id: id,
      url: `https://picsum.photos/${width}/${height}?random=${id}`,
      title: `图片 ${id}`,
      description: `这是第 ${id} 张图片，尺寸为 ${width}×${height}`,
      width: width,
      height: height,
      size: Math.floor(Math.random() * 500000) + 50000 // 50KB - 550KB
    })
  }

  return sampleImages
}

// 处理设置更新
const handleSettingsUpdate = (newSettings: MasonrySettings) => {
  Object.assign(settings, newSettings)
}

// 加载更多图片
const loadMoreImages = async () => {
  if (isLoading.value || isAtEnd.value) return

  isLoading.value = true

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    const newImages = generateSampleImages(20)
    images.value.push(...newImages)
    currentPage.value++

    // 模拟最多加载 200 张图片
    if (images.value.length >= 200) {
      isAtEnd.value = true
    }
  } catch (error) {
    console.error('加载图片失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 初始化
onMounted(() => {
  loadMoreImages()
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: white;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.end-indicator {
  text-align: center;
  padding: 40px 20px;
  color: white;
  opacity: 0.8;
}

.end-indicator p {
  margin: 0;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }

  #app {
    padding: 10px 0;
  }
}
</style>

<style>
/* 全局样式 */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  scroll-behavior: smooth;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>