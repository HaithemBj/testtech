const sites = require('../fixtures/sites.json');

describe('Vérification du statut des sites', () => {
  
  it('Vérifie les sites actifs', () => {
    const activeSites = sites.sites.filter(site => site.status === 'active');
    
    activeSites.forEach((site) => {
      cy.log(`Vérification du site actif: ${site.name}`);
      cy.request({
        url: site.url,
        failOnStatusCode: false,
        timeout: 10000
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201, 301, 302, 304]);
        cy.log(`✓ ${site.name} est actif (statut: ${response.status})`);
      });
    });
  });

  it('Vérifie les sites inactifs', () => {
    const inactiveSites = sites.sites.filter(site => site.status === 'inactive');
    
    inactiveSites.forEach((site) => {
      cy.log(`Vérification du site inactif: ${site.name} - ${site.description}`);
      cy.request({
        url: site.url,
        failOnStatusCode: false,
        timeout: 10000
      }).then((response) => {
        // Pour les sites inactifs, on s'attend à des codes d'erreur ou à l'impossibilité de se connecter
        cy.log(`Site ${site.name} a retourné le statut: ${response.status}`);
        // On log simplement le statut sans faire échouer le test
        // car un site inactif peut retourner différents codes d'erreur
      });
    });
  });

  it('Liste tous les sites ultraedge', () => {
    const ultraedgeSites = sites.sites.filter(site => site.name.includes('ultraedge'));
    
    cy.log('=== Sites UltraEdge ===');
    ultraedgeSites.forEach((site) => {
      cy.log(`Nom: ${site.name}`);
      cy.log(`URL: ${site.url}`);
      cy.log(`Statut: ${site.status}`);
      cy.log(`Description: ${site.description}`);
      cy.log('-------------------');
    });
    
    expect(ultraedgeSites.length).to.be.greaterThan(0);
  });

  it('Génère un rapport de statut pour tous les sites', () => {
    const report = {
      totalSites: sites.sites.length,
      activeSites: sites.sites.filter(s => s.status === 'active').length,
      inactiveSites: sites.sites.filter(s => s.status === 'inactive').length,
      ultraedgeSites: sites.sites.filter(s => s.name.includes('ultraedge')).length
    };

    cy.log('=== Rapport de statut des sites ===');
    cy.log(`Total de sites: ${report.totalSites}`);
    cy.log(`Sites actifs: ${report.activeSites}`);
    cy.log(`Sites inactifs: ${report.inactiveSites}`);
    cy.log(`Sites UltraEdge: ${report.ultraedgeSites}`);
    
    // Afficher les détails de chaque site
    cy.log('=== Détails des sites ===');
    sites.sites.forEach((site) => {
      cy.log(`${site.name} (${site.status}): ${site.url}`);
    });
  });
});
