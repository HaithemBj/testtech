# Configuration du projet

## Prérequis
- **Node.js** (Version v20.14.0) : Assurez-vous d'avoir la bonne version de Node.js installée. Téléchargez-la depuis le site officiel de [Node.js](https://nodejs.org/en/download/releases/).
- **Cypress** (Version 13.11.0) : Installez Cypress à la version spécifiée pour garantir la compatibilité.

## Installation
**Installer les dépendances NPM** : Exécutez les commandes suivantes dans votre terminal pour installer Node.js et Cypress.
   ```bash
   npm install
   npm install cypress@13.11.0
## Execution des tests:
GUI: 
- npx cypress open
Headless
- npx cypress run

## Tests de vérification de statut des sites

Le projet inclut maintenant des tests pour vérifier le statut des sites (actifs/inactifs):

### Configuration des sites
Les sites à vérifier sont configurés dans `cypress/fixtures/sites.json`. Vous pouvez ajouter ou modifier les sites en éditant ce fichier.

### Exécution des tests de statut
Pour exécuter les tests de vérification de statut avec Cypress:
```bash
npx cypress run --spec "cypress/e2e/SiteStatusVerification.cy.js"
```

Pour vérifier rapidement les sites sans Cypress (avec Node.js):
```bash
npm run check-sites
# ou directement
node scripts/check-sites.js
```

### Sites surveillés
- Sites UltraEdge (actuellement inactifs)
- Site de test Clarity (actif)

Les tests génèrent un rapport détaillé du statut de chaque site.
 
