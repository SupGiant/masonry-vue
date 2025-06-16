import {
  defineComponent,
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUpdated,
  onUnmounted,
  nextTick,
  type VNode,
  type Ref,
  type PropType
} from "vue"
import { getLayoutAlgorithm } from './layout-algorithms'


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

export function createMeasurementStore(): WeakCache {
  return new WeakCache()
}


export interface MasonryProps {
  // 基础配置
  items: any[] // 数据源
  columnWidth?: number // 最低列宽，默认236
  minCols?: number // 最小列数，默认3
  maxCols?: number
  gutterWidth?: number // 列间距，默认14
  align?: 'start' | 'center' | 'end' // 对齐方式，默认center

  // 布局类型
  layout?: 'basic' | 'basicCentered' | 'flexible' | 'serverRenderedFlexible' | 'uniformRow' | 'uniformRowFlexible'

  // 渲染函数
  renderItem: (props: {
    data: any,
    itemIdx: number,
    isMeasuring: boolean, // 是否正在测量
  }) => VNode

  // 滚动和虚拟化配置
  virtualize?: boolean | ((item: any) => boolean)
  virtualBoundsTop?: number // 虚拟化顶部边界
  virtualBoundsBottom?: number // 虚拟化底部边界
  virtualBufferFactor?: number // 虚拟化缓冲因子，默认0.7

  // 缓存
  measurementStore?: WeakCache // 测量缓存
  positionStore?: WeakCache // 位置缓存

  // 高级配置
  _dynamicHeights?: boolean // 是否开启动态测量高度

  // 滚动容器
  scrollContainer?: () => HTMLElement | Window

  // 加载更多
  loadItems?: (params: { from: number }) => void

  // 内部配置函数
  _getColumnSpanConfig?: (item: any) => number | { [key: string]: number }
  _getResponsiveModuleConfigForSecondItem?: (item: any) => number | { min: number, max: number } | undefined
  _getModulePositioningConfig?: (columnCount: number, columnSpan: number) => { itemsBatchSize?: number, whitespaceThreshold?: number, iterationsLimit?: number }
  _logTwoColWhitespace?: (whitespace: number[], iterations: number, columnSpan: number) => void
  _enableSectioningPosition?: boolean
}


interface Position {
  top: number
  left: number
  width: number
  height: number
}


function debounce<T extends (...args: any[]) => any>(func: T, wait: number = 100): T & { clearTimeout: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      func(...args)
    }, wait)
  }) as T & { clearTimeout: () => void }

  debounced.clearTimeout = () => {
    if (timeout) clearTimeout(timeout)
  }

  return debounced
}


function throttle<T extends (...args: any[]) => any>(func: T, wait: number = 100): T & { clearTimeout: () => void } {
  let lastCall: number | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now()
    if (lastCall !== undefined && now - lastCall < wait) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        lastCall = now
        func(...args)
      }, wait - (now - (lastCall ?? 0)))
    } else {
      lastCall = now
      func(...args)
    }
  }) as T & { clearTimeout: () => void }

  throttled.clearTimeout = () => {
    if (timeout) clearTimeout(timeout)
  }

  return throttled
}


function getScrollPos(element: HTMLElement | Window): number {
  if (element === window || element instanceof Window) {
    return window.scrollY !== undefined ? window.scrollY :
           (document.documentElement && document.documentElement.scrollTop !== undefined) ?
           document.documentElement.scrollTop : 0
  }
  return element.scrollTop
}


function getElementHeight(element: HTMLElement | Window): number {
  return element instanceof Window ? window.innerHeight : element.clientHeight
}


function getRelativeScrollTop(element: HTMLElement | Window): number {
  if (element === window || element instanceof Window) {
    return getScrollPos(element)
  }
  return element.scrollTop - element.getBoundingClientRect().top
}


function toPx(value: number): number | undefined {
  return value !== Infinity ? value : undefined
}


function getScrollContainer(scrollContainer?: () => HTMLElement | Window): HTMLElement | Window | null {
  return scrollContainer ? scrollContainer() : null
}


// 这些函数已在layout-algorithms.ts中定义并导入


const ResizeObserverWrapper = defineComponent({
  name: 'ResizeObserverWrapper',
  props: {
    resizeObserver: {
      type: Object as () => ResizeObserver | undefined,
      required: false
    },
    idx: {
      type: Number,
      required: true
    }
  },
  setup(props, { slots }) {
    const elementRef = ref<HTMLElement>()

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
      <div
        ref={elementRef}
        data-grid-item-idx={props.idx}
      >
        {slots.default?.()}
      </div>
    )
  }
})


const ScrollContainer = defineComponent({
  name: 'ScrollContainer',
  props: {
    scrollContainer: {
      type: Function as unknown as () => (() => HTMLElement | Window),
      required: true
    },
    onScroll: {
      type: Function as unknown as () => ((event: Event) => void),
      required: true
    }
  },
  setup(props, { slots, expose }) {
    const scrollContainerRef = ref<HTMLElement | Window>()

    const getScrollContainerRef = () => scrollContainerRef.value

    const handleScroll = (event: Event) => {
      props.onScroll(event)
    }

    const updateScrollContainer = (element: HTMLElement | Window) => {
      if (scrollContainerRef.value) {
        scrollContainerRef.value.removeEventListener('scroll', handleScroll)
      }
      scrollContainerRef.value = element
      scrollContainerRef.value.addEventListener('scroll', handleScroll)
    }

    onMounted(() => {
      const element = getScrollContainer(props.scrollContainer)
      if (element) {
        updateScrollContainer(element)
      }
    })

    onUpdated(() => {
      const element = getScrollContainer(props.scrollContainer)
      if (element && element !== scrollContainerRef.value) {
        updateScrollContainer(element)
      }
    })

    onUnmounted(() => {
      if (scrollContainerRef.value) {
        scrollContainerRef.value.removeEventListener('scroll', handleScroll)
      }
    })

    expose({
      getScrollContainerRef
    })

    return () => slots.default?.()
  }
})


const FetchMore = defineComponent({
  name: 'FetchMore',
  props: {
    containerHeight: {
      type: Number,
      required: true
    },
    fetchMore: {
      type: Function as PropType<() => void>,
      required: true
    },
    isAtEnd: {
      type: Boolean,
      default: false
    },
    isFetching: {
      type: Boolean,
      required: true
    },
    scrollHeight: {
      type: Number,
      required: true
    },
    scrollTop: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const checkFetchMore = () => {
      if (!props.isAtEnd && !props.isFetching && props.fetchMore &&
          props.scrollTop + 3 * props.containerHeight > props.scrollHeight) {
        props.fetchMore()
      }
    }

    watch(() => [props.scrollTop, props.containerHeight, props.scrollHeight, props.isFetching], () => {
      const timer = setTimeout(checkFetchMore)
      return () => clearTimeout(timer)
    }, { immediate: true })

    return () => null
  }
})


export default defineComponent({
  name: 'Masonry',
  props: {
    items: {
      type: Array as () => any[],
      required: true
    },
    columnWidth: {
      type: Number,
      default: 236
    },
    minCols: {
      type: Number,
      default: 3
    },
    align: {
      type: String as () => 'start' | 'center' | 'end',
      default: 'center'
    },
    layout: {
      type: String as () => 'basic' | 'basicCentered' | 'flexible' | 'serverRenderedFlexible' | 'uniformRow' | 'uniformRowFlexible',
      default: 'basic'
    },
    gutterWidth: {
      type: Number
    },
    renderItem: {
      type: Function as PropType<(props: { data: any, itemIdx: number, isMeasuring: boolean }) => VNode>,
      required: true
    },
    virtualize: {
      type: [Boolean, Function] as PropType<boolean | ((item: any) => boolean)>,
      default: false
    },
    virtualBoundsTop: {
      type: Number
    },
    virtualBoundsBottom: {
      type: Number
    },
    virtualBufferFactor: {
      type: Number,
      default: 0.7
    },
    measurementStore: {
      type: Object as () => WeakCache
    },
    positionStore: {
      type: Object as () => WeakCache
    },
    _dynamicHeights: {
      type: Boolean,
      default: false
    },
    scrollContainer: {
      type: Function as PropType<() => HTMLElement | Window>
    },
    loadItems: {
      type: Function as PropType<(params: { from: number }) => void>
    },
    _getColumnSpanConfig: {
      type: Function as PropType<(item: any) => number | { [key: string]: number }>
    },
    _getResponsiveModuleConfigForSecondItem: {
      type: Function as PropType<(item: any) => number | { min: number, max: number } | undefined>
    },
    _getModulePositioningConfig: {
      type: Function as PropType<(columnCount: number, columnSpan: number) => { itemsBatchSize?: number, whitespaceThreshold?: number, iterationsLimit?: number }>
    },
    _logTwoColWhitespace: {
      type: Function as PropType<(whitespace: number[], iterations: number, columnSpan: number) => void>
    },
    _enableSectioningPosition: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const gridWrapperRef = ref<HTMLElement>()
    // 不能删除 InstanceType<typeof ScrollContainer>
    const scrollContainerRef = ref<HTMLElement>()

    const insertAnimationFrame = ref<number | null>(null)
    const maxHeight = ref(0)
    const containerHeight = ref(0)
    const containerOffset = ref(0)
    const resizeObserver = ref<ResizeObserver>()

    const defaultGutter = computed(() => {
      let defaultValue = 14
      if (props.layout && (props.layout === 'flexible' || props.layout === 'serverRenderedFlexible')) {
        defaultValue = 0
      }
      return props.gutterWidth ?? defaultValue
    })

    const measurementStore = props.measurementStore || createMeasurementStore()
    const positionStore = props.positionStore || createMeasurementStore()

    const state = reactive({
      gutter: defaultGutter.value,
      hasPendingMeasurements: props.items.some(item => !!item && !measurementStore.has(item)),
      isFetching: false,
      items: props.items,
      measurementStore: measurementStore as WeakCache,
      scrollTop: 0,
      width: undefined as number | undefined
    })

    if (props._dynamicHeights && typeof window !== 'undefined' && positionStore) {
      resizeObserver.value = new ResizeObserver((entries) => {
        let hasChanged = false
        entries.forEach(({ target, contentRect }) => {
          const itemIdx = Number(target.getAttribute('data-grid-item-idx'))
          if (typeof itemIdx === 'number') {
            const item = state.items[itemIdx]
            const newHeight = contentRect.height
            hasChanged = updateItemHeight({
              items: state.items,
              changedItem: item,
              newHeight,
              positionStore,
              measurementStore: state.measurementStore as WeakCache,
              gutter: state.gutter
            }) || hasChanged
          }
        })
        if (hasChanged) {
          nextTick()
        }
      })
    }

    const handleResize = debounce(() => {
      if (gridWrapperRef.value) {
        state.width = gridWrapperRef.value.getBoundingClientRect().width
      }
    }, 300)

    const updateScrollPosition = throttle(() => {
      if (!scrollContainerRef.value) return
      const element = (scrollContainerRef.value as any).getScrollContainerRef()
      if (element) {
        state.scrollTop = getScrollPos(element)
      }
    })

    const measureContainerAsync = debounce(() => {
      measureContainer()
    }, 0)

    const measureContainer = () => {
      if (scrollContainerRef.value) {
        const element = (scrollContainerRef.value as any).getScrollContainerRef()
        if (element) {
          containerHeight.value = getElementHeight(element)
          const gridElement = gridWrapperRef.value
          if (gridElement instanceof HTMLElement) {
            const relativeScrollTop = getRelativeScrollTop(element)
            containerOffset.value = gridElement.getBoundingClientRect().top + relativeScrollTop
          }
        }
      }
    }

    const fetchMore = () => {
      const { loadItems, items } = props
      if (loadItems && typeof loadItems === 'function') {
        state.isFetching = true
        loadItems({ from: items.length })
      }
    }

    const renderMasonryComponent = (item: any, itemIdx: number, position: Position) => {
      const { renderItem, scrollContainer, virtualize, virtualBoundsTop, virtualBoundsBottom, virtualBufferFactor } = props
      const { top, left, width, height } = position

      let shouldRender = true
      if (scrollContainer && virtualBufferFactor) {
        const bufferHeight = containerHeight.value * virtualBufferFactor
        const scrollOffset = state.scrollTop - containerOffset.value
        const visibleBottom = virtualBoundsBottom ?
          scrollOffset + containerHeight.value + virtualBoundsBottom :
          scrollOffset + containerHeight.value + bufferHeight

        shouldRender = !(position.top + position.height < (virtualBoundsTop ? scrollOffset - virtualBoundsTop : scrollOffset - bufferHeight) ||
                        position.top > visibleBottom)
      }

      const isRTL = (document?.dir) === "rtl"
      const itemElement = (
        <div
          class={['Masonry__Item', 'Masonry__Item__Mounted'].join(' ')}
          data-grid-item={true}
          role="listitem"
          style={{
            top: 0,
            ...(isRTL ? { right: 0 } : { left: 0 }),
            transform: `translateX(${isRTL ? -1 * left : left}px) translateY(${top}px)`,
            WebkitTransform: `translateX(${isRTL ? -1 * left : left}px) translateY(${top}px)`,
            width: toPx(width) + 'px',
            height: toPx(height) + 'px'
          }}
          key={`item-${itemIdx}`}
        >
          <ResizeObserverWrapper
            idx={itemIdx}
            resizeObserver={resizeObserver.value}
          >
            {renderItem({
              data: item,
              itemIdx,
              isMeasuring: false
            })}
          </ResizeObserverWrapper>
        </div>
      )

      const shouldVirtualize = typeof virtualize === 'function' ? virtualize(item) : virtualize
      return shouldVirtualize ? (shouldRender ? itemElement : null) : itemElement
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
      measureContainer()

      let scrollTop = state.scrollTop
      if (scrollContainerRef.value) {
        const element = scrollContainerRef.value
        if (element) {
          scrollTop = getScrollPos(element)
        }
      }

      state.scrollTop = scrollTop
      state.width = gridWrapperRef.value ? gridWrapperRef.value.getBoundingClientRect().width : state.width
    })

    onUpdated(() => {
      const { items } = props
      const { measurementStore } = state

      measureContainerAsync()

      const newWidth = gridWrapperRef.value?.getBoundingClientRect().width
      if (newWidth && newWidth !== state.width) {
        measurementStore.reset()
        positionStore.reset()
        state.width = newWidth
      }

      const hasPendingMeasurements = items.some(item => !!item && !measurementStore.has(item))

      if (hasPendingMeasurements !== state.hasPendingMeasurements) {
        insertAnimationFrame.value = requestAnimationFrame(() => {
          state.hasPendingMeasurements = hasPendingMeasurements
        })
      }
    })

    onUnmounted(() => {
      if (insertAnimationFrame.value) {
        cancelAnimationFrame(insertAnimationFrame.value)
      }
      measureContainerAsync.clearTimeout()
      handleResize.clearTimeout()
      updateScrollPosition.clearTimeout()
      window.removeEventListener('resize', handleResize)
    })

    watch(() => props.items, (newItems, oldItems) => {
      const { measurementStore } = state
      const hasPendingMeasurements = newItems.some(item => !measurementStore.has(item))

      let itemsChanged = false
      for (let i = 0; i < newItems.length; i++) {
        if (oldItems?.[i] === undefined || newItems[i] !== oldItems[i] || newItems.length < (oldItems?.length || 0)) {
          itemsChanged = true
          break
        }
      }

      if (itemsChanged || newItems.length === 0 && (oldItems?.length || 0) > 0) {
        state.hasPendingMeasurements = hasPendingMeasurements
        state.items = newItems
        state.isFetching = false
      } else if (hasPendingMeasurements !== state.hasPendingMeasurements) {
        state.hasPendingMeasurements = hasPendingMeasurements
        state.items = newItems
      }
    }, { immediate: true })

    const reflow = () => {
      const { measurementStore } = props
      if (measurementStore) {
        measurementStore.reset()
      }
      state.measurementStore.reset()
      positionStore.reset()
      measureContainer()
      nextTick()
    }

    const renderContent = () => {
      const {
        align = 'center',
        columnWidth = 236,
        items,
        layout = 'basic',
        minCols = 3,
        renderItem,
        scrollContainer,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
        _logTwoColWhitespace
      } = props

      const { gutter, hasPendingMeasurements, measurementStore, width } = state

      if (width === undefined && hasPendingMeasurements) {
        return (
          <div
            ref={gridWrapperRef}
            class="Masonry"
            role="list"
            style={{
              height: 0,
              width: '100%'
            }}
          >
            {items.filter(Boolean).map((item, idx) => {
              const columnSpan = _getColumnSpanConfig ? _getColumnSpanConfig(item) : 1
              return (
                <div
                  key={idx}
                  ref={(el) => {
                    if (el && layout !== 'flexible') {
                      el = el as HTMLElement
                      measurementStore.set(item, el.clientHeight)
                    }
                  }}
                  class="static"
                  data-column-span={typeof columnSpan === 'number' ? columnSpan : btoa(JSON.stringify(columnSpan))}
                  data-grid-item={true}
                  role="listitem"
                  style={{
                    top: 0,
                    left: 0,
                    transform: 'translateX(0px) translateY(0px)',
                    WebkitTransform: 'translateX(0px) translateY(0px)',
                    width: (layout === 'flexible' || layout === 'serverRenderedFlexible' || typeof columnSpan === 'object')
                      ? undefined
                      : toPx(typeof columnSpan === 'number' && columnWidth && gutter
                          ? columnWidth * columnSpan + gutter * (columnSpan - 1)
                          : columnWidth) + 'px'
                  }}
                >
                  {renderItem({
                    data: item,
                    itemIdx: idx,
                    isMeasuring: false
                  })}
                </div>
              )
            })}
          </div>
        )
      }

      if (width === undefined) {
        return (
          <div
            ref={gridWrapperRef}
            style={{ width: '100%' }}
          />
        )
      }

      const filteredItems = items.filter(item => item && measurementStore.has(item))
      const unfilteredItems = items.filter(item => !measurementStore.has(item))

      // 使用完整的布局算法
      const layoutAlgorithm = getLayoutAlgorithm({
        align,
        columnWidth,
        gutter,
        items: filteredItems,
        layout,
        measurementStore,
        positionStore,
        minCols,
        width,
        idealColumnWidth: columnWidth,
        _getColumnSpanConfig,
        _getResponsiveModuleConfigForSecondItem,
        _getModulePositioningConfig,
        _enableSectioningPosition,
        _logTwoColWhitespace,
        originalItems: props.items
      })

      const positions: Position[] = layoutAlgorithm(filteredItems)

      const maxPositionHeight = positions.length ? Math.max(...positions.map(p => p.top + p.height), 0) : 0
      if (maxPositionHeight !== maxHeight.value) {
        maxHeight.value = maxPositionHeight
      }

      return (
        <div ref={gridWrapperRef} style={{ width: '100%' }}>
          <div
            class="Masonry"
            role="list"
            style={{
              height: maxHeight.value,
              width: width
            }}
          >
            {filteredItems.map((item, idx) => {
              const position = positionStore.get(item) || positions[idx]
              return renderMasonryComponent(item, idx, position)
            })}

            {unfilteredItems.slice(0, minCols).map((item, idx) => {
              const actualIdx = filteredItems.length + idx
              const position: Position = {
                top: 0,
                left: idx * (columnWidth + gutter),
                width: columnWidth,
                height: 0
              }

              return (
                <div
                  key={`measuring-${actualIdx}`}
                  ref={(el) => {
                    if (el) {
                      el = el as HTMLElement
                      measurementStore.set(item, el.clientHeight)
                    }
                  }}
                  role="listitem"
                  style={{
                    visibility: 'hidden',
                    position: 'absolute',
                    top: toPx(position.top) + 'px',
                    left: toPx(position.left) + 'px',
                    width: toPx(position.width) + 'px',
                    height: toPx(position.height) + 'px'
                  }}
                >
                  {renderItem({
                    data: item,
                    itemIdx: actualIdx,
                    isMeasuring: true
                  })}
                </div>
              )
            })}
          </div>

          {scrollContainer && (
            <FetchMore
              containerHeight={containerHeight.value}
              fetchMore={fetchMore}
              isFetching={state.isFetching || state.hasPendingMeasurements}
              scrollHeight={maxHeight.value + containerOffset.value}
              scrollTop={state.scrollTop}
            />
          )}
        </div>
      )
    }

    return () => {
      const content = renderContent()

      return props.scrollContainer ? (
        <ScrollContainer
          ref={scrollContainerRef}
          onScroll={updateScrollPosition}
          scrollContainer={props.scrollContainer}
        >
          {content}
        </ScrollContainer>
      ) : content
    }
  }
})


function updateItemHeight({ items, changedItem, newHeight, positionStore, measurementStore, gutter }: {
  items: any[]
  changedItem: any
  newHeight: number
  positionStore: WeakCache
  measurementStore: WeakCache
  gutter: number
}): boolean {
  const position = positionStore.get(changedItem)
  if (!position || newHeight === 0 || Math.floor(position.height) === Math.floor(newHeight)) {
    return false
  }

  measurementStore.set(changedItem, newHeight)
  positionStore.set(changedItem, {
    ...position,
    height: newHeight
  })

  return true
}
