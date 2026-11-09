import { rootStructureLabel } from '../engine/tangency'
import { useEffect, useRef, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import type { Parameter, SimulationAnchor, SimulationPanel } from '../engine'
import SolutionChart, { SERIES_COLORS } from './SolutionChart'
import './SimulationPanelView.css'
import { encodeCsv } from '../csv'

export type SimulationPanelViewProps = {
  panel: SimulationPanel
  anchor: SimulationAnchor
  parameters: Parameter[]
  expanded: boolean
  onClose: () => void
  closable?: boolean
  onParameterChange?: (value: number) => void
  onSweepNameChange?: (name: string) => void
  onReport?: () => void
  pending?: boolean
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(8)).toString()
}

function vectorText(variables: string[], values: number[]): string {
  return variables
    .map((name, index) => `${name} = ${formatNumber(values[index])}`)
    .join(' · ')
}

export default function SimulationPanelView({
  panel,
  anchor,
  parameters,
  expanded,
  onClose,
  closable = true,
  onParameterChange,
  onSweepNameChange,
  onReport,
  pending = false,
}: SimulationPanelViewProps) {
  const variables = panel.result?.variables ?? anchor.variables
  const variableKey = variables.join('\u0000')
  const [visibleVariables, setVisibleVariables] = useState(variables)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const parameter = parameters.find((item) => item.name === panel.sweepName)
  const hasSweep = Boolean(panel.sweepName && parameter)

  useEffect(() => {
    setVisibleVariables(variables)
  }, [variableKey])

  useEffect(() => {
    setSelectedIndex(null)
  }, [panel.dataset, panel.sweepName])

  useEffect(() => {
    if (selectedIndex === null) return
    const row = rows.current[selectedIndex]
    const container = scroller.current
    if (!row || !container || !container.clientHeight) return
    const headingHeight = 38
    if (row.offsetTop < container.scrollTop + headingHeight) {
      container.scrollTop = Math.max(0, row.offsetTop - headingHeight)
    } else if (
      row.offsetTop + row.offsetHeight >
      container.scrollTop + container.clientHeight
    ) {
      container.scrollTop =
        row.offsetTop + row.offsetHeight - container.clientHeight
    }
  }, [selectedIndex])

  function downloadCsv() {
    const content = hasSweep
      ? [
          [panel.sweepName, ...variables],
          ...panel.dataset.map((point) => [
            point.parameter,
            ...variables.map((_, index) => point.values?.[index] ?? ''),
          ]),
        ]
      : [
          ['변수', '값'],
          ...variables.map((name, index) => [
            name,
            panel.result?.values[index] ?? '',
          ]),
        ]
    const text = encodeCsv(content)
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `polymath-simulation-${panel.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel${expanded ? ' is-expanded' : ''}${pending ? ' is-pending' : ''}`}
      aria-label={`${panel.label} 시뮬레이션`}
      aria-busy={pending}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>{panel.label}</h3>
          <p className="simulation-panel-anchor">
            <span>선택 기준</span>
            <span title={vectorText(anchor.variables, anchor.values)}>
              {vectorText(anchor.variables, anchor.values)}
            </span>
          </p>
        </div>
        {closable && (
          <button
            type="button"
            className="simulation-panel-close"
            onClick={onClose}
            aria-label={`${panel.label} 시뮬레이션 닫기`}
            title="시뮬레이션 닫기"
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="simulation-panel-current">
        <span>
          현재 해
          {panel.result?.rootStructure &&
            ` · ${rootStructureLabel(panel.result.rootStructure)}`}
        </span>
        <strong>
          {panel.result
            ? vectorText(panel.result.variables, panel.result.values)
            : '현재 분기 추적 불가'}
        </strong>
        {pending && <small role="status">계산 중…</small>}
      </div>

      {!panel.result && (
        <p className="simulation-panel-error" role="alert">
          {panel.error ||
            '현재 파라미터에서 선택한 해를 찾지 못했습니다. 파라미터를 조정해 주세요.'}
        </p>
      )}

      {hasSweep ? (
        <div className="simulation-panel-chart">
          {onSweepNameChange && (
            <label className="sweep-selector">
              가로축 파라미터
              <select
                aria-label={`${panel.label} 가로축 파라미터`}
                value={panel.sweepName}
                onChange={(e) => onSweepNameChange(e.target.value)}
              >
                {parameters.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <SolutionChart
            expanded={expanded}
            modelKind="nonlinear"
            points={panel.sweep}
            events={panel.events}
            selectionPoints={panel.dataset}
            variables={variables}
            parameterName={panel.sweepName}
            currentParameter={parameter?.value ?? 0}
            currentValues={panel.result?.values}
            onParameterChange={onParameterChange}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleVariables}
            onToggleVariable={(name) =>
              setVisibleVariables((current) =>
                current.includes(name)
                  ? current.filter((item) => item !== name)
                  : [...current, name],
              )
            }
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 이 해가 어떻게 변하는지 탐색할 수 있습니다.
        </p>
      )}

      <details className="analysis-details simulation-reading-help">
        <summary>초기값과 끊긴 곡선은 어떻게 읽나요?</summary>
        <p>
          초기값은 여러 해 중 처음 선택할 해를 정합니다. 이후에는 그 해를 연속
          추적합니다. 탐색 파라미터만 움직이면 기준 곡선은 유지되고 현재점만
          이동합니다. 다른 고정 파라미터를 바꾸면 식 자체가 달라져 곡선을 다시
          계산합니다.
        </p>
        <p>
          빈 구간은 선택한 해를 연속적으로 추적하지 못한 곳입니다. 근이
          병합·소멸하거나 정의역을 벗어날 수 있고, 수치 보정이 실패할 수도
          있습니다. 다른 해의 부재를 뜻하지는 않습니다. 모든 가지를 비교하려면
          자동 탐색을 사용하세요. ‘모델 풀기’를 다시 누르면 현재 설정과
          초기값으로 기준 해를 새로 선택합니다.
        </p>
      </details>
      {panel.datasetError && (
        <p className="simulation-panel-error" role="alert">
          {panel.datasetError}
        </p>
      )}

      {hasSweep && panel.dataset.length > 0 && (
        <details className="simulation-panel-data">
          <summary>데이터 표</summary>
          <p className="simulation-panel-data-note">
            설정한 샘플 포인트 간격으로 계산한 값입니다. 표와 그래프의 선택
            지점을 함께 확인할 수 있습니다.
          </p>
          <div
            className="simulation-panel-table-scroll"
            ref={scroller}
            onPointerLeave={() => setSelectedIndex(null)}
          >
            <table>
              <caption className="simulation-panel-sr-only">
                {panel.label}의 {panel.sweepName}별 계산 결과
              </caption>
              <thead>
                <tr>
                  <th scope="col">{panel.sweepName}</th>
                  {variables.map((name, index) => (
                    <th scope="col" key={name}>
                      <i
                        style={{
                          background:
                            SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.dataset.map((point, index) => (
                  <tr
                    key={index}
                    ref={(element) => {
                      rows.current[index] = element
                    }}
                    tabIndex={0}
                    aria-label={`${panel.sweepName} ${String(point.parameter)} 탐색`}
                    aria-selected={selectedIndex === index}
                    className={selectedIndex === index ? 'is-selected' : ''}
                    onPointerEnter={() => setSelectedIndex(index)}
                    onFocus={() => setSelectedIndex(index)}
                    onClick={() => setSelectedIndex(index)}
                    onBlur={() => setSelectedIndex(null)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === 'ArrowDown'
                          ? index + 1
                          : event.key === 'ArrowUp'
                            ? index - 1
                            : null
                      if (next !== null) {
                        event.preventDefault()
                        rows.current[next]?.focus()
                      }
                    }}
                  >
                    <td>{formatNumber(point.parameter)}</td>
                    {point.values ? (
                      variables.map((name, variableIndex) => (
                        <td key={name}>
                          {formatNumber(point.values?.[variableIndex])}
                        </td>
                      ))
                    ) : (
                      <td
                        colSpan={Math.max(1, variables.length)}
                        className="simulation-panel-no-solution"
                        title={point.error}
                      >
                        추적 미완료
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={downloadCsv}
          disabled={
            pending ||
            (hasSweep
              ? Boolean(panel.datasetError) || panel.dataset.length === 0
              : !panel.result)
          }
          aria-label={`${panel.label} CSV 저장`}
        >
          <Download size={14} aria-hidden="true" /> CSV 저장
        </button>
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            disabled={pending || !panel.result}
            aria-label={`${panel.label} 해석 리포트`}
          >
            <FileText size={14} aria-hidden="true" /> 해석 리포트
          </button>
        )}
      </footer>
    </section>
  )
}
