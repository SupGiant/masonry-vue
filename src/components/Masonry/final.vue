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
      <div
        ref="containerRef"
        class="masonry-container"
        @scroll="onScroll"
      >
        <div
          v-for="(item, index) in visibleItems"
          :key="item.id"
          class="masonry-item"
          :style="getItemStyle(item)"
          @click="onItemClick(item)"
        >
          <div class="image-card">
            <img
              :src="item.imageUrl"
              :alt="item.title"
              @load="onImageLoad($event, item)"
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
        </div>
      </div>

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
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue'

interface MasonryItem {
  id: string | number
  title: string
  description: string
  width: number
  height: number
  category: string
  imageUrl: string
  timestamp: number
}

// 组件引用
const containerRef = ref<HTMLElement>()

// 配置参数
const columnWidth = ref(240)
const gutter = ref(16)
const minCols = ref(2)
const virtualize = ref(false)
const enableInfiniteScroll = ref(true)

// 数据状态
const items = ref<MasonryItem[]>([])
const loading = ref(false)
let itemIdCounter = 0

// 响应式状态
const state = reactive({
  containerWidth: 0,
  scrollTop: 0,
  itemHeights: new Map<string | number, number>(),
  positions: new Map<string | number, { top: number; left: number; width: number; height: number }>()
})

// 计算列数
const columnCount = computed(() => {
  if (!state.containerWidth) return minCols.value
  return Math.max(
    Math.floor(state.containerWidth / (columnWidth.value + gutter.value)),
    minCols.value
  )
})

// 计算实际列宽
const actualColumnWidth = computed(() => {
  if (!state.containerWidth || !columnCount.value) return columnWidth.value
  return (state.containerWidth - (columnCount.value - 1) * gutter.value) / columnCount.value
})

// 计算最大高度
const maxHeight = computed(() => {
  if (state.positions.size === 0) return 0
  return Math.max(...Array.from(state.positions.values()).map(p => p.top + p.height))
})

// 计算布局
function calculateLayout() {
  const heights = Array(columnCount.value).fill(0)
  const newPositions = new Map()

  items.value.forEach((item) => {
    const itemHeight = state.itemHeights.get(item.id) || item.height || 200
    const shortestColumn = heights.indexOf(Math.min(...heights))

    const position = {
      top: heights[shortestColumn],
      left: shortestColumn * (actualColumnWidth.value + gutter.value),
      width: actualColumnWidth.value,
      height: itemHeight
    }

    newPositions.set(item.id, position)
    heights[shortestColumn] += itemHeight + gutter.value
  })

  state.positions = newPositions
}

// 计算可见项目（虚拟滚动）
const visibleItems = computed(() => {
  if (!virtualize.value) return items.value

  const bufferHeight = window.innerHeight * 2
  const viewportTop = state.scrollTop - bufferHeight
  const viewportBottom = state.scrollTop + window.innerHeight + bufferHeight

  return items.value.filter(item => {
    const position = state.positions.get(item.id)
    if (!position) return true

    return !(position.top + position.height < viewportTop || position.top > viewportBottom)
  })
})

// 获取项目样式
function getItemStyle(item: MasonryItem) {
  const position = state.positions.get(item.id)
  if (!position) {
    return `
      position: absolute;
      top: 0px;
      left: 0px;
      width: ${actualColumnWidth.value}px;
      opacity: 0.5;
    `
  }

  return `
    position: absolute;
    top: ${position.top}px;
    left: ${position.left}px;
    width: ${position.width}px;
    transform: translateZ(0);
    transition: all 0.3s ease;
  `
}

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
      imageUrl: `https://placehold.co/${width}x${height}/${color}/white?text=图片+${id}`,
      timestamp: Date.now()
    }
  })
}

// 添加项目
function addItems() {
  const newItems = generateItems(20)
  items.value.push(...newItems)
}

// 清空项目
function clearItems() {
  items.value = []
  itemIdCounter = 0
  state.itemHeights.clear()
  state.positions.clear()
}

// 重新布局
function reflow() {
  state.itemHeights.clear()
  state.positions.clear()
  nextTick(() => {
    calculateLayout()
  })
}

// 加载更多（无限滚动）
async function loadMore() {
  if (loading.value || !enableInfiniteScroll.value) return

  loading.value = true

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000))

  const newItems = generateItems(15)
  items.value.push(...newItems)

  loading.value = false
}

// 滚动处理
function onScroll(event: Event) {
  if (virtualize.value) {
    state.scrollTop = (event.target as HTMLElement).scrollTop
  }

  // 检查是否需要加载更多
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
    loadMore()
  }
}

// 图片加载完成
function onImageLoad(event: Event, item: MasonryItem) {
  const img = event.target as HTMLImageElement
  const height = img.naturalHeight * (actualColumnWidth.value / img.naturalWidth)

  if (height && height !== state.itemHeights.get(item.id)) {
    state.itemHeights.set(item.id, height)
    nextTick(() => {
      calculateLayout()
    })
  }
}

// 图片加载错误
function onImageError(event: Event) {
  console.warn('图片加载失败:', event.target)
}

// 点击项目
function onItemClick(item: MasonryItem) {
  console.log('点击了项目:', item)
}

// 更新容器宽度
function updateContainerWidth() {
  if (containerRef.value) {
    state.containerWidth = containerRef.value.clientWidth
  }
}

// 防抖函数
function debounce(fn: Function, delay: number) {
  let timer: number | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const debouncedResize = debounce(updateContainerWidth, 300)

// 监听器
watch([() => items.value.length, () => state.containerWidth], () => {
  nextTick(() => {
    calculateLayout()
  })
})

// 生命周期
onMounted(() => {
  updateContainerWidth()
  window.addEventListener('resize', debouncedResize)
  addItems() // 初始化数据
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
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
  max-width: 1400px;
  margin: 0 auto;
}

/* 瀑布流容器 */
.masonry-container {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 160px);
  overflow-x: hidden;
  overflow-y: auto;
}

.masonry-item {
  box-sizing: border-box;
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
  height: 100%;
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
