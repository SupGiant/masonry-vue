// 统一行布局的类型定义和实现

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface MeasurementCache {
  get(item: any): number | null;
}

interface UniformRowLayoutConfig {
  cache: MeasurementCache;
  columnWidth?: number;
  flexible?: boolean;
  gutter: number;
  width: number | null;
  minCols?: number;
}

interface ColumnCalculationResult {
  columnWidth: number;
  columnWidthAndGutter: number;
  columnCount: number;
}

/**
 * 计算列数的辅助函数
 */
function calculateColumnCount({
  gutter,
  columnWidth,
  width,
  minCols
}: {
  gutter: number;
  columnWidth: number;
  width: number;
  minCols: number;
}): number {
  return Math.max(
    Math.floor(width / (columnWidth + gutter)),
    minCols
  );
}

/**
 * 计算列的宽度和数量
 */
function calculateColumns({
  columnWidth,
  flexible,
  gutter,
  minCols,
  width
}: {
  columnWidth: number;
  flexible: boolean;
  gutter: number;
  minCols: number;
  width: number;
}): ColumnCalculationResult {
  if (flexible) {
    // 灵活模式：根据容器宽度调整列宽
    const columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols
    });

    const adjustedColumnWidth = Math.floor(width / columnCount) - gutter;
    const columnWidthAndGutter = adjustedColumnWidth + gutter;

    return {
      columnCount,
      columnWidth: adjustedColumnWidth,
      columnWidthAndGutter
    };
  } else {
    // 固定模式：使用预设的列宽
    const columnWidthAndGutter = columnWidth + gutter;
    const columnCount = calculateColumnCount({
      gutter,
      columnWidth,
      width,
      minCols
    });

    return {
      columnCount,
      columnWidth,
      columnWidthAndGutter
    };
  }
}

/**
 * 创建默认位置对象（用于未测量的项目）
 */
function createDefaultPosition(columnWidth: number): Position {
  return {
    top: -9999,
    left: -9999,
    width: columnWidth,
    height: Infinity
  };
}

/**
 * 创建统一行高布局函数
 * 这种布局将项目按行排列，每行的高度由该行最高的项目决定
 */
export function createUniformRowLayout({
  cache,
  columnWidth = 236,
  flexible = false,
  gutter,
  width,
  minCols = 3
}: UniformRowLayoutConfig) {

  return function layoutItems<T>(items: T[]): Position[] {
    // 如果没有容器宽度，返回默认位置
    if (width === null) {
      return items.map(() => createDefaultPosition(columnWidth));
    }

    // 计算列的配置
    const {
      columnWidth: actualColumnWidth,
      columnWidthAndGutter,
      columnCount
    } = calculateColumns({
      columnWidth,
      flexible,
      gutter,
      minCols,
      width
    });

    // 存储每行的最大高度
    const rowMaxHeights: number[] = [];

    return items.map((item, index) => {
      // 从缓存中获取项目高度
      const itemHeight = cache.get(item);

      // 如果没有高度信息，返回默认位置
      if (itemHeight === null) {
        return createDefaultPosition(actualColumnWidth);
      }

      // 计算项目在网格中的位置
      const columnIndex = index % columnCount;
      const rowIndex = Math.floor(index / columnCount);

      // 更新当前行的最大高度
      if (columnIndex === 0 || itemHeight > (rowMaxHeights[rowIndex] || 0)) {
        rowMaxHeights[rowIndex] = itemHeight;
      }

      // 计算项目的实际位置
      const top = rowIndex > 0
        ? rowMaxHeights.slice(0, rowIndex).reduce((sum, height) => sum + height + gutter, 0)
        : 0;

      const left = columnIndex * columnWidthAndGutter;

      return {
        top,
        left,
        width: actualColumnWidth,
        height: itemHeight
      };
    });
  };
}

// 使用示例：
/*
const layoutFunction = createUniformRowLayout({
  cache: measurementCache,
  columnWidth: 250,
  flexible: true,
  gutter: 16,
  width: 1200,
  minCols: 2
});

const positions = layoutFunction(items);
*/
