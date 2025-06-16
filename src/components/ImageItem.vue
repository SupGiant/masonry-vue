<template>
  <div
    class="image-item"
    :class="{ 'image-item--measuring': isMeasuring }"
  >
    <div class="image-item__container">
      <img
        :src="data.url"
        :alt="data.title || '图片'"
        class="image-item__image"
        @load="handleImageLoad"
        @error="handleImageError"
        loading="lazy"
      />

      <div v-if="showOverlay" class="image-item__overlay">
        <div class="image-item__info">
          <h3 v-if="data.title" class="image-item__title">
            {{ data.title }}
          </h3>
          <p v-if="data.description" class="image-item__description">
            {{ data.description }}
          </p>
          <div class="image-item__meta">
            <span v-if="data.width && data.height" class="image-item__dimensions">
              {{ data.width }} × {{ data.height }}
            </span>
            <span v-if="data.size" class="image-item__size">
              {{ formatFileSize(data.size) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ImageData {
  id: string | number
  url: string
  title?: string
  description?: string
  width?: number
  height?: number
  size?: number
}

interface Props {
  data: ImageData
  itemIdx: number
  isMeasuring: boolean
}

const props = defineProps<Props>()

const showOverlay = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)

const handleImageLoad = (event: Event) => {
  imageLoaded.value = true
  const img = event.target as HTMLImageElement

  // 如果图片没有尺寸信息，从加载的图片中获取
  if (!props.data.width || !props.data.height) {
    props.data.width = img.naturalWidth
    props.data.height = img.naturalHeight
  }
}

const handleImageError = () => {
  imageError.value = true
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.image-item {
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.image-item--measuring {
  visibility: hidden;
  opacity: 0;
}

.image-item__container {
  position: relative;
  width: 100%;
}

.image-item__image {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.image-item:hover .image-item__image {
  transform: scale(1.05);
}

.image-item__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 20px 16px 16px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.image-item:hover .image-item__overlay {
  transform: translateY(0);
}

.image-item__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-item__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}

.image-item__description {
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-item__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.8;
}

.image-item__dimensions,
.image-item__size {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 加载状态 */
.image-item__image[src=""] {
  min-height: 200px;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-item__image[src=""]:before {
  content: "加载中...";
  color: #6c757d;
  font-size: 14px;
}

/* 错误状态 */
.image-item__image:not([src]),
.image-item__image[src=""],
.image-item__image[alt]:after {
  content: "图片加载失败";
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f8d7da;
  color: #721c24;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-item {
    border-radius: 4px;
  }

  .image-item__overlay {
    padding: 12px;
  }

  .image-item__title {
    font-size: 14px;
  }

  .image-item__description {
    font-size: 13px;
  }
}

/* 无障碍支持 */
@media (prefers-reduced-motion: reduce) {
  .image-item,
  .image-item__image,
  .image-item__overlay {
    transition: none;
  }

  .image-item:hover {
    transform: none;
  }

  .image-item:hover .image-item__image {
    transform: none;
  }
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .image-item {
    border: 1px solid #000;
  }

  .image-item__overlay {
    background: rgba(0, 0, 0, 0.9);
  }
}
</style>
