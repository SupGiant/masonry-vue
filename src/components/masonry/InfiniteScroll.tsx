import { defineComponent, watchEffect, type PropType } from 'vue'

interface InfiniteScrollProps {
  containerHeight: number
  fetchMore?: () => void
  isAtEnd?: boolean
  isFetching: boolean
  scrollHeight: number
  scrollTop: number
}

/**
 * 无限滚动检测组件
 * 当用户滚动到接近底部时自动触发加载更多数据
 */
export const InfiniteScroll = defineComponent({
  name: 'InfiniteScroll',
  props: {
    containerHeight: {
      type: Number,
      required: true,
    },
    fetchMore: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    isAtEnd: {
      type: Boolean,
      default: false,
    },
    isFetching: {
      type: Boolean,
      required: true,
    },
    scrollHeight: {
      type: Number,
      required: true,
    },
    scrollTop: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    // 检查是否需要加载更多数据的函数
    const checkLoadMore = () => {
      const { containerHeight, fetchMore, isAtEnd, isFetching, scrollHeight, scrollTop } = props

      // 条件检查：
      // 1. 没有到达数据末尾 (!isAtEnd)
      // 2. 当前没在加载数据 (!isFetching)
      // 3. 有加载更多的回调函数 (fetchMore)
      // 4. 滚动位置接近底部 (scrollTop + 3 * containerHeight > scrollHeight)
      if (!isAtEnd && !isFetching && fetchMore && scrollTop + 3 * containerHeight > scrollHeight) {
        fetchMore()
      }
    }

    // 使用 watchEffect 监听 props 变化，类似于 React 的 useEffect
    watchEffect((onCleanup) => {
      // 使用 setTimeout 避免频繁触发，提供防抖效果
      const timeoutId = setTimeout(checkLoadMore, 0)

      // 清理函数，在组件卸载或依赖变化时清除定时器
      onCleanup(() => {
        clearTimeout(timeoutId)
      })
    })

    // 不渲染任何内容，只负责逻辑处理
    return () => null
  },
})

export default InfiniteScroll
