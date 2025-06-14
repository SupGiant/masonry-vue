
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


// 防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: number
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }) as T
}

// 节流函数
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}

export {
  MeasurementStore,
  debounce,
  throttle,
}