import { test as base, chromium } from '@playwright/test';
import path from 'node:path';

// Équivalent de --user-data-dir=C:\Temp\profil du Robot : le profil Chrome conserve les cookies,
// dont celui de l'appareil de confiance MFA. Le code n'est donc saisi qu'une fois (npm run auth).
export const PROFILE_DIR = path.resolve(process.env.PROFILE_DIR || 'auth/profile');

export const test = base.extend({
  context: async ({ launchOptions, viewport, ignoreHTTPSErrors }, use) => {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      ...launchOptions,
      headless: false,
      viewport,
      ignoreHTTPSErrors,
    });
    await use(context);
    await context.close();
  },
});
