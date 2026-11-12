import config from './playwright.config'
export default {
  ...config,
  outputDir: 'test-results/desktop',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4189' },
  webServer: {
    command: 'node tests/desktop-fixture-server.mjs',
    url: 'http://127.0.0.1:4189',
    reuseExistingServer: false,
    timeout: 30000,
  },
}
