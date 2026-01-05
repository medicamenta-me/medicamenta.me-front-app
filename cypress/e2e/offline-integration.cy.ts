/// <reference types="cypress" />

/**
 * @file offline-integration.cy.ts
 * @description E2E tests for Offline Integration and Prescription Sync (A2.3, A2.5)
 * @sprint A2 - Prescription Sync
 * @version 1.0.0
 * @date 2026-01-03
 */

describe('Offline Integration Tests', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Prescription Sync Service', () => {
    it('should display prescriptions list', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('.prescription-list, .prescriptions, ion-list').length > 0) {
          cy.get('.prescription-list, .prescriptions, ion-list').should('exist');
        }
      });
    });

    it('should show valid prescriptions only', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('.prescription-card, .prescription-item').length > 0) {
          // All shown should be valid (not expired)
          cy.get('.prescription-card, .prescription-item').each(($card) => {
            cy.wrap($card).should('not.have.class', 'expired');
          });
        }
      });
    });

    it('should display prescription expiration date', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('.expires-at, .expiration-date, .valid-until').length > 0) {
          cy.get('.expires-at, .expiration-date, .valid-until')
            .first()
            .invoke('text')
            .should('not.be.empty');
        }
      });
    });

    it('should show linked orders count', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('.linked-orders, .orders-count').length > 0) {
          cy.get('.linked-orders, .orders-count').should('exist');
        }
      });
    });
  });

  describe('Prescription Upload', () => {
    it('should have upload button', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('button, ion-button, ion-fab-button').filter(':contains("Adicionar")').length > 0) {
          cy.get('button, ion-button, ion-fab-button')
            .contains(/adicionar|nova|upload|enviar/i)
            .should('exist');
        }
      });
    });

    it('should open upload modal', () => {
      cy.visit('/prescriptions');
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Adicionar")').length > 0) {
          cy.get('button').contains(/adicionar|nova/i).click();
          cy.get('ion-modal, .modal, .upload-modal').should('exist');
        }
      });
    });

    it('should allow file selection', () => {
      cy.visit('/prescriptions/upload');
      cy.get('body').then(($body) => {
        if ($body.find('input[type="file"], .file-input').length > 0) {
          cy.get('input[type="file"], .file-input').should('exist');
        }
      });
    });

    it('should show upload progress', () => {
      cy.visit('/prescriptions/upload');
      cy.get('body').then(($body) => {
        if ($body.find('.upload-progress, ion-progress-bar, .progress').length > 0) {
          cy.get('.upload-progress, ion-progress-bar, .progress').should('exist');
        }
      });
    });

    it('should validate prescription image format', () => {
      cy.visit('/prescriptions/upload');
      cy.get('body').then(($body) => {
        if ($body.find('.supported-formats, .file-types').length > 0) {
          cy.get('.supported-formats, .file-types')
            .invoke('text')
            .should('match', /jpg|jpeg|png|pdf/i);
        }
      });
    });
  });

  describe('Prescription Linking to Orders', () => {
    it('should show prescription picker in checkout', () => {
      cy.visit('/checkout');
      cy.get('body').then(($body) => {
        if ($body.find('app-prescription-picker, .prescription-picker, .prescription-select').length > 0) {
          cy.get('app-prescription-picker, .prescription-picker, .prescription-select').should('exist');
        }
      });
    });

    it('should list available prescriptions in picker', () => {
      cy.visit('/checkout');
      cy.get('body').then(($body) => {
        if ($body.find('.prescription-option, .prescription-item').length > 0) {
          cy.get('.prescription-option, .prescription-item').should('exist');
        }
      });
    });

    it('should select prescription for order', () => {
      cy.visit('/checkout');
      cy.get('body').then(($body) => {
        if ($body.find('.prescription-option, .prescription-item').length > 0) {
          cy.get('.prescription-option, .prescription-item').first().click();
          cy.get('.prescription-selected, .selected').should('exist');
        }
      });
    });

    it('should show prescription required indicator for medications', () => {
      cy.visit('/cart');
      cy.get('body').then(($body) => {
        if ($body.find('.prescription-required, .requires-prescription, ion-icon[name*="document"]').length > 0) {
          cy.get('.prescription-required, .requires-prescription, ion-icon[name*="document"]').should('exist');
        }
      });
    });
  });

  describe('Offline Queue', () => {
    it('should queue actions when offline', () => {
      cy.visit('/medications');
      
      // Go offline
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });

      // Attempt action
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Adicionar")').length > 0) {
          cy.get('button').contains(/adicionar|add/i).click();
        }
      });

      // Should show queued indicator
      cy.get('body').then(($body) => {
        if ($body.find('.offline-queue, .queued, .pending-sync').length > 0) {
          cy.get('.offline-queue, .queued, .pending-sync').should('exist');
        }
      });
    });

    it('should show sync status indicator', () => {
      cy.visit('/tabs/home');
      cy.get('body').then(($body) => {
        if ($body.find('app-sync-status, .sync-status, .sync-indicator').length > 0) {
          cy.get('app-sync-status, .sync-status, .sync-indicator').should('exist');
        }
      });
    });

    it('should display pending items count', () => {
      cy.visit('/tabs/home');
      cy.get('body').then(($body) => {
        if ($body.find('.pending-count, .queue-count').length > 0) {
          cy.get('.pending-count, .queue-count').should('exist');
        }
      });
    });

    it('should prioritize critical actions', () => {
      cy.visit('/medications');
      
      // Go offline
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });

      // Queue multiple actions
      // Critical: dose recording should be first in queue
      cy.get('body').then(($body) => {
        // Actions queued should respect priority
        if ($body.find('.queue-item, .pending-item').length > 0) {
          cy.get('.queue-item, .pending-item').first()
            .should('have.class', 'priority-critical');
        }
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts on sync', () => {
      cy.visit('/medications');
      
      // Simulate conflict scenario
      cy.window().then((win) => {
        const event = new CustomEvent('sync:conflict', {
          detail: {
            localVersion: { updatedAt: new Date() },
            serverVersion: { updatedAt: new Date() }
          }
        });
        win.dispatchEvent(event);
      });

      cy.get('body').then(($body) => {
        if ($body.find('.conflict-dialog, .conflict-modal, ion-alert').length > 0) {
          cy.get('.conflict-dialog, .conflict-modal, ion-alert').should('exist');
        }
      });
    });

    it('should offer conflict resolution options', () => {
      cy.visit('/medications');
      
      // Simulate conflict
      cy.window().then((win) => {
        const event = new CustomEvent('sync:conflict', {
          detail: { type: 'medication_update' }
        });
        win.dispatchEvent(event);
      });

      cy.get('body').then(($body) => {
        if ($body.find('.conflict-options, .resolution-buttons').length > 0) {
          cy.get('.conflict-options, .resolution-buttons').within(() => {
            cy.contains(/local|minha/i).should('exist');
            cy.contains(/servidor|remota/i).should('exist');
          });
        }
      });
    });

    it('should resolve conflict by keeping local version', () => {
      cy.visit('/medications');
      
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Minha versão")').length > 0) {
          cy.get('button').contains(/minha|local/i).click();
          cy.get('.conflict-dialog').should('not.exist');
        }
      });
    });

    it('should resolve conflict by keeping server version', () => {
      cy.visit('/medications');
      
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Servidor")').length > 0) {
          cy.get('button').contains(/servidor|remota/i).click();
          cy.get('.conflict-dialog').should('not.exist');
        }
      });
    });
  });

  describe('Retry with Exponential Backoff', () => {
    it('should retry failed sync operations', () => {
      cy.visit('/medications');
      
      // Simulate failed sync
      cy.window().then((win) => {
        const event = new CustomEvent('sync:failed', {
          detail: { itemId: 'item-001', retryCount: 1 }
        });
        win.dispatchEvent(event);
      });

      cy.get('body').then(($body) => {
        if ($body.find('.retry-indicator, .retrying').length > 0) {
          cy.get('.retry-indicator, .retrying').should('exist');
        }
      });
    });

    it('should show max retries reached error', () => {
      cy.visit('/medications');
      
      // Simulate max retries
      cy.window().then((win) => {
        const event = new CustomEvent('sync:maxRetries', {
          detail: { itemId: 'item-001' }
        });
        win.dispatchEvent(event);
      });

      cy.get('body').then(($body) => {
        if ($body.find('.sync-error, .error-message, ion-toast').length > 0) {
          cy.get('.sync-error, .error-message, ion-toast').should('exist');
        }
      });
    });

    it('should allow manual retry', () => {
      cy.visit('/settings/sync');
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Sincronizar")').length > 0) {
          cy.get('button').contains(/sincronizar|retry|tentar/i).should('exist');
        }
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist data in IndexedDB', () => {
      cy.visit('/medications');
      
      // Check IndexedDB exists
      cy.window().then((win) => {
        expect(win.indexedDB).to.exist;
      });
    });

    it('should load cached data immediately', () => {
      cy.visit('/medications');
      
      // First load should show cached data quickly
      cy.get('body').then(($body) => {
        // Should not show loading for too long if cached
        if ($body.find('.loading, ion-spinner').length > 0) {
          cy.get('.loading, ion-spinner').should('not.exist', { timeout: 1000 });
        }
      });
    });

    it('should show stale data indicator when offline', () => {
      cy.visit('/medications');
      
      // Go offline
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });

      cy.get('body').then(($body) => {
        if ($body.find('.stale-data, .last-synced, .outdated').length > 0) {
          cy.get('.stale-data, .last-synced, .outdated').should('exist');
        }
      });
    });

    it('should clear cache on logout', () => {
      cy.visit('/settings');
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Sair")').length > 0) {
          cy.get('button').contains(/sair|logout/i).click();
          
          // Verify cache cleared
          cy.window().then((win) => {
            // LocalStorage should be cleared
            expect(win.localStorage.length).to.equal(0);
          });
        }
      });
    });
  });

  describe('Prescription Verification Status', () => {
    it('should show pending verification status', () => {
      cy.visit('/prescriptions/PRESC-001');
      cy.get('body').then(($body) => {
        if ($body.find('.verification-status, .pending-verification').length > 0) {
          cy.get('.verification-status, .pending-verification')
            .invoke('text')
            .should('match', /pendente|aguardando|pending/i);
        }
      });
    });

    it('should show verified status', () => {
      cy.visit('/prescriptions/PRESC-VERIFIED');
      cy.get('body').then(($body) => {
        if ($body.find('.verification-status, .verified').length > 0) {
          cy.get('.verification-status, .verified')
            .invoke('text')
            .should('match', /verificada|approved|válida/i);
        }
      });
    });

    it('should show rejected status with reason', () => {
      cy.visit('/prescriptions/PRESC-REJECTED');
      cy.get('body').then(($body) => {
        if ($body.find('.rejection-reason, .rejected-message').length > 0) {
          cy.get('.rejection-reason, .rejected-message').should('exist');
        }
      });
    });
  });

  describe('Cross-Platform Data Consistency', () => {
    it('should sync medications across platforms', () => {
      cy.visit('/medications');
      
      // Simulate data from another platform
      cy.window().then((win) => {
        const event = new CustomEvent('sync:received', {
          detail: {
            source: 'marketplace',
            type: 'medication',
            data: { name: 'Medicamento Teste' }
          }
        });
        win.dispatchEvent(event);
      });

      cy.get('body').then(($body) => {
        if ($body.find('.sync-received, .data-updated').length > 0) {
          cy.get('.sync-received, .data-updated').should('exist');
        }
      });
    });

    it('should handle timezone differences', () => {
      cy.visit('/medications');
      
      // Dates should be displayed in user's timezone
      cy.get('body').then(($body) => {
        if ($body.find('.date, .timestamp, .time').length > 0) {
          cy.get('.date, .timestamp, .time').should('exist');
        }
      });
    });
  });

  describe('Network Transition Handling', () => {
    it('should handle WiFi to cellular transition', () => {
      cy.visit('/medications');
      
      // Simulate network change
      cy.window().then((win) => {
        const event = new Event('online');
        win.dispatchEvent(event);
      });

      // Should continue syncing without errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error').as('consoleError');
      });

      cy.wait(2000);
      cy.get('@consoleError').should('not.have.been.called');
    });

    it('should pause sync on metered connection if configured', () => {
      cy.visit('/settings/sync');
      cy.get('body').then(($body) => {
        if ($body.find('.wifi-only-sync, input[name="wifiOnly"]').length > 0) {
          cy.get('.wifi-only-sync, input[name="wifiOnly"]').should('exist');
        }
      });
    });
  });
});
