import { ModelError } from './index'

export type DefinedFunction = {
  /** Key in definition map: either `f(x)` (when named `f` with variable `x`) or `f1`, `f2`, etc. */
  key: string
  name: string // e.g., 'f', 'f1', 'f2', 'g1'
  param: string | null // e.g., 'x' for f1(x), or null for f1 = ...
  rhsText: string
  line: number
}

const RESERVED_MATH_FUNCS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'exp',
  'ln',
  'log',
  'log10',
  'sqrt',
  'abs',
  'pow',
  'min',
  'max',
])

const BUILTIN_CONSTS = new Set(['pi', 'e'])

/** Extract all variable/identifier tokens (not followed by '(') from an expression string. */
function extractVariableReferences(expr: string): string[] {
  const refs: string[] = []
  expr = expr.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g, ' ')
  const tokenRegex = /[A-Za-z][A-Za-z0-9_]*(\s*\()?/g
  let match: RegExpExecArray | null
  while ((match = tokenRegex.exec(expr)) !== null) {
    const full = match[0]
    if (full.includes('(')) continue // function call
    const ident = full.trim()
    if (
      !RESERVED_MATH_FUNCS.has(ident.toLowerCase()) &&
      !BUILTIN_CONSTS.has(ident.toLowerCase())
    ) {
      refs.push(ident)
    }
  }
  return refs
}

/** Substitute parameter `param` with `(argExpr)` inside `body` safely at token boundaries. */
function substituteParameter(
  body: string,
  param: string,
  argExpr: string,
): string {
  const escaped = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${escaped}\\b(?!\\s*\\()`, 'g')
  return `(${body.replace(regex, () => `(${argExpr})`)})`
}

/** Find matching closing parenthesis starting after the opening '(' at openIdx. */
function findClosingParen(text: string, openIdx: number, line: number): number {
  let depth = 1
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  throw new ModelError('함수 호출의 닫는 괄호 )가 필요합니다.', line)
}

/** Expand user-defined function calls `f1(arg)`, `f(x)`, and parameterless expressions `f1` inside `expr`. */
function expandExpression(
  expr: string,
  defsByName: Map<string, DefinedFunction>,
  defsBySignature: Map<string, DefinedFunction>,
  line: number,
  visiting = new Set<string>(),
  budget = { remaining: 4000 },
): string {
  if (--budget.remaining < 0 || visiting.size > 48 || expr.length > 120_000)
    throw new ModelError(
      '함수 전개가 너무 큽니다. 정의와 중첩을 줄여 주세요.',
      line,
    )
  const current = expr
  const callRegex = /\b([A-Za-z][A-Za-z0-9_]*)\s*\(/g
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = callRegex.exec(current)) !== null) {
    const fnName = match[1]
    const openEnd = callRegex.lastIndex
    const closeIdx = findClosingParen(current, openEnd, line)
    const rawArg = current.slice(openEnd, closeIdx).trim()
    const expandedArg = expandExpression(
      rawArg,
      defsByName,
      defsBySignature,
      line,
      visiting,
    )

    // Lookup first by exact signature `f(x)` (supports `f(x)` and `f(y)` coexisting for different variables!)
    // then by function name `f1` (supports `f1(x)` evaluated at arbitrary argument `f1(2*x + 1)`).
    const sigKey = `${fnName}(${rawArg})`
    const def = defsBySignature.get(sigKey) ?? defsByName.get(fnName)

    if (def) {
      if (visiting.has(def.key))
        throw new ModelError(`함수 '${def.key}'에 순환 참조가 있습니다.`, line)
      if (def.param === null) {
        throw new ModelError(
          `'${fnName}'은 특정 변수 없이 정의된 수식(${fnName} = ...)입니다. 괄호 없이 '${fnName}'로 사용하거나 '${fnName}(x) = ...'로 정의해 주세요.`,
          line,
        )
      }
      if (!expandedArg)
        throw new ModelError(
          `함수 '${fnName}(${def.param})' 호출 시 인수를 입력해 주세요.`,
          line,
        )
      const nextVisiting = new Set(visiting)
      nextVisiting.add(def.key)
      const expandedBody = expandExpression(
        def.rhsText,
        defsByName,
        defsBySignature,
        def.line,
        nextVisiting,
      )
      const substituted = substituteParameter(
        expandedBody,
        def.param,
        expandedArg,
      )
      result += current.slice(lastIndex, match.index) + substituted
    } else {
      result += current.slice(lastIndex, openEnd) + expandedArg + ')'
    }
    lastIndex = closeIdx + 1
    callRegex.lastIndex = lastIndex
  }
  result += current.slice(lastIndex)

  // 2. Expand parameterless expression references (e.g. f1, f2, or helper variables)
  const identRegex = /\b([A-Za-z][A-Za-z0-9_]*)\b(?!\s*\()/g
  return result.replace(identRegex, (ident) => {
    const def = defsByName.get(ident)
    if (!def) return ident
    if (def.param !== null)
      throw new ModelError(
        `'${ident}'는 함수입니다. ${ident}(${def.param})처럼 인수를 적어 주세요.`,
        line,
      )
    if (visiting.has(def.key))
      throw new ModelError(`수식 '${ident}'에 순환 참조가 있습니다.`, line)
    const nextVisiting = new Set(visiting)
    nextVisiting.add(def.key)
    const expandedBody = expandExpression(
      def.rhsText,
      defsByName,
      defsBySignature,
      def.line,
      nextVisiting,
      budget,
    )
    return `(${expandedBody})`
  })
}

export type PreprocessedSource = {
  /** Expanded equation lines ready for the linear or nonlinear solver */
  expandedSource: string
  /** List of defined functions/expressions (`f1(x)`, `f2(y)`, `f1 = ...`) for UI display or auxiliary evaluation */
  definitions: DefinedFunction[]
}

/**
 * Preprocess equation source supporting:
 * 1. Single-variable function definitions:
 *    - Numbered functions: `f1(x) = 2x + 4`, `f2(x) = -3x + 7`, `f1(y) = y^2 - 1`
 *    - Variable-specific `f(x)` / `f(y)`: `f(x) = 2x + 4`, `f(y) = -3y + 7`
 *    - Strict single-variable validation: Inside `fn(v) = ...`, the RHS may ONLY use variable `v`
 *      (plus declared parameters/constants/other defined expressions). If the RHS uses another unknown `u !== v`
 *      (like `f(y) = -3x + 7` in Screenshot 2), throws a clear error telling the user:
 *      - For an equation in `x`, write `f1(x) = -3x + 7`, `f2(x) = ...`
 *      - For an equation in `y`, write `f1(y) = -3y + 7`
 *      - To mix variables (`x` and `y`), write `f1 = -3x + y + 7` without `(variable)`!
 *    - If two functions of the SAME variable share the same name (e.g. two `f(x) = ...`), guides the user to number them `f1(x), f2(x)`.
 * 2. Variable-free multi-variable expression definitions:
 *    `f1 = 2x + y - 3`, `f2 = x - y + 1`
 * 3. Algebraic combinations of defined functions/expressions:
 *    `f1(x) - f2(x) = 0`, `f(x) - f(y) = 0`, `2*f1(x) + f2(y) = 10`, `f1 - f2 = 0`
 */
export function preprocessModelSource(
  source: string,
  parameterNames: readonly string[],
  mode: 'linear' | 'nonlinear' = 'linear',
): PreprocessedSource {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  const paramSet = new Set(parameterNames)
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n')

  type ParsedLine =
    | {
        kind: 'func_def'
        name: string
        param: string
        rhs: string
        line: number
        raw: string
      }
    | {
        kind: 'expr_def'
        name: string
        rhs: string
        line: number
        raw: string
      }
    | {
        kind: 'condition'
        raw: string
        line: number
      }
    | {
        kind: 'equation'
        lhs: string
        rhs: string
        hasEquals: boolean
        line: number
        raw: string
      }
    | {
        kind: 'empty'
        raw: string
        line: number
      }

  const declaredSignatures = new Set<string>()
  const declaredExpressions = new Set<string>()
  const parsedLines: ParsedLine[] = []
  const defsByName = new Map<string, DefinedFunction>()
  const defsBySignature = new Map<string, DefinedFunction>()
  const allDefs: DefinedFunction[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1
    const raw = rawLines[i]
    if (/^\s*#@/.test(raw)) {
      parsedLines.push({
        kind: 'equation',
        lhs: raw,
        rhs: '',
        hasEquals: false,
        line: lineNo,
        raw,
      })
      continue
    }
    const text = raw.split('#', 1)[0].trim()
    if (!text) {
      parsedLines.push({ kind: 'empty', raw, line: lineNo })
      continue
    }

    const sides: string[] = []
    let depth = 0,
      start = 0
    for (let j = 0; j < text.length; j++) {
      if (text[j] === '(') depth++
      if (text[j] === ')') depth--
      if (
        depth === 0 &&
        text[j] === '=' &&
        !/[<>=!]/.test(text[j - 1] ?? '') &&
        text[j + 1] !== '='
      ) {
        sides.push(text.slice(start, j))
        start = j + 1
      }
    }
    sides.push(text.slice(start))
    if (sides.length > 2) {
      throw new ModelError('한 줄에는 등호를 하나만 사용하세요.', lineNo)
    }

    if (sides.length === 2) {
      const lhs = sides[0].trim()
      const rhs = sides[1].trim()
      if (!lhs || !rhs) {
        throw new ModelError(
          '등호 양쪽에 수식을 완성해 주세요. 예: f1(x) = 2x + 4',
          lineNo,
        )
      }

      // 1. Check boundary/initial condition: x(min) = ..., x(max) = ..., x(0) = ...
      const condMatch = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)$/.exec(
        lhs,
      )
      if (condMatch && !RESERVED_MATH_FUNCS.has(condMatch[1].toLowerCase())) {
        parsedLines.push({ kind: 'condition', raw: text, line: lineNo })
        continue
      }

      // 2. Check parameterized function definition: f1(x) = ..., f2(y) = ..., f(x) = ..., f(y) = ...
      const fnDefMatch =
        /^([A-Za-z][A-Za-z0-9_]*)\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/.exec(lhs)
      if (fnDefMatch && /^f\d*$/.test(fnDefMatch[1])) {
        const signature = `${fnDefMatch[1]}(${fnDefMatch[2]})`
        if (declaredSignatures.has(signature)) {
          parsedLines.push({
            kind: 'equation',
            lhs,
            rhs,
            hasEquals: true,
            line: lineNo,
            raw,
          })
          continue
        }
        declaredSignatures.add(signature)
        const [, fnName, paramVar] = fnDefMatch
        if (RESERVED_MATH_FUNCS.has(fnName.toLowerCase())) {
          throw new ModelError(
            `'${fnName}'은 내장 수학 함수 이름입니다. f1, f2처럼 다른 함수 이름을 사용해 주세요.`,
            lineNo,
          )
        }
        if (
          RESERVED_MATH_FUNCS.has(paramVar.toLowerCase()) ||
          BUILTIN_CONSTS.has(paramVar.toLowerCase())
        ) {
          throw new ModelError(
            `함수 인자 이름으로 예약어 '${paramVar}'를 사용할 수 없습니다.`,
            lineNo,
          )
        }
        parsedLines.push({
          kind: 'func_def',
          name: fnName,
          param: paramVar,
          rhs,
          line: lineNo,
          raw,
        })
        continue
      }

      // 3. Check variable-free expression definition: f1 = ..., f2 = ..., g1 = ...
      const exprDefMatch = /^(f\d+)$/.exec(lhs)
      if (exprDefMatch && !paramSet.has(lhs)) {
        if (declaredExpressions.has(lhs)) {
          parsedLines.push({
            kind: 'equation',
            lhs,
            rhs,
            hasEquals: true,
            line: lineNo,
            raw,
          })
          continue
        }
        declaredExpressions.add(lhs)
        parsedLines.push({
          kind: 'expr_def',
          name: lhs,
          rhs,
          line: lineNo,
          raw,
        })
        continue
      }

      parsedLines.push({
        kind: 'equation',
        lhs,
        rhs,
        hasEquals: true,
        line: lineNo,
        raw,
      })
    } else {
      parsedLines.push({
        kind: 'equation',
        lhs: text,
        rhs: '',
        hasEquals: false,
        line: lineNo,
        raw,
      })
    }
  }

  // Register definitions and check for collisions
  // Note: We validate single-variable purity FIRST so that if the user wrote
  // `f(x) = 2x + 4` and `f(y) = -3x + 7` (like Screenshot 2), they immediately see the
  // exact variable mismatch error on line 2 AND the numbering tip!
  for (const item of parsedLines) {
    if (item.kind === 'expr_def') {
      if (defsByName.has(item.name)) {
        throw new ModelError(
          `수식 이름 '${item.name}'이 중복 정의되었습니다. f1, f2처럼 숫자로 구분해 주세요.`,
          item.line,
        )
      }
      const def: DefinedFunction = {
        key: item.name,
        name: item.name,
        param: null,
        rhsText: item.rhs,
        line: item.line,
      }
      defsByName.set(item.name, def)
      allDefs.push(def)
    }
  }

  for (const item of parsedLines) {
    if (item.kind === 'func_def') {
      if (defsByName.get(item.name)?.param === null)
        throw new ModelError(
          `정의 '${item.name}'이 중복되었습니다. 다른 번호를 사용하세요.`,
          item.line,
        )
      const sigKey = `${item.name}(${item.param})`
      // First check if the RHS uses any foreign variable `ref !== item.param`!
      const rawRefs = extractVariableReferences(item.rhs)
      for (const ref of rawRefs) {
        if (ref !== item.param && !paramSet.has(ref) && !defsByName.has(ref)) {
          throw new ModelError(
            `'${item.name}(${item.param})'는 '${item.param}'에 대한 함수인데 우변에 다른 변수 '${ref}'가 사용되었습니다. '${ref}'에 대한 식이면 'f1(${ref}) = ${item.rhs}'(또는 '${item.param}'에 대한 식이면 '${item.param}' 사용)로 작성하고, 여러 변수를 혼합하려면 특정 변수 없이 'f1 = ${item.rhs}'로 작성해 주세요.`,
            item.line,
          )
        }
      }
      if (defsBySignature.has(sigKey)) {
        throw new ModelError(
          `'${sigKey}'가 중복 정의되었습니다. 모든 함수 표현은 f1(${item.param}), f2(${item.param})처럼 숫자로 구분해 주세요.`,
          item.line,
        )
      }
      const def: DefinedFunction = {
        key: sigKey,
        name: item.name,
        param: item.param,
        rhsText: item.rhs,
        line: item.line,
      }
      defsBySignature.set(sigKey, def)
      // If `name` is uniquely used for one parameter, also register in `defsByName`
      // so `f1(2*x + 1)` argument substitution works seamlessly.
      if (!defsByName.has(item.name)) {
        defsByName.set(item.name, def)
      }
      allDefs.push(def)
    }
  }

  if (allDefs.length > 48) throw new ModelError('함수 정의는 최대 48개입니다.')

  // Second pass validation on expanded RHS of `func_def` (in case a nested helper introduced another variable)
  for (const item of parsedLines) {
    if (item.kind === 'func_def') {
      const sigKey = `${item.name}(${item.param})`
      const expandedRhs = expandExpression(
        item.rhs,
        defsByName,
        defsBySignature,
        item.line,
        new Set([sigKey]),
      )
      const refs = extractVariableReferences(expandedRhs)
      for (const ref of refs) {
        if (ref !== item.param && !paramSet.has(ref)) {
          throw new ModelError(
            `'${item.name}(${item.param})'는 '${item.param}'에 대한 함수인데 내부에 다른 변수 '${ref}'가 포함되어 있습니다. 여러 변수를 혼합하려면 'f1 = ...' 형태로 작성해 주세요.`,
            item.line,
          )
        }
      }
    }
  }

  // Track which definitions (`f1(x)`, `f(x)`, `f1`) are referenced in other equations or definitions
  const equationItems = parsedLines.filter((l) => l.kind === 'equation')
  const referencedKeys = new Set<string>()
  for (const item of parsedLines) {
    const textToScan =
      item.kind === 'equation'
        ? `${item.lhs} ${item.rhs}`
        : item.kind === 'func_def' || item.kind === 'expr_def'
          ? item.rhs
          : ''
    if (!textToScan) continue
    for (const def of allDefs) {
      if (
        (item.kind === 'func_def' &&
          `${item.name}(${item.param})` === def.key) ||
        (item.kind === 'expr_def' && item.name === def.key)
      )
        continue
      if (def.param !== null) {
        const sigRegex = new RegExp(
          `\\b${def.name}\\s*\\(\\s*${def.param}\\s*\\)`,
        )
        const nameCallRegex = new RegExp(`\\b${def.name}\\s*\\(`)
        if (
          sigRegex.test(textToScan) ||
          (defsByName.get(def.name) === def && nameCallRegex.test(textToScan))
        ) {
          referencedKeys.add(def.key)
        }
      } else {
        const identRegex = new RegExp(`\\b${def.name}\\b(?!\\s*\\()`)
        if (identRegex.test(textToScan)) {
          referencedKeys.add(def.key)
        }
      }
    }
  }

  const outputLines: string[] = []
  const hasExplicitEquations = equationItems.length > 0

  for (const item of parsedLines) {
    if (item.kind === 'empty') {
      outputLines.push('')
      continue
    }
    if (item.kind === 'condition') {
      outputLines.push(item.raw)
      continue
    }
    if (item.kind === 'func_def' || item.kind === 'expr_def') {
      const key =
        item.kind === 'func_def' ? `${item.name}(${item.param})` : item.name
      if (referencedKeys.has(key) || hasExplicitEquations) {
        outputLines.push(`# [정의] ${key}`)
      } else {
        const expanded = expandExpression(
          item.rhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expanded} = 0`)
      }
      continue
    }
    if (item.kind === 'equation') {
      if (item.hasEquals) {
        const expLhs = expandExpression(
          item.lhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        const expRhs = expandExpression(
          item.rhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expLhs} = ${expRhs}`)
      } else {
        const expLhs = expandExpression(
          item.lhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expLhs} = 0`)
      }
    }
  }

  if (outputLines.join('\n').length > 120_000)
    throw new ModelError('함수 전개 결과가 너무 큽니다.')
  return {
    expandedSource: outputLines.join('\n'),
    definitions: allDefs,
  }
}
/** New numbered definitions or explicit function algebra opt into new syntax.
 * Standalone legacy f(x)=residual retains its existing model semantics. */
export function preprocessSolverSource(
  source: string,
  parameterNames: readonly string[],
  mode: 'linear' | 'nonlinear',
) {
  const lines = source.split('\n').map((line) => line.split('#')[0].trim())
  const numbered = lines.some((line) =>
    /^f\d+\s*(?:\(\s*[A-Za-z][A-Za-z0-9_]*\s*\))?\s*=/.test(line),
  )
  const algebra = lines.some(
    (line) =>
      /\bf\s*\(/.test(line) &&
      !/^f\(\s*[A-Za-z][A-Za-z0-9_]*\s*\)\s*=/.test(line),
  )
  return numbered || algebra
    ? preprocessModelSource(source, parameterNames, mode).expandedSource
    : source
}
