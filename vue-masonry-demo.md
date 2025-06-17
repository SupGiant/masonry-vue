# Vue3 瀑布流组件渲染效果

## 转换对比

### 原 React 代码结构
```javascript
// React useRef + useLayoutEffect
function dh({resizeObserver, idx, children}) {
  let r = useRef(null);
  useLayoutEffect(() => {
    // observe logic
  }, [resizeObserver]);
  
  return jsx("div", {
    ref: r,
    "data-grid-item-idx": idx,
    children: children
  });
}
```

### 转换后的 Vue3 代码
```typescript
// Vue3 ref + onMounted/onUnmounted
const GridItemWrapper = defineComponent({
  setup(props, { slots }) {
    const elementRef = ref<HTMLElement | null>(null)
    
    onMounted(() => {
      // observe logic
    })
    
    return () => (
      <div ref={elementRef} data-grid-item-idx={props.idx}>
        {slots.default?.()}
      </div>
    )
  }
})
```

## 实际渲染结果

当运行 Vue3 组件时，会渲染出以下HTML结构：

```html
<!-- 外层容器 -->
<div style="padding: 20px;">
  <h2>Vue3 瀑布流组件示例</h2>
  
  <!-- 瀑布流容器 -->
  <div style="position: relative; width: 100%;">
    
    <!-- 第一个瀑布流项目 -->
    <div 
      class="Masonry__Item Masonry__Item__Mounted"
      data-grid-item="true"
      role="listitem"
      style="
        top: 0;
        left: 0;
        transform: translateX(0px) translateY(0px);
        -webkit-transform: translateX(0px) translateY(0px);
        width: 236px;
        height: 200px;
      "
    >
      <!-- GridItemWrapper -->
      <div data-grid-item-idx="0">
        <!-- 用户自定义内容 -->
        <div style="
          padding: 16px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 8px;
        ">
          <h3>项目 1</h3>
          <p>内容 1</p>
          <p>高度: 200px</p>
        </div>
      </div>
    </div>

    <!-- 第二个瀑布流项目 -->
    <div 
      class="Masonry__Item Masonry__Item__Mounted"
      data-grid-item="true"
      role="listitem"
      style="
        top: 0;
        left: 0;
        transform: translateX(250px) translateY(180px);
        -webkit-transform: translateX(250px) translateY(180px);
        width: 236px;
        height: 150px;
      "
    >
      <div data-grid-item-idx="1">
        <div style="
          padding: 16px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 8px;
        ">
          <h3>项目 2</h3>
          <p>内容 2</p>
          <p>高度: 150px</p>
        </div>
      </div>
    </div>

    <!-- 第三个瀑布流项目 -->
    <div 
      class="Masonry__Item Masonry__Item__Mounted"
      data-grid-item="true"
      role="listitem"
      style="
        top: 0;
        left: 0;
        transform: translateX(500px) translateY(360px);
        -webkit-transform: translateX(500px) translateY(360px);
        width: 236px;
        height: 300px;
      "
    >
      <div data-grid-item-idx="2">
        <div style="
          padding: 16px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 8px;
        ">
          <h3>项目 3</h3>
          <p>内容 3</p>
          <p>高度: 300px</p>
        </div>
      </div>
    </div>
    
  </div>
</div>
```

## 视觉效果说明

**瀑布流布局特点：**

1. **定位方式**: 使用 `transform: translateX() translateY()` 进行绝对定位
2. **响应式支持**: 支持 RTL (从右到左) 布局
3. **性能优化**: 使用 transform 而非 top/left 提升性能
4. **ResizeObserver**: 监听元素尺寸变化，动态调整布局

**实际显示效果：**
```
┌─────────────────────────────────────────────────┐
│  Vue3 瀑布流组件示例                              │
│                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │ 项目 1  │    │ 项目 2  │    │ 项目 3  │     │
│  │ 内容 1  │    │ 内容 2  │    │ 内容 3  │     │
│  │200px高  │    │150px高  │    │300px高  │     │
│  └─────────┘    └─────────┘    └─────────┘     │
│      ↑              ↑              ↑           │
│   (0,0)         (250,180)     (500,360)        │
└─────────────────────────────────────────────────┘
```

## 主要转换差异总结

| React | Vue3 |
|-------|------|
| `useRef` | `ref()` |
| `useLayoutEffect` | `onMounted/onUnmounted` |
| `className` | `class` |
| `React.Children.only` | `slots.default?.()` |
| `jsx()` | TSX语法 `<div></div>` |
| Props传递 | `props.*` + 类型定义 | 