import { describe, expect, it } from 'vitest'
import { encodeCsv } from '../src/csv'

describe('CSV exports', () => {
  it('round-trips delimiters, quotes and embedded newlines with CRLF records', () => {
    expect(
      encodeCsv([
        ['parameter', 'quoted "name"', 'multi\nline'],
        ['a,b', 1.25, ''],
      ]),
    ).toBe('parameter,"quoted ""name""","multi\nline"\r\n"a,b",1.25,')
  })
})
