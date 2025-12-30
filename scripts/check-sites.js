#!/usr/bin/env node

/**
 * Script pour vérifier le statut des sites sans Cypress
 * Usage: node scripts/check-sites.js
 */

const https = require('https');
const http = require('http');
const url = require('url');
const sites = require('../cypress/fixtures/sites.json');

function checkSite(site) {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(site.url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      resolve({
        site: site.name,
        url: site.url,
        expectedStatus: site.status,
        actualStatus: res.statusCode,
        success: true
      });
    });

    req.on('error', (error) => {
      resolve({
        site: site.name,
        url: site.url,
        expectedStatus: site.status,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        site: site.name,
        url: site.url,
        expectedStatus: site.status,
        error: 'Timeout',
        success: false
      });
    });

    req.end();
  });
}

async function checkAllSites() {
  console.log('=== Vérification du statut des sites ===\n');
  
  const results = await Promise.all(sites.sites.map(checkSite));
  
  console.log('Résultats:\n');
  results.forEach(result => {
    console.log(`Site: ${result.site}`);
    console.log(`URL: ${result.url}`);
    console.log(`Statut attendu: ${result.expectedStatus}`);
    if (result.success) {
      console.log(`Code HTTP: ${result.actualStatus}`);
      console.log(`État: ${result.actualStatus >= 200 && result.actualStatus < 400 ? '✓ Accessible' : '✗ Erreur'}`);
    } else {
      console.log(`Erreur: ${result.error}`);
      console.log(`État: ✗ Inaccessible`);
    }
    console.log('-------------------\n');
  });

  // Résumé
  const activeSites = sites.sites.filter(s => s.status === 'active');
  const inactiveSites = sites.sites.filter(s => s.status === 'inactive');
  const ultraedgeSites = sites.sites.filter(s => s.name.includes('ultraedge'));

  console.log('\n=== Résumé ===');
  console.log(`Total de sites: ${sites.sites.length}`);
  console.log(`Sites actifs configurés: ${activeSites.length}`);
  console.log(`Sites inactifs configurés: ${inactiveSites.length}`);
  console.log(`Sites UltraEdge: ${ultraedgeSites.length}`);
  
  console.log('\n=== Sites UltraEdge ===');
  ultraedgeSites.forEach(site => {
    console.log(`- ${site.name}: ${site.url} (${site.status})`);
  });
}

checkAllSites().catch(console.error);
