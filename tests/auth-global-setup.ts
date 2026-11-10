import { request, type FullConfig } from '@playwright/test'
export default async function setup(config: FullConfig) {
  const baseURL = String(config.projects[0].use.baseURL)
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  })
  const response = await api.post('/api/login', {
    data: {
      email: 'owner@example.test',
      password: 'IVC-browser-test-password!',
    },
  })
  if (!response.ok())
    throw Error('Authentication fixture failed: ' + response.status())
  await api.storageState({ path: '/tmp/ivc-test-auth-state.json' })
  await api.dispose()
}
