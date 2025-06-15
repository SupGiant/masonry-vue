# Vue 瀑布流组件 (Masonry)

一个功能完整的 Vue 3 + TypeScript 瀑布流组件，支持虚拟滚动、动态高度、多种布局模式和无限滚动。

## ✨ 特性

- 🎯 **多种布局算法**: 基础、居中、灵活宽度、统一行高等布局模式
- 🚀 **虚拟滚动**: 支持大量数据的高性能渲染
- 📐 **动态高度**: 自动适应内容高度变化
- 🔄 **响应式**: 自动适应容器宽度变化
- ♾️ **无限滚动**: 支持懒加载更多数据
- 💪 **TypeScript**: 完整的类型支持
- 🎨 **自定义渲染**: 灵活的项目渲染函数

## 🏗️ 核心架构

### 主要类和接口

```typescript
// 数据项接口
interface MasonryItem {
  id: string | number
  [key: string]: any
}

// 位置信息
interface Position {
  top: number
  left: number
  width: number
  height: number
}

// 测量缓存类
class MeasurementStore {
  get(item: MasonryItem): number | undefined
  has(item: MasonryItem): boolean
  set(item: MasonryItem, height: number): void
  reset(): void
}
```

### 核心算法

#### 1. 瀑布流布局算法

```typescript
// 基础布局算法 - 贪心算法，总是选择最短的列
function createBasicLayout(params: LayoutParams) {
  return function calculateLayout(items: MasonryItem[]): Position[] {
    const heights = Array(columnCount).fill(0)
    
    return items.map(item => {
      const itemHeight = measurementStore.get(item)
      const shortestColumnIndex = getShortestColumnIndex(heights)
      const position = {
        top: heights[shortestColumnIndex],
        left: shortestColumnIndex * columnWidthAndGutter + centerOffset,
        width: columnWidth,
        height: itemHeight
      }
      
      heights[shortestColumnIndex] += itemHeight + gutter
      return position
    })
  }
}
```

#### 2. 虚拟滚动实现

```typescript
// 检查元素是否在可视区域内
function isItemVisible(position: Position): boolean {
  const bufferHeight = containerHeight * virtualBufferFactor
  const scrollTop = state.scrollTop - containerOffset
  const viewportBottom = scrollTop + containerHeight + bufferHeight
  const viewportTop = scrollTop - bufferHeight
  
  return !(position.top + position.height < viewportTop || position.top > viewportBottom)
}
```

## 📖 使用方法

### 基础用法

```vue
<template>
  <MasonryComponent
    :items="items"
    :render-item="renderItem"
    :column-width="240"
    :gutter="16"
    :min-cols="2"
    layout="basic"
    align="center"
  />
</template>

<script setup lang="ts">
import MasonryComponent, { type MasonryItem } from '@/components/Masonry'
import { h, ref } from 'vue'

const items = ref<MasonryItem[]>([
  { id: 1, title: '项目1', content: '内容...', height: 200 },
  { id: 2, title: '项目2', content: '内容...', height: 300 },
  // ... 更多项目
])

function renderItem({ data, itemIdx, isMeasuring }) {
  return h('div', {
    style: {
      padding: '16px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      minHeight: data.height + 'px'
    }
  }, [
    h('h3', data.title),
    h('p', data.content)
  ])
}
</script>
```

### 启用虚拟滚动

```vue
<template>
  <MasonryComponent
    :items="largeDataSet"
    :render-item="renderItem"
    :virtualize="true"
    :virtual-buffer-factor="0.7"
  />
</template>
```

### 启用无限滚动

```vue
<template>
  <MasonryComponent
    :items="items"
    :render-item="renderItem"
    :load-items="loadMoreItems"
  />
</template>

<script setup lang="ts">
async function loadMoreItems({ from }: { from: number }) {
  const newItems = await fetchMoreData(from)
  items.value.push(...newItems)
}
</script>
```

### 灵活宽度布局

```vue
<template>
  <MasonryComponent
    :items="items"
    :render-item="renderItem"
    layout="flexible"
    :min-cols="3"
  />
</template>
```

## 🔧 Props 配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `items` | `MasonryItem[]` | `[]` | 数据项数组 |
| `renderItem` | `Function` | - | 项目渲染函数 |
| `columnWidth` | `number` | `236` | 列宽度 |
| `gutter` | `number` | `14` | 项目间距 |
| `minCols` | `number` | `3` | 最小列数 |
| `align` | `'start'/'center'/'end'` | `'center'` | 对齐方式 |
| `layout` | `LayoutMode` | `'basic'` | 布局模式 |
| `virtualize` | `boolean/Function` | `false` | 启用虚拟滚动 |
| `virtualBufferFactor` | `number` | `0.7` | 虚拟滚动缓冲区系数 |
| `loadItems` | `Function` | - | 无限滚动加载函数 |

## 🎨 布局模式

### 1. Basic (基础)
标准的瀑布流布局，使用贪心算法将项目放置到最短的列中。

### 2. BasicCentered (居中)
基础布局的居中版本，整个瀑布流在容器中居中显示。

### 3. Flexible (灵活)
根据容器宽度自动调整列宽，保持指定的列数。

### 4. UniformRow (统一行)
每行高度统一，项目按行排列。

## 🚀 性能优化

### 1. 虚拟滚动
对于大量数据，启用虚拟滚动可以显著提升性能：

```typescript
// 只渲染可视区域内的项目
const shouldRender = isItemVisible(position)
return shouldRender ? renderItem() : null
```

### 2. 缓存机制
使用 WeakMap 缓存测量结果和位置信息：

```typescript
class MeasurementStore {
  private map = new WeakMap<MasonryItem, number>()
  // ...
}
```

### 3. 防抖和节流
对窗口大小变化和滚动事件进行防抖处理：

```typescript
const handleResize = debounce(() => {
  // 重新计算布局
}, 300)
```

## 🔍 调试和开发

### 暴露的方法

```typescript
// 获取组件引用
const masonryRef = ref()

// 重新布局
masonryRef.value.reflow()

// 重新测量容器
masonryRef.value.measureContainer()
```

### 开发模式
在开发环境中，组件会提供额外的调试信息和警告。

## 📱 响应式支持

组件会自动监听容器宽度变化，并重新计算布局：

```typescript
watch(() => state.width, (newWidth, oldWidth) => {
  if (oldWidth != null && newWidth !== oldWidth) {
    measurementStore.reset()
    positionStore.reset()
  }
})
```

## 🎯 最佳实践

1. **数据稳定性**: 确保 `items` 数组中每个项目有唯一且稳定的 `id`
2. **渲染性能**: 避免在 `renderItem` 函数中进行复杂计算
3. **图片加载**: 对图片使用 `loading="lazy"` 属性
4. **虚拟滚动**: 数据量超过 1000 项时建议启用虚拟滚动
5. **动态高度**: 内容高度会变化时启用 `_dynamicHeights`

## 🔧 常见问题

### Q: 为什么布局计算不准确？
A: 确保在项目完全渲染后再进行测量，特别是包含图片的情况下。

### Q: 如何自定义样式？
A: 通过 `renderItem` 函数返回自定义的 JSX 结构和样式。

### Q: 虚拟滚动时项目闪烁？
A: 调整 `virtualBufferFactor` 参数，增加缓冲区大小。

## �� 许可证

MIT License 