/**
 * 测量存储类 - 用于缓存元素尺寸和位置信息
 * 使用WeakMap避免内存泄漏
 */
export class MeasurementStore {
  private map: WeakMap<any, number>

  constructor() {
    this.map = new WeakMap()
  }

  get(item: any): number | undefined {
    return this.map.get(item)
  }

  has(item: any): boolean {
    return this.map.has(item)
  }

  set(item: any, value: number): void {
    this.map.set(item, value)
  }

  reset(): void {
    this.map = new WeakMap()
  }
}

/**
 * 位置信息接口
 */
export interface Position {
  top: number
  left: number
  width: number
  height: number
}

/**
 * 位置存储类 - 用于缓存元素位置信息
 */
export class PositionStore {
  private map: WeakMap<any, Position>

  constructor() {
    this.map = new WeakMap()
  }

  get(item: any): Position | undefined {
    return this.map.get(item)
  }

  has(item: any): boolean {
    return this.map.has(item)
  }

  set(item: any, position: Position): void {
    this.map.set(item, position)
  }

  reset(): void {
    this.map = new WeakMap()
  }
}
