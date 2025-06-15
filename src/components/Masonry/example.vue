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
            <label>最大列数:</label>
            <input v-model.number="maxCols" type="number" min="1" max="15" />
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

          <div class="control-item">
            <label>
              <input v-model="dynamicHeights" type="checkbox" />
              动态高度测量
            </label>
          </div>

          <div class="control-item">
            <label>
              <input v-model="useRAF" type="checkbox" />
              使用RAF优化
            </label>
          </div>

          <div class="control-actions">
            <button @click="addItems" class="btn btn-primary">添加内容</button>
            <button @click="addDynamicItems" class="btn btn-primary">添加动态内容</button>

            <button @click="clearItems" class="btn btn-secondary">清空</button>
            <button @click="reflow" class="btn btn-secondary">重新布局</button>
            <button @click="forceRemeasure" class="btn btn-warning">强制重测</button>
          </div>

          <!-- 调试信息 -->
          <div class="debug-info">
            <span>当前列数: {{ masonryRef?.columnCount || 0 }}</span>
            <span>实际列宽: {{ masonryRef?.actualColumnWidth?.toFixed(0) || 0 }}px</span>
            <span>容器宽度: {{ masonryRef?.containerWidth || 0 }}px</span>
            <span>可见元素: {{ masonryRef?.visibleItemsCount || 0 }}/{{ items.length }}</span>
            <span>已测量: {{ masonryRef?.measuredItemsCount || 0 }}</span>
            <span>完全测量: {{ masonryRef?.fullyMeasuredItemsCount || 0 }}</span>
            <span>图片状态: 加载{{ masonryRef?.imageLoadStatesCount?.loaded || 0 }}/错误{{ masonryRef?.imageLoadStatesCount?.error || 0 }}</span>
            <span>待处理: {{ masonryRef?.hasPendingMeasurements ? '是' : '否' }}</span>
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
        :max-cols="maxCols"
        :virtualize="virtualize"
        :dynamic-heights="dynamicHeights"
        :use-r-a-f="useRAF"
        @load-more="loadMore"
        class="masonry-wrapper"
      >
        <template #item="{ item, index }">
          <div class="demo-card" :class="{ 'has-preset-height': item.height }">
            <!-- 图片容器 -->
            <div class="image-container">
              <img
                :src="item.imageUrl"
                :alt="item.title"
                @load="() => onImageLoad(item.id)"
                @error="() => onImageError(item.id)"
                class="card-image"
              />

              <!-- 覆盖在图片上的内容 -->
              <div class="overlay-content">

                <!-- 底部信息 -->
                <div class="card-footer">
                  <div class="card-meta">
                    <span class="type-badge" :class="item.height ? 'preset' : 'dynamic'">
                      {{ item.type || '普通' }}
                    </span>
                    <span class="item-id">ID: {{ item.id }}</span>
                  </div>
                </div>
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
          <div class="empty-icon">🧱</div>
          <h3>暂无内容</h3>
          <p>点击"添加内容"按钮开始测试动态高度测量</p>
          <button @click="addDynamicItems" class="btn btn-primary">添加动态内容</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleMasonry from './simple.vue'
import type { MasonryItem } from './simple.vue'

interface DemoItem extends MasonryItem {
  title: string
  content: string
  type?: string
  width?: number
  height?: number
  category?: string
  imageUrl?: string
  extraContent?: string
  expandable?: boolean
  expanded?: boolean
  timestamp: number
}

// 组件引用
const masonryRef = ref()

// 配置参数
const columnWidth = ref(240)
const gutter = ref(16)
const minCols = ref(3)
const maxCols = ref(8)
const virtualize = ref(true)
const enableInfiniteScroll = ref(true)
const dynamicHeights = ref(true)
const useRAF = ref(true)

// 数据状态
const items = ref<DemoItem[]>([])
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

// 生成内容数据
function generateItems(count: number): DemoItem[] {
  return Array.from({ length: count }, () => {
    const { width, height } = getRandomDimensions()
    const color = getRandomColor()
    const category = getRandomCategory()
    const id = ++itemIdCounter

    // 50%的概率有预设高度
    const hasPresetHeight = Math.random() > 0.5

    return {
      id,
      title: `内容项目 #${id}`,
      content: getRandomContent(),
      type: hasPresetHeight ? '预设高度' : '动态高度',
      width: columnWidth.value, // 使用当前列宽
      height: hasPresetHeight ? height : undefined, // 只有一半有预设高度
      category,
      imageUrl: `https://picsum.photos/seed/${id}/${columnWidth.value}/${height}`,
      timestamp: Date.now()
    }
  })
}

// 生成动态内容数据
function generateDynamicItems(count: number): DemoItem[] {
  return Array.from({ length: count }, () => {
    const id = ++itemIdCounter
    const hasExtra = Math.random() > 0.6
    const isExpandable = Math.random() > 0.7
    const imageHeight = 150 + Math.floor(Math.random() * 250)

    // 30%的概率有预设高度
    const hasPresetHeight = Math.random() > 0.7

    return {
      id,
      title: `动态内容 #${id}`,
      content: getRandomContent(),
      type: hasPresetHeight ? '预设高度' : '动态高度',
      width: columnWidth.value,
      height: hasPresetHeight ? imageHeight : undefined,
      extraContent: hasExtra ? '这是额外的动态内容，会影响高度测量' : undefined,
      imageUrl: `https://picsum.photos/seed/${id}/${columnWidth.value}/${imageHeight}`,
      expandable: isExpandable,
      expanded: false,
      timestamp: Date.now()
    }
  })
}

// 生成随机内容
function getRandomContent(): string {
  const contents = [
    '这是一个短内容。',
    '这是一个稍长的内容，包含更多的文字来测试不同的高度。',
    '这是一个很长的内容，用来测试瀑布流布局在处理不同高度内容时的表现。包含了多行文字，以及一些额外的描述信息。当内容高度发生变化时，ResizeObserver 会自动检测并重新计算布局。',
    '中等长度的内容，用于展示自动高度测量的效果。这个功能对于动态内容非常重要。',
    '短内容测试 ResizeObserver。',
    '这是一个包含很多文字的长内容，用于测试 ResizeObserver 如何处理动态内容变化。当内容发生变化时，组件应该能够自动重新测量高度并调整布局，这是非常重要的功能。'
  ]
  return contents[Math.floor(Math.random() * contents.length)]
}

// 添加项目
function addItems() {
  const newItems = generateItems(15)
  items.value.push(...newItems)
}

// 添加动态项目
function addDynamicItems() {
  const newItems = generateDynamicItems(10)
  items.value.push(...newItems)
}



// 强制重新测量
function forceRemeasure() {
  if (masonryRef.value) {
    masonryRef.value.forceRemeasure()
  }
}

// 切换展开状态
function toggleExpand(itemId: string | number) {
  const item = items.value.find(item => item.id === itemId)
  if (item && 'expanded' in item) {
    item.expanded = !item.expanded
  }
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

  const newItems = generateDynamicItems(10)
  items.value.push(...newItems)

  loading.value = false
}

// 图片加载完成
function onImageLoad(itemId: string | number) {
  // 通知瀑布流组件图片已加载
  if (masonryRef.value && masonryRef.value.handleImageLoad) {
    masonryRef.value.handleImageLoad(itemId)
  }
}

// 图片加载错误
function onImageError(itemId: string | number) {
  console.warn('图片加载失败, item ID:', itemId)
  // 通知瀑布流组件图片加载失败
  if (masonryRef.value && masonryRef.value.handleImageError) {
    masonryRef.value.handleImageError(itemId)
  }
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

.debug-info {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  color: #666;
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

/* 动态内容卡片样式 */
.demo-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.demo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.image-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.demo-card:hover .card-image {
  transform: scale(1.05);
}

/* 覆盖内容 */
.overlay-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.3) 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.7) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  color: white;
}

.overlay-text h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.overlay-text p {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.extra-content {
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  margin: 8px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  border-left: 3px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(5px);
}

/* 底部区域 */
.card-footer {
  margin-top: auto;
}

.expandable-section {
  margin-top: 8px;
}

.expand-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
}

.expand-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.expanded-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 0 0 12px 12px;
  backdrop-filter: blur(10px);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.expanded-content ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.expanded-content li {
  margin: 4px 0;
  font-size: 13px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.type-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(5px);
}

.type-badge.preset {
  background: rgba(76, 175, 80, 0.3);
  color: rgba(255, 255, 255, 0.95);
}

.type-badge.dynamic {
  background: rgba(255, 193, 7, 0.3);
  color: rgba(255, 255, 255, 0.95);
}

.item-id {
  opacity: 0.7;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
  transform: translateY(-1px);
}

.btn-warning {
  background: #ffc107;
  color: #333;
}

.btn-warning:hover {
  background: #e0a800;
  transform: translateY(-1px);
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
