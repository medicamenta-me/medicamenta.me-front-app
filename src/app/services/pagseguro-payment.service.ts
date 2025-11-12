import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SubscriptionPlan } from '../models/subscription.model';
import { BillingCycle } from './stripe-payment.service';
import { LogService } from './log.service';

/**
 * PagSeguro Subscription Response
 */
export interface PagSeguroSubscriptionResponse {
  code: string;
  checkoutUrl: string;
}

/**
 * PagSeguro Subscription Status
 */
export interface PagSeguroSubscriptionStatus {
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  code: string;
  reference: string;
  lastEventDate: string;
  charge: string;
}

/**
 * PagSeguro Transaction
 */
export interface PagSeguroTransaction {
  code: string;
  reference: string;
  type: number;
  status: number;
  date: string;
  lastEventDate: string;
  grossAmount: number;
  netAmount: number;
  paymentMethod: {
    type: number;
    code: number;
  };
}

/**
 * PagSeguro Payment Service
 * Handles all PagSeguro payment integration for Brazilian market
 */
@Injectable({
  providedIn: 'root'
})
export class PagSeguroPaymentService {
  private readonly http = inject(HttpClient);
  private readonly logService = inject(LogService);

  // Cloud Functions base URL
  private readonly functionsUrl = environment.production
    ? 'https://us-central1-medicamenta-me.cloudfunctions.net'
    : 'http://localhost:5001/medicamenta-me/us-central1';

  /**
   * Create PagSeguro subscription and redirect to checkout
   * @param plan Subscription plan to purchase
   * @param billingCycle Monthly or yearly billing
   * @param userId User ID for tracking
   * @param userEmail User email for PagSeguro
   * @param userName User name
   * @param userPhone User phone (Brazilian format)
   */
  async createSubscription(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userId: string,
    userEmail: string,
    userName: string,
    userPhone: string
  ): Promise<void> {
    try {
      if (plan === 'free') {
        throw new Error('Cannot create subscription for free plan');
      }

      if (plan === 'enterprise') {
        throw new Error('Enterprise plan requires custom pricing. Please contact sales.');
      }

      // Get plan code from environment
      const planCode = this.getPlanCode(plan, billingCycle);

      if (!planCode || planCode.includes('REPLACE')) {
        throw new Error(
          'PagSeguro plan code not configured. Please update environment.ts with your PagSeguro plan codes.'
        );
      }

      // Call Cloud Function to create subscription
      const response = await firstValueFrom(
        this.http.post<PagSeguroSubscriptionResponse>(
          `${this.functionsUrl}/createPagSeguroSubscription`,
          {
            planCode,
            userId,
            plan,
            billingCycle,
            customer: {
              email: userEmail,
              name: userName,
              phone: this.formatPhone(userPhone)
            }
          }
        )
      );

      // Redirect to PagSeguro checkout
      if (response.checkoutUrl) {
        globalThis.location.href = response.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned from PagSeguro');
      }
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error creating subscription', error);
      throw error;
    }
  }

  /**
   * Get plan code for plan and billing cycle
   */
  private getPlanCode(plan: SubscriptionPlan, billingCycle: BillingCycle): string {
    const plans = environment.pagseguro.plans;
    
    if (plan === 'premium') {
      return billingCycle === 'monthly' ? plans.premium.monthly : plans.premium.yearly;
    } else if (plan === 'family') {
      return billingCycle === 'monthly' ? plans.family.monthly : plans.family.yearly;
    }
    
    throw new Error(`Invalid plan: ${plan}`);
  }

  /**
   * Format phone number to PagSeguro format (DDD + Number)
   * Expected input: (11) 98765-4321 or 11987654321
   * Output: { areaCode: '11', number: '987654321' }
   */
  private formatPhone(phone: string): { areaCode: string; number: string } {
    // Remove all non-numeric characters
    const cleaned = phone.replaceAll(/\D/g, '');
    
    if (cleaned.length < 10 || cleaned.length > 11) {
      throw new Error('Invalid phone number format. Expected format: (11) 98765-4321');
    }
    
    return {
      areaCode: cleaned.substring(0, 2),
      number: cleaned.substring(2)
    };
  }

  /**
   * Get subscription status from PagSeguro
   * @param subscriptionCode PagSeguro subscription code
   */
  async getSubscriptionStatus(subscriptionCode: string): Promise<PagSeguroSubscriptionStatus> {
    try {
      return await firstValueFrom(
        this.http.get<PagSeguroSubscriptionStatus>(
          `${this.functionsUrl}/getPagSeguroSubscriptionStatus`,
          { params: { subscriptionCode } }
        )
      );
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error getting subscription status', error);
      throw error;
    }
  }

  /**
   * Cancel PagSeguro subscription
   * @param subscriptionCode PagSeguro subscription code
   */
  async cancelSubscription(subscriptionCode: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.functionsUrl}/cancelPagSeguroSubscription`,
          { subscriptionCode }
        )
      );
      
      this.logService.info('PagSeguroPaymentService', 'Subscription canceled successfully');
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error canceling subscription', error);
      throw error;
    }
  }

  /**
   * Suspend PagSeguro subscription (temporary pause)
   * @param subscriptionCode PagSeguro subscription code
   */
  async suspendSubscription(subscriptionCode: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.functionsUrl}/suspendPagSeguroSubscription`,
          { subscriptionCode }
        )
      );
      
      this.logService.info('PagSeguroPaymentService', 'Subscription suspended successfully');
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error suspending subscription', error);
      throw error;
    }
  }

  /**
   * Reactivate suspended PagSeguro subscription
   * @param subscriptionCode PagSeguro subscription code
   */
  async reactivateSubscription(subscriptionCode: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.functionsUrl}/reactivatePagSeguroSubscription`,
          { subscriptionCode }
        )
      );
      
      this.logService.info('PagSeguroPaymentService', 'Subscription reactivated successfully');
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error reactivating subscription', error);
      throw error;
    }
  }

  /**
   * Get transaction history from PagSeguro
   * @param email Customer email
   * @param days Number of days to retrieve (max 180)
   */
  async getTransactionHistory(email: string, days: number = 30): Promise<PagSeguroTransaction[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ transactions: PagSeguroTransaction[] }>(
          `${this.functionsUrl}/getPagSeguroTransactionHistory`,
          { params: { email, days: days.toString() } }
        )
      );
      
      return response.transactions;
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error getting transaction history', error);
      throw error;
    }
  }

  /**
   * Change subscription plan
   * Note: PagSeguro doesn't support direct plan changes, so this cancels and creates new
   * @param currentSubscriptionCode Current subscription code
   * @param newPlan New plan to subscribe to
   * @param billingCycle Billing cycle
   * @param userId User ID
   * @param userEmail User email
   * @param userName User name
   * @param userPhone User phone
   */
  async changePlan(
    currentSubscriptionCode: string,
    newPlan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userId: string,
    userEmail: string,
    userName: string,
    userPhone: string
  ): Promise<void> {
    try {
      // Cancel current subscription
      await this.cancelSubscription(currentSubscriptionCode);
      
      // Create new subscription
      await this.createSubscription(
        newPlan,
        billingCycle,
        userId,
        userEmail,
        userName,
        userPhone
      );
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error changing plan', error);
      throw error;
    }
  }

  /**
   * Validate customer data before creating subscription
   * @param email Email to validate
   * @param phone Phone to validate
   */
  validateCustomerData(email: string, phone: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email inválido');
    }
    
    // Phone validation (Brazilian format)
    const cleaned = phone.replaceAll(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 11) {
      errors.push('Telefone inválido. Formato esperado: (11) 98765-4321');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get PagSeguro payment link for boleto (bank slip)
   * @param subscriptionCode Subscription code
   */
  async getBoletoLink(subscriptionCode: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ boletoUrl: string }>(
          `${this.functionsUrl}/getPagSeguroBoletoLink`,
          { params: { subscriptionCode } }
        )
      );
      
      return response.boletoUrl;
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error getting boleto link', error);
      throw error;
    }
  }

  /**
   * Check if payment is overdue
   * @param subscriptionCode Subscription code
   */
  async checkOverduePayment(subscriptionCode: string): Promise<{ overdue: boolean; days?: number }> {
    try {
      return await firstValueFrom(
        this.http.get<{ overdue: boolean; days?: number }>(
          `${this.functionsUrl}/checkPagSeguroOverdue`,
          { params: { subscriptionCode } }
        )
      );
    } catch (error: any) {
      this.logService.error('PagSeguroPaymentService', 'Error checking overdue payment', error);
      throw error;
    }
  }
}

