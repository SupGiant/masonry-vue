import {
  computed,
  defineComponent,
  onMounted,
  onUpdated,
  onUnmounted,
  watchEffect,
  ref,
  type PropType,
  watch,
  onBeforeUnmount,
  type VNode,
} from 'vue'

class measurementStore {
  map = new WeakMap<object, any>()
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

function createMeasurementStore() {
  return new measurementStore()
}

type Position = {
  top: number
  left: number
  width: number
  height: number
}

interface ModulePositioningConfig {
  itemsBatchSize?: number
  whitespaceThreshold?: number
  iterationsLimit?: number
}

interface ColumnSpanConfig {
  sm?: number
  md?: number
  lg?: number
  xl?: number
}
interface ResponsiveModuleConfig {
  min: number
  max: number
}


/**
 * 解析滚动容器引用
 * @param container 滚动容器，可以是元素、窗口或返回它们的函数
 * @returns 实际的滚动容器元素
 */
function resolveScrollContainer(container?: HTMLElement | Window | (() => HTMLElement | Window | null)): HTMLElement | Window | null {
  return typeof container === 'function' ? container() : container || null
}

export const ScrollContainerWrapper = defineComponent({
  name: 'ScrollContainerWrapper',
  props: {
    scrollContainer: {
      type: [Object, Function] as PropType<HTMLElement | Window | (() => HTMLElement | Window | null)>,
      default: undefined
    },
    onScroll: {
      type: Function as PropType<(event: Event) => void>,
      required: true
    }
  },
  setup(props, { slots, expose }) {
    // 保存当前滚动容器的引用
    const currentScrollContainer = ref<HTMLElement | Window | null>(null)

    /**
     * 获取滚动容器引用的方法，暴露给父组件
     */
    const getScrollContainerRef = () => currentScrollContainer.value

    /**
     * 处理滚动事件
     */
    const handleScroll = (event: Event) => {
      props.onScroll(event)
    }

    /**
     * 更新滚动容器，添加或移除事件监听器
     */
    const updateScrollContainer = (container: HTMLElement | Window | null) => {
      // 移除旧容器的事件监听器
      if (currentScrollContainer.value) {
        currentScrollContainer.value.removeEventListener('scroll', handleScroll)
      }

      // 更新引用
      currentScrollContainer.value = container

      // 为新容器添加事件监听器
      if (currentScrollContainer.value) {
        currentScrollContainer.value.addEventListener('scroll', handleScroll)
      }
    }

    // 组件挂载时设置滚动容器
    onMounted(() => {
      const container = resolveScrollContainer(props.scrollContainer)
      if (container) {
        updateScrollContainer(container)
      }
    })

    // 组件更新时检查滚动容器是否变化
    onUpdated(() => {
      const container = resolveScrollContainer(props.scrollContainer)
      if (container && container !== currentScrollContainer.value) {
        updateScrollContainer(container)
      }
    })

    // 组件卸载时清理事件监听器
    onUnmounted(() => {
      if (currentScrollContainer.value) {
        currentScrollContainer.value.removeEventListener('scroll', handleScroll)
      }
    })

    // 暴露方法给父组件
    expose({
      getScrollContainerRef
    })

    return () => {
      // 渲染单个子组件，类似于 React.Children.only
      const children = slots.default?.()
      return children && children.length === 1 ? children[0] : null
    }
  }
})

// 主要的Props类型定义
interface MasonryProps<T = any> {
  // 必需的props
  items: T[]
  renderItem: (params: { data: T; itemIdx: number; isMeasuring: boolean }) => VNode

  // 基础布局props
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  gutterWidth?: number
  layout?:
    | 'basic'
    | 'basicCentered'
    | 'flexible'
    | 'serverRenderedFlexible'
    | 'uniformRow'
    | 'uniformRowFlexible'
  minCols?: number

  // 加载和虚拟化props
  loadItems?: (params: { from: number }) => void
  virtualize?: boolean | ((item: T) => boolean)
  virtualBufferFactor?: number
  virtualBoundsTop?: number
  virtualBoundsBottom?: number

  // 滚动容器props
  scrollContainer?: HTMLElement | Window

  // 存储props
  measurementStore?: measurementStore
  positionStore?: measurementStore

  // 高级配置props (私有API，以_开头)
  _dynamicHeights?: boolean
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
  _getColumnSpanConfig?: (item: T) => number | ColumnSpanConfig
  _getResponsiveModuleConfigForSecondItem?: (item: T) => number | ResponsiveModuleConfig | undefined
  _getModulePositioningConfig?: (
    columnCount: number,
    columnSpan: number,
  ) => ModulePositioningConfig | undefined
  _enableSectioningPosition?: boolean
}

// 防抖函数
function debounce(e: Function, o: number = 100) {
  let a: number | null = null
  const r = (...r: any[]) => {
    a && clearTimeout(a)
    a = setTimeout(() => {
      a = null
      e(...r)
    }, o)
  }

  // 为返回函数添加 clearTimeout 方法
  const debouncedFn = r as typeof r & { clearTimeout: () => void }
  debouncedFn.clearTimeout = () => {
    a && clearTimeout(a)
  }

  return debouncedFn
}

// 节流函数
function throttle(e: Function, o: number = 100) {
  let a: number | undefined, r: number | undefined
  const t = (...t: any[]) => {
    let n = Date.now()
    void 0 !== a && n - a < o
      ? (clearTimeout(r),
        (r = setTimeout(
          () => {
            ;(a = n), e(...t)
          },
          o - (n - (null != a ? a : 0)),
        )))
      : ((a = n), e(...t))
  }

  // 为返回函数添加 clearTimeout 方法
  const throttledFn = t as typeof t & { clearTimeout: () => void }
  throttledFn.clearTimeout = () => {
    r && clearTimeout(r)
  }

  return throttledFn
}

const InfiniteScroll = defineComponent({
  name: 'InfiniteScroll',
  props: {
    containerHeight: {
      type: Number,
      required: true,
    },
    fetchMore: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    isAtEnd: {
      type: Boolean,
      default: false,
    },
    isFetching: {
      type: Boolean,
      required: true,
    },
    scrollHeight: {
      type: Number,
      required: true,
    },
    scrollTop: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    // 检查是否需要加载更多数据的函数
    const checkLoadMore = () => {
      const { containerHeight, fetchMore, isAtEnd, isFetching, scrollHeight, scrollTop } = props

      // 条件检查：
      // 1. 没有到达数据末尾 (!isAtEnd)
      // 2. 当前没在加载数据 (!isFetching)
      // 3. 有加载更多的回调函数 (fetchMore)
      // 4. 滚动位置接近底部 (scrollTop + 3 * containerHeight > scrollHeight)
      if (!isAtEnd && !isFetching && fetchMore && scrollTop + 3 * containerHeight > scrollHeight) {
        fetchMore()
      }
    }

    // 使用 watchEffect 监听 props 变化，类似于 React 的 useEffect
    watchEffect((onCleanup) => {
      // 使用 setTimeout 避免频繁触发，提供防抖效果
      const timeoutId = setTimeout(checkLoadMore, 0)

      // 清理函数，在组件卸载或依赖变化时清除定时器
      onCleanup(() => {
        clearTimeout(timeoutId)
      })
    })

    // 不渲染任何内容，只负责逻辑处理
    return () => null
  },
})

// 验证数字，主要是过滤无限大
let safePx = (e: number) => {
  if (e) return e !== 1 / 0 ? e : void 0
}

function getContainerHeight(e: HTMLElement | Window) {
  return e instanceof Window ? window.innerHeight : e.clientHeight
}

function getScrollY() {
  return undefined !== window.scrollY
    ? window.scrollY
    : document.documentElement && void 0 !== document.documentElement.scrollTop
      ? document.documentElement.scrollTop
      : 0
}

function getContainerOffset(e: HTMLElement | Window) {
  return e === window || e instanceof Window
    ? getScrollY()
    : e.scrollTop - e.getBoundingClientRect().top
}

// dh 组件转换为 Vue3
const GridItemWrapper = defineComponent({
  name: 'GridItemWrapper',
  props: {
    resizeObserver: {
      type: Object as PropType<ResizeObserver | undefined>,
      default: undefined,
    },
    idx: {
      type: Number,
      required: true,
    },
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
      <div  ref={elementRef} data-grid-item-idx={props.idx}>
        {slots.default?.()}
      </div>
    )
  },
})

interface AdjustedHeightParams {
  items: any[]
  changedItem: any
  newHeight: number
  positionStore: measurementStore
  measurementStore: measurementStore
  gutter: number
}

// 高度变化影响区域
interface DeltaRegion {
  left: number
  right: number
  delta: number
}

interface ItemPosition {
  item: any
  position: Position
}

interface OverlapRegion {
  left: number
  right: number
}

function updateItemPositions(param: AdjustedHeightParams) {
  const { items, changedItem, newHeight, positionStore, measurementStore, gutter } = param

  // 获取变化项目的当前位置信息
  const currentPosition = positionStore.get(changedItem)
  // 创建临时位置存储，保存所有项目的位置快照
  const tempPositionStore = createMeasurementStore()
  items.forEach((item) => {
    const position = positionStore.get(item)
    tempPositionStore.set(item, { ...position })
  })

  // 如果没有位置信息、新高度为0、或高度没有实际变化，则不需要调整
  if (
    !currentPosition ||
    newHeight === 0 ||
    Math.floor(currentPosition.height) === Math.floor(newHeight)
  ) {
    if(!currentPosition) console.log("不需要调整位置，因为获取不到当前的位置存储", currentPosition)
    if(newHeight === 0) console.log("不需要调整位置，因为新高度为0", newHeight)
    if(currentPosition &&Math.floor(currentPosition.height) === Math.floor(newHeight)) console.log("不需要调整位置，因为高度没有实际变化", Math.floor(currentPosition.height), Math.floor(newHeight))
    return false
  }



  //
  const { top, left, width, height: oldHeight } = currentPosition

  // 计算最小列宽（从前10个项目中获取）
  const minColumnWidth = calculateMinColumnWidth(items.slice(0, 10), positionStore)

  // 初始化高度变化影响区域列表
  const deltaRegions: DeltaRegion[] = [
    {
      left,
      right: left + width,
      delta: newHeight - oldHeight,
    },
  ]

  // 找到所有在变化项目下方的项目，并按顶部位置排序
  const itemsBelow: ItemPosition[] = items
    .map((item) => {
      const position = positionStore.get(item)
      return position && position.top >= currentPosition.top + currentPosition.height
        ? { item, position }
        : undefined
    })
    .filter((itemPos): itemPos is ItemPosition => !!itemPos)
    .sort((a, b) => a.position.top - b.position.top)

  // 更新变化项目的高度
  measurementStore.set(changedItem, newHeight) // 更新高度
  positionStore.set(changedItem, {
    top,
    left,
    width,
    height: newHeight,
  }) // 更新位置

  // 处理所有受影响的下方项目
  itemsBelow.reduce(
    (currentOverlapRegion, { item, position }) => {
      if (hasOverlap(currentOverlapRegion, position)) { // 如果当前项目和之前的项目有重叠
        if (position.width > minColumnWidth) { // 如果当前项目宽度大于最小列宽
          const multiColumnDelta = calculateMultiColumnDelta({
            currentPosition: position,
            allPreviousItems: items
              .map((item) => {
                const tempPos = tempPositionStore.get(item)
                const realPos = positionStore.get(item)
                return tempPos && realPos && tempPos.top < position.top
                  ? { item, position: realPos }
                  : undefined
              })
              .filter((itemPos): itemPos is ItemPosition => !!itemPos)
              .sort((a, b) => a.position.top - b.position.top),
            gutter,
          })

          deltaRegions.push({
            left: position.left,
            right: position.left + position.width,
            delta: multiColumnDelta,
          })
        }

        // 计算当前项目需要的位置调整
        const positionDelta = calculatePositionDelta(deltaRegions, position)

        // 更新项目位置
        positionStore.set(item, {
          ...position,
          top: position.top + positionDelta,
        })

        // 更新重叠区域
        return {
          left: Math.min(currentOverlapRegion.left, position.left),
          right: Math.max(currentOverlapRegion.right, position.left + position.width),
        }
      }
      return currentOverlapRegion
    },
    {
      left,
      right: left + width,
    } as OverlapRegion,
  )



  return true
}

// 检查两个区域是否有重叠
function hasOverlap(totalPosition: OverlapRegion, currentPosition: Position) {
  return currentPosition.left < totalPosition.right && currentPosition.left + currentPosition.width > totalPosition.left
}

/**
 * 计算位置调整的增量值
 */
function calculatePositionDelta(deltaRegions: DeltaRegion[], position: Position): number {
  for (let i = deltaRegions.length - 1; i >= 0; i--) {
    const { left, right, delta } = deltaRegions[i]
    if (hasOverlap({ left, right }, position)) {
      return delta
    }
  }
  return 0
}

/**
 * 检查两个区域是否有重叠
 */
// function hasOverlap(region: OverlapRegion, position: Position): boolean {
//   return (
//     (region.left <= position.left && region.right > position.left) ||
//     (region.left < position.left + position.width && region.right >= position.left + position.width)
//   )
// }

/**
 * 计算多列项目的高度调整值
 */
function calculateMultiColumnDelta(params: {
  currentPosition: Position
  allPreviousItems: ItemPosition[]
  gutter: number
}): number {
  const { currentPosition, allPreviousItems, gutter } = params

  let highestItem: ItemPosition | undefined

  allPreviousItems.forEach(({ item, position }) => {
    const hasHorizontalOverlap =
      (currentPosition.left <= position.left &&
        currentPosition.left + currentPosition.width > position.left) ||
      (currentPosition.left < position.left + position.width &&
        currentPosition.left + currentPosition.width >= position.left + position.width)

    if (
      hasHorizontalOverlap &&
      (!highestItem ||
        position.top + position.height > highestItem.position.top + highestItem.position.height)
    ) {
      highestItem = { item, position }
    }
  })

  return highestItem
    ? highestItem.position.top + highestItem.position.height - currentPosition.top + gutter
    : 0
}

/**
 * 计算最小列宽
 */
function calculateMinColumnWidth(items: any[], positionStore: measurementStore): number {
  let minWidth = Infinity
  items.forEach((item) => {
    const position = positionStore.get(item)
    if (position) {
      minWidth = Math.min(minWidth, position.width)
    }
  })
  return minWidth
}

interface PositionerProps {
  align: 'start' | 'center' | 'end'
  columnWidth: number
  gutter: number
  items: any[]
  layout:
    | 'basic'
    | 'basicCentered'
    | 'flexible'
    | 'serverRenderedFlexible'
    | 'uniformRow'
    | 'uniformRowFlexible'
  measurementStore: measurementStore
  positionStore: measurementStore
  minCols: number
  width?: number
  _getColumnSpanConfig?: (item: any) => number | ColumnSpanConfig
  _getResponsiveModuleConfigForSecondItem?: (
    item: any,
  ) => number | ResponsiveModuleConfig | undefined
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
  _getModulePositioningConfig?: (
    columnCount: number,
    columnSpan: number,
  ) => ModulePositioningConfig | undefined
  _enableSectioningPosition: boolean
}

function createPositioner(props: PositionerProps) {
  const {
    align,
    columnWidth,
    gutter,
    items,
    layout,
    measurementStore,
    positionStore,
    minCols,
    width,
    _getColumnSpanConfig,
    _getResponsiveModuleConfigForSecondItem,
    _logTwoColWhitespace,
    _getModulePositioningConfig,
    _enableSectioningPosition,
  } = props

  // 检查是否为灵活布局
  const isFlexibleLayout =
    layout === 'flexible' || (layout === 'serverRenderedFlexible' && width !== null)

  if (!isFlexibleLayout) {
    // 统一行布局
    if (layout.startsWith('uniformRow')) {
      console.log("创建统一行布局", layout)
      return createUniformRowLayout({
        cache: measurementStore,
        columnWidth,
        gutter,
        flexible: layout === 'uniformRowFlexible',
        minCols,
        width: width as number,
      })
    } // 固定列宽布局
    else {
      console.log("创建固定列宽布局", layout)
      return createFixedColumnLayout({
        align,
        measurementCache: measurementStore,
        positionCache: positionStore,
        columnWidth,
        gutter,
        layout,
        minCols,
        rawItemCount: items.length,
        width,
        originalItems: items,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
      })
    }
  } else {
    console.log("创建灵活布局", layout)
    return createFlexibleLayout({
      gutter,
      measurementCache: measurementStore,
      positionCache: positionStore,
      minCols,
      idealColumnWidth: columnWidth,
      width,
      originalItems: items,
      _getColumnSpanConfig,
      _getResponsiveModuleConfigForSecondItem,
      _getModulePositioningConfig,
      _enableSectioningPosition,
    })
  }
}

// 灵活布局
function createFlexibleLayout(config: any) {
  var {
    width,
    idealColumnWidth = 240,
    gutter,
    minCols = 2,
    measurementCache,
    _getColumnSpanConfig,
    _getModulePositioningConfig,
    _getResponsiveModuleConfigForSecondItem,
    _enableSectioningPosition,
  } = config

  let options = omit(config, [
    'width',
    'idealColumnWidth',
    'gutter',
    'minCols',
    'measurementCache',
    '_getColumnSpanConfig',
    '_getModulePositioningConfig',
    '_getResponsiveModuleConfigForSecondItem',
    '_enableSectioningPosition',
  ])

  if (width === null) {
    return function (items: any) {
      return items.map(() => ({
        top: 1 / 0,
        left: 1 / 0,
        width: 1 / 0,
        height: 1 / 0,
      }))
    }
  }
  let columnCount = calculateColumnCount({
    gutter,
    columnWidth: idealColumnWidth,
    width,
    minCols,
  })

  const adjustedColumnWidth = Math.floor(width / columnCount) - gutter
  const columnWidthAndGutter = adjustedColumnWidth + gutter
  const centerOffset = gutter / 2

  return function (items: any[]) {
    // 初始化每列的高度数组
    let columnHeights = Array(columnCount).fill(0)

    if (_getColumnSpanConfig) {
      // 占位符
      return handleMultiColumnLayout(
        Object.assign(
          {
            items,
            columnWidth: adjustedColumnWidth,
            columnCount,
            centerOffset,
            gutter,
          },
          options,
        ),
      )
    } else {
      return items.reduce((accumulator, currentValue) => {
        var t
        let itemPosition: Position,
          itemHeight = measurementCache.get(currentValue)
        if (itemHeight === null) {
          itemPosition = {
            top: 1 / 0,
            left: 1 / 0,
            width: 1 / 0,
            height: 1 / 0,
          }
        } else {
          // 计算项目高度（包含间距）
          let totalItemHeight = itemHeight > 0 ? itemHeight + gutter : 0
          // 找到高度最小的列
          let minColumnIndex = findShortestColumnIndex(columnHeights)
          let currentHeight = columnHeights[minColumnIndex]
          // 重新设置回去
          columnHeights[minColumnIndex] =
            (null != (t = columnHeights[minColumnIndex]) ? t : 0) + totalItemHeight
          itemPosition = {
            top: currentHeight,
            left: minColumnIndex * columnWidthAndGutter + centerOffset,
            width: adjustedColumnWidth,
            height: itemHeight,
          }
        }

        return accumulator.push(itemPosition), accumulator
      }, [])
    }
  }
}

function omit<T extends Record<string | symbol, any>, K extends keyof T>(
  obj: T,
  keysToOmit: K[],
): Omit<T, K> {
  const result = {} as Omit<T, K>

  // 遍历对象的可枚举属性
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && keysToOmit.indexOf(key as unknown as K) === -1) {
      ;(result as any)[key] = obj[key]
    }
  }

  // 处理 Symbol 属性
  if (obj != null && typeof Object.getOwnPropertySymbols === 'function') {
    const symbols = Object.getOwnPropertySymbols(obj)
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]
      if (
        keysToOmit.indexOf(symbol as K) === -1 &&
        Object.prototype.propertyIsEnumerable.call(obj, symbol)
      ) {
        ;(result as any)[symbol] = obj[symbol]
      }
    }
  }

  return result
}

function createFixedColumnLayout(config: any) {
  const {
    align = 'center',
    columnWidth = 236,
    gutter,
    layout,
    minCols = 2,
    rawItemCount,
    width,
    measurementCache,
    positionCache,
    originalItems,
    _getColumnSpanConfig,
    _getModulePositioningConfig,
    _getResponsiveModuleConfigForSecondItem,
    _enableSectioningPosition,
    logWhitespace,
    ...otherProps
  } = config

  return function (items: any[]) {
    if (width === null) {
      console.log("没有宽度，返回默认位置")
      return items.map(() => createDefaultPosition(columnWidth))
    }

    // 计算基础参数
    const columnWidthAndGutter = columnWidth + gutter
    // 计算列数, 也就是整个的width可以放多少列， 最低不能少于minCols
    const columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols,
    })

    // 初始化每列的高度数组
    const columnHeights = Array(columnCount).fill(0)

    // 计算居中偏移量
    const centerOffset = calculateCenterOffset({
      columnCount,
      columnWidthAndGutter,
      gutter,
      align,
      layout,
      rawItemCount,
      width,
    })

    // 如果有跨列配置，使用复杂的多列布局
    if (_getColumnSpanConfig) {
      return handleMultiColumnLayout({
        items,
        columnWidth,
        columnCount,
        centerOffset,
        gutter,
        measurementCache,
        positionCache,
        originalItems,
        _getColumnSpanConfig,
        _getModulePositioningConfig,
        _getResponsiveModuleConfigForSecondItem:
          _getResponsiveModuleConfigForSecondItem || defaultResponsiveModuleConfig,
        _enableSectioningPosition,
        logWhitespace,
        ...otherProps,
      })
    }

    console.log("没有创建多列布局")
    console.log("columnHeights", columnHeights)
    // 标准的瀑布流布局
    return items.map((item,index) => {
      // 从缓存中获取项目高度
      const itemHeight = measurementCache.get(item)

      // if(itemHeight == 21) {
      //   return createDefaultPosition(columnWidth)
      // }

      // 如果没有高度信息，返回默认位置
      if (itemHeight === null) {
        console.log("没有高度信息，返回默认位置")
        return createDefaultPosition(columnWidth)
      }

      // 计算项目高度（包含间距）
      const totalItemHeight = itemHeight > 0 ? itemHeight + gutter : 0

      // 找到最短的列
      const shortestColumnIndex = findShortestColumnIndex(columnHeights)
      const currentTop = columnHeights[shortestColumnIndex]  // 当前列的高度

      // 计算项目位置
      const left = shortestColumnIndex * columnWidthAndGutter + centerOffset

      // 更新该列的高度
      columnHeights[shortestColumnIndex] += totalItemHeight

      console.log(`${index} - ${currentTop}`)
      return {
        top: currentTop, // 当前列的高度
        left,
        width: columnWidth,
        height: itemHeight,
      }
    })
  }
}

/**
 * 处理多列跨度的复杂布局
 * 这是一个占位函数，实际实现会更复杂
 */
function handleMultiColumnLayout(params: any): Position[] {
  const {
    items,
    gutter = 14,
    columnWidth = 236,
    columnCount = 2,
    centerOffset = 0,
    logWhitespace,
    measurementCache,
    positionCache,
    originalItems,
    _getColumnSpanConfig,
    _getModulePositioningConfig,
    _getResponsiveModuleConfigForSecondItem,
    _enableSectioningPosition = false
  } = params;

  const firstItem = originalItems[0];
  const secondItem = originalItems[1];
  const responsiveConfig = _getResponsiveModuleConfigForSecondItem(secondItem);
  const checkIsFlexibleWidthItem = (item: any): boolean => !!responsiveConfig && item === secondItem;

  // 如果不是所有项目都已测量，返回默认位置
  if (!items.every((item: any) => measurementCache.has(item))) {
    return items.map((item: any) => {
      const columnSpan = calculateColumnSpan({
        columnCount,
        firstItem,
        isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
        item,
        responsiveModuleConfigForSecondItem: responsiveConfig,
        _getColumnSpanConfig
      });

      if (columnSpan > 1) {
        const spanWidth = Math.min(columnSpan, columnCount);
        return createDefaultPosition(columnWidth * spanWidth + gutter * (spanWidth - 1));
      }
      return createDefaultPosition(columnWidth);
    });
  }

  const columnWidthAndGutter = columnWidth + gutter;

  // 计算初始高度
  const initialHeights = calculateInitialHeights({
    centerOffset,
    checkIsFlexibleWidthItem,
    columnCount,
    columnWidthAndGutter,
    firstItem,
    gutter,
    items,
    positionCache,
    responsiveModuleConfigForSecondItem: responsiveConfig,
    _getColumnSpanConfig
  });

  // 分离已缓存和未缓存的项目
  const cachedItems = items.filter((item: any) => positionCache.has(item));
  const uncachedItems = items.filter((item: any) => !positionCache.has(item));
  const multiColumnItems = uncachedItems.filter((item: any) =>
    calculateColumnSpan({
      columnCount,
      firstItem,
      isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
      item,
      responsiveModuleConfigForSecondItem: responsiveConfig,
      _getColumnSpanConfig
    }) > 1
  );

  const layoutConfig = {
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  };

  // 如果有多列项目，使用复杂布局算法
  if (multiColumnItems.length > 0) {
    // 分组处理多列项目
    const itemGroups = Array.from({ length: multiColumnItems.length }, () => [] as any[])
      .map((_, index) => {
        const startIndex = index === 0 ? 0 : uncachedItems.indexOf(multiColumnItems[index]);
        const endIndex = index + 1 === multiColumnItems.length ?
          uncachedItems.length :
          uncachedItems.indexOf(multiColumnItems[index + 1]);
        return uncachedItems.slice(startIndex, endIndex);
      });

    const { positions: cachedPositions, heights: updatedHeights } = positionSingleColumnItems({
      ...layoutConfig,
      items: cachedItems,
      heights: initialHeights
    });

    // 处理每组项目
    const { positions: finalPositions } = itemGroups.reduce((acc, groupItems, groupIndex) => {
      return processMultiColumnItemGroup({
        multiColumnItem: multiColumnItems[groupIndex],
        itemsToPosition: groupItems,
        checkIsFlexibleWidthItem,
        firstItem,
        heights: acc.heights,
        prevPositions: acc.positions,
        logWhitespace,
        columnCount,
        responsiveModuleConfigForSecondItem: responsiveConfig,
        _getColumnSpanConfig,
        _getModulePositioningConfig,
        _enableSectioningPosition,
        ...layoutConfig
      });
    }, { heights: updatedHeights, positions: cachedPositions });

    return extractPositions(finalPositions);
  }

  // 简单布局：所有项目都是单列
  const { positions } = positionSingleColumnItems({
    ...layoutConfig,
    items,
    heights: initialHeights
  });

  // 更新位置缓存
  positions.forEach(({ item, position }) => {
    positionCache.set(item, position);
  });

  return extractPositions(positions);
}

// 提取位置数组
function extractPositions(itemPositions: ItemPosition[]): Position[] {
  return itemPositions.map(({ position }) => position);
}

// 辅助函数：定位单列项目
function positionSingleColumnItems(params: {
  centerOffset: number;
  columnWidth: number;
  columnWidthAndGutter: number;
  gutter: number;
  heights: number[];
  items: any[];
  measurementCache: measurementStore;
  positionCache?: measurementStore;
}) {
  const { centerOffset, columnWidth, columnWidthAndGutter, gutter, measurementCache, positionCache } = params;
  const heights = [...params.heights];

  const positions = params.items.reduce<ItemPosition[]>((acc, item) => {
    const cachedHeight = measurementCache.get(item);
    const cachedPosition = positionCache?.get(item);

    if (cachedPosition) {
      return [...acc, { item, position: cachedPosition }];
    }

    if (cachedHeight != null) {
      const shortestColumnIndex = findShortestColumnIndex(heights);
      const top = heights[shortestColumnIndex];

      heights[shortestColumnIndex] = heights[shortestColumnIndex] + (cachedHeight > 0 ? cachedHeight + gutter : 0);

      return [...acc, {
        item,
        position: {
          top,
          left: shortestColumnIndex * columnWidthAndGutter + centerOffset,
          width: columnWidth,
          height: cachedHeight
        }
      }];
    }

    return acc;
  }, []);

  return { positions, heights };
}

// 辅助函数：计算多列项目位置
function calculateMultiColumnItemPosition(params: {
  centerOffset: number;
  columnWidth: number;
  columnWidthAndGutter: number;
  gutter: number;
  heights: number[];
  item: any;
  columnSpan: number;
  measurementCache: measurementStore;
  fitsFirstRow: boolean;
}) {
  const { centerOffset, columnWidth, columnWidthAndGutter, gutter, item, columnSpan, measurementCache, fitsFirstRow } = params;
  const heights = [...params.heights];
  const itemHeight = measurementCache.get(item);

  if (itemHeight == null) {
    return {
      additionalWhitespace: null,
      heights,
      position: createDefaultPosition(columnWidth)
    };
  }

  const whitespaceOptions = calculateShortestColumnsWhitespace(heights, columnSpan);
  const bestColumnIndex = fitsFirstRow ?
    heights.indexOf(0) :
    whitespaceOptions.indexOf(Math.min(...whitespaceOptions));

  const affectedColumns = heights.slice(bestColumnIndex, bestColumnIndex + columnSpan);
  const tallestColumnIndex = bestColumnIndex + affectedColumns.indexOf(Math.max(...affectedColumns));
  const top = heights[tallestColumnIndex];
  const left = bestColumnIndex * columnWidthAndGutter + centerOffset;
  const newHeight = heights[tallestColumnIndex] + (itemHeight > 0 ? itemHeight + gutter : 0);

  // 计算额外的空白空间
  const additionalWhitespace = affectedColumns.map(height => Math.max(...affectedColumns) - height);

  // 更新高度
  for (let i = 0; i < columnSpan; i++) {
    heights[i + bestColumnIndex] = newHeight;
  }

  return {
    additionalWhitespace,
    heights,
    position: {
      top,
      left,
      width: columnWidth * columnSpan + gutter * (columnSpan - 1),
      height: itemHeight
    }
  };
}


// 处理多列项目组的函数 - 完整实现
function processMultiColumnItemGroup(params: {
  multiColumnItem: any;
  checkIsFlexibleWidthItem: (item: any) => boolean;
  firstItem: any;
  itemsToPosition: any[];
  heights: number[];
  prevPositions: ItemPosition[];
  columnCount: number;
  logWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void;
  responsiveModuleConfigForSecondItem: ResponsiveModuleConfig | number | undefined;
  _getColumnSpanConfig: (item: any) => number | ColumnSpanConfig;
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => ModulePositioningConfig;
  _enableSectioningPosition?: boolean;
  centerOffset: number;
  columnWidth: number;
  columnWidthAndGutter: number;
  gutter: number;
  measurementCache: measurementStore;
  positionCache: measurementStore;
}) {
  const {
    multiColumnItem,
    checkIsFlexibleWidthItem,
    firstItem,
    itemsToPosition,
    heights,
    prevPositions,
    columnCount,
    logWhitespace,
    responsiveModuleConfigForSecondItem,
    _getColumnSpanConfig,
    _getModulePositioningConfig,
    _enableSectioningPosition,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  } = params;

  const multiColumnIndex = itemsToPosition.indexOf(multiColumnItem);
  const singleColumnItems = itemsToPosition.filter(item =>
    calculateColumnSpan({
      columnCount,
      firstItem,
      isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
      item,
      responsiveModuleConfigForSecondItem,
      _getColumnSpanConfig
    }) === 1
  );

  const emptyColumnsCount = heights.reduce((count, height) => height === 0 ? count + 1 : count, 0);
  const multiColumnSpan = calculateColumnSpan({
    columnCount,
    firstItem,
    isFlexibleWidthItem: checkIsFlexibleWidthItem(multiColumnItem),
    item: multiColumnItem,
    responsiveModuleConfigForSecondItem,
    _getColumnSpanConfig
  });

  const fitsFirstRow = emptyColumnsCount >= multiColumnSpan + multiColumnIndex;
  const replaceWithOneColItems = !fitsFirstRow && multiColumnIndex < emptyColumnsCount;

  const { itemsBatchSize = 5, whitespaceThreshold, iterationsLimit } =
    _getModulePositioningConfig?.(columnCount, multiColumnSpan) || {};

  const batchIndex = calculateBatchIndex({
    oneColumnItemsLength: singleColumnItems.length,
    multiColumnIndex,
    emptyColumns: emptyColumnsCount,
    fitsFirstRow,
    replaceWithOneColItems,
    itemsBatchSize
  });

  const itemsBeforeMultiColumn = singleColumnItems.slice(0, batchIndex);
  const batchItems = fitsFirstRow ? [] : singleColumnItems.slice(batchIndex, batchIndex + itemsBatchSize);

  // 定位批次前的项目
  const { positions: batchPositions, heights: batchHeights } = positionSingleColumnItems({
    items: itemsBeforeMultiColumn,
    heights,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  });

  // 更新位置缓存
  batchPositions.forEach(({ item, position }) => {
    positionCache.set(item, position);
  });

  // 寻找批次项目的最优布局
  const { winningNode, numberOfIterations } = findOptimalLayout({
    items: batchItems,
    positions: batchPositions,
    heights: batchHeights,
    columnSpan: multiColumnSpan,
    iterationsLimit,
    whitespaceThreshold,
    _enableSectioningPosition,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  });

    // 定位多列项目
  const multiColumnHeights = winningNode.section !== undefined && _enableSectioningPosition ?
    [...batchHeights.slice(0, winningNode.section), ...winningNode.heights, ...batchHeights.slice(winningNode.section + multiColumnSpan, batchHeights.length)] :
    winningNode.heights;

  const { heights: updatedHeights, position: multiColumnPosition, additionalWhitespace } = calculateMultiColumnItemPosition({
    item: multiColumnItem,
    heights: multiColumnHeights,
    columnSpan: multiColumnSpan,
    fitsFirstRow,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache
  });

  const multiColumnItemPosition: ItemPosition = {
    item: multiColumnItem,
    position: multiColumnPosition
  };

  const allPositionedItems = winningNode.positions.concat(multiColumnItemPosition);
  const positionedItemsSet = new Set(allPositionedItems.map(({ item }: { item: any }) => item));

  // 定位剩余项目
  const { heights: finalHeights, positions: remainingPositions } = positionSingleColumnItems({
    items: itemsToPosition.filter(item => !positionedItemsSet.has(item)),
    heights: updatedHeights,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  });

  const allPositions = allPositionedItems.concat(remainingPositions);

  // 记录空白空间信息
  if (additionalWhitespace && logWhitespace) {
    logWhitespace(additionalWhitespace, numberOfIterations, multiColumnSpan);
  }

  // 更新位置缓存
  allPositions.forEach(({ item, position }: { item: any; position: Position }) => {
    positionCache.set(item, position);
  });

  return {
    positions: prevPositions.concat(allPositions),
    heights: finalHeights
  };
}

// 辅助函数：计算最短列的空白空间
function calculateShortestColumnsWhitespace(heights: number[], columnSpan: number): number[] {
  const whitespaceOptions: number[] = [];

  for (let i = 0; i < heights.length - (columnSpan - 1); i++) {
    const columns = heights.slice(i, i + columnSpan);
    const maxHeight = Math.max(...columns);
    const whitespace = columns.reduce((total, height) => total + maxHeight - height, 0);
    whitespaceOptions.push(whitespace);
  }

  return whitespaceOptions;
}


// 图算法相关类
class GraphNode {
  data: any;
  edges: Array<{ node: GraphNode; score: number }> = [];

  constructor(data: any) {
    this.data = data;
  }

  addEdge(node: GraphNode, score: number): void {
    this.edges.push({ node, score });
  }

  removeEdge(node: GraphNode): void {
    this.edges = this.edges.filter(edge => edge.node !== node);
  }

  getEdges(): Array<{ node: GraphNode; score: number }> {
    return this.edges;
  }
}

class Graph {
  private nodes = new Map<any, GraphNode>();

  addEdge(startData: any, endData: any, score: number): [GraphNode, GraphNode] {
    const startNode = this.addNode(startData);
    const endNode = this.addNode(endData);
    startNode.addEdge(endNode, score);
    return [startNode, endNode];
  }

  addNode(data: any): GraphNode {
    if (this.nodes.has(data)) {
      const node = this.nodes.get(data);
      if (node) return node;
    }

    const node = new GraphNode(data);
    this.nodes.set(data, node);
    return node;
  }

  removeNode(data: any): boolean {
    const node = this.nodes.get(data);
    if (node) {
      node.edges.forEach(({ node: connectedNode }) => {
        connectedNode.removeEdge(node);
      });
    }
    return this.nodes.delete(data);
  }

  removeEdge(startData: any, endData: any): [GraphNode | undefined, GraphNode | undefined] {
    const startNode = this.nodes.get(startData);
    const endNode = this.nodes.get(endData);

    if (startNode && endNode) {
      startNode.removeEdge(endNode);
    }

    return [startNode, endNode];
  }

  findLowestScore(startData: any): { lowestScore: number | null; lowestScoreNode: any } {
    let lowestScore: number | null = null;
    let lowestScoreNode = startData;

    const traverse = (node: GraphNode): void => {
      node.getEdges().forEach(({ score, node: connectedNode }) => {
        if (lowestScore === null || score < lowestScore) {
          lowestScore = score;
          lowestScoreNode = connectedNode.data;
        }
        traverse(connectedNode);
      });
    };

    const startNode = this.nodes.get(startData);
    if (startNode) {
      traverse(startNode);
    }

    return { lowestScore, lowestScoreNode };
  }
}


interface OptimizationNode {
  id: any;
  heights: number[];
  positions: ItemPosition[];
  section?: number;
}
// 优化算法：寻找最佳布局
function findOptimalLayout(params: {
  items: any[];
  positions: ItemPosition[];
  heights: number[];
  whitespaceThreshold?: number;
  columnSpan: number;
  iterationsLimit?: number;
  _enableSectioningPosition?: boolean;
  centerOffset: number;
  columnWidth: number;
  columnWidthAndGutter: number;
  gutter: number;
  measurementCache: measurementStore;
  positionCache: measurementStore;
}) {
  const {
    items,
    positions,
    heights,
    whitespaceThreshold,
    columnSpan,
    iterationsLimit = 5000,
    _enableSectioningPosition = false,
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementCache,
    positionCache
  } = params;

  let bestScore: number | undefined;
  let bestNode: OptimizationNode | undefined;
  let iterationCount = 0;
  const graph = new Graph();

  const startNode: OptimizationNode = {
    id: "start",
    heights,
    positions,
    section: undefined
  };

  graph.addNode(startNode);
  const minimumWhitespace = Math.min(...calculateShortestColumnsWhitespace(heights, columnSpan));

  function processItemRecursively(params: {
    item: any;
    itemIndex: number;
    remainingItems: any[];
    previousNode: OptimizationNode;
    currentHeights: number[];
    processedItems?: any[];
    section?: number;
    segmentedLimit?: number;
  }): void {
    const {
      item,
      itemIndex,
      remainingItems,
      previousNode,
      currentHeights,
      processedItems = [],
      section,
      segmentedLimit = iterationsLimit
    } = params;

    if (bestNode || iterationCount === segmentedLimit) return;

    const heightsCopy = [...currentHeights];
    const sectionOffset = section ? columnWidthAndGutter * section + centerOffset : centerOffset;

    const { positions: newPositions, heights: newHeights } = positionSingleColumnItems({
      items: [...processedItems, item],
      heights: heightsCopy,
      centerOffset: sectionOffset,
      columnWidth,
      columnWidthAndGutter,
      gutter,
      measurementCache,
      positionCache
    });

    const newNode: OptimizationNode = {
      id: item,
      heights: newHeights,
      positions: newPositions,
      section
    };

    const currentWhitespace = Math.min(...calculateShortestColumnsWhitespace(newHeights, columnSpan));
    graph.addNode(newNode);
    graph.addEdge(previousNode, newNode, currentWhitespace);
    iterationCount++;

    if (typeof whitespaceThreshold === 'number' && currentWhitespace < whitespaceThreshold) {
      bestScore = currentWhitespace;
      bestNode = newNode;
      return;
    }

    if (remainingItems.length > 1) {
      const nextItems = [...remainingItems];
      nextItems.splice(itemIndex, 1);

      nextItems.forEach((nextItem, nextIndex) => {
        processItemRecursively({
          item: nextItem,
          itemIndex: nextIndex,
          remainingItems: nextItems,
          previousNode: newNode,
          currentHeights: newHeights,
          processedItems: [...processedItems, item],
          section,
          segmentedLimit
        });
      });
    }
  }

  if (_enableSectioningPosition) {
    const sectionCount = heights.length - columnSpan + 1;
    const sectionsHeights = Array.from({ length: sectionCount }).map((_, index) =>
      heights.slice(index, index + columnSpan)
    );
    const iterationsPerSection = Math.floor(iterationsLimit / sectionCount);

    sectionsHeights.forEach((sectionHeights, sectionIndex) => {
      iterationCount = 0;
      items.forEach((item, itemIndex) => {
        processItemRecursively({
          item,
          itemIndex,
          remainingItems: items,
          previousNode: startNode,
          currentHeights: sectionHeights,
          section: sectionIndex,
          segmentedLimit: iterationsPerSection
        });
      });
    });
  } else {
    items.forEach((item, itemIndex) => {
      processItemRecursively({
        item,
        itemIndex,
        remainingItems: items,
        previousNode: startNode,
        currentHeights: heights
      });
    });
  }

  const { lowestScoreNode, lowestScore } = bestNode ?
    { lowestScoreNode: bestNode, lowestScore: bestScore ?? 0 } :
    graph.findLowestScore(startNode);

  return {
    winningNode: lowestScore === null || lowestScore < minimumWhitespace ? lowestScoreNode : startNode,
    numberOfIterations: iterationCount
  };
}

// 辅助函数：计算批次索引
function calculateBatchIndex(params: {
  oneColumnItemsLength: number;
  multiColumnIndex: number;
  emptyColumns: number;
  fitsFirstRow: boolean;
  replaceWithOneColItems: boolean;
  itemsBatchSize: number;
}): number {
  const { oneColumnItemsLength, multiColumnIndex, emptyColumns, fitsFirstRow, replaceWithOneColItems, itemsBatchSize } = params;

  if (fitsFirstRow) return multiColumnIndex;
  if (replaceWithOneColItems) return emptyColumns;

  return multiColumnIndex + itemsBatchSize > oneColumnItemsLength ?
    Math.max(oneColumnItemsLength - itemsBatchSize, emptyColumns) :
    multiColumnIndex;
}

// 辅助函数：计算列跨度
function calculateColumnSpan(params: {
  columnCount: number;
  firstItem: any;
  isFlexibleWidthItem: boolean;
  item: any;
  responsiveModuleConfigForSecondItem: ResponsiveModuleConfig | number | undefined;
  _getColumnSpanConfig: (item: any) => number | ColumnSpanConfig;
}): number {
  const { columnCount, item, firstItem, isFlexibleWidthItem, _getColumnSpanConfig, responsiveModuleConfigForSecondItem } = params;
  const columnSpanConfig = _getColumnSpanConfig(item) as any;
  const responsiveBreakpoint = columnCount <= 2 ? "sm" :
                               columnCount <= 4 ? "md" :
                               columnCount <= 6 ? "_lg1" :
                               columnCount <= 8 ? "lg" : "xl";

  let columnSpan: number;
  if (typeof columnSpanConfig === 'number') {
    columnSpan = columnSpanConfig;
  } else {
    if (responsiveBreakpoint === "_lg1") {
      columnSpan = columnSpanConfig[responsiveBreakpoint] ?? columnSpanConfig.lg ?? 1;
    } else {
      columnSpan = columnSpanConfig[responsiveBreakpoint] ?? 1;
    }
  }

  if (isFlexibleWidthItem) {
    const firstItemSpan = _getColumnSpanConfig(firstItem) as any;
    const firstItemColumnSpan = typeof firstItemSpan === 'number' ? firstItemSpan :
                                responsiveBreakpoint === "_lg1" ? (firstItemSpan[responsiveBreakpoint] ?? firstItemSpan.lg ?? 1) :
                                (firstItemSpan[responsiveBreakpoint] ?? 1);

    if (typeof responsiveModuleConfigForSecondItem === 'number') {
      columnSpan = responsiveModuleConfigForSecondItem;
    } else if (responsiveModuleConfigForSecondItem) {
      columnSpan = Math.max(
        responsiveModuleConfigForSecondItem.min,
        Math.min(responsiveModuleConfigForSecondItem.max, columnCount - firstItemColumnSpan)
      );
    } else {
      columnSpan = 1;
    }
  }

  return Math.min(columnSpan, columnCount);
}



// 辅助函数：计算初始高度数组
function calculateInitialHeights(params: {
  centerOffset: number;
  checkIsFlexibleWidthItem: (item: any) => boolean;
  columnCount: number;
  columnWidthAndGutter: number;
  firstItem: any;
  gutter: number;
  items: any[];
  positionCache: measurementStore;
  responsiveModuleConfigForSecondItem: ResponsiveModuleConfig | number | undefined;
  _getColumnSpanConfig: (item: any) => number | ColumnSpanConfig;
}): number[] {
  const heights = new Array(params.columnCount).fill(0);

  params.items.forEach(item => {
    const cachedPosition = params.positionCache.get(item);
    if (cachedPosition) {
      const columnIndex = Math.round((cachedPosition.left - params.centerOffset) / params.columnWidthAndGutter);
      const columnSpan = calculateColumnSpan({
        columnCount: params.columnCount,
        firstItem: params.firstItem,
        isFlexibleWidthItem: params.checkIsFlexibleWidthItem(item),
        item: item,
        responsiveModuleConfigForSecondItem: params.responsiveModuleConfigForSecondItem,
        _getColumnSpanConfig: params._getColumnSpanConfig
      });
      const newHeight = cachedPosition.top + cachedPosition.height + params.gutter;

      for (let i = columnIndex; i < columnIndex + columnSpan; i++) {
        if (newHeight > heights[i]) {
          heights[i] = newHeight;
        }
      }
    }
  });

  return heights;
}

/**
 * 找到高度最小的列的索引
 */
function findShortestColumnIndex(columnHeights: number[]): number {
  return columnHeights.length ? columnHeights.indexOf(Math.min(...columnHeights)) : 0
}

/**
 * 默认的响应式模块配置函数
 */
function defaultResponsiveModuleConfig(item: any): any {
  return undefined
}

/**
 * 计算居中偏移量
 */
function calculateCenterOffset({
  columnCount,
  columnWidthAndGutter,
  gutter,
  align = 'center',
  layout,
  rawItemCount,
  width,
}: {
  columnCount: number
  columnWidthAndGutter: number
  gutter: number
  align?: string
  layout: string
  rawItemCount: number
  width: number
}): number {
  if (layout === 'basicCentered') {
    return Math.max(
      Math.floor(
        (width - (Math.min(rawItemCount, columnCount) * columnWidthAndGutter + gutter)) / 2,
      ),
      0,
    )
  }

  if (align === 'center') {
    return Math.max(Math.floor((width - columnWidthAndGutter * columnCount + gutter) / 2), 0)
  }

  if (align === 'end') {
    return width - (columnWidthAndGutter * columnCount - gutter)
  }

  return 0 // 'start' alignment
}

function createUniformRowLayout({
  cache,
  columnWidth = 236,
  flexible = false,
  gutter,
  width,
  minCols = 3,
}: {
  cache: measurementStore
  columnWidth: number
  flexible: boolean
  gutter: number
  width: number
  minCols: number
}) {
  return (items: any[]) => {
    // 如果没有容器宽度，返回默认位置
    if (width === null) {
      return items.map(() => createDefaultPosition(columnWidth))
    }

    // 计算列配置
    const {
      columnWidth: actualColumnWidth, // 实际列宽
      columnWidthAndGutter, // 列宽和间距
      columnCount, // 列数
    } = calculateColumns({
      columnWidth,
      flexible,
      gutter,
      minCols,
      width,
    })

    // 存储每行的最大高度
    const rowMaxHeights: number[] = []

    return items.map((item, index) => {
      // 从缓存中获取项目高度
      const itemHeight = cache.get(item)

      // 如果没有高度信息，返回默认位置
      if (itemHeight === null) {
        return createDefaultPosition(actualColumnWidth)
      }

      // 计算项目在网格中的位置
      const columnIndex = index % columnCount
      const rowIndex = Math.floor(index / columnCount)

      // 更新当前行的最大高度
      if (columnIndex === 0 || itemHeight > (rowMaxHeights[rowIndex] || 0)) {
        rowMaxHeights[rowIndex] = itemHeight
      }

      // 计算项目的实际位置
      const top =
        rowIndex > 0
          ? rowMaxHeights.slice(0, rowIndex).reduce((sum, height) => sum + height + gutter, 0)
          : 0

      const left = columnIndex * columnWidthAndGutter

      return {
        top,
        left,
        width: actualColumnWidth,
        height: itemHeight,
      }
    })
  }
}

// 计算列的宽度和数量
function calculateColumns({
  columnWidth,
  flexible,
  gutter,
  minCols,
  width,
}: {
  columnWidth: number
  flexible: boolean
  gutter: number
  minCols: number
  width: number
}) {
  if (flexible) {
    // 灵活模式：根据容器宽度调整列宽
    const columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols,
    })

    const adjustedColumnWidth = Math.floor(width / columnCount) - gutter
    const columnWidthAndGutter = adjustedColumnWidth + gutter
    return {
      columnCount,
      columnWidth: adjustedColumnWidth,
      columnWidthAndGutter,
    }
  } else {
    // 固定模式：使用预设的列宽
    const columnWidthAndGutter = columnWidth + gutter

    const columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols,
    })

    return {
      columnCount,
      columnWidth,
      columnWidthAndGutter,
    }
  }
}

/**
 * 计算列数的辅助函数
 */
function calculateColumnCount({
  gutter,
  columnWidth,
  width,
  minCols,
}: {
  gutter: number
  columnWidth: number
  width: number
  minCols: number
}): number {
  return Math.max(
    Math.floor(
      width / ((columnWidth != null ? columnWidth : 236) + (null != gutter ? gutter : 14)),
    ),
    minCols,
  )
}

// 创建默认的位置对象（）
function createDefaultPosition(columnWidth: number): Position {
  return {
    top: -9999,
    left: -9999,
    width: columnWidth,
    height: Infinity,
  }
}

export default defineComponent({
  name: 'VirtualMasonry',
  props: {
    // 必需的props
    items: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    renderItem: {
      type: Function as PropType<
        (params: { data: any; itemIdx: number; isMeasuring: boolean }) => VNode
      >,
      required: true,
    },

    // 基础布局props
    align: {
      type: String as PropType<'start' | 'center' | 'end'>,
      default: 'center',
    },
    columnWidth: {
      type: Number,
      default: 236,
    },
    gutterWidth: {
      type: Number,
      default: 14,
    },
    layout: {
      type: String as PropType<
        | 'basic'
        | 'basicCentered'
        | 'flexible'
        | 'serverRenderedFlexible'
        | 'uniformRow'
        | 'uniformRowFlexible'
      >,
      default: 'basic',
    },
    minCols: {
      type: Number,
      default: 3,
    },

    // 加载和虚拟化props
    loadItems: {
      type: Function as PropType<(params: { from: number }) => void>,
      default: () => {},
    },
    virtualize: {
      type: [Boolean, Function] as PropType<boolean | ((item: any) => boolean)>,
      default: false,
    },
    virtualBufferFactor: {
      type: Number,
      default: 0.7,
    },
    virtualBoundsTop: Number,
    virtualBoundsBottom: Number,

    // 滚动容器props
    scrollContainer: Object as PropType<HTMLElement | Window>,

    // 存储props
    measurementStore: Object as PropType<measurementStore>,
    positionStore: Object as PropType<measurementStore>,

    // 高级配置props (私有API，以_开头)
    _dynamicHeights: {
      type: Boolean,
      default: true,
    },
    _logTwoColWhitespace: Function as PropType<
      (whitespace: number[], iterations: number, columnSpan: number) => void
    >,
    _getColumnSpanConfig: Function as PropType<(item: any) => number | ColumnSpanConfig>,
    _getResponsiveModuleConfigForSecondItem: Function as PropType<
      (item: any) => number | ResponsiveModuleConfig | undefined
    >,
    _getModulePositioningConfig: Function as PropType<
      (columnCount: number, columnSpan: number) => ModulePositioningConfig | undefined
    >,
    _enableSectioningPosition: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    GridItemWrapper
  },
  setup(props, { expose, emit, slots }) {
    const insertAnimationFrame = ref()
    const maxHeight = ref(0) // 最大高度
    const width = ref<number>(0) // 宽度
    const scrollTop = ref(0) // 滚动位置
    const containerHeight = ref(0) // 容器高度
    const containerOffset = ref(0) // 容器偏移量
    const gutter = ref(props.gutterWidth) // 间距

    const gridWrapper = ref<HTMLElement | null>(null) // 网格容器
    const scrollContainer = ref<HTMLElement | null>(null) // 滚动容器

    const isFetching = ref(false) // 是否正在加载

    const positionStore = props.positionStore || createMeasurementStore()
    const measurementStore = props.measurementStore || createMeasurementStore()

    const items = ref(props.items) // 初始化数据

    const hasPendingMeasurements = ref(
      items.value.some((item) => !!item && !measurementStore.has(item)),
    )

    // 监听窗口大小变化
    const handleResize = debounce(() => {
      console.log("监听窗口大小变化", gridWrapper.value)
      width.value = gridWrapper.value?.getBoundingClientRect().width || 0
    }, 300)

    const updateScrollPosition = throttle(() => {
      if (scrollContainer.value) {
        scrollTop.value = scrollContainer.value?.scrollTop || 0
      }
    })

    // 异步测量容器
    const measureContainerAsync = debounce(() => {
      measureContainer()
    }, 0)

    const measureContainer = () => {
      if (scrollContainer.value) {
        containerHeight.value = getContainerHeight(scrollContainer.value)
        if (gridWrapper.value instanceof HTMLElement) {
          let offset = getContainerOffset(scrollContainer.value)
          containerOffset.value = gridWrapper.value.getBoundingClientRect().top + offset
        }
      }
    }

    const fetchMore = () => {
      if (props.loadItems && typeof props.loadItems === 'function') {
        isFetching.value = true
        props.loadItems?.({
          from: props.items.length,
        })
        // todo 自己添加的
        isFetching.value = false
      }
    }

    /**
     * 渲染网格组件
     * @param item 当前项
     * @param index 当前项索引
     * @param position 当前项位置
     */
    const renderMasonryComponent = (item: any, index: number, position: Position) => {
      let isVisible = false
      let {
        renderItem,
        scrollContainer,
        virtualize,
        virtualBoundsTop,
        virtualBoundsBottom,
        virtualBufferFactor,
      } = props
      let { top, left, width, height } = position

      if (scrollContainer && virtualBufferFactor) {
        // 如果滚动容器存在，并且虚拟化因子存在，则计算当前项是否在可视区域内
        let bufferHeight = containerHeight.value * virtualBufferFactor
        let relativeScrollTop = scrollTop.value - containerOffset.value
        let visibleBottomBound = virtualBoundsBottom
          ? relativeScrollTop + containerHeight.value + virtualBoundsBottom
          : relativeScrollTop + containerHeight.value + bufferHeight
        isVisible = !(
          position.top + position.height <
            (virtualBoundsTop
              ? relativeScrollTop - virtualBoundsTop
              : relativeScrollTop - bufferHeight) || position.top > visibleBottomBound
        )
      } else {
        isVisible = true
      }

      let isRtl = (null == document ? undefined : document.dir) === 'rtl'

      const element = () => {
        return (
          <div
            class={['Masonry__Item', 'Masonry__Item__Mounted'].join(' ')}
            data-grid-item={true}
            role="listitem"
            style={Object.assign(Object.assign({ top: 0 }, isRtl ? { right: 0 } : { left: 0 }), {
              transform: `translateX(${isRtl ? -1 * left : left}px) translateY(${top}px)`,
              WebkitTransform: `translateX(${isRtl ? -1 * left : left}px) translateY(${top}px)`,
              width: safePx(width) + 'px',
              height: safePx(height) + 'px',
            })}
            key={`item-${index}`}
          >
            <GridItemWrapper idx={index} resizeObserver={resizeObserver}>
              {renderItem({ data: item, itemIdx: index, isMeasuring: false })}
            </GridItemWrapper>
          </div>
        )
      }

      return ('function' == typeof virtualize ? virtualize(item) : virtualize)
        ? isVisible
          ? element()
          : null
        : element()
    }

    const resizeObserver =
      props._dynamicHeights && typeof window !== 'undefined' && positionStore
        ? new ResizeObserver((entries) => {
            let changedItem = false
            entries.forEach(({ target, contentRect }) => {
              let idx = Number(target.getAttribute('data-grid-item-idx'))
              if (typeof idx === 'number') {
                let item = items.value[idx]
                let newHeight = contentRect.height
                // console.log("newHeight", newHeight) // 第一次触发的时候都是21
                changedItem =
                  updateItemPositions({
                    items: items.value,
                    changedItem: item,
                    newHeight: newHeight,
                    positionStore: positionStore,
                    measurementStore: measurementStore,
                    gutter: gutter.value, // 默认14
                  })
              }
            })
          })
        : undefined

    const reflow = () => {
      measurementStore.reset()
      positionStore.reset()
      measureContainer()
    }

    expose({
      reflow,
    })

    onMounted(() => {
      window.addEventListener('resize', handleResize)
      measureContainer()
      if (scrollContainer.value) {
        scrollTop.value = getContainerOffset(scrollContainer.value)
      }

      width.value = gridWrapper.value ? gridWrapper.value.getBoundingClientRect().width : width.value

    })

    onUpdated(() => {
      // 执行一次异步测量
      measureContainerAsync()
      //todo 每次更新都进行了测量
    })

    watch(width, (newWidth, oldWidth) => {
      if (oldWidth !== null && newWidth !== oldWidth) {
        // 如果宽度发生变化，则重置测量和位置存储
        measurementStore.reset()
        positionStore.reset()

        let hasPendingMeasurementsTemp = items.value.some(
          (item) => !!item && !measurementStore.has(item),
        )
        if (
          hasPendingMeasurementsTemp ||
          hasPendingMeasurementsTemp !== hasPendingMeasurements.value ||
          oldWidth === null
        ) {
          insertAnimationFrame.value = requestAnimationFrame(() => {
            // 下一帧更新状态
            hasPendingMeasurements.value = hasPendingMeasurementsTemp
          })
        }
      }
    })

    watch(
      () => props.items,
      (newItems, oldItems) => {
        // 检查是否有未测量的项目
        const hasPendingMeasurementsTemp = newItems.some((item) => !measurementStore.has(item))

        // 检查项目是否发生变化
        let shouldUpdate = false

        if (newItems.length !== oldItems?.length) {
          shouldUpdate = true
        } else {
          for (let i = 0; i < newItems.length; i++) {
            if (newItems[i] !== oldItems[i]) {
              shouldUpdate = true
              break
            }
          }
        }

        // 处理空数组情况
        if (newItems.length === 0 && (oldItems?.length || 0) > 0) {
          shouldUpdate = true
        }

        // 检查待测量状态变化
        if (hasPendingMeasurementsTemp !== hasPendingMeasurements.value) {
          shouldUpdate = true
        }

        if (shouldUpdate) {
          items.value = [...newItems]
          hasPendingMeasurements.value = hasPendingMeasurementsTemp
          isFetching.value = false
        }
      },
      {
        deep: true,
        immediate: true,
      },
    )

    onBeforeUnmount(() => {
      insertAnimationFrame.value && cancelAnimationFrame(insertAnimationFrame.value)
      measureContainerAsync.clearTimeout()
      handleResize.clearTimeout()
      updateScrollPosition.clearTimeout()
      window.removeEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return () => {
      let element: any // 渲染的元素
      let {
        align = 'center',
        columnWidth,
        items,
        layout = 'basic',
        minCols,
        renderItem,
        _logTwoColWhitespace,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
      } = props


      // 实际返回了基本的固定列宽布局 createFixedColumnLayout()
      const positioner = createPositioner({
        align,
        columnWidth,
        gutter: gutter.value,
        items,
        layout,
        measurementStore: measurementStore,
        positionStore: positionStore,
        minCols,
        width: width.value,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _logTwoColWhitespace,
        _getModulePositioningConfig,
        _enableSectioningPosition,
      })


      if(hasPendingMeasurements.value) {
        // 如果是没有宽度，并且还有未测量的项目
        element = () => <div
          ref={(el: any) => {
            if(el) {
              gridWrapper.value = el
              hasPendingMeasurements.value = items.some((a) => !!a && !measurementStore.has(a))
            }
          }}
          class="Masonry"
          role="list"
          style={{
            height: 0,
            width: "100%"
          }}
        >
          {items.map((item, index) => {
            var columnSpanTemp;
            let columnSpan = null!=( columnSpanTemp = null == _getColumnSpanConfig ? undefined : _getColumnSpanConfig(item)) ? columnSpanTemp : 1;
            return <div
             ref={ (el: any) => {
              if(el && "flexible" !== layout) {
                measurementStore.set(item, el.clientHeight)
              }
             }}
             class="static"
             data-column-span={columnSpan}
             data-grid-item={true}
             role="listitem"
             style={{
              top: 0,
              left: 0,
              transform: "translateX(0px) translateY(0px)",
              WebkitTransform: "translateX(0px) translateY(0px)",
              width: "flexible" === layout || "serverRenderedFlexible" === layout || "object" == typeof columnSpan ? void 0 : safePx("number" == typeof columnSpan && null != columnWidth && null != gutter.value ? columnWidth * columnSpan + gutter.value * (columnSpan - 1) : columnWidth)
             }}
            >
              {renderItem({ data: item, itemIdx: index, isMeasuring: false })}
            </div>
          })}
        </div>
      } else if (width.value === 0) {
        element = () => <div
          ref={(el: any) => {
            if(el) {
              gridWrapper.value = el
            }
          }}
          style={{
            width: "100%"
          }}
        >
        </div>
      } else {

        let ismeasuring = items.filter((item) => measurementStore.has(item))
        let notMeasuring = items.filter((item) => !measurementStore.has(item))

        console.log("已经测量的项目", ismeasuring.length, "未测量的项目", notMeasuring.length)
        let g = _getColumnSpanConfig && notMeasuring.find((item) => 1 !== _getColumnSpanConfig(item))

        let t, o ;
        if(g) {
          o = notMeasuring.indexOf(g)
          let columnCount = calculateColumnCount({
            gutter: gutter.value,
            columnWidth: columnWidth,
            // @ts-ignore
            width: width.value,
            minCols: minCols
          })



          let n = _getResponsiveModuleConfigForSecondItem && items[1] ? _getResponsiveModuleConfigForSecondItem(items[1]) : undefined
          let c = !!n && g === items[1]
          let x = calculateColumnSpan({
            columnCount: columnCount,
                    firstItem: items[0],
                    isFlexibleWidthItem: c,
                    item: g,
                    responsiveModuleConfigForSecondItem: n,
                    // @ts-ignore
                    _getColumnSpanConfig: _getColumnSpanConfig
          })

          if (!c) {
            let {itemsBatchSize : temp} = (null == _getModulePositioningConfig ? void 0 : _getModulePositioningConfig(columnCount, x)) || {
              itemsBatchSize: 5
          };
          t = temp
          }
        }

        let f = t && o && o > 0 && o <= t ? t + 1 : minCols
        let noMeasuringItem = items.filter((item) => item && !measurementStore.has(item)).slice(0, f)
        let itemPositionRender = positioner(ismeasuring) // 已经测量的项目的位置
        let itemPositionMeasuring = positioner(noMeasuringItem) // 正在测量的项目的位置

        console.log("itemPositionRender", itemPositionRender)

        // 计算最大高度
        let maxHeightTemp = itemPositionRender.length ? Math.max(...itemPositionRender.map((e: any) => e.top + e.height), 0 === noMeasuringItem.length ? 0 : maxHeight.value) : 0;

        if (maxHeightTemp !== maxHeight.value) {
          maxHeight.value = maxHeightTemp
        }

        element = () => <div
          ref={(el: any) => {
            if(el) {
              gridWrapper.value = el
            }
          }}
          id="gridWrapper"
          style={{
            width: "100%"
          }}
        >
          {/* 已经测量的容器 */}
          <div
            class="Masonry"
            role="list"
            style={{
              height: maxHeightTemp,
              width: width.value
            }}
          >
            {ismeasuring.map((item,index)=>{
              //
              console.log(null != positionStore.get(item) ? '采用缓存的位置' : '采用计算的位置')
              return renderMasonryComponent(item,index,null != positionStore.get(item) ? positionStore.get(item) : itemPositionRender[index])
            })}
          {/* 正在测量的容器 */}
            {noMeasuringItem.map((item,index)=>{
              let a = ismeasuring.length + index
              let r = itemPositionMeasuring[index] // 正在测量的项目的位置
              return <div
               ref={(el:any) => {
                if(el) {
                  measurementStore.set(item,el.clientHeight)
                }
               }}
               role="listitem"
               style={{
                visibility: "hidden",
                position: "absolute",
                top: safePx(r.top) + 'px',
                left: safePx(r.left) + 'px',
                width: safePx(r.width) + 'px',
                height: safePx(r.height) + 'px'
               }}
               key={`measuring-${a}`}
              >
                {renderItem({ data: item, itemIdx: a, isMeasuring: true})}
              </div>
            })}
            {/* 滚动容器 */}
            {
              props.scrollContainer ?
              <InfiniteScroll
                  containerHeight={maxHeightTemp}
                  fetchMore={fetchMore}
                  isFetching={isFetching.value}
                  scrollHeight={containerOffset.value + maxHeightTemp}
                  scrollTop={scrollTop.value}
                /> : null
            }
          </div>
        </div>
      }

      return props.scrollContainer ? <ScrollContainerWrapper
        ref={scrollContainer}
        scrollContainer={props.scrollContainer}
        onScroll={updateScrollPosition}
      >{element()}</ScrollContainerWrapper> : element()
    }
  },
})
