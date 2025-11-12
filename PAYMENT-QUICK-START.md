# 💳 Payment System - Quick Start Guide

## Resumo Rápido

Sistema de pagamentos completo com **Stripe** (internacional) + **PagSeguro** (Brasil) para Medicamenta.me.

**Status**: ✅ 100% Completo | **4,500+ linhas** | **18 arquivos**

---

## 📁 Arquivos Principais

### Frontend
- `services/stripe-payment.service.ts` - Stripe integration
- `services/pagseguro-payment.service.ts` - PagSeguro integration
- `services/subscription.service.ts` - Unified subscription management
- `pages/pricing/` - Pricing comparison page
- `pages/onboarding-plans/` - Onboarding conversion page

### Backend
- `functions/src/stripe-functions.ts` - 10 Stripe Cloud Functions
- `functions/src/pagseguro-functions.ts` - 7 PagSeguro Cloud Functions

### Documentation
- `PAYMENT-SYSTEM-FINAL-REPORT.md` - Complete implementation report
- `PAYMENT-SYSTEM-E2E-TESTING.md` - Testing guide
- `PAYMENT-SYSTEM-IMPLEMENTATION-REPORT.md` - Technical documentation

---

## 🚀 Deploy Rápido

### 1. Configure Environment

```typescript
// src/environments/environment.prod.ts
export const environment = {
  stripe: {
    publishableKey: 'pk_live_YOUR_KEY',
    monthlyPriceId: 'price_YOUR_ID',
    yearlyPriceId: 'price_YOUR_ID'
  },
  pagseguro: {
    email: 'your@email.com',
    token: 'YOUR_TOKEN',
    environment: 'production'
  },
  functionsUrl: 'https://us-central1-YOUR_PROJECT.cloudfunctions.net'
};
```

### 2. Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 3. Configure Webhooks

**Stripe Dashboard** → Webhooks:
```
URL: https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
Events: checkout.session.completed, customer.subscription.*, invoice.*
```

**PagSeguro Dashboard** → Notificações:
```
URL: https://us-central1-YOUR_PROJECT.cloudfunctions.net/pagseguroNotification
Tipo: Assinatura
```

### 4. Test

```bash
# Test Stripe webhook locally
stripe listen --forward-to localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook

# Test payment flow
npm start
# Navigate to /pricing or /onboarding/plans
```

---

## 💰 Planos

| Plano | Mensal | Anual (17% off) |
|-------|--------|-----------------|
| Free | R$ 0 | R$ 0 |
| Premium | R$ 29,90 | R$ 24,90 |
| Family | R$ 49,90 | R$ 41,60 |
| Enterprise | Custom | Custom |

---

## 🔄 Fluxos

### Upgrade via Stripe
```typescript
// User clicks "Começar Premium"
await subscriptionService.upgradeViaStripe(
  userId,
  'premium',
  'monthly',
  'https://app.com/success',
  'https://app.com/cancel'
);
// → Redirects to Stripe Checkout
// → User pays
// → Webhook activates features ✅
```

### Upgrade via PagSeguro
```typescript
// User clicks "Começar Family"
await subscriptionService.upgradeViaPagSeguro(
  userId,
  'family',
  'monthly',
  user.email,
  user.name,
  user.phone
);
// → Redirects to PagSeguro
// → User pays (PIX/Boleto/Cartão)
// → Notification activates features ✅
```

### Cancel
```typescript
await subscriptionService.cancelSubscriptionViaProvider(userId);
// Maintains access until period end
```

### Reactivate
```typescript
await subscriptionService.reactivateSubscriptionViaProvider(userId);
// Resumes subscription
```

---

## 🧪 Testing

### Test Cards (Stripe)
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`

### Test Environment
```bash
# Start emulators
firebase emulators:start

# Run tests
npm test
```

---

## 📊 Monitor

### Logs
```bash
# Cloud Functions
firebase functions:log --only stripeWebhook
firebase functions:log --only pagseguroNotification

# Firestore
# Check: /users/{userId}/subscription/current
```

### Dashboards
- **Stripe**: https://dashboard.stripe.com
- **PagSeguro**: https://pagseguro.uol.com.br

---

## 🐛 Troubleshooting

### Webhook não processa
1. Verifique URL configurada
2. Verifique secret/token
3. Veja logs: `firebase functions:log`
4. Teste: `stripe listen --forward-to ...`

### Features não ativam
1. Verificar webhook processado
2. Verificar Firestore atualizado
3. Force reload: `subscriptionService.loadSubscription(userId)`

### Pagamento OK mas status errado
1. Sync manual: `syncWithStripe(userId, subscriptionId)`

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs
- **PagSeguro Docs**: https://dev.pagseguro.uol.com.br
- **Firebase Functions**: https://firebase.google.com/docs/functions

---

## ✅ Checklist Pré-Produção

- [ ] Stripe API keys configuradas (live mode)
- [ ] PagSeguro credentials configuradas (production)
- [ ] Webhooks URLs configuradas
- [ ] Cloud Functions deployed
- [ ] Firestore security rules atualizadas
- [ ] Testado fluxo completo
- [ ] Monitoring configurado
- [ ] Primeiro pagamento validado

---

**Status**: 🚀 Ready for Production  
**Version**: 1.0.0  
**Date**: November 10, 2025
