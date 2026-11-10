import { test } from '../src/fixtures';
import { config } from '../src/config';
import { settle } from '../src/lib/resilience';

const MFA_WAIT = 5 * 60_000;

// Connexion à DacRC : saisissez le code MFA à la main dans le navigateur (une seule fois).
// Dactech n'utilise pas le profil : il se connecte à chaque exécution avec un navigateur neuf.
test('Sauvegarde de la session DacRC (MFA manuel)', async ({ context }) => {
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
  console.log('Profil DacRC enregistré : les prochains tests ne redemandent pas le MFA.');
});
