<template>
  <div class="masonry-demo">
    <h1>Vue 瀑布流组件演示</h1>

    <div class="controls">
      <button @click="addItems">添加项目</button>
      <button @click="removeItems">移除项目</button>
      <button @click="resetLayout">重置布局</button>

      <div class="config">
        <label>
          列宽:
          <input
            v-model.number="config.columnWidth"
            type="number"
            min="200"
            max="400"
            @change="updateConfig"
          />
        </label>

        <label>
          间距:
          <input
            v-model.number="config.gutterWidth"
            type="number"
            min="0"
            max="50"
            @change="updateConfig"
          />
        </label>

        <label>
          最小列数:
          <input
            v-model.number="config.minCols"
            type="number"
            min="1"
            max="6"
            @change="updateConfig"
          />
        </label>

        <label>
          对齐方式:
          <select v-model="config.align" @change="updateConfig">
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </label>
      </div>
    </div>

    <Masonry
      ref="masonryRef"
      :items="items"
      :column-width="config.columnWidth"
      :gutter-width="config.gutterWidth"
      :min-cols="config.minCols"
      :align="config.align"
      :get-item-key="getItemKey"
    >
      <template v-slot="{ item, index }">
        <div class="item-card" :style="{ backgroundColor: item.color }">
          <div class="item-content">
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <small>项目ID: {{ item.id }}</small>
          </div>
        </div>
      </template>
    </Masonry>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import Masonry from '../components/Masonry.vue'

interface MasonryItem {
  id: number
  title: string
  description: string
  color: string
}

const masonryRef = ref()

// 配置项
const config = reactive({
  columnWidth: 250,
  gutterWidth: 20,
  minCols: 2,
  align: 'center' as 'left' | 'center' | 'right'
})

// 示例数据
const items = ref<MasonryItem[]>([])

// 随机颜色数组
const colors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9'
]

// 生成随机项目
const generateItem = (id: number): MasonryItem => {
  const descriptions = [
    '这是一个简短的描述。',
    '这是一个稍微长一点的描述，用来测试不同高度的项目如何在瀑布流中排列。',
    '这是一个非常长的描述，包含了更多的文字内容，目的是为了创建不同高度的卡片，以便测试瀑布流布局算法的效果。这样可以更好地展示瀑布流组件的功能。',
    '中等长度的描述内容，用于展示瀑布流布局的多样性。'
  ]

  return {
    id,
    title: `项目 ${id}`,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    color: colors[Math.floor(Math.random() * colors.length)]
  }
}

// 初始化数据
const initializeItems = () => {
  const initialItems: MasonryItem[] = []
  for (let i = 1; i <= 20; i++) {
    initialItems.push(generateItem(i))
  }
  items.value = initialItems
}

// 添加项目
const addItems = () => {
  const currentLength = items.value.length
  const newItems: MasonryItem[] = []

  for (let i = 0; i < 5; i++) {
    newItems.push(generateItem(currentLength + i + 1))
  }

  items.value = [...items.value, ...newItems]
}

// 移除项目
const removeItems = () => {
  if (items.value.length > 5) {
    items.value = items.value.slice(0, -5)
  }
}

// 重置布局
const resetLayout = () => {
  if (masonryRef.value && masonryRef.value.reset) {
    masonryRef.value.reset()
  }
}

// 更新配置
const updateConfig = () => {
  nextTick(() => {
    resetLayout()
  })
}

// 获取项目唯一key
const getItemKey = (item: MasonryItem) => item.id

// 初始化
initializeItems()
</script>

<style scoped>
.masonry-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.controls {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.controls button {
  margin-right: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background: #0056b3;
}

.config {
  margin-top: 15px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.config label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.config input,
.config select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 80px;
}

.item-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  background: white;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.item-content {
  padding: 16px;
}

.item-content h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1em;
}

.item-content p {
  margin: 0 0 8px 0;
  color: #666;
  line-height: 1.4;
}

.item-content small {
  color: #999;
  font-size: 0.85em;
}

@media (max-width: 768px) {
  .masonry-demo {
    padding: 10px;
  }

  .config {
    flex-direction: column;
    gap: 10px;
  }

  .config label {
    justify-content: space-between;
  }
}
</style>
