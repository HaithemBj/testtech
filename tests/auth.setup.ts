import { test } from '../src/fixtures';
import { config } from '../src/config';
import { settle } from '../src/lib/resilience';
import { ION_LOGIN } from '../src/pages/dactech';

const MFA_WAIT = 5 * 60_000;

// Connexion à DacRC et Dactech : saisissez le code MFA à la main dans le navigateur (une seule fois).
test('Sauvegarde de la session (MFA manuel)', async ({ context }) => {
  const rc = await context.newPage();
  await rc.goto(config.dacrc.url(), { waitUntil: 'domcontentloaded' });
  const username = rc.locator('#username, [name="username"]').first();
  if (await username.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await username.fill(config.dacrc.user());
    await rc.locator('#password, [name="password"]').first().fill(config.dacrc.password());
    await rc.locator('#Login, button:has-text("Login"), input[value="Login"]').first().click();
  }
  console.log('DacRC : saisissez le code MFA dans le navigateur (5 min max)...');
  await rc
    .locator('button[title="Afficher le menu de navigation"]')
    .first()
    .waitFor({ state: 'visible', timeout: MFA_WAIT });
  await settle(rc);

  const tech = await context.newPage();
  await tech.goto(config.dactech.url(), { waitUntil: 'domcontentloaded' });
  const sso = tech.locator('#userNameInput');
  const ion = tech.locator(`xpath=${ION_LOGIN}`).first();
  await sso.or(ion).first().waitFor({ state: 'visible', timeout: 90_000 });
  if (await sso.isVisible()) {
    await sso.fill(config.dactech.user());
    await tech.locator('#passwordInput').fill(config.dactech.password());
    await tech.locator('#submitButton').click();
  }
  console.log('Dactech : saisissez le code MFA dans le navigateur si demandé (5 min max)...');
  await ion.waitFor({ state: 'visible', timeout: MFA_WAIT });

  console.log('Profil enregistré : les prochains tests ne redemandent pas le MFA.');
});
