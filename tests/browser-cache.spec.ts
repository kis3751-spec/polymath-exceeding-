import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { request as upstreamRequest } from 'node:https'
import type { AddressInfo } from 'node:net'

test('session recovery: a fresh welcome clears cached HTTP errors while keeping the session and saved model', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !baseURL?.startsWith('https:'),
    'Clear-Site-Data is verified with HTTPS.',
  )
  let poison = true,
    rootRequests = 0
  const upstream = new URL(baseURL!)
  // A real intermediary on the trustworthy localhost origin is required. Self-signed
  // HTTPS disables HTTP caching, while Playwright routing also disables the cache.
  // Neither would exercise a retained error. The upstream still uses HTTPS.
  const proxy = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'https://fixture.invalid')
    if (url.pathname === '/' && !url.search) {
      rootRequests++
      if (poison) {
        const body = Buffer.from('<html><h1>Cached upstream 404</h1></html>')
        res.writeHead(404, {
          'Content-Type': 'text/html',
          'Content-Length': body.length,
          'Cache-Control': 'public, max-age=3600, immutable',
        })
        res.end(body)
        return
      }
    }
    const forwarded = upstreamRequest(
      new URL(req.url ?? '/', upstream),
      {
        method: req.method,
        rejectUnauthorized: false,
        headers: { ...req.headers, host: upstream.host },
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(res)
      },
    )
    forwarded.on('error', () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(forwarded)
  })
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
  const origin = `http://localhost:${(proxy.address() as AddressInfo).port}`
  try {
    const cookie = (await context.cookies()).find(
      (c) => c.name === '__Host-ivc-session',
    )
    expect(cookie).toBeDefined()
    await context.addCookies([{ ...cookie!, domain: 'localhost' }])
    await page.goto(origin + '/calculator')
    expect(new URL(page.url()).pathname).toBe('/calculator')
    await expect(page.locator('.account-bar')).toContainText(
      'owner@example.test',
    )
    await page.evaluate(() =>
      localStorage.setItem(
        'ivc-cache-regression-project',
        '{"source":"2*x=6"}',
      ),
    )
    const fetchRoot = () =>
      page.evaluate(
        async () => (await fetch('/', { cache: 'force-cache' })).status,
      )
    expect(await fetchRoot()).toBe(404)
    poison = false
    // Confirm the browser retained the old error even after the server repaired it.
    expect(await fetchRoot()).toBe(404)
    expect(rootRequests).toBe(1)
    const response = await page.goto(origin + '/?_ivc_page=cache-repair')
    expect((await response!.allHeaders())['clear-site-data']).toBe('"cache"')
    await expect(page.locator('#signed-in')).toContainText('owner@example.test')
    await expect.poll(fetchRoot).toBe(200)
    expect(rootRequests).toBeGreaterThanOrEqual(2)
    expect(
      await page.evaluate(() =>
        localStorage.getItem('ivc-cache-regression-project'),
      ),
    ).toBe('{"source":"2*x=6"}')
    expect(
      (await context.cookies()).find(
        (c) => c.name === '__Host-ivc-session' && c.domain === 'localhost',
      )?.value,
    ).toBe(cookie!.value)
    await page.goto(origin + '/')
    await expect(page.locator('#signed-in')).toContainText('owner@example.test')
    await page.screenshot({
      path: '/tmp/ivc-bare-page-after-cache-repair.png',
      fullPage: true,
    })
  } finally {
    proxy.closeAllConnections()
    await new Promise<void>((resolve) => proxy.close(() => resolve()))
  }
})
