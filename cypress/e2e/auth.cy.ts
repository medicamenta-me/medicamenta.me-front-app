/// <reference types="cypress" />

/**
 * E2E Tests for Authentication (AuthService)
 * 
 * Tests cover:
 * - User signup flow (new user registration)
 * - User login flow (existing user)
 * - Invalid credentials handling
 * - Logout flow
 * - Session persistence (page reload)
 * - Password reset flow
 * - OAuth providers (Google) - if available
 * 
 * Note: AuthService is tested via E2E instead of unit tests due to
 * Firebase Auth tight coupling. E2E testing provides better coverage
 * of real authentication flows and user experience.
 * 
 * @see AUTH-SERVICE-TESTING-NOTE.md for rationale
 */

describe('Authentication Flows', () => {
  const testUser = {
    email: Cypress.env('testUserEmail'),
    password: Cypress.env('testUserPassword'),
    name: 'Test User',
    role: 'patient' as const,
  };

  const newUser = {
    email: `test-${Date.now()}@medicamenta.me`,
    password: 'NewUser123!@#',
    name: 'New Test User',
    role: 'patient' as const,
  };

  beforeEach(() => {
    // Clear all application data before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Visit home page (should redirect to login if not authenticated)
    cy.visit('/');
    cy.waitForIonic();
  });

  describe('Signup Flow', () => {
    it('should display signup page elements', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      // Verify all form elements are visible
      cy.get('[data-cy=signup-name-input]').should('be.visible');
      cy.get('[data-cy=signup-email-input]').should('be.visible');
      cy.get('[data-cy=signup-password-input]').should('be.visible');
      cy.get('[data-cy=signup-role-select]').should('be.visible');
      cy.get('[data-cy=signup-button]').should('be.visible');

      // Verify link to login
      cy.get('[data-cy=go-to-login-link]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      // Try to submit without filling fields
      cy.get('[data-cy=signup-button]').click();

      // Verify validation errors
      cy.get('[data-cy=signup-name-error]').should('be.visible').and('contain', 'Nome é obrigatório');
      cy.get('[data-cy=signup-email-error]').should('be.visible').and('contain', 'Email é obrigatório');
      cy.get('[data-cy=signup-password-error]').should('be.visible').and('contain', 'Senha é obrigatória');
    });

    it('should validate email format', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      cy.get('[data-cy=signup-email-input]').type('invalid-email');
      cy.get('[data-cy=signup-password-input]').click(); // Trigger validation

      cy.get('[data-cy=signup-email-error]').should('be.visible').and('contain', 'Email inválido');
    });

    it('should validate password strength', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      // Test weak password
      cy.get('[data-cy=signup-password-input]').type('123');
      cy.get('[data-cy=signup-name-input]').click(); // Trigger validation

      cy.get('[data-cy=signup-password-error]').should('be.visible').and('contain', 'mínimo 8 caracteres');
    });

    it('should create new user account successfully', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      // Fill signup form
      cy.get('[data-cy=signup-name-input]').type(newUser.name);
      cy.get('[data-cy=signup-email-input]').type(newUser.email);
      cy.get('[data-cy=signup-password-input]').type(newUser.password);
      cy.get('[data-cy=signup-role-select]').select(newUser.role);

      // Accept terms
      cy.get('[data-cy=signup-terms-checkbox]').check();

      // Submit form
      cy.get('[data-cy=signup-button]').click();

      // Wait for Firebase Auth to complete
      cy.waitForIonic();

      // Verify redirect to dashboard/tabs
      cy.url({ timeout: 15000 }).should('include', '/tabs');

      // Verify user is authenticated (check header or profile)
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();
      cy.get('[data-cy=profile-name]').should('contain', newUser.name);

      // Cleanup: delete test user
      cy.get('[data-cy=logout-button]').click();
    });

    it('should show error for duplicate email', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      // Try to signup with existing email
      cy.get('[data-cy=signup-name-input]').type(testUser.name);
      cy.get('[data-cy=signup-email-input]').type(testUser.email);
      cy.get('[data-cy=signup-password-input]').type(testUser.password);
      cy.get('[data-cy=signup-role-select]').select(testUser.role);
      cy.get('[data-cy=signup-terms-checkbox]').check();

      cy.get('[data-cy=signup-button]').click();
      cy.waitForIonic();

      // Verify error toast or message
      cy.getToast('error').should('be.visible').and('contain', 'Email já está em uso');
    });

    it('should navigate to login page from signup', () => {
      cy.visit('/signup');
      cy.waitForIonic();

      cy.get('[data-cy=go-to-login-link]').click();
      cy.waitForIonic();

      cy.url().should('include', '/login');
    });
  });

  describe('Login Flow', () => {
    it('should display login page elements', () => {
      cy.visit('/login');
      cy.waitForIonic();

      // Verify all form elements are visible
      cy.get('[data-cy=email-input]').should('be.visible');
      cy.get('[data-cy=password-input]').should('be.visible');
      cy.get('[data-cy=login-button]').should('be.visible');

      // Verify links
      cy.get('[data-cy=forgot-password-link]').should('be.visible');
      cy.get('[data-cy=go-to-signup-link]').should('be.visible');
    });

    it('should login existing user successfully', () => {
      cy.visit('/login');
      cy.waitForIonic();

      // Fill login form
      cy.get('[data-cy=email-input]').type(testUser.email);
      cy.get('[data-cy=password-input]').type(testUser.password);

      // Submit
      cy.get('[data-cy=login-button]').click();
      cy.waitForIonic();

      // Verify redirect to dashboard
      cy.url({ timeout: 15000 }).should('include', '/tabs');

      // Verify user data loaded
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();
      cy.get('[data-cy=profile-email]').should('contain', testUser.email);
    });

    it('should handle invalid email', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=email-input]').type('nonexistent@test.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();
      cy.waitForIonic();

      // Verify error message
      cy.getToast('error').should('be.visible').and('contain', 'Credenciais inválidas');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should handle wrong password', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=email-input]').type(testUser.email);
      cy.get('[data-cy=password-input]').type('WrongPassword123!');
      cy.get('[data-cy=login-button]').click();
      cy.waitForIonic();

      // Verify error message
      cy.getToast('error').should('be.visible').and('contain', 'Senha incorreta');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should validate required fields', () => {
      cy.visit('/login');
      cy.waitForIonic();

      // Try to submit without filling fields
      cy.get('[data-cy=login-button]').click();

      // Verify validation errors
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('be.visible');
    });

    it('should show/hide password when toggle clicked', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password');

      // Click toggle
      cy.get('[data-cy=password-toggle]').click();
      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'text');

      // Click again to hide
      cy.get('[data-cy=password-toggle]').click();
      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password');
    });

    it('should navigate to signup page from login', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=go-to-signup-link]').click();
      cy.waitForIonic();

      cy.url().should('include', '/signup');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Login before testing logout
      cy.login(testUser.email, testUser.password);
    });

    it('should display logout button in profile', () => {
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();

      cy.get('[data-cy=logout-button]').should('be.visible');
    });

    it('should show confirmation dialog when logout clicked', () => {
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();

      cy.get('[data-cy=logout-button]').click();
      cy.waitForIonic();

      // Verify alert is displayed
      cy.get('.confirm-logout-dialog').should('be.visible');
      cy.get('.confirm-logout-dialog').should('contain', 'Tem certeza que deseja sair?');
    });

    it('should cancel logout when cancel button clicked', () => {
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();

      cy.get('[data-cy=logout-button]').click();
      cy.waitForIonic();

      // Click cancel
      cy.get('.confirm-logout-dialog .cancel-logout-btn').click();
      cy.waitForIonic();

      // Should stay on profile page
      cy.url().should('include', '/tabs');
      cy.get('[data-cy=profile-email]').should('be.visible');
    });

    it('should logout user when confirmed', () => {
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();

      cy.get('[data-cy=logout-button]').click();
      cy.waitForIonic();

      // Click confirm
      cy.get('.confirm-logout-dialog .confirm-logout-btn').click();
      cy.waitForIonic();

      // Verify redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');

      // Verify session cleared (try to access protected route)
      cy.visit('/tabs/medications');
      cy.waitForIonic();
      cy.url().should('include', '/login'); // Should be redirected
    });

    it('should clear user data on logout', () => {
      // Get user data before logout
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();
      const userEmail = testUser.email;

      // Logout
      cy.get('[data-cy=logout-button]').click();
      cy.waitForIonic();
      cy.get('.confirm-logout-dialog .confirm-logout-btn').click();
      cy.waitForIonic();

      // Verify localStorage cleared
      cy.window().then((win) => {
        const userData = win.localStorage.getItem('user');
        expect(userData).to.be.null;
      });

      // Verify can't access protected routes
      cy.visit('/tabs/profile');
      cy.waitForIonic();
      cy.url().should('include', '/login');
    });
  });

  describe('Session Persistence', () => {
    it('should persist session after page reload', () => {
      // Login
      cy.login(testUser.email, testUser.password);

      // Verify logged in
      cy.url().should('include', '/tabs');

      // Reload page
      cy.reload();
      cy.waitForIonic();

      // Should still be logged in
      cy.url().should('include', '/tabs');
      cy.get('[data-cy=profile-tab]').click();
      cy.waitForIonic();
      cy.get('[data-cy=profile-email]').should('contain', testUser.email);
    });

    it('should persist session after closing and reopening', () => {
      // Login
      cy.login(testUser.email, testUser.password);

      // Get auth token from localStorage
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        expect(token).to.exist;

        // Simulate app close and reopen
        cy.clearCookies();
        cy.visit('/');
        cy.waitForIonic();

        // Should still be logged in (token still valid)
        cy.url({ timeout: 10000 }).should('include', '/tabs');
      });
    });

    it('should redirect to login if session expired', () => {
      // Login
      cy.login(testUser.email, testUser.password);

      // Manually expire token (clear localStorage)
      cy.window().then((win) => {
        win.localStorage.removeItem('authToken');
      });

      // Try to access protected route
      cy.visit('/tabs/medications');
      cy.waitForIonic();

      // Should redirect to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });
  });

  describe('Password Reset Flow', () => {
    it('should display forgot password page', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=forgot-password-link]').click();
      cy.waitForIonic();

      cy.url().should('include', '/forgot-password');
      cy.get('[data-cy=reset-email-input]').should('be.visible');
      cy.get('[data-cy=send-reset-link-button]').should('be.visible');
    });

    it('should validate email before sending reset link', () => {
      cy.visit('/forgot-password');
      cy.waitForIonic();

      // Try to submit without email
      cy.get('[data-cy=send-reset-link-button]').click();

      cy.get('[data-cy=reset-email-error]').should('be.visible');
    });

    it('should send password reset email successfully', () => {
      cy.visit('/forgot-password');
      cy.waitForIonic();

      cy.get('[data-cy=reset-email-input]').type(testUser.email);
      cy.get('[data-cy=send-reset-link-button]').click();
      cy.waitForIonic();

      // Verify success message
      cy.getToast('success').should('be.visible').and('contain', 'Email de recuperação enviado');

      // Verify redirect back to login
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should handle non-existent email gracefully', () => {
      cy.visit('/forgot-password');
      cy.waitForIonic();

      cy.get('[data-cy=reset-email-input]').type('nonexistent@test.com');
      cy.get('[data-cy=send-reset-link-button]').click();
      cy.waitForIonic();

      // Firebase doesn't reveal if email exists (security)
      // Should show success message anyway
      cy.getToast('success').should('be.visible').and('contain', 'Email de recuperação enviado');
    });
  });

  describe('OAuth Providers', () => {
    // Note: These tests require proper OAuth setup in Firebase Console
    // and may need to be skipped in CI/CD environments

    it('should display Google Sign-In button', () => {
      cy.visit('/login');
      cy.waitForIonic();

      cy.get('[data-cy=google-signin-button]').should('be.visible');
    });

    it('should initiate Google Sign-In flow when button clicked', () => {
      cy.visit('/login');
      cy.waitForIonic();

      // Stub the OAuth popup to avoid actual Google redirect
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      cy.get('[data-cy=google-signin-button]').click();

      // Verify popup was attempted
      cy.get('@windowOpen').should('have.been.calledOnce');
    });

    // For full OAuth testing, use Firebase Emulator Suite
    // or mock OAuth responses in Cypress intercepts
  });

  describe('Auth Guards', () => {
    it('should redirect to login if accessing protected route while not authenticated', () => {
      cy.visit('/tabs/medications');
      cy.waitForIonic();

      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('should allow access to protected routes when authenticated', () => {
      cy.login(testUser.email, testUser.password);

      cy.visit('/tabs/medications');
      cy.waitForIonic();

      cy.url().should('include', '/tabs/medications');
      cy.get('[data-cy=add-medication-btn]').should('be.visible');
    });

    it('should redirect to tabs if accessing login while authenticated', () => {
      cy.login(testUser.email, testUser.password);

      // Try to access login page
      cy.visit('/login');
      cy.waitForIonic();

      // Should redirect to tabs
      cy.url({ timeout: 10000 }).should('include', '/tabs');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate offline mode
      cy.visit('/login', {
        onBeforeLoad: (win) => {
          cy.stub(win.navigator, 'onLine').value(false);
        },
      });
      cy.waitForIonic();

      cy.get('[data-cy=email-input]').type(testUser.email);
      cy.get('[data-cy=password-input]').type(testUser.password);
      cy.get('[data-cy=login-button]').click();
      cy.waitForIonic();

      // Verify offline error message
      cy.getToast('error').should('be.visible').and('contain', 'Sem conexão com a internet');
    });

    it('should handle Firebase Auth errors with user-friendly messages', () => {
      cy.visit('/login');
      cy.waitForIonic();

      // Test various error scenarios
      const errorScenarios = [
        { email: 'invalid-email', password: '123', expectedError: 'Email inválido' },
        { email: 'test@test.com', password: '123', expectedError: 'Senha muito curta' },
      ];

      errorScenarios.forEach((scenario) => {
        cy.get('[data-cy=email-input]').clear().type(scenario.email);
        cy.get('[data-cy=password-input]').clear().type(scenario.password);
        cy.get('[data-cy=login-button]').click();
        cy.waitForIonic();

        cy.getToast('error').should('be.visible').and('contain', scenario.expectedError);
      });
    });
  });
});
