// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login to the application
       * @example cy.login('user@test.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to logout from the application
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Custom command to add a medication
       * @example cy.addMedication({ name: 'Aspirina', dosage: '500mg', frequency: 'daily' })
       */
      addMedication(medication: {
        name: string;
        dosage: string;
        frequency: string;
        time?: string;
      }): Chainable<void>;

      /**
       * Custom command to wait for Ionic app to be ready
       * @example cy.waitForIonic()
       */
      waitForIonic(): Chainable<void>;

      /**
       * Custom command to navigate to a specific tab
       * @example cy.navigateToTab('medications')
       */
      navigateToTab(tabName: string): Chainable<void>;

      /**
       * Custom command to get a toast by type
       * @example cy.getToast('success')
       */
      getToast(type: 'success' | 'error' | 'info' | 'warning'): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.waitForIonic();
  
  cy.get('[data-cy=email-input]', { timeout: 10000 }).should('be.visible').type(email);
  cy.get('[data-cy=password-input]').should('be.visible').type(password);
  cy.get('[data-cy=login-button]').click();
  
  // Wait for navigation to complete
  cy.url().should('include', '/tabs', { timeout: 15000 });
  cy.waitForIonic();
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=profile-tab]').click();
  cy.waitForIonic();
  cy.get('[data-cy=logout-button]').click();
  cy.waitForIonic();
  // Ionic alerts use cssClass for button selection
  cy.get('.confirm-logout-dialog .confirm-logout-btn').click();
  cy.url().should('include', '/login');
});

// Add medication command
Cypress.Commands.add('addMedication', (medication) => {
  cy.get('[data-cy=medications-tab]').click();
  cy.waitForIonic();
  cy.get('[data-cy=add-medication-btn]').click();
  cy.waitForIonic();
  
  cy.get('[data-cy=medication-name]').type(medication.name);
  cy.get('[data-cy=medication-dosage]').type(medication.dosage);
  cy.get('[data-cy=medication-frequency]').select(medication.frequency);
  
  if (medication.time) {
    cy.get('[data-cy=medication-time]').type(medication.time);
  }
  
  cy.get('[data-cy=save-medication]').click();
  cy.waitForIonic();
});

// Wait for Ionic to be ready
Cypress.Commands.add('waitForIonic', () => {
  cy.window().should('have.property', 'Ionic');
  cy.wait(500); // Small delay for animations
});

// Navigate to tab
Cypress.Commands.add('navigateToTab', (tabName: string) => {
  cy.get(`[data-cy=${tabName}-tab]`).click();
  cy.waitForIonic();
});

// Get toast by type
Cypress.Commands.add('getToast', (type: 'success' | 'error' | 'info' | 'warning') => {
  return cy.get(`.${type}-toast`, { timeout: 10000 });
});

export {};
