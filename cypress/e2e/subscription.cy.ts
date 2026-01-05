/// <reference types="cypress" />

/**
 * E2E Tests for Subscription Management (Payment System)
 * 
 * Tests cover:
 * - Viewing subscription plans
 * - Upgrading to premium (Stripe)
 * - Upgrading to premium (PagSeguro PIX/Boleto)
 * - Canceling subscription
 * - Reactivating subscription
 * - Payment history
 */

describe('Subscription Management', () => {
  beforeEach(() => {
    cy.login(
      Cypress.env('testUserEmail'),
      Cypress.env('testUserPassword')
    );
  });

  afterEach(() => {
    cy.logout();
  });

  describe('View Plans and Pricing', () => {
    it('should display subscription tab in profile', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=subscription-tab]').should('be.visible');
    });

    it('should show current plan', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=current-plan]').should('be.visible');
      cy.get('[data-cy=plan-name]')
        .invoke('text')
        .should('match', /Free|Premium|Family|Enterprise/);
    });

    it('should display all available plans', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=view-plans-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=plans-list]').should('be.visible');
      cy.get('[data-cy=plan-card]').should('have.length', 4); // Free, Premium, Family, Enterprise
    });

    it('should show plan features', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=view-plans-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=plan-card]').first().within(() => {
        cy.get('[data-cy=plan-name]').should('be.visible');
        cy.get('[data-cy=plan-price]').should('be.visible');
        cy.get('[data-cy=plan-features]').should('be.visible');
        cy.get('[data-cy=plan-feature-item]').should('have.length.at.least', 3);
      });
    });

    it('should show monthly and annual pricing toggle', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=view-plans-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=billing-period-toggle]').should('be.visible');
      cy.get('[data-cy=monthly-option]').should('be.visible');
      cy.get('[data-cy=annual-option]').should('be.visible');
    });

    it('should show annual discount badge', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=view-plans-btn]').click();
      cy.get('[data-cy=annual-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=discount-badge]')
        .should('be.visible')
        .and('contain', '20%');
    });

    it('should highlight recommended plan', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=view-plans-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=plan-card][data-recommended="true"]')
        .should('exist')
        .and('have.class', 'recommended');
    });
  });

  describe('Upgrade to Premium - Stripe', () => {
    it('should show upgrade button for free users', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=current-plan]').then(($plan) => {
        if ($plan.text().includes('Free')) {
          cy.get('[data-cy=upgrade-btn]').should('be.visible');
        }
      });
    });

    it('should open plan selection when clicking upgrade', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=plan-selection-modal]').should('be.visible');
      cy.get('[data-cy=select-premium-btn]').should('be.visible');
    });

    it('should show payment method selection', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-method-selection]').should('be.visible');
      cy.get('[data-cy=stripe-option]').should('be.visible');
      cy.get('[data-cy=pagseguro-option]').should('be.visible');
    });

    it('should process Stripe checkout', () => {
      // Intercept Stripe API
      cy.intercept('POST', '**/create-checkout-session', {
        statusCode: 200,
        body: {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123'
        }
      }).as('createCheckout');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=stripe-option]').click();
      cy.waitForIonic();
      
      cy.wait('@createCheckout');
      
      // Verify redirect (in real test, Stripe would handle this)
      cy.get('[data-cy=stripe-loading]').should('be.visible');
    });

    it('should show trial information', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=trial-info]')
        .should('be.visible')
        .and('contain', '7 dias grátis');
    });

    it('should display terms and conditions link', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=terms-link]')
        .should('be.visible')
        .and('have.attr', 'href')
        .and('include', '/terms');
    });
  });

  describe('Upgrade to Premium - PagSeguro', () => {
    it('should show PagSeguro payment options', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=pagseguro-methods]').should('be.visible');
      cy.get('[data-cy=pix-option]').should('be.visible');
      cy.get('[data-cy=boleto-option]').should('be.visible');
      cy.get('[data-cy=credit-card-option]').should('be.visible');
    });

    it('should generate PIX QR Code', () => {
      cy.intercept('POST', '**/create-pagseguro-pix', {
        statusCode: 200,
        body: {
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
          qrCodeText: '00020126580014br.gov.bcb.pix...',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      }).as('createPix');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.get('[data-cy=pix-option]').click();
      cy.waitForIonic();
      
      cy.wait('@createPix');
      
      cy.get('[data-cy=pix-qr-code]').should('be.visible');
      cy.get('[data-cy=pix-code-text]').should('be.visible');
      cy.get('[data-cy=copy-pix-btn]').should('be.visible');
      cy.get('[data-cy=pix-expiration]')
        .should('be.visible')
        .and('contain', '15 minutos');
    });

    it('should copy PIX code to clipboard', () => {
      cy.intercept('POST', '**/create-pagseguro-pix', {
        statusCode: 200,
        body: {
          qrCode: 'data:image/png;base64,...',
          qrCodeText: '00020126580014br.gov.bcb.pix123',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      });
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.get('[data-cy=pix-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=copy-pix-btn]').click();
      
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'Código copiado');
    });

    it('should generate Boleto PDF', () => {
      cy.intercept('POST', '**/create-pagseguro-boleto', {
        statusCode: 200,
        body: {
          boletoUrl: 'https://pagseguro.uol.com.br/checkout/boleto/ABC123',
          barcode: '34191.79001 01043.510047 91020.150008 1 89350026000',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      }).as('createBoleto');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.get('[data-cy=boleto-option]').click();
      cy.waitForIonic();
      
      cy.wait('@createBoleto');
      
      cy.get('[data-cy=boleto-barcode]').should('be.visible');
      cy.get('[data-cy=boleto-due-date]')
        .should('be.visible')
        .and('contain', 'Vencimento');
      cy.get('[data-cy=download-boleto-btn]').should('be.visible');
    });

    it('should show payment pending status', () => {
      cy.intercept('POST', '**/create-pagseguro-pix', {
        statusCode: 200,
        body: { qrCode: '...', qrCodeText: '...' }
      });
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.get('[data-cy=pix-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-pending-message]')
        .should('be.visible')
        .and('contain', 'Aguardando pagamento');
    });
  });

  describe('Manage Active Subscription', () => {
    beforeEach(() => {
      // Mock user with active premium subscription
      cy.window().then((win) => {
        win.localStorage.setItem('mockSubscription', JSON.stringify({
          plan: 'premium',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));
      });
    });

    it('should show subscription details', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=subscription-details]').should('be.visible');
      
      cy.get('[data-cy=plan-name]').should('contain', 'Premium');
      cy.get('[data-cy=subscription-status]').should('contain', 'Ativa');
      cy.get('[data-cy=next-billing-date]').should('be.visible');
      cy.get('[data-cy=subscription-price]').should('be.visible');
    });

    it('should show manage subscription button', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').should('be.visible');
    });

    it('should display cancel option', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=cancel-subscription-btn]')
        .should('be.visible')
        .and('contain', 'Cancelar');
    });

    it('should show cancellation confirmation dialog', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').click();
      cy.get('[data-cy=cancel-subscription-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=cancel-confirmation-dialog]').should('be.visible');
      cy.get('[data-cy=cancel-reason-select]').should('be.visible');
      cy.get('[data-cy=cancel-feedback]').should('be.visible');
      cy.get('[data-cy=confirm-cancel-btn]').should('be.visible');
      cy.get('[data-cy=keep-subscription-btn]').should('be.visible');
    });

    it('should cancel subscription successfully', () => {
      cy.intercept('POST', '**/cancel-subscription', {
        statusCode: 200,
        body: { success: true, endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
      }).as('cancelSubscription');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').click();
      cy.get('[data-cy=cancel-subscription-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=cancel-reason-select]').select('Muito caro');
      cy.get('[data-cy=cancel-feedback]').type('Não posso pagar no momento');
      cy.get('[data-cy=confirm-cancel-btn]').click();
      
      cy.wait('@cancelSubscription');
      
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'Assinatura cancelada');
      
      cy.get('[data-cy=subscription-status]').should('contain', 'Cancelada');
      cy.get('[data-cy=access-until-message]')
        .should('be.visible')
        .and('contain', 'Você terá acesso até');
    });

    it('should show downgrade warning', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').click();
      cy.get('[data-cy=cancel-subscription-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=downgrade-warning]')
        .should('be.visible')
        .and('contain', 'Você perderá acesso');
    });

    it('should allow keeping subscription', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=manage-subscription-btn]').click();
      cy.get('[data-cy=cancel-subscription-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=keep-subscription-btn]').click();
      
      cy.get('[data-cy=cancel-confirmation-dialog]').should('not.exist');
      cy.get('[data-cy=subscription-status]').should('contain', 'Ativa');
    });
  });

  describe('Reactivate Canceled Subscription', () => {
    beforeEach(() => {
      // Mock canceled subscription
      cy.window().then((win) => {
        win.localStorage.setItem('mockSubscription', JSON.stringify({
          plan: 'premium',
          status: 'canceled',
          endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }));
      });
    });

    it('should show reactivate button for canceled subscription', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=reactivate-btn]').should('be.visible');
    });

    it('should reactivate subscription successfully', () => {
      cy.intercept('POST', '**/reactivate-subscription', {
        statusCode: 200,
        body: { success: true, status: 'active' }
      }).as('reactivateSubscription');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=reactivate-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=reactivate-confirmation]').should('be.visible');
      cy.get('[data-cy=confirm-reactivate-btn]').click();
      
      cy.wait('@reactivateSubscription');
      
      cy.get('[data-cy=success-toast]')
        .should('be.visible')
        .and('contain', 'Assinatura reativada');
      
      cy.get('[data-cy=subscription-status]').should('contain', 'Ativa');
    });

    it('should show remaining access days', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=remaining-days-message]')
        .should('be.visible')
        .and('contain', 'dias restantes');
    });
  });

  describe('Payment History', () => {
    it('should display payment history tab', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=payment-history-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-history-list]').should('be.visible');
    });

    it('should show payment entries', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=payment-history-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-entry]').should('have.length.at.least', 1);
      cy.get('[data-cy=payment-entry]').first().within(() => {
        cy.get('[data-cy=payment-date]').should('be.visible');
        cy.get('[data-cy=payment-amount]').should('be.visible');
        cy.get('[data-cy=payment-status]').should('be.visible');
        cy.get('[data-cy=payment-method]').should('be.visible');
      });
    });

    it('should show invoice download button', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=payment-history-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-entry]').first().within(() => {
        cy.get('[data-cy=download-invoice-btn]').should('be.visible');
      });
    });

    it('should filter by date range', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=payment-history-tab]').click();
      cy.get('[data-cy=date-range-filter]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=start-date]').type('2025-01-01');
      cy.get('[data-cy=end-date]').type('2025-12-31');
      cy.get('[data-cy=apply-filter-btn]').click();
      
      cy.get('[data-cy=payment-entry]').should('exist');
    });

    it('should show payment status badges', () => {
      cy.navigateToTab('profile');
      cy.get('[data-cy=payment-history-tab]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=payment-status]').each(($status) => {
        cy.wrap($status)
          .invoke('text')
          .should('match', /Pago|Pendente|Cancelado|Reembolsado/);
      });
    });
  });

  describe('Feature Limits', () => {
    it('should show upgrade prompt when limit reached (Free plan)', () => {
      // Mock Free plan with 5 medications (limit)
      cy.window().then((win) => {
        win.localStorage.setItem('mockMedicationCount', '5');
        win.localStorage.setItem('mockPlan', 'free');
      });
      
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=limit-reached-modal]')
        .should('be.visible')
        .and('contain', 'Limite atingido');
      
      cy.get('[data-cy=upgrade-now-btn]').should('be.visible');
      cy.get('[data-cy=see-plans-btn]').should('be.visible');
    });

    it('should allow unlimited medications (Premium plan)', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('mockMedicationCount', '20');
        win.localStorage.setItem('mockPlan', 'premium');
      });
      
      cy.navigateToTab('medications');
      cy.get('[data-cy=add-medication-btn]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=medication-form]').should('be.visible');
      cy.get('[data-cy=limit-reached-modal]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle payment failure gracefully', () => {
      cy.intercept('POST', '**/create-checkout-session', {
        statusCode: 500,
        body: { error: 'Payment processor error' }
      }).as('paymentError');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=stripe-option]').click();
      
      cy.wait('@paymentError');
      
      cy.get('[data-cy=error-toast]')
        .should('be.visible')
        .and('contain', 'Erro ao processar pagamento');
    });

    it('should handle network errors', () => {
      cy.intercept('POST', '**/create-checkout-session', {
        forceNetworkError: true
      }).as('networkError');
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=stripe-option]').click();
      
      cy.wait('@networkError');
      
      cy.get('[data-cy=error-toast]')
        .should('be.visible')
        .and('contain', 'Erro de conexão');
    });

    it('should handle expired PIX code', () => {
      cy.intercept('POST', '**/create-pagseguro-pix', {
        statusCode: 200,
        body: {
          qrCode: '...',
          qrCodeText: '...',
          expiresAt: new Date(Date.now() - 1000).toISOString() // Expired
        }
      });
      
      cy.navigateToTab('profile');
      cy.get('[data-cy=upgrade-btn]').click();
      cy.get('[data-cy=select-premium-btn]').click();
      cy.get('[data-cy=pagseguro-option]').click();
      cy.get('[data-cy=pix-option]').click();
      cy.waitForIonic();
      
      cy.get('[data-cy=pix-expired-message]')
        .should('be.visible')
        .and('contain', 'expirado');
      
      cy.get('[data-cy=generate-new-pix-btn]').should('be.visible');
    });
  });
});
