import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3101',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.CI ? {} : { channel: 'chrome' }),
  },
  webServer: [
    {
      command: 'node tests/mock-gateway.mjs',
      url: 'http://127.0.0.1:18181/__state',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec next start --hostname 127.0.0.1 --port 3101',
      url: 'http://localhost:3101',
      env: {
        GATEWAY_URL: 'http://127.0.0.1:18181',
        APP_ORIGIN: 'http://localhost:3101',
      },
      reuseExistingServer: false,
    },
  ],
});
