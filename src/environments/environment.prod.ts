/**
 * 🌍 Environment Configuration - Production
 * Configuração de ambiente de produção para o App Mobile
 *
 * IMPORTANTE: Chaves sensíveis (Stripe live, PagSeguro prod) devem ser
 * configuradas via variáveis de ambiente no CI/CD, nunca commitadas.
 *
 * @see PRD NF-SEC-001, SEC-A05-001
 */

export const environment = {
  production: true,
  appName: 'Medicamenta.me',
  appVersion: '1.0.0',
  subdomain: 'app',

  // API Backend URL (southamerica-east1 — LGPD Art. 33)
  apiUrl: 'https://southamerica-east1-medicamenta-me.cloudfunctions.net/api',

  // Firebase (COMPARTILHADO com todos os subdomínios)
  firebase: {
    apiKey: 'AIzaSyA4uG_OSiD2l1KSonnXX8KUzglSmdGWY5w',
    authDomain: 'medicamenta-me.firebaseapp.com',
    projectId: 'medicamenta-me',
    storageBucket: 'medicamenta-me.firebasestorage.app',
    messagingSenderId: '968554765515',
    appId: '1:968554765515:web:e1d9c556460489ad6b0f4e',
    measurementId: 'G-TR654WQM81'
  },

  // Stripe Configuration (Live Mode)
  // Keys injected via CI/CD environment variables
  stripe: {
    testPublishableKey: '',

    prices: {
      premium: {
        monthly: 'price_premium_monthly_brl',
        yearly: 'price_premium_yearly_brl'
      },
      family: {
        monthly: 'price_family_monthly_brl',
        yearly: 'price_family_yearly_brl'
      }
    }
  },

  // PagSeguro Configuration (Production Mode)
  // Keys injected via CI/CD environment variables
  pagseguro: {
    testPublicKey: '',

    plans: {
      premium: {
        monthly: 'PLAN_PROD_PREMIUM_MONTHLY',
        yearly: 'PLAN_PROD_PREMIUM_YEARLY'
      },
      family: {
        monthly: 'PLAN_PROD_FAMILY_MONTHLY',
        yearly: 'PLAN_PROD_FAMILY_YEARLY'
      }
    }
  }
};
