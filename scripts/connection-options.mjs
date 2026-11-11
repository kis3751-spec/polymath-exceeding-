/** Explicit CLI arguments override stale shell configuration. No shell execution. */
export function connectionEnvironment(args, env = process.env) {
  const next = { ...env }
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (
      !['--port', '--origin'].includes(flag) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw Error(
        '사용법: --port 5181 --origin https://your-space-5181.app.github.dev',
      )
    next[flag === '--port' ? 'PORT' : 'APP_ORIGIN'] = args[++i]
  }
  return next
}
