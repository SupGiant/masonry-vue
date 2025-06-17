// 瀑布流多列布局处理器
// 将原始的混淆代码转换为可读的TypeScript版本

// 类型定义
interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ItemPosition {
  item: any;
  position: Position;
}

interface MeasurementCache {
  get(item: any): number | undefined;
  has(item: any): boolean;
  set(item: any, value: number): void;
}

interface PositionCache {
  get(item: any): Position | undefined;
  has(item: any): boolean;
  set(item: any, position: Position): void;
}

interface ColumnSpanConfig {
  sm?: number;
  md?: number;
  lg?: number;
  _lg1?: number;
  xl?: number;
}

interface ResponsiveModuleConfig {
  min: number;
  max: number;
}

interface ModulePositioningConfig {
  itemsBatchSize?: number;
  whitespaceThreshold?: number;
  iterationsLimit?: number;
}

interface MultiColumnLayoutParams {
  items: any[];
  gutter?: number;
  columnWidth?: number;
  columnCount?: number;
  centerOffset?: number;
  logWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void;
  measurementCache: MeasurementCache;
  positionCache: PositionCache;
  originalItems: any[];
  _getColumnSpanConfig: (item: any) => number | ColumnSpanConfig;
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => ModulePositioningConfig;
  _getResponsiveModuleConfigForSecondItem: (item: any) => ResponsiveModuleConfig | number | undefined;
  _enableSectioningPosition?: boolean;
}

interface LayoutResult {
  heights: number[];
  positions: ItemPosition[];
}

interface OptimizationNode {
  id: any;
  heights: number[];
  positions: ItemPosition[];
  section?: number;
}

interface OptimizationResult {
  winningNode: OptimizationNode;
  numberOfIterations: number;
}

interface MultiColumnPositionResult {
  heights: number[];
  position: Position;
  additionalWhitespace: number[] | null;
}

// 辅助函数：获取默认位置
function getDefaultPosition(columnWidth: number): Position {
  return {
    top: -9999,
    left: -9999,
    width: columnWidth,
    height: Infinity
  };
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
  const columnSpanConfig = _getColumnSpanConfig(item);
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
    const firstItemSpan = _getColumnSpanConfig(firstItem);
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
  positionCache: PositionCache;
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

// 辅助函数：查找最短列索引
function findShortestColumnIndex(heights: number[]): number {
  return heights.length ? heights.indexOf(Math.min(...heights)) : 0;
}

// 辅助函数：定位单列项目
function positionSingleColumnItems(params: {
  centerOffset: number;
  columnWidth: number;
  columnWidthAndGutter: number;
  gutter: number;
  heights: number[];
  items: any[];
  measurementCache: MeasurementCache;
  positionCache?: PositionCache;
}): LayoutResult {
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
  measurementCache: MeasurementCache;
  fitsFirstRow: boolean;
}): MultiColumnPositionResult {
  const { centerOffset, columnWidth, columnWidthAndGutter, gutter, item, columnSpan, measurementCache, fitsFirstRow } = params;
  const heights = [...params.heights];
  const itemHeight = measurementCache.get(item);

  if (itemHeight == null) {
    return {
      additionalWhitespace: null,
      heights,
      position: getDefaultPosition(columnWidth)
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
  measurementCache: MeasurementCache;
  positionCache: PositionCache;
}): OptimizationResult {
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
  measurementCache: MeasurementCache;
  positionCache: PositionCache;
}): LayoutResult {
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
  const positionedItemsSet = new Set(allPositionedItems.map(({ item }) => item));

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
  allPositions.forEach(({ item, position }) => {
    positionCache.set(item, position);
  });

  return {
    positions: prevPositions.concat(allPositions),
    heights: finalHeights
  };
}

// 主要的多列布局处理函数
export function handleMultiColumnLayout(params: MultiColumnLayoutParams): Position[] {
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
  if (!items.every(item => measurementCache.has(item))) {
    return items.map(item => {
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
        return getDefaultPosition(columnWidth * spanWidth + gutter * (spanWidth - 1));
      }
      return getDefaultPosition(columnWidth);
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
  const cachedItems = items.filter(item => positionCache.has(item));
  const uncachedItems = items.filter(item => !positionCache.has(item));
  const multiColumnItems = uncachedItems.filter(item =>
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
