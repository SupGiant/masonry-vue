import { defineComponent, type VNode } from "vue"


class WeakCache {
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

export function createMeasurementStore() {
  return new WeakCache()
}


export interface MasonryProps {
  // 基础配置
  items: any[] // 数据源
  columnWidth?: number // 最低列宽
  minCols?: number
  maxCols?: number
  gutterWidth?: number // 列间距

  // 渲染函数
  renderItem: (props: {
    data: any,
    itemIdx: number,
    isMeasuring: boolean, // 是否正在测量
  }) => VNode

  // 滚动和虚拟化配置
  virtualize: boolean
  virtualBoundsTop?: number // 虚拟化顶部边界
  virtualBoundsBottom?: number // 虚拟化底部边界
  virtualBufferFactor?: number // 虚拟化缓冲因子

  // 缓存
  measurementStore?: WeakCache // 测量缓存
  positionsStore?: WeakCache // 位置缓存

  // 高级配置
  dynamicHeights: boolean // 是否开启动态测量高度

  // todo 其它未实现的参数包括 item占据的列数之类的

}



export default defineComponent({
  name: 'Masonry',
  props: {
    columnWidth: {
      type: Number,
      default: 240
    }
  }
})