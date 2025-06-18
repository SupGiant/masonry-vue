<template>
  <div id="app" class="app">
    虚拟的瀑布流
    <div class="container" ref="containerRef">
      <VirtualMasonry
      :items="items"
      :render-item="renderItem"
      :_dynamic-heights="true"
      :gutterWidth="10"
      :align="'center'"
      :columnWidth="240"
      :layout="'basic'"
    />
    </div>

  </div>
</template>

<script setup lang="tsx">
import VirtualMasonry from './components/masonry/index'
import { ref, onMounted, useTemplateRef } from 'vue'


// const container = useTemplateRef<HTMLElement>('containerRef')

// 数据状态
const items = ref<any[]>([])
const loading = ref(false)
let itemIdCounter = 0

const renderItem = ({ data, itemIdx, isMeasuring }: { data: any, itemIdx: number, isMeasuring: boolean }) => {
  return <div>
    <img src={data.imageUrl} alt="item" key={itemIdx} style={{ width: '100%', height: '100%' }} />
  </div>
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
function generateItems(count: number) {
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

onMounted(() => {
  addItems()
})
</script>

<style>
.app {
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}
.container {
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}
</style>
