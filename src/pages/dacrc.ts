import { Locator, Page } from '@playwright/test';
import { config } from '../config';
import { click, fill, isVisible, poll, retry, settle, sleep, typeText, xq } from '../lib/resilience';

const x = (p: Page, s: string) => p.locator(`xpath=${s}`);
const WORKSPACE_TABS = `//div[@aria-label="Onglets d'espaces de travail pour D@c RC"]`;
const CONTACT_INPUT = `//input[@id=(//label[contains(.,'Nom du contact')]/@for)]`;

export class DacRC {
  constructor(readonly page: Page) {}

  async login() {
    const p = this.page;
    await p.goto(config.dacrc.url(), { waitUntil: 'domcontentloaded' });
    await settle(p);
    const username = p.locator('#username, [name="username"]').first();
    if (await isVisible(username, 8_000)) {
      await fill(username, config.dacrc.user());
      await click(p.locator('#Login, button:has-text("Login"), input[value="Login"]'));
      const password = p.locator('#password, [name="password"]').first();
      await fill(password, config.dacrc.password());
      await click(p.locator('#Login, button:has-text("Login"), input[value="Login"]'));
      await settle(p, 30_000);
    }
    await this.waitReady();
  }

  /** Lightning est chargé quand le menu de navigation est présent. */
  async waitReady() {
    await this.page
      .locator('button[title="Afficher le menu de navigation"]')
      .first()
      .waitFor({ state: 'visible', timeout: 90_000 });
  }

  async closeOpenTabs() {
    const p = this.page;
    const close = x(p, `${WORKSPACE_TABS}//button[starts-with(@title,'Fermer')]`);
    for (let i = 0; i < 20 && (await close.count()) > 0; i++) {
      await close.first().click({ timeout: 5_000 }).catch(() => {});
      await sleep(300);
    }
  }

  async selectMenu(menu: string) {
    const p = this.page;
    const selected = await x(p, `//div[contains(@class,'navLeft')]//div[contains(@class,'selectedListItem')]//a`)
      .first()
      .getAttribute('title', { timeout: 5_000 })
      .catch(() => null);
    if (selected === menu) return;
    await click(p.locator('button[title="Afficher le menu de navigation"]'));
    await click(x(p, `//a[@data-label=${xq(menu)}]`));
    await settle(p);
  }

  async openNewRequest(recordTypeId: string) {
    await this.page.goto(
      `${config.dacrc.url()}/lightning/o/Case/new?navigationLocation=LIST_VIEW&recordTypeId=${recordTypeId}`,
      { waitUntil: 'domcontentloaded' },
    );
    await settle(this.page);
    await x(this.page, CONTACT_INPUT).waitFor({ state: 'visible', timeout: 60_000 });
  }

  private async pickFromLookupModal() {
    const p = this.page;
    await click(x(p, `//input[@type='radio']`));
    await click(x(p, `//button[contains(text(),'Sélectionner')]`));
    await settle(p);
  }

  /** Tape la valeur puis clique « Afficher plus de résultats » ; ne clique pas sur le champ si la liste est déjà ouverte (sinon elle se referme). */
  private async searchInLookup(input: Locator, value: string, moreResults: Locator) {
    await typeText(input, value);
    if (!(await isVisible(moreResults, 10_000))) {
      await input.click();
      await moreResults.first().waitFor({ state: 'visible', timeout: 30_000 });
    }
    await click(moreResults);
    await this.pickFromLookupModal();
  }

  async chooseCaller(name: string) {
    const p = this.page;
    await this.searchInLookup(
      x(p, CONTACT_INPUT),
      name,
      x(p, `${CONTACT_INPUT}/following::span[contains(text(),'Afficher plus de résultats pour')][contains(text(),${xq(name)})]`),
    );
  }

  async chooseLocation(dkCode: string) {
    const p = this.page;
    await this.searchInLookup(
      p.locator(`input[placeholder='Recherchez dans les Emplacements...']`),
      dkCode,
      x(p, `//input[@id=(//label[contains(.,'Emplacement')]/@for)]/following::span[contains(text(),'Afficher plus de résultats pour')]`),
    );
  }

  async fillMessage(text: string) {
    await fill(this.page.locator(`xpath=//label[contains(., 'Message à transmettre')]/following-sibling::div//textarea`), text);
  }

  private async pickCombo(buttonSelector: string, option: string) {
    const p = this.page;
    const btn = p.locator(buttonSelector).first();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await click(btn);
    await click(x(p, `//span[text()=${xq(option)}]`));
  }

  selectImpact(v: string) {
    return this.pickCombo(`xpath=//button[contains(@aria-label,'Impact')]`, v);
  }
  selectUrgency(v: string) {
    return this.pickCombo(`xpath=//lightning-base-combobox//button[contains(@aria-label,'Urgence')]`, v);
  }
  selectOrigin(v: string) {
    return this.pickCombo(`xpath=//lightning-base-combobox//button[contains(@aria-label,'Origine de la demande')]`, v);
  }

  async fillUrgencyReason(v: string) {
    await fill(this.page.locator('input[name="Raison_MAJ_Urgence__c"]'), v);
  }

  async clickSave() {
    const p = this.page;
    await click(
      x(p, `(//records-form-footer//button[@name="SaveEdit"]|(//div[@role='dialog']//span[text()='Enregistrer']/parent::button)[3])`),
      { attempts: 2 },
    );
  }

  /** Lit le numéro de DI (toast, sinon onglet actif) puis ouvre son onglet. */
  async readCreatedRequestNumber(): Promise<string> {
    const p = this.page;
    const di = await poll(
      async () => {
        const toast = await x(p, `//span[contains(@class,"toastMessage")]`).first().textContent({ timeout: 1_000 }).catch(() => null);
        const tab = await x(
          p,
          `//div[@role="navigation"]//li[contains(@class,'slds-is-active')]//a[contains(@href,"/lightning/r/Case/")]`,
        )
          .first()
          .getAttribute('title', { timeout: 1_000 })
          .catch(() => null);
        return /D\d{10}/.exec(`${toast ?? ''} ${tab ?? ''}`)?.[0];
      },
      { timeout: 90_000, interval: 1_000, label: 'lecture du numéro de DI' },
    );
    await click(x(p, `//a[@role='tab'][contains(@title,${xq(di)})]`));
    await p.evaluate(() => window.scrollTo(0, 0));
    return di;
  }

  async enterEditMode() {
    const p = this.page;
    await x(p, `//span[text()='Service']`).first().scrollIntoViewIfNeeded().catch(() => {});
    await click(x(p, `//div[@class='slds-tabs_card']//button[@title='Modifier Service']`));
  }

  private async pickComboItem(label: string, value: string, exact: boolean) {
    const p = this.page;
    await click(x(p, `//button[contains(@aria-label,${xq(label)})]/parent::div`));
    const item = exact ? `contains(.,"${value}")` : `contains(.,${xq(value)})`;
    await click(x(p, `//lightning-base-combobox-item[${item}]`));
  }
  chooseService(v: string) {
    return this.pickComboItem('Service', v, true);
  }
  chooseMotif(v: string) {
    return this.pickComboItem('Motif', v, false);
  }

  async saveEdit() {
    const p = this.page;
    const save = p.locator('[name="SaveEdit"]:visible').first();
    await click(save);
    await save.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    await settle(p);
  }

  async currentStatus(): Promise<string> {
    return (
      await x(this.page, `//li[contains(@class,'slds-is-active')]//span[@class='title slds-path__title']`)
        .first()
        .innerText({ timeout: 5_000 })
    ).trim();
  }

  /** Attend le statut attendu, en rechargeant la fiche si la diffusion tarde. */
  async waitForStatus(expected: string) {
    await poll(async () => (await this.currentStatus()) === expected, {
      timeout: 120_000,
      interval: 3_000,
      label: `statut "${expected}"`,
      onMiss: async (n) => {
        if (n % 8 === 0) {
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await settle(this.page);
        }
      },
    });
  }

  async currentOwner(): Promise<string> {
    return (
      await x(this.page, `//force-owner-lookup[@data-output-element-id="output-field"]//a//span`)
        .first()
        .innerText({ timeout: 5_000 })
    ).trim();
  }

  async changeOwner(owner: string) {
    const p = this.page;
    // Idempotent : rien à faire si le propriétaire est déjà le bon
    if ((await this.currentOwner().catch(() => '')) === owner) return;
    await click(x(p, `//button[.//span[text()='Modifier le propriétaire']]`));
    const search = p.locator(`input[title='Rechercher dans les Utilisateurs']`);
    await click(search);
    await fill(search, owner);
    await click(x(p, `//li[.//div[@title=${xq(owner)}]]`));
    await click(x(p, `//button[text()='Modifier le propriétaire']`));
    await settle(p, 30_000);
  }

  async reload() {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await settle(this.page);
  }

  async loadInstructions() {
    const p = this.page;
    await this.reload();
    const btn = x(p, `//button[text()='Cliquez ici pour charger les consignes...']`);
    await poll(
      async () => {
        if (await btn.count()) return true;
        await p.mouse.wheel(0, 2000);
        return false;
      },
      { timeout: 60_000, interval: 500, label: 'bouton de chargement des consignes' },
    );
    await click(btn);
    await settle(p);
  }

  async addInstruction(matricule: string) {
    const p = this.page;
    await click(x(p, `//button[text()='+ Nouvelle consigne']`));
    const field = p.locator('[name="Matricule__c"]');
    await click(field);
    await fill(field, matricule);
    await click(x(p, `//button[text()='Sauvegarder']`));
    await settle(p);
  }

  async assignToTechnician(matricule: string) {
    const p = this.page;
    const select = x(p, `(//tr[contains(.,${xq(matricule)})]//td[@data-label='Réponse']//select)[last()]`);
    await poll(async () => (await select.count()) > 0, {
      timeout: 60_000,
      interval: 1_000,
      label: `consigne du technicien ${matricule}`,
    });
    await retry(
      async () => {
        await select.selectOption({ label: 'Attribué' }, { timeout: 10_000 });
      },
      { label: 'sélection Attribué' },
    );
    await click(x(p, `//button[text()='Valider']`));
    await settle(p, 30_000);
  }
}
