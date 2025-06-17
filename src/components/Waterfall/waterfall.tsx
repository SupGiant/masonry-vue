import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  onUpdated,
  ref,
  type VNode,
  watch,
  compile,
  computed,
} from 'vue'

// 缓存
class MeasurementStore {
  private map: WeakMap<object, any>
  constructor() {
    this.map = new WeakMap()
  }
  get(key: object) {
    return this.map.get(key)
  }
  set(key: object, value: any) {
    this.map.set(key, value)
  }
  has(key: object) {
    return this.map.has(key)
  }
  reset() {
    this.map = new WeakMap()
  }
}

export function createMeasurementStore(): MeasurementStore {
  return new MeasurementStore()
}

export interface WaterfallProps {
  // 基础配置
  items: any[] // 数据源
  columnWidth?: number // 最低列宽，默认236
  minCols?: number // 最小列数，默认3
  maxCols?: number
  gutterWidth?: number // 列间距，默认14
  align?: 'start' | 'center' | 'end' // 对齐方式，默认center

  // 布局类型
  layout?:
    | 'basic'
    | 'basicCentered'
    | 'flexible'
    | 'serverRenderedFlexible'
    | 'uniformRow'
    | 'uniformRowFlexible'

  // 渲染函数
  renderItem: (props: {
    data: any
    itemIdx: number
    isMeasuring: boolean // 是否正在测量
  }) => VNode

  // 滚动和虚拟化配置
  virtualize?: boolean | ((item: any) => boolean)
  virtualBoundsTop?: number // 虚拟化顶部边界
  virtualBoundsBottom?: number // 虚拟化底部边界
  virtualBufferFactor?: number // 虚拟化缓冲因子，默认0.7

  // 缓存
  measurementStore?: MeasurementStore // 测量缓存
  positionStore?: MeasurementStore // 位置缓存

  // 高级配置
  _dynamicHeights?: boolean // 是否开启动态测量高度

  // 滚动容器
  scrollContainer: () => HTMLElement | Window

  // 加载更多
  loadItems?: (params: { from: number }) => void

  // 内部配置函数
  _getColumnSpanConfig?: (item: any) => number | { [key: string]: number }
  _getResponsiveModuleConfigForSecondItem?: (
    item: any,
  ) => number | { min: number; max: number } | undefined
  _getModulePositioningConfig?: (
    columnCount: number,
    columnSpan: number,
  ) => { itemsBatchSize?: number; whitespaceThreshold?: number; iterationsLimit?: number }
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
  _enableSectioningPosition?: boolean
}

// 位置信息
interface Position {
  top: number
  left: number
  width: number
  height: number
}

// 基础的函数

/**
 * 获取元素
 * @param e 元素或者函数
 * @returns 元素
 */
function getElement(e: () => HTMLElement | Window) {
  return typeof e === 'function' ? e() : e
}

// 防抖
function debounce<F extends (...args: any[]) => void>(fn: F, delay = 100) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const wrapped = (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }
  // 用于对齐原 Masonry 实现的 clearTimeout 接口
  wrapped.clearTimeout = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped as F & { clearTimeout: () => void }
}

// 节流（时间戳 + 定时器双保险实现，保持与原逻辑等价）
function throttle<F extends (...args: any[]) => void>(fn: F, interval = 100) {
  let last: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const wrapped = (...args: Parameters<F>) => {
    const now = Date.now()
    if (last !== undefined && now - last < interval) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(
        () => {
          last = now
          fn(...args)
        },
        interval - (now - last),
      )
    } else {
      last = now
      fn(...args)
    }
  }
  wrapped.clearTimeout = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped as F & { clearTimeout: () => void }
}

function getElementHeight(e: HTMLElement | Window) {
  return e instanceof Window ? window.innerHeight : e.clientHeight
}

function getScollTop() {
  return void 0 !== window.scrollY
    ? window.scrollY
    : document.documentElement && void 0 !== document.documentElement.scrollTop
      ? document.documentElement.scrollTop
      : 0
}
function getScrollOffset(e: HTMLElement | Window) {
  return e === window || e instanceof Window
    ? getScollTop()
    : e.scrollTop - e.getBoundingClientRect().top
}

// 滚动容器
const scrollContainer = defineComponent({
  name: 'ScrollContainer',
  emits: ['scroll'],
  setup(props: WaterfallProps, { emit, slots }) {
    const scrollContainer = ref()

    const handleScroll = (event: Event) => {
      emit('scroll', event)
    }
    onMounted(() => {
      const element = getElement(props.scrollContainer)
      if (element) {
        updateScrollContainer(element)
      }
    })

    onUpdated(() => {
      const element = getElement(props.scrollContainer)
      if (element && scrollContainer.value !== element) {
        updateScrollContainer(element)
      }
    })

    onBeforeUnmount(() => {
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll)
      }
    })

    function updateScrollContainer(element: HTMLElement | Window) {
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll)
      }
      scrollContainer.value = element
      scrollContainer.value.addEventListener('scroll', handleScroll)
    }

    return () => slots.default?.()
  },
})

const validateNumber = (num: number) => {
  if (num) return num !== 1 / 0 ? num : undefined
}

const ResizeObserverWrapper = defineComponent({
  name: 'ResizeObserverWrapper',
  props: {
    idx: { type: Number, required: true },
    resizeObserver: Object as PropType<ResizeObserver | undefined>,
  },
  setup(props, { slots }) {
    const elRef = ref<HTMLElement | null>(null)

    onMounted(() => {
      if (props.resizeObserver && elRef.value) {
        props.resizeObserver.observe(elRef.value)
      }
    })
    onBeforeUnmount(() => {
      if (props.resizeObserver && elRef.value) {
        props.resizeObserver.unobserve(elRef.value)
      }
    })

    return () => (
      <div ref={elRef} data-grid-item-idx={props.idx}>
        {slots.default?.()}
      </div>
    )
  },
})

// todo 更新项目高度，检测变化
const updateItemHeight = (_options: any): boolean => {
  return false
}

// 判断是否是灵活布局
const isFlexibleLayout = ({ layout, width }: { layout: string; width: number }) => {
  return 'flexible' === layout || ('serverRenderedFlexible' === layout && null !== width)
}

// 获取合适的布局算法
const createPositioner = ({
  align,
  columnWidth,
  gutter,
  items,
  layout,
  measurementStore,
  minCols,
  positionStore,
  width,
  _getColumnSpanConfig,
  _getResponsiveModuleConfigForSecondItem,
  _logTwoColWhitespace,
  _getModulePositioningConfig,
  _enableSectioningPosition,
}) => {
  return isFlexibleLayout({
    layout,
    width,
  })
    ? // 是灵活布局
      layout.startsWith('uniformRow')
      ? // 是均匀布局
        createUniformRowPositioner({
          cahce: measurementStore,
          columnWidth,
          gutter,
          flexible: 'uniformRowFlexible' === layout,
          minCols,
          width,
        })
      : // 是基本布局
        createMasonryPositioner({
          align,
          measurementCache: measurementStore,
          positionCache: positionStore,
          columnWidth,
          gutter,
          layout,
          logWhitespace: _logTwoColWhitespace,
          minCols,
          rawItemCount: items.length,
          width,
          originalItems: items,
          _getColumnSpanConfig,
          _getResponsiveModuleConfigForSecondItem,
          _getModulePositioningConfig,
          _enableSectioningPosition,
        })
    : createFlexiblePositioner({
        gutter,
        measurementCache: measurementStore,
        positionCache: positionStore,
        minCols,
        idealColumnWidth: columnWidth,
        width,
        originalItems: items,
        logWhitespace: _logTwoColWhitespace,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
      })
}

const createUniformRowPositioner = ({}) => {
  return null
}

// 导出默认的组件
export default defineComponent({
  name: 'VirtualWaterfall',
  emits: ['scroll'],
  props: {
    scrollContainer: {
      type: Function,
      required: true,
      default: () => window,
    },
    virtualBufferFactor: {
      type: Number,
      default: 0.7,
    },
    virtualize: {
      type: Boolean,
      default: false,
    },
    measurementStore: {
      type: Object,
      default: () => createMeasurementStore(),
    },
    positionStore: {
      type: Object,
      default: () => createMeasurementStore(),
    },
    layout: {
      type: String,
      default: 'basic',
    },
    gutterWidth: {
      type: Number,
      default: 14,
    },
  },
  components: {
    ResizeObserverWrapper,
  },
  setup(props: WaterfallProps, { emit }) {
    // 基础信息
    const maxHeight = ref(0) //最大高度
    const width = ref(0) // 宽度
    const scrollTop = ref(0) // 滚动位置
    const containerHeight = ref(0) // 容器高度
    const containerOffset = ref(0) // 容器偏移量

    // 滚动窗口
    const scrollContainerRef = ref<HTMLElement>()
    const gridWrapper = ref<HTMLElement>() //卡片的包装

    const items = ref(props.items)
    const gutter = ref(props.gutterWidth)

    // 是否还有没有测量的
    const hasPendingMeasurements = computed(() => {
      return props.items.some((e) => !!e && !measurementStore.has(e))
    })

    // 监听窗口大小变化
    const handleResize = debounce(() => {
      if (gridWrapper.value) {
        width.value = gridWrapper.value.getBoundingClientRect().width
      }
    }, 300)

    // 更新滚动位置信息
    const updateScrollPosition = throttle(() => {
      if (scrollContainerRef.value) {
        scrollTop.value = scrollContainerRef.value.scrollTop
      }
    })

    // 测量容器
    const measureContainer = () => {
      if (scrollContainerRef.value) {
        containerHeight.value = getElementHeight(scrollContainerRef.value)
        // 如果有布局包裹器
        if (gridWrapper.value instanceof HTMLElement) {
          const offsetHeight = getScrollOffset(gridWrapper.value)
          containerOffset.value = gridWrapper.value.getBoundingClientRect().top + offsetHeight
        }
      }
    }

    // 增加防抖的作用是允许异步
    const measureContainerAsync = debounce(() => {
      measureContainer()
    }, 0)

    // 首先，获取相对应的缓存
    const measurementStore = props.measurementStore || createMeasurementStore()
    const positionStore = props.positionStore || createMeasurementStore()

    // 关键函数之一
    /**
     *
     * @param item 数据
     * @param index 索引
     * @param position 位置信息
     */
    const renderMasonryComponent = (item: any, index: number, position: Position) => {
      let isVisible = false
      const {
        renderItem, // 渲染函数
        scrollContainer, // 滚动容器
        virtualize, // 是否虚拟化
        virtualBoundsTop, // 虚拟化顶部边界
        virtualBoundsBottom, // 虚拟化底部边界
        virtualBufferFactor = 0.7, // 虚拟化缓冲因子, 默认等于0.7
      } = props

      const { top, left, width, height } = position

      if (getElement(scrollContainer) && virtualize) {
        // 虚拟化缓冲因子
        const buffer = containerHeight.value * virtualBufferFactor // 缓冲因子
        const offset = scrollTop.value - containerOffset.value // 滚动位置
        const topBoundary = virtualBoundsTop ? offset - virtualBoundsTop : offset - buffer // 顶部边界
        const bottomBoundary = virtualBoundsBottom
          ? offset + containerHeight.value + virtualBoundsBottom
          : offset + containerHeight.value + buffer // 底部边界

        isVisible = !(position.top + position.height < topBoundary || position.top > bottomBoundary) // 是否可见
      } else {
        isVisible = true
      }

      // 是否是rtl 从右到左
      const isRtl = (null == document ? void 0 : document.dir) === 'rtl'

      // 关键对象之一

      const resizeObserver =
        props._dynamicHeights && 'undefined' != typeof window && positionStore
          ? new ResizeObserver((entries: ResizeObserverEntry[]) => {
              let isChanged = false
              entries.forEach(({ target: e, contentRect: a }) => {
                const idx = e.getAttribute('data-grid-item-idx')
                if ('number' == typeof idx) {
                  const item = items.value[idx]
                  const t = a.height
                  isChanged =
                    updateItemHeight({
                      items: items.value,
                      changedItem: item,
                      newHeight: t,
                      positionStore,
                      measurementStore,
                    }) || isChanged
                }
              })
              if (isChanged) {
                // todo 强制更新！！
              }
            })
          : undefined

      const masonryItem = () => (
        <div
          key={`item-${index}`}
          class={'Masonry__Item Masonry__Item__Mounted'}
          data-grid-item={true}
          role="listitem"
          style={Object.assign(
            Object.assign(
              {
                top: 0,
              },
              isRtl
                ? {
                    right: 0,
                  }
                : {
                    left: 0,
                  },
            ),
            {
              transform: `translateX(${isRtl ? -1 * left : left}px) translateY(${top}px)`,
              WebkitTransform: `translateX(${isRtl ? -1 * left : left}px) translateY(${top}px)`,
              width: validateNumber(width),
              height: validateNumber(height),
            },
          )}
        >
          <ResizeObserverWrapper idx={index} resizeObserver={resizeObserver}>
            {renderItem({
              data: item,
              itemIdx: index,
              isMeasuring: false,
            })}
          </ResizeObserverWrapper>
        </div>
      )

      return () => {
        if (virtualize) {
          // 如果虚拟化了，则需要判断是否是可是范围内，才显示，否则不显示
          if (isVisible) {
            return masonryItem()
          }
          return null
        } else {
          // 如果不是虚拟化，则都显示
          return masonryItem()
        }
      }
    }

    const reflow = () => {
      measurementStore.reset()
      positionStore.reset()
      measureContainer()
      // todo 强制更新当前组件‘
    }

    // watch props，如果发生变化了，更改当前的测量状态
    watch(props, () => {
      console.log('需要更新状态')
    })

    // 渲染函数
    return () => {
      let element // 元素

      const {
        align = 'center',
        columnWidth,
        items,
        layout = 'basic',
        minCols,
        renderItem,
        scrollContainer,
        _logTwoColWhitespace,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
      } = props

      // 获取合适的布局算法
      const positioner = createPositioner({
        align,
        columnWidth,
        gutter: gutter.value || 14,
        items,
        layout,
        measurementStore,
        positionStore,
        minCols,
        width: width.value,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
        _logTwoColWhitespace,
      })

      return <div>Waterfall</div>
    }
  },
})
