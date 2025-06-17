import {
  computed,
  defineComponent,
  onMounted,
  onUpdated,
  onUnmounted,
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
      <div ref={elementRef} data-grid-item-idx={props.idx}>
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
    if (position) {
      tempPositionStore.set(item, { ...position })
    }
  })

  // 如果没有位置信息、新高度为0、或高度没有实际变化，则不需要调整
  if (
    !currentPosition ||
    newHeight === 0 ||
    Math.floor(currentPosition.height) === Math.floor(newHeight)
  ) {
    return false
  }

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
  measurementStore.set(changedItem, newHeight)
  positionStore.set(changedItem, {
    top,
    left,
    width,
    height: newHeight,
  })

  // 处理所有受影响的下方项目
  const finalOverlapRegion = itemsBelow.reduce(
    (currentOverlapRegion, { item, position }) => {
      if (hasOverlap(currentOverlapRegion, position)) {
        // 如果是多列项目，需要特殊处理
        if (position.width > minColumnWidth) {
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
function hasOverlap(region: OverlapRegion, position: Position): boolean {
  return (
    (region.left <= position.left && region.right > position.left) ||
    (region.left < position.left + position.width && region.right >= position.left + position.width)
  )
}

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
      return dc(
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
    if (Object.prototype.hasOwnProperty.call(obj, key) && keysToOmit.indexOf(key as K) === -1) {
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
      return items.map(() => createDefaultPosition(columnWidth))
    }

    // 计算基础参数
    const columnWidthAndGutter = columnWidth + gutter
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
    // 标准的瀑布流布局
    return items.map((item) => {
      // 从缓存中获取项目高度
      const itemHeight = measurementCache.get(item)

      // 如果没有高度信息，返回默认位置
      if (itemHeight === null) {
        return createDefaultPosition(columnWidth)
      }

      // 计算项目高度（包含间距）
      const totalItemHeight = itemHeight > 0 ? itemHeight + gutter : 0

      // 找到最短的列
      const shortestColumnIndex = findShortestColumnIndex(columnHeights)
      const currentTop = columnHeights[shortestColumnIndex]

      // 计算项目位置
      const left = shortestColumnIndex * columnWidthAndGutter + centerOffset

      // 更新该列的高度
      columnHeights[shortestColumnIndex] += totalItemHeight

      return {
        top: currentTop,
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
function handleMultiColumnLayout(config: any): Position[] {
  // 这里应该调用 dc 函数的实现
  // 由于 dc 函数非常复杂，这里只是一个占位符
  console.warn('Multi-column layout not fully implemented in this simplified version')
  return config.items.map(() => createDefaultPosition(config.columnWidth))
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
  setup(props, { expose, emit, slots }) {
    const insertAnimationFrame = ref()
    const maxHeight = ref(0) // 最大高度
    const width = ref<number>() // 宽度
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

      return () =>
        ('function' == typeof virtualize ? virtualize(item) : virtualize)
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
                changedItem =
                  updateItemPositions({
                    items: items.value,
                    changedItem: item,
                    newHeight: newHeight,
                    positionStore: positionStore,
                    measurementStore: measurementStore,
                    gutter: gutter.value,
                  }) || changedItem
              }
            })
            if (changedItem) {
              // 强制更新渲染
            }
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
      if (gridWrapper.value) {
        width.value = gridWrapper.value.getBoundingClientRect().width
      }
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
      let element: VNode // 渲染的元素
      let {
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

      return <div>Masonry</div>
    }
  },
})
