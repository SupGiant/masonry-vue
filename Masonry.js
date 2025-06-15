class dj extends i.Component {
  static createMeasurementStore() {
      return new dx
  }
  constructor(e) {
      super(e),
      this.insertAnimationFrame = null,
      this.maxHeight = 0,
      this.handleResize = i1( () => {
          this.gridWrapper && this.setState({
              width: this.gridWrapper.getBoundingClientRect().width
          })
      }
      , 300),
      this.updateScrollPosition = dz( () => {
          if (!this.scrollContainer)
              return;
          let e = this.scrollContainer.getScrollContainerRef();
          e && this.setState({
              scrollTop: dS(e)
          })
      }
      ),
      this.measureContainerAsync = i1( () => {
          this.measureContainer()
      }
      , 0),
      this.setGridWrapperRef = e => {
          this.gridWrapper = e
      }
      ,
      this.setScrollContainerRef = e => {
          this.scrollContainer = e
      }
      ,
      this.fetchMore = () => {
          let {loadItems: e, items: o} = this.props;
          e && "function" == typeof e && this.setState({
              isFetching: !0
          }, () => e({
              from: o.length
          }))
      }
      ,
      this.renderMasonryComponent = (e, o, a) => {
          let r, {renderItem: t, scrollContainer: l, virtualize: c, virtualBoundsTop: i, virtualBoundsBottom: d, virtualBufferFactor: s} = this.props, {top: u, left: b, width: g, height: m} = a;
          if (l && s) {
              let e = this.containerHeight * s
                , o = this.state.scrollTop - this.containerOffset
                , t = d ? o + this.containerHeight + d : o + this.containerHeight + e;
              r = !(a.top + a.height < (i ? o - i : o - e) || a.top > t)
          } else
              r = !0;
          let f = (null == document ? void 0 : document.dir) === "rtl"
            , p = (0,
          n.jsx)("div", {
              className: [i5.Masonry__Item, i5.Masonry__Item__Mounted].join(" "),
              "data-grid-item": !0,
              role: "listitem",
              style: Object.assign(Object.assign({
                  top: 0
              }, f ? {
                  right: 0
              } : {
                  left: 0
              }), {
                  transform: `translateX(${f ? -1 * b : b}px) translateY(${u}px)`,
                  WebkitTransform: `translateX(${f ? -1 * b : b}px) translateY(${u}px)`,
                  width: dC(g),
                  height: dC(m)
              }),
              children: (0,
              n.jsx)(dh, {
                  idx: o,
                  resizeObserver: this.resizeObserver,
                  children: t({
                      data: e,
                      itemIdx: o,
                      isMeasuring: !1
                  })
              })
          }, `item-${o}`);
          return ("function" == typeof c ? c(e) : c) ? r && p || null : p
      }
      ,
      this.containerHeight = 0,
      this.containerOffset = 0;
      let o = e.measurementStore || dj.createMeasurementStore();
      this.positionStore = e.positionStore || dj.createMeasurementStore();
      let {layout: a, gutterWidth: r} = e
      // 默认间距
        , t = 14;
      a && ("flexible" === a || "serverRenderedFlexible" === a) && (t = 0);
      let l = null != r ? r : t;
      this.resizeObserver = e._dynamicHeights && "undefined" != typeof window && this.positionStore ? new ResizeObserver(e => {
          let o = !1;
          e.forEach( ({target: e, contentRect: a}) => {
              let r = Number(e.getAttribute("data-grid-item-idx"));
              if ("number" == typeof r) {
                  let e = this.state.items[r]
                    , t = a.height;
                  o = i3({
                      items: this.state.items,
                      changedItem: e,
                      newHeight: t,
                      positionStore: this.positionStore,
                      measurementStore: this.state.measurementStore,
                      gutter: l
                  }) || o
              }
          }
          ),
          o && this.forceUpdate()
      }
      ) : void 0,
      this.state = {
          gutter: l,
          hasPendingMeasurements: e.items.some(e => !!e && !o.has(e)),
          isFetching: !1,
          items: e.items,
          measurementStore: o,
          scrollTop: 0,
          width: void 0
      }
  }
  componentDidMount() {
      window.addEventListener("resize", this.handleResize),
      this.measureContainer();
      let {scrollTop: e} = this.state;
      if (null != this.scrollContainer) {
          let o = this.scrollContainer.getScrollContainerRef();
          o && (e = dS(o))
      }
      this.setState(o => ({
          scrollTop: e,
          width: this.gridWrapper ? this.gridWrapper.getBoundingClientRect().width : o.width
      }))
  }
  componentDidUpdate(e, o) {
      let {items: a} = this.props
        , {measurementStore: r} = this.state;
      this.measureContainerAsync(),
      null != o.width && this.state.width !== o.width && (r.reset(),
      this.positionStore.reset());
      let t = a.some(e => !!e && !r.has(e));
      (t || t !== this.state.hasPendingMeasurements || null == o.width) && (this.insertAnimationFrame = requestAnimationFrame( () => {
          this.setState({
              hasPendingMeasurements: t
          })
      }
      ))
  }
  componentWillUnmount() {
      this.insertAnimationFrame && cancelAnimationFrame(this.insertAnimationFrame),
      this.measureContainerAsync.clearTimeout(),
      this.handleResize.clearTimeout(),
      this.updateScrollPosition.clearTimeout(),
      window.removeEventListener("resize", this.handleResize)
  }
  static getDerivedStateFromProps(e, o) {
      let {items: a} = e
        , {measurementStore: r} = o
        , t = a.some(e => !r.has(e));
      for (let e = 0; e < a.length; e += 1)
          if (void 0 === o.items[e] || a[e] !== o.items[e] || a.length < o.items.length)
              return {
                  hasPendingMeasurements: t,
                  items: a,
                  isFetching: !1
              };
      return 0 === a.length && o.items.length > 0 ? {
          hasPendingMeasurements: t,
          items: a,
          isFetching: !1
      } : t !== o.hasPendingMeasurements ? {
          hasPendingMeasurements: t,
          items: a
      } : null
  }
  measureContainer() {
      if (null != this.scrollContainer) {
          let {scrollContainer: e} = this
            , o = e.getScrollContainerRef();
          if (o) {
              this.containerHeight = dy(o);
              let e = this.gridWrapper;
              if (e instanceof HTMLElement) {
                  let a = dM(o);
                  this.containerOffset = e.getBoundingClientRect().top + a
              }
          }
      }
  }
  reflow() {
      let {measurementStore: e} = this.props;
      e && e.reset(),
      this.state.measurementStore.reset(),
      this.positionStore.reset(),
      this.measureContainer(),
      this.forceUpdate()
  }
  render() {
      let e, {align: o="center",
        columnWidth: a,
        items: r,
        layout: t="basic",
        minCols: l,
        renderItem: c,
        scrollContainer: i,
        _logTwoColWhitespace: d,
        _getColumnSpanConfig: s,
        _getResponsiveModuleConfigForSecondItem: u,
         _getModulePositioningConfig: b,
          _enableSectioningPosition: g} = this.props,
          {gutter: m, hasPendingMeasurements: f, measurementStore: p, width: h}
          = this.state, {positionStore: x} = this,
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
          _enableSectioningPosition: g
      });
      if (null == h && f)
          e = (0,
          n.jsx)("div", {
              ref: this.setGridWrapperRef,
              className: i5.Masonry,
              role: "list",
              style: {
                  height: 0,
                  width: "100%"
              },
              children: r.filter(Boolean).map( (e, o) => {
                  var r;
                  let l = null != (r = null == s ? void 0 : s(e)) ? r : 1;
                  return (0,
                  n.jsx)("div", {
                      ref: o => {
                          o && "flexible" !== t && p.set(e, o.clientHeight)
                      }
                      ,
                      className: "static",
                      "data-column-span": "number" == typeof l ? l : btoa(JSON.stringify(l)),
                      "data-grid-item": !0,
                      role: "listitem",
                      style: {
                          top: 0,
                          left: 0,
                          transform: "translateX(0px) translateY(0px)",
                          WebkitTransform: "translateX(0px) translateY(0px)",
                          width: "flexible" === t || "serverRenderedFlexible" === t || "object" == typeof l ? void 0 : dC("number" == typeof l && null != a && null != m ? a * l + m * (l - 1) : a)
                      },
                      children: c({
                          data: e,
                          itemIdx: o,
                          isMeasuring: !1
                      })
                  }, o)
              }
              )
          });
      else if (null == h)
          e = (0,
          n.jsx)("div", {
              ref: this.setGridWrapperRef,
              style: {
                  width: "100%"
              }
          });
      else {
          let o, t, i = r.filter(e => e && p.has(e)), d = r.filter(e => !p.has(e)), g = s && d.find(e => 1 !== s(e));
          if (g) {
              o = d.indexOf(g);
              let e = i6({
                  gutter: m,
                  columnWidth: a,
                  width: h,
                  minCols: l
              })
                , n = u && r[1] ? u(r[1]) : void 0
                , c = !!n && g === r[1]
                , i = dt({
                  columnCount: e,
                  firstItem: r[0],
                  isFlexibleWidthItem: c,
                  item: g,
                  responsiveModuleConfigForSecondItem: n,
                  _getColumnSpanConfig: s
              });
              if (!c) {
                  let {itemsBatchSize: o} = (null == b ? void 0 : b(e, i)) || {
                      itemsBatchSize: 5
                  };
                  t = o
              }
          }
          let f = t && o && o > 0 && o <= t ? t + 1 : l
            , k = r.filter(e => e && !p.has(e)).slice(0, f)
            , y = v(i)
            , w = v(k)
            , M = y.length ? Math.max(...y.map(e => e.top + e.height), 0 === k.length ? 0 : this.maxHeight) : 0;
          M !== this.maxHeight && (this.maxHeight = M),
          e = (0,
          n.jsxs)("div", {
              ref: this.setGridWrapperRef,
              style: {
                  width: "100%"
              },
              children: [(0,
              n.jsxs)("div", {
                  className: i5.Masonry,
                  role: "list",
                  style: {
                      height: M,
                      width: h
                  },
                  children: [i.map( (e, o) => {
                      var a;
                      return this.renderMasonryComponent(e, o, null != (a = x.get(e)) ? a : y[o])
                  }
                  ), k.map( (e, o) => {
                      let a = i.length + o
                        , r = w[o];
                      return (0,
                      n.jsx)("div", {
                          ref: o => {
                              o && p.set(e, o.clientHeight)
                          }
                          ,
                          role: "listitem",
                          style: {
                              visibility: "hidden",
                              position: "absolute",
                              top: dC(r.top),
                              left: dC(r.left),
                              width: dC(r.width),
                              height: dC(r.height)
                          },
                          children: c({
                              data: e,
                              itemIdx: a,
                              isMeasuring: !0
                          })
                      }, `measuring-${a}`)
                  }
                  )]
              }), this.scrollContainer && (0,
              n.jsx)(i2, {
                  containerHeight: this.containerHeight,
                  fetchMore: this.fetchMore,
                  isFetching: this.state.isFetching || this.state.hasPendingMeasurements,
                  scrollHeight: M + this.containerOffset,
                  scrollTop: this.state.scrollTop
              })]
          })
      }
      return i ? (0,
      n.jsx)(dk, {
          ref: this.setScrollContainerRef,
          onScroll: this.updateScrollPosition,
          scrollContainer: i,
          children: e
      }) : e
  }
}
dj.defaultProps = {
  columnWidth: 236,
  align: "center",
  minCols: 3,
  layout: "basic",
  loadItems: () => {}
  ,
  virtualBufferFactor: .7,
  virtualize: !1
},
dj.displayName = "Masonry";


class dx {
  constructor() {
      this.map = new WeakMap
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
      this.map = new WeakMap
  }
}
/// 防抖函数
function i1(e, o=100) {
  let a = null
    , r = (...r) => {
      a && clearTimeout(a),
      a = setTimeout( () => {
          a = null,
          e(...r)
      }
      , o)
  }
  ;
  return r.clearTimeout = () => {
      a && clearTimeout(a)
  }
  ,
  r
}

function dz(e, o=100) {
  let a, r, t = (...t) => {
      let n = Date.now();
      void 0 !== a && n - a < o ? (clearTimeout(r),
      r = setTimeout( () => {
          a = n,
          e(...t)
      }
      , o - (n - (null != a ? a : 0)))) : (a = n,
      e(...t))
  }
  ;
  return t.clearTimeout = () => {
      r && clearTimeout(r)
  }
  ,
  t
}

function dS(e) {
  return e === window || e instanceof Window ? dw() : e.scrollTop
}

let dC = e => {
  if (e)
      return e !== 1 / 0 ? e : void 0
}

function i3({items: e, changedItem: o, newHeight: a, positionStore: r, measurementStore: t, gutter: n}) {
  var l;
  let c, i = r.get(o), d = dj.createMeasurementStore();
  if (e.forEach(e => {
      let o = r.get(e);
      d.set(e, Object.assign({}, o))
  }
  ),
  !i || 0 === a || Math.floor(i.height) === Math.floor(a))
      return !1;
  let {top: s, left: u, width: b, height: g} = i
    , m = (l = e.slice(0, 10),
  c = 1 / 0,
  l.forEach(e => {
      let o = r.get(e);
      o && (c = Math.min(c, o.width))
  }
  ),
  c)
    , f = [{
      left: u,
      right: u + b,
      delta: a - g
  }]
    , p = e.map(e => {
      let o = r.get(e);
      return o && o.top >= i.top + i.height ? {
          item: e,
          position: o
      } : void 0
  }
  ).filter(e => !!e).sort( (e, o) => e.position.top - o.position.top);
  return t.set(o, a),
  r.set(o, {
      top: s,
      left: u,
      width: b,
      height: a
  }),
  p.reduce( (o, {item: a, position: t}) => {
      if (i4(o, t)) {
          if (t.width > m) {
              let o = function({multicolumCurrentPosition: e, allPreviousItems: o, gutter: a}) {
                  let r;
                  return o.forEach( ({item: o, position: a}) => {
                      let t = e.left
                        , n = e.left + e.width
                        , l = a.left
                        , c = a.left + a.width
                        , i = t <= l && n > l || t < c && n >= c;
                      return i && (r && a.top + a.height > r.position.top + r.position.height || !r) && (r = {
                          item: o,
                          position: a
                      }),
                      i
                  }
                  ),
                  r.position.top + r.position.height - e.top + a
              }({
                  multicolumCurrentPosition: t,
                  allPreviousItems: e.map(e => {
                      let o = d.get(e)
                        , a = r.get(e);
                      return o && a && o.top < t.top ? {
                          item: e,
                          position: a
                      } : void 0
                  }
                  ).filter(e => !!e).sort( (e, o) => e.position.top - o.position.top),
                  gutter: n
              });
              f.push({
                  left: t.left,
                  right: t.left + t.width,
                  delta: o
              })
          }
          let l = function(e, o) {
              for (let a = e.length - 1; a >= 0; a -= 1) {
                  let {left: r, right: t, delta: n} = e[a];
                  if (i4({
                      left: r,
                      right: t
                  }, o))
                      return n
              }
              return 0
          }(f, t);
          return r.set(a, Object.assign(Object.assign({}, t), {
              top: t.top + l
          })),
          {
              left: Math.min(o.left, t.left),
              right: Math.max(o.right, t.left + t.width)
          }
      }
      return o
  }
  , {
      left: u,
      right: u + b
  }),
  !0
}

function dy(e) {
  return e instanceof Window ? window.innerHeight : e.clientHeight
}
function dw() {
  return void 0 !== window.scrollY ? window.scrollY : document.documentElement && void 0 !== document.documentElement.scrollTop ? document.documentElement.scrollTop : 0
}
function dM(e) {
  return e === window || e instanceof Window ? dw() : e.scrollTop - e.getBoundingClientRect().top
}

function i6({gutter: e, columnWidth: o, width: a, minCols: r}) {
  return Math.max(Math.floor(a / ((null != o ? o : 236) + (null != e ? e : 14))), r)
}

function dt(e) {
  let {columnCount: o, item: a, firstItem: r, isFlexibleWidthItem: t, _getColumnSpanConfig: n, responsiveModuleConfigForSecondItem: l} = e
    , c = n(a)
    , i = o <= 2 ? "sm" : o <= 4 ? "md" : o <= 6 ? "_lg1" : o <= 8 ? "lg" : "xl"
    , d = dr(c, i);
  if (t) {
      let e = dr(n(r), i);
      d = "number" == typeof l ? l : l ? Math.max(l.min, Math.min(l.max, o - e)) : 1
  }
  return Math.min(d, o)
}