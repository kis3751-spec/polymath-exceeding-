import { ModelError } from '../index'
import { preprocessSolverSource } from '../preprocessor'
import { compileAssignments } from './expression'
import { parseDataTable } from './data'
import type { ScientificRequest, ScientificResult } from './types'

type Piece = {
  end: number
  x: number
  h: number
  a: number
  b: number
  c: number
  d: number
}
const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function numeric(text: string, label: string) {
  if (!numberPattern.test(text) || !Number.isFinite(Number(text)))
    throw new ModelError(`${label}에는 유한한 숫자를 입력하세요.`)
  return Number(text)
}

function naturalCubic(x: number[], y: number[]): Piece[] {
  const n = x.length,
    h = x.slice(1).map((v, i) => v - x[i])
  const second = Array<number>(n).fill(0)
  if (n > 2) {
    const diagonal: number[] = [],
      upper: number[] = [],
      rhs: number[] = []
    for (let i = 1; i < n - 1; i++) {
      const scale = Math.max(h[i - 1], h[i])
      const lower = h[i - 1] / scale
      let mid = 2 * (h[i - 1] / scale + h[i] / scale)
      let value =
        (6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1])) / scale
      if (i > 1) {
        const ratio = lower / diagonal[i - 2]
        mid -= ratio * upper[i - 2]
        value -= ratio * rhs[i - 2]
      }
      diagonal.push(mid)
      upper.push(h[i] / scale)
      rhs.push(value)
    }
    for (let i = n - 2; i >= 1; i--)
      second[i] = (rhs[i - 1] - upper[i - 1] * second[i + 1]) / diagonal[i - 1]
  }
  return h.map((width, i) => ({
    x: x[i],
    end: x[i + 1],
    h: width,
    a: y[i],
    b:
      (y[i + 1] - y[i]) / width - (width * (2 * second[i] + second[i + 1])) / 6,
    c: second[i] / 2,
    d: (second[i + 1] - second[i]) / (6 * width),
  }))
}

function akima(x: number[], y: number[]): Piece[] {
  if (x.length < 5)
    throw new ModelError(
      'Akima 보간에는 서로 다른 x 데이터가 최소 5개 필요합니다.',
    )
  const n = x.length
  const slopes = x.slice(1).map((v, i) => (y[i + 1] - y[i]) / (v - x[i]))
  const left = 2 * slopes[0] - slopes[1]
  const right = 2 * slopes[n - 2] - slopes[n - 3]
  const extended = [
    2 * left - slopes[0],
    left,
    ...slopes,
    right,
    2 * right - slopes[n - 2],
  ]
  const derivative = x.map((_, i) => {
    const w1 = Math.abs(extended[i + 3] - extended[i + 2])
    const w2 = Math.abs(extended[i + 1] - extended[i])
    const scale = Math.max(w1, w2)
    return scale === 0
      ? extended[i + 1] / 2 + extended[i + 2] / 2
      : ((w1 / scale) * extended[i + 1] + (w2 / scale) * extended[i + 2]) /
          (w1 / scale + w2 / scale)
  })
  return slopes.map((slope, i) => {
    const h = x[i + 1] - x[i]
    return {
      x: x[i],
      end: x[i + 1],
      h,
      a: y[i],
      b: derivative[i],
      c: (3 * slope - 2 * derivative[i] - derivative[i + 1]) / h,
      d: (derivative[i] + derivative[i + 1] - 2 * slope) / (h * h),
    }
  })
}

function makePieces(x: number[], y: number[], method: string): Piece[] {
  const pieces =
    method === 'ccs'
      ? naturalCubic(x, y)
      : method === 'akm'
        ? akima(x, y)
        : x.slice(1).map((v, i) => ({
            x: x[i],
            end: v,
            h: v - x[i],
            a: y[i],
            b: (y[i + 1] - y[i]) / (v - x[i]),
            c: 0,
            d: 0,
          }))
  if (pieces.some((piece) => !Object.values(piece).every(Number.isFinite)))
    throw new ModelError(
      '데이터 스케일 때문에 보간 계수를 유한하게 계산할 수 없습니다. x·y 단위를 조정하세요.',
    )
  return pieces
}

function pieceAt(pieces: Piece[], x: number) {
  let lo = 0,
    hi = pieces.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (pieces[mid].x <= x) lo = mid
    else hi = mid - 1
  }
  return pieces[lo]
}

function valueAt(pieces: Piece[], x: number) {
  const piece = pieceAt(pieces, x),
    s = x - piece.x
  return ((piece.d * s + piece.c) * s + piece.b) * s + piece.a
}

/** Integrate each local polynomial directly. Avoid subtracting two large
 * global antiderivatives when a narrow interval lies far from the origin. */
function areaBetween(pieces: Piece[], from: number, to: number): number {
  if (from === to) return 0
  if (from > to) return -areaBetween(pieces, to, from)
  let sum = 0,
    correction = 0
  for (const p of pieces) {
    const lo = Math.max(from, p.x),
      hi = Math.min(to, p.end)
    if (hi <= lo) continue
    const u = lo - p.x,
      width = hi - lo
    // Taylor around the clipped left endpoint; exact polynomial integration.
    const a = ((p.d * u + p.c) * u + p.b) * u + p.a
    const b = (3 * p.d * u + 2 * p.c) * u + p.b
    const c = p.c + 3 * p.d * u
    const term =
      width * (a + width * (b / 2 + width * (c / 3 + (width * p.d) / 4)))
    const next = sum + term
    correction +=
      Math.abs(sum) >= Math.abs(term) ? sum - next + term : term - next + sum
    sum = next
  }
  const result = sum + correction
  if (!Number.isFinite(result))
    throw new ModelError(
      '적분 결과가 Float64 표현 범위를 벗어났습니다. 데이터 단위를 조정하세요.',
    )
  return result
}

export function solveIntegration(request: ScientificRequest): ScientificResult {
  const start = performance.now()
  const table = parseDataTable(request.source)
  if (!table.rows.length)
    throw new ModelError('적분할 [ 데이터 표 ]가 필요합니다.')
  const commands = table.remainingLines.filter((line) =>
    /^integrate\b/i.test(line),
  )
  if (commands.length !== 1)
    throw new ModelError(
      'integrate y(x) 시작 끝 [구간수] [lin|ccs|akm] 명령을 하나 입력하세요.',
    )
  const command =
    /^integrate\s+([A-Za-z][A-Za-z0-9_]*)\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s+(\S+)\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?$/i.exec(
      commands[0],
    )
  if (!command)
    throw new ModelError(
      '적분 명령은 integrate y(x) 시작 끝 [구간수] [lin|ccs|akm] 형태로 입력하세요.',
    )
  const [, yName, xName, fromText, toText, optional1, optional2] = command
  const from = numeric(fromText, '적분 시작'),
    to = numeric(toText, '적분 끝')
  const inlineMethod =
    optional2 ??
    (optional1 && !numberPattern.test(optional1) ? optional1 : undefined)
  const method = (
    request.options?.method ??
    inlineMethod ??
    'lin'
  ).toLowerCase()
  if (!['lin', 'ccs', 'akm'].includes(method))
    throw new ModelError(
      '적분 방법은 lin(직선), ccs(자연 3차 스플라인), akm(Akima) 중에서 선택하세요.',
    )
  if (optional2 && (!optional1 || !numberPattern.test(optional1)))
    throw new ModelError('보간 방법 앞에는 정수 구간수를 입력하세요.')
  let sections =
    optional1 && numberPattern.test(optional1)
      ? Number(optional1)
      : (request.options?.samples ?? 201) - 1
  if (!Number.isInteger(sections) || sections < 1 || sections > 2000)
    throw new ModelError('그래프 구간수는 1~2,000 사이의 정수로 입력하세요.')
  if (table.rows.length < 2)
    throw new ModelError(
      '적분에는 서로 다른 x 값을 가진 데이터가 최소 2개 필요합니다.',
    )
  if (xName === yName)
    throw new ModelError('적분의 독립변수와 종속변수는 서로 다르게 지정하세요.')
  const definitions = table.remainingLines.filter(
    (line) => line !== commands[0],
  )
  const names = new Set([
    ...table.columns,
    ...definitions.map((line) => line.split('=')[0].trim()),
  ])
  let xOutput = 'IntegrationOutputX',
    yOutput = 'IntegrationOutputY'
  while (names.has(xOutput)) xOutput += 'X'
  while (names.has(yOutput)) yOutput += 'Y'
  const expanded = preprocessSolverSource(
    [...definitions, `${xOutput}=${xName}`, `${yOutput}=${yName}`].join('\n'),
    [...table.columns, ...Object.keys(request.parameters ?? {})],
    'nonlinear',
  )
  const helpers = compileAssignments(expanded.split('\n'), {
    reserved: table.columns,
    parameters: request.parameters,
  })
  const checkBudget = () => {
    if (performance.now() - start > 3000)
      throw new ModelError(
        '적분 계산 시간 한도에 도달했습니다. 데이터 행 수·보조식·그래프 구간수를 줄여 주세요.',
      )
  }
  const data = table.rows.map((row) => {
    checkBudget()
    const scope = helpers.evaluate(
      Object.fromEntries(table.columns.map((name, i) => [name, row[i]])),
    )
    return [scope[xOutput], scope[yOutput]]
  })
  if (data.some((row) => !row.every(Number.isFinite)))
    throw new ModelError('파생 x·y 데이터는 유한한 숫자여야 합니다.')
  const sorted = [...data].sort((a, b) => a[0] - b[0]),
    warnings: string[] = []
  if (sorted.some((row, i) => row !== data[i]))
    warnings.push('입력 데이터를 x 오름차순으로 정렬했습니다.')
  const x = sorted.map((row) => row[0]),
    y = sorted.map((row) => row[1])
  if (x.some((value, i) => i > 0 && value === x[i - 1]))
    throw new ModelError(
      '적분 데이터의 x 값이 중복됩니다. 같은 x의 측정값을 먼저 정리하세요.',
    )
  if (!Number.isFinite(x.at(-1)! - x[0]))
    throw new ModelError(
      'x 데이터의 전체 폭이 Float64 표현 범위를 벗어났습니다.',
    )
  const lower = Math.min(from, to),
    upper = Math.max(from, to)
  if (lower < x[0] || upper > x.at(-1)!)
    throw new ModelError(
      `적분 범위는 데이터 범위 [${x[0]}, ${x.at(-1)}] 안에 있어야 합니다. 외삽은 하지 않습니다.`,
    )
  const pieces = makePieces(x, y, method),
    integral = areaBetween(pieces, from, to)
  const linearIntegral = areaBetween(makePieces(x, y, 'lin'), from, to)
  const sampleX = Array.from({ length: sections + 1 }, (_, i) =>
    i === 0
      ? from
      : i === sections
        ? to
        : from * (1 - i / sections) + to * (i / sections),
  ).filter((value, i, all) => i === 0 || value !== all[i - 1])
  const rows = sampleX.map((value) => {
    checkBudget()
    return [value, valueAt(pieces, value), areaBetween(pieces, from, value)]
  })
  if (rows.some((row) => !row.every(Number.isFinite)))
    throw new ModelError('보간 결과가 숫자 표현 범위를 벗어났습니다.')
  const label =
    method === 'ccs'
      ? '자연 3차 스플라인 조각 적분'
      : method === 'akm'
        ? 'Akima 3차 Hermite 조각 적분'
        : '구간별 직선 보간 · 사다리꼴 적분'
  if (method !== 'lin')
    warnings.push(
      '보간 곡선의 면적입니다. 표 사이의 실제 물리 곡선이나 측정 오차에 대한 오차 상한은 아닙니다.',
    )
  else
    warnings.push(
      '표 사이를 직선으로 연결한 면적입니다. 표에 없는 곡선 모양이나 측정 오차는 포함하지 않습니다.',
    )
  if (from > to)
    warnings.push(
      '적분 방향이 역순이므로 누적 면적에 음의 방향을 적용했습니다.',
    )
  const observed = sorted.filter((row) => row[0] >= lower && row[0] <= upper)
  return {
    module: 'integration',
    method: label,
    status: 'completed',
    columns: [xName, yName, `누적 적분`],
    rows,
    series: [
      {
        name: '보간 곡선',
        x: sampleX,
        y: rows.map((row) => row[1]),
        style: 'line',
        axisLabel: xName,
      },
      {
        name: '측정 데이터',
        x: observed.map((row) => row[0]),
        y: observed.map((row) => row[1]),
        style: 'points',
        axisLabel: xName,
      },
      {
        name: '누적 적분 I(x)',
        x: sampleX,
        y: rows.map((row) => row[2]),
        style: 'line',
        axisLabel: xName,
      },
    ],
    values: { integral },
    integration: {
      from,
      to,
      independent: xName,
      dependent: yName,
      value: integral,
    },
    metrics: [
      {
        label: '정적분',
        value: integral,
        detail:
          '선택한 보간 다항식을 각 데이터 구간에서 해석적으로 적분한 부호 있는 면적입니다.',
      },
      {
        label: '사다리꼴 대비 차이',
        value: Math.abs(integral - linearIntegral),
        detail:
          '같은 데이터의 직선 보간 면적과의 차이입니다. 보간 선택에 대한 참고값이며 실제 오차 상한은 아닙니다.',
      },
      {
        label: '입력 데이터',
        value: x.length,
        detail:
          '서로 다른 x 값의 개수입니다. 그래프 구간수를 늘려도 입력 측정 정보는 증가하지 않습니다.',
      },
      {
        label: '그래프 샘플',
        value: rows.length,
        detail:
          '선택한 보간 곡선을 표시하고 누적 적분 표를 출력하는 지점 수입니다. 이 값은 조각 적분의 정확도를 설정하지 않습니다.',
      },
    ],
    warnings,
    evaluations: rows.length,
    durationMs: performance.now() - start,
    formula: `∫ ${yName} d${xName}, ${from} → ${to}`,
  }
}
