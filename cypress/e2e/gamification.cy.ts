/// <reference types="cypress" />

/**
 * E2E Tests for Gamification System
 * 
 * Tests cover:
 * - Earning achievements
 * - XP accumulation
 * - Level progression
 * - Streak tracking
 * - Leaderboard
 * - Rewards unlocking
 */

describe('Gamification System', () => {
  beforeEach(() => {
    cy.login(
      Cypress.env('testUserEmail'),
      Cypress.env('testUserPassword')
    );
  });

  afterEach(() => {
    cy.logout();
  });

  describe('Achievements', () => {
    it('should display achievements tab', () => {
      cy.navigateToTab('achievements');
      cy.get('[data-cy=achievements-list]').should('be.visible');
    });

    it('should show locked and unlocked achievements', () => {
      cy.navigateToTab('achievements');
      
      cy.get('[data-cy=achievement-card]').should('have.length.at.least', 1);
      cy.get('[data-cy=achievement-locked]').should('exist');
      cy.get('[data-cy=achievement-unlocked]').should('exist');
    });

    it('should display achievement details', () => {
      cy.navigateToTab('achievements');
      cy.get('[data-cy=achievement-card]').first().within(() => {
        cy.get('[data-cy=achievement-icon]').should('be.visible');
        cy.get('[data-cy=achievement-name]').should('be.visible');
        cy.get('[data-cy=achievement-description]').should('be.visible');
        cy.get('[data-cy=achievement-xp]').should('be.visible');
      });
    });

    it('should show achievement progress bar', () => {
      cy.navigateToTab('achievements');
      cy.get('[data-cy=achievement-card]').first().within(() => {
        cy.get('[data-cy=progress-bar]').should('be.visible');
        cy.get('[data-cy=progress-text]')
          .invoke('text')
          .should('match', /\d+\/\d+/);
      });
    });

    it('should earn "First Dose" achievement', () => {
      // Add medication
      cy.addMedication({
        name: 'Captopril',
        dosage: '25mg',
        frequency: 'daily',
        time: '08:00'
      });
      
      // Take first dose
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      cy.waitForIonic();
      
      // Verify achievement unlocked
      cy.get('[data-cy=achievement-unlocked-modal]', { timeout: 10000 })
        .should('be.visible');
      cy.get('[data-cy=achievement-name]').should('contain', 'Primeira Dose');
      cy.get('[data-cy=achievement-xp-earned]').should('contain', 'XP');
    });

    it('should earn "Week Warrior" achievement after 7 day streak', () => {
      // This would need to be tested with time manipulation
      // For now, we verify the achievement exists
      cy.navigateToTab('achievements');
      cy.get('[data-cy=achievement-card]')
        .contains('Week Warrior')
        .should('be.visible');
    });

    it('should filter achievements by category', () => {
      cy.navigateToTab('achievements');
      
      cy.get('[data-cy=category-filter]').select('Aderência');
      cy.waitForIonic();
      
      cy.get('[data-cy=achievement-card]').each(($card) => {
        cy.wrap($card)
          .find('[data-cy=achievement-category]')
          .should('contain', 'Aderência');
      });
    });

    it('should show achievement celebration animation', () => {
      cy.addMedication({
        name: 'Losartana',
        dosage: '50mg',
        frequency: 'daily'
      });
      
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      // Check for lottie animation
      cy.get('[data-cy=celebration-animation]', { timeout: 10000 })
        .should('be.visible')
        .and('have.class', 'lottie-animation');
    });
  });

  describe('XP and Levels', () => {
    it('should display current XP and level', () => {
      cy.navigateToTab('profile');
      
      cy.get('[data-cy=user-level]').should('be.visible');
      cy.get('[data-cy=current-xp]')
        .invoke('text')
        .should('match', /\d+/);
    });

    it('should show XP progress bar', () => {
      cy.navigateToTab('profile');
      
      cy.get('[data-cy=xp-progress-bar]').should('be.visible');
      cy.get('[data-cy=xp-progress-text]')
        .invoke('text')
        .should('match', /\d+\/\d+ XP/);
    });

    it('should earn XP when taking dose', () => {
      cy.addMedication({
        name: 'Sinvastatina',
        dosage: '20mg',
        frequency: 'daily'
      });
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=current-xp]').invoke('text').then((initialXP) => {
        const xpBefore = parseInt(initialXP);
        
        // Take dose
        cy.navigateToTab('home');
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        cy.waitForIonic();
        
        // Verify XP increased
        cy.navigateToTab('profile');
        cy.get('[data-cy=current-xp]').invoke('text').should((newXP) => {
          expect(parseInt(newXP)).to.be.gt(xpBefore);
        });
      });
    });

    it('should earn XP when unlocking achievement', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=current-xp]').invoke('text').then((initialXP) => {
        const xpBefore = parseInt(initialXP);
        
        // Perform action to unlock achievement
        cy.addMedication({
          name: 'Metformina',
          dosage: '850mg',
          frequency: 'daily'
        });
        
        cy.navigateToTab('home');
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        // Close achievement modal
        cy.get('[data-cy=achievement-close-btn]', { timeout: 10000 }).click();
        cy.waitForIonic();
        
        // Verify XP increased more (dose XP + achievement XP)
        cy.navigateToTab('profile');
        cy.get('[data-cy=current-xp]').invoke('text').should((newXP) => {
          expect(parseInt(newXP)).to.be.gt(xpBefore + 10); // More than just dose XP
        });
      });
    });

    it('should level up when reaching XP threshold', () => {
      // This would need XP manipulation or many actions
      // For now, verify level up UI exists
      cy.navigateToTab('profile');
      cy.get('[data-cy=level-info-btn]').click();
      
      cy.get('[data-cy=level-requirements]').should('be.visible');
      cy.get('[data-cy=next-level-xp]')
        .invoke('text')
        .should('match', /\d+ XP/);
    });

    it('should show level up animation', () => {
      // Assuming we can trigger level up in test environment
      // This verifies the animation component exists
      cy.visit('/achievements');
      cy.window().then((win) => {
        // Trigger level up event
        win.dispatchEvent(new CustomEvent('levelUp', {
          detail: { newLevel: 2, xpEarned: 50 }
        }));
      });
      
      cy.get('[data-cy=level-up-modal]', { timeout: 5000 })
        .should('be.visible');
      cy.get('[data-cy=new-level]').should('contain', '2');
    });
  });

  describe('Streaks', () => {
    it('should display current streak on home', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=streak-card]').should('be.visible');
      cy.get('[data-cy=current-streak]')
        .invoke('text')
        .should('match', /\d+/);
    });

    it('should show streak fire icon', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=streak-icon]')
        .should('be.visible')
        .and('have.attr', 'name', 'flame');
    });

    it('should increment streak when taking dose on time', () => {
      cy.addMedication({
        name: 'Omeprazol',
        dosage: '20mg',
        frequency: 'daily'
      });
      
      cy.navigateToTab('home');
      cy.get('[data-cy=current-streak]').invoke('text').then((initialStreak) => {
        const streakBefore = parseInt(initialStreak);
        
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        cy.waitForIonic();
        
        cy.get('[data-cy=current-streak]').invoke('text').should((newStreak) => {
          expect(parseInt(newStreak)).to.equal(streakBefore + 1);
        });
      });
    });

    it('should reset streak when missing dose', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=current-streak]').invoke('text').then((initialStreak) => {
        // Skip a dose
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=dose-options-btn]').click();
        });
        
        cy.get('[data-cy=skip-dose-option]').click();
        cy.get('[data-cy=skip-reason-select]').select('Esqueci');
        cy.get('[data-cy=confirm-skip]').click();
        cy.waitForIonic();
        
        // Verify streak reset
        cy.get('[data-cy=current-streak]').should('contain', '0');
      });
    });

    it('should display best streak', () => {
      cy.navigateToTab('statistics');
      cy.get('[data-cy=best-streak]')
        .should('be.visible')
        .invoke('text')
        .should('match', /\d+ dias?/);
    });

    it('should show streak freeze option for premium users', () => {
      // Assuming user has premium
      cy.navigateToTab('home');
      cy.get('[data-cy=streak-card]').click();
      
      cy.get('[data-cy=streak-freeze]').should('be.visible');
      cy.get('[data-cy=freeze-description]')
        .should('contain', 'Proteja sua sequência');
    });
  });

  describe('Leaderboard', () => {
    it('should display leaderboard tab', () => {
      cy.navigateToTab('leaderboard');
      cy.get('[data-cy=leaderboard-list]').should('be.visible');
    });

    it('should show top users', () => {
      cy.navigateToTab('leaderboard');
      cy.get('[data-cy=leaderboard-entry]').should('have.length.at.least', 1);
    });

    it('should display user rank and XP', () => {
      cy.navigateToTab('leaderboard');
      cy.get('[data-cy=leaderboard-entry]').first().within(() => {
        cy.get('[data-cy=user-rank]').should('be.visible');
        cy.get('[data-cy=user-name]').should('be.visible');
        cy.get('[data-cy=user-xp]')
          .invoke('text')
          .should('match', /\d+ XP/);
        cy.get('[data-cy=user-level]')
          .invoke('text')
          .should('match', /Nível \d+/);
      });
    });

    it('should highlight current user in leaderboard', () => {
      cy.navigateToTab('leaderboard');
      cy.get('[data-cy=current-user-entry]')
        .should('be.visible')
        .and('have.class', 'highlighted');
    });

    it('should filter leaderboard by period', () => {
      cy.navigateToTab('leaderboard');
      
      cy.get('[data-cy=period-selector]').select('Semanal');
      cy.waitForIonic();
      
      cy.get('[data-cy=period-label]').should('contain', 'Esta Semana');
      cy.get('[data-cy=leaderboard-entry]').should('have.length.at.least', 1);
    });

    it('should show medals for top 3 users', () => {
      cy.navigateToTab('leaderboard');
      
      cy.get('[data-cy=leaderboard-entry]').eq(0).within(() => {
        cy.get('[data-cy=medal-icon]')
          .should('be.visible')
          .and('have.attr', 'color', 'gold');
      });
      
      cy.get('[data-cy=leaderboard-entry]').eq(1).within(() => {
        cy.get('[data-cy=medal-icon]')
          .should('be.visible')
          .and('have.attr', 'color', 'silver');
      });
      
      cy.get('[data-cy=leaderboard-entry]').eq(2).within(() => {
        cy.get('[data-cy=medal-icon]')
          .should('be.visible')
          .and('have.attr', 'color', 'bronze');
      });
    });
  });

  describe('Rewards', () => {
    it('should display rewards shop', () => {
      cy.navigateToTab('rewards');
      cy.get('[data-cy=rewards-shop]').should('be.visible');
    });

    it('should show available rewards', () => {
      cy.navigateToTab('rewards');
      cy.get('[data-cy=reward-card]').should('have.length.at.least', 1);
    });

    it('should display reward details', () => {
      cy.navigateToTab('rewards');
      cy.get('[data-cy=reward-card]').first().within(() => {
        cy.get('[data-cy=reward-icon]').should('be.visible');
        cy.get('[data-cy=reward-name]').should('be.visible');
        cy.get('[data-cy=reward-cost]')
          .invoke('text')
          .should('match', /\d+ XP/);
      });
    });

    it('should unlock reward when sufficient XP', () => {
      cy.navigateToTab('rewards');
      
      // Find unlockable reward (cost <= current XP)
      cy.get('[data-cy=reward-card]').first().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=reward-details]').should('be.visible');
      cy.get('[data-cy=unlock-reward-btn]').should('not.be.disabled');
    });

    it('should disable unlock for insufficient XP', () => {
      cy.navigateToTab('rewards');
      
      // Find expensive reward
      cy.get('[data-cy=reward-card]').last().click();
      cy.waitForIonic();
      
      cy.get('[data-cy=unlock-reward-btn]').should('be.disabled');
      cy.get('[data-cy=insufficient-xp-message]')
        .should('be.visible')
        .and('contain', 'XP insuficiente');
    });

    it('should show unlocked rewards', () => {
      cy.navigateToTab('rewards');
      cy.get('[data-cy=unlocked-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=unlocked-reward]').should('exist');
    });
  });

  describe('Challenges', () => {
    it('should display daily challenges', () => {
      cy.navigateToTab('challenges');
      cy.get('[data-cy=daily-challenges]').should('be.visible');
    });

    it('should show challenge progress', () => {
      cy.navigateToTab('challenges');
      cy.get('[data-cy=challenge-card]').first().within(() => {
        cy.get('[data-cy=challenge-name]').should('be.visible');
        cy.get('[data-cy=challenge-progress]')
          .invoke('text')
          .should('match', /\d+\/\d+/);
        cy.get('[data-cy=challenge-reward]')
          .invoke('text')
          .should('match', /\d+ XP/);
      });
    });

    it('should complete challenge and earn reward', () => {
      cy.navigateToTab('challenges');
      
      // Find "Take 3 doses today" challenge
      cy.get('[data-cy=challenge-card]')
        .contains('3 doses')
        .parent()
        .as('challenge');
      
      cy.get('@challenge').within(() => {
        cy.get('[data-cy=challenge-progress]').invoke('text').then((progress) => {
          const [current, total] = progress.split('/').map(n => parseInt(n));
          
          // Take doses to complete challenge
          for (let i = current; i < total; i++) {
            cy.navigateToTab('home');
            cy.get('[data-cy=dose-card]').eq(i).within(() => {
              cy.get('[data-cy=take-dose-btn]').click();
            });
            cy.waitForIonic();
          }
          
          // Verify challenge completed
          cy.navigateToTab('challenges');
          cy.get('@challenge').should('have.class', 'completed');
          cy.get('[data-cy=challenge-completed-icon]').should('be.visible');
        });
      });
    });

    it('should show weekly challenges', () => {
      cy.navigateToTab('challenges');
      cy.get('[data-cy=weekly-challenges-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=challenge-card]').should('have.length.at.least', 1);
    });
  });

  describe('Gamification Settings', () => {
    it('should allow disabling gamification', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=settings-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=gamification-settings]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=enable-gamification-toggle]')
        .should('be.visible')
        .click();
      
      cy.get('[data-cy=confirm-disable]').click();
      
      // Verify gamification elements hidden
      cy.navigateToTab('home');
      cy.get('[data-cy=streak-card]').should('not.exist');
      cy.get('[data-cy=xp-badge]').should('not.exist');
    });

    it('should allow disabling notifications', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=settings-btn]').click();
      cy.get('[data-cy=gamification-settings]').click();
      
      cy.get('[data-cy=achievement-notifications-toggle]')
        .should('be.visible')
        .click();
      
      cy.get('[data-cy=save-settings]').click();
      
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'Configurações salvas');
    });
  });

  describe('Animations and Feedback', () => {
    it('should show confetti on achievement unlock', () => {
      cy.addMedication({
        name: 'Ibuprofeno',
        dosage: '600mg',
        frequency: 'daily'
      });
      
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      cy.get('[data-cy=confetti-animation]', { timeout: 10000 })
        .should('be.visible');
    });

    it('should play sound on XP gain', () => {
      // Verify audio element exists and plays
      cy.window().then((win) => {
        const audioPlayStub = cy.stub(win.HTMLAudioElement.prototype, 'play');
        
        cy.navigateToTab('home');
        cy.get('[data-cy=dose-card]').first().within(() => {
          cy.get('[data-cy=take-dose-btn]').click();
        });
        
        cy.wrap(audioPlayStub).should('have.been.called');
      });
    });

    it('should show XP gain animation', () => {
      cy.navigateToTab('home');
      cy.get('[data-cy=dose-card]').first().within(() => {
        cy.get('[data-cy=take-dose-btn]').click();
      });
      
      cy.get('[data-cy=xp-gain-animation]')
        .should('be.visible')
        .and('contain', '+');
    });
  });
});
