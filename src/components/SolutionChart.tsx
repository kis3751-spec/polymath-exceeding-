import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import './SolutionChart.css'
import { fittedDomain, fraction, interpolate } from './chart-domain'
import {
  initialWindow,
  nearestPointIndex,
  pointOnCurve,
  wheelFactor,
  zoomWindow,
  type CurvePoint,
  type ZoomAxis,
} from './chart-interaction'

export interface SolutionChartProps {
  modelKind?: 'linear' | 'nonlinear'
  expanded?: boolean
  points: CurvePoint[]
  selectionPoints?: CurvePoint[]
  variables: string[]
  parameterName: string
  currentParameter: number
  currentValues?: number[]
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  visibleVariables: string[]
  onToggleVariable: (name: string) => void
  onParameterChange?: (value: number) => void
}

export const SERIES_COLORS = [
  '#087f74',
  '#df9963',
  '#879ac3',
  '#b18aa7',
  '#c0a853',
  '#639ba9',
]

const MAX_WIDTH = 680
const EXPANDED_MAX_WIDTH = 1200
const MIN_WIDTH = 320
const HEIGHT = 290
const PLOT = { left: 51, right: 20, top: 24, bottom: 37 }

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1e6 || absolute < 0.0001) return value.toExponential(2)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(
    value,
  )
}

function axisNumber(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 0.001)
    return value.toExponential(1)
  return Number(value.toPrecision(4)).toString()
}

export default function SolutionChart({
  modelKind = 'linear',
  expanded = false,
  points,
  selectionPoints,
  variables,
  parameterName,
  currentParameter,
  currentValues,
  selectedIndex,
  onSelectIndex,
  visibleVariables,
  onToggleVariable,
  onParameterChange,
}: SolutionChartProps) {
  const titleId = useId()
  const descriptionId = useId()
  const clipId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(MAX_WIDTH)
  const [hover, setHover] = useState<CurvePoint | null>(null)
  const [zoomAxis, setZoomAxis] = useState<ZoomAxis>('both')
  const [window, setWindow] = useState(initialWindow)
  const [zoomActive, setZoomActive] = useState(false)
  const frame = useRef<number | null>(null)
  const pointerParameter = useRef<number | null>(null)
  const selectionRef = useRef(selectedIndex)
  const selectionCallback = useRef(onSelectIndex)
  selectionRef.current = selectedIndex
  selectionCallback.current = onSelectIndex
  const height = expanded ? Math.min(520, Math.max(420, width * 0.48)) : HEIGHT
  const innerWidth = width - PLOT.left - PLOT.right
  const innerHeight = height - PLOT.top - PLOT.bottom
  // Hover follows the rendered curve continuously. The table keeps its own
  // exact solver grid and highlights only the nearest row.
  const interactivePoints = selectionPoints?.length ? selectionPoints : points
  const curvePoints = useMemo(
    () =>
      points
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [points],
  )
  const coordinates = useMemo(
    () =>
      interactivePoints
        .map((point, index) => ({ parameter: point.parameter, index }))
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [interactivePoints],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = (measuredWidth: number) => {
      if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
        setWidth(
          Math.min(
            expanded ? EXPANDED_MAX_WIDTH : MAX_WIDTH,
            Math.max(MIN_WIDTH, Math.round(measuredWidth)),
          ),
        )
      }
    }
    updateWidth(container.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) updateWidth(entries[0].contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [expanded])

  const visible = variables
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => visibleVariables.includes(name))
  const baseChart = useMemo(() => {
    if (!curvePoints.length) return null
    let minX = curvePoints[0].parameter
    let maxX = curvePoints.at(-1)!.parameter
    if (minX === maxX) {
      const padding = Math.abs(minX) * 0.1 || 0.5
      if (Number.isFinite(minX - padding)) minX -= padding
      if (Number.isFinite(maxX + padding)) maxX += padding
    }
    const values: number[] = []
    curvePoints.forEach((point) => {
      variables.forEach((name, index) => {
        const value = point.values?.[index]
        if (
          visibleVariables.includes(name) &&
          typeof value === 'number' &&
          Number.isFinite(value)
        )
          values.push(value)
      })
    })
    // Current/hover/table markers never change the coordinate system. Moving
    // the swept parameter must move a point, not resize the same curve.
    const [minY, maxY, yTicks] = fittedDomain(values)
    return { minX, maxX, minY, maxY, yTicks, hasData: values.length > 0 }
  }, [curvePoints, variables, visibleVariables])
  const chart = useMemo(() => {
    if (!baseChart) return null
    const minX = interpolate(baseChart.minX, baseChart.maxX, window.x[0])
    const maxX = interpolate(baseChart.minX, baseChart.maxX, window.x[1])
    const minY = interpolate(baseChart.minY, baseChart.maxY, window.y[0])
    const maxY = interpolate(baseChart.minY, baseChart.maxY, window.y[1])
    if (
      ![minX, maxX, minY, maxY].every(Number.isFinite) ||
      minX >= maxX ||
      minY >= maxY
    )
      return baseChart
    return {
      ...baseChart,
      minX,
      maxX,
      minY,
      maxY,
      yTicks:
        window.y[0] === 0 && window.y[1] === 1
          ? baseChart.yTicks
          : Array.from({ length: 5 }, (_, i) => interpolate(minY, maxY, i / 4)),
    }
  }, [baseChart, window])

  const modelDomainKey = `${parameterName}|${variables.join('|')}|${baseChart?.minX}|${baseChart?.maxX}`
  useEffect(() => {
    setWindow(initialWindow())
    setHover(null)
  }, [modelDomainKey])
  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const activeIndex =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < interactivePoints.length
      ? selectedIndex
      : nearestPointIndex(coordinates, currentParameter)
  const activePoint =
    hover ??
    (selectedIndex !== null ? interactivePoints[activeIndex] : undefined)
  const hasSelection = hover !== null || selectedIndex !== null
  const x = (value: number) =>
    PLOT.left + fraction(value, chart!.minX, chart!.maxX) * innerWidth
  const y = (value: number) =>
    PLOT.top +
    innerHeight -
    fraction(value, chart!.minY, chart!.maxY) * innerHeight
  const currentInDomain =
    chart &&
    Number.isFinite(currentParameter) &&
    currentParameter >= chart.minX &&
    currentParameter <= chart.maxX
  const selectedInDomain =
    chart &&
    activePoint &&
    Number.isFinite(activePoint.parameter) &&
    activePoint.parameter >= chart.minX &&
    activePoint.parameter <= chart.maxX

  function localPointer(svg: SVGSVGElement, clientX: number, clientY: number) {
    const matrix = svg.getScreenCTM()
    if (matrix) {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      return point.matrixTransform(matrix.inverse())
    }
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    }
  }
  function pointerValue(svg: SVGSVGElement, clientX: number, clientY: number) {
    if (!chart) return null
    const local = localPointer(svg, clientX, clientY)
    if (
      !local ||
      local.x < PLOT.left ||
      local.x > width - PLOT.right ||
      local.y < PLOT.top ||
      local.y > height - PLOT.bottom
    )
      return null
    const xRatio = (local.x - PLOT.left) / innerWidth
    const yRatio = 1 - (local.y - PLOT.top) / innerHeight
    return {
      parameter: interpolate(chart.minX, chart.maxX, xRatio),
      xRatio,
      yRatio,
    }
  }
  function selectNearest(parameter: number) {
    const index = nearestPointIndex(coordinates, parameter)
    if (index >= 0 && selectionRef.current !== index) {
      selectionRef.current = index
      selectionCallback.current(index)
    }
  }
  function clearHover() {
    pointerParameter.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setHover(null)
    if (selectionRef.current !== null) {
      selectionRef.current = null
      selectionCallback.current(null)
    }
  }
  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point) {
      clearHover()
      return
    }
    pointerParameter.current = point.parameter
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const parameter = pointerParameter.current
      if (parameter === null) return
      setHover(
        pointOnCurve(curvePoints, parameter) ?? {
          parameter,
          values: null,
          error: '표시된 탐색 범위 밖입니다.',
        },
      )
      selectNearest(parameter)
    })
  }
  function handleClick(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    event.currentTarget.focus()
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point || !baseChart) return
    const parameter = Math.min(
      baseChart.maxX,
      Math.max(baseChart.minX, point.parameter),
    )
    setHover(pointOnCurve(curvePoints, parameter))
    selectNearest(parameter)
    onParameterChange?.(parameter)
  }

  const wheelHandler = useRef<(event: WheelEvent) => void>(() => {})
  wheelHandler.current = (event) => {
    const svg = svgRef.current
    if (!svg || document.activeElement !== svg || !zoomActive) return
    const point = pointerValue(svg, event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    setWindow((previous) =>
      zoomWindow(
        previous,
        zoomAxis,
        point.xRatio,
        point.yRatio,
        wheelFactor(event.deltaY, event.deltaMode),
      ),
    )
    clearHover()
  }
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (event: WheelEvent) => wheelHandler.current(event)
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!interactivePoints.length) return
    const current = activeIndex < 0 ? 0 : activeIndex
    let index = current
    if (event.key === 'ArrowLeft') index = Math.max(0, current - 1)
    else if (event.key === 'ArrowRight')
      index = Math.min(interactivePoints.length - 1, current + 1)
    else if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = interactivePoints.length - 1
    else if (event.key === 'Enter' || event.key === ' ') {
      if (activePoint) onParameterChange?.(activePoint.parameter)
      event.preventDefault()
      return
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      setWindow((previous) =>
        zoomWindow(
          previous,
          zoomAxis,
          0.5,
          0.5,
          event.key === '-' ? 1.2 : 1 / 1.2,
        ),
      )
      return
    } else if (event.key === '0') {
      event.preventDefault()
      setWindow(initialWindow())
      return
    } else if (event.key === 'Escape') {
      clearHover()
      return
    } else return
    event.preventDefault()
    setHover(null)
    onSelectIndex(index)
  }

  // Paths do not depend on hover/current markers. Avoid rebuilding hundreds
  // of path segments for every frame when several simulations are open.
  const curvePaths = useMemo(() => {
    if (!chart) return []
    return variables.map((_, variableIndex) => {
      let path = ''
      let connected = false
      curvePoints.forEach((point) => {
        const value = point.values?.[variableIndex]
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          connected = false
          return
        }
        const px =
          PLOT.left +
          fraction(point.parameter, chart.minX, chart.maxX) * innerWidth
        const py =
          PLOT.top +
          innerHeight -
          fraction(value, chart.minY, chart.maxY) * innerHeight
        path += `${connected ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)} `
        connected = true
      })
      return path
    })
  }, [curvePoints, variables, chart, innerWidth, innerHeight])

  const emptyMessage = !points.length
    ? '모델을 계산하면 파라미터에 따른 해의 변화를 볼 수 있어요.'
    : !visible.length
      ? '위의 변수 이름을 눌러 그래프에 표시해 보세요.'
      : modelKind === 'nonlinear'
        ? '이 범위에는 선택한 해의 유효한 계산 결과가 없어요. 파라미터 범위를 조절해 보세요.'
        : '이 범위에는 유일한 해가 없어요. 파라미터 범위를 조절해 보세요.'

  return (
    <div
      className={`solution-chart${expanded ? ' is-expanded' : ''}`}
      ref={containerRef}
    >
      <div className="sc-legend-row">
        <div className="sc-legend" aria-label="그래프에 표시할 변수">
          {variables.map((name, index) => (
            <button
              key={name}
              type="button"
              className={`sc-legend-button ${visibleVariables.includes(name) ? 'is-visible' : ''}`}
              aria-pressed={visibleVariables.includes(name)}
              aria-label={`${name} 곡선 표시`}
              onClick={() => onToggleVariable(name)}
            >
              <span
                className="sc-legend-dot"
                style={{
                  background: SERIES_COLORS[index % SERIES_COLORS.length],
                }}
              />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <span className="sc-explore-hint">
          곡선 위에서 탐색 · 클릭으로 값 지정
        </span>
      </div>

      <div className="sc-view-controls">
        <span className={`sc-zoom-hint${zoomActive ? ' is-active' : ''}`}>
          {zoomActive ? '휠로 축 확대·축소' : '그래프 클릭 후 휠로 확대·축소'}
        </span>
        <label>
          확대 축
          <select
            aria-label="그래프 확대 축"
            value={zoomAxis}
            onChange={(event) => setZoomAxis(event.target.value as ZoomAxis)}
          >
            <option value="both">양축</option>
            <option value="x">X축</option>
            <option value="y">Y축</option>
          </select>
        </label>
        <button
          type="button"
          className="sc-reset-view"
          onClick={() => {
            setWindow(initialWindow())
            clearHover()
          }}
          aria-label="그래프 축 초기화"
        >
          축 초기화
        </button>
      </div>

      <div className="sc-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          tabIndex={0}
          aria-labelledby={`${titleId} ${descriptionId}`}
          onPointerMove={handlePointer}
          onPointerDown={handleClick}
          onPointerLeave={clearHover}
          onFocus={() => setZoomActive(true)}
          onBlur={() => {
            setZoomActive(false)
            clearHover()
          }}
          onKeyDown={handleKey}
        >
          <title
            id={titleId}
          >{`${parameterName}에 따른 ${modelKind === 'nonlinear' ? '비선형' : '선형'} 방정식 해의 변화`}</title>
          <desc id={descriptionId}>
            마우스는 곡선을 연속으로 탐색하며, 데이터 표에는 가까운 계산 행이
            표시됩니다. 클릭하면 해당 파라미터 값을 적용합니다. 그래프에 초점을
            둔 뒤 휠 또는 더하기·빼기 키로 축을 확대·축소하고 0 키로
            초기화합니다. 좌우 방향키와 Home, End로 표의 값을 선택하고 Enter로
            적용할 수 있습니다.
          </desc>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={PLOT.left}
                y={PLOT.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>

          {chart && (
            <>
              <text x={PLOT.left} y="12" className="sc-axis-caption">
                해의 값
              </text>
              {chart.yTicks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={PLOT.left}
                    x2={width - PLOT.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    className={
                      tick === 0 ? 'sc-grid-line sc-zero-line' : 'sc-grid-line'
                    }
                  />
                  <text
                    x={PLOT.left - 13}
                    y={y(tick) + 4}
                    textAnchor="end"
                    className="sc-axis-label"
                  >
                    {axisNumber(tick)}
                  </text>
                </g>
              ))}
              {Array.from({ length: 5 }, (_, index) => {
                const tick = interpolate(chart.minX, chart.maxX, index / 4)
                return (
                  <g key={index}>
                    <line
                      x1={x(tick)}
                      x2={x(tick)}
                      y1={PLOT.top}
                      y2={height - PLOT.bottom}
                      className="sc-grid-line sc-grid-vertical"
                    />
                    <text
                      x={x(tick)}
                      y={height - PLOT.bottom + 22}
                      textAnchor="middle"
                      className="sc-axis-label"
                    >
                      {axisNumber(tick)}
                    </text>
                  </g>
                )
              })}

              {chart.hasData &&
                visible.map(({ name, index }) => (
                  <path
                    key={name}
                    d={curvePaths[index]}
                    stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                    className="sc-curve"
                    clipPath={`url(#${clipId})`}
                  />
                ))}

              {chart.hasData && currentInDomain && (
                <g clipPath={`url(#${clipId})`}>
                  <line
                    x1={x(currentParameter)}
                    x2={x(currentParameter)}
                    y1={PLOT.top}
                    y2={height - PLOT.bottom}
                    className="sc-current-line"
                  />
                  {!hasSelection &&
                    currentValues &&
                    visible.map(({ name, index }) => {
                      const value = currentValues[index]
                      if (!Number.isFinite(value)) return null
                      return (
                        <circle
                          key={name}
                          cx={x(currentParameter)}
                          cy={y(value)}
                          r="4.5"
                          fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                          className="sc-active-dot sc-current-dot"
                        />
                      )
                    })}
                  <circle
                    cx={x(currentParameter)}
                    cy={height - PLOT.bottom}
                    r="3"
                    fill="#6c827d"
                  />
                </g>
              )}

              {chart.hasData && hasSelection && selectedInDomain && (
                <g clipPath={`url(#${clipId})`}>
                  <line
                    x1={x(activePoint.parameter)}
                    x2={x(activePoint.parameter)}
                    y1={PLOT.top}
                    y2={height - PLOT.bottom}
                    className="sc-crosshair"
                  />
                  {visible.map(({ name, index }) => {
                    const value = activePoint.values?.[index]
                    if (typeof value !== 'number' || !Number.isFinite(value))
                      return null
                    return (
                      <circle
                        key={name}
                        cx={x(activePoint.parameter)}
                        cy={y(value)}
                        r="4.5"
                        fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                        className="sc-active-dot"
                      />
                    )
                  })}
                </g>
              )}
            </>
          )}
        </svg>

        {(!chart?.hasData || !visible.length) && (
          <div className="sc-empty">
            <span>⌁</span>
            <p>{emptyMessage}</p>
          </div>
        )}

        {chart?.hasData && hasSelection && selectedInDomain && (
          <div
            className="sc-tooltip"
            style={{
              left: `clamp(8px, ${(x(activePoint.parameter) / width) * 100 + 2}%, calc(100% - 160px))`,
            }}
          >
            <div className="sc-tooltip-heading">
              <span>{parameterName}</span>
              <strong>{formatNumber(activePoint.parameter)}</strong>
            </div>
            {activePoint.values ? (
              visible.map(({ name, index }) => (
                <div className="sc-tooltip-value" key={name}>
                  <span>
                    <i
                      style={{
                        background: SERIES_COLORS[index % SERIES_COLORS.length],
                      }}
                    />
                    {name}
                  </span>
                  <strong>{formatNumber(activePoint.values![index])}</strong>
                </div>
              ))
            ) : (
              <p className="sc-tooltip-error">
                {activePoint.error || '유일한 해 없음'}
              </p>
            )}
            {hover?.values && (
              <p className="sc-tooltip-sample">
                곡선 보간값 · 표는 가까운 계산값
              </p>
            )}
          </div>
        )}
      </div>

      <div className="sc-chart-footer">
        <span>
          파라미터 <strong>{parameterName || '—'}</strong>
        </span>
        <span className="sc-current-note">
          <i />
          {hasSelection ? '탐색 지점' : '현재 설정'}
          <strong>
            {hasSelection && activePoint
              ? String(hasSelection ? activePoint.parameter : currentParameter)
              : Number.isFinite(currentParameter)
                ? String(currentParameter)
                : '—'}
          </strong>
        </span>
      </div>
      <span className="sc-sr-only" aria-live="polite">
        {selectedIndex !== null && activePoint && !hover
          ? `${parameterName}: ${String(activePoint.parameter)}, ${variables.map((name, index) => `${name}: ${activePoint.values ? formatNumber(activePoint.values[index]) : '해 없음'}`).join(', ')}`
          : ''}
      </span>
    </div>
  )
}
