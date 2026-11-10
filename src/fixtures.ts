import { test as base, chromium, Browser, BrowserContext } from '@playwright/test';
import path from 'node:path';

// Équivalent de --user-data-dir=C:\Temp\profil du Robot, uniquement pour DacRC : le profil Chrome conserve
// l'appareil de confiance MFA. Le code n'est donc saisi qu'une fois (npm run auth).
export const PROFILE_DIR = path.resolve(process.env.PROFILE_DIR || 'auth/profile');

// Chrome du Robot (CHROME_PATH) refusé ou fermé aussitôt : repli sur le Chromium de Playwright
async function withFallback<T>(launch: (executablePath?: string) => Promise<T>, executablePath?: string): Promise<T> {
  try {
    return await launch(executablePath);
  } catch (e) {
    if (!executablePath) throw e;
    console.log(`CHROME_PATH inutilisable (${String((e as Error).message).split('\n')[0]}) : repli sur Chromium Playwright`);
    return launch(undefined);
  }
}

export const test = base.extend<{ newTechContext: () => Promise<BrowserContext> }>({
  // DacRC : profil persistant
  context: async ({ launchOptions, viewport, ignoreHTTPSErrors }, use) => {
    const context = await withFallback(
      (executablePath) =>
        chromium.launchPersistentContext(PROFILE_DIR, {
          ...launchOptions,
          executablePath,
          headless: false,
          viewport,
          ignoreHTTPSErrors,
        }),
      launchOptions.executablePath,
    );
    await use(context);
    await context.close().catch(() => {});
  },
  // Dactech : navigateur neuf lancé à la demande (après la fermeture de DacRC), sans cookie ni session conservés
  newTechContext: async ({ launchOptions, viewport, ignoreHTTPSErrors }, use) => {
    const browsers: Browser[] = [];
    await use(async () => {
      const browser = await withFallback(
        (executablePath) => chromium.launch({ ...launchOptions, executablePath, headless: false }),
        launchOptions.executablePath,
      );
      browsers.push(browser);
      return browser.newContext({ viewport, ignoreHTTPSErrors });
    });
    for (const b of browsers) await b.close().catch(() => {});
  },
});
