# Migration XPath: Alloy Editor vers CKEditor 5

## Changement effectué

Le sélecteur XPath a été mis à jour pour passer de l'ancien Alloy Editor / CKEditor 4 vers CKEditor 5.

### Ancien XPath (Alloy Editor / CKEditor 4)
```xpath
//div[contains(@class, 'alloy-editor') and contains(@class, 'cke_editable')]
```

### Nouveau XPath (CKEditor 5)
```xpath
//div[contains(@class, 'ck-editor__editable') and contains(@class, 'ck-content')]
```

## Élément cible

Le nouveau sélecteur XPath cible les éléments CKEditor 5 avec la structure suivante:
```html
<div class="ck ck-content ck-editor__editable ck-rounded-corners ck-editor__editable_inline ck-focused" 
     lang="fr" 
     dir="ltr" 
     role="textbox" 
     aria-label="Éditeur de texte enrichi. Zone d'édition : main. Appuyez sur Alt+0 pour obtenir de l'aide." 
     contenteditable="true">
  <p><br data-cke-filler="true"></p>
</div>
```

## Fichiers modifiés

### 1. `cypress/fixtures/variables.json`
Ajout du nouveau sélecteur:
```json
"richTextEditor": "//div[contains(@class, 'ck-editor__editable') and contains(@class, 'ck-content')]"
```

### 2. `cypress/support/commands.js`
Ajout de deux nouvelles commandes personnalisées:
- `typeInRichTextEditor(editorXPath, text)`: Pour saisir du texte dans l'éditeur
- `getRichTextEditorContent(editorXPath)`: Pour récupérer le contenu de l'éditeur

### 3. `cypress/e2e/Scenarios.cy.js`
Ajout d'un exemple de test commenté montrant comment utiliser le nouveau sélecteur.

## Utilisation

### Utiliser le sélecteur directement
```javascript
const variables = require('../fixtures/variables.json');

cy.xpath(variables.selectors.richTextEditor).click().type('Votre texte');
```

### Utiliser les commandes personnalisées
```javascript
const variables = require('../fixtures/variables.json');

// Saisir du texte
cy.typeInRichTextEditor(variables.selectors.richTextEditor, 'Votre texte');

// Récupérer le contenu
cy.getRichTextEditorContent(variables.selectors.richTextEditor)
  .should('contain', 'Votre texte');
```

## Notes techniques

- Le nouveau XPath utilise `ck-editor__editable` et `ck-content` qui sont les classes principales de CKEditor 5
- Ces classes sont présentes dans toutes les instances de CKEditor 5
- Le sélecteur est compatible avec toutes les variantes d'éditeur (inline, classic, etc.)
