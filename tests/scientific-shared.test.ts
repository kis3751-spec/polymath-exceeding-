import { expect, it } from 'vitest'
import { parseDataTable } from '../src/engine/scientific/data'
import {
  compileAssignments,
  compileExpression,
} from '../src/engine/scientific/expression'
it('reads the same table from spreadsheet and comma separated input', () => {
  const a = parseDataTable('[\nx y\n1\t2\n2\t4\n]\npolyfit x y 1')
  const b = parseDataTable('[\nx,y\n1,2\n2,4\n]\npolyfit x y 1')
  expect(a).toEqual(b)
  expect(a.rows).toEqual([
    [1, 2],
    [2, 4],
  ])
  expect(a.remainingLines).toEqual(['polyfit x y 1'])
})
it.each([
  '[\nx x\n1 2\n]',
  '[\nx y\n1 2 3\n]',
  '[\nx y\n1 Infinity\n]',
  '[\nx y\n1 NaN\n]',
  '[\nx y\n1 0xff\n]',
  '[\nsin y\n1 2\n]',
  '[\ne y\n1 2\n]',
  '[\nx y\n1 2',
])('refuses malformed or conflicting data: %s', (source) => {
  expect(() => parseDataTable(source)).toThrow()
})
it('sorts forward helper dependencies and applies constant overrides', () => {
  const compiled = compileAssignments(['rate=k*A', 'k=0.5'], {
    reserved: ['A'],
    parameters: { k: 0.25 },
  })
  expect(compiled.evaluate({ A: 4 })).toEqual({ A: 4, k: 0.25, rate: 1 })
  expect(() => compileAssignments(['k=q+1', 'q=k+1'])).toThrow('순환')
  expect(() => compileAssignments(['A=1'], { reserved: ['A'] })).toThrow()
})
it('shares mathematical precedence and logarithm bases with the equation solver', () => {
  expect(compileExpression('-2^2').evaluate({})).toBe(-4)
  expect(compileExpression('log(100)').evaluate({})).toBe(2)
  expect(compileExpression('ln(e)').evaluate({})).toBe(1)
  expect(() => compileExpression('sqrt(x)').evaluate({ x: -1 })).toThrow()
})
