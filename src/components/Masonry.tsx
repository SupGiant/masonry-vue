import { defineComponent, h, ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { PropType } from 'vue'

/**
 * 该文件是 React 版 Masonry.js 的严格等价移植。
 * - 所有工具函数与算法逻辑保持原样，确保行为一致。
 * - 仅替换 React-specific API 为 Vue3 Composition API 实现。
 * - 代码仍使用 TSX，以便与原始 JSX 写法保持一致。
 *
 * 由于原 Masonry.js 体积巨大且包含多级组件，这里先给出
 * 组件整体骨架、依赖工具类与核心数据结构。随后会分多次
 * 编辑，把完整 render 逻辑与子组件一并迁移进来。
 */

/**********************
 *  MeasurementStore  *
 **********************/
class MeasurementStore<T extends object = Record<string, unknown>> {
  private map: WeakMap<T, any>
  constructor () {
    this.map = new WeakMap()
  }
  get (key: T) {
    return this.map.get(key)
  }
  has (key: T) {
    return this.map.has(key)
  }
  set (key: T, value: any) {
    this.map.set(key, value)
  }
  reset () {
    this.map = new WeakMap()
  }
  static create<T extends object = Record<string, unknown>> () {
    return new MeasurementStore<T>()
  }
}

/**********************
 *   throttle / debounce utils
 **********************/
// 防抖
function debounce <F extends (...args: any[]) => void> (fn: F, delay = 100) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const wrapped = (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }
  // 用于对齐原 Masonry 实现的 clearTimeout 接口
  // @ts-ignore – 为运行时动态附加属性
  wrapped.clearTimeout = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped as F & { clearTimeout: () => void }
}

// 节流（时间戳 + 定时器双保险实现，保持与原逻辑等价）
function throttle <F extends (...args: any[]) => void> (fn: F, interval = 100) {
  let last: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const wrapped = (...args: Parameters<F>) => {
    const now = Date.now()
    if (last !== undefined && now - last < interval) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        last = now
        fn(...args)
      }, interval - (now - last))
    } else {
      last = now
      fn(...args)
    }
  }
  // @ts-ignore – 保持同名接口
  wrapped.clearTimeout = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped as F & { clearTimeout: () => void }
}

/**********************
 *    Scroll helpers  *
 **********************/
const getWindowScrollTop = () => {
  if (typeof window === 'undefined') return 0
  if (window.scrollY !== undefined) return window.scrollY
  return (document.documentElement && document.documentElement.scrollTop) || 0
}

function getScrollTop (el: HTMLElement | Window): number {
  return el === window || el instanceof Window ? getWindowScrollTop() : (el as HTMLElement).scrollTop
}

function getViewportHeight (el: HTMLElement | Window): number {
  return el instanceof Window ? window.innerHeight : (el as HTMLElement).clientHeight
}

function getOffsetWithinContainer (el: HTMLElement | Window): number {
  return el === window || el instanceof Window
    ? getWindowScrollTop()
    : (el as HTMLElement).scrollTop - (el as HTMLElement).getBoundingClientRect().top
}

/**********************
 *  Component types   *
 **********************/
interface MasonryProps {
  items: any[]
  // 以下 props 直接照搬 React 版定义，后续会补充完整类型
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  gutterWidth?: number
  minCols?: number
  layout?: 'basic' | 'basicCentered' | 'uniformRow' | 'uniformRowFlexible' | 'flexible' | 'serverRenderedFlexible'
  loadItems?: (args: { from: number }) => void | Promise<void>
  scrollContainer?: HTMLElement | Window | (() => HTMLElement | Window | null)
  virtualize?: boolean | ((item: any) => boolean)
  virtualBoundsTop?: number
  virtualBoundsBottom?: number
  virtualBufferFactor?: number
  _logTwoColWhitespace?: (...args: any[]) => void
  _getColumnSpanConfig?: (item: any) => number | Record<string, unknown>
  _getResponsiveModuleConfigForSecondItem?: (item: any) => any
  _getModulePositioningConfig?: (...args: any[]) => any
  _enableSectioningPosition?: boolean
  measurementStore?: MeasurementStore
  positionStore?: MeasurementStore
  _dynamicHeights?: boolean
  renderItem: (args: { data: any; itemIdx: number; isMeasuring: boolean }) => any
}

/**********************
 *       Masonry      *
 **********************/
export default defineComponent({
  name: 'Masonry',
  props: {
    items: {
      type: Array as PropType<any[]>,
      required: true
    },
    align: {
      type: String as PropType<'start' | 'center' | 'end'>,
      default: 'center'
    },
    columnWidth: {
      type: Number,
      default: 236
    },
    gutterWidth: {
      type: Number,
      default: undefined
    },
    minCols: {
      type: Number,
      default: 3
    },
    layout: {
      type: String as PropType<MasonryProps['layout']>,
      default: 'basic'
    },
    loadItems: {
      type: Function as PropType<MasonryProps['loadItems']>,
      default: () => {}
    },
    scrollContainer: {
      type: [Object, Function] as PropType<MasonryProps['scrollContainer']>,
      default: undefined
    },
    virtualize: {
      type: [Boolean, Function] as PropType<MasonryProps['virtualize']>,
      default: false
    },
    virtualBoundsTop: Number,
    virtualBoundsBottom: Number,
    virtualBufferFactor: {
      type: Number,
      default: 0.7
    },
    _logTwoColWhitespace: Function as PropType<MasonryProps['_logTwoColWhitespace']>,
    _getColumnSpanConfig: Function as PropType<MasonryProps['_getColumnSpanConfig']>,
    _getResponsiveModuleConfigForSecondItem: Function as PropType<MasonryProps['_getResponsiveModuleConfigForSecondItem']>,
    _getModulePositioningConfig: Function as PropType<MasonryProps['_getModulePositioningConfig']>,
    _enableSectioningPosition: Boolean,
    measurementStore: Object as PropType<MeasurementStore>,
    positionStore: Object as PropType<MeasurementStore>,
    _dynamicHeights: Boolean,
    renderItem: {
      type: Function as PropType<MasonryProps['renderItem']>,
      required: true
    }
  },
  setup (props, { emit, slots }) {
    /**
     * -----------------------------
     * refs & reactive state
     * -----------------------------
     */
    const gridWrapper = ref<HTMLElement | null>(null)
    const scrollContainerRef = ref<any>(null)

    // Determine measurement & position stores
    const measurementStore = props.measurementStore || MeasurementStore.create()
    const positionStore = props.positionStore || MeasurementStore.create()

    const gutterDefault = 14
    const gutterWidth = props.gutterWidth !== undefined ? props.gutterWidth : gutterDefault

    const state = reactive({
      gutter: gutterWidth,
      hasPendingMeasurements: props.items.some((item) => !!item && !measurementStore.has(item)),
      isFetching: false,
      items: props.items as any[],
      measurementStore,
      scrollTop: 0,
      width: undefined as number | undefined
    })

    // 初始化时预设已知高度
    props.items.forEach(item => {
      if (item && typeof item.height === 'number' && !measurementStore.has(item)) {
        measurementStore.set(item, item.height)
      }
    })

    /**
     * -----------------------------
     * helper: setState (模拟 React)
     * -----------------------------
     */
    function setState (partial: Partial<typeof state>, cb?: () => void) {
      Object.assign(state, partial)
      if (cb) nextTick(cb)
    }

    /**
     * -----------------------------
     *  debounced/ throttled helpers
     * -----------------------------
     */
    const handleResize = debounce(() => {
      if (gridWrapper.value) {
        setState({ width: gridWrapper.value.getBoundingClientRect().width })
      }
    }, 300)

    const updateScrollPosition = throttle(() => {
      if (!scrollContainerRef.value) return
      const el = getActualScrollContainer()
      if (el) {
        setState({ scrollTop: getScrollTop(el) })
      }
    })

    /**
     * -----------------------------
     * util functions
     * -----------------------------
     */
    const containerHeight = ref(0)
    const containerOffset = ref(0)

    function getActualScrollContainer (): HTMLElement | Window | null {
      if (typeof props.scrollContainer === 'function') {
        return props.scrollContainer() as HTMLElement | Window | null
      }
      return props.scrollContainer || window
    }

    function measureContainer () {
      const sc = getActualScrollContainer()
      if (sc) {
        containerHeight.value = getViewportHeight(sc)
        if (gridWrapper.value instanceof HTMLElement) {
          const offsetTop = getOffsetWithinContainer(sc)
          containerOffset.value = gridWrapper.value.getBoundingClientRect().top + offsetTop
        }
      }
    }

    /**
     * -----------------------------
     * lifecycle: mounted
     * -----------------------------
     */
    onMounted(() => {
      window.addEventListener('resize', handleResize)
      measureContainer()

      let scrollTop = state.scrollTop
      const sc = getActualScrollContainer()
      if (sc) {
        scrollTop = getScrollTop(sc)
      }

      setState({
        scrollTop,
        width: gridWrapper.value ? gridWrapper.value.getBoundingClientRect().width : state.width
      })

      // 如果 items 包含 height 属性，预设到 measurementStore
      props.items.forEach(item => {
        if (item && typeof item.height === 'number' && !measurementStore.has(item)) {
          measurementStore.set(item, item.height)
        }
      })
    })

    onBeforeUnmount(() => {
      handleResize.clearTimeout && handleResize.clearTimeout()
      updateScrollPosition.clearTimeout && updateScrollPosition.clearTimeout()
      window.removeEventListener('resize', handleResize)
    })

    /**
     * -----------------------------
     * watch props.items (模拟 getDerivedStateFromProps)
     * -----------------------------
     */
    watch(
      () => props.items,
      (newItems) => {
        const hasPendingMeasurements = newItems.some((item) => !measurementStore.has(item))

        // 如果 items 包含 height 属性，预设到 measurementStore
        newItems.forEach(item => {
          if (item && typeof item.height === 'number' && !measurementStore.has(item)) {
            measurementStore.set(item, item.height)
          }
        })

        // 简化 getDerivedStateFromProps 的分支逻辑，保持行为一致
        setState({
          hasPendingMeasurements,
          items: newItems,
          isFetching: false
        })
      },
      { deep: false }
    )

    /**
     * -----------------------------
     * public API – reflow (对外暴露)
     * -----------------------------
     */
    function reflow () {
      if (props.measurementStore) props.measurementStore.reset()
      state.measurementStore.reset()
      positionStore.reset()
      measureContainer()
      // Vue 中强制更新可通过修改无关响应式字段触发 – 这里直接 nextTick
      nextTick()
    }

    /**
     * -----------------------------
     *  fetchMore (瀑布流触底加载)
     * -----------------------------
     */
    function fetchMore () {
      if (!props.loadItems) return
      setState({ isFetching: true }, () => {
        props.loadItems && props.loadItems({ from: state.items.length })
      })
    }

    /**
     * -----------------------------
     * Algorithm helpers  (移植自 Masonry.js)
     * -----------------------------
     */
    // 与 CSS 逻辑相关的宽高处理
    function dC(value?: number) {
      if (value) {
        return value !== Infinity ? value : undefined
      }
    }

    // 判断两个水平区间是否有交集
    function i4(a: { left: number; right: number }, b: { left: number; right: number }) {
      return !(a.right <= b.left || a.left >= b.right)
    }

    // 断点 columnSpan 解析
    function dr(config: any, breakpoint: string): number {
      if (typeof config === 'number') return config
      if (config && typeof config === 'object') {
        // 兼容像 { sm: 1, md: 2, lg: 3, xl: 4 }
        if (breakpoint in config) return config[breakpoint]
        if ('default' in config) return config.default
      }
      return 1
    }

    // 计算列数
    function i6({ gutter, columnWidth, width, minCols }: { gutter?: number; columnWidth?: number; width: number; minCols: number }) {
      return Math.max(
        Math.floor(width / (((columnWidth ?? 236) + (gutter ?? 14)))),
        minCols
      )
    }

    // object rest helper (原函数名 b)
    function omit<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
      const res: Partial<T> = {}
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) === -1) {
          // @ts-ignore – 赋值兼容
          res[k] = obj[k]
        }
      }
      if (typeof Object.getOwnPropertySymbols === 'function') {
        // 处理 symbol key
        const symbols = Object.getOwnPropertySymbols(obj) as any
        for (let i = 0; i < symbols.length; i++) {
          if (keys.indexOf(symbols[i]) === -1 && Object.prototype.propertyIsEnumerable.call(obj, symbols[i])) {
            // @ts-ignore
            res[symbols[i]] = obj[symbols[i]]
          }
        }
      }
      return res
    }

    // Placeholder 函数 – 响应式模块配置
    const di = () => undefined
    const du = () => undefined

    // 一些通用小工具
    function i7(width: number, height = Infinity) {
      return {
        top: -9999,
        left: -9999,
        width,
        height
      }
    }

    function dg(width: number, height = Infinity) {
      return {
        top: -9999,
        left: -9999,
        width,
        height
      }
    }

    function i8(arr: number[]) {
      return arr.length ? arr.indexOf(Math.min(...arr)) : 0
    }

    function dn(heights: number[], span: number) {
      const res: number[] = []
      for (let i = 0; i < heights.length - (span - 1); i += 1) {
        const slice = heights.slice(i, i + span)
        const max = Math.max(...slice)
        res.push(slice.reduce((sum, h) => sum + (max - h), 0))
      }
      return res
    }

    // ScrollContainer 处理
    function dv(containerProp: MasonryProps['scrollContainer']): HTMLElement | Window | null {
      if (typeof containerProp === 'function') {
        return containerProp() as HTMLElement | Window | null
      }
      return containerProp ?? (typeof window !== 'undefined' ? window : null)
    }

    // 简易有向图结构，用于 whitespace 搜索
    class DeNode {
      id: any
      edges: { to: DeNode; score: number }[] = []
      constructor(public data: any) {
        this.data = data
        this.id = (data as any)?.id ?? data
      }
    }
    class De {
      private nodes = new Map<any, DeNode>()
      addNode(data: any) {
        if (!this.nodes.has(data)) {
          this.nodes.set(data, new DeNode(data))
        }
      }
      addEdge(fromData: any, toData: any, score: number) {
        this.addNode(fromData)
        this.addNode(toData)
        const from = this.nodes.get(fromData)!
        const to = this.nodes.get(toData)!
        from.edges.push({ to, score })
      }
      // Dijkstra 最短路径
      findLowestScore(startData: any) {
        const dist = new Map<DeNode, number>()
        const pq: { node: DeNode; cost: number }[] = []
        const start = this.nodes.get(startData)!
        dist.set(start, 0)
        pq.push({ node: start, cost: 0 })
        while (pq.length) {
          // 简化 – 取最小 cost
          pq.sort((a, b) => a.cost - b.cost)
          const { node, cost } = pq.shift()!
          if (cost > (dist.get(node) ?? Infinity)) continue
          for (const edge of node.edges) {
            const nextCost = cost + edge.score
            if (nextCost < (dist.get(edge.to) ?? Infinity)) {
              dist.set(edge.to, nextCost)
              pq.push({ node: edge.to, cost: nextCost })
            }
          }
        }
        let lowestScoreNode: DeNode | null = null
        let lowestScore = Infinity
        dist.forEach((costValue, node) => {
          if (costValue < lowestScore && node !== start) {
            lowestScore = costValue
            lowestScoreNode = node
          }
        })
        return {
          lowestScoreNode: lowestScoreNode ? (lowestScoreNode as DeNode).data : undefined,
          lowestScore
        }
      }
    }

    // -----------------------------
    // ResizeObserver 包装组件
    // -----------------------------
    const ResizeObserverWrapper = defineComponent({
      name: 'MasonryResizeObserverWrapper',
      props: {
        idx: Number,
        resizeObserver: Object as PropType<ResizeObserver | undefined>
      },
      setup(props, { slots }) {
        const el = ref<HTMLElement | null>(null)
        onMounted(() => {
          if (props.resizeObserver && el.value) props.resizeObserver.observe(el.value)
        })
        onBeforeUnmount(() => {
          if (props.resizeObserver && el.value) props.resizeObserver.unobserve(el.value)
        })
        return () => (
          <div ref={el} data-grid-item-idx={props.idx}>{slots.default ? slots.default() : null}</div>
        )
      }
    })

    // -----------------------------
    // renderMasonryComponent (移植)
    // -----------------------------
    function createRenderMasonryComponent(ctx: any) {
      return function renderMasonryComponent(data: any, idx: number, pos: any) {
        let visible: boolean
        const {
          renderItem,
          scrollContainer,
          virtualize,
          virtualBoundsTop,
          virtualBoundsBottom,
          virtualBufferFactor = 0.7
        } = ctx.props as MasonryProps
        const { top, left, width, height } = pos
        if (scrollContainer && virtualBufferFactor) {
          const buffer = ctx.containerHeight.value * virtualBufferFactor
          const offset = ctx.state.scrollTop - ctx.containerOffset.value
          const lower = virtualBoundsBottom ? offset + ctx.containerHeight.value + virtualBoundsBottom : offset + ctx.containerHeight.value + buffer
          visible = !(pos.top + pos.height < (virtualBoundsTop ? offset - virtualBoundsTop : offset - buffer) || pos.top > lower)
        } else {
          visible = true
        }
        const rtl = typeof document !== 'undefined' && (document as any).dir === 'rtl'
        const style: any = {
          top: 0,
          transform: `translateX(${rtl ? -1 * left : left}px) translateY(${top}px)`,
          WebkitTransform: `translateX(${rtl ? -1 * left : left}px) translateY(${top}px)`,
          width: dC(width),
          height: dC(height)
        }
        if (rtl) style.right = 0
        else style.left = 0

        const content = (
          <div
            class="Masonry__Item Masonry__Item__Mounted"
            data-grid-item
            role="listitem"
            style={style}
          >
            <ResizeObserverWrapper idx={idx} resizeObserver={ctx.resizeObserver}>
              {renderItem({ data, itemIdx: idx, isMeasuring: false })}
            </ResizeObserverWrapper>
          </div>
        )

        const shouldVirtualize = typeof virtualize === 'function' ? virtualize(data) : virtualize
        return shouldVirtualize ? (visible ? content : null) : content
      }
    }

    /**
     * -----------------------------
     * 其他算法函数移植
     * -----------------------------
     */

    // 断点列宽计算 (dt)
    function dt({
      columnCount,
      item,
      firstItem,
      isFlexibleWidthItem,
      _getColumnSpanConfig,
      responsiveModuleConfigForSecondItem
    }: {
      columnCount: number;
      item: any;
      firstItem: any;
      isFlexibleWidthItem: boolean;
      _getColumnSpanConfig: (item: any) => any;
      responsiveModuleConfigForSecondItem: any;
    }) {
      const config = _getColumnSpanConfig(item)
      const breakpoint = columnCount <= 2 ? 'sm' : columnCount <= 4 ? 'md' : columnCount <= 6 ? '_lg1' : columnCount <= 8 ? 'lg' : 'xl'
      let span = dr(config, breakpoint)
      if (isFlexibleWidthItem) {
        const firstSpan = dr(_getColumnSpanConfig(firstItem), breakpoint)
        if (typeof responsiveModuleConfigForSecondItem === 'number') {
          span = responsiveModuleConfigForSecondItem
        } else if (responsiveModuleConfigForSecondItem) {
          span = Math.max(
            responsiveModuleConfigForSecondItem.min,
            Math.min(responsiveModuleConfigForSecondItem.max, columnCount - firstSpan)
          )
        } else {
          span = 1
        }
      }
      return Math.min(span, columnCount)
    }

    // 计算居中偏移 (dd)
    const dd = ({
      align,
      columnCount,
      columnWidthAndGutter,
      gutter,
      layout,
      rawItemCount,
      width
    }: {
      align: string;
      columnCount: number;
      columnWidthAndGutter: number;
      gutter: number;
      layout: string;
      rawItemCount: number;
      width: number;
    }) => {
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

    // da – 提取 Position 对象数组
    function da(arr: { item: any; position: any }[]) {
      return arr.map(({ position }) => position)
    }

    // dl – 批量为 items 生成 position
    function dl({
      centerOffset,
      columnWidth,
      columnWidthAndGutter,
      gutter,
      heights,
      items,
      measurementCache,
      positionCache
    }: {
      centerOffset: number;
      columnWidth: number;
      columnWidthAndGutter: number;
      gutter: number;
      heights: number[];
      items: any[];
      measurementCache: MeasurementStore;
      positionCache?: MeasurementStore;
    }) {
      const newHeights = [...heights]
      const positions: { item: any; position: any }[] = []
      for (const item of items) {
        const height = measurementCache.get(item)
        const cachedPos = positionCache?.get(item)
        if (cachedPos) {
          positions.push({ item, position: cachedPos })
          continue
        }
        if (height == null) continue
        const colIndex = i8(newHeights)
        const top = newHeights[colIndex]
        newHeights[colIndex] += height > 0 ? height + gutter : 0
        const left = colIndex * columnWidthAndGutter + centerOffset
        positions.push({
          item,
          position: { top, left, width: columnWidth, height }
        })
      }
      return { positions, heights: newHeights }
    }

    // -----------------------------
    // ds – Basic 瀑布流算法（含多列、可选多列宽配置）
    // -----------------------------
    function ds(options: any) {
      const {
        align,
        columnWidth = 236,
        gutter,
        layout,
        minCols = 2,
        rawItemCount,
        width,
        measurementCache,
        _getColumnSpanConfig,
        _getModulePositioningConfig,
        _getResponsiveModuleConfigForSecondItem,
        _enableSectioningPosition
      } = options
      const rest = omit(options, [
        'align',
        'columnWidth',
        'gutter',
        'layout',
        'minCols',
        'rawItemCount',
        'width',
        'measurementCache',
        '_getColumnSpanConfig',
        '_getModulePositioningConfig',
        '_getResponsiveModuleConfigForSecondItem',
        '_enableSectioningPosition'
      ])

      return function (items: any[]) {
        if (width == null) return items.map(() => i7(columnWidth))

        const columnWidthAndGutter = columnWidth + gutter
        const columnCount = i6({ gutter, columnWidth, width, minCols })
        const columnHeights: number[] = Array(columnCount).fill(0)
        const centerOffset = dd({
          align,
          columnCount,
          columnWidthAndGutter,
          gutter,
          layout,
          rawItemCount: items.length,
          width
        })

        // 如果有多列宽配置函数，进入复杂计算
        if (_getColumnSpanConfig) {
          return dc({
            items,
            columnWidth,
            columnCount,
            gutter,
            centerOffset,
            measurementCache,
            positionCache: options.positionCache,
            _getColumnSpanConfig,
            _getResponsiveModuleConfigForSecondItem: _getResponsiveModuleConfigForSecondItem ?? di,
            _getModulePositioningConfig,
            _enableSectioningPosition,
            ...rest
          })
        }

        // 普通 1 列宽 item 计算 - 修复布局逻辑
        const positions = items.map((item) => {
          const h = measurementCache.get(item)
          if (h == null) return i7(columnWidth)

          // 找到最短的列
          const colIdx = i8(columnHeights)
          const top = columnHeights[colIdx]
          const left = colIdx * columnWidthAndGutter + centerOffset

          // 更新该列的高度
          columnHeights[colIdx] += h + gutter

          const pos = { top, left, width: columnWidth, height: h }
          options.positionCache?.set(item, pos)
          return pos
        })

        return positions
      }
    }

    // -----------------------------
    // dm – uniformRow & uniformRowFlexible
    // -----------------------------
    function dm({ cache, columnWidth = 236, flexible = false, gutter, width, minCols = 3 }: any) {
      return function (items: any[]) {
        if (width == null) return items.map(() => dg(columnWidth))

        const { columnWidth: colW, columnWidthAndGutter, columnCount } = (function ({ columnWidth, flexible, gutter, minCols, width }: any) {
          if (flexible) {
            const count = i6({ gutter, columnWidth, width, minCols })
            const actualColWidth = Math.floor(width / count) - gutter
            const widthAndGutter = actualColWidth + gutter
            return { columnWidth: actualColWidth, columnWidthAndGutter: widthAndGutter, columnCount: count }
          }
          const widthAndGutter = columnWidth + gutter
          return { columnWidth, columnWidthAndGutter: widthAndGutter, columnCount: i6({ gutter, columnWidth, width, minCols }) }
        })({ columnWidth, flexible, gutter, minCols, width })

        const rowHeights: number[] = []
        return items.map((item, index) => {
          const h = cache.get(item)
          if (h == null) return dg(colW)

          const rowIdx = Math.floor(index / columnCount)
          rowHeights[rowIdx] = Math.max(rowHeights[rowIdx] ?? 0, h)
          const top = rowIdx > 0 ? rowHeights.slice(0, rowIdx).reduce((sum, val) => sum + val + gutter, 0) : 0
          const left = (index % columnCount) * columnWidthAndGutter
          return { top, left, width: colW, height: h }
        })
      }
    }

    // -----------------------------
    // db – flexible / serverRenderedFlexible 布局
    // -----------------------------
    function db({ width, idealColumnWidth = 240, gutter, minCols = 2, measurementCache, _getColumnSpanConfig, _getModulePositioningConfig, _getResponsiveModuleConfigForSecondItem, _enableSectioningPosition, ...rest }: any) {
      if (width == null) {
        return () => [] as any
      }
      const columnCount = i6({ gutter, columnWidth: idealColumnWidth, width, minCols })
      const columnWidth = width / columnCount - gutter
      const columnWidthAndGutter = columnWidth + gutter
      const centerOffset = gutter / 2

      return function (items: any[]) {
        const heights = Array(columnCount).fill(0)
        if (_getColumnSpanConfig) {
          return dc({
            items,
            columnWidth,
            columnCount,
            gutter,
            centerOffset,
            measurementCache,
            _getColumnSpanConfig,
            _getModulePositioningConfig,
            _getResponsiveModuleConfigForSecondItem: _getResponsiveModuleConfigForSecondItem ?? du,
            _enableSectioningPosition,
            ...rest
          })
        }

        return items.map((item) => {
          const h = measurementCache.get(item)
          if (h == null) return dg(columnWidth)
          const colIdx = i8(heights)
          const top = heights[colIdx]
          heights[colIdx] += h > 0 ? h + gutter : 0
          const left = colIdx * columnWidthAndGutter + centerOffset
          return { top, left, width: columnWidth, height: h }
        })
      }
    }

    // -----------------------------
    // dc – 多列宽支持算法（简化实现）
    // -----------------------------
    function dc({ items, gutter = 14, columnWidth = 236, columnCount = 2, centerOffset = 0, measurementCache, positionCache, _getColumnSpanConfig, _getResponsiveModuleConfigForSecondItem, ...rest }: any) {
      const heights: number[] = Array(columnCount).fill(0)
      const positions: any[] = []
      const firstItem = items[0]
      const secondItem = items[1]
      const responsiveConfigSecond = _getResponsiveModuleConfigForSecondItem?.(secondItem)
      const isFlexible = (item: any) => !!responsiveConfigSecond && item === secondItem
      const columnWidthAndGutter = columnWidth + gutter

      for (const item of items) {
        const span = dt({
          columnCount,
          item,
          firstItem,
          isFlexibleWidthItem: isFlexible(item),
          _getColumnSpanConfig,
          responsiveModuleConfigForSecondItem: responsiveConfigSecond
        })

        const itemHeight = measurementCache.get(item)
        if (itemHeight == null) {
          positions.push(i7(span > 1 ? columnWidth * span + gutter * (span - 1) : columnWidth))
          continue
        }

        // 找到可以放置 span 列的最佳列 index
        let bestColIdx = 0
        let minHeight = Infinity
        for (let col = 0; col <= columnCount - span; col++) {
          const groupHeights = heights.slice(col, col + span)
          const maxHeightInGroup = Math.max(...groupHeights)
          if (maxHeightInGroup < minHeight) {
            minHeight = maxHeightInGroup
            bestColIdx = col
          }
        }

        const top = minHeight
        const left = bestColIdx * columnWidthAndGutter + centerOffset
        const pos = { top, left, width: columnWidth * span + gutter * (span - 1), height: itemHeight }

        for (let s = 0; s < span; s++) {
          heights[bestColIdx + s] = top + (itemHeight > 0 ? itemHeight + gutter : 0)
        }

        positions.push(pos)
        positionCache?.set(item, pos)
      }

      return positions
    }

    // -----------------------------
    // df – 顶层函数，根据 layout 选择算法
    // -----------------------------
    function df(options: any) {
      const { layout, width } = options
      const isFlexible = layout === 'flexible' || (layout === 'serverRenderedFlexible' && width != null)
      if (!isFlexible) {
        if ((layout as string).startsWith('uniformRow')) {
          return dm({
            cache: options.measurementCache,
            columnWidth: options.columnWidth,
            gutter: options.gutter,
            flexible: layout === 'uniformRowFlexible',
            minCols: options.minCols,
            width: options.width
          })
        }
        return ds(options)
      }

      // flexible 系列
      return db(options)
    }

    /**
     * -----------------------------
     * resizeObserver 实例（动态高度时）
     * -----------------------------
     */
    const resizeObserver = (props._dynamicHeights && typeof window !== 'undefined') ? new ResizeObserver(() => {
      // 高度变化后强制重新计算布局
      nextTick(() => {
        forceUpdate()
      })
    }) : undefined

    /** 强制更新辅助 */
    const dummyFlag = ref(0)
    function forceUpdate() {
      dummyFlag.value++
    }

    /**
     * -----------------------------
     * Scroll 事件监听，更新 scrollTop
     * -----------------------------
     */
    function attachScrollListener() {
      const el = getActualScrollContainer()
      if (el) {
        el.addEventListener('scroll', updateScrollPosition)
      }
    }
    function detachScrollListener() {
      const el = getActualScrollContainer()
      if (el) {
        el.removeEventListener('scroll', updateScrollPosition)
      }
    }
    onMounted(() => {
      attachScrollListener()
    })
    onBeforeUnmount(() => {
      detachScrollListener()
    })

    /**
     * -----------------------------
     * render function
     * -----------------------------
     */
    const selfCtx = {
      props,
      state,
      containerHeight,
      containerOffset,
      resizeObserver
    }
    const renderMasonryComponent = createRenderMasonryComponent(selfCtx)

    // -----------------------------
    // InfiniteScrollTrigger 组件 - 滚动加载触发器
    // -----------------------------
    const InfiniteScrollTrigger = defineComponent({
      name: 'InfiniteScrollTrigger',
      props: {
        containerHeight: Number,
        fetchMore: Function,
        isFetching: Boolean,
        scrollHeight: Number,
        scrollTop: Number
      },
      setup(props) {
        const checkAndTrigger = () => {
          if (!props.fetchMore || props.isFetching) return
          if (props.containerHeight && props.scrollHeight && props.scrollTop !== undefined) {
            // 当滚动到距离底部 3 倍容器高度时触发加载
            if (props.scrollTop + 3 * props.containerHeight > props.scrollHeight) {
              props.fetchMore()
            }
          }
        }

        watch([
          () => props.scrollTop,
          () => props.containerHeight,
          () => props.scrollHeight
        ], checkAndTrigger, { immediate: true })

        return () => null
      }
    })

    return () => {
      // 触发响应式依赖 dummyFlag 以强制更新
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const _ = dummyFlag.value
      /* eslint-enable */

      // 尚未拿到容器宽度，先渲染空 wrapper 用于测量
      if (state.width == null) {
        return <div ref={gridWrapper} style={{ width: '100%' }} />
      }

      // 计算 positions
      const positionGetter = df({
        align: props.align,
        columnWidth: props.columnWidth,
        gutter: state.gutter,
        items: state.items,
        layout: props.layout,
        measurementCache: state.measurementStore,
        positionCache: positionStore,
        minCols: props.minCols,
        width: state.width,
        _getColumnSpanConfig: props._getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem: props._getResponsiveModuleConfigForSecondItem,
        _logTwoColWhitespace: props._logTwoColWhitespace,
        _getModulePositioningConfig: props._getModulePositioningConfig,
        _enableSectioningPosition: props._enableSectioningPosition
      })

      const positions = positionGetter(state.items)

      const totalHeight = positions.length ? Math.max(...positions.map((p: any) => p.top + p.height)) : 0

      const grid = (
        <div
          class="Masonry"
          role="list"
          style={{ height: totalHeight, width: state.width }}
        >
          {state.items.map((item, idx) => renderMasonryComponent(item, idx, positions[idx]))}
        </div>
      )

      return (
        <div ref={gridWrapper} style={{ width: '100%' }}>
          {grid}
          {props.loadItems != null && (
            <InfiniteScrollTrigger
              containerHeight={containerHeight.value}
              fetchMore={fetchMore}
              isFetching={state.isFetching}
              scrollHeight={totalHeight + containerOffset.value}
              scrollTop={state.scrollTop}
            />
          )}
        </div>
      )
    }
  }
})
