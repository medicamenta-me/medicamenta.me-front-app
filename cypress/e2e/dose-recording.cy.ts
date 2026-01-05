/// <reference types="cypress" />

/**
 * E2E Tests for Dose Recording and Adherence Tracking
 * 
 * Tests cover:
 * - Recording doses taken
 * - Recording doses skipped
 * - Viewing dose history
 * - Adherence percentage calculation
 * - Streak tracking
 */

describe('Dose Recording and Adherence', () => {
  const testMedication = {
    name: 'Atenolol Test',
    dosage: '50mg',
    frequency: 'daily',
    time: '08:00',
  };

  beforeEach(() => {
    cy.login(
      Cypress.env('testUserEmail'),
      Cypress.env('testUserPassword')
    );
    
    // Add a medication for testing
    cy.addMedication(testMedication);
  });

  afterEach(() => {
    cy.logout();
  });

  describe('Record Dose Taken', () => {
    it('should display pending doses on home screen', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=pending-doses]').should('be.visible');
      cy.get('[data-cy=dose-card]').should('have.length.at.least', 1);
    });

    it('should show medication details on dose card', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=medication-name]').should('contain', testMedication.name);
        cy.get('[data-cy=medication-dosage]').should('contain', testMedication.dosage);
        cy.get('[data-cy=scheduled-time]').should('be.visible');
      });
    });

    it('should record dose as taken successfully', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      cy.waitForIonic();
      
      // Verify success feedback
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'Dose registrada');
      
      // Verify dose is marked as taken
      cy.get('[data-cy=dose-card]').first().should('have.class', 'dose-taken');
    });

    it('should show confirmation animation when dose is taken', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      // Check for animation element
      cy.get('[data-cy=success-animation]', { timeout: 5000 })
        .should('be.visible');
    });

    it('should update adherence percentage after taking dose', () => {
      cy.navigateToTab('home');
      
      // Get initial adherence
      cy.get('[data-cy=adherence-percentage]').invoke('text').then((initialAdherence) => {
        // Take a dose
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        cy.waitForIonic();
        
        // Verify adherence increased
        cy.get('[data-cy=adherence-percentage]').invoke('text').should((newAdherence) => {
          expect(parseFloat(newAdherence)).to.be.gte(parseFloat(initialAdherence));
        });
      });
    });

    it('should increment streak when dose is taken on time', () => {
      cy.navigateToTab('home');
      
      // Get current streak
      cy.get('[data-cy=current-streak]').invoke('text').then((currentStreak) => {
        const streakNumber = parseInt(currentStreak);
        
        // Take dose on time
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        cy.waitForIonic();
        
        // Verify streak increased
        cy.get('[data-cy=current-streak]').invoke('text').should((newStreak) => {
          expect(parseInt(newStreak)).to.equal(streakNumber + 1);
        });
      });
    });
  });

  describe('Record Dose Skipped', () => {
    it('should show skip dose option', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=dose-options-btn]').click();
      });
      
      cy.get('[data-cy=skip-dose-option]').should('be.visible');
    });

    it('should ask for skip reason', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=dose-options-btn]').click();
      });
      
      cy.get('[data-cy=skip-dose-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=skip-reason-dialog]').should('be.visible');
      cy.get('[data-cy=skip-reason-select]').should('be.visible');
    });

    it('should record dose as skipped with reason', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=dose-options-btn]').click();
      });
      
      cy.get('[data-cy=skip-dose-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=skip-reason-select]').select('Esqueci');
      cy.get('[data-cy=confirm-skip]').click();
      cy.waitForIonic();
      
      // Verify feedback
      cy.get('[data-cy=info-toast]')
        .should('be.visible')
        .and('contain', 'Dose marcada como não tomada');
      
      // Verify dose is marked as skipped
      cy.get('[data-cy=dose-card]').first().should('have.class', 'dose-skipped');
    });

    it('should allow adding notes when skipping', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=dose-options-btn]').click();
      });
      
      cy.get('[data-cy=skip-dose-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=skip-reason-select]').select('Efeito colateral');
      cy.get('[data-cy=skip-notes]').type('Náusea intensa');
      cy.get('[data-cy=confirm-skip]').click();
      cy.waitForIonic();
      
      // Verify notes are saved (check in history)
      cy.navigateToTab('history');
      cy.get('[data-cy=dose-entry]').first().click();
      cy.get('[data-cy=dose-notes]').should('contain', 'Náusea intensa');
    });

    it('should break streak when dose is skipped', () => {
      cy.navigateToTab('home');
      
      // Get current streak
      cy.get('[data-cy=current-streak]').invoke('text').then((currentStreak) => {
        // Skip dose
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=dose-options-btn]').click();
        });
        
        cy.get('[data-cy=skip-dose-option]').click();
        cy.get('[data-cy=skip-reason-select]').select('Esqueci');
        cy.get('[data-cy=confirm-skip]').click();
        cy.waitForIonic();
        
        // Verify streak is reset
        cy.get('[data-cy=current-streak]').should('contain', '0');
      });
    });
  });

  describe('Dose History', () => {
    beforeEach(() => {
      // Record a few doses first
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      cy.waitForIonic();
    });

    it('should display dose history tab', () => {
      cy.navigateToTab('history');
      cy.get('[data-cy=dose-history]').should('be.visible');
    });

    it('should show list of recorded doses', () => {
      cy.navigateToTab('history');
      cy.get('[data-cy=dose-entry]').should('have.length.at.least', 1);
    });

    it('should display dose details in history', () => {
      cy.navigateToTab('history');
      cy.get('[data-cy=dose-entry]').first().within(() => {
        cy.get('[data-cy=medication-name]').should('contain', testMedication.name);
        cy.get('[data-cy=dose-time]').should('be.visible');
        cy.get('[data-cy=dose-status]').should('be.visible');
      });
    });

    it('should filter history by date', () => {
      cy.navigateToTab('history');
      
      cy.get('[data-cy=date-filter]').click();
      cy.get('[data-cy=date-picker]').should('be.visible');
      
      // Select today
      cy.get('[data-cy=today-btn]').click();
      cy.waitForIonic();
      
      // Verify entries are from today
      cy.get('[data-cy=dose-entry]').each(($entry) => {
        cy.wrap($entry).find('[data-cy=dose-date]').should('contain', 'Hoje');
      });
    });

    it('should filter history by medication', () => {
      cy.navigateToTab('history');
      
      cy.get('[data-cy=medication-filter]').select(testMedication.name);
      cy.waitForIonic();
      
      // Verify only selected medication appears
      cy.get('[data-cy=dose-entry]').each(($entry) => {
        cy.wrap($entry)
          .find('[data-cy=medication-name]')
          .should('contain', testMedication.name);
      });
    });

    it('should show detailed view when entry is clicked', () => {
      cy.navigateToTab('history');
      cy.get('[data-cy=dose-entry]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=dose-detail-modal]').should('be.visible');
      cy.get('[data-cy=detail-medication]').should('contain', testMedication.name);
      cy.get('[data-cy=detail-time]').should('be.visible');
      cy.get('[data-cy=detail-status]').should('be.visible');
    });
  });

  describe('Adherence Statistics', () => {
    it('should display adherence percentage', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=adherence-card]').should('be.visible');
      cy.get('[data-cy=adherence-percentage]')
        .should('be.visible')
        .invoke('text')
        .should('match', /\d+%/);
    });

    it('should display weekly adherence chart', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=weekly-chart]').should('be.visible');
    });

    it('should display monthly adherence chart', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=period-selector]').select('Mensal');
      cy.waitForIonic();
      
      cy.get('[data-cy=monthly-chart]').should('be.visible');
    });

    it('should show adherence by medication', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=by-medication-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-adherence-card]').should('have.length.at.least', 1);
      cy.get('[data-cy=medication-adherence-card]').first().within(() => {
        cy.get('[data-cy=medication-name]').should('be.visible');
        cy.get('[data-cy=medication-percentage]').should('match', /\d+%/);
      });
    });

    it('should display current streak', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=streak-card]').should('be.visible');
      cy.get('[data-cy=current-streak]')
        .should('be.visible')
        .invoke('text')
        .should('match', /\d+ dias?/);
    });

    it('should display best streak', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=streak-card]').within(() => {
        cy.get('[data-cy=best-streak]')
          .should('be.visible')
          .invoke('text')
          .should('match', /\d+ dias?/);
      });
    });
  });

  describe('Reminders and Notifications', () => {
    it('should show upcoming dose reminders', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=upcoming-doses]').should('be.visible');
      cy.get('[data-cy=upcoming-dose-item]').should('have.length.at.least', 1);
    });

    it('should display time until next dose', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=next-dose-timer]')
        .should('be.visible')
        .invoke('text')
        .should('match', /\d+h?\s*\d+m?/);
    });

    it('should allow snoozing a reminder', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=dose-options-btn]').click();
      });
      
      cy.get('[data-cy=snooze-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=snooze-dialog]').should('be.visible');
      cy.get('[data-cy=snooze-15min]').click();
      
      cy.get('[data-cy=info-toast]')
        .should('be.visible')
        .and('contain', 'Lembrete adiado');
    });
  });

  describe('Error Handling', () => {
    it('should handle offline mode gracefully', () => {
      // Simulate offline
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      cy.get('[data-cy=info-toast]')
        .should('be.visible')
        .and('contain', 'Salvo localmente');
    });

    it('should sync doses when back online', () => {
      // Simulate offline -> online
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      // Go back online
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });
      
      cy.get('[data-cy=sync-indicator]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'Sincronizando');
      
      cy.get('[data-cy=success-toast]', { timeout: 15000 })
        .should('be.visible')
        .and('contain', 'Sincronizado');
    });
  });
});
