import { isNonlinearFunction } from '../nonlinear-parser'
import { ModelError } from '../index'

export type ScientificTable = {
  columns: string[]
  rows: number[][]
  remainingLines: string[]
}
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const fields = (text: string) =>
  text
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)

/** Embedded [table] shared by regression, LSQ and discrete integration. */
export function parseDataTable(source: string): ScientificTable {
  if (source.length > 500_000)
    throw new ModelError('모델은 500,000자 이내로 입력하세요.')
  const lines = source.replace(/\r\n?/g, '\n').replace(/−/g, '-').split('\n')
  const remainingLines: string[] = [],
    columns: string[] = [],
    rows: number[][] = []
  let inside = false,
    seen = false,
    closed = false
  lines.forEach((raw, index) => {
    const text = raw.split('#')[0].trim()
    if (text === '[') {
      if (seen)
        throw new ModelError('데이터 표는 한 개만 입력하세요.', index + 1)
      seen = inside = true
      return
    }
    if (text === ']') {
      if (!inside)
        throw new ModelError('데이터 표의 시작 [가 없습니다.', index + 1)
      inside = false
      closed = true
      return
    }
    if (!inside) {
      if (text) remainingLines.push(text)
      return
    }
    if (!text) return
    const cells = fields(text)
    if (!columns.length) {
      if (
        !cells.length ||
        cells.length > 32 ||
        cells.some(
          (name) =>
            !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) ||
            isNonlinearFunction(name) ||
            ['pi', 'e'].includes(name),
        ) ||
        new Set(cells).size !== cells.length
      )
        throw new ModelError(
          '표의 열 이름은 중복 없는 영문 변수명으로 최대 32개까지 입력하세요.',
          index + 1,
        )
      columns.push(...cells)
    } else {
      if (
        cells.length !== columns.length ||
        cells.some((x) => !numeric.test(x) || !Number.isFinite(Number(x)))
      )
        throw new ModelError(
          `각 데이터 행에 유한한 숫자 ${columns.length}개가 필요합니다. 소수점은 .을 사용하세요.`,
          index + 1,
        )
      rows.push(cells.map(Number))
      if (rows.length > 5000)
        throw new ModelError('데이터는 최대 5,000행까지 계산합니다.', index + 1)
    }
  })
  if (inside || (seen && !closed))
    throw new ModelError('데이터 표를 ]로 닫아 주세요.')
  if (seen && (!columns.length || !rows.length))
    throw new ModelError('표에는 열 이름과 최소 한 행의 숫자가 필요합니다.')
  return { columns, rows, remainingLines }
}
