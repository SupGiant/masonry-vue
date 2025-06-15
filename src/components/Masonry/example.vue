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
            <button @click="addMixedItems" class="btn btn-primary">添加混合内容</button>
            <button @click="addImageItems" class="btn btn-secondary">添加图片</button>
            <button @click="addGifItems" class="btn btn-success">添加GIF</button>
            <button @click="addTextImageItems" class="btn btn-info">添加图文</button>

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
            <span>图片: {{ imageCount }}/GIF: {{ gifCount }}/图文: {{ textImageCount }}</span>
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
          <!-- 普通图片组件 -->
          <ImageCard
            v-if="(item as DemoItem).itemType === 'image'"
            :item="item as DemoItem"
            @image-load="onImageLoad"
            @image-error="onImageError"
          />

          <!-- GIF组件 -->
          <GifCard
            v-else-if="(item as DemoItem).itemType === 'gif'"
            :item="item as DemoItem"
            @image-load="onImageLoad"
            @image-error="onImageError"
          />

          <!-- 图文组件 -->
          <TextImageCard
            v-else-if="(item as DemoItem).itemType === 'textImage'"
            :item="item as DemoItem"
            @image-load="onImageLoad"
            @image-error="onImageError"
          />
        </template>
      </SimpleMasonry>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-indicator">
        <div class="spinner"></div>
        <span>正在加载更多内容...</span>
      </div>

      <!-- 空状态 -->
      <div v-if="items.length === 0 && !loading" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">🧱</div>
          <h3>暂无内容</h3>
          <p>点击按钮开始测试瀑布流布局和各种内容类型效果</p>
          <div class="empty-actions">
            <button @click="addMixedItems" class="btn btn-primary">添加混合内容</button>
            <button @click="addGifItems" class="btn btn-success">添加GIF动画</button>
            <button @click="addTextImageItems" class="btn btn-info">添加图文内容</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SimpleMasonry from './simple.vue'
import type { MasonryItem } from './simple.vue'
import ImageCard from './ImageCard.vue'
import GifCard from './GifCard.vue'
import TextImageCard from './TextImageCard.vue'

interface DemoItem extends MasonryItem {
  title: string
  content: string
  type?: string
  width?: number
  height?: number
  category?: string
  imageUrl?: string
  timestamp: number
  itemType: 'image' | 'gif' | 'textImage'
  // GIF特有字段
  originalGifUrl?: string
  // 图文特有字段
  subtitle?: string
  extraTextList?: string[]
  tags?: string[]
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

// 计算属性
const imageCount = computed(() => items.value.filter(item => item.itemType === 'image').length)
const gifCount = computed(() => items.value.filter(item => item.itemType === 'gif').length)
const textImageCount = computed(() => items.value.filter(item => item.itemType === 'textImage').length)

// GIF资源池
const GIF_SOURCES = [
  {
    gifUrl: 'https://media.giphy.com/media/26BRrSvJUa0crqw4E/giphy.gif',
    title: '彩虹动画',
    category: 'abstract'
  },
  {
    gifUrl: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    title: '火焰动效',
    category: 'abstract'
  },
  {
    gifUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    title: '粒子动效',
    category: 'technology'
  },
  {
    gifUrl: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    title: '水波动画',
    category: 'nature'
  },
  {
    gifUrl: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    title: '光效动画',
    category: 'abstract'
  }
]

// 文字内容模板库
const TEXT_TEMPLATES = [
  {
    title: '产品介绍',
    subtitles: ['创新设计', '技术突破', '用户体验', '市场领先'],
    contents: [
      '这是一款革命性的产品，采用最新的技术架构，为用户带来前所未有的体验。我们的团队经过多年的研发，终于推出了这个令人兴奋的解决方案。',
      '产品的核心理念是简单易用，同时保持强大的功能性。无论是初学者还是专业人士，都能够快速上手并发挥出最大的价值。'
    ],
    extraTexts: [
      ['• 支持多平台部署', '• 云原生架构设计', '• 高可用性保障'],
      ['• 用户友好的界面', '• 丰富的自定义选项', '• 强大的数据分析']
    ],
    tags: [
      ['技术', '创新', '云计算'],
      ['设计', '用户体验', 'UI/UX']
    ]
  },
  {
    title: '旅行日记',
    subtitles: ['美好时光', '难忘回忆', '精彩瞬间', '旅途见闻'],
    contents: [
      '今天的旅行真是太棒了！我们探索了许多令人惊叹的地方，每一处风景都让人流连忘返。当地的文化和美食也给我们留下了深刻的印象。',
      '在这次旅程中，我们不仅看到了壮丽的自然风光，还结识了许多友善的当地人。他们的热情好客让我们感受到了家的温暖。'
    ],
    extraTexts: [
      ['🏔️ 壮丽的山川景色', '🏖️ 迷人的海滨风光', '🏛️ 古老的建筑文化'],
      ['🍜 地道的当地美食', '🎭 精彩的文化表演', '🛍️ 有趣的购物体验']
    ],
    tags: [
      ['旅行', '探索', '冒险'],
      ['美食', '文化', '摄影']
    ]
  },
  {
    title: '学习心得',
    subtitles: ['知识积累', '技能提升', '思维拓展', '成长感悟'],
    contents: [
      '学习是一个持续的过程，每天都有新的发现和收获。通过不断的实践和思考，我们能够逐步提升自己的能力和见识。',
      '在学习的道路上，遇到困难是很正常的事情。重要的是要保持积极的心态，勇于面对挑战，从错误中吸取经验。'
    ],
    extraTexts: [
      ['📚 系统性学习方法', '🎯 明确的学习目标', '⏰ 合理的时间规划'],
      ['🤝 与他人分享交流', '💡 创新思维培养', '🔍 深入研究探索']
    ],
    tags: [
      ['学习', '知识', '成长'],
      ['思考', '实践', '总结']
    ]
  }
]

// 生成随机尺寸
function getRandomDimensions() {
  const widths = [240, 300, 320, 400]
  const heights = [150, 200, 250, 300, 350, 400, 450]

  return {
    width: widths[Math.floor(Math.random() * widths.length)],
    height: heights[Math.floor(Math.random() * heights.length)]
  }
}

// 生成随机内容
function getRandomContent(): string {
  const contents = [
    '这是一个短内容。',
    '这是一个稍长的内容，包含更多的文字来测试不同的高度。',
    '这是一个很长的内容，用来测试瀑布流布局在处理不同高度内容时的表现。包含了多行文字，以及一些额外的描述信息。',
    '中等长度的内容，用于展示自动高度测量的效果。这个功能对于动态内容非常重要。'
  ]
  return contents[Math.floor(Math.random() * contents.length)]
}

// 添加混合内容
function addMixedItems() {
  const newItems: DemoItem[] = []

  for (let i = 0; i < 12; i++) {
    const randomType = Math.random()
    const id = ++itemIdCounter

    if (randomType < 0.4) {
      // 普通图片
      const { width, height } = getRandomDimensions()
      const hasPresetHeight = Math.random() > 0.5

      newItems.push({
        id,
        title: `图片内容 #${id}`,
        content: getRandomContent(),
        type: hasPresetHeight ? '预设高度' : '动态高度',
        width: columnWidth.value,
        height: hasPresetHeight ? height : undefined,
        imageUrl: `https://picsum.photos/seed/${id}/${columnWidth.value}/${height}`,
        timestamp: Date.now(),
        itemType: 'image'
      })
    } else if (randomType < 0.7) {
      // GIF
      const gifSource = GIF_SOURCES[Math.floor(Math.random() * GIF_SOURCES.length)]
      newItems.push({
        id,
        title: `GIF动画 #${id}`,
        content: `这是一个${gifSource.title}的GIF动画，鼠标悬停播放`,
        type: 'GIF动画',
        width: columnWidth.value,
        imageUrl: gifSource.gifUrl,
        originalGifUrl: gifSource.gifUrl,
        timestamp: Date.now(),
        itemType: 'gif'
      })
    } else {
      // 图文内容
      const template = TEXT_TEMPLATES[Math.floor(Math.random() * TEXT_TEMPLATES.length)]
      const subtitleIndex = Math.floor(Math.random() * template.subtitles.length)
      const contentIndex = Math.floor(Math.random() * template.contents.length)
      const extraTextIndex = Math.floor(Math.random() * template.extraTexts.length)
      const tagIndex = Math.floor(Math.random() * template.tags.length)

      const bgImageSeed = `text-bg-${id}`

      newItems.push({
        id,
        title: `${template.title} #${id}`,
        subtitle: template.subtitles[subtitleIndex],
        content: template.contents[contentIndex],
        type: '图文内容',
        width: columnWidth.value,
        imageUrl: `https://picsum.photos/seed/${bgImageSeed}/400/200`,
        extraTextList: Math.random() > 0.6 ? template.extraTexts[extraTextIndex] : undefined,
        tags: Math.random() > 0.4 ? template.tags[tagIndex] : undefined,
        timestamp: Date.now(),
        itemType: 'textImage'
      })
    }
  }

  items.value.push(...newItems)
}

// 添加纯图片内容
function addImageItems() {
  const newItems: DemoItem[] = []

  for (let i = 0; i < 8; i++) {
    const id = ++itemIdCounter
    const { width, height } = getRandomDimensions()
    const hasPresetHeight = Math.random() > 0.5

    newItems.push({
      id,
      title: `图片内容 #${id}`,
      content: getRandomContent(),
      type: hasPresetHeight ? '预设高度' : '动态高度',
      width: columnWidth.value,
      height: hasPresetHeight ? height : undefined,
      imageUrl: `https://picsum.photos/seed/${id}/${columnWidth.value}/${height}`,
      timestamp: Date.now(),
      itemType: 'image'
    })
  }

  items.value.push(...newItems)
}

// 添加GIF内容
function addGifItems() {
  const newItems: DemoItem[] = []

  for (let i = 0; i < 6; i++) {
    const id = ++itemIdCounter
    const gifSource = GIF_SOURCES[Math.floor(Math.random() * GIF_SOURCES.length)]

    newItems.push({
      id,
      title: `GIF动画 #${id}`,
      content: `这是一个${gifSource.title}的GIF动画，鼠标悬停播放`,
      type: 'GIF动画',
      width: columnWidth.value,
      imageUrl: gifSource.gifUrl,
      originalGifUrl: gifSource.gifUrl,
      timestamp: Date.now(),
      itemType: 'gif'
    })
  }

  items.value.push(...newItems)
}

// 添加图文内容
function addTextImageItems() {
  const newItems: DemoItem[] = []

  for (let i = 0; i < 6; i++) {
    const id = ++itemIdCounter
    const template = TEXT_TEMPLATES[Math.floor(Math.random() * TEXT_TEMPLATES.length)]
    const subtitleIndex = Math.floor(Math.random() * template.subtitles.length)
    const contentIndex = Math.floor(Math.random() * template.contents.length)
    const extraTextIndex = Math.floor(Math.random() * template.extraTexts.length)
    const tagIndex = Math.floor(Math.random() * template.tags.length)

    const bgImageSeed = `text-bg-${id}`

    newItems.push({
      id,
      title: `${template.title} #${id}`,
      subtitle: template.subtitles[subtitleIndex],
      content: template.contents[contentIndex],
      type: '图文内容',
      width: columnWidth.value,
      imageUrl: `https://picsum.photos/seed/${bgImageSeed}/400/200`,
      extraTextList: Math.random() > 0.6 ? template.extraTexts[extraTextIndex] : undefined,
      tags: Math.random() > 0.4 ? template.tags[tagIndex] : undefined,
      timestamp: Date.now(),
      itemType: 'textImage'
    })
  }

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
  // 已移除展开功能
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

  addMixedItems()

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
  addMixedItems()
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

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
  transform: translateY(-1px);
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
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

.empty-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
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

  .empty-actions {
    flex-direction: column;
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
