# 🔑 Guia de Configuração de Credenciais - Stripe & PagSeguro

Este guia explica passo a passo como obter e configurar as credenciais do Stripe e PagSeguro.

---

## 📋 Índice

1. [Configuração do Stripe](#stripe)
2. [Configuração do PagSeguro](#pagseguro)
3. [Configuração do Firebase Functions](#firebase-functions)
4. [Configuração dos Webhooks](#webhooks)
5. [Testes](#testes)

---

## 🔵 Stripe Configuration

### Passo 1: Criar Conta no Stripe

1. Acesse: https://dashboard.stripe.com/register
2. Crie uma conta (aceita contas brasileiras)
3. Complete o cadastro e verificação

### Passo 2: Obter API Keys (Test Mode)

1. Acesse: https://dashboard.stripe.com/test/apikeys
2. Você verá duas chaves:
   - **Publishable key** (começa com `pk_test_`)
   - **Secret key** (começa com `sk_test_`) - **NÃO COMPARTILHE!**

### Passo 3: Criar Produtos e Preços

1. Acesse: https://dashboard.stripe.com/test/products
2. Clique em **"+ Create product"**

#### Produto 1: Premium Plan

```
Name: Medicamenta.me Premium
Description: Plano Premium com medicamentos ilimitados, OCR e IA
```

**Criar Preço Mensal:**
- Pricing model: Standard pricing
- Price: BRL 29.90
- Billing period: Monthly
- Copiar o **Price ID** (começa com `price_`)

**Criar Preço Anual:**
- Clique em "Add another price"
- Price: BRL 24.90
- Billing period: Monthly
- ☑️ Bill on same day each month
- Copiar o **Price ID**

#### Produto 2: Family Plan

```
Name: Medicamenta.me Família
Description: Plano Família completo com dependentes ilimitados
```

**Criar Preço Mensal:**
- Price: BRL 49.90
- Billing period: Monthly
- Copiar o **Price ID**

**Criar Preço Anual:**
- Price: BRL 41.60
- Billing period: Monthly
- Copiar o **Price ID**

##1# Passo 4: Configurar no Frontend

Edite `src/environments/environment.ts`:

```typescript
stripe: {
  testPublishableKey: 'pk_test_51Abc...xyz', // Sua chave pública
  
  prices: {
    premium: {
      monthly: 'price_1ABC...DEF',    // ID do preço mensal Premium
      yearly: 'price_1GHI...JKL'      // ID do preço anual Premium
    },
    family: {
      monthly: 'price_1MNO...PQR',    // ID do preço mensal Family
      yearly: 'price_1STU...VWX'      // ID do preço anual Family
    }
  }
}
```

### Passo 5: Configurar no Backend (Firebase Functions)

#### Opção 1: Via Firebase Console (Recomendado)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Configurar secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
# Cole aqui: sk_test_51Abc...xyz

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# (Será configurado depois no Passo 6)
```

#### Opção 2: Via arquivo .env (Desenvolvimento Local)

Crie `functions/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_51Abc...xyz
STRIPE_WEBHOOK_SECRET=whsec_...
```

**⚠️ IMPORTANTE**: Adicione `.env` ao `.gitignore`!

### Passo 6: Configurar Webhook (Depois do Deploy)

1. Deploy das functions primeiro:
```bash
cd functions
npm install
firebase deploy --only functions
```

2. Copie a URL da função `stripeWebhook`:
```
https://us-central1-medicamenta-me.cloudfunctions.net/stripeWebhook
```

3. Acesse: https://dashboard.stripe.com/test/webhooks
4. Clique em **"+ Add endpoint"**
5. Cole a URL da função
6. Selecione eventos:
   - ☑️ `checkout.session.completed`
   - ☑️ `customer.subscription.created`
   - ☑️ `customer.subscription.updated`
   - ☑️ `customer.subscription.deleted`
   - ☑️ `invoice.paid`
   - ☑️ `invoice.payment_failed`

7. Copie o **Signing secret** (começa com `whsec_`)
8. Configure no Firebase:
```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Cole: whsec_...
```

---

## 🟢 PagSeguro Configuration

### Passo 1: Criar Conta no PagSeguro

1. Acesse: https://pagseguro.uol.com.br
2. Crie uma conta empresarial
3. Complete o cadastro e verificação

### Passo 2: Ativar Modo Sandbox

1. Acesse: https://sandbox.pagseguro.uol.com.br
2. Faça login com sua conta PagSeguro
3. Você terá acesso a um ambiente de testes separado

### Passo 3: Obter Credenciais

1. Acesse: https://sandbox.pagseguro.uol.com.br/preferencias/integracoes.html
2. Anote:
   - **Email**: seu-email@sandbox.pagseguro.com.br
   - **Token**: clique em "Gerar novo token"

### Passo 4: Criar Planos de Assinatura

**⚠️ IMPORTANTE**: PagSeguro exige criação de planos via API (não há interface web)

Você pode usar o script helper ou fazer manualmente via Postman:

#### Script Helper (Recomendado)

Crie `scripts/create-pagseguro-plans.js`:

```javascript
const axios = require('axios');
const xml2js = require('xml2js');

const PAGSEGURO_EMAIL = 'seu-email@sandbox.pagseguro.com.br';
const PAGSEGURO_TOKEN = 'SEU_TOKEN_AQUI';
const SANDBOX_URL = 'https://ws.sandbox.pagseguro.uol.com.br/pre-approvals/request';

async function createPlan(planData) {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<preApprovalRequest>
  <reference>${planData.reference}</reference>
  <name>${planData.name}</name>
  <charge>${planData.charge}</charge>
  <period>${planData.period}</period>
  <amountPerPayment>${planData.amount}</amountPerPayment>
  <maxTotalAmount>${planData.maxAmount}</maxTotalAmount>
</preApprovalRequest>`;

  try {
    const response = await axios.post(
      `${SANDBOX_URL}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`,
      xml,
      { headers: { 'Content-Type': 'application/xml' } }
    );

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    return result.preApprovalRequest.code[0];
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  // Premium Mensal
  const premiumMonthly = await createPlan({
    reference: 'PREMIUM_MONTHLY',
    name: 'Medicamenta.me Premium Mensal',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '29.90',
    maxAmount: '358.80' // 29.90 * 12
  });
  console.log('Premium Mensal:', premiumMonthly);

  // Premium Anual
  const premiumYearly = await createPlan({
    reference: 'PREMIUM_YEARLY',
    name: 'Medicamenta.me Premium Anual',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '24.90',
    maxAmount: '298.80' // 24.90 * 12
  });
  console.log('Premium Anual:', premiumYearly);

  // Family Mensal
  const familyMonthly = await createPlan({
    reference: 'FAMILY_MONTHLY',
    name: 'Medicamenta.me Família Mensal',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '49.90',
    maxAmount: '598.80'
  });
  console.log('Family Mensal:', familyMonthly);

  // Family Anual
  const familyYearly = await createPlan({
    reference: 'FAMILY_YEARLY',
    name: 'Medicamenta.me Família Anual',
    charge: 'AUTO',
    period: 'MONTHLY',
    amount: '41.60',
    maxAmount: '499.20'
  });
  console.log('Family Anual:', familyYearly);
}

main();
```

Execute:
```bash
npm install axios xml2js
node scripts/create-pagseguro-plans.js
```

### Passo 5: Configurar no Frontend

Edite `src/environments/environment.ts`:

```typescript
pagseguro: {
  testPublicKey: 'PUBLIC_KEY_FROM_DASHBOARD',
  
  plans: {
    premium: {
      monthly: 'CODIGO_RETORNADO_PREMIUM_MONTHLY',
      yearly: 'CODIGO_RETORNADO_PREMIUM_YEARLY'
    },
    family: {
      monthly: 'CODIGO_RETORNADO_FAMILY_MONTHLY',
      yearly: 'CODIGO_RETORNADO_FAMILY_YEARLY'
    }
  }
}
```

### Passo 6: Configurar no Backend

```bash
firebase functions:secrets:set PAGSEGURO_EMAIL
# Cole: seu-email@sandbox.pagseguro.com.br

firebase functions:secrets:set PAGSEGURO_TOKEN
# Cole: SEU_TOKEN_AQUI
```

### Passo 7: Configurar Webhook de Notificação

1. Deploy das functions:
```bash
firebase deploy --only functions
```

2. Copie a URL da função:
```
https://us-central1-medicamenta-me.cloudfunctions.net/pagseguroNotification
```

3. Acesse: https://sandbox.pagseguro.uol.com.br/preferencias/integracoes.html
4. Em "Notificações de Transações":
   - URL: Cole a URL da função
   - Tipo: Assinatura (preApproval)
5. Salve

---

## 🔥 Firebase Functions Environment

### Arquivo de Configuração Completo

As funções precisam acessar as credenciais. Configure via Firebase Secrets:

```bash
# Stripe
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# PagSeguro
firebase functions:secrets:set PAGSEGURO_EMAIL
firebase functions:secrets:set PAGSEGURO_TOKEN
```

### Verificar Secrets Configurados

```bash
firebase functions:secrets:access STRIPE_SECRET_KEY
firebase functions:secrets:access PAGSEGURO_EMAIL
```

### Atualizar Functions para Usar Secrets

Certifique-se que `functions/src/stripe-functions.ts` e `functions/src/pagseguro-functions.ts` usam:

```typescript
import { defineSecret } from 'firebase-functions/params';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2023-10-16'
    });
    // ...
  }
);
```

---

## 🔗 Configuração de Webhooks

### Testar Webhooks Localmente (Stripe)

```bash
# Instalar Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:5001/medicamenta-me/us-central1/stripeWebhook

# Em outro terminal, iniciar emuladores
firebase emulators:start

# Testar um evento
stripe trigger checkout.session.completed
```

### Testar Webhooks Localmente (PagSeguro)

PagSeguro não tem CLI, use ferramentas como:
- **ngrok** para expor localhost
- **Postman** para simular notificações

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 5001
ngrok http 5001

# Use a URL do ngrok no dashboard PagSeguro
# Ex: https://abc123.ngrok.io/medicamenta-me/us-central1/pagseguroNotification
```

---

## 🧪 Testes

### Testar Stripe

**Cartões de Teste:**
```
Sucesso:        4242 4242 4242 4242
Falha:          4000 0000 0000 0002
3D Secure:      4000 0027 6000 3184
Expiry:         Qualquer data futura (ex: 12/25)
CVC:            Qualquer 3 dígitos (ex: 123)
```

### Testar PagSeguro (Sandbox)

**Dados de Teste:**
```
CPF:            123.456.789-00
Telefone:       (11) 98765-4321
Email:          comprador@sandbox.pagseguro.com.br
```

**Cartão de Teste:**
```
Número:         4111 1111 1111 1111
Validade:       12/30
CVV:            123
Nome:           JOSE COMPRADOR
```

---

## ✅ Checklist de Configuração

### Development (Test/Sandbox)

- [ ] Stripe Test Keys configuradas
- [ ] Stripe Products criados
- [ ] Stripe Price IDs copiados
- [ ] PagSeguro Sandbox conta criada
- [ ] PagSeguro Token obtido
- [ ] PagSeguro Planos criados
- [ ] Firebase Secrets configurados
- [ ] Webhooks configurados (após deploy)
- [ ] Testado fluxo completo

### Production

- [ ] Stripe Live Keys obtidas
- [ ] Stripe Products em modo Live criados
- [ ] PagSeguro conta verificada
- [ ] PagSeguro credenciais de produção
- [ ] PagSeguro planos em produção criados
- [ ] Firebase Secrets atualizados para produção
- [ ] Webhooks URLs de produção configurados
- [ ] SSL/HTTPS verificado
- [ ] Primeiro pagamento real testado

---

## 🚨 Segurança

### ⚠️ NUNCA:
- ❌ Comitar chaves secretas no Git
- ❌ Compartilhar Secret Keys publicamente
- ❌ Usar chaves de produção em desenvolvimento
- ❌ Expor tokens em código frontend

### ✅ SEMPRE:
- ✅ Usar Firebase Secrets para chaves sensíveis
- ✅ Adicionar `.env` ao `.gitignore`
- ✅ Validar webhook signatures
- ✅ Usar HTTPS em produção
- ✅ Rotacionar tokens periodicamente

---

## 🆘 Troubleshooting

### Erro: "Invalid API Key"
- Verifique se copiou a chave completa
- Confirme que está usando Test key em dev
- Verifique Firebase Secrets: `firebase functions:secrets:access STRIPE_SECRET_KEY`

### Erro: "Webhook signature verification failed"
- Verifique STRIPE_WEBHOOK_SECRET
- Confirme que a URL do webhook está correta
- Veja logs: `firebase functions:log --only stripeWebhook`

### Erro: "PagSeguro authentication failed"
- Verifique email e token
- Confirme que está usando Sandbox para testes
- Verifique se o token não expirou

### Webhook não recebe eventos
- Confirme deploy: `firebase deploy --only functions`
- Verifique URL do webhook no dashboard
- Teste com Stripe CLI: `stripe trigger checkout.session.completed`
- Veja logs: `firebase functions:log`

---

## 📚 Recursos

### Stripe
- Dashboard: https://dashboard.stripe.com
- Documentação: https://stripe.com/docs
- API Reference: https://stripe.com/docs/api
- Testing: https://stripe.com/docs/testing

### PagSeguro
- Dashboard: https://pagseguro.uol.com.br
- Sandbox: https://sandbox.pagseguro.uol.com.br
- Documentação: https://dev.pagseguro.uol.com.br
- API Assinaturas: https://dev.pagseguro.uol.com.br/reference/criar-plano-de-assinatura

### Firebase
- Console: https://console.firebase.google.com
- Functions Secrets: https://firebase.google.com/docs/functions/config-env
- CLI Reference: https://firebase.google.com/docs/cli

---

## 🎯 Próximos Passos

Após configurar tudo:

1. **Deploy**: `firebase deploy --only functions`
2. **Testar**: Fazer um pagamento de teste
3. **Monitorar**: `firebase functions:log`
4. **Verificar**: Subscription criada no Firestore
5. **Validar**: Features ativadas corretamente

Está tudo pronto! 🚀
