import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { AccessStore } from '../server/store.mjs'
import { createAccessServer } from '../server/app.mjs'

export const DESKTOP_PORT = 53173

/** The desktop process always binds loopback. Deployment/Codespaces variables
 * cannot turn a personal installation into a shared HTTP server. */
export function createDesktopBackend({ dataDir, dist, port = DESKTOP_PORT }) {
  if (
    !dataDir ||
    !dist ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  )
    throw Error('개인용 앱의 데이터 폴더와 포트를 확인하세요.')
  const store = new AccessStore(resolve(dataDir, 'access.sqlite'))
  let application = null,
    stopping = null
  return {
    needsSetup: () => !store.owner(),
    async setup(email, password) {
      if (stopping) throw Error('앱이 종료 중입니다.')
      // bootstrap refuses to replace an existing owner and stores scrypt only.
      await store.bootstrap(email, password)
    },
    async start() {
      if (stopping) throw Error('앱이 종료 중입니다.')
      if (application)
        return {
          origin: `http://127.0.0.1:${port}`,
          entryUrl: application.entryUrl,
        }
      const origin = `http://127.0.0.1:${port}`
      const app = await createAccessServer({
        origin,
        host: '127.0.0.1',
        store,
        dist: resolve(dist),
      })
      await new Promise((done, reject) => {
        app.server.once('error', reject)
        app.server.listen(port, '127.0.0.1', () => {
          app.server.off('error', reject)
          done()
        })
      })
      application = app
      return { origin, entryUrl: app.entryUrl }
    },
    stop() {
      return (stopping ??= (async () => {
        if (application)
          await new Promise((done) => {
            const force = setTimeout(
              () => application.server.closeAllConnections(),
              1500,
            )
            force.unref()
            application.server.close(() => {
              clearTimeout(force)
              done()
            })
            application.server.closeIdleConnections()
          })
        store.close()
      })())
    },
  }
}

/** Credentials travel over the parent-owned stdin pipe, never an HTTP setup
 * endpoint, URL, environment variable or command-line argument. */
export async function runDesktop({
  input = process.stdin,
  output = process.stdout,
  ...options
}) {
  const backend = createDesktopBackend(options)
  const send = (data) =>
    output.write('IVC_DESKTOP ' + JSON.stringify(data) + '\n')
  const lines = createInterface({ input, crlfDelay: Infinity })
  const commands = lines[Symbol.asyncIterator]()
  let ready = false
  let exitCode = 0
  const start = async () => {
    const address = await backend.start()
    ready = true
    send({ type: 'ready', ...address })
  }
  try {
    if (backend.needsSetup()) send({ type: 'setup-required' })
    else await start()
    for await (const line of commands) {
      if (line.length > 4096) throw Error('앱 제어 요청이 너무 깁니다.')
      let command
      try {
        command = JSON.parse(line)
      } catch {
        throw Error('앱 제어 요청을 확인하세요.')
      }
      if (command.type === 'stop') break
      if (command.type !== 'setup' || ready) {
        send({ type: 'error', message: '지원하지 않는 앱 제어 요청입니다.' })
        continue
      }
      try {
        await backend.setup(command.email, command.password)
      } catch (error) {
        send({ type: 'setup-error', message: error.message })
        continue
      } finally {
        command.password = undefined
      }
      await start()
    }
  } catch (error) {
    send({
      type: 'fatal',
      message:
        error.code === 'EADDRINUSE'
          ? `${options.port ?? DESKTOP_PORT} 포트를 다른 프로그램이 사용 중입니다. 다른 IVC 창을 종료한 뒤 다시 실행하세요. 저장 데이터는 유지됩니다.`
          : 'IVC를 실행하지 못했습니다. 앱 파일이 모두 있는지 확인한 뒤 다시 실행하세요.',
    })
    exitCode = 1
  } finally {
    lines.close()
    await backend.stop()
  }
  return exitCode
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2),
    flags = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!['--data-dir', '--dist', '--port'].includes(args[i]) || !args[i + 1])
      throw Error('올바른 개인용 앱 실행 인수가 필요합니다.')
    flags[args[i]] = args[i + 1]
  }
  process.exitCode = await runDesktop({
    dataDir: flags['--data-dir'],
    dist: flags['--dist'] ?? resolve(import.meta.dirname, '../dist'),
    port:
      flags['--port'] === undefined ? DESKTOP_PORT : Number(flags['--port']),
  })
}
