import { Page } from '@playwright/test';
import { config } from '../config';
import { click, fill, isVisible, poll, settle, sleep, xq } from '../lib/resilience';

const x = (p: Page, s: string) => p.locator(`xpath=${s}`);
const ION_LOGIN = `(//*[@id='ion-input-0']|//ion-input[@formcontrolname='login']/input)`;
const SEARCH_BTN = `(//ion-button[.//ion-icon[@name='search']]|//button[.//ion-icon[@name='search']])`;
const SEARCH_INPUT = `//input[@placeholder='Rechercher un OT ou un site']`;
const OT_CARD = `//ion-list//ot-card//p[@class='libelle-ot']`;
const dataTest = (id: string) => `//*[@data-test=${xq(id)}]`;

const L = 'CR.INTERVENTION';

export class Dactech {
  constructor(readonly page: Page) {}

  async login(matricule: string) {
    const p = this.page;
    await p.goto(config.dactech.url(), { waitUntil: 'domcontentloaded' });
    await settle(p);

    // Soit le formulaire SSO, soit directement l'écran Ionic de saisie du matricule
    const sso = p.locator('#userNameInput');
    const ion = x(p, ION_LOGIN);
    await sso.or(ion).first().waitFor({ state: 'visible', timeout: 90_000 });
    if (await sso.isVisible()) {
      await fill(sso, config.dactech.user());
      await fill(p.locator('#passwordInput'), config.dactech.password());
      await click(p.locator('#submitButton'));
      await settle(p, 30_000);
    }

    const input = x(p, ION_LOGIN).first();
    await input.waitFor({ state: 'visible', timeout: 90_000 });
    await input.dblclick();
    await input.press('Control+a');
    await input.press('Backspace');
    await input.pressSequentially(matricule, { delay: 50 });
    await click(
      x(p, `(//*[@id="background"]//form/ion-row[2]/ion-col/button|//*[@id="background"]//form/ion-row[2]/ion-col/ion-button)`),
    );
    await x(p, SEARCH_BTN).first().waitFor({ state: 'visible', timeout: 90_000 });
    await settle(p);
  }

  /**
   * Recherche l'OT. Tant qu'il n'est pas diffusé dans Dactech, on relance la recherche
   * (sans recharger la page pour ne pas perdre la session).
   */
  async selectOt(ot: string) {
    const p = this.page;
    const search = x(p, SEARCH_INPUT);
    const card = x(p, OT_CARD);
    await poll(
      async () => {
        if (!(await isVisible(search, 500))) await click(x(p, SEARCH_BTN));
        await search.first().waitFor({ state: 'visible', timeout: 15_000 });
        await search.first().click();
        await search.first().fill('');
        await search.first().fill(ot);
        await search.first().press('Space');
        await settle(p, 10_000);
        return isVisible(card, 8_000);
      },
      { timeout: 6 * 60_000, interval: 5_000, label: `OT ${ot} visible dans Dactech` },
    );
    await click(card);
    await settle(p);
  }

  async startReport() {
    const p = this.page;
    await click(x(p, `(//div[@class='itemCr']/ion-button|//div[@class='itemCr']/button)`));
    await click(x(p, `//button[contains(.,'Oui')]`));
    await settle(p);
  }

  private async dismissOverlays() {
    await this.page.evaluate(() => document.body.click()).catch(() => {});
  }

  private async answer(testId: string) {
    await this.dismissOverlays();
    await click(x(this.page, dataTest(testId)));
    await this.dismissOverlays();
  }

  /** Intervention fondée, problème réglé. */
  async fillFoundedSolvedIntervention(comment: string) {
    const p = this.page;
    await this.dismissOverlays();
    await click(x(p, `//div[@class="intervention"]//strong[contains(.,"Renseigner l'intervention")]`));
    await this.answer('appel_fonde-TRUE');
    await this.answer('intervention_reglee-TRUE');
    await this.answer(`motif_cloture-${L}.MOTIF_CLOTURE.LABEL.DEPANNAGE_EFFECTUE`);
    await this.answer(`origine_panne-${L}.ORIGINE_PANNE.LABEL.COUPURE_ALIMENTATION`);
    await click(x(p, `(//button[contains(.,"Valider mon opération")]|//*[@data-test="btn-validate-intervention"])`));
    await this.dismissOverlays();

    const textarea = p.locator('#ion-textarea-0, ion-textarea textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 60_000 });
    await textarea.scrollIntoViewIfNeeded();
    await click(textarea);
    await textarea.fill(`${comment} Dépannage réalisé.Tout est OK`);
  }

  async finalizeReport() {
    await click(x(this.page, `(//ion-button[contains(.,'Finaliser le CR')]|//button[contains(.,'Finaliser le CR')])`));
    await settle(this.page, 30_000);
  }

  async signAndSend() {
    const p = this.page;
    const d = new Date(Date.now() - 15 * 60_000);
    const start = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    await fill(x(p, `//time-picker[contains(.,'Heure début')]//input`), start);
    await click(x(p, `//*[@id="main-content"]//span[contains(.,'Signer et envoyer le CR')]`), { attempts: 2 });
    await settle(p, 60_000);
  }

  /** L'écran de suggestions apparaît une fois le CR envoyé : confirme l'envoi. */
  async closeSuggestions() {
    const p = this.page;
    const close = x(p, `//*[@id="main-content"]//span[contains(.,'Fermer')]`);
    await close.first().waitFor({ state: 'visible', timeout: 120_000 });
    await click(close);
    await sleep(500);
  }
}
