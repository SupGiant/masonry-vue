# Vue 瀑布流组件

基于 React Masonry 组件技术逻辑实现的 Vue 版本瀑布流组件，具备完整的动态高度处理、虚拟滚动、无限加载等高级特性。

## 🌟 核心特性

### 1. 不定宽高元素处理
- **隐藏测量策略**：未测量元素先以 `visibility: hidden` 隐藏渲染
- **动态尺寸获取**：通过 DOM 引用的 `clientHeight` 获取真实高度
- **渐进式布局**：测量完成后逐步显示并添加淡入动画

### 2. 异步图片加载处理
- **ResizeObserver 监听**：监听元素尺寸变化，图片加载完成后自动重新布局
- **增量更新**：只重新计算受影响的元素位置，性能优化
- **错误处理**：图片加载失败时显示占位符

### 3. 虚拟滚动实现
- **可视区域计算**：根据 `scrollTop` 和 `containerHeight` 计算可见范围
- **缓冲区域**：通过 `virtualBufferFactor` 添加上下缓冲区避免空白
- **条件渲染**：只渲染可视区域内的元素，其他返回 `null`

### 4. 元素定位存储
- **WeakMap 存储**：使用 `WeakMap` 避免内存泄漏
- **分离存储**：`measurementStore`(尺寸) 和 `positionStore`(位置) 分离管理
- **自动清理**：元素销毁时自动清理缓存

### 5. 尺寸测量和存储
```typescript
// 测量并存储高度
const measureItems = () => {
  nextTick(() => {
    measuringRefs.value.forEach((el, index) => {
      if (el && unmeasuredItems.value[index]) {
        const height = el.clientHeight
        if (height > 0) {
          state.measurementStore.set(unmeasuredItems.value[index], height)
        }
      }
    })
  })
}
```

### 6. 已确定宽高元素处理
- **快速布局**：已测量元素直接使用缓存尺寸
- **分组处理**：将元素分为已测量和未测量两组
- **优先渲染**：已测量元素优先进行布局计算

### 7. 多布局模式支持
- **基础布局**：标准瀑布流布局
- **灵活布局**：根据容器宽度动态调整列宽
- **统一行高**：每行保持相同高度
- **居中布局**：整体居中对齐

### 8. 滚动容器事件绑定
```typescript
// 滚动监听和无限加载
const handleScroll = () => {
  state.scrollTop = window.scrollY
  
  // 检查是否需要加载更多
  const scrollHeight = document.documentElement.scrollHeight
  const clientHeight = window.innerHeight
  const scrollTop = window.scrollY
  
  if (scrollTop + clientHeight >= scrollHeight - 1000 && !state.isFetching && !props.isAtEnd) {
    fetchMore()
  }
}
```

### 9. 渲染状态控制
- **测量阶段**：`visibility: hidden` + 绝对定位隐藏
- **渲染阶段**：添加 `masonry-item--mounted` 类名
- **动画效果**：CSS `fadeInUp` 动画实现淡入效果

## 🏗️ 组件架构

### 核心组件构成

```
src/components/
├── Masonry.vue           # 主瀑布流组件
├── ItemWrapper.vue       # 项目包装组件（ResizeObserver）
├── ScrollContainer.vue   # 滚动容器组件
├── InfiniteScroll.vue    # 无限滚动组件
├── ControlPanel.vue      # 控制面板组件
└── ImageItem.vue         # 图片项目组件

src/composables/
├── measurementStore.ts   # 测量存储类
├── layoutAlgorithm.ts    # 布局算法
└── utils.ts             # 工具函数
```

### Props 类型定义

```typescript
interface MasonryProps {
  // 基础配置
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  items: any[]
  layout?: 'basic' | 'basicCentered' | 'flexible' | 'uniformRow'
  minCols?: number
  gutterWidth?: number
  
  // 虚拟化
  virtualize?: boolean
  virtualBufferFactor?: number
  
  // 数据加载
  loadItems?: (props: { from: number }) => void
  isAtEnd?: boolean
  
  // 高级配置
  dynamicHeights?: boolean
}
```

## 🚀 使用方法

### 基础用法

```vue
<template>
  <Masonry
    :items="images"
    :column-width="236"
    :gutter-width="14"
    :min-cols="3"
    layout="basic"
    align="center"
    :load-items="loadMoreImages"
  >
    <template #item="{ data, itemIdx, isMeasuring }">
      <ImageItem
        :data="data"
        :item-idx="itemIdx"
        :is-measuring="isMeasuring"
      />
    </template>
  </Masonry>
</template>
```

### 完整示例

```vue
<template>
  <div class="container">
    <!-- 控制面板 -->
    <ControlPanel
      :settings="settings"
      :rendered-count="masonryRef?.renderedItemsCount || 0"
      :total-count="masonryRef?.totalItemsCount || 0"
      :is-fetching="masonryRef?.isFetching || false"
      @update:settings="handleSettingsUpdate"
      @load-more="loadMoreImages"
    />

    <!-- 瀑布流 -->
    <Masonry
      ref="masonryRef"
      :items="images"
      v-bind="settings"
      :load-items="loadMoreImages"
      :is-at-end="isAtEnd"
    >
      <template #item="{ data, itemIdx, isMeasuring }">
        <ImageItem
          :data="data"
          :item-idx="itemIdx"
          :is-measuring="isMeasuring"
        />
      </template>
    </Masonry>
  </div>
</template>
```

## 🎯 技术特色

### 1. 性能优化
- **WeakMap 缓存**：避免内存泄漏
- **防抖/节流**：优化频繁触发的事件
- **虚拟滚动**：减少 DOM 渲染数量
- **增量更新**：只更新必要的元素

### 2. 用户体验
- **渐进式加载**：元素逐步显示
- **平滑动画**：淡入淡出效果
- **响应式设计**：适配移动端
- **无障碍支持**：符合 A11Y 标准

### 3. 开发友好
- **TypeScript 支持**：完整类型定义
- **插槽系统**：灵活的内容定制
- **事件系统**：丰富的回调接口
- **可配置性**：多种布局和参数选项

## 📊 统计信息

控制面板实时显示：
- **渲染元素数量**：当前可见的 DOM 元素数量
- **总元素数量**：数据源中的总元素数量
- **加载状态**：当前是否正在加载新数据

## 🔧 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎨 自定义样式

组件支持完全的样式自定义：

```css
/* 自定义瀑布流容器 */
.masonry-container {
  background: your-background;
}

/* 自定义项目样式 */
.masonry-item {
  border-radius: your-radius;
  box-shadow: your-shadow;
}

/* 自定义动画 */
@keyframes your-animation {
  /* 你的动画定义 */
}
```

## 🏆 技术亮点

1. **完整的技术复现**：忠实还原 React Masonry 的所有核心技术
2. **Vue 3 组合式 API**：充分利用 Vue 3 的响应式系统
3. **TypeScript 严格模式**：确保类型安全和开发体验
4. **模块化设计**：清晰的职责分离和可复用性
5. **性能优先**：多重性能优化策略
6. **用户体验**：流畅的交互和视觉效果

这个 Vue 瀑布流组件完美展示了如何将复杂的 React 技术逻辑转换为 Vue 实现，同时保持所有核心特性和性能优势。
