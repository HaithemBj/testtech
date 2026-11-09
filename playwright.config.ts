import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  timeout: 20 * 60_000,
  workers: 1,
  // Relance le parcours complet en cas d'échec dû à une lenteur ponctuelle
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: !process.env.HEADED,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // FFmpeg non téléchargeable derrière le proxy
    launchOptions: {
      executablePath: process.env.CHROME_PATH || undefined,
      args: ['--disk-cache-size=0'],
    },
  },
});
