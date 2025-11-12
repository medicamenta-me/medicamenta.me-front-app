/**
 * PagSeguro Payment Service
 * 
 * Handles Brazilian payment methods integration:
 * - PIX (instant payment)
 * - Boleto bancário (bank slip)
 * - Credit card with installments
 * 
 * Architecture: Uses Firestore as message queue to communicate with Cloud Functions
 * Similar pattern to StripeService for consistency
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, doc, setDoc, onSnapshot, Timestamp, collection } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { LogService } from './log.service';
import {
  PagSeguroCharge,
  PagSeguroPaymentMethod,
  PagSeguroCustomer,
  PagSeguroPix,
  PagSeguroBoleto,
  PagSeguroCreditCard,
  InstallmentOption,
  calculateInstallments
} from '../models/pagseguro.model';
import { getPagSeguroConfig, getPlanDetails } from '../config/pagseguro.config';

@Injectable({
  providedIn: 'root'
})
export class PagSeguroService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly logService = inject(LogService);
  
  // Configuration
  private readonly config = getPagSeguroConfig();
  
  // State signals
  private readonly _isLoading = signal(false);
  private readonly _currentCharge = signal<PagSeguroCharge | null>(null);
  private readonly _pixData = signal<PagSeguroPix | null>(null);
  private readonly _boletoData = signal<PagSeguroBoleto | null>(null);
  
  // Public signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly currentCharge = this._currentCharge.asReadonly();
  readonly pixData = this._pixData.asReadonly();
  readonly boletoData = this._boletoData.asReadonly();
  
  // Computed
  readonly isProcessing = computed(() => {
    const charge = this._currentCharge();
    return charge?.status === 'pending' || charge?.status === 'in_analysis';
  });
  
  readonly hasPendingPayment = computed(() => {
    const charge = this._currentCharge();
    return charge !== null && (
      charge.status === 'pending' || 
      charge.status === 'in_analysis'
    );
  });
  
  /**
   * Create PIX payment charge
   * 
   * @param plan - Subscription plan (premium/family)
   * @param billingInterval - monthly or yearly
   * @param customer - Customer information with CPF
   * @returns Promise that resolves when PIX code is ready
   */
  async createPixPayment(
    plan: 'premium' | 'family',
    billingInterval: 'monthly' | 'yearly',
    customer: PagSeguroCustomer
  ): Promise<PagSeguroPix> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    this._isLoading.set(true);
    
    try {
      // Get plan details
      const planDetails = getPlanDetails(plan, billingInterval);
      
      // Create charge document in Firestore
      const chargesRef = collection(this.firestore, `users/${user.uid}/pagseguro_charges`);
      const chargeId = `pix_${Date.now()}`;
      const chargeDocRef = doc(chargesRef, chargeId);
      
      const chargeData = {
        referenceId: `${user.uid}_${chargeId}`,
        description: planDetails.name,
        amount: planDetails.amount,
        paymentMethod: 'pix' as PagSeguroPaymentMethod,
        customer,
        metadata: {
          firebaseUid: user.uid,
          plan,
          billingInterval
        },
        createdAt: Timestamp.now()
      };
      
      // Write to Firestore - Cloud Function will process
      await setDoc(chargeDocRef, chargeData);
      
      // Track PIX generation started
      this.analytics.trackCheckoutStarted(plan, billingInterval, 'pagseguro_pix');
      this.analytics.trackPaymentMethodSelected('pix');
      
      // Wait for Cloud Function to add PIX data
      const pixData = await this.waitForPixData(chargeDocRef.path);
      
      this._pixData.set(pixData);
      
      // Track successful PIX generation
      this.analytics.trackPagSeguroPixGenerated(plan, planDetails.amount.value);
      
      return pixData;
      
    } catch (error: any) {
      this.logService.error('PagSeguro', 'Error creating PIX payment', error as Error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Create Boleto payment charge
   * 
   * @param plan - Subscription plan
   * @param billingInterval - monthly or yearly
   * @param customer - Customer information with CPF and address
   * @returns Promise that resolves when Boleto is ready
   */
  async createBoletoPayment(
    plan: 'premium' | 'family',
    billingInterval: 'monthly' | 'yearly',
    customer: PagSeguroCustomer
  ): Promise<PagSeguroBoleto> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    this._isLoading.set(true);
    
    try {
      // Validate address (required for boleto)
      if (!customer.address) {
        throw new Error('Address is required for Boleto payment');
      }
      
      const planDetails = getPlanDetails(plan, billingInterval);
      
      const chargesRef = collection(this.firestore, `users/${user.uid}/pagseguro_charges`);
      const chargeId = `boleto_${Date.now()}`;
      const chargeDocRef = doc(chargesRef, chargeId);
      
      const chargeData = {
        referenceId: `${user.uid}_${chargeId}`,
        description: planDetails.name,
        amount: planDetails.amount,
        paymentMethod: 'boleto' as PagSeguroPaymentMethod,
        customer,
        metadata: {
          firebaseUid: user.uid,
          plan,
          billingInterval
        },
        createdAt: Timestamp.now()
      };
      
      await setDoc(chargeDocRef, chargeData);
      
      // Track Boleto generation started
      this.analytics.trackCheckoutStarted(plan, billingInterval, 'pagseguro_boleto');
      this.analytics.trackPaymentMethodSelected('boleto');
      
      // Wait for Cloud Function to generate boleto
      const boletoData = await this.waitForBoletoData(chargeDocRef.path);
      
      this._boletoData.set(boletoData);
      
      // Track successful Boleto generation
      this.analytics.trackPagSeguroBoletoGenerated(plan, planDetails.amount.value);
      
      return boletoData;
      
    } catch (error: any) {
      this.logService.error('PagSeguro', 'Error creating Boleto payment', error as Error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Create Credit Card payment with installments
   * 
   * @param plan - Subscription plan
   * @param billingInterval - monthly or yearly
   * @param customer - Customer information
   * @param creditCard - Tokenized card data (from PagSeguro.js)
   * @returns Promise that resolves when payment is processed
   */
  async createCreditCardPayment(
    plan: 'premium' | 'family',
    billingInterval: 'monthly' | 'yearly',
    customer: PagSeguroCustomer,
    creditCard: PagSeguroCreditCard
  ): Promise<PagSeguroCharge> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    this._isLoading.set(true);
    
    try {
      const planDetails = getPlanDetails(plan, billingInterval);
      
      const chargesRef = collection(this.firestore, `users/${user.uid}/pagseguro_charges`);
      const chargeId = `card_${Date.now()}`;
      const chargeDocRef = doc(chargesRef, chargeId);
      
      const chargeData = {
        referenceId: `${user.uid}_${chargeId}`,
        description: planDetails.name,
        amount: planDetails.amount,
        paymentMethod: 'credit_card' as PagSeguroPaymentMethod,
        customer,
        creditCard,
        metadata: {
          firebaseUid: user.uid,
          plan,
          billingInterval
        },
        createdAt: Timestamp.now()
      };
      
      await setDoc(chargeDocRef, chargeData);
      
      // Track card payment started
      this.analytics.trackCheckoutStarted(plan, billingInterval, 'pagseguro_card');
      this.analytics.trackPaymentMethodSelected('credit_card');
      this.analytics.trackPagSeguroCardSubmitted(creditCard.installments);
      
      // Wait for Cloud Function to process card payment
      const charge = await this.waitForChargeStatus(chargeDocRef.path);
      
      this._currentCharge.set(charge);
      
      return charge;
      
    } catch (error: any) {
      this.logService.error('PagSeguro', 'Error creating credit card payment', error as Error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Calculate installment options for a plan
   * 
   * @param plan - Subscription plan
   * @param billingInterval - monthly or yearly
   * @returns Array of installment options
   */
  getInstallmentOptions(
    plan: 'premium' | 'family',
    billingInterval: 'monthly' | 'yearly'
  ): InstallmentOption[] {
    const planDetails = getPlanDetails(plan, billingInterval);
    const totalCents = planDetails.amount.value;
    
    return calculateInstallments(
      totalCents,
      this.config.features.maxInstallments,
      this.config.features.interestFreeLimit
    );
  }
  
  /**
   * Check payment status (PIX polling)
   * 
   * @param chargeId - Charge ID to check
   * @returns Promise that resolves with charge data
   */
  async checkPaymentStatus(chargeId: string): Promise<PagSeguroCharge> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const chargeDocRef = doc(this.firestore, `users/${user.uid}/pagseguro_charges/${chargeId}`);
    
    return new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(
        chargeDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            
            if (data.status === 'paid') {
              unsubscribe();
              resolve(data as PagSeguroCharge);
            }
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });
  }
  
  /**
   * Copy PIX code to clipboard
   */
  async copyPixCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.logService.info('PagSeguro', 'PIX code copied to clipboard');
      
      // Track PIX code copied
      this.analytics.trackPagSeguroPixCopied();
      
    } catch (error: any) {
      this.logService.error('PagSeguro', 'Error copying PIX code', error as Error);
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      
      // Track even on fallback
      this.analytics.trackPagSeguroPixCopied();
    }
  }
  
  /**
   * Open Boleto PDF in new window
   */
  openBoletoPdf(url: string): void {
    globalThis.window?.open(url, '_blank');
    
    // Track Boleto download
    this.analytics.trackPagSeguroBoletoDownloaded();
  }
  
  /**
   * Clear current payment data
   */
  clearPaymentData(): void {
    this._currentCharge.set(null);
    this._pixData.set(null);
    this._boletoData.set(null);
  }
  
  // Private helper methods
  
  /**
   * Wait for Cloud Function to add PIX data to document
   */
  private async waitForPixData(docPath: string): Promise<PagSeguroPix> {
    const maxAttempts = 20; // 20 attempts × 1 second = 20 seconds
    const delayMs = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const docRef = doc(this.firestore, docPath);
      
      const pixData = await new Promise<PagSeguroPix | null>((resolve) => {
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          unsubscribe();
          
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            
            if (data.pix) {
              resolve(data.pix as PagSeguroPix);
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
          
          resolve(null);
        });
      });
      
      if (pixData) {
        return pixData;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Timeout waiting for PIX code generation');
  }
  
  /**
   * Wait for Cloud Function to add Boleto data to document
   */
  private async waitForBoletoData(docPath: string): Promise<PagSeguroBoleto> {
    const maxAttempts = 20;
    const delayMs = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const docRef = doc(this.firestore, docPath);
      
      const boletoData = await new Promise<PagSeguroBoleto | null>((resolve) => {
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          unsubscribe();
          
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            
            if (data.boleto) {
              resolve(data.boleto as PagSeguroBoleto);
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
          
          resolve(null);
        });
      });
      
      if (boletoData) {
        return boletoData;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Timeout waiting for Boleto generation');
  }
  
  /**
   * Wait for Cloud Function to process card payment
   */
  private async waitForChargeStatus(docPath: string): Promise<PagSeguroCharge> {
    const maxAttempts = 30;
    const delayMs = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const docRef = doc(this.firestore, docPath);
      
      const charge = await new Promise<PagSeguroCharge | null>((resolve) => {
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          unsubscribe();
          
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            
            // If status updated (not pending anymore), return
            if (data.status && data.status !== 'pending') {
              resolve(data as PagSeguroCharge);
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
          
          resolve(null);
        });
      });
      
      if (charge) {
        return charge;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Timeout waiting for payment processing');
  }
}

