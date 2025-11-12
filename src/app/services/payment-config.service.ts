import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

/**
 * Service to check if payment providers are properly configured
 * Prevents paid plans from showing when payment is not set up
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentConfigService {
  private readonly translate = inject(TranslateService);
  
  /**
   * Check if Stripe is configured with valid keys
   */
  isStripeConfigured(): boolean {
    const stripeKey = environment.stripe?.testPublishableKey || '';
    
    // Check if key exists and is not a placeholder
    return stripeKey.length > 0 && 
           !stripeKey.includes('REPLACE') && 
           stripeKey.startsWith('pk_');
  }

  /**
   * Check if PagSeguro is configured with valid keys
   */
  isPagSeguroConfigured(): boolean {
    const pagseguroKey = environment.pagseguro?.testPublicKey || '';
    
    // Check if key exists and is not a placeholder
    return pagseguroKey.length > 0 && 
           !pagseguroKey.includes('REPLACE') &&
           !pagseguroKey.includes('PUBLIC_KEY');
  }

  /**
   * Check if any payment provider is configured
   */
  isPaymentConfigured(): boolean {
    return this.isStripeConfigured() || this.isPagSeguroConfigured();
  }

  /**
   * Check if specific plan prices are configured
   */
  arePlanPricesConfigured(): boolean {
    const stripePrices = environment.stripe?.prices;
    const pagseguroPlans = environment.pagseguro?.plans;

    // Check Stripe prices
    const stripeConfigured = stripePrices && (
      (stripePrices.premium?.monthly && !stripePrices.premium.monthly.includes('REPLACE')) ||
      (stripePrices.family?.monthly && !stripePrices.family.monthly.includes('REPLACE'))
    );

    // Check PagSeguro plans
    const pagseguroConfigured = pagseguroPlans && (
      (pagseguroPlans.premium?.monthly && !pagseguroPlans.premium.monthly.includes('PLAN_TEST')) ||
      (pagseguroPlans.family?.monthly && !pagseguroPlans.family.monthly.includes('PLAN_TEST'))
    );

    return Boolean(stripeConfigured || pagseguroConfigured);
  }

  /**
   * Get available payment providers
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    if (this.isStripeConfigured()) {
      providers.push('stripe');
    }
    
    if (this.isPagSeguroConfigured()) {
      providers.push('pagseguro');
    }
    
    return providers;
  }

  /**
   * Get payment configuration status message
   */
  getConfigurationStatus(): {
    configured: boolean;
    message: string;
    providers: string[];
  } {
    const providers = this.getAvailableProviders();
    const configured = providers.length > 0 && this.arePlanPricesConfigured();

    let message = '';
    if (!configured) {
      this.translate.get('PRICING.WARNING.MESSAGE').subscribe(text => message = text);
    } else if (providers.length === 1) {
      const providerKey = providers[0].toUpperCase();
      this.translate.get(`PRICING.WARNING.CONFIGURED_${providerKey}`).subscribe(text => message = text);
    } else {
      this.translate.get('PRICING.WARNING.CONFIGURED_BOTH').subscribe(text => message = text);
    }

    return {
      configured,
      message,
      providers
    };
  }
}

