const variables = require('../fixtures/variables.json');

describe('Actions sur les Boutons', () => {
  beforeEach(() => {
    cy.visit(variables.BaseUrl);
  });

  it('Valide le message lors du clic sur le bouton', () => {
    cy.validateButtonMessage(variables.selectors.buttonClick, 'click', variables.messages.clickDone);
  });

  it('Valide le message lors du double-clic sur le bouton', () => {
    cy.validateButtonMessage(variables.selectors.buttonDblClick, 'dblclick', variables.messages.dblClickDone);
  });

  it('Valide le message lors du survol de la souris sur le bouton', () => {
    cy.get(variables.selectors.buttonMouseOver).trigger('mouseover');
    cy.contains(variables.messages.mouseOverDone).should('be.visible');
  });
  describe('Scénario 4 Overlay', () => {
    it('Gestion de overlay et valide la propagation des entrées', () => {
      cy.visit(variables.BaseUrl+'?withOverlay');
      
      // -->  Ici il faut mettre en place un listener (handler) pour le overlay 
      // ou bien un loop pour identifier son existance et cliquer sur le boutton Close 
      
      // Insérer une valeur dans l'Input 1
      const inputValue = 'Test Value';
      cy.get('#input_text1').type(inputValue);
      cy.get('#propagate').click();
  
      // Valider la propagation
      const inputFields = ['#input_text1', '#input_text2', '#input_text3', '#input_text4'];
      inputFields.forEach((selector) => {
        cy.get(selector).should('have.value', inputValue);
      });
  
      // Effacer tous les champs de saisie
      cy.get('[onclick="clearValue()"]').click();
  
      // Valider que tous les champs de saisie sont vides
      inputFields.forEach((selector) => {
        cy.get(selector).should('have.value', '');
      });
    });
  });
  
});

// Exemple d'utilisation du sélecteur XPath pour CKEditor 5
// Pour utiliser ce test, décommenter et adapter à votre page contenant CKEditor 5
/*
describe("Test de l'éditeur de texte enrichi CKEditor 5", () => {
  it("Peut saisir du texte dans l'éditeur enrichi", () => {
    // Visiter une page contenant CKEditor 5
    cy.visit('URL_DE_VOTRE_PAGE_AVEC_CKEDITOR');
    
    // Utiliser le sélecteur XPath pour CKEditor 5
    cy.typeInRichTextEditor(variables.selectors.richTextEditor, 'Texte de test pour CKEditor 5');
    
    // Vérifier que le texte a été saisi
    cy.getRichTextEditorContent(variables.selectors.richTextEditor)
      .should('contain', 'Texte de test pour CKEditor 5');
  });
});
*/
