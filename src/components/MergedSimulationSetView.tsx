import { useEffect, useState, type ReactNode } from 'react'
import { Download, Layers3, Trash2, X } from 'lucide-react'
import type {
  MergedSimulationSet,
  Parameter,
  SimulationAnchor,
  SimulationPanel,
} from '../engine'
import { encodeCsv } from '../csv'
import { detectMergedBranchEvents } from '../engine/simulation-panels'
import { branchEventLabel } from '../engine/branch-events'
import SolutionChart, {
  SERIES_COLORS,
  type MultiBranchSeries,
} from './SolutionChart'

export type MergedSimulationSetViewProps = {
  mergedSet: MergedSimulationSet
  anchors: SimulationAnchor[]
  panels: SimulationPanel[]
  parameters: Parameter[]
  sweepName: string
  selectedAnchorId?: string
  large?: boolean
  onSelectAnchor?: (anchor: SimulationAnchor) => void
  onReportAnchor?: (anchor: SimulationAnchor) => void
  expanded: boolean
  pending: boolean
  onRemoveSet: () => void
  onToggleAnchorInSet: (anchorId: string) => void
  onParameterChange?: (value: number) => void
  onSweepNameChange?: (name: string) => void
  controls?: ReactNode
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(7)).toString()
}

export default function MergedSimulationSetView({
  mergedSet,
  anchors,
  panels,
  parameters,
  sweepName,
  expanded,
  large = false,
  selectedAnchorId,
  onSelectAnchor,
  onReportAnchor,
  pending,
  onRemoveSet,
  onToggleAnchorInSet,
  onParameterChange,
  onSweepNameChange,
  controls,
}: MergedSimulationSetViewProps) {
  const includedAnchors = anchors.filter((a) =>
    mergedSet.anchorIds.includes(a.id),
  )
  const includedPanels = includedAnchors.map(
    (anchor) =>
      panels.find((p) => p.id === anchor.id) ?? {
        id: anchor.id,
        label: anchor.label,
        result: null,
        sweep: [],
        dataset: [],
        sweepName,
        events: [],
      },
  )

  const variables = includedPanels[0]?.result?.variables ??
    includedAnchors[0]?.variables ?? ['x']
  const [activeVarIdx, setActiveVarIdx] = useState(0)
  const [visibleBranchIds, setVisibleBranchIds] = useState<string[]>(
    mergedSet.anchorIds,
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    setVisibleBranchIds(mergedSet.anchorIds)
  }, [mergedSet.anchorIds.join('|')])

  useEffect(() => {
    setActiveVarIdx(0)
    setSelectedIndex(null)
  }, [variables.join('|'), sweepName])
  const branchColor = (id: string) =>
    SERIES_COLORS[
      Math.max(
        0,
        anchors.findIndex((a) => a.id === id),
      ) % SERIES_COLORS.length
    ]
  const sweepParam = parameters.find((p) => p.name === sweepName)
  const mergedEvents = detectMergedBranchEvents(includedPanels)

  const multiBranchSeries: MultiBranchSeries[] = includedPanels.map(
    (panel, idx) => ({
      id: panel.id,
      label: panel.label,
      color: branchColor(panel.id),
      points: panel.sweep,
      samplePoints: panel.dataset,
      currentValues: panel.result?.values,
      events: mergedEvents.filter(
        (event) =>
          event.branchId === panel.id || event.mergedWithAnchorId === panel.id,
      ),
    }),
  )

  function exportMergedCsv() {
    if (
      !sweepParam ||
      !includedPanels.length ||
      includedPanels.some((p) => p.datasetError)
    )
      return
    const baseDataset = includedPanels[0].dataset
    const header = [
      sweepName,
      ...includedPanels.map(
        (p) => `${p.label} (${variables[activeVarIdx] ?? 'x'})`,
      ),
    ]
    const rows = baseDataset.map((pt, rowIdx) => [
      pt.parameter,
      ...includedPanels.map(
        (p) => p.dataset[rowIdx]?.values?.[activeVarIdx] ?? '',
      ),
    ])
    const csv = encodeCsv([header, ...rows])
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `ivc-${mergedSet.name.replace(/\s+/g, '-')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel merged-simulation-panel${expanded ? ' is-expanded' : ''}`}
      aria-busy={pending}
      aria-label={`${mergedSet.name} 병합 시뮬레이션`}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>
            <Layers3
              size={15}
              style={{ verticalAlign: '-2px', marginRight: '6px' }}
            />
            {mergedSet.name}
          </h3>
        </div>
        <button
          type="button"
          className="simulation-panel-close"
          onClick={onRemoveSet}
          aria-label={`${mergedSet.name} 삭제`}
          title="병합 세트 삭제"
        >
          <X size={17} />
        </button>
      </header>

      {/* 해 포함/제외 토글 칩 */}
      <div className="merged-set-Chips">
        {anchors.map((anchor, idx) => {
          const active = mergedSet.anchorIds.includes(anchor.id)
          return (
            <button
              key={anchor.id}
              type="button"
              className={`merged-branch-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggleAnchorInSet(anchor.id)}
              title={active ? '클릭하여 세트에서 제외' : '클릭하여 세트에 추가'}
            >
              <i
                style={{
                  background: active ? branchColor(anchor.id) : '#ccc',
                }}
              />
              <span>{anchor.label}</span>
            </button>
          )
        })}
      </div>

      {/* 다변수 연립방정식일 때 비교할 미지수 선택 */}
      {variables.length > 1 && (
        <div className="merged-variable-selector">
          <span>표시할 미지수:</span>
          {variables.map((v, idx) => (
            <button
              key={v}
              type="button"
              className={activeVarIdx === idx ? 'is-selected' : ''}
              onClick={() => setActiveVarIdx(idx)}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* 현재 파라미터에서 각 해의 상태 요약 (생존 vs 소멸/병합) */}
      <details className="merged-current-wrap" open={!large}>
        <summary>각 해 결과·선택</summary>
        <div className="merged-current-grid">
          {includedPanels.map((panel, idx) => {
            const val = panel.result?.values[activeVarIdx]
            const color = branchColor(panel.id)
            const mergeEvent = mergedEvents.find(
              (event) =>
                event.kind === 'merge' &&
                (event.branchId === panel.id ||
                  event.mergedWithAnchorId === panel.id),
            )
            return (
              <div
                key={panel.id}
                className={`merged-current-card${!panel.result ? ' is-vanished' : ''}`}
                data-selected={selectedAnchorId === panel.id}
              >
                <span className="merged-card-label">
                  <i style={{ background: color }} />
                  {panel.label}
                </span>
                <strong>
                  {panel.result
                    ? `${variables[activeVarIdx]} = ${formatNumber(val)}`
                    : mergeEvent
                      ? `${branchEventLabel(mergeEvent)} · 현재 추적 불가`
                      : '현재 분기 추적 불가'}
                </strong>
                {onSelectAnchor && (
                  <button
                    type="button"
                    aria-pressed={selectedAnchorId === panel.id}
                    onClick={() => onSelectAnchor(includedAnchors[idx])}
                  >
                    해 선택
                  </button>
                )}
                {onReportAnchor && (
                  <button
                    type="button"
                    onClick={() => onReportAnchor(includedAnchors[idx])}
                  >
                    리포트
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </details>
      <div className="merged-parameter-controls">
        {parameters.length > 0 && onSweepNameChange && (
          <label className="sweep-selector">
            가로축 파라미터
            <select
              aria-label={`${mergedSet.name} 가로축 파라미터`}
              value={sweepName}
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
        {controls}
      </div>
      {sweepParam ? (
        <div className="simulation-panel-chart">
          <SolutionChart
            expanded={expanded}
            large={large}
            modelKind="nonlinear"
            points={includedPanels[0]?.sweep ?? []}
            selectionPoints={includedPanels[0]?.dataset ?? []}
            variables={variables}
            parameterName={sweepName}
            currentParameter={sweepParam.value}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleBranchIds}
            onToggleVariable={(id) =>
              setVisibleBranchIds((prev) =>
                prev.includes(id)
                  ? prev.filter((item) => item !== id)
                  : [...prev, id],
              )
            }
            onParameterChange={onParameterChange}
            multiBranchSeries={multiBranchSeries}
            activeVariableIndex={activeVarIdx}
            events={mergedEvents}
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 여러 해가 어떻게 만나서 병합·소멸하는지 한
          그래프에서 볼 수 있습니다.
        </p>
      )}

      <details className="analysis-details simulation-reading-help">
        <summary>해의 범위와 끊긴 곡선 읽기</summary>
        <p>
          각 색은 저장한 한 해에서 연속적으로 추적한 계산 결과입니다. 현재값에서
          존재하지 않는 해도 다른 파라미터 구간에는 표시될 수 있습니다. 범례나
          위 선택 버튼으로 숨기거나 다시 표시할 수 있습니다.
        </p>
        <p>
          ◆는 국소적으로 확인한 근 병합 지점입니다. 빈 구간은 추적 실패를
          뜻하며, 해가 없다는 증명과는 다릅니다. 실제 근 소멸, 분모 0·정의역
          이탈, 수치 보정 실패를 구분하려면 지점 안내와 리포트를 확인하세요.
          수렴하지 않은 구간을 다른 해로 연결하지 않습니다.
        </p>
        <p>
          전체 해 탐색은 설정한 범위의 여러 파라미터에서 발견한 해를 최대
          6개까지 함께 추적합니다. 유한한 탐색이므로 이 그래프만으로 모든 해가
          포함되었다고 판정하지 않습니다. 가로축 파라미터를 바꾸면 기존 기준
          해에서 새 곡선을 계산하며 세트를 삭제할 필요가 없습니다.
        </p>
      </details>
      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={exportMergedCsv}
          disabled={
            pending ||
            !sweepParam ||
            includedPanels.length === 0 ||
            includedPanels.some((p) => p.datasetError)
          }
        >
          <Download size={14} /> 병합 세트 CSV 저장
        </button>
        <button type="button" onClick={onRemoveSet}>
          <Trash2 size={14} /> 세트 삭제
        </button>
      </footer>
    </section>
  )
}
