import AxisTransforms, { useAxisTransform } from './AxisTransforms'
import {
  identityAxes,
  transformSeries,
  type AxisTransform,
} from '../axis-transform'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ScientificSeries } from '../engine/scientific/types'
import {
  identitySegment,
  integrationAreaPolygons,
} from './scientific-chart-geometry'
import './ScientificChart.css'
const colors = [
  '#376eae',
  '#b37836',
  '#7961a8',
  '#368078',
  '#a85773',
  '#6c8039',
]
const num = (x: number) =>
  Math.abs(x) > 1e5 || (x !== 0 && Math.abs(x) < 0.001)
    ? x.toExponential(3)
    : Number(x.toPrecision(5)).toString()
type Props = {
  series: ScientificSeries[]
  axisValue?: AxisTransform
  hideAxisControls?: boolean
  onSelectPoint?: (seriesIndex: number, pointIndex: number) => void
  xLabel?: string
  yLabel?: string
  area?: { from: number; to: number; seriesName?: string }
  identityLine?: boolean
  zeroLine?: boolean
  cursorIndex?: number
  onSelectIndex?: (i: number) => void
}
export default function ScientificChart({
  series: rawSeries,
  axisValue,
  hideAxisControls = false,
  onSelectPoint,
  xLabel = '',
  yLabel = '',
  area: rawArea,
  identityLine: rawIdentityLine = false,
  zeroLine: rawZeroLine = false,
  cursorIndex,
  onSelectIndex,
}: Props) {
  const [savedAxes, setAxes] = useAxisTransform(
    `science:${xLabel}:${yLabel}:${rawSeries.map((s) => s.name).join('|')}`,
  )
  const axes = axisValue ?? savedAxes
  const changedAxes = !identityAxes(axes)
  const area = changedAxes ? undefined : rawArea
  const identityLine = !changedAxes && rawIdentityLine
  const zeroLine = !changedAxes && rawZeroLine
  const series = useMemo(() => {
    if (!changedAxes) return rawSeries
    let data = rawSeries
    if (rawZeroLine) {
      const xs = rawSeries.flatMap((s) => s.x).filter(Number.isFinite)
      const lo = xs.reduce((a, b) => Math.min(a, b), Infinity),
        hi = xs.reduce((a, b) => Math.max(a, b), -Infinity)
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        const x = Array.from(
          { length: 201 },
          (_, i) => lo * (1 - i / 200) + (hi * i) / 200,
        )
        data = [
          ...data,
          { name: 'Reference: original residual = 0', x, y: x.map(() => 0) },
        ]
      }
    }
    if (rawIdentityLine) {
      const finite = rawSeries
        .flatMap((s) => [...s.x, ...s.y])
        .filter(Number.isFinite)
      const lo = finite.reduce((a, b) => Math.min(a, b), Infinity),
        hi = finite.reduce((a, b) => Math.max(a, b), -Infinity)
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        const v = Array.from(
          { length: 201 },
          (_, i) => lo * (1 - i / 200) + (hi * i) / 200,
        )
        data = [...data, { name: 'Reference: original y=x', x: v, y: v }]
      }
    }
    return transformSeries(data, axes)
  }, [rawSeries, axes.x, axes.y, changedAxes, rawIdentityLine, rawZeroLine])
  const omitted = changedAxes
    ? series.reduce(
        (n, s) =>
          n +
          s.x.filter((x, i) => !Number.isFinite(x) || !Number.isFinite(s.y[i]))
            .length,
        0,
      )
    : 0
  const displayX = changedAxes
    ? `${axes.x} [x: ${xLabel || 'x'}, y: ${yLabel || 'y'}]`
    : xLabel
  const displayY = changedAxes ? axes.y : yLabel
  const container = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null)
  const clip = `science-plot-${useId()}`
  const hoverFrame = useRef<number | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const latestSeries = useRef(series)
  latestSeries.current = series
  const [size, setSize] = useState({ width: 900, height: 450 }),
    [hidden, setHidden] = useState<string[]>([])
  const [zoom, setZoom] = useState({ l: 0, r: 1, b: 0, t: 1 }),
    [hover, setHover] = useState<{
      s: number
      i: number
      source: ScientificSeries[]
    } | null>(null)
  const [axis, setAxis] = useState('both')
  useEffect(() => {
    const el = container.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.max(280, entry.contentRect.width),
        height: Math.max(280, entry.contentRect.height),
      }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  function cancelHoverFrame() {
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = null
    pointer.current = null
  }
  function clearHover() {
    cancelHoverFrame()
    setHover(null)
  }
  useEffect(() => {
    setZoom({ l: 0, r: 1, b: 0, t: 1 })
    cancelHoverFrame()
    setHover(null)
    setHidden([])
  }, [series])
  useEffect(() => () => cancelHoverFrame(), [])
  const bounds = useMemo(() => {
    let xmin = Infinity,
      xmax = -Infinity,
      ymin = Infinity,
      ymax = -Infinity
    for (const s of series)
      for (let i = 0; i < s.x.length; i++) {
        const x = s.x[i],
          y = s.y[i]
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        xmin = Math.min(xmin, x)
        xmax = Math.max(xmax, x)
        ymin = Math.min(ymin, y)
        ymax = Math.max(ymax, y)
      }
    if (!Number.isFinite(xmin)) return null
    if (area || zeroLine) {
      ymin = Math.min(ymin, 0)
      ymax = Math.max(ymax, 0)
    }
    const xs = Math.max(Math.abs(xmin), Math.abs(xmax)) || 1,
      ys = Math.max(Math.abs(ymin), Math.abs(ymax)) || 1
    let x0 = xmin / xs,
      x1 = xmax / xs,
      y0 = ymin / ys,
      y1 = ymax / ys
    const dx = x1 - x0 || Math.max(0.2, Math.abs(x0) * 0.2),
      dy = y1 - y0 || Math.max(0.2, Math.abs(y0) * 0.2)
    x0 -= dx * 0.03
    x1 += dx * 0.03
    y0 -= dy * 0.08
    y1 += dy * 0.08
    return { xs, ys, x0, x1, y0, y1 }
  }, [series, area, zeroLine])
  const width = size.width,
    height = size.height,
    left = 70,
    right = width - 22,
    top = 30,
    bottom = height - 55
  const plotWidth = Math.max(1, right - left),
    plotHeight = Math.max(1, bottom - top)
  const geometry = useMemo(() => {
    if (!bounds) return null
    const x0 = bounds.x0 + (bounds.x1 - bounds.x0) * zoom.l,
      x1 = bounds.x0 + (bounds.x1 - bounds.x0) * zoom.r
    const y0 = bounds.y0 + (bounds.y1 - bounds.y0) * zoom.b,
      y1 = bounds.y0 + (bounds.y1 - bounds.y0) * zoom.t
    return {
      x0,
      x1,
      y0,
      y1,
      x: (x: number) => left + ((x / bounds.xs - x0) / (x1 - x0)) * plotWidth,
      y: (y: number) =>
        bottom - ((y / bounds.ys - y0) / (y1 - y0)) * plotHeight,
    }
  }, [bounds, zoom, width, height])
  const paths = useMemo(
    () =>
      series.map((s) => {
        if (!geometry) return ''
        let path = '',
          connected = false
        for (let i = 0; i < s.x.length; i++) {
          if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.y[i])) {
            connected = false
            continue
          }
          path += `${connected ? 'L' : 'M'}${geometry.x(s.x[i]).toFixed(2)},${geometry.y(s.y[i]).toFixed(2)} `
          connected = true
        }
        return path
      }),
    [series, geometry],
  )
  const areaPolygons = useMemo(() => {
    if (!area || !geometry) return []
    const source = area.seriesName
      ? series.find((s) => s.name === area.seriesName)
      : series.find((s) => s.style !== 'points')
    if (!source || hidden.includes(source.name)) return []
    return integrationAreaPolygons(source.x, source.y, area.from, area.to).map(
      (polygon) => ({
        sign: polygon.sign,
        points: polygon.points
          .map((p) => `${geometry.x(p.x)},${geometry.y(p.y)}`)
          .join(' '),
      }),
    )
  }, [area, series, hidden, geometry])
  const diagonal =
    geometry && bounds && identityLine
      ? identitySegment(
          geometry.x0 * bounds.xs,
          geometry.x1 * bounds.xs,
          geometry.y0 * bounds.ys,
          geometry.y1 * bounds.ys,
        )
      : null
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== el) return
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      if (!(rect.width > 0) || !(rect.height > 0)) return
      const localX = ((event.clientX - rect.left) * width) / rect.width
      const localY = ((event.clientY - rect.top) * height) / rect.height
      const u = Math.min(1, Math.max(0, (localX - left) / plotWidth)),
        v = 1 - Math.min(1, Math.max(0, (localY - top) / plotHeight))
      const factor = Math.exp(
        Math.max(-100, Math.min(100, event.deltaY)) * 0.0018,
      )
      setZoom((z) => {
        const shift = (a: number, b: number, f: number) => {
          const span = Math.min(12, Math.max(0.0001, (b - a) * factor)),
            center = a + (b - a) * f
          return [center - span * f, center + span * (1 - f)]
        }
        const [l, r] = axis === 'y' ? [z.l, z.r] : shift(z.l, z.r, u),
          [b, t] = axis === 'x' ? [z.b, z.t] : shift(z.b, z.t, v)
        return { l, r, b, t }
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [axis, plotWidth, plotHeight, left, top, width, height])
  function locate(
    clientX: number,
    clientY: number,
  ): { s: number; i: number } | null {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect || !geometry || !(rect.width > 0) || !(rect.height > 0))
      return null
    const x = ((clientX - rect.left) * width) / rect.width,
      y = ((clientY - rect.top) * height) / rect.height
    if (x < left || x > right || y < top || y > bottom) return null
    let nearest: { s: number; i: number } | null = null,
      dist = Infinity
    series.forEach((s, si) => {
      if (hidden.includes(s.name)) return
      for (let i = 0; i < Math.min(s.x.length, s.y.length); i++) {
        if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.y[i])) continue
        const dx = geometry.x(s.x[i]) - x,
          dy = geometry.y(s.y[i]) - y,
          d = dx * dx + dy * dy
        if (d < dist) {
          dist = d
          nearest = { s: si, i }
        }
      }
    })
    return nearest
  }
  const latestLocate = useRef(locate)
  latestLocate.current = locate
  function selectHover(point: { s: number; i: number } | null) {
    setHover((previous) => {
      if (!point) return null
      if (
        previous?.source === series &&
        previous.s === point.s &&
        previous.i === point.i
      )
        return previous
      return { ...point, source: series }
    })
  }
  function scheduleHover(clientX: number, clientY: number) {
    pointer.current = { x: clientX, y: clientY }
    if (hoverFrame.current !== null) return
    const source = series
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = null
      if (latestSeries.current !== source || !pointer.current) return
      selectHover(latestLocate.current(pointer.current.x, pointer.current.y))
    })
  }
  // An effect cannot clear a previous point before the first render with new
  // data. Bind hover state to its data array and validate both coordinates.
  const hoverSeries = hover?.source === series ? series[hover.s] : undefined
  const hovered =
    hover &&
    hoverSeries &&
    !hidden.includes(hoverSeries.name) &&
    Number.isInteger(hover.i) &&
    hover.i >= 0 &&
    Number.isFinite(hoverSeries.x[hover.i]) &&
    Number.isFinite(hoverSeries.y[hover.i])
      ? {
          name: hoverSeries.name,
          x: hoverSeries.x[hover.i],
          y: hoverSeries.y[hover.i],
        }
      : null
  return (
    <div className="scientific-chart">
      {!hideAxisControls && <AxisTransforms value={axes} onChange={setAxes} />}
      {changedAxes && (
        <p className="science-help" role="status">
          Display transform · 원본 결과 유지
          {omitted ? ` · 정의역 밖 ${omitted}개 지점은 표시하지 않습니다.` : ''}
          {rawArea
            ? ' · 변환된 좌표의 면적은 원래 적분이 아니므로 음영을 생략합니다.'
            : ''}
        </p>
      )}
      <div className="science-chart-tools">
        <div className="science-chart-legend">
          {series.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={!hidden.includes(s.name)}
              onClick={() =>
                setHidden((h) =>
                  h.includes(s.name)
                    ? h.filter((x) => x !== s.name)
                    : [...h, s.name],
                )
              }
            >
              <i style={{ background: s.color ?? colors[i % colors.length] }} />
              {s.name}
            </button>
          ))}
        </div>
        <label>
          Zoom{' '}
          <select
            aria-label="시각화 확대 축"
            value={axis}
            onChange={(e) => setAxis(e.target.value)}
          >
            <option value="both">X & Y</option>
            <option value="x">X</option>
            <option value="y">Y</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setZoom({ l: 0, r: 1, b: 0, t: 1 })}
        >
          Reset
        </button>
      </div>
      <div className="scientific-chart-stage" ref={container}>
        <svg
          ref={svg}
          role="img"
          aria-label={`X: ${displayX || 'x'}, Y: ${displayY || 'y'}${identityLine ? ', y = x reference' : ''}${zeroLine ? ', residual zero reference' : ''}`}
          tabIndex={0}
          width={width}
          height={height}
          onPointerMove={(e) => scheduleHover(e.clientX, e.clientY)}
          onPointerLeave={clearHover}
          onBlur={clearHover}
          onPointerDown={(e) => {
            e.preventDefault()
            svg.current?.focus({ preventScroll: true })
            cancelHoverFrame()
            const p = locate(e.clientX, e.clientY)
            selectHover(p)
            if (p) {
              if (p.s < rawSeries.length) {
                onSelectIndex?.(p.i)
                onSelectPoint?.(p.s, p.i)
              }
            }
          }}
          onKeyDown={(e) => {
            if (
              onSelectIndex &&
              (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            ) {
              e.preventDefault()
              const first = series[0]
              const count = first ? Math.min(first.x.length, first.y.length) : 0
              if (!count) return
              const current = Number.isInteger(cursorIndex)
                ? Math.max(0, Math.min(count - 1, cursorIndex!))
                : 0
              onSelectIndex(
                Math.max(
                  0,
                  Math.min(
                    count - 1,
                    current + (e.key === 'ArrowRight' ? 1 : -1),
                  ),
                ),
              )
            }
          }}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={left} y={top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>
          {geometry &&
            bounds &&
            Array.from({ length: width < 500 ? 3 : 5 }, (_, i) => {
              const f = i / (width < 500 ? 2 : 4),
                x = left + f * plotWidth,
                y = bottom - f * plotHeight
              return (
                <g key={i}>
                  <line
                    x1={left}
                    y1={y}
                    x2={right}
                    y2={y}
                    className="science-grid"
                  />
                  <line
                    x1={x}
                    y1={top}
                    x2={x}
                    y2={bottom}
                    className="science-grid"
                  />
                  <text x={left - 9} y={y + 4} textAnchor="end">
                    {num(
                      (geometry.y0 + f * (geometry.y1 - geometry.y0)) *
                        bounds.ys,
                    )}
                  </text>
                  <text x={x} y={bottom + 23} textAnchor="middle">
                    {num(
                      (geometry.x0 + f * (geometry.x1 - geometry.x0)) *
                        bounds.xs,
                    )}
                  </text>
                </g>
              )
            })}
          <g clipPath={`url(#${clip})`}>
            {zeroLine && !area && geometry && (
              <line
                x1={left}
                y1={geometry.y(0)}
                x2={right}
                y2={geometry.y(0)}
                className="science-zero-line"
                strokeDasharray="6 5"
              />
            )}
            {areaPolygons.map((polygon, i) => (
              <polygon
                key={i}
                points={polygon.points}
                className={
                  polygon.sign > 0
                    ? 'science-area-positive'
                    : 'science-area-negative'
                }
              />
            ))}
            {area && geometry && (
              <>
                <line
                  x1={left}
                  y1={geometry.y(0)}
                  x2={right}
                  y2={geometry.y(0)}
                  className="science-zero-line"
                />
                {[area.from, area.to]
                  .filter(Number.isFinite)
                  .map((value, i) => (
                    <line
                      key={i}
                      x1={geometry.x(value)}
                      y1={top}
                      x2={geometry.x(value)}
                      y2={bottom}
                      className="science-area-limit"
                    />
                  ))}
              </>
            )}
            {diagonal && geometry && (
              <line
                x1={geometry.x(diagonal.from)}
                y1={geometry.y(diagonal.from)}
                x2={geometry.x(diagonal.to)}
                y2={geometry.y(diagonal.to)}
                className="science-identity-line"
              />
            )}
            {series.map((s, i) =>
              hidden.includes(s.name) || !geometry ? null : (
                <g key={s.name}>
                  {s.style !== 'points' && (
                    <path
                      d={paths[i]}
                      fill="none"
                      stroke={s.color ?? colors[i % colors.length]}
                      strokeWidth="2.3"
                    />
                  )}
                  {s.style === 'points' &&
                    s.x.map((x, j) =>
                      j % Math.max(1, Math.ceil(s.x.length / 600)) === 0 &&
                      Number.isFinite(x) &&
                      Number.isFinite(s.y[j]) ? (
                        <circle
                          key={j}
                          cx={geometry.x(x)}
                          cy={geometry.y(s.y[j])}
                          r="3.4"
                          fill="white"
                          stroke={s.color ?? colors[i % colors.length]}
                          strokeWidth="1.7"
                        />
                      ) : null,
                    )}
                  {cursorIndex !== undefined &&
                    Number.isInteger(cursorIndex) &&
                    cursorIndex >= 0 &&
                    Number.isFinite(s.x[cursorIndex]) &&
                    Number.isFinite(s.y[cursorIndex]) && (
                      <circle
                        cx={geometry.x(s.x[cursorIndex])}
                        cy={geometry.y(s.y[cursorIndex])}
                        r="5"
                        fill={s.color ?? colors[i % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )}
                </g>
              ),
            )}
          </g>
          <text
            className="science-axis-label"
            x={(left + right) / 2}
            y={height - 8}
            textAnchor="middle"
          >
            X: {displayX || 'x'}
          </text>
          <text className="science-axis-label" x={left} y={15}>
            Y: {displayY || 'y'}
          </text>
          {!bounds && (
            <text x={width / 2} y={height / 2} textAnchor="middle">
              표시할 계산 결과가 없습니다.
            </text>
          )}
        </svg>
        {hovered && (
          <div className="science-chart-tooltip">
            <strong>{hovered.name}</strong>
            {changedAxes && hover && rawSeries[hover.s] && (
              <span>
                Original: x={num(rawSeries[hover.s].x[hover.i])}, y=
                {num(rawSeries[hover.s].y[hover.i])}
              </span>
            )}
            <span>
              {displayX || 'x'} {num(hovered.x)}
            </span>
            <span>
              {displayY || 'y'} {num(hovered.y)}
            </span>
          </div>
        )}
      </div>
      <details className="science-help">
        <summary>Graph controls</summary>
        <p>
          범례로 곡선을 숨기거나 표시합니다. 그래프를 클릭한 뒤 휠로 확대·축소할
          수 있습니다. 빈 원은 관측값이며 600개를 넘으면 마커 일부만 표시합니다.
          표와 CSV에는 전체 데이터가 포함됩니다. ODE 그래프에서는 클릭하거나
          방향키로 계산 시점을 선택합니다.
        </p>
        {area && (
          <p>
            음영은 지정한 적분 범위에서 곡선과 Y=0 사이의 면적입니다. 파란
            영역은 양의 기여, 주황 영역은 음의 기여입니다. 적분 한계의 순서를
            바꾸면 최종 적분값의 부호가 반대로 바뀝니다.
          </p>
        )}
        {identityLine && (
          <p>
            점선 y=x는 예측값과 관측값이 같은 위치입니다. 점이 점선 위에 있으면
            과대 예측, 아래에 있으면 과소 예측입니다. 두 축은 동일한 물리 단위를
            사용합니다.
          </p>
        )}
      </details>
    </div>
  )
}
