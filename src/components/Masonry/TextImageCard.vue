<template>
  <div class="text-image-card">
    <!-- 图片部分 -->
    <div class="image-section">
      <img
        :src="item.imageUrl"
        :alt="item.title"
        @load="handleImageLoad"
        @error="handleImageError"
        class="card-image"
      />
    </div>

    <!-- 文字内容部分 -->
    <div class="text-section">
      <div class="text-header">
        <h3 class="title">{{ item.title }}</h3>
        <div v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</div>
      </div>

      <div class="text-body">
        <p class="content">{{ item.content }}</p>

        <div v-if="item.extraTextList && item.extraTextList.length > 0" class="extra-text">
          <p v-for="(text, idx) in item.extraTextList" :key="idx" class="extra-item">{{ text }}</p>
        </div>
      </div>

      <div v-if="item.tags && item.tags.length > 0" class="tags">
        <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <div class="card-footer">
        <div class="card-meta">
          <span class="type-badge text-image">
            {{ item.type || '图文内容' }}
          </span>
          <span class="item-id">ID: {{ item.id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
.text-image-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  background: white;
  border: 2px solid rgba(63, 81, 181, 0.3);
}

.text-image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(63, 81, 181, 0.2);
  border-color: rgba(63, 81, 181, 0.6);
}

/* 图片部分 */
.image-section {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 200px; /* 固定图片高度 */
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.text-image-card:hover .card-image {
  transform: scale(1.05);
}

/* 文字部分 */
.text-section {
  padding: 20px;
  background: white;
}

.text-header {
  margin-bottom: 16px;
}

.title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  line-height: 1.3;
}

.subtitle {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  padding: 4px 12px;
  background: rgba(63, 81, 181, 0.1);
  border-radius: 20px;
  display: inline-block;
  border: 1px solid rgba(63, 81, 181, 0.2);
}

.text-body {
  margin-bottom: 16px;
}

.content {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #444;
}

.extra-text {
  margin-top: 12px;
  padding: 12px;
  background: rgba(63, 81, 181, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(63, 81, 181, 0.1);
}

.extra-item {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.extra-item:last-child {
  margin-bottom: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.tag {
  padding: 4px 10px;
  background: rgba(63, 81, 181, 0.1);
  color: #3f51b5;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid rgba(63, 81, 181, 0.2);
  transition: all 0.2s ease;
}

.tag:hover {
  background: rgba(63, 81, 181, 0.2);
  transform: translateY(-1px);
}

.card-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 12px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #666;
}

.type-badge {
  background: rgba(63, 81, 181, 0.1);
  color: #3f51b5;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid rgba(63, 81, 181, 0.2);
}

.item-id {
  opacity: 0.7;
}
</style>
