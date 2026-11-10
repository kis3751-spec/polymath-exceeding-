import config from './playwright.config'
export default {
  ...config,
  outputDir: 'test-results/https',
  use: {
    ...config.use,
    baseURL: 'https://127.0.0.1:4190',
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command:
      'IVC_TEST_TLS=1 IVC_TEST_PORT=4190 node tests/auth-fixture-server.mjs',
    url: 'https://127.0.0.1:4190',
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 30000,
  },
}
