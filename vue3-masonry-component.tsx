/** @jsxImportSource vue */
import { defineComponent, ref, onMounted, onUnmounted, type PropType } from 'vue'

// dh 组件转换为 Vue3
const GridItemWrapper = defineComponent({
  name: 'GridItemWrapper',
  props: {
    resizeObserver: {
      type: Object as PropType<ResizeObserver | undefined>,
      default: undefined
    },
    idx: {
      type: Number,
      required: true
    }
  },
  setup(props, { slots }) {
    const elementRef = ref<HTMLElement | null>(null)

    onMounted(() => {
      const element = elementRef.value
      if (props.resizeObserver && element) {
        props.resizeObserver.observe(element)
      }
    })

    onUnmounted(() => {
      const element = elementRef.value
      if (props.resizeObserver && element) {
        props.resizeObserver.unobserve(element)
      }
    })

    return () => (
      <div
        ref={elementRef}
        data-grid-item-idx={props.idx}
      >
        {slots.default?.()}
      </div>
    )
  }
})

// renderMasonryComponent 的主要渲染逻辑转换为 Vue3
const MasonryItem = defineComponent({
  name: 'MasonryItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    itemIndex: {
      type: Number,
      required: true
    },
    position: {
      type: Object as PropType<{
        top: number
        left: number
        width: number
        height: number
      }>,
      required: true
    },
    renderItem: {
      type: Function,
      required: true
    },
    resizeObserver: {
      type: Object as PropType<ResizeObserver | undefined>,
      default: undefined
    },
    isRTL: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const { top, left, width, height } = props.position

    // 辅助函数，类似原代码中的 dC
    const safePx = (value: number) => {
      return value !== Infinity ? value : undefined
    }

    return () => (
      <div
        class={['Masonry__Item', 'Masonry__Item__Mounted']}
        data-grid-item={true}
        role="listitem"
        style={{
          top: 0,
          ...(props.isRTL ? { right: 0 } : { left: 0 }),
          transform: `translateX(${props.isRTL ? -1 * left : left}px) translateY(${top}px)`,
          WebkitTransform: `translateX(${props.isRTL ? -1 * left : left}px) translateY(${top}px)`,
          width: safePx(width) + 'px',
          height: safePx(height) + 'px'
        }}
        key={`item-${props.itemIndex}`}
      >
        <GridItemWrapper
          idx={props.itemIndex}
          resizeObserver={props.resizeObserver}
        >
          {props.renderItem({
            data: props.item,
            itemIdx: props.itemIndex,
            isMeasuring: false
          })}
        </GridItemWrapper>
      </div>
    )
  }
})

// 使用示例组件
const MasonryExample = defineComponent({
  name: 'MasonryExample',
  setup() {
    // 模拟数据
    const items = [
      { id: 1, content: '内容 1', height: 200 },
      { id: 2, content: '内容 2', height: 150 },
      { id: 3, content: '内容 3', height: 300 }
    ]

    // 模拟 renderItem 函数
    const renderItem = ({ data, itemIdx, isMeasuring }: any) => (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '8px'
        }}
      >
        <h3>项目 {itemIdx + 1}</h3>
        <p>{data.content}</p>
        <p>高度: {data.height}px</p>
        {isMeasuring && <span>📏 测量中...</span>}
      </div>
    )

    // 检测RTL
    const isRTL = document?.dir === 'rtl'

    return () => (
      <div style={{ padding: '20px' }}>
        <h2>Vue3 瀑布流组件示例</h2>
        <div style={{ position: 'relative', width: '100%' }}>
          {items.map((item, index) => (
            <MasonryItem
              key={item.id}
              item={item}
              itemIndex={index}
              position={{
                top: index * 180,
                left: (index % 3) * 250,
                width: 236,
                height: item.height
              }}
              renderItem={renderItem}
              isRTL={isRTL}
            />
          ))}
        </div>
      </div>
    )
  }
})

export { GridItemWrapper, MasonryItem, MasonryExample }
export default MasonryExample
