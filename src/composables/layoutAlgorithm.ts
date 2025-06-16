import type { Position } from './measurementStore'
import type { MeasurementStore } from './measurementStore'
import {
  calculateColumnCount,
  getMinHeightIndex,
  calculateCenterOffset,
  createDefaultPosition,
  toCSSValue
} from './utils'

/**
 * 布局参数接口
 */
export interface LayoutOptions {
  align?: 'start' | 'center' | 'end'
  columnWidth?: number
  gutter?: number
  layout?: 'basic' | 'basicCentered' | 'flexible' | 'uniformRow'
  minCols?: number
  width?: number
  measurementStore: MeasurementStore
}

/**
 * 布局结果接口
 */
export interface LayoutResult {
  positions: Position[]
  totalHeight: number
}

/**
 * 基础瀑布流布局算法
 */
export function basicLayout(
  items: any[],
  options: LayoutOptions
): LayoutResult {
  const {
    align = 'center',
    columnWidth = 236,
    gutter = 14,
    layout = 'basic',
    minCols = 2,
    width,
    measurementStore
  } = options

  // 如果没有宽度，返回默认位置
  if (!width) {
    return {
      positions: items.map(() => createDefaultPosition(columnWidth)),
      totalHeight: 0
    }
  }

  const columnWidthAndGutter = columnWidth + gutter
  const columnCount = calculateColumnCount({
    gutter,
    columnWidth,
    width,
    minCols
  })

  const heights = Array(columnCount).fill(0)
  const centerOffset = calculateCenterOffset({
    align,
    columnCount,
    columnWidthAndGutter,
    gutter,
    layout,
    rawItemCount: items.length,
    width
  })

  const positions: Position[] = []

  for (const item of items) {
    const height = measurementStore.get(item)

    if (height == null) {
      positions.push(createDefaultPosition(columnWidth))
      continue
    }

    const itemHeight = height > 0 ? height + gutter : 0
    const columnIndex = getMinHeightIndex(heights)
    const top = heights[columnIndex]
    const left = columnIndex * columnWidthAndGutter + centerOffset

    heights[columnIndex] += itemHeight

    positions.push({
      top,
      left,
      width: columnWidth,
      height
    })
  }

  const totalHeight = Math.max(...heights, 0)

  return {
    positions,
    totalHeight
  }
}

/**
 * 灵活布局算法 - 根据容器宽度动态调整列宽
 */
export function flexibleLayout(
  items: any[],
  options: LayoutOptions
): LayoutResult {
  const {
    gutter = 14,
    minCols = 2,
    width,
    measurementStore,
    columnWidth: idealColumnWidth = 240
  } = options

  if (!width) {
    return {
      positions: items.map(() => ({
        top: Infinity,
        left: Infinity,
        width: Infinity,
        height: Infinity
      })),
      totalHeight: 0
    }
  }

  const columnCount = calculateColumnCount({
    gutter,
    columnWidth: idealColumnWidth,
    width,
    minCols
  })

  const actualColumnWidth = width / columnCount - gutter
  const columnWidthAndGutter = actualColumnWidth + gutter
  const centerOffset = gutter / 2

  const heights = Array(columnCount).fill(0)
  const positions: Position[] = []

  for (const item of items) {
    const height = measurementStore.get(item)

    if (height == null) {
      positions.push({
        top: Infinity,
        left: Infinity,
        width: actualColumnWidth,
        height: Infinity
      })
      continue
    }

    const itemHeight = height > 0 ? height + gutter : 0
    const columnIndex = getMinHeightIndex(heights)
    const top = heights[columnIndex]
    const left = columnIndex * columnWidthAndGutter + centerOffset

    heights[columnIndex] += itemHeight

    positions.push({
      top,
      left,
      width: actualColumnWidth,
      height
    })
  }

  const totalHeight = Math.max(...heights, 0)

  return {
    positions,
    totalHeight
  }
}

/**
 * 统一行高布局算法
 */
export function uniformRowLayout(
  items: any[],
  options: LayoutOptions & { flexible?: boolean }
): LayoutResult {
  const {
    columnWidth = 236,
    gutter = 14,
    width,
    minCols = 3,
    measurementStore,
    flexible = false
  } = options

  if (!width) {
    return {
      positions: items.map(() => createDefaultPosition(columnWidth)),
      totalHeight: 0
    }
  }

  let actualColumnWidth: number
  let columnWidthAndGutter: number
  let columnCount: number

  if (flexible) {
    columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols
    })
    actualColumnWidth = Math.floor(width / columnCount) - gutter
    columnWidthAndGutter = actualColumnWidth + gutter
  } else {
    actualColumnWidth = columnWidth
    columnWidthAndGutter = columnWidth + gutter
    columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols
    })
  }

  const rowHeights: number[] = []
  const positions: Position[] = []

  items.forEach((item, index) => {
    const height = measurementStore.get(item)

    if (height == null) {
      positions.push(createDefaultPosition(actualColumnWidth))
      return
    }

    const columnIndex = index % columnCount
    const rowIndex = Math.floor(index / columnCount)

    // 记录每行的最大高度
    if (columnIndex === 0 || height > (rowHeights[rowIndex] || 0)) {
      rowHeights[rowIndex] = height
    }

    const top = rowIndex > 0
      ? rowHeights.slice(0, rowIndex).reduce((sum, h) => sum + h + gutter, 0)
      : 0
    const left = columnIndex * columnWidthAndGutter

    positions.push({
      top,
      left,
      width: actualColumnWidth,
      height
    })
  })

  const totalHeight = rowHeights.length > 0
    ? rowHeights.reduce((sum, h) => sum + h + gutter, 0) - gutter
    : 0

  return {
    positions,
    totalHeight
  }
}

/**
 * 主布局函数 - 根据布局类型选择相应算法
 */
export function calculateLayout(
  items: any[],
  options: LayoutOptions
): LayoutResult {
  const { layout = 'basic' } = options

  switch (layout) {
    case 'flexible':
      return flexibleLayout(items, options)
    case 'uniformRow':
      return uniformRowLayout(items, options)
    case 'basic':
    case 'basicCentered':
    default:
      return basicLayout(items, options)
  }
}
