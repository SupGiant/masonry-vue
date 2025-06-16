// 布局算法文件 - 从React Masonry源码翻译
interface Position {
  top: number
  left: number
  width: number
  height: number
}

interface LayoutParams {
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  gutter: number
  items: any[]
  layout: string
  measurementStore: any
  positionStore?: any
  minCols: number
  width: number
  idealColumnWidth?: number
  _getColumnSpanConfig?: (item: any) => number | { [key: string]: number }
  _getResponsiveModuleConfigForSecondItem?: (item: any) => number | { min: number, max: number } | undefined
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => { itemsBatchSize?: number, whitespaceThreshold?: number, iterationsLimit?: number }
  _enableSectioningPosition?: boolean
  originalItems?: any[]
}

// 获取列数
export function getColumnCount({ gutter, columnWidth = 236, width, minCols }: {
  gutter: number
  columnWidth?: number
  width: number
  minCols: number
}): number {
  return Math.max(Math.floor(width / (columnWidth + gutter)), minCols)
}

// 获取最短列索引
export function getShortestColumnIndex(heights: number[]): number {
  return heights.length ? heights.indexOf(Math.min(...heights)) : 0
}

// 获取默认位置
export function getDefaultPosition(columnWidth: number, height: number = Infinity): Position {
  return {
    top: -9999,
    left: -9999,
    width: columnWidth,
    height
  }
}

// 检查布局是否是flexible
function isFlexibleLayout({ layout, width }: { layout: string, width: number | null }): boolean {
  return layout === 'flexible' || (layout === 'serverRenderedFlexible' && width !== null)
}

// 计算中心偏移
function getCenterOffset({ align, columnCount, columnWidthAndGutter, gutter, layout, rawItemCount, width }: {
  align?: string
  columnCount: number
  columnWidthAndGutter: number
  gutter: number
  layout: string
  rawItemCount: number
  width: number
}): number {
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

// 获取列跨度
function getColumnSpan({ columnCount, item, firstItem, isFlexibleWidthItem, _getColumnSpanConfig, responsiveModuleConfigForSecondItem }: {
  columnCount: number
  item: any
  firstItem: any
  isFlexibleWidthItem: boolean
  _getColumnSpanConfig?: (item: any) => number | { [key: string]: number }
  responsiveModuleConfigForSecondItem?: number | { min: number, max: number }
}): number {
  if (!_getColumnSpanConfig) return 1

  const columnSpanConfig = _getColumnSpanConfig(item)
  const breakpoint = columnCount <= 2 ? 'sm' :
                    columnCount <= 4 ? 'md' :
                    columnCount <= 6 ? '_lg1' :
                    columnCount <= 8 ? 'lg' : 'xl'

  let span = getBreakpointValue(columnSpanConfig, breakpoint)

  if (isFlexibleWidthItem && firstItem) {
    const firstItemSpan = getBreakpointValue(_getColumnSpanConfig(firstItem), breakpoint)
    span = typeof responsiveModuleConfigForSecondItem === 'number'
      ? responsiveModuleConfigForSecondItem
      : responsiveModuleConfigForSecondItem
        ? Math.max(responsiveModuleConfigForSecondItem.min, Math.min(responsiveModuleConfigForSecondItem.max, columnCount - firstItemSpan))
        : 1
  }

  return Math.min(span, columnCount)
}

// 获取响应式断点值
function getBreakpointValue(config: number | { [key: string]: number }, breakpoint: string): number {
  if (typeof config === 'number') return config
  return config[breakpoint] ?? 1
}

// 基础布局算法
export function basicLayout(params: LayoutParams) {
  const {
    align = 'center',
    columnWidth = 236,
    gutter,
    layout = 'basic',
    minCols = 2,
    width,
    measurementStore,
    positionStore,
    _getColumnSpanConfig,
    _getResponsiveModuleConfigForSecondItem,
    _getModulePositioningConfig,
    _enableSectioningPosition,
    _logTwoColWhitespace,
    originalItems = []
  } = params

  return (items: any[]): Position[] => {
    if (width === null) {
      return items.map(() => getDefaultPosition(columnWidth))
    }

    const columnWidthAndGutter = columnWidth + gutter
    const columnCount = getColumnCount({ gutter, columnWidth, width, minCols })
    const columnHeights = Array(columnCount).fill(0)
    const centerOffset = getCenterOffset({
      align,
      columnCount,
      columnWidthAndGutter,
      gutter,
      layout,
      rawItemCount: items.length,
      width
    })

    if (_getColumnSpanConfig) {
      return multiColumnLayout({
        items,
        columnWidth,
        columnCount,
        centerOffset,
        gutter,
        measurementStore,
        positionStore,
        originalItems,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
        _logTwoColWhitespace
      })
    }

    return items.map(item => {
      const height = measurementStore.get(item)
      if (height === null) {
        return getDefaultPosition(columnWidth)
      }

      const heightWithGutter = height > 0 ? height + gutter : 0
      const shortestColumnIndex = getShortestColumnIndex(columnHeights)
      const top = columnHeights[shortestColumnIndex]
      const left = shortestColumnIndex * columnWidthAndGutter + centerOffset

      columnHeights[shortestColumnIndex] += heightWithGutter

      return {
        top,
        left,
        width: columnWidth,
        height
      }
    })
  }
}

// 均匀行布局
export function uniformRowLayout({ cache, columnWidth = 236, gutter, flexible = false, minCols = 3, width }: {
  cache: any
  columnWidth?: number
  gutter: number
  flexible?: boolean
  minCols?: number
  width: number | null
}) {
  return (items: any[]): Position[] => {
    if (width === null) {
      return items.map(() => getDefaultPosition(columnWidth))
    }

    const layoutConfig = getUniformRowLayoutConfig({ columnWidth, flexible, gutter, minCols, width })
    const rowHeights: number[] = []

    return items.map((item, index) => {
      const height = cache.get(item)
      if (height === null) {
        return getDefaultPosition(layoutConfig.columnWidth)
      }

      const columnIndex = index % layoutConfig.columnCount
      const rowIndex = Math.floor(index / layoutConfig.columnCount)

      if (columnIndex === 0 || height > (rowHeights[rowIndex] || 0)) {
        rowHeights[rowIndex] = height
      }

      return {
        top: rowIndex > 0 ? rowHeights.slice(0, rowIndex).reduce((sum, h) => sum + h + gutter, 0) : 0,
        left: columnIndex * layoutConfig.columnWidthAndGutter,
        width: layoutConfig.columnWidth,
        height
      }
    })
  }
}

// 获取均匀行布局配置
function getUniformRowLayoutConfig({ columnWidth, flexible, gutter, minCols, width }: {
  columnWidth: number
  flexible: boolean
  gutter: number
  minCols: number
  width: number
}) {
  if (flexible) {
    const columnCount = getColumnCount({ gutter, columnWidth, width, minCols })
    const actualColumnWidth = Math.floor(width / columnCount) - gutter
    const columnWidthAndGutter = actualColumnWidth + gutter
    return {
      columnCount,
      columnWidth: actualColumnWidth,
      columnWidthAndGutter
    }
  }

  const columnWidthAndGutter = columnWidth + gutter
  return {
    columnCount: getColumnCount({ gutter, columnWidth, width, minCols }),
    columnWidth,
    columnWidthAndGutter
  }
}

// Flexible布局
export function flexibleLayout(params: LayoutParams) {
  const {
    width,
    gutter,
    minCols = 2,
    measurementStore,
    positionStore,
    originalItems = [],
    _getColumnSpanConfig,
    _getModulePositioningConfig,
    _getResponsiveModuleConfigForSecondItem,
    _enableSectioningPosition,
    _logTwoColWhitespace,
    idealColumnWidth = 240
  } = params

  if (width === null) {
    return (items: any[]): Position[] => items.map(() => ({
      top: Infinity,
      left: Infinity,
      width: Infinity,
      height: Infinity
    }))
  }

  const columnCount = getColumnCount({ gutter, columnWidth: idealColumnWidth, width, minCols })
  const columnWidth = width / columnCount - gutter
  const columnWidthAndGutter = columnWidth + gutter
  const centerOffset = gutter / 2

  return (items: any[]): Position[] => {
    const columnHeights = Array(columnCount).fill(0)

    if (_getColumnSpanConfig) {
      return multiColumnLayout({
        items,
        columnWidth,
        columnCount,
        centerOffset,
        gutter,
        measurementStore,
        positionStore,
        originalItems,
        _getColumnSpanConfig,
        _getModulePositioningConfig,
        _getResponsiveModuleConfigForSecondItem,
        _enableSectioningPosition,
        _logTwoColWhitespace
      })
    }

    return items.reduce((positions, item) => {
      const height = measurementStore.get(item)
      if (height === null) {
        positions.push({
          top: Infinity,
          left: Infinity,
          width: columnWidth,
          height: Infinity
        })
        return positions
      }

      const heightWithGutter = height > 0 ? height + gutter : 0
      const shortestColumnIndex = getShortestColumnIndex(columnHeights)
      const top = columnHeights[shortestColumnIndex]

      columnHeights[shortestColumnIndex] = (columnHeights[shortestColumnIndex] || 0) + heightWithGutter

      positions.push({
        top,
        left: shortestColumnIndex * columnWidthAndGutter + centerOffset,
        width: columnWidth,
        height
      })

      return positions
    }, [] as Position[])
  }
}

// 多列布局（复杂算法）
function multiColumnLayout({
  items,
  columnWidth,
  columnCount,
  centerOffset,
  gutter,
  measurementStore,
  positionStore,
  originalItems,
  _getColumnSpanConfig,
  _getResponsiveModuleConfigForSecondItem,
  _getModulePositioningConfig,
  _enableSectioningPosition,
  _logTwoColWhitespace
}: {
  items: any[]
  columnWidth: number
  columnCount: number
  centerOffset: number
  gutter: number
  measurementStore: any
  positionStore?: any
  originalItems: any[]
  _getColumnSpanConfig: (item: any) => number | { [key: string]: number }
  _getResponsiveModuleConfigForSecondItem?: (item: any) => number | { min: number, max: number } | undefined
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => { itemsBatchSize?: number, whitespaceThreshold?: number, iterationsLimit?: number }
  _enableSectioningPosition?: boolean
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
}): Position[] {
  const firstItem = originalItems[0]
  const secondItem = originalItems[1]
  const responsiveModuleConfigForSecondItem = _getResponsiveModuleConfigForSecondItem?.(secondItem)
  const checkIsFlexibleWidthItem = (item: any) => !!responsiveModuleConfigForSecondItem && item === secondItem

  // 检查所有项目是否都有测量值
  if (!items.every(item => measurementStore.has(item))) {
    return items.map(item => {
      const span = getColumnSpan({
        columnCount,
        firstItem,
        isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
        item,
        responsiveModuleConfigForSecondItem,
        _getColumnSpanConfig
      })

      if (span > 1) {
        const spanWidth = Math.min(span, columnCount)
        return getDefaultPosition(columnWidth * spanWidth + gutter * (spanWidth - 1))
      }
      return getDefaultPosition(columnWidth)
    })
  }

  const columnWidthAndGutter = columnWidth + gutter

  // 为已缓存的项目初始化列高度
  const initialHeights = getInitialHeights({
    centerOffset,
    checkIsFlexibleWidthItem,
    columnCount,
    columnWidthAndGutter,
    firstItem,
    gutter,
    items,
    positionStore,
    responsiveModuleConfigForSecondItem,
    _getColumnSpanConfig
  })

  const measuredItems = items.filter(item => positionStore?.has(item))
  const unmeasuredItems = items.filter(item => !positionStore?.has(item))

  // 处理多列项目
  const multiColumnItems = unmeasuredItems.filter(item =>
    getColumnSpan({
      columnCount,
      firstItem,
      isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
      item,
      responsiveModuleConfigForSecondItem,
      _getColumnSpanConfig
    }) > 1
  )

  const layoutConfig = {
    centerOffset,
    columnWidth,
    columnWidthAndGutter,
    gutter,
    measurementStore,
    positionStore
  }

  if (multiColumnItems.length > 0) {
    // 复杂的多列布局逻辑
    return processMultiColumnLayout({
      items,
      measuredItems,
      unmeasuredItems,
      multiColumnItems,
      initialHeights,
      layoutConfig,
      columnCount,
      firstItem,
      checkIsFlexibleWidthItem,
      responsiveModuleConfigForSecondItem,
      _getColumnSpanConfig,
      _getModulePositioningConfig,
      _enableSectioningPosition,
      _logTwoColWhitespace
    })
  }

  // 简单布局
  const { positions } = layoutItems({
    items,
    heights: initialHeights,
    ...layoutConfig
  })

  positions.forEach(({ item, position }: any) => {
    positionStore?.set(item, position)
  })

  return extractPositions(positions)
}

// 获取初始列高度
function getInitialHeights({
  centerOffset,
  checkIsFlexibleWidthItem,
  columnCount,
  columnWidthAndGutter,
  firstItem,
  gutter,
  items,
  positionStore,
  responsiveModuleConfigForSecondItem,
  _getColumnSpanConfig
}: any): number[] {
  const heights = Array(columnCount).fill(0)

  items.forEach((item: any) => {
    const cachedPosition = positionStore?.get(item)
    if (cachedPosition) {
      const columnIndex = Math.round((cachedPosition.left - centerOffset) / columnWidthAndGutter)
      const span = getColumnSpan({
        columnCount,
        firstItem,
        isFlexibleWidthItem: checkIsFlexibleWidthItem(item),
        item,
        responsiveModuleConfigForSecondItem,
        _getColumnSpanConfig
      })
      const bottomPosition = cachedPosition.top + cachedPosition.height + gutter

      for (let i = columnIndex; i < columnIndex + span; i++) {
        if (bottomPosition > heights[i]) {
          heights[i] = bottomPosition
        }
      }
    }
  })

  return heights
}

// 处理多列布局
function processMultiColumnLayout(params: any): Position[] {
  // 这是一个简化版本，实际的React源码中有更复杂的优化算法
  const { items, layoutConfig } = params
  const { positions } = layoutItems({
    items,
    heights: Array(params.columnCount).fill(0),
    ...layoutConfig
  })

  positions.forEach(({ item, position }: any) => {
    params.layoutConfig.positionStore?.set(item, position)
  })

  return extractPositions(positions)
}

// 布局项目
function layoutItems({
  centerOffset,
  columnWidth,
  columnWidthAndGutter,
  gutter,
  heights,
  items,
  measurementStore,
  positionStore
}: any) {
  const resultHeights = [...heights]

  const positions = items.reduce((acc: any[], item: any) => {
    const height = measurementStore.get(item)
    const cachedPosition = positionStore?.get(item)

    if (cachedPosition) {
      return [...acc, { item, position: cachedPosition }]
    }

    if (height != null) {
      const shortestColumnIndex = getShortestColumnIndex(resultHeights)
      const top = resultHeights[shortestColumnIndex]

      resultHeights[shortestColumnIndex] += height > 0 ? height + gutter : 0

      return [...acc, {
        item,
        position: {
          top,
          left: shortestColumnIndex * columnWidthAndGutter + centerOffset,
          width: columnWidth,
          height
        }
      }]
    }

    return acc
  }, [])

  return {
    positions,
    heights: resultHeights
  }
}

// 提取位置信息
function extractPositions(positions: { position: Position }[]): Position[] {
  return positions.map(({ position }) => position)
}

// 主要布局函数
export function getLayoutAlgorithm(params: LayoutParams) {
  const { layout, width } = params

  if (!isFlexibleLayout({ layout, width })) {
    if (layout.startsWith('uniformRow')) {
      return uniformRowLayout({
        cache: params.measurementStore,
        columnWidth: params.columnWidth,
        gutter: params.gutter,
        flexible: layout === 'uniformRowFlexible',
        minCols: params.minCols,
        width
      })
    }
    return basicLayout(params)
  }

  return flexibleLayout(params)
}
