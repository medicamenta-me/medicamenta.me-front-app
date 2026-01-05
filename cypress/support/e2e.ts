// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.ts using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Prevent TypeScript errors
/// <reference types="cypress" />

// Global before hook to setup test environment
before(() => {
  cy.log('Setting up E2E test environment');
});

// Global after hook to cleanup
after(() => {
  cy.log('Cleaning up E2E test environment');
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // You can customize this based on specific errors you want to ignore
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});
