/**
 * 🌍 Environment Configuration - Development
 * Configuração de ambiente de desenvolvimento para o App Mobile
 */

export const environment = {
  production: false,
  appName: 'Medicamenta.me',
  appVersion: '1.0.0',
  subdomain: 'app',
  
  // API Backend URL
  apiUrl: 'http://localhost:5001/medicamenta-me/us-central1/api',
  
  // Firebase (COMPARTILHADO com todos os subdomínios)
  firebase: {
    apiKey: "AIzaSyA4uG_OSiD2l1KSonnXX8KUzglSmdGWY5w",
    authDomain: "medicamenta-me.firebaseapp.com",
    projectId: "medicamenta-me",
    storageBucket: "medicamenta-me.firebasestorage.app",
    messagingSenderId: "968554765515",
    appId: "1:968554765515:web:e1d9c556460489ad6b0f4e",
    measurementId: "G-TR654WQM81"
  },
  
  // Stripe Configuration (Test Mode)
  // IMPORTANT: Replace with your actual Stripe test keys from https://dashboard.stripe.com/test/apikeys
  stripe: {
    testPublishableKey: 'pk_test_51SSLh6KHG6dk129b5GC9wT1NG6EoUZ6UYo9YPcK14v7WToPZ7Nf1sngqQ9Zlsxtg38kyUU8GaZSoXjKiN2H9mjBT00pW82UoQS',
    
    // Price IDs from Stripe Dashboard > Products
    // Create products first, then update these IDs
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
  
  // PagSeguro Configuration (Sandbox Mode - Brazilian Market)
  // IMPORTANT: Replace with your actual PagSeguro credentials from https://pagseguro.uol.com.br
  pagseguro: {
    testPublicKey: 'PUBLIC_KEY_REPLACE_WITH_YOUR_PAGSEGURO_TEST_PUBLIC_KEY',
    
    // Plan IDs will be created in PagSeguro Dashboard
    // These are placeholders - update after creating plans
    plans: {
      premium: {
        monthly: 'PLAN_TEST_PREMIUM_MONTHLY',
        yearly: 'PLAN_TEST_PREMIUM_YEARLY'
      },
      family: {
        monthly: 'PLAN_TEST_FAMILY_MONTHLY',
        yearly: 'PLAN_TEST_FAMILY_YEARLY'
      }
    }
  }
};
