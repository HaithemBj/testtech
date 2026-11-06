import { test } from '@playwright/test';
import { config } from '../src/config';
import { perf, step } from '../src/lib/resilience';
import { DacRC } from '../src/pages/dacrc';
import { Dactech } from '../src/pages/dactech';

const TEST_NAME =
  'sc2_Parcours B2B DacRC => Dactech: DI dans DacRC - Attribution dans D@C RC - Réalisation dans D@C Tech';
const COMMENT = 'TEST SUPERVISION - NE PAS PRENDRE EN COMPTE';

test(TEST_NAME, async ({ context }) => {
  perf.reset();
  const s = (name: string, fn: () => Promise<void>, o: { attempts?: number; recover?: () => Promise<void> } = {}) =>
    step(name, fn, { ...o, testName: TEST_NAME });

  const rcPage = await context.newPage();
  const rc = new DacRC(rcPage);
  const matricule = config.data.matricule();
  let di = '';
  let ot = '';

  await s('Lancement de Dacrc', () => rc.login(), { attempts: 3 });

  // --- Création de la DI dans DacRC ---
  // Avant l'enregistrement rien n'est persisté : on peut rejouer le formulaire sans risque.
  await s(
    'Création de la DI dans DacRC (saisie du formulaire)',
    async () => {
      await rc.closeOpenTabs();
      await rc.selectMenu('Demandes');
      await rc.openNewRequest(config.data.typeDemande());
      await rc.chooseCaller(config.data.demandeur());
      await rc.chooseLocation(config.data.dkCode());
      await rc.fillMessage(COMMENT);
      await rc.selectImpact('Local');
      await rc.selectUrgency('Urgente');
      await rc.fillUrgencyReason(config.data.raisonMajUrgence());
      await rc.selectOrigin('Appel entrant');
    },
    { attempts: 3, recover: () => rc.waitReady() },
  );

  // Après le clic sur Enregistrer, on ne recommence plus (évite les DI en double).
  await s(
    "Création de la DI dans DacRC (enregistrement)",
    async () => {
      await rc.clickSave();
      di = await rc.readCreatedRequestNumber();
      ot = `${di}-1`;
      console.log(`DI créée: ${di}`);
    },
    { attempts: 1 },
  );

  await s(
    `Édition de la DI ${di} (service et motif)`,
    async () => {
      await rc.enterEditMode();
      await rc.chooseService(config.data.service());
      await rc.chooseMotif(config.data.motif());
      await rc.saveEdit();
    },
    { recover: () => rc.reload() },
  );

  await s(`Vérification de statut A traiter de la di ${di} sur Dacrc.`, () => rc.waitForStatus('A traiter'));
  await s('Changement du propriétaire', () => rc.changeOwner(config.data.proprietaire()), {
    recover: () => rc.reload(),
  });

  // --- Attribution dans D@C RC ---
  await s(
    'Attribution dans D@C RC',
    async () => {
      await rc.loadInstructions();
      await rc.addInstruction(matricule);
      await rc.assignToTechnician(matricule);
    },
    { recover: () => rc.reload() },
  );
  await rcPage.close();

  // --- Réalisation dans D@C Tech (session propre, comme Fermer/Lancer Chrome) ---
  await context.clearCookies();
  const techPage = await context.newPage();
  const tech = new Dactech(techPage);

  await s('Lancement de Dactech', () => tech.login(matricule), { attempts: 3 });
  await s(`Sélection de l'OT ${ot} dans Dactech`, () => tech.selectOt(ot));
  await s(
    `Réalisation de l'OT ${ot} dans D@C Tech avec intervention et problème réglé`,
    async () => {
      await tech.startReport();
      await tech.fillFoundedSolvedIntervention(COMMENT);
      await tech.finalizeReport();
    },
    { attempts: 1 },
  );
  // L'envoi du CR n'est pas rejouable : une seule tentative, avec attentes longues.
  await s('Signature et envoi du CR', () => tech.signAndSend(), { attempts: 1 });
  await s('Fermeture des suggestions OTs', () => tech.closeSuggestions());

  console.log('Terminé');
});
