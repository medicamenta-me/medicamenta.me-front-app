/**
 * PagSeguro Configuration
 * 
 * Centralized configuration for Brazilian payment gateway
 * Supports sandbox and production environments
 */

import { environment } from '../../environments/environment';
import { PAGSEGURO_PLAN_IDS, PagSeguroPlan } from '../models/pagseguro.model';

/**
 * PagSeguro Configuration Interface
 */
export interface PagSeguroConfig {
  // API credentials
  publicKey: string;
  
  // Environment
  mode: 'sandbox' | 'production';
  apiUrl: string;
  
  // Plans
  plans: {
    premium: {
      monthly: string;
      yearly: string;
    };
    family: {
      monthly: string;
      yearly: string;
    };
  };
  
  // Features
  features: {
    pix: boolean;
    boleto: boolean;
    creditCard: boolean;
    installments: boolean;
    maxInstallments: number;
    interestFreeLimit: number;
  };
  
  // URLs
  successUrl: string;
  cancelUrl: string;
  
  // Timeouts
  pixExpirationMinutes: number;
  boletoExpirationDays: number;
}

/**
 * Get PagSeguro configuration based on environment
 */
export function getPagSeguroConfig(): PagSeguroConfig {
  const isProduction = environment.production;
  const mode = isProduction ? 'production' : 'sandbox';
  
  // Get public key from environment (type assertion for flexibility)
  const envConfig = (environment as any).pagseguro || {};
  const publicKey = isProduction 
    ? envConfig.livePublicKey || 'PUBLIC_KEY_LIVE_NOT_SET'
    : envConfig.testPublicKey || 'PUBLIC_KEY_TEST_NOT_SET';
  
  // API URLs
  const apiUrl = isProduction
    ? 'https://api.pagseguro.com'
    : 'https://sandbox.api.pagseguro.com';
  
  // Plan IDs
  const planIds = isProduction ? PAGSEGURO_PLAN_IDS.live : PAGSEGURO_PLAN_IDS.test;
  
  // Get base URL for redirects
  const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
  
  return {
    publicKey,
    mode,
    apiUrl,
    plans: planIds,
    features: {
      pix: true,
      boleto: true,
      creditCard: true,
      installments: true,
      maxInstallments: 12,
      interestFreeLimit: 3 // First 3 installments interest-free
    },
    successUrl: `${baseUrl}/payment/success`,
    cancelUrl: `${baseUrl}/payment/cancel`,
    pixExpirationMinutes: 30,
    boletoExpirationDays: 3
  };
}

/**
 * PagSeguro Plan Definitions
 * Prices in cents (Brazilian Real)
 */
export const PAGSEGURO_PLANS: Record<string, PagSeguroPlan> = {
  // Premium Monthly
  premium_monthly: {
    id: PAGSEGURO_PLAN_IDS.test.premium.monthly,
    name: 'Medicamenta Premium - Mensal',
    description: 'Plano premium com recursos avançados de gerenciamento',
    amount: {
      value: 1490, // R$ 14,90
      currency: 'BRL'
    },
    interval: 'monthly',
    trialDays: 7,
    internalPlanId: 'premium'
  },
  
  // Premium Yearly
  premium_yearly: {
    id: PAGSEGURO_PLAN_IDS.test.premium.yearly,
    name: 'Medicamenta Premium - Anual',
    description: 'Plano premium anual com 2 meses de desconto',
    amount: {
      value: 14900, // R$ 149,00 (10 meses pelo preço de 12)
      currency: 'BRL'
    },
    interval: 'yearly',
    trialDays: 7,
    internalPlanId: 'premium'
  },
  
  // Family Monthly
  family_monthly: {
    id: PAGSEGURO_PLAN_IDS.test.family.monthly,
    name: 'Medicamenta Family - Mensal',
    description: 'Plano família para até 5 usuários',
    amount: {
      value: 2990, // R$ 29,90
      currency: 'BRL'
    },
    interval: 'monthly',
    trialDays: 7,
    internalPlanId: 'family'
  },
  
  // Family Yearly
  family_yearly: {
    id: PAGSEGURO_PLAN_IDS.test.family.yearly,
    name: 'Medicamenta Family - Anual',
    description: 'Plano família anual com 2 meses de desconto',
    amount: {
      value: 29900, // R$ 299,00 (10 meses pelo preço de 12)
      currency: 'BRL'
    },
    interval: 'yearly',
    trialDays: 7,
    internalPlanId: 'family'
  }
};

/**
 * Get PagSeguro Plan ID based on plan type and billing interval
 */
export function getPagSeguroPlanId(
  plan: 'premium' | 'family',
  billingInterval: 'monthly' | 'yearly',
  mode: 'sandbox' | 'production' = 'sandbox'
): string {
  const planIds = mode === 'production' ? PAGSEGURO_PLAN_IDS.live : PAGSEGURO_PLAN_IDS.test;
  
  return planIds[plan][billingInterval];
}

/**
 * Get Plan Details
 */
export function getPlanDetails(
  plan: 'premium' | 'family',
  billingInterval: 'monthly' | 'yearly'
): PagSeguroPlan {
  const key = `${plan}_${billingInterval}`;
  return PAGSEGURO_PLANS[key];
}

/**
 * Payment Method Configuration
 */
export const PAYMENT_METHOD_CONFIG = {
  pix: {
    enabled: true,
    name: 'PIX',
    description: 'Pagamento instantâneo',
    icon: 'qr-code-outline',
    expirationMinutes: 30,
    benefits: [
      'Aprovação instantânea',
      'Sem taxas adicionais',
      'Disponível 24/7'
    ]
  },
  boleto: {
    enabled: true,
    name: 'Boleto Bancário',
    description: 'Pagamento em até 3 dias úteis',
    icon: 'barcode-outline',
    expirationDays: 3,
    benefits: [
      'Pague em qualquer banco',
      'Pague em lotéricas',
      'Sem necessidade de cartão'
    ]
  },
  credit_card: {
    enabled: true,
    name: 'Cartão de Crédito',
    description: 'Parcelamento em até 12x',
    icon: 'card-outline',
    maxInstallments: 12,
    interestFreeLimit: 3,
    benefits: [
      'Parcele em até 12x',
      'Sem juros até 3x',
      'Aprovação imediata'
    ]
  }
};

/**
 * Currency Settings for Brazil
 */
export const CURRENCY_SETTINGS = {
  code: 'BRL',
  symbol: 'R$',
  locale: 'pt-BR',
  decimalPlaces: 2
};

/**
 * Feature Flags for PagSeguro Integration
 */
export const PAGSEGURO_FEATURES = {
  enablePix: true,
  enableBoleto: true,
  enableCreditCard: true,
  enableSubscriptions: true,
  enableInstallments: true,
  enableSandbox: !environment.production,
  
  // A/B Testing flags
  showPaymentMethodComparison: true,
  highlightRecommendedMethod: true,
  defaultPaymentMethod: 'pix' as const
};

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  cpf: {
    minLength: 11,
    maxLength: 11,
    pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
  },
  phone: {
    areaCodeLength: 2,
    minNumberLength: 8,
    maxNumberLength: 9
  },
  cep: {
    length: 8,
    pattern: /^\d{5}-?\d{3}$/
  },
  creditCard: {
    minLength: 13,
    maxLength: 19
  }
};

/**
 * Error Messages (PT-BR)
 */
export const ERROR_MESSAGES = {
  INVALID_CPF: 'CPF inválido. Verifique o número digitado.',
  INVALID_PHONE: 'Telefone inválido. Use o formato (99) 99999-9999.',
  INVALID_CEP: 'CEP inválido. Use o formato 99999-999.',
  INVALID_CARD: 'Número do cartão inválido.',
  PAYMENT_DECLINED: 'Pagamento recusado. Tente outro método de pagamento.',
  INSUFFICIENT_FUNDS: 'Saldo insuficiente. Tente outro cartão.',
  EXPIRED_PIX: 'Código PIX expirado. Gere um novo código.',
  EXPIRED_BOLETO: 'Boleto vencido. Gere um novo boleto.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  UNKNOWN_ERROR: 'Erro desconhecido. Entre em contato com o suporte.'
};

/**
 * Success Messages (PT-BR)
 */
export const SUCCESS_MESSAGES = {
  PIX_GENERATED: 'Código PIX gerado com sucesso! Escaneie o QR Code ou copie o código.',
  BOLETO_GENERATED: 'Boleto gerado com sucesso! Pague até a data de vencimento.',
  CARD_AUTHORIZED: 'Pagamento autorizado! Aguarde a confirmação.',
  SUBSCRIPTION_CREATED: 'Assinatura criada com sucesso! Bem-vindo ao plano {{plan}}.'
};

/**
 * Timing Configuration
 */
export const TIMING_CONFIG = {
  // Polling intervals
  pixPollingIntervalMs: 3000,        // Check PIX payment every 3 seconds
  maxPixPollingAttempts: 60,         // Poll for up to 3 minutes
  
  // Timeouts
  apiTimeoutMs: 30000,               // 30 seconds for API calls
  
  // Retry
  maxRetries: 3,
  retryDelayMs: 1000
};

/**
 * Analytics Events
 */
export const ANALYTICS_EVENTS = {
  PAYMENT_METHOD_SELECTED: 'pagseguro_payment_method_selected',
  PIX_CODE_GENERATED: 'pagseguro_pix_generated',
  PIX_CODE_COPIED: 'pagseguro_pix_copied',
  BOLETO_GENERATED: 'pagseguro_boleto_generated',
  CARD_FORM_SUBMITTED: 'pagseguro_card_submitted',
  PAYMENT_SUCCESS: 'pagseguro_payment_success',
  PAYMENT_FAILED: 'pagseguro_payment_failed',
  INSTALLMENT_SELECTED: 'pagseguro_installment_selected'
};
