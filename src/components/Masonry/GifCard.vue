<template>
  <div class="gif-card" :class="{ 'gif-playing': isPlaying }">
    <div class="image-container">
      <img
        :src="currentImageUrl"
        :alt="item.title"
        @load="handleImageLoad"
        @error="handleImageError"
        @mouseenter="startGifAnimation"
        @mouseleave="stopGifAnimation"
        class="card-image gif-hoverable"
      />

      <!-- GIF状态指示器 (只在提取时显示) -->
      <div v-if="isExtractingFrame" class="gif-indicator">
        <div class="extracting-indicator">
          <div class="loading-spinner"></div>
          <span>正在提取首帧...</span>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="card-meta">
        <span class="type-badge" :class="{
          'gif-static': !isPlaying,
          'gif-playing': isPlaying
        }">
          {{ item.type || 'GIF动画' }}
        </span>
        <span class="item-id">ID: {{ item.id }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface DemoItem {
  id: string | number
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

const props = defineProps<{
  item: DemoItem
}>()

const emit = defineEmits<{
  imageLoad: [id: string | number]
  imageError: [id: string | number]
}>()

// 状态管理
const isPlaying = ref(false)
const isExtractingFrame = ref(true)
const staticImageUrl = ref('')

// GIF首帧提取缓存
const gifFirstFrameCache = new Map<string, string>()

// 当前显示的图片URL
const currentImageUrl = computed(() => {
  if (isPlaying.value) {
    return props.item.originalGifUrl || props.item.imageUrl
  }
  return staticImageUrl.value || props.item.imageUrl
})

// 从GIF中提取首帧
async function extractGifFirstFrame(gifUrl: string): Promise<string> {
  // 检查缓存
  if (gifFirstFrameCache.has(gifUrl)) {
    return gifFirstFrameCache.get(gifUrl)!
  }

  try {
    // 创建一个隐藏的canvas来处理GIF
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建Canvas上下文')

    // 创建Image对象加载GIF
    const img = new Image()
    img.crossOrigin = 'anonymous' // 允许跨域

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // 设置canvas尺寸
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height

          // 绘制GIF的第一帧到canvas
          ctx.drawImage(img, 0, 0)

          // 将canvas转换为base64图片
          const firstFrameDataUrl = canvas.toDataURL('image/jpeg', 0.8)

          // 缓存结果
          gifFirstFrameCache.set(gifUrl, firstFrameDataUrl)

          resolve(firstFrameDataUrl)
        } catch (error) {
          console.warn('提取GIF首帧失败:', error)
          // 失败时返回原GIF URL
          resolve(gifUrl)
        }
      }

      img.onerror = () => {
        console.warn('GIF加载失败:', gifUrl)
        // 失败时返回原GIF URL
        resolve(gifUrl)
      }

      // 开始加载GIF
      img.src = gifUrl
    })
  } catch (error) {
    console.warn('GIF首帧提取过程出错:', error)
    // 出错时返回原GIF URL
    return gifUrl
  }
}

// 开始播放GIF
const startGifAnimation = () => {
  if (!isExtractingFrame.value) {
    isPlaying.value = true
  }
}

// 停止播放GIF
const stopGifAnimation = () => {
  isPlaying.value = false
}

const handleImageLoad = () => {
  emit('imageLoad', props.item.id)
}

const handleImageError = () => {
  emit('imageError', props.item.id)
}

// 初始化时提取首帧
onMounted(async () => {
  const gifUrl = props.item.originalGifUrl || props.item.imageUrl
  if (gifUrl) {
    try {
      const firstFrame = await extractGifFirstFrame(gifUrl)
      staticImageUrl.value = firstFrame
      isExtractingFrame.value = false
    } catch (error) {
      console.warn('首帧提取失败:', error)
      isExtractingFrame.value = false
    }
  }
})
</script>

<style scoped>
.gif-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  background: white;
  border: 2px solid rgba(255, 193, 7, 0.3);
}

.gif-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.gif-card.gif-playing {
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.2);
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

.card-image.gif-hoverable {
  cursor: pointer;
}

.card-image.gif-hoverable:hover {
  filter: brightness(1.1);
}

.gif-card:hover .card-image {
  transform: scale(1.05);
}

/* GIF指示器 */
.gif-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

.extracting-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px 20px;
  border-radius: 50px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.loading-spinner {
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

.card-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
  padding: 16px;
  color: white;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.type-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(5px);
}

.type-badge.gif-static {
  background: rgba(255, 193, 7, 0.4);
  color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 193, 7, 0.6);
}

.type-badge.gif-playing {
  background: rgba(76, 175, 80, 0.4);
  color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(76, 175, 80, 0.6);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 4px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

.item-id {
  opacity: 0.7;
}
</style>
