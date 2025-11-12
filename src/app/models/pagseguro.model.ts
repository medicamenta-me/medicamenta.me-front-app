/**
 * PagSeguro Integration Models
 * 
 * Models for Brazilian payment gateway integration supporting:
 * - PIX (instant payment)
 * - Boleto bancário (bank slip - 3 business days)
 * - Credit card with installments (up to 12x)
 */

/**
 * PagSeguro Payment Methods
 */
export type PagSeguroPaymentMethod = 'pix' | 'boleto' | 'credit_card';

/**
 * PagSeguro Transaction Status
 */
export type PagSeguroTransactionStatus =
  | 'pending'           // Awaiting payment
  | 'in_analysis'       // Under fraud analysis
  | 'paid'              // Payment confirmed
  | 'available'         // Payment available for withdrawal
  | 'in_dispute'        // Chargeback initiated
  | 'returned'          // Refunded
  | 'canceled'          // Canceled
  | 'declined';         // Declined by bank/fraud

/**
 * PagSeguro Customer Information
 */
export interface PagSeguroCustomer {
  id?: string;
  name: string;
  email: string;
  cpf: string;              // Brazilian tax ID (11 digits)
  phone: {
    areaCode: string;       // 2 digits (DDD)
    number: string;         // 8-9 digits
  };
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;       // Bairro
    city: string;
    state: string;          // 2 letters (UF)
    postalCode: string;     // CEP (8 digits)
    country: string;        // BRA
  };
}

/**
 * PIX Payment Details
 */
export interface PagSeguroPix {
  qrCode: string;            // Base64 QR code image
  qrCodeText: string;        // PIX copy-paste code
  expirationDate: string;    // ISO 8601 datetime
  paymentUrl?: string;       // Direct link to payment page
}

/**
 * Boleto Payment Details
 */
export interface PagSeguroBoleto {
  barcode: string;           // Barcode number (digitable line)
  barcodeImage?: string;     // Base64 barcode image
  dueDate: string;           // ISO 8601 date
  paymentUrl: string;        // Link to print boleto
  pdfUrl?: string;           // Direct PDF link
}

/**
 * Credit Card Details (for tokenization)
 */
export interface PagSeguroCreditCard {
  token?: string;            // Tokenized card (from PagSeguro.js)
  holder: {
    name: string;
    cpf: string;
    birthDate: string;       // YYYY-MM-DD
  };
  installments: number;      // 1-12
  installmentValue: number;  // Value per installment (in cents)
}

/**
 * PagSeguro Charge/Transaction
 */
export interface PagSeguroCharge {
  id: string;                         // PagSeguro charge ID
  referenceId: string;                // Our internal reference (e.g., firebaseUid_timestamp)
  description: string;
  amount: {
    value: number;                    // In cents (e.g., 1490 = R$ 14.90)
    currency: 'BRL';
  };
  paymentMethod: PagSeguroPaymentMethod;
  status: PagSeguroTransactionStatus;
  
  // Payment-specific details
  pix?: PagSeguroPix;
  boleto?: PagSeguroBoleto;
  creditCard?: PagSeguroCreditCard;
  
  // Customer info
  customer: PagSeguroCustomer;
  
  // Subscription link (if applicable)
  subscriptionId?: string;
  
  // Timestamps
  createdAt: string;                  // ISO 8601
  paidAt?: string;                    // ISO 8601
  expiresAt?: string;                 // ISO 8601
  
  // Metadata
  metadata?: {
    firebaseUid?: string;
    plan?: string;
    billingInterval?: string;
    [key: string]: any;
  };
  
  // Links
  links?: {
    self: string;
    payment?: string;
    boleto?: string;
  };
}

/**
 * PagSeguro Subscription (recurring payments)
 */
export interface PagSeguroSubscription {
  id: string;                         // PagSeguro subscription ID
  referenceId: string;                // Our internal reference
  plan: {
    id: string;                       // PagSeguro plan ID
    name: string;
  };
  customer: PagSeguroCustomer;
  paymentMethod: PagSeguroPaymentMethod;
  status: 'active' | 'suspended' | 'canceled' | 'expired';
  
  // Billing
  amount: {
    value: number;                    // In cents
    currency: 'BRL';
  };
  nextBillingDate: string;            // ISO 8601 date
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Metadata
  metadata?: {
    firebaseUid?: string;
    [key: string]: any;
  };
}

/**
 * PagSeguro Webhook Event
 */
export interface PagSeguroWebhookEvent {
  id: string;
  createdAt: string;
  
  // Event types
  type: PagSeguroWebhookEventType;
  
  // Event data
  data: {
    id: string;                       // Charge or subscription ID
    referenceId: string;
  };
}

/**
 * PagSeguro Webhook Event Types
 */
export type PagSeguroWebhookEventType =
  | 'CHARGE.PAID'                     // Charge paid successfully
  | 'CHARGE.IN_ANALYSIS'              // Under fraud analysis
  | 'CHARGE.DECLINED'                 // Payment declined
  | 'CHARGE.CANCELED'                 // Charge canceled
  | 'CHARGE.REFUNDED'                 // Charge refunded
  | 'SUBSCRIPTION.ACTIVATED'          // Subscription activated
  | 'SUBSCRIPTION.SUSPENDED'          // Payment failed, subscription suspended
  | 'SUBSCRIPTION.CANCELED'           // Subscription canceled
  | 'SUBSCRIPTION.EXPIRED';           // Subscription expired

/**
 * PagSeguro Plan (for subscriptions)
 */
export interface PagSeguroPlan {
  id: string;                         // PagSeguro plan ID
  name: string;
  description?: string;
  amount: {
    value: number;                    // In cents
    currency: 'BRL';
  };
  interval: 'monthly' | 'yearly';
  trialDays?: number;
  
  // Our mapping
  internalPlanId?: 'premium' | 'family';
}

/**
 * PagSeguro Error Response
 */
export interface PagSeguroError {
  code: string;
  description: string;
  parameterName?: string;
}

/**
 * PagSeguro API Response
 */
export interface PagSeguroResponse<T = any> {
  data?: T;
  errors?: PagSeguroError[];
}

/**
 * Constants: PagSeguro Plan IDs
 * Maps our internal plans to PagSeguro plan IDs
 */
export const PAGSEGURO_PLAN_IDS = {
  test: {
    premium: {
      monthly: 'PLAN_TEST_PREMIUM_MONTHLY',
      yearly: 'PLAN_TEST_PREMIUM_YEARLY'
    },
    family: {
      monthly: 'PLAN_TEST_FAMILY_MONTHLY',
      yearly: 'PLAN_TEST_FAMILY_YEARLY'
    }
  },
  live: {
    premium: {
      monthly: 'PLAN_LIVE_PREMIUM_MONTHLY',
      yearly: 'PLAN_LIVE_PREMIUM_YEARLY'
    },
    family: {
      monthly: 'PLAN_LIVE_FAMILY_MONTHLY',
      yearly: 'PLAN_LIVE_FAMILY_YEARLY'
    }
  }
};

/**
 * Installment Options (Brazilian credit cards)
 */
export interface InstallmentOption {
  quantity: number;           // Number of installments
  value: number;              // Value per installment (in cents)
  totalValue: number;         // Total value with interest (in cents)
  interestFree: boolean;      // No interest for this option
}

/**
 * Helper: Calculate installment options
 */
export function calculateInstallments(
  totalCents: number,
  maxInstallments: number = 12,
  interestFreeLimit: number = 3
): InstallmentOption[] {
  const options: InstallmentOption[] = [];
  
  // 1x (always interest-free)
  options.push({
    quantity: 1,
    value: totalCents,
    totalValue: totalCents,
    interestFree: true
  });
  
  for (let i = 2; i <= maxInstallments; i++) {
    const interestFree = i <= interestFreeLimit;
    const interestRate = interestFree ? 0 : 0.0299; // 2.99% per month (Brazilian average)
    
    let totalValue: number;
    if (interestFree) {
      totalValue = totalCents;
    } else {
      // Compound interest formula: M = P * (1 + i)^n
      totalValue = Math.round(totalCents * Math.pow(1 + interestRate, i));
    }
    
    options.push({
      quantity: i,
      value: Math.round(totalValue / i),
      totalValue,
      interestFree
    });
  }
  
  return options;
}

/**
 * Helper: Format CPF (Brazilian tax ID)
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Helper: Validate CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // All same digits
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

/**
 * Helper: Format phone number (Brazilian format)
 */
export function formatPhone(areaCode: string, number: string): string {
  const cleanedArea = areaCode.replace(/\D/g, '');
  const cleanedNumber = number.replace(/\D/g, '');
  
  if (cleanedNumber.length === 8) {
    return `(${cleanedArea}) ${cleanedNumber.slice(0, 4)}-${cleanedNumber.slice(4)}`;
  } else if (cleanedNumber.length === 9) {
    return `(${cleanedArea}) ${cleanedNumber.slice(0, 5)}-${cleanedNumber.slice(5)}`;
  }
  
  return `(${areaCode}) ${number}`;
}

/**
 * Helper: Format currency (BRL)
 */
export function formatBRL(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(reais);
}

/**
 * Helper: Parse CEP (Brazilian postal code)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}
