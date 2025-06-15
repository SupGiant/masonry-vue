<template>
  <div class="app">
    <!-- 固定顶部Header -->
    <header class="header">
      <div class="header-content">
        <h1>🧱 Vue 瀑布流组件</h1>

        <!-- 横向参数控制区 -->
        <div class="controls">
          <div class="control-item">
            <label>列宽:</label>
            <input v-model.number="columnWidth" type="number" min="150" max="400" />
          </div>

          <div class="control-item">
            <label>间距:</label>
            <input v-model.number="gutter" type="number" min="0" max="50" />
          </div>

          <div class="control-item">
            <label>最小列数:</label>
            <input v-model.number="minCols" type="number" min="1" max="10" />
          </div>

          <div class="control-item">
            <label>
              <input v-model="virtualize" type="checkbox" />
              虚拟滚动
            </label>
          </div>

          <div class="control-item">
            <label>
              <input v-model="enableInfiniteScroll" type="checkbox" />
              无限滚动
            </label>
          </div>

          <div class="control-actions">
            <button @click="addItems" class="btn btn-primary">添加图片</button>
            <button @click="clearItems" class="btn btn-secondary">清空</button>
            <button @click="reflow" class="btn btn-secondary">重新布局</button>
          </div>
        </div>
      </div>
    </header>

    <!-- 瀑布流内容区 -->
    <main class="main-content">
      <SimpleMasonry
        ref="masonryRef"
        :items="items"
        :column-width="columnWidth"
        :gutter="gutter"
        :min-cols="minCols"
        :virtualize="virtualize"
        @load-more="loadMore"
        class="masonry-wrapper"
      >
        <template #item="{ item, index }">
          <div class="image-card">
            <img
              :src="item.imageUrl"
              :alt="item.title"
              :style="{ height: item.height + 'px' }"
              @load="onImageLoad"
              @error="onImageError"
            />
            <div class="card-overlay">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <div class="card-meta">
                <span>尺寸: {{ item.width }}×{{ item.height }}</span>
                <span>ID: {{ item.id }}</span>
              </div>
            </div>
          </div>
        </template>
      </SimpleMasonry>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-indicator">
        <div class="spinner"></div>
        <span>正在加载更多图片...</span>
      </div>

      <!-- 空状态 -->
      <div v-if="items.length === 0 && !loading" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">🖼️</div>
          <h3>暂无图片</h3>
          <p>点击"添加图片"按钮开始使用瀑布流</p>
          <button @click="addItems" class="btn btn-primary">添加一些图片</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleMasonry from './simple.vue'
import type { MasonryItem } from './simple.vue'

// 组件引用
const masonryRef = ref()

// 配置参数
const columnWidth = ref(240)
const gutter = ref(16)
const minCols = ref(3)
const virtualize = ref(false)
const enableInfiniteScroll = ref(true)

// 数据状态
const items = ref<MasonryItem[]>([])
const loading = ref(false)
let itemIdCounter = 0

// 生成随机尺寸
function getRandomDimensions() {
  const widths = [240, 300, 320, 400]
  const heights = [150, 200, 250, 300, 350, 400, 450]

  return {
    width: widths[Math.floor(Math.random() * widths.length)],
    height: heights[Math.floor(Math.random() * heights.length)]
  }
}

// 生成随机颜色
function getRandomColor() {
  const colors = [
    'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FECA57',
    'FF9FF3', '54A0FF', '5F27CD', '00D2D3', 'FF9F43',
    '10AC84', 'EE5A24', '0984E3', '6C5CE7', 'A29BFE',
    'FD79A8', 'E17055', '81ECEC', '74B9FF', '00B894'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// 生成随机类别
function getRandomCategory() {
  const categories = [
    'nature', 'city', 'food', 'animals', 'technology',
    'art', 'people', 'abstract', 'landscape', 'architecture'
  ]
  return categories[Math.floor(Math.random() * categories.length)]
}

// 生成图片数据
function generateItems(count: number): MasonryItem[] {
  return Array.from({ length: count }, () => {
    const { width, height } = getRandomDimensions()
    const color = getRandomColor()
    const category = getRandomCategory()
    const id = ++itemIdCounter

    return {
      id,
      title: `精美图片 #${id}`,
      description: `这是一张${width}×${height}的${category}类型图片`,
      width,
      height,
      category,
      // 使用 placehold.co API
      imageUrl: `https://placehold.co/${width}x${height}`,
      timestamp: Date.now()
    }
  })
}

// 添加项目
function addItems() {
  const newItems = generateItems(30)
  items.value.push(...newItems)
}

// 清空项目
function clearItems() {
  items.value = []
  itemIdCounter = 0
}

// 重新布局
function reflow() {
  if (masonryRef.value) {
    masonryRef.value.reflow()
  }
}

// 加载更多（无限滚动）
async function loadMore() {
  if (loading.value || !enableInfiniteScroll.value) return

  loading.value = true

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 20))

  const newItems = generateItems(15)
  items.value.push(...newItems)

  loading.value = false
}

// 图片加载完成
function onImageLoad(event: Event) {
  // 图片加载完成后，可能需要重新计算布局
  if (masonryRef.value) {
    // 小延迟确保图片完全渲染
    // 这里导致全局重拍，性能非常的差
    // setTimeout(() => {
    //   masonryRef.value.reflow()
    // }, 100)
  }
}

// 图片加载错误
function onImageError(event: Event) {
  console.warn('图片加载失败:', event.target)
}

// 初始化
onMounted(() => {
  addItems()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 固定头部 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 20px;
}

.header h1 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

/* 横向控制面板 */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.control-item label {
  font-weight: 500;
  color: #555;
  white-space: nowrap;
}

.control-item input[type="number"] {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.control-item input[type="checkbox"] {
  margin-right: 4px;
}

.control-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
}

/* 主内容区 */
.main-content {
  padding-top: 140px; /* 为固定头部留出空间 */
  padding-left: 20px;
  padding-right: 20px;
  padding-bottom: 40px;
  width: 100%;
}

.masonry-wrapper {
  min-height: calc(100vh - 160px);
}

/* 图片卡片样式 */
.image-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.image-card img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 16px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.image-card:hover .card-overlay {
  transform: translateY(0);
}

.card-overlay h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.card-overlay p {
  margin: 0 0 8px 0;
  font-size: 14px;
  opacity: 0.9;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.7;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: white;
  font-size: 16px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.empty-content {
  text-align: center;
  color: white;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-content h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.empty-content p {
  margin: 0 0 24px 0;
  font-size: 16px;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 12px 16px;
  }

  .header h1 {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .controls {
    flex-direction: column;
    gap: 12px;
  }

  .control-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-content {
    padding-top: 180px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .control-item {
    font-size: 13px;
  }

  .btn {
    padding: 6px 12px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding-top: 220px;
  }

  .controls {
    align-items: stretch;
  }

  .control-item {
    justify-content: space-between;
  }
}
</style>
