class dj extends i.Component {
  static createMeasurementStore() {
    return new dx()
  }
  constructor(e) {
    super(e),
      (this.insertAnimationFrame = null),
      (this.maxHeight = 0),
      (this.handleResize = i1(() => {
        this.gridWrapper &&
          this.setState({
            width: this.gridWrapper.getBoundingClientRect().width,
          })
      }, 300)),
      (this.updateScrollPosition = dz(() => {
        if (!this.scrollContainer) return
        let e = this.scrollContainer.getScrollContainerRef()
        e &&
          this.setState({
            scrollTop: dS(e),
          })
      })),
      (this.measureContainerAsync = i1(() => {
        this.measureContainer()
      }, 0)),
      (this.setGridWrapperRef = (e) => {
        this.gridWrapper = e
      }),
      (this.setScrollContainerRef = (e) => {
        this.scrollContainer = e
      }),
      (this.fetchMore = () => {
        let { loadItems: e, items: o } = this.props
        e &&
          'function' == typeof e &&
          this.setState(
            {
              isFetching: !0,
            },
            () =>
              e({
                from: o.length,
              }),
          )
      }),
      (this.renderMasonryComponent = (e, o, a) => {
        let r,
          {
            renderItem: t,
            scrollContainer: l,
            virtualize: c,
            virtualBoundsTop: i,
            virtualBoundsBottom: d,
            virtualBufferFactor: s,
          } = this.props,
          { top: u, left: b, width: g, height: m } = a
        if (l && s) {
          let e = this.containerHeight * s,
            o = this.state.scrollTop - this.containerOffset,
            t = d ? o + this.containerHeight + d : o + this.containerHeight + e
          r = !(a.top + a.height < (i ? o - i : o - e) || a.top > t)
        } else r = !0

        // 是否是rtl
        let f = (null == document ? void 0 : document.dir) === 'rtl',
          p = (0, n.jsx)(
            'div',
            {
              className: [i5.Masonry__Item, i5.Masonry__Item__Mounted].join(' '),
              'data-grid-item': !0,
              role: 'listitem',
              style: Object.assign(
                Object.assign(
                  {
                    top: 0,
                  },
                  f
                    ? {
                        right: 0,
                      }
                    : {
                        left: 0,
                      },
                ),
                {
                  transform: `translateX(${f ? -1 * b : b}px) translateY(${u}px)`,
                  WebkitTransform: `translateX(${f ? -1 * b : b}px) translateY(${u}px)`,
                  width: dC(g),
                  height: dC(m),
                },
              ),
              children: (0, n.jsx)(dh, {
                idx: o,
                resizeObserver: this.resizeObserver,
                children: t({
                  data: e,
                  itemIdx: o,
                  isMeasuring: !1,
                }),
              }),
            },
            `item-${o}`,
          )
        return ('function' == typeof c ? c(e) : c) ? (r && p) || null : p
      }),
      (this.containerHeight = 0),
      (this.containerOffset = 0)
    let o = e.measurementStore || dj.createMeasurementStore()
    this.positionStore = e.positionStore || dj.createMeasurementStore()
    let { layout: a, gutterWidth: r } = e,
      // 默认间距
      t = 14
    a && ('flexible' === a || 'serverRenderedFlexible' === a) && (t = 0)
    let l = null != r ? r : t
    ;(this.resizeObserver =
      e._dynamicHeights && 'undefined' != typeof window && this.positionStore
        ? new ResizeObserver((e) => {
            let o = !1
            e.forEach(({ target: e, contentRect: a }) => {
              let r = Number(e.getAttribute('data-grid-item-idx'))
              if ('number' == typeof r) {
                let e = this.state.items[r],
                  t = a.height
                o =
                  i3({
                    items: this.state.items,
                    changedItem: e,
                    newHeight: t,
                    positionStore: this.positionStore,
                    measurementStore: this.state.measurementStore,
                    gutter: l,
                  }) || o
              }
            }),
              o && this.forceUpdate()
          })
        : void 0),
      (this.state = {
        gutter: l,
        hasPendingMeasurements: e.items.some((e) => !!e && !o.has(e)),
        isFetching: !1,
        items: e.items,
        measurementStore: o,
        scrollTop: 0,
        width: void 0,
      })
  }
  componentDidMount() {
    window.addEventListener('resize', this.handleResize), this.measureContainer()
    let { scrollTop: e } = this.state
    if (null != this.scrollContainer) {
      let o = this.scrollContainer.getScrollContainerRef()
      o && (e = dS(o))
    }
    this.setState((o) => ({
      scrollTop: e,
      width: this.gridWrapper ? this.gridWrapper.getBoundingClientRect().width : o.width,
    }))
  }
  componentDidUpdate(e, o) {
    let { items: a } = this.props,
      { measurementStore: r } = this.state
    this.measureContainerAsync(),
      null != o.width && this.state.width !== o.width && (r.reset(), this.positionStore.reset())
    let t = a.some((e) => !!e && !r.has(e))
    ;(t || t !== this.state.hasPendingMeasurements || null == o.width) &&
      (this.insertAnimationFrame = requestAnimationFrame(() => {
        this.setState({
          hasPendingMeasurements: t,
        })
      }))
  }
  componentWillUnmount() {
    this.insertAnimationFrame && cancelAnimationFrame(this.insertAnimationFrame),
      this.measureContainerAsync.clearTimeout(),
      this.handleResize.clearTimeout(),
      this.updateScrollPosition.clearTimeout(),
      window.removeEventListener('resize', this.handleResize)
  }

  // 生命周期函数，如果props发生变化，则更新状态
  static getDerivedStateFromProps(e, o) {
    let { items: a } = e,
      { measurementStore: r } = o,
      t = a.some((e) => !r.has(e))
    for (let e = 0; e < a.length; e += 1)
      if (void 0 === o.items[e] || a[e] !== o.items[e] || a.length < o.items.length)
        return {
          hasPendingMeasurements: t,
          items: a,
          isFetching: !1,
        }
    return 0 === a.length && o.items.length > 0
      ? {
          hasPendingMeasurements: t,
          items: a,
          isFetching: !1,
        }
      : t !== o.hasPendingMeasurements
        ? {
            hasPendingMeasurements: t,
            items: a,
          }
        : null
  }
  measureContainer() {
    if (null != this.scrollContainer) {
      let { scrollContainer: e } = this,
        o = e.getScrollContainerRef()
      if (o) {
        this.containerHeight = getElementHeight(o)
        let e = this.gridWrapper
        if (e instanceof HTMLElement) {
          let a = getScrollOffset(o)
          this.containerOffset = e.getBoundingClientRect().top + a
        }
      }
    }
  }
  reflow() {
    let { measurementStore: e } = this.props
    e && e.reset(),
      this.state.measurementStore.reset(),
      this.positionStore.reset(),
      this.measureContainer(),
      this.forceUpdate()
  }
  render() {
    let e,
      {
        align: o = 'center',
        columnWidth: a,
        items: r,
        layout: t = 'basic',
        minCols: l,
        renderItem: c,
        scrollContainer: i,
        _logTwoColWhitespace: d,
        _getColumnSpanConfig: s,
        _getResponsiveModuleConfigForSecondItem: u,
        _getModulePositioningConfig: b,
        _enableSectioningPosition: g,
      } = this.props,
      { gutter: m, hasPendingMeasurements: f, measurementStore: p, width: h } = this.state,
      { positionStore: x } = this,
      v = df({
        align: o,
        columnWidth: a,
        gutter: m,
        items: r,
        layout: t,
        measurementStore: p,
        positionStore: x,
        minCols: l,
        width: h,
        _getColumnSpanConfig: s,
        _getResponsiveModuleConfigForSecondItem: u,
        _logTwoColWhitespace: d,
        _getModulePositioningConfig: b,
        _enableSectioningPosition: g,
      })
    if (null == h && f)
      e = (0, n.jsx)('div', {
        ref: this.setGridWrapperRef,
        className: i5.Masonry,
        role: 'list',
        style: {
          height: 0,
          width: '100%',
        },
        children: r.filter(Boolean).map((e, o) => {
          var r
          let l = null != (r = null == s ? void 0 : s(e)) ? r : 1
          return (0, n.jsx)(
            'div',
            {
              ref: (o) => {
                o && 'flexible' !== t && p.set(e, o.clientHeight)
              },
              className: 'static',
              'data-column-span': 'number' == typeof l ? l : btoa(JSON.stringify(l)),
              'data-grid-item': !0,
              role: 'listitem',
              style: {
                top: 0,
                left: 0,
                transform: 'translateX(0px) translateY(0px)',
                WebkitTransform: 'translateX(0px) translateY(0px)',
                width:
                  'flexible' === t || 'serverRenderedFlexible' === t || 'object' == typeof l
                    ? void 0
                    : dC('number' == typeof l && null != a && null != m ? a * l + m * (l - 1) : a),
              },
              children: c({
                data: e,
                itemIdx: o,
                isMeasuring: !1,
              }),
            },
            o,
          )
        }),
      })
    else if (null == h)
      e = (0, n.jsx)('div', {
        ref: this.setGridWrapperRef,
        style: {
          width: '100%',
        },
      })
    else {
      let o,
        t,
        i = r.filter((e) => e && p.has(e)),
        d = r.filter((e) => !p.has(e)),
        g = s && d.find((e) => 1 !== s(e))
      if (g) {
        o = d.indexOf(g)
        let e = i6({
            gutter: m,
            columnWidth: a,
            width: h,
            minCols: l,
          }),
          n = u && r[1] ? u(r[1]) : void 0,
          c = !!n && g === r[1],
          i = dt({
            columnCount: e,
            firstItem: r[0],
            isFlexibleWidthItem: c,
            item: g,
            responsiveModuleConfigForSecondItem: n,
            _getColumnSpanConfig: s,
          })
        if (!c) {
          let { itemsBatchSize: o } = (null == b ? void 0 : b(e, i)) || {
            itemsBatchSize: 5,
          }
          t = o
        }
      }
      let f = t && o && o > 0 && o <= t ? t + 1 : l,
        k = r.filter((e) => e && !p.has(e)).slice(0, f),
        y = v(i),
        w = v(k),
        M = y.length
          ? Math.max(...y.map((e) => e.top + e.height), 0 === k.length ? 0 : this.maxHeight)
          : 0
      M !== this.maxHeight && (this.maxHeight = M),
        (e = (0, n.jsxs)('div', {
          ref: this.setGridWrapperRef,
          style: {
            width: '100%',
          },
          children: [
            (0, n.jsxs)('div', {
              className: i5.Masonry,
              role: 'list',
              style: {
                height: M,
                width: h,
              },
              children: [
                i.map((e, o) => {
                  var a
                  return this.renderMasonryComponent(e, o, null != (a = x.get(e)) ? a : y[o])
                }),
                k.map((e, o) => {
                  let a = i.length + o,
                    r = w[o]
                  return (0, n.jsx)(
                    'div',
                    {
                      ref: (o) => {
                        o && p.set(e, o.clientHeight)
                      },
                      role: 'listitem',
                      style: {
                        visibility: 'hidden',
                        position: 'absolute',
                        top: dC(r.top),
                        left: dC(r.left),
                        width: dC(r.width),
                        height: dC(r.height),
                      },
                      children: c({
                        data: e,
                        itemIdx: a,
                        isMeasuring: !0,
                      }),
                    },
                    `measuring-${a}`,
                  )
                }),
              ],
            }),
            this.scrollContainer &&
              (0, n.jsx)(i2, {
                containerHeight: this.containerHeight,
                fetchMore: this.fetchMore,
                isFetching: this.state.isFetching || this.state.hasPendingMeasurements,
                scrollHeight: M + this.containerOffset,
                scrollTop: this.state.scrollTop,
              }),
          ],
        }))
    }
    return i
      ? (0, n.jsx)(dk, {
          ref: this.setScrollContainerRef,
          onScroll: this.updateScrollPosition,
          scrollContainer: i,
          children: e,
        })
      : e
  }
}
;(dj.defaultProps = {
  columnWidth: 236,
  align: 'center',
  minCols: 3,
  layout: 'basic',
  loadItems: () => {},
  virtualBufferFactor: 0.7,
  virtualize: !1,
}),
  (dj.displayName = 'Masonry')

class dx {
  constructor() {
    this.map = new WeakMap()
  }
  get(e) {
    return this.map.get(e)
  }
  has(e) {
    return this.map.has(e)
  }
  set(e, o) {
    this.map.set(e, o)
  }
  reset() {
    this.map = new WeakMap()
  }
}
/// 防抖函数
function i1(e, o = 100) {
  let a = null,
    r = (...r) => {
      a && clearTimeout(a),
        (a = setTimeout(() => {
          ;(a = null), e(...r)
        }, o))
    }
  return (
    (r.clearTimeout = () => {
      a && clearTimeout(a)
    }),
    r
  )
}

function dz(e, o = 100) {
  let a,
    r,
    t = (...t) => {
      let n = Date.now()
      void 0 !== a && n - a < o
        ? (clearTimeout(r),
          (r = setTimeout(
            () => {
              ;(a = n), e(...t)
            },
            o - (n - (null != a ? a : 0)),
          )))
        : ((a = n), e(...t))
    }
  return (
    (t.clearTimeout = () => {
      r && clearTimeout(r)
    }),
    t
  )
}

function dS(e) {
  return e === window || e instanceof Window ? getScollTop() : e.scrollTop
}

let dC = (e) => {
  if (e) return e !== 1 / 0 ? e : void 0
}

function i3({
  items: e,
  changedItem: o,
  newHeight: a,
  positionStore: r,
  measurementStore: t,
  gutter: n,
}) {
  var l
  let c,
    i = r.get(o),
    d = dj.createMeasurementStore()
  if (
    (e.forEach((e) => {
      let o = r.get(e)
      d.set(e, Object.assign({}, o))
    }),
    !i || 0 === a || Math.floor(i.height) === Math.floor(a))
  )
    return !1
  let { top: s, left: u, width: b, height: g } = i,
    m =
      ((l = e.slice(0, 10)),
      (c = 1 / 0),
      l.forEach((e) => {
        let o = r.get(e)
        o && (c = Math.min(c, o.width))
      }),
      c),
    f = [
      {
        left: u,
        right: u + b,
        delta: a - g,
      },
    ],
    p = e
      .map((e) => {
        let o = r.get(e)
        return o && o.top >= i.top + i.height
          ? {
              item: e,
              position: o,
            }
          : void 0
      })
      .filter((e) => !!e)
      .sort((e, o) => e.position.top - o.position.top)
  return (
    t.set(o, a),
    r.set(o, {
      top: s,
      left: u,
      width: b,
      height: a,
    }),
    p.reduce(
      (o, { item: a, position: t }) => {
        if (i4(o, t)) {
          if (t.width > m) {
            let o = (function ({ multicolumCurrentPosition: e, allPreviousItems: o, gutter: a }) {
              let r
              return (
                o.forEach(({ item: o, position: a }) => {
                  let t = e.left,
                    n = e.left + e.width,
                    l = a.left,
                    c = a.left + a.width,
                    i = (t <= l && n > l) || (t < c && n >= c)
                  return (
                    i &&
                      ((r && a.top + a.height > r.position.top + r.position.height) || !r) &&
                      (r = {
                        item: o,
                        position: a,
                      }),
                    i
                  )
                }),
                r.position.top + r.position.height - e.top + a
              )
            })({
              multicolumCurrentPosition: t,
              allPreviousItems: e
                .map((e) => {
                  let o = d.get(e),
                    a = r.get(e)
                  return o && a && o.top < t.top
                    ? {
                        item: e,
                        position: a,
                      }
                    : void 0
                })
                .filter((e) => !!e)
                .sort((e, o) => e.position.top - o.position.top),
              gutter: n,
            })
            f.push({
              left: t.left,
              right: t.left + t.width,
              delta: o,
            })
          }
          let l = (function (e, o) {
            for (let a = e.length - 1; a >= 0; a -= 1) {
              let { left: r, right: t, delta: n } = e[a]
              if (
                i4(
                  {
                    left: r,
                    right: t,
                  },
                  o,
                )
              )
                return n
            }
            return 0
          })(f, t)
          return (
            r.set(
              a,
              Object.assign(Object.assign({}, t), {
                top: t.top + l,
              }),
            ),
            {
              left: Math.min(o.left, t.left),
              right: Math.max(o.right, t.left + t.width),
            }
          )
        }
        return o
      },
      {
        left: u,
        right: u + b,
      },
    ),
    !0
  )
}

function getElementHeight(e) {
  return e instanceof Window ? window.innerHeight : e.clientHeight
}
function getScollTop() {
  return void 0 !== window.scrollY
    ? window.scrollY
    : document.documentElement && void 0 !== document.documentElement.scrollTop
      ? document.documentElement.scrollTop
      : 0
}
function getScrollOffset(e) {
  return e === window || e instanceof Window
    ? getScollTop()
    : e.scrollTop - e.getBoundingClientRect().top
}

function i6({ gutter: e, columnWidth: o, width: a, minCols: r }) {
  return Math.max(Math.floor(a / ((null != o ? o : 236) + (null != e ? e : 14))), r)
}

function dt(e) {
  let {
      columnCount: o,
      item: a,
      firstItem: r,
      isFlexibleWidthItem: t,
      _getColumnSpanConfig: n,
      responsiveModuleConfigForSecondItem: l,
    } = e,
    c = n(a),
    i = o <= 2 ? 'sm' : o <= 4 ? 'md' : o <= 6 ? '_lg1' : o <= 8 ? 'lg' : 'xl',
    d = dr(c, i)
  if (t) {
    let e = dr(n(r), i)
    d = 'number' == typeof l ? l : l ? Math.max(l.min, Math.min(l.max, o - e)) : 1
  }
  return Math.min(d, o)
}

class dk extends i.Component {
  constructor() {
    super(...arguments),
      (this.getScrollContainerRef = () => this.scrollContainer),
      (this.handleScroll = (e) => {
        this.props.onScroll(e)
      })
  }
  componentDidMount() {
    let e = getElement(this.props.scrollContainer)
    e && this.updateScrollContainer(e)
  }
  componentDidUpdate() {
    let e = getElement(this.props.scrollContainer)
    e && e !== this.scrollContainer && this.updateScrollContainer(e)
  }
  componentWillUnmount() {
    this.scrollContainer && this.scrollContainer.removeEventListener('scroll', this.handleScroll)
  }
  updateScrollContainer(e) {
    this.scrollContainer && this.scrollContainer.removeEventListener('scroll', this.handleScroll),
      (this.scrollContainer = e),
      this.scrollContainer.addEventListener('scroll', this.handleScroll)
  }
  render() {
    return i.Children.only(this.props.children)
  }
}

function i2({
  containerHeight: e,
  fetchMore: o,
  isAtEnd: a,
  isFetching: r,
  scrollHeight: t,
  scrollTop: n,
}) {
  let l = () => {
    !a && !r && o && n + 3 * e > t && o()
  }
  return (
    (0, i.useEffect)(() => {
      let e = setTimeout(l)
      return () => {
        clearTimeout(e)
      }
    }),
    null
  )
}

function df({
  align: e,
  columnWidth: o,
  gutter: a,
  items: r,
  layout: t,
  measurementStore: n,
  minCols: l,
  positionStore: c,
  width: i,
  _getColumnSpanConfig: d,
  _getResponsiveModuleConfigForSecondItem: s,
  _logTwoColWhitespace: u,
  _getModulePositioningConfig: b,
  _enableSectioningPosition: g,
}) {
  return !(function ({ layout: e, width: o }) {
    return 'flexible' === e || ('serverRenderedFlexible' === e && null !== o)
  })({
    layout: t,
    width: i,
  })
    ? t.startsWith('uniformRow')
      ? dm({
          cache: n,
          columnWidth: o,
          gutter: a,
          flexible: 'uniformRowFlexible' === t,
          minCols: l,
          width: i,
        })
      : ds({
          align: e,
          measurementCache: n,
          positionCache: c,
          columnWidth: o,
          gutter: a,
          layout: t,
          logWhitespace: u,
          minCols: l,
          rawItemCount: r.length,
          width: i,
          originalItems: r,
          _getColumnSpanConfig: d,
          _getResponsiveModuleConfigForSecondItem: s,
          _getModulePositioningConfig: b,
          _enableSectioningPosition: g,
        })
    : db({
        gutter: a,
        measurementCache: n,
        positionCache: c,
        minCols: l,
        idealColumnWidth: o,
        width: i,
        originalItems: r,
        logWhitespace: u,
        _getColumnSpanConfig: d,
        _getResponsiveModuleConfigForSecondItem: s,
        _getModulePositioningConfig: b,
        _enableSectioningPosition: g,
      })
}
let dp = 'undefined' != typeof window ? i.useLayoutEffect : i.useEffect
function dh({ resizeObserver: e, idx: o, children: a }) {
  let r = (0, i.useRef)(null)
  return (
    dp(() => {
      let o = r.current
      return (
        e && o && e.observe(o),
        () => {
          e && o && e.unobserve(o)
        }
      )
    }, [e]),
    (0, n.jsx)('div', {
      ref: r,
      'data-grid-item-idx': o,
      children: a,
    })
  )
}

let ds = (e) => {
  var {
      align: o,
      columnWidth: a = 236,
      gutter: r,
      layout: t,
      minCols: n = 2,
      rawItemCount: l,
      width: c,
      measurementCache: i,
      _getColumnSpanConfig: d,
      _getModulePositioningConfig: s,
      _getResponsiveModuleConfigForSecondItem: u,
      _enableSectioningPosition: g,
    } = e,
    m = b(e, [
      'align',
      'columnWidth',
      'gutter',
      'layout',
      'minCols',
      'rawItemCount',
      'width',
      'measurementCache',
      '_getColumnSpanConfig',
      '_getModulePositioningConfig',
      '_getResponsiveModuleConfigForSecondItem',
      '_enableSectioningPosition',
    ])
  return (e) => {
    if (null == c) return e.map(() => i7(a))
    let b = a + r,
      f = i6({
        gutter: r,
        columnWidth: a,
        width: c,
        minCols: n,
      }),
      p = Array(f).fill(0),
      h = dd({
        columnCount: f,
        columnWidthAndGutter: b,
        gutter: r,
        align: o,
        layout: t,
        rawItemCount: l,
        width: c,
      })
    return d
      ? dc(
          Object.assign(
            {
              items: e,
              columnWidth: a,
              columnCount: f,
              centerOffset: h,
              gutter: r,
              measurementCache: i,
              _getColumnSpanConfig: d,
              _getResponsiveModuleConfigForSecondItem: null != u ? u : di,
              _getModulePositioningConfig: s,
              _enableSectioningPosition: g,
            },
            m,
          ),
        )
      : e.map((e) => {
          let o = i.get(e)
          if (null == o) return i7(a)
          let t = o > 0 ? o + r : 0,
            n = i8(p),
            l = p[n],
            c = n * b + h
          return (
            (p[n] = p[n] + t),
            {
              top: l,
              left: c,
              width: a,
              height: o,
            }
          )
        })
  }
}

let dm =
  ({ cache: e, columnWidth: o = 236, flexible: a = !1, gutter: r, width: t, minCols: n = 3 }) =>
  (l) => {
    if (null == t) return l.map(() => dg(o))
    let {
        columnWidth: c,
        columnWidthAndGutter: i,
        columnCount: d,
      } = (function ({ columnWidth: e, flexible: o, gutter: a, minCols: r, width: t }) {
        if (o) {
          let o = i6({
              gutter: a,
              columnWidth: e,
              width: t,
              minCols: r,
            }),
            n = Math.floor(t / o) - a,
            l = n + a
          return {
            columnCount: o,
            columnWidth: n,
            columnWidthAndGutter: l,
          }
        }
        let n = e + a
        return {
          columnCount: i6({
            gutter: a,
            columnWidth: e,
            width: t,
            minCols: r,
          }),
          columnWidth: e,
          columnWidthAndGutter: n,
        }
      })({
        columnWidth: o,
        flexible: a,
        gutter: r,
        minCols: n,
        width: t,
      }),
      s = []
    return l.map((o, a) => {
      let t = e.get(o)
      if (null == t) return dg(c)
      let n = a % d,
        l = Math.floor(a / d)
      return (
        (0 === n || t > s[l]) && (s[l] = t),
        {
          top: l > 0 ? s.slice(0, l).reduce((e, o) => e + o + r, 0) : 0,
          left: n * i,
          width: c,
          height: t,
        }
      )
    })
  }

let db = (e) => {
  var {
      width: o,
      idealColumnWidth: a = 240,
      gutter: r,
      minCols: t = 2,
      measurementCache: n,
      _getColumnSpanConfig: l,
      _getModulePositioningConfig: c,
      _getResponsiveModuleConfigForSecondItem: i,
      _enableSectioningPosition: d,
    } = e,
    s = b(e, [
      'width',
      'idealColumnWidth',
      'gutter',
      'minCols',
      'measurementCache',
      '_getColumnSpanConfig',
      '_getModulePositioningConfig',
      '_getResponsiveModuleConfigForSecondItem',
      '_enableSectioningPosition',
    ])
  if (null == o)
    return (e) =>
      e.map(() => ({
        top: 1 / 0,
        left: 1 / 0,
        width: 1 / 0,
        height: 1 / 0,
      }))
  let u = i6({
      gutter: r,
      columnWidth: a,
      width: o,
      minCols: t,
    }),
    g = o / u - r,
    m = g + r,
    f = r / 2
  return (e) => {
    let o = Array(u).fill(0)
    return l
      ? dc(
          Object.assign(
            {
              items: e,
              columnWidth: g,
              columnCount: u,
              centerOffset: f,
              gutter: r,
              measurementCache: n,
              _getColumnSpanConfig: l,
              _getModulePositioningConfig: c,
              _getResponsiveModuleConfigForSecondItem: null != i ? i : du,
              _enableSectioningPosition: d,
            },
            s,
          ),
        )
      : e.reduce((e, a) => {
          var t
          let l,
            c = n.get(a)
          if (null == c)
            l = {
              top: 1 / 0,
              left: 1 / 0,
              width: g,
              height: 1 / 0,
            }
          else {
            let e = c > 0 ? c + r : 0,
              a = i8(o),
              n = o[a]
            ;(o[a] = (null != (t = o[a]) ? t : 0) + e),
              (l = {
                top: n,
                left: a * m + f,
                width: g,
                height: c,
              })
          }
          return e.push(l), e
        }, [])
  }
}

function b(e, o) {
  var a = {}
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && 0 > o.indexOf(r) && (a[r] = e[r])
  if (null != e && 'function' == typeof Object.getOwnPropertySymbols)
    for (var t = 0, r = Object.getOwnPropertySymbols(e); t < r.length; t++)
      0 > o.indexOf(r[t]) &&
        Object.prototype.propertyIsEnumerable.call(e, r[t]) &&
        (a[r[t]] = e[r[t]])
  return a
}

function i7(e, o = 1 / 0) {
  return {
    top: -9999,
    left: -9999,
    width: e,
    height: o,
  }
}

let dd = ({
  align: e,
  columnCount: o,
  columnWidthAndGutter: a,
  gutter: r,
  layout: t,
  rawItemCount: n,
  width: l,
}) =>
  'basicCentered' === t
    ? Math.max(Math.floor((l - (Math.min(n, o) * a + r)) / 2), 0)
    : 'center' === e
      ? Math.max(Math.floor((l - a * o + r) / 2), 0)
      : 'end' === e
        ? l - (a * o - r)
        : 0

let dc = ({
  items: e,
  gutter: o = 14,
  columnWidth: a = 236,
  columnCount: r = 2,
  centerOffset: t = 0,
  logWhitespace: n,
  measurementCache: l,
  positionCache: c,
  originalItems: i,
  _getColumnSpanConfig: d,
  _getModulePositioningConfig: s,
  _getResponsiveModuleConfigForSecondItem: u,
  _enableSectioningPosition: g,
}) => {
  let m = i[0],
    f = i[1],
    p = u(f),
    h = (e) => !!p && e === f
  if (!e.every((e) => l.has(e)))
    return e.map((e) => {
      let t = dt({
        columnCount: r,
        firstItem: m,
        isFlexibleWidthItem: h(e),
        item: e,
        responsiveModuleConfigForSecondItem: p,
        _getColumnSpanConfig: d,
      })
      if (t > 1) {
        let e = Math.min(t, r)
        return i7(a * e + o * (e - 1))
      }
      return i7(a)
    })
  let x = a + o,
    v = (function ({
      centerOffset: e,
      checkIsFlexibleWidthItem: o,
      columnCount: a,
      columnWidthAndGutter: r,
      firstItem: t,
      gutter: n,
      items: l,
      positionCache: c,
      responsiveModuleConfigForSecondItem: i,
      _getColumnSpanConfig: d,
    }) {
      let s = Array(a).fill(0)
      return (
        l.forEach((l) => {
          let u = null == c ? void 0 : c.get(l)
          if (u) {
            let c = Math.round((u.left - e) / r),
              b = dt({
                columnCount: a,
                firstItem: t,
                isFlexibleWidthItem: o(l),
                item: l,
                responsiveModuleConfigForSecondItem: i,
                _getColumnSpanConfig: d,
              }),
              g = u.top + u.height + n
            for (let e = c; e < c + b; e += 1) g > s[e] && (s[e] = g)
          }
        }),
        s
      )
    })({
      centerOffset: t,
      checkIsFlexibleWidthItem: h,
      columnCount: r,
      columnWidthAndGutter: x,
      firstItem: m,
      gutter: o,
      items: e,
      positionCache: c,
      responsiveModuleConfigForSecondItem: p,
      _getColumnSpanConfig: d,
    }),
    k = e.filter((e) => (null == c ? void 0 : c.has(e))),
    y = e.filter((e) => !(null == c ? void 0 : c.has(e))),
    w = y.filter(
      (e) =>
        dt({
          columnCount: r,
          firstItem: m,
          isFlexibleWidthItem: h(e),
          item: e,
          responsiveModuleConfigForSecondItem: p,
          _getColumnSpanConfig: d,
        }) > 1,
    ),
    M = {
      centerOffset: t,
      columnWidth: a,
      columnWidthAndGutter: x,
      gutter: o,
      measurementCache: l,
      positionCache: c,
    }
  if (w.length > 0) {
    let e = Array.from(
        {
          length: w.length,
        },
        () => [],
      ).map((e, o) => {
        let a = 0 === o ? 0 : y.indexOf(w[o]),
          r = o + 1 === w.length ? y.length : y.indexOf(w[o + 1])
        return y.slice(a, r)
      }),
      { positions: o, heights: a } = dl(
        Object.assign(
          {
            items: k,
            heights: v,
          },
          M,
        ),
      ),
      { positions: t } = e.reduce(
        (e, o, a) =>
          (function (e) {
            var {
                multiColumnItem: o,
                checkIsFlexibleWidthItem: a,
                firstItem: r,
                itemsToPosition: t,
                heights: n,
                prevPositions: l,
                columnCount: c,
                logWhitespace: i,
                responsiveModuleConfigForSecondItem: d,
                _getColumnSpanConfig: s,
                _getModulePositioningConfig: u,
                _enableSectioningPosition: g,
              } = e,
              m = b(e, [
                'multiColumnItem',
                'checkIsFlexibleWidthItem',
                'firstItem',
                'itemsToPosition',
                'heights',
                'prevPositions',
                'columnCount',
                'logWhitespace',
                'responsiveModuleConfigForSecondItem',
                '_getColumnSpanConfig',
                '_getModulePositioningConfig',
                '_enableSectioningPosition',
              ])
            let { positionCache: f } = m,
              p = t.indexOf(o),
              h = t.filter(
                (e) =>
                  1 ===
                  dt({
                    columnCount: c,
                    firstItem: r,
                    isFlexibleWidthItem: a(e),
                    item: e,
                    responsiveModuleConfigForSecondItem: d,
                    _getColumnSpanConfig: s,
                  }),
              ),
              x = n.reduce((e, o) => (0 === o ? e + 1 : e), 0),
              v = dt({
                columnCount: c,
                firstItem: r,
                isFlexibleWidthItem: a(o),
                item: o,
                responsiveModuleConfigForSecondItem: d,
                _getColumnSpanConfig: s,
              }),
              k = x >= v + p,
              y = !k && p < x,
              {
                itemsBatchSize: w,
                whitespaceThreshold: M,
                iterationsLimit: S,
              } = (null == u ? void 0 : u(c, v)) || {
                itemsBatchSize: 5,
              },
              z = (function ({
                oneColumnItemsLength: e,
                multiColumnIndex: o,
                emptyColumns: a,
                fitsFirstRow: r,
                replaceWithOneColItems: t,
                itemsBatchSize: n,
              }) {
                return r ? o : t ? a : o + n > e ? Math.max(e - n, a) : o
              })({
                oneColumnItemsLength: h.length,
                multiColumnIndex: p,
                emptyColumns: x,
                fitsFirstRow: k,
                replaceWithOneColItems: y,
                itemsBatchSize: w,
              }),
              C = h.slice(0, z),
              j = k ? [] : h.slice(z, z + w),
              { positions: A, heights: H } = dl(
                Object.assign(
                  {
                    items: C,
                    heights: n,
                  },
                  m,
                ),
              )
            A.forEach(({ item: e, position: o }) => {
              f.set(e, o)
            })
            let { winningNode: L, numberOfIterations: N } = (function (e) {
                let o, a
                var {
                    items: r,
                    positions: t,
                    heights: n,
                    whitespaceThreshold: l,
                    columnSpan: c,
                    iterationsLimit: i = 5e3,
                    _enableSectioningPosition: d = !1,
                  } = e,
                  s = b(e, [
                    'items',
                    'positions',
                    'heights',
                    'whitespaceThreshold',
                    'columnSpan',
                    'iterationsLimit',
                    '_enableSectioningPosition',
                  ])
                let u = 0,
                  g = new de(),
                  m = {
                    id: 'start',
                    heights: n,
                    positions: t,
                    section: void 0,
                  }
                g.addNode(m)
                let f = Math.min(...dn(n, c))
                function p({
                  item: e,
                  i: r,
                  arr: t,
                  prevNode: n,
                  heightsArr: d,
                  itemsSoFar: b = [],
                  section: m,
                  segmentedIterationsLimit: f = i,
                }) {
                  if (a || u === f) return
                  let h = [...d],
                    x = m ? s.columnWidthAndGutter * m + s.centerOffset : s.centerOffset,
                    { positions: v, heights: k } = dl(
                      Object.assign(
                        Object.assign(
                          {
                            items: [...b, e],
                            heights: h,
                          },
                          s,
                        ),
                        {
                          centerOffset: x,
                        },
                      ),
                    ),
                    y = {
                      id: e,
                      heights: k,
                      positions: v,
                      section: m,
                    },
                    w = Math.min(...dn(k, c))
                  if ((g.addNode(y), g.addEdge(n, y, w), (u += 1), 'number' == typeof l && w < l)) {
                    ;(o = w), (a = y)
                    return
                  }
                  if (t.length > 1) {
                    let o = [...t]
                    o.splice(r, 1),
                      o.forEach((o, a, r) => {
                        p({
                          item: o,
                          i: a,
                          arr: r,
                          heightsArr: d,
                          prevNode: y,
                          itemsSoFar: [...b, e],
                          section: m,
                          segmentedIterationsLimit: f,
                        })
                      })
                  }
                }
                if (d) {
                  let e = n.length - c + 1,
                    o = Array.from({
                      length: e,
                    }).map((e, o) => n.slice(o, o + c)),
                    a = Math.floor(i / e)
                  o.forEach((e, o) => {
                    ;(u = 0),
                      r.forEach((r, t, n) => {
                        p({
                          item: r,
                          i: t,
                          arr: n,
                          heightsArr: e,
                          prevNode: m,
                          section: o,
                          segmentedIterationsLimit: a,
                        })
                      })
                  })
                } else
                  r.forEach((e, o, a) => {
                    p({
                      item: e,
                      i: o,
                      arr: a,
                      heightsArr: n,
                      prevNode: m,
                    })
                  })
                let { lowestScoreNode: h, lowestScore: x } = a
                  ? {
                      lowestScoreNode: a,
                      lowestScore: null != o ? o : 0,
                    }
                  : g.findLowestScore(m)
                return {
                  winningNode: null === x || x < f ? h : m,
                  numberOfIterations: u,
                }
              })(
                Object.assign(
                  {
                    items: j,
                    positions: A,
                    heights: H,
                    columnSpan: v,
                    iterationsLimit: S,
                    whitespaceThreshold: M,
                    _enableSectioningPosition: g,
                  },
                  m,
                ),
              ),
              {
                heights: I,
                position: E,
                additionalWhitespace: B,
              } = (function ({
                centerOffset: e,
                columnWidth: o,
                columnWidthAndGutter: a,
                gutter: r,
                heights: t,
                item: n,
                columnSpan: l,
                measurementCache: c,
                fitsFirstRow: i,
              }) {
                let d = [...t],
                  s = c.get(n)
                if (null == s)
                  return {
                    additionalWhitespace: null,
                    heights: d,
                    position: i7(o),
                  }
                let u = dn(d, l),
                  b = i ? d.indexOf(0) : u.indexOf(Math.min(...u)),
                  g = d.slice(b, b + l),
                  m = b + g.indexOf(Math.max(...g)),
                  f = d[m],
                  p = b * a + e,
                  h = d[m] + (s > 0 ? s + r : 0),
                  x = (function (e, o, a) {
                    let r = e.slice(a, a + o),
                      t = Math.max(...r)
                    return r.map((e) => t - e)
                  })(d, l, b)
                for (let e = 0; e < l; e += 1) d[e + b] = h
                return {
                  additionalWhitespace: x,
                  heights: d,
                  position: {
                    top: f,
                    left: p,
                    width: o * l + r * (l - 1),
                    height: s,
                  },
                }
              })(
                Object.assign(
                  {
                    item: o,
                    heights:
                      void 0 !== L.section && g
                        ? [
                            ...H.slice(0, L.section),
                            ...L.heights,
                            ...H.slice(L.section + v, H.length),
                          ]
                        : L.heights,
                    columnSpan: v,
                    fitsFirstRow: k,
                  },
                  m,
                ),
              ),
              V = L.positions.concat({
                item: o,
                position: E,
              }),
              P = new Set(V.map(({ item: e }) => e)),
              { heights: T, positions: D } = dl(
                Object.assign(
                  {
                    items: t.filter((e) => !P.has(e)),
                    heights: I,
                  },
                  m,
                ),
              ),
              F = V.concat(D)
            return (
              B && (null == i || i(B, N, v)),
              F.forEach(({ item: e, position: o }) => {
                f.set(e, o)
              }),
              {
                positions: l.concat(F),
                heights: T,
              }
            )
          })(
            Object.assign(
              {
                multiColumnItem: w[a],
                itemsToPosition: o,
                checkIsFlexibleWidthItem: h,
                firstItem: m,
                heights: e.heights,
                prevPositions: e.positions,
                logWhitespace: n,
                columnCount: r,
                responsiveModuleConfigForSecondItem: p,
                _getColumnSpanConfig: d,
                _getModulePositioningConfig: s,
                _enableSectioningPosition: g,
              },
              M,
            ),
          ),
        {
          heights: a,
          positions: o,
        },
      )
    return da(t)
  }
  let { positions: S } = dl(
    Object.assign(
      {
        items: e,
        heights: v,
      },
      M,
    ),
  )
  return (
    S.forEach(({ item: e, position: o }) => {
      null == c || c.set(e, o)
    }),
    da(S)
  )
}

function i8(e) {
  return e.length ? e.indexOf(Math.min(...e)) : 0
}

let dg = (e, o = 1 / 0) => ({
  top: -9999,
  left: -9999,
  width: e,
  height: o,
})

function dn(e, o) {
  let a = []
  for (let r = 0; r < e.length - (o - 1); r += 1) {
    let t = e.slice(r, r + o),
      n = Math.max(...t),
      l = t.reduce((e, o) => e + n - o, 0)
    a.push(l)
  }
  return a
}

function dl({
  centerOffset: e,
  columnWidth: o,
  columnWidthAndGutter: a,
  gutter: r,
  heights: t,
  items: n,
  measurementCache: l,
  positionCache: c,
}) {
  let i = [...t]
  return {
    positions: n.reduce((t, n) => {
      let d = l.get(n),
        s = null == c ? void 0 : c.get(n)
      if (s)
        return [
          ...t,
          {
            item: n,
            position: s,
          },
        ]
      if (null != d) {
        let l = i8(i),
          c = i[l]
        return (
          (i[l] = i[l] + (d > 0 ? d + r : 0)),
          [
            ...t,
            {
              item: n,
              position: {
                top: c,
                left: l * a + e,
                width: o,
                height: d,
              },
            },
          ]
        )
      }
      return t
    }, []),
    heights: i,
  }
}

function da(e) {
  return e.map(({ position: e }) => e)
}

function getElement(e) {
  return 'function' == typeof e ? e() : e
}
