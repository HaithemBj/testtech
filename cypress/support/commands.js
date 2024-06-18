// commands.js or a custom commands file
Cypress.Commands.add('validateButtonMessage', (buttonSelector, action, message) => {

  if (action === 'mouseover') {
    cy.get(buttonSelector).trigger('mouseover');
  } else if (action !== 'mouseover') {
    cy.get(buttonSelector)[action]();
  }
  cy.contains(message).should('be.visible');
});

