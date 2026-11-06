import { Locator, Page, test } from '@playwright/test';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_FACTOR = 6;
const MAX_TIMEOUT = 180_000;

/**
 * Mesure la lenteur de l'application et dilate les timeouts en conséquence.
 * Le facteur monte vite quand ça ralentit ou échoue, et redescend progressivement.
 */
class Perf {
  factor = 1;

  reset() {
    this.factor = 1;
  }
  timeout(base: number) {
    return Math.min(Math.round(base * this.factor), MAX_TIMEOUT);
  }
  observe(durationMs: number, nominalMs: number) {
    const ratio = Math.max(1, durationMs / nominalMs);
    this.factor = Math.min(MAX_FACTOR, Math.max(1, this.factor * 0.7 + ratio * 0.3));
  }
  penalize() {
    this.factor = Math.min(MAX_FACTOR, this.factor * 1.5);
  }
}
export const perf = new Perf();

// Indicateurs de chargement Salesforce Lightning et Ionic (Dactech)
const SPINNERS = '.slds-spinner_container, ion-loading, .loading-wrapper';

/** Attend que la page soit calme (remplace les Sleep fixes). Ne lève jamais. */
export async function settle(page: Page, base = 15_000) {
  const t = perf.timeout(base);
  const start = Date.now();
  await page.waitForLoadState('load', { timeout: t }).catch(() => {});
  // Salesforce garde des connexions ouvertes : networkidle n'est qu'un bonus
  await page.waitForLoadState('networkidle', { timeout: Math.min(t, 5_000) }).catch(() => {});
  const deadline = Date.now() + t;
  while (Date.now() < deadline && !page.isClosed()) {
    const busy = await page.locator(SPINNERS).locator('visible=true').count().catch(() => 0);
    if (busy === 0) break;
    await sleep(250);
  }
  perf.observe(Date.now() - start, 2_000);
}

interface RetryOpts {
  attempts?: number;
  delay?: number;
  label?: string;
  onRetry?: (err: unknown, attempt: number) => Promise<void> | void;
}

/** Retry avec backoff exponentiel ; `onRetry` remet l'application dans un état sain. */
export async function retry<T>(fn: (attempt: number) => Promise<T>, o: RetryOpts = {}): Promise<T> {
  const { attempts = 3, delay = 1_000, label = 'action', onRetry } = o;
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
      if (i === attempts) break;
      console.log(`[retry ${i}/${attempts}] ${label}: ${String((e as Error).message).split('\n')[0]}`);
      perf.penalize();
      try {
        await onRetry?.(e, i);
      } catch {
        /* la récupération est best-effort */
      }
      await sleep(delay * 2 ** (i - 1));
    }
  }
  throw last;
}

/** Interroge jusqu'à ce que `check` renvoie une valeur truthy (remplace WHILE + Sleep). */
export async function poll<T>(
  check: () => Promise<T | undefined | null | false>,
  o: { timeout?: number; interval?: number; label?: string; onMiss?: (n: number) => Promise<void> } = {},
): Promise<T> {
  const { timeout = 120_000, interval = 2_000, label = 'poll', onMiss } = o;
  const deadline = Date.now() + perf.timeout(timeout);
  let n = 0;
  let lastErr = '';
  while (Date.now() < deadline) {
    try {
      const v = await check();
      if (v) return v;
    } catch (e) {
      lastErr = String((e as Error).message).split('\n')[0];
    }
    await onMiss?.(++n).catch(() => {});
    await sleep(Math.min(interval * (1 + n / 10), 15_000));
  }
  throw new Error(`${label}: condition non atteinte${lastErr ? ` (dernière erreur: ${lastErr})` : ''}`);
}

/**
 * Clic robuste : attend, scrolle, clique ; en repli, clic JavaScript
 * (équivalent de Wait and Click / Javascript Click du Robot).
 */
export async function click(loc: Locator, o: { label?: string; attempts?: number } = {}) {
  await retry(
    async () => {
      const el = loc.first();
      const start = Date.now();
      await el.waitFor({ state: 'attached', timeout: perf.timeout(20_000) });
      await el.scrollIntoViewIfNeeded({ timeout: perf.timeout(5_000) }).catch(() => {});
      try {
        await el.click({ timeout: perf.timeout(8_000) });
      } catch {
        await el.dispatchEvent('click', undefined, { timeout: perf.timeout(5_000) });
      }
      perf.observe(Date.now() - start, 1_500);
    },
    { label: o.label ?? `click ${loc}`, attempts: o.attempts ?? 4, delay: 500 },
  );
}

/** Saisie robuste avec vérification de la valeur réellement saisie. */
export async function fill(loc: Locator, value: string, o: { label?: string } = {}) {
  await retry(
    async () => {
      const el = loc.first();
      await el.waitFor({ state: 'visible', timeout: perf.timeout(20_000) });
      await el.scrollIntoViewIfNeeded({ timeout: perf.timeout(5_000) }).catch(() => {});
      await el.fill(value, { timeout: perf.timeout(10_000) });
      const actual = await el.inputValue().catch(() => value);
      if (actual !== value) throw new Error(`valeur saisie incorrecte: "${actual}"`);
    },
    { label: o.label ?? `fill ${loc}`, attempts: 4, delay: 500 },
  );
}

export async function isVisible(loc: Locator, timeout = 3_000) {
  try {
    await loc.first().waitFor({ state: 'visible', timeout: perf.timeout(timeout) });
    return true;
  } catch {
    return false;
  }
}

/** Échappe une valeur pour un littéral XPath. */
export function xq(v: string) {
  if (!v.includes("'")) return `'${v}'`;
  if (!v.includes('"')) return `"${v}"`;
  return `concat('${v.split("'").join(`', "'", '`)}')`;
}

/**
 * Étape nommée : retry + message d'erreur explicite (équivalent du TRY/EXCEPT du Robot).
 * `recover` remet la page dans un état sain avant chaque nouvel essai.
 */
export async function step(
  name: string,
  fn: () => Promise<void>,
  o: { attempts?: number; recover?: () => Promise<void>; testName?: string } = {},
) {
  console.log(name);
  await test.step(name, async () => {
    try {
      await retry(fn, { attempts: o.attempts ?? 2, delay: 2_000, label: name, onRetry: o.recover });
    } catch (e) {
      throw new Error(
        `Une erreur est survenue lors de la ${name}${o.testName ? ` pour le scenario ${o.testName}` : ''}: ${(e as Error).message}`,
      );
    }
  });
}
