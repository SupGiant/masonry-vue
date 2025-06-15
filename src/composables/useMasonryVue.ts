import type { VNode } from 'vue'

// 测量存储类，用于缓存项目高度
class MeasurementStore {
  private measurements = new Map<any, number>()

  has(item: any): boolean {
    return this.measurements.has(item)
  }

  get(item: any): number | undefined {
    return this.measurements.get(item)
  }

  set(item: any, height: number): void {
    this.measurements.set(item, height)
  }

  reset(): void {
    this.measurements.clear()
  }
}


function createMeasurementStore() {
  return new MeasurementStore()
}

function debounce<T extends (...args: any[]) => any>(func: T, delay: number = 100): T & { clearTimeout: () => void } {
  let timeoutId: number | null = null

  const debouncedFunction = (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      func(...args)
    }, delay)
  }

  const result = debouncedFunction as T & { clearTimeout: () => void }
  result.clearTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  return result
}


function throttle<T extends (...args: any[]) => any>(func: T, delay: number = 100): T & { clearTimeout: () => void } {
  let lastCallTime: number | undefined
  let timeoutId: number | undefined

  const throttledFunction = (...args: any[]) => {
    const currentTime = Date.now()

    if (lastCallTime !== undefined && currentTime - lastCallTime < delay) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        lastCallTime = currentTime
        func(...args)
      }, delay - (currentTime - (lastCallTime ?? 0)))
    } else {
      lastCallTime = currentTime
      func(...args)
    }
  }

  const result = throttledFunction as T & { clearTimeout: () => void }
  result.clearTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  return result
}


// 一些获取滚动位置的工具元素

function getWindowHeight(e: Window | HTMLElement) {
  return e instanceof Window ? window.innerHeight : e.clientHeight
}
function getScrollTop() {
  return void 0 !== window.scrollY ? window.scrollY : document.documentElement && void 0 !== document.documentElement.scrollTop ? document.documentElement.scrollTop : 0
}
function getContainerScrollOffset(e: HTMLElement| Window) {
  return e === window || e instanceof Window ? getScrollTop() : e.scrollTop - e.getBoundingClientRect().top
}

/**
 * 渲染/获取滚动容器元素
 * @param element 可以是Window对象、HTMLElement对象，或返回这些对象的函数
 * @returns 返回实际的滚动容器元素（Window或HTMLElement）
 */
function renderElement(element: Window | HTMLElement | (() => Window | HTMLElement) | null): Window | HTMLElement | null {
  if (!element) return null
  return typeof element === 'function' ? element() : element
}


export {
  MeasurementStore,
  debounce,
  throttle,
  getWindowHeight,
  getScrollTop,
  getContainerScrollOffset,
  renderElement,
  createMeasurementStore
}
