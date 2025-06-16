<template>
  <div id="app">
    <h1>Vue Masonry 示例</h1>
    <Masonry
      :items="items"
      :columnWidth="240"
      :gutterWidth="16"
      :minCols="2"
      layout="basic"
      align="center"
      :renderItem="renderItem"
      :loadItems="loadItems"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import Masonry from './components'

// 模拟数据
const items = ref([
  { id: 1, title: '卡片 1', content: '这是第一个卡片的内容', height: 200 },
  { id: 2, title: '卡片 2', content: '这是第二个卡片的内容，比较长一些，所以高度会更高一点', height: 280 },
  { id: 3, title: '卡片 3', content: '短内容', height: 150 },
  { id: 4, title: '卡片 4', content: '这是另一个卡片，内容适中', height: 220 },
  { id: 5, title: '卡片 5', content: '又一个卡片的内容，用来测试瀑布流布局效果', height: 300 },
  { id: 6, title: '卡片 6', content: '最后一个卡片', height: 180 },
  { id: 7, title: '卡片 7', content: '继续添加更多卡片来测试布局', height: 250 },
  { id: 8, title: '卡片 8', content: '这个卡片有更多的文字内容，用来展示不同高度的卡片在瀑布流中的排列效果', height: 320 },
])

// 加载更多数据的函数
const loadItems = ({ from }: { from: number }) => {
  console.log('Loading more items from:', from)

  // 模拟异步加载
  setTimeout(() => {
    const newItems = Array.from({ length: 8 }, (_, index) => ({
      id: from + index + 1,
      title: `卡片 ${from + index + 1}`,
      content: `这是第 ${from + index + 1} 个卡片的内容，${Math.random() > 0.5 ? '内容比较长一些，用来测试不同高度的卡片效果' : '简短内容'}`,
      height: Math.floor(Math.random() * 200) + 150 // 随机高度 150-350px
    }))

    items.value.push(...newItems)
  }, 1000) // 模拟网络延迟
}

// 渲染函数
const renderItem = ({ data, itemIdx, isMeasuring }: { data: any; itemIdx: number; isMeasuring: boolean }) => {
  return h('div', {
    style: {
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: `${data.height}px`,
      boxSizing: 'border-box',
      opacity: isMeasuring ? 0 : 1
    }
  }, [
    h('h3', { style: { margin: '0 0 8px 0', color: '#333' } }, data.title),
    h('p', { style: { margin: 0, color: '#666', lineHeight: '1.5' } }, data.content),
    h('div', { style: { marginTop: '8px', fontSize: '12px', color: '#999' } },
      `索引: ${itemIdx} | 高度: ${data.height}px`
    )
  ])
}
</script>

<style>
#app {
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  min-height: 100vh;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

/* Masonry 容器样式 */
.Masonry {
  position: relative;
}

.Masonry__Item {
  position: absolute;
  transition: transform 0.3s ease;
}

.Masonry__Item__Mounted {
  /* 已挂载的项目样式 */
}
</style>
