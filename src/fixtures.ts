import { test as base, chromium } from '@playwright/test';
import path from 'node:path';

// Équivalent de --user-data-dir=C:\Temp\profil du Robot : le profil Chrome conserve les cookies,
// dont celui de l'appareil de confiance MFA. Le code n'est donc saisi qu'une fois (npm run auth).
export const PROFILE_DIR = path.resolve(process.env.PROFILE_DIR || 'auth/profile');

export const test = base.extend({
  context: async ({ launchOptions, viewport, ignoreHTTPSErrors }, use) => {
    const launch = (executablePath?: string) =>
      chromium.launchPersistentContext(PROFILE_DIR, {
        ...launchOptions,
        executablePath,
        headless: false,
        viewport,
        ignoreHTTPSErrors,
      });
    let context;
    try {
      context = await launch(launchOptions.executablePath);
    } catch (e) {
      if (!launchOptions.executablePath) throw e;
      // Chrome du Robot (CHROME_PATH) refusé ou fermé aussitôt : repli sur le Chromium de Playwright
      console.log(`CHROME_PATH inutilisable (${String((e as Error).message).split('\n')[0]}) : repli sur Chromium Playwright`);
      context = await launch(undefined);
    }
    await use(context);
    await context.close();
  },
});
