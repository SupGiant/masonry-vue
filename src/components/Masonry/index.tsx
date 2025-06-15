import {
  defineComponent,
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick
} from 'vue'
import type { PropType, CSSProperties } from 'vue'

// 位置信息接口
export interface Position {
  top: number
  left: number
  width: number
  height: number
}

// 瀑布流项目接口
export interface MasonryItem {
  id: string | number
  [key: string]: any
}

// 测量缓存接口
export interface MeasurementCache {
  get(item: MasonryItem): number | undefined
  has(item: MasonryItem): boolean
  set(item: MasonryItem, height: number): void
  reset(): void
}

// 位置缓存接口
export interface PositionCache {
  get(item: MasonryItem): Position | undefined
  has(item: MasonryItem): boolean
  set(item: MasonryItem, position: Position): void
  reset(): void
}

// 布局模式类型
export type LayoutMode = 'basic' | 'basicCentered' | 'flexible' | 'serverRenderedFlexible' | 'uniformRow' | 'uniformRowFlexible'

// 对齐方式类型
export type AlignType = 'start' | 'center' | 'end'

// 组件Props接口
export interface MasonryProps {
  items: MasonryItem[]
  renderItem: (params: { data: MasonryItem; itemIdx: number; isMeasuring: boolean }) => any
  columnWidth?: number
  gutter?: number
  minCols?: number
  align?: AlignType
  layout?: LayoutMode
  virtualize?: boolean | ((item: MasonryItem) => boolean)
  virtualBufferFactor?: number
  virtualBoundsTop?: number
  virtualBoundsBottom?: number
  loadItems?: (params: { from: number }) => void
  measurementStore?: MeasurementCache
  positionStore?: PositionCache
  _dynamicHeights?: boolean
  _getColumnSpanConfig?: (item: MasonryItem) => number | object
  _getResponsiveModuleConfigForSecondItem?: (item: MasonryItem) => number | { min: number; max: number }
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => { itemsBatchSize?: number; whitespaceThreshold?: number; iterationsLimit?: number }
  _enableSectioningPosition?: boolean
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
}

// 测量存储类实现
export class MeasurementStore implements MeasurementCache {
  private map = new WeakMap<MasonryItem, number>()

  get(item: MasonryItem): number | undefined {
    return this.map.get(item)
  }

  has(item: MasonryItem): boolean {
    return this.map.has(item)
  }

  set(item: MasonryItem, height: number): void {
    this.map.set(item, height)
  }

  reset(): void {
    this.map = new WeakMap<MasonryItem, number>()
  }
}

// 位置存储类实现
export class PositionStore implements PositionCache {
  private map = new WeakMap<MasonryItem, Position>()

  get(item: MasonryItem): Position | undefined {
    return this.map.get(item)
  }

  has(item: MasonryItem): boolean {
    return this.map.has(item)
  }

  set(item: MasonryItem, position: Position): void {
    this.map.set(item, position)
  }

  reset(): void {
    this.map = new WeakMap<MasonryItem, Position>()
  }
}

// 工具函数
/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 100): T & { clearTimeout: () => void } {
  let timeoutId: number | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, delay)
  }) as T & { clearTimeout: () => void }

  debounced.clearTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId)
  }

  return debounced
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 节流间隔（毫秒）
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number = 100): T & { clearTimeout: () => void } {
  let lastTime: number | undefined
  let timeoutId: number | null = null

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now()
    if (lastTime !== undefined && now - lastTime < delay) {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        lastTime = now
        fn(...args)
      }, delay - (now - (lastTime ?? 0)))
    } else {
      lastTime = now
      fn(...args)
    }
  }) as T & { clearTimeout: () => void }

  throttled.clearTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId)
  }

  return throttled
}

/**
 * 计算列数
 * @param params 计算参数
 */
export function getColumnCount(params: {
  gutter: number
  columnWidth: number
  width: number
  minCols: number
}): number {
  const { gutter, columnWidth, width, minCols } = params
  return Math.max(Math.floor(width / (columnWidth + gutter)), minCols)
}

/**
 * 找到最短列的索引
 * @param heights 各列高度数组
 */
export function getShortestColumnIndex(heights: number[]): number {
  return heights.length ? heights.indexOf(Math.min(...heights)) : 0
}

/**
 * 获取滚动位置
 * @param element 滚动容器元素
 */
export function getScrollTop(element: Element | Window): number {
  if (element === window || element instanceof Window) {
    return window.scrollY !== undefined
      ? window.scrollY
      : document.documentElement?.scrollTop ?? 0
  }
  return (element as Element).scrollTop
}

/**
 * 获取容器高度
 * @param element 容器元素
 */
export function getContainerHeight(element: Element | Window): number {
  return element instanceof Window ? window.innerHeight : (element as Element).clientHeight
}

/**
 * 计算中心偏移量
 * @param params 计算参数
 */
export function getCenterOffset(params: {
  align: AlignType
  columnCount: number
  columnWidthAndGutter: number
  gutter: number
  layout: LayoutMode
  rawItemCount: number
  width: number
}): number {
  const { align, columnCount, columnWidthAndGutter, gutter, layout, rawItemCount, width } = params

  if (layout === 'basicCentered') {
    return Math.max(Math.floor((width - (Math.min(rawItemCount, columnCount) * columnWidthAndGutter + gutter)) / 2), 0)
  }

  if (align === 'center') {
    return Math.max(Math.floor((width - columnWidthAndGutter * columnCount + gutter) / 2), 0)
  }

  if (align === 'end') {
    return width - (columnWidthAndGutter * columnCount - gutter)
  }

  return 0
}

/**
 * 格式化尺寸值
 * @param value 尺寸值
 */
export function formatSize(value: number): number | undefined {
  return value && value !== Infinity ? value : undefined
}

/**
 * 创建默认位置对象
 * @param width 宽度
 * @param height 高度
 */
export function createDefaultPosition(width: number = 236, height: number = Infinity): Position {
  return {
    top: -9999,
    left: -9999,
    width,
    height
  }
}

// 布局算法接口
interface LayoutParams {
  align: AlignType
  columnWidth: number
  gutter: number
  items: MasonryItem[]
  layout: LayoutMode
  measurementStore: MeasurementCache
  minCols: number
  positionStore: PositionCache
  width: number
  _getColumnSpanConfig?: (item: MasonryItem) => number | object
  _getResponsiveModuleConfigForSecondItem?: (item: MasonryItem) => number | { min: number; max: number }
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => { itemsBatchSize?: number; whitespaceThreshold?: number; iterationsLimit?: number }
  _enableSectioningPosition?: boolean
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
}

interface BasicLayoutResult {
  items: MasonryItem[]
  heights: number[]
}

/**
 * 基础瀑布流布局算法
 * @param params 布局参数
 */
export function createBasicLayout(params: LayoutParams) {
  const {
    align = 'center',
    columnWidth = 236,
    gutter = 14,
    layout = 'basic',
    minCols = 2,
    measurementStore,
    positionStore,
    width
  } = params

  return function calculateLayout(items: MasonryItem[]): Position[] {
    if (!width) {
      return items.map(() => createDefaultPosition(columnWidth))
    }

    const columnWidthAndGutter = columnWidth + gutter
    const columnCount = getColumnCount({
      gutter,
      columnWidth,
      width,
      minCols
    })

    // 初始化各列高度
    const heights = Array(columnCount).fill(0)

    // 计算中心偏移量
    const centerOffset = getCenterOffset({
      align,
      columnCount,
      columnWidthAndGutter,
      gutter,
      layout,
      rawItemCount: items.length,
      width
    })

    return items.map(item => {
      const itemHeight = measurementStore.get(item)

      if (itemHeight == null) {
        return createDefaultPosition(columnWidth)
      }

      // 找到最短列
      const shortestColumnIndex = getShortestColumnIndex(heights)
      const top = heights[shortestColumnIndex]
      const left = shortestColumnIndex * columnWidthAndGutter + centerOffset

      // 更新列高度
      const heightWithGutter = itemHeight > 0 ? itemHeight + gutter : 0
      heights[shortestColumnIndex] += heightWithGutter

      const position: Position = {
        top,
        left,
        width: columnWidth,
        height: itemHeight
      }

      // 缓存位置信息
      positionStore.set(item, position)

      return position
    })
  }
}

/**
 * 灵活宽度布局算法
 * @param params 布局参数
 */
export function createFlexibleLayout(params: LayoutParams) {
  const {
    gutter = 14,
    measurementStore,
    positionStore,
    minCols = 2,
    width,
    columnWidth: idealColumnWidth = 240
  } = params

  return function calculateLayout(items: MasonryItem[]): Position[] {
    if (!width) {
      return items.map(() => ({
        top: Infinity,
        left: Infinity,
        width: Infinity,
        height: Infinity
      }))
    }

    const columnCount = getColumnCount({
      gutter,
      columnWidth: idealColumnWidth,
      width,
      minCols
    })

    const actualColumnWidth = width / columnCount - gutter
    const columnWidthAndGutter = actualColumnWidth + gutter
    const centerOffset = gutter / 2

    const heights = Array(columnCount).fill(0)

    return items.reduce<Position[]>((positions, item) => {
      const itemHeight = measurementStore.get(item)

      let position: Position
      if (itemHeight == null) {
        position = {
          top: Infinity,
          left: Infinity,
          width: actualColumnWidth,
          height: Infinity
        }
      } else {
        const heightWithGutter = itemHeight > 0 ? itemHeight + gutter : 0
        const shortestColumnIndex = getShortestColumnIndex(heights)
        const top = heights[shortestColumnIndex]

        heights[shortestColumnIndex] = (heights[shortestColumnIndex] ?? 0) + heightWithGutter

        position = {
          top,
          left: shortestColumnIndex * columnWidthAndGutter + centerOffset,
          width: actualColumnWidth,
          height: itemHeight
        }
      }

      positions.push(position)
      return positions
    }, [])
  }
}

/**
 * 统一行高布局算法
 * @param params 布局参数
 */
export function createUniformRowLayout(params: LayoutParams & { flexible?: boolean }) {
  const {
    measurementStore,
    columnWidth = 236,
    flexible = false,
    gutter = 14,
    width,
    minCols = 3
  } = params

  return function calculateLayout(items: MasonryItem[]): Position[] {
    if (!width) {
      return items.map(() => createDefaultPosition(columnWidth))
    }

    const { actualColumnWidth, columnWidthAndGutter, columnCount } = (() => {
      if (flexible) {
        const count = getColumnCount({ gutter, columnWidth, width, minCols })
        const actualWidth = Math.floor(width / count) - gutter
        return {
          columnCount: count,
          actualColumnWidth: actualWidth,
          columnWidthAndGutter: actualWidth + gutter
        }
      } else {
        const columnWidthAndGutter = columnWidth + gutter
        return {
          columnCount: getColumnCount({ gutter, columnWidth, width, minCols }),
          actualColumnWidth: columnWidth,
          columnWidthAndGutter
        }
      }
    })()

    const rowHeights: number[] = []

    return items.map((item, index) => {
      const itemHeight = measurementStore.get(item)

      if (itemHeight == null) {
        return createDefaultPosition(actualColumnWidth)
      }

      const columnIndex = index % columnCount
      const rowIndex = Math.floor(index / columnCount)

      // 更新行高（取该行最高的元素）
      if (columnIndex === 0 || itemHeight > (rowHeights[rowIndex] ?? 0)) {
        rowHeights[rowIndex] = itemHeight
      }

      return {
        top: rowIndex > 0 ? rowHeights.slice(0, rowIndex).reduce((sum, height) => sum + height + gutter, 0) : 0,
        left: columnIndex * columnWidthAndGutter,
        width: actualColumnWidth,
        height: itemHeight
      }
    })
  }
}

/**
 * 布局调度器 - 根据布局模式选择合适的布局算法
 * @param params 布局参数
 */
export function createLayoutScheduler(params: LayoutParams) {
  const { layout } = params

  const isFlexible = layout === 'flexible' || layout === 'serverRenderedFlexible'

  if (isFlexible) {
    return createFlexibleLayout(params)
  }

  if (layout?.startsWith('uniformRow')) {
    return createUniformRowLayout({
      ...params,
      flexible: layout === 'uniformRowFlexible'
    })
  }

  return createBasicLayout(params)
}

/**
 * 瀑布流组件
 */
export default defineComponent({
  name: 'Masonry',
  props: {
    // 必需属性
    items: {
      type: Array as PropType<MasonryItem[]>,
      required: true,
      default: () => []
    },
    renderItem: {
      type: Function as PropType<(params: { data: MasonryItem; itemIdx: number; isMeasuring: boolean }) => any>,
      required: true
    },

    // 布局配置
    columnWidth: {
      type: Number,
      default: 236
    },
    gutter: {
      type: Number,
      default: 14
    },
    minCols: {
      type: Number,
      default: 3
    },
    align: {
      type: String as PropType<AlignType>,
      default: 'center'
    },
    layout: {
      type: String as PropType<LayoutMode>,
      default: 'basic'
    },

    // 虚拟滚动配置
    virtualize: {
      type: [Boolean, Function] as PropType<boolean | ((item: MasonryItem) => boolean)>,
      default: false
    },
    virtualBufferFactor: {
      type: Number,
      default: 0.7
    },
    virtualBoundsTop: {
      type: Number
    },
    virtualBoundsBottom: {
      type: Number
    },

    // 无限滚动
    loadItems: {
      type: Function as PropType<(params: { from: number }) => void>
    },

    // 存储实例
    measurementStore: {
      type: Object as PropType<MeasurementCache>
    },
    positionStore: {
      type: Object as PropType<PositionCache>
    },

    // 高级配置
    _dynamicHeights: {
      type: Boolean,
      default: false
    },
    _getColumnSpanConfig: {
      type: Function as PropType<(item: MasonryItem) => number | object>
    },
    _getResponsiveModuleConfigForSecondItem: {
      type: Function as PropType<(item: MasonryItem) => number | { min: number; max: number }>
    },
    _getModulePositioningConfig: {
      type: Function as PropType<(columnCount: number, columnSpan: number) => { itemsBatchSize?: number; whitespaceThreshold?: number; iterationsLimit?: number }>
    },
    _enableSectioningPosition: {
      type: Boolean,
      default: false
    },
    _logTwoColWhitespace: {
      type: Function as PropType<(whitespace: number[], iterations: number, columnSpan: number) => void>
    }
  },

  setup(props, { expose }) {
    // 响应式状态
    const state = reactive({
      width: 0,
      scrollTop: 0,
      containerHeight: 0,
      containerOffset: 0,
      maxHeight: 0,
      isFetching: false,
      hasPendingMeasurements: false
    })

    // DOM引用
    const gridWrapperRef = ref<HTMLElement>()
    const scrollContainerRef = ref<HTMLElement>()

    // 存储实例
    const measurementStore = props.measurementStore || new MeasurementStore()
    const positionStore = props.positionStore || new PositionStore()

    // ResizeObserver实例
    let resizeObserver: ResizeObserver | undefined

    // 防抖和节流函数
    const handleResize = debounce(() => {
      if (gridWrapperRef.value) {
        state.width = gridWrapperRef.value.getBoundingClientRect().width
      }
    }, 300)

    const measureContainerAsync = debounce(() => {
      measureContainer()
    }, 0)

    const updateScrollPosition = throttle(() => {
      if (!scrollContainerRef.value) return
      const element = getScrollContainerElement()
      if (element) {
        state.scrollTop = getScrollTop(element)
      }
    })

    /**
     * 获取滚动容器元素
     */
    function getScrollContainerElement(): Element | Window | null {
      if (scrollContainerRef.value) {
        return scrollContainerRef.value
      }
      return window
    }

    /**
     * 测量容器尺寸
     */
    function measureContainer() {
      const scrollElement = getScrollContainerElement()
      if (scrollElement) {
        state.containerHeight = getContainerHeight(scrollElement)

        if (gridWrapperRef.value instanceof HTMLElement && scrollElement !== window) {
          const scrollTop = getScrollTop(scrollElement as Element)
          state.containerOffset = gridWrapperRef.value.getBoundingClientRect().top + scrollTop
        }
      }
    }

    /**
     * 创建布局计算函数
     */
    const layoutCalculator = computed(() => {
      return createLayoutScheduler({
        align: props.align,
        columnWidth: props.columnWidth,
        gutter: props.gutter,
        items: props.items,
        layout: props.layout,
        measurementStore,
        minCols: props.minCols,
        positionStore,
        width: state.width,
        _getColumnSpanConfig: props._getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem: props._getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig: props._getModulePositioningConfig,
        _enableSectioningPosition: props._enableSectioningPosition,
        _logTwoColWhitespace: props._logTwoColWhitespace
      })
    })

    /**
     * 计算已经测量的项目
     */
    const measuredItems = computed(() => {
      return props.items.filter(item => item && measurementStore.has(item))
    })

    /**
     * 计算未测量的项目
     */
    const unmeasuredItems = computed(() => {
      return props.items.filter(item => !measurementStore.has(item))
    })

    /**
     * 计算项目位置
     */
    const itemPositions = computed(() => {
      const calculator = layoutCalculator.value
      const measured = measuredItems.value
      const unmeasured = unmeasuredItems.value.slice(0, props.minCols)

      const measuredPositions = calculator(measured)
      const unmeasuredPositions = calculator(unmeasured)

      // 计算最大高度
      if (measuredPositions.length > 0) {
        const maxHeight = Math.max(
          ...measuredPositions.map(pos => pos.top + pos.height),
          unmeasured.length === 0 ? 0 : state.maxHeight
        )
        if (maxHeight !== state.maxHeight) {
          state.maxHeight = maxHeight
        }
      }

      return {
        measured: measuredPositions,
        unmeasured: unmeasuredPositions
      }
    })

    /**
     * 检查元素是否在可视区域内（虚拟滚动）
     */
    function isItemVisible(position: Position): boolean {
      if (!props.virtualize || !props.virtualBufferFactor) {
        return true
      }

      const bufferHeight = state.containerHeight * props.virtualBufferFactor
      const scrollTop = state.scrollTop - state.containerOffset
      const viewportBottom = props.virtualBoundsBottom
        ? scrollTop + state.containerHeight + props.virtualBoundsBottom
        : scrollTop + state.containerHeight + bufferHeight
      const viewportTop = props.virtualBoundsTop
        ? scrollTop - props.virtualBoundsTop
        : scrollTop - bufferHeight

      return !(position.top + position.height < viewportTop || position.top > viewportBottom)
    }

    /**
     * 渲染瀑布流项目
     */
    function renderMasonryItem(item: MasonryItem, index: number, position: Position, isMeasuring: boolean = false) {
      const shouldVirtualize = typeof props.virtualize === 'function' ? props.virtualize(item) : props.virtualize
      const isVisible = shouldVirtualize ? isItemVisible(position) : true

      const isRTL = document.dir === 'rtl'

      const itemStyle: CSSProperties = {
        position: 'absolute',
        top: 0,
        [isRTL ? 'right' : 'left']: 0,
        transform: `translateX(${isRTL ? -position.left : position.left}px) translateY(${position.top}px)`,
        WebkitTransform: `translateX(${isRTL ? -position.left : position.left}px) translateY(${position.top}px)`,
        width: formatSize(position.width) + 'px',
        height: formatSize(position.height) + 'px',
        visibility: isMeasuring ? 'hidden' : 'visible'
      }

      const content = props.renderItem({
        data: item,
        itemIdx: index,
        isMeasuring
      })

      return shouldVirtualize && !isVisible ? null : (
        <div
          key={`item-${index}`}
          class="masonry-item"
          data-grid-item="true"
          data-grid-item-idx={index}
          role="listitem"
          style={itemStyle}
                     ref={(el: any) => {
             // 处理高度测量
             if (el && isMeasuring) {
               measurementStore.set(item, (el as HTMLElement).clientHeight)
             }
           }}
        >
          {content}
        </div>
      )
    }

    /**
     * 获取更多数据
     */
    function fetchMore() {
      if (!props.loadItems || state.isFetching) return

      state.isFetching = true
      props.loadItems({ from: props.items.length })
    }

    /**
     * 检查是否需要加载更多数据
     */
    function checkLoadMore() {
      if (state.isFetching || !props.loadItems) return

      const scrollTop = state.scrollTop
      const triggerHeight = state.maxHeight + state.containerOffset - 3 * state.containerHeight

      if (scrollTop > triggerHeight) {
        fetchMore()
      }
    }

    /**
     * 重新布局
     */
    function reflow() {
      measurementStore.reset()
      positionStore.reset()
      measureContainer()
    }

    // 监听器
    watch(() => props.items, (newItems, oldItems) => {
      // 检查是否有新的未测量项目
      const hasPendingMeasurements = newItems.some(item => !!item && !measurementStore.has(item))
      state.hasPendingMeasurements = hasPendingMeasurements

      // 重置获取状态
      if (newItems.length !== oldItems?.length) {
        state.isFetching = false
      }
    }, { deep: true })

    watch(() => state.width, (newWidth, oldWidth) => {
      if (oldWidth != null && newWidth !== oldWidth) {
        measurementStore.reset()
        positionStore.reset()
      }
    })

    watch(() => state.scrollTop, () => {
      checkLoadMore()
    })

    // 生命周期
    onMounted(() => {
      // 设置ResizeObserver
      if (props._dynamicHeights && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          let shouldUpdate = false
          entries.forEach(({ target, contentRect }) => {
            const index = Number(target.getAttribute('data-grid-item-idx'))
            if (typeof index === 'number' && index >= 0) {
              const item = props.items[index]
              const newHeight = contentRect.height

              if (item && measurementStore.get(item) !== newHeight) {
                measurementStore.set(item, newHeight)
                shouldUpdate = true
              }
            }
          })

          if (shouldUpdate) {
            // 触发重新计算
            nextTick()
          }
        })
      }

      // 监听窗口大小变化
      window.addEventListener('resize', handleResize)

      // 初始测量
      measureContainer()

      // 设置初始宽度和滚动位置
      nextTick(() => {
        if (gridWrapperRef.value) {
          state.width = gridWrapperRef.value.getBoundingClientRect().width
        }

        const scrollElement = getScrollContainerElement()
        if (scrollElement) {
          state.scrollTop = getScrollTop(scrollElement)
        }
      })
    })

    onUnmounted(() => {
      // 清理
      if (resizeObserver) {
        resizeObserver.disconnect()
      }

      window.removeEventListener('resize', handleResize)
      handleResize.clearTimeout()
      measureContainerAsync.clearTimeout()
      updateScrollPosition.clearTimeout()
    })

    // 暴露方法
    expose({
      reflow,
      measureContainer
    })

    return {
      gridWrapperRef,
      scrollContainerRef,
      state,
      itemPositions,
      renderMasonryItem,
      updateScrollPosition
    }
  },

    render() {
    const { state, itemPositions, renderMasonryItem } = this
    const { measured, unmeasured } = itemPositions

    // 如果没有宽度且有待测量项目，渲染测量模式
    if (!state.width && state.hasPendingMeasurements) {
      return (
        <div
          ref="gridWrapperRef"
          class="masonry-container"
          role="list"
          style={{
            height: 0,
            width: '100%'
          }}
        >
          {this.$props.items.filter(Boolean).map((item: MasonryItem, index: number) => {
            const columnSpan = this.$props._getColumnSpanConfig?.(item) ?? 1

            return (
              <div
                key={index}
                ref={(el: any) => {
                  if (el && this.$props.layout !== 'flexible') {
                    this.measurementStore.set(item, (el as HTMLElement).clientHeight)
                  }
                }}
                class="masonry-item-static"
                data-column-span={typeof columnSpan === 'number' ? columnSpan : btoa(JSON.stringify(columnSpan))}
                data-grid-item="true"
                role="listitem"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: 'translateX(0px) translateY(0px)',
                  WebkitTransform: 'translateX(0px) translateY(0px)',
                  width: this.$props.layout === 'flexible' || this.$props.layout === 'serverRenderedFlexible' || typeof columnSpan === 'object'
                    ? undefined
                    : formatSize(typeof columnSpan === 'number' && this.$props.columnWidth && this.$props.gutter
                        ? this.$props.columnWidth * columnSpan + this.$props.gutter * (columnSpan - 1)
                        : this.$props.columnWidth) + 'px'
                }}
              >
                {this.$props.renderItem({
                  data: item,
                  itemIdx: index,
                  isMeasuring: false
                })}
              </div>
            )
          })}
        </div>
      )
    }

    // 如果没有宽度，渲染空容器
    if (!state.width) {
      return (
        <div
          ref="gridWrapperRef"
          style={{ width: '100%' }}
        />
      )
    }

    // 正常渲染模式
    return (
      <div
        ref="gridWrapperRef"
        style={{ width: '100%' }}
        onScroll={this.updateScrollPosition}
      >
        <div
          class="masonry-grid"
          role="list"
          style={{
            height: state.maxHeight + 'px',
            width: state.width + 'px'
          }}
        >
          {/* 渲染已测量的项目 */}
          {this.$props.items.filter((item: MasonryItem) => this.measurementStore.has(item)).map((item: MasonryItem, index: number) => {
            const position = this.positionStore.get(item) ?? measured[index]
            return position ? renderMasonryItem(item, index, position) : null
          })}

                    {/* 渲染未测量的项目（用于测量） */}
          {unmeasured.map((position: Position, index: number) => {
            const itemIndex = this.$props.items.length - unmeasured.length + index
            const item = this.$props.items[itemIndex]

            return (item && renderMasonryItem) ? renderMasonryItem(item, itemIndex, position, true) : null
          })}
        </div>

        {/* 无限滚动加载指示器 */}
        {this.$props.loadItems && (
          <div
            style={{
              position: 'absolute',
              top: state.maxHeight + state.containerOffset + 'px',
              left: 0,
              right: 0,
              height: '1px'
            }}
          />
        )}
      </div>
    )
  }
})
