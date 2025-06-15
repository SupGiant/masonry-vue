<template>
  <div class="image-card">
    <div class="image-container">
      <img
        :src="item.imageUrl"
        :alt="item.title"
        @load="handleImageLoad"
        @error="handleImageError"
        class="card-image"
      />
    </div>

    <div class="card-footer">
      <div class="card-meta">
        <span class="type-badge" :class="{
          'preset': item.height,
          'dynamic': !item.height
        }">
          {{ item.type || '普通图片' }}
        </span>
        <span class="item-id">ID: {{ item.id }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

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

const handleImageLoad = () => {
  emit('imageLoad', props.item.id)
}

const handleImageError = () => {
  emit('imageError', props.item.id)
}
</script>

<style scoped>
.image-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  background: white;
}

.image-card:hover {
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

.image-card:hover .card-image {
  transform: scale(1.05);
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
</style>
