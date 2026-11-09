# sc2-playwright

Conversion en pur Playwright (TypeScript) du parcours `sc2_b2b_dacrc_dactech.robot` :
DI dans DacRC → attribution dans D@C RC → réalisation dans D@C Tech.

## Utilisation

```bash
npm install
npx playwright install chromium   # inutile si CHROME_PATH est défini
cp .env.example .env              # puis renseigner les valeurs
npm test                          # ou npm run test:headed
npm run report
```

### MFA : saisir le code une seule fois

```bash
npm run auth    # ouvre le navigateur : saisir le code MFA de DacRC puis de Dactech à la main
npm test        # réutilise la session sauvegardée (auth/state.json), sans MFA
```

`auth/` est ignoré par git (la session équivaut à un mot de passe : ne pas la partager). Quand la session expire côté serveur, relancer `npm run auth`.

Aucun identifiant n'est dans le code : tout passe par `.env` (ignoré par git).

## Robustesse face aux problèmes de performance

- **Pas de `Sleep` fixe** : `settle()` attend le chargement, le réseau (best-effort) et la disparition des spinners Lightning/Ionic.
- **Timeouts adaptatifs** (`perf`) : le facteur de lenteur monte quand l'application ralentit ou qu'une action échoue, et redescend ensuite (plafond 180 s).
- **Actions auto-réparées** : `click` (clic normal puis clic JS, équivalent de `Wait and Click`), `fill` (avec vérification de la valeur), retry avec backoff exponentiel.
- **Polling borné** au lieu des `WHILE … limit=` : statut « A traiter » (avec rechargement), consigne technicien, apparition de l'OT dans Dactech (6 min max, sans perdre la session).
- **Étapes idempotentes** : le formulaire est rejouable, mais l'enregistrement de la DI et l'envoi du CR ne sont jamais rejoués (pas de doublons). Le changement de propriétaire est ignoré s'il est déjà fait.
- **Diagnostic** : trace, vidéo et capture conservées en cas d'échec ; message d'erreur identique à celui du Robot (étape + scénario) ; 1 relance du test complet (`retries: 1`).

## Écarts avec le Robot

- Contexte de navigateur neuf (pas de profil `C:\Temp\profil`) ; `CHROME_PATH` permet d'utiliser le Chrome des robots.
- Les appels API (Orion, Tempo, MSAD, token Dactech via proxy) du Robot ne sont pas utilisés par ce scénario et ne sont pas portés.
- Les sélecteurs sont repris des fichiers `.robot` ; à valider lors d'un premier run sur l'environnement réel.
