/// <reference types="cypress" />

/**
 * E2E Tests for Medication CRUD Operations
 * 
 * Tests cover:
 * - Creating new medications
 * - Editing existing medications
 * - Deleting medications
 * - Validation of required fields
 * - Error handling
 */

describe('Medication CRUD Operations', () => {
  const testMedication = {
    name: 'Aspirina Test',
    dosage: '500mg',
    frequency: 'daily',
    time: '08:00',
  };

  beforeEach(() => {
    // Login before each test
    cy.login(
      Cypress.env('testUserEmail'),
      Cypress.env('testUserPassword')
    );
  });

  afterEach(() => {
    // Logout after each test
    cy.logout();
  });

  describe('Create Medication', () => {
    it('should display add medication button', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').should('be.visible');
    });

    it('should open add medication form when button is clicked', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-form]').should('be.visible');
      cy.get('[data-cy=medication-name]').should('be.visible');
      cy.get('[data-cy=medication-dosage]').should('be.visible');
    });

    it('should create new medication successfully', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      // Fill form
      cy.get('[data-cy=medication-name]').type(testMedication.name);
      cy.get('[data-cy=medication-dosage]').type(testMedication.dosage);
      cy.get('[data-cy=medication-frequency]').select(testMedication.frequency);
      cy.get('[data-cy=medication-time]').type(testMedication.time);
      
      // Submit form
      cy.get('[data-cy=save-medication]').click();
      cy.waitForIonic();
      
      // Verify success
      cy.get('[data-cy=success-toast]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'Medicamento adicionado');
      
      // Verify medication appears in list
      cy.get('[data-cy=medication-list]').should('contain', testMedication.name);
    });

    it('should validate required fields', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      // Try to submit empty form
      cy.get('[data-cy=save-medication]').click();
      
      // Verify validation messages
      cy.get('[data-cy=error-name]')
        .should('be.visible')
        .and('contain', 'obrigatório');
      cy.get('[data-cy=error-dosage]')
        .should('be.visible')
        .and('contain', 'obrigatório');
    });

    it('should show error for invalid dosage format', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-name]').type(testMedication.name);
      cy.get('[data-cy=medication-dosage]').type('invalid');
      cy.get('[data-cy=medication-frequency]').select(testMedication.frequency);
      
      cy.get('[data-cy=save-medication]').click();
      
      cy.get('[data-cy=error-dosage]')
        .should('be.visible')
        .and('contain', 'formato inválido');
    });
  });

  describe('Read Medications', () => {
    beforeEach(() => {
      // Create a medication to read
      cy.addMedication(testMedication);
    });

    it('should display medications list', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-list]').should('be.visible');
      cy.get('[data-cy=medication-item]').should('have.length.at.least', 1);
    });

    it('should display medication details when clicked', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-details]').should('be.visible');
      cy.get('[data-cy=detail-name]').should('contain', testMedication.name);
      cy.get('[data-cy=detail-dosage]').should('contain', testMedication.dosage);
    });

    it('should filter medications by name', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=search-input]').type(testMedication.name);
      
      cy.get('[data-cy=medication-item]').should('have.length', 1);
      cy.get('[data-cy=medication-item]').first().should('contain', testMedication.name);
    });
  });

  describe('Update Medication', () => {
    beforeEach(() => {
      cy.addMedication(testMedication);
    });

    it('should edit medication successfully', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=edit-btn]').click();
      cy.waitForIonic();
      
      // Update fields
      const updatedName = 'Aspirina Test Updated';
      cy.get('[data-cy=medication-name]').clear().type(updatedName);
      cy.get('[data-cy=medication-dosage]').clear().type('100mg');
      
      cy.get('[data-cy=save-medication]').click();
      cy.waitForIonic();
      
      // Verify success
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'atualizado');
      
      // Verify changes
      cy.get('[data-cy=medication-list]').should('contain', updatedName);
    });

    it('should cancel edit without saving', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=edit-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-name]').clear().type('Should Not Save');
      cy.get('[data-cy=cancel-btn]').click();
      cy.waitForIonic();
      
      // Verify original name is preserved
      cy.get('[data-cy=medication-list]').should('contain', testMedication.name);
      cy.get('[data-cy=medication-list]').should('not.contain', 'Should Not Save');
    });
  });

  describe('Delete Medication', () => {
    beforeEach(() => {
      cy.addMedication(testMedication);
    });

    it('should show confirmation dialog when deleting', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=delete-btn]').click();
      
      cy.get('[data-cy=confirm-delete-dialog]').should('be.visible');
      cy.get('[data-cy=confirm-delete-message]')
        .should('contain', 'Tem certeza')
        .and('contain', testMedication.name);
    });

    it('should delete medication when confirmed', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=delete-btn]').click();
      cy.get('[data-cy=confirm-yes]').click();
      cy.waitForIonic();
      
      // Verify success
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'removido');
      
      // Verify medication is gone
      cy.get('[data-cy=medication-list]').should('not.contain', testMedication.name);
    });

    it('should cancel deletion when declined', () => {
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-item]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=delete-btn]').click();
      cy.get('[data-cy=confirm-no]').click();
      cy.waitForIonic();
      
      // Verify medication still exists
      cy.navigateToTab('medications');
      cy.get('[data-cy=medication-list]').should('contain', testMedication.name);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Intercept API call and force error
      cy.intercept('POST', '**/medications', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('createMedicationError');
      
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-name]').type(testMedication.name);
      cy.get('[data-cy=medication-dosage]').type(testMedication.dosage);
      cy.get('[data-cy=medication-frequency]').select(testMedication.frequency);
      
      cy.get('[data-cy=save-medication]').click();
      
      cy.wait('@createMedicationError');
      
      cy.get('[data-cy=error-toast]')
        .should('be.visible')
        .and('contain', 'Erro ao salvar');
    });

    it('should handle duplicate medication names', () => {
      // First medication
      cy.addMedication(testMedication);
      
      // Try to add duplicate
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-name]').type(testMedication.name);
      cy.get('[data-cy=medication-dosage]').type(testMedication.dosage);
      cy.get('[data-cy=medication-frequency]').select(testMedication.frequency);
      
      cy.get('[data-cy=save-medication]').click();
      
      cy.get('[data-cy=error-toast]')
        .should('be.visible')
        .and('contain', 'já existe');
    });
  });
});
