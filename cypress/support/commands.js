// commands.js or a custom commands file
Cypress.Commands.add('validateButtonMessage', (buttonSelector, action, message) => {

  if (action === 'mouseover') {
    cy.get(buttonSelector).trigger('mouseover');
  } else if (action !== 'mouseover') {
    cy.get(buttonSelector)[action]();
  }
  cy.contains(message).should('be.visible');
});

// Command to interact with CKEditor 5 rich text editor
Cypress.Commands.add('typeInRichTextEditor', (editorXPath, text) => {
  cy.xpath(editorXPath).click().type(text);
});

// Command to get content from CKEditor 5 rich text editor
Cypress.Commands.add('getRichTextEditorContent', (editorXPath) => {
  return cy.xpath(editorXPath).invoke('text');
});

