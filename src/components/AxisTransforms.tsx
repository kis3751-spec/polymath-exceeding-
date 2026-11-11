import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  compileAxes,
  DEFAULT_AXES,
  type AxisTransform,
} from '../axis-transform'
import './AxisTransforms.css'
export type AxisPreferences = Record<string, AxisTransform>
const Context = createContext<{
  value: AxisPreferences
  onChange: (next: AxisPreferences) => void
}>({ value: {}, onChange: () => {} })
export function AxisTransformProvider({
  value = {},
  onChange,
  children,
}: {
  value?: AxisPreferences
  onChange: (next: AxisPreferences) => void
  children: ReactNode
}) {
  return (
    <Context.Provider
      value={{
        value:
          value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {},
        onChange,
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function useAxisTransform(key: string) {
  const context = useContext(Context)
  const saved = context.value[key]
  let axes = DEFAULT_AXES
  if (saved && typeof saved.x === 'string' && typeof saved.y === 'string') {
    try {
      compileAxes(saved)
      axes = saved
    } catch {
      /* invalid imports keep the original axes */
    }
  }
  return [
    axes,
    (next: AxisTransform) =>
      context.onChange({ ...context.value, [key]: next }),
  ] as const
}
export default function AxisTransforms({
  value,
  onChange,
}: {
  value: AxisTransform
  onChange: (value: AxisTransform) => void
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState('')
  useEffect(() => {
    setDraft(value)
    setError('')
  }, [value.x, value.y])
  function apply() {
    try {
      compileAxes(draft)
      onChange({ x: draft.x.trim(), y: draft.y.trim() })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '축 수식을 확인하세요.')
    }
  }
  return (
    <details className="axis-transforms">
      <summary>Axis Expressions</summary>
      <p>
        x와 y는 이 그래프의 원래 X·Y 좌표입니다. 예: X = log(x), Y = 2*y+1.
        log는 상용로그, ln은 자연로그입니다. 각 곡선에 같은 식을 적용합니다.
      </p>
      <div className="axis-expression-fields">
        {(['x', 'y'] as const).map((axis) => (
          <label key={axis}>
            {axis.toUpperCase()} Expression
            <input
              aria-label={`${axis.toUpperCase()} Expression`}
              spellCheck={false}
              maxLength={512}
              value={draft[axis]}
              onChange={(e) => setDraft({ ...draft, [axis]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  apply()
                }
              }}
            />
          </label>
        ))}
        <button type="button" onClick={apply}>
          Apply Axes
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_AXES)
            onChange(DEFAULT_AXES)
            setError('')
          }}
        >
          Original Axes
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>
        계산·표·CSV·리포트 수치는 원본 그대로입니다. 정의역 밖의 점은 빈
        구간으로 표시합니다. 변환된 점의 클릭은 가장 가까운 원래 데이터 지점을
        선택합니다. 축 설정은 프로젝트에 저장됩니다.
      </p>
    </details>
  )
}
