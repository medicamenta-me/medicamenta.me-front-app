# Payment System - End-to-End Testing Guide

## Overview

Este documento descreve os testes end-to-end para o sistema de pagamentos integrado (Stripe + PagSeguro).

## Estrutura de Testes

### 1. Upgrade Flow: Free → Premium (Stripe)

**Objetivo**: Validar fluxo completo de upgrade via Stripe

**Passos**:
1. Usuário inicia no plano Free
2. Seleciona plano Premium na página de pricing
3. Escolhe Stripe como método de pagamento
4. É redirecionado para Stripe Checkout
5. Completa pagamento
6. Webhook processa evento `checkout.session.completed`
7. Subscription é atualizada no Firestore
8. Features Premium são ativadas automaticamente

**Casos de Teste**:
```typescript
describe('Stripe Upgrade Flow', () => {
  it('should create checkout session with correct parameters');
  it('should redirect to Stripe Checkout');
  it('should process webhook and activate subscription');
  it('should enable Premium features after payment');
  it('should send confirmation email');
});
```

**Validações**:
- ✅ Checkout session criada com plan correto
- ✅ Metadata inclui userId e plan
- ✅ Redirect URL configurado corretamente
- ✅ Webhook atualiza subscription status = 'active'
- ✅ Features flags atualizadas (hasAdvancedInsights, hasOCRScanner, etc)
- ✅ Limites aumentados (maxMedications = -1)

### 2. Upgrade Flow: Free → Family (PagSeguro)

**Objetivo**: Validar fluxo de upgrade via PagSeguro

**Passos**:
1. Usuário seleciona plano Family
2. Escolhe PagSeguro (PIX/Boleto/Cartão BR)
3. Cloud Function cria assinatura PagSeguro via XML
4. Usuário é redirecionado para checkout PagSeguro
5. Completa pagamento
6. PagSeguro envia notificação
7. Cloud Function processa notificação
8. Subscription atualizada

**Casos de Teste**:
```typescript
describe('PagSeguro Upgrade Flow', () => {
  it('should create PagSeguro subscription with XML');
  it('should handle PIX payment method');
  it('should handle boleto payment method');
  it('should process preApproval notification');
  it('should enable Family features after payment');
});
```

**Validações**:
- ✅ XML gerado corretamente
- ✅ Plan code configurado (FAMILY_MONTHLY ou FAMILY_YEARLY)
- ✅ Customer data validado (CPF, telefone BR)
- ✅ Notification webhook processa corretamente
- ✅ Features Family ativadas (unlimited dependents, OCR, chat)

### 3. Webhook Processing

**Objetivo**: Validar processamento correto de webhooks

#### Stripe Webhooks

**Eventos Suportados**:
- `checkout.session.completed` - Criar subscription
- `customer.subscription.created` - Confirmar criação
- `customer.subscription.updated` - Atualizar status
- `customer.subscription.deleted` - Cancelamento
- `invoice.paid` - Pagamento bem-sucedido
- `invoice.payment_failed` - Falha no pagamento

**Casos de Teste**:
```typescript
describe('Stripe Webhook Processing', () => {
  it('should create subscription on checkout.session.completed');
  it('should update status on subscription.updated');
  it('should handle subscription.deleted and downgrade to Free');
  it('should record payment on invoice.paid');
  it('should set status=past_due on payment_failed');
  it('should validate webhook signature');
});
```

#### PagSeguro Notifications

**Tipos de Notificação**:
- `preApproval` - Status da assinatura
- `transaction` - Status de transação individual

**Casos de Teste**:
```typescript
describe('PagSeguro Notification Processing', () => {
  it('should process preApproval notification');
  it('should update subscription on status change');
  it('should handle ACTIVE status');
  it('should handle CANCELLED status');
  it('should handle SUSPENDED status');
});
```

### 4. Feature Activation & Validation

**Objetivo**: Validar que features são ativadas/desativadas corretamente

**Casos de Teste**:
```typescript
describe('Feature Activation', () => {
  // Free Plan Limits
  it('should limit medications to 5 on Free plan');
  it('should limit dependents to 1 on Free plan');
  it('should block OCR scanner on Free plan');
  it('should block advanced insights on Free plan');
  
  // Premium Plan Features
  it('should allow unlimited medications on Premium');
  it('should allow up to 5 dependents on Premium');
  it('should enable OCR scanner with 20 scans/month');
  it('should enable advanced insights');
  it('should enable interaction checker');
  
  // Family Plan Features
  it('should allow unlimited dependents on Family');
  it('should allow unlimited OCR scans on Family');
  it('should enable family chat');
  it('should enable family dashboard');
  it('should allow 3 teleconsults/month');
});
```

**Validações**:
- ✅ FeatureMappingService retorna limites corretos
- ✅ canUseFeature() valida corretamente
- ✅ getRemainingQuota() calcula saldo correto
- ✅ Upgrade/downgrade atualiza features imediatamente

### 5. Cancellation & Reactivation

**Objetivo**: Validar cancelamento e reativação de assinaturas

**Casos de Teste**:
```typescript
describe('Subscription Cancellation', () => {
  it('should cancel Stripe subscription at period end');
  it('should cancel PagSeguro subscription immediately');
  it('should maintain access until period end');
  it('should set cancelAtPeriodEnd flag');
  it('should reactivate before period end');
  it('should downgrade to Free after period end');
});
```

**Fluxos**:

**Cancelamento Stripe**:
1. User clica "Cancelar"
2. Modal confirma "Cancelar no fim do período?"
3. StripePaymentService.cancelSubscription(subscriptionId)
4. Cloud Function chama Stripe API
5. Subscription.cancel_at_period_end = true
6. Firestore atualizado
7. User mantém acesso até currentPeriodEnd

**Reativação**:
1. User clica "Reativar"
2. StripePaymentService.reactivateSubscription(subscriptionId)
3. Stripe API: subscription.update({ cancel_at_period_end: false })
4. Firestore atualizado
5. User continua com plano ativo

### 6. Payment History

**Objetivo**: Validar histórico de pagamentos

**Casos de Teste**:
```typescript
describe('Payment History', () => {
  it('should fetch Stripe invoice history');
  it('should fetch PagSeguro transaction history');
  it('should format amounts correctly');
  it('should map payment methods correctly');
  it('should display payment status (paid/pending/failed)');
  it('should provide invoice PDF links');
});
```

**Dados Esperados**:
```typescript
interface PaymentHistoryItem {
  id: string;
  date: Date;
  amount: number; // R$ 29.90
  status: 'paid' | 'pending' | 'failed';
  method: 'Cartão de Crédito' | 'PIX' | 'Boleto';
  invoice?: string; // PDF URL
}
```

### 7. Sync Operations

**Objetivo**: Validar sincronização com provedores de pagamento

**Casos de Teste**:
```typescript
describe('Subscription Sync', () => {
  it('should sync status with Stripe');
  it('should sync status with PagSeguro');
  it('should handle sync errors gracefully');
  it('should update local subscription after sync');
});
```

**Uso**:
```typescript
// Manual sync se houver inconsistências
await subscriptionService.syncWithStripe(userId, subscriptionId);
await subscriptionService.syncWithPagSeguro(userId, subscriptionCode);
```

### 8. Error Handling

**Objetivo**: Validar tratamento de erros

**Casos de Teste**:
```typescript
describe('Error Handling', () => {
  it('should handle Stripe API errors');
  it('should handle PagSeguro API errors');
  it('should handle network timeouts');
  it('should display user-friendly error messages');
  it('should log errors for debugging');
  it('should not expose sensitive data in errors');
});
```

**Erros Comuns**:
- ❌ Invalid API key → "Erro de configuração. Contate suporte."
- ❌ Payment failed → "Pagamento recusado. Verifique seus dados."
- ❌ Network timeout → "Erro de conexão. Tente novamente."
- ❌ Invalid plan → "Plano inválido. Atualize a página."

## Ambiente de Testes

### Configuração

**1. Firebase Emulators**:
```bash
firebase emulators:start
```

**2. Stripe Test Mode**:
```typescript
// environment.test.ts
stripe: {
  publishableKey: 'pk_test_...',
  secretKey: 'sk_test_...'
}
```

**3. PagSeguro Sandbox**:
```typescript
// environment.test.ts
pagseguro: {
  email: 'sandbox@email.com',
  token: 'sandbox_token',
  environment: 'sandbox'
}
```

### Dados de Teste

**Cartões Stripe**:
- ✅ Sucesso: `4242 4242 4242 4242`
- ❌ Falha: `4000 0000 0000 0002`
- ⏳ 3D Secure: `4000 0027 6000 3184`

**CPF PagSeguro**:
- Sandbox: `123.456.789-00`

### Comandos

```bash
# Rodar testes unitários
npm test

# Rodar testes E2E
npm run e2e

# Rodar testes de integração
npm run test:integration

# Coverage report
npm run test:coverage
```

## Checklist de Testes

### Pré-Deploy
- [ ] Todos os testes unitários passando
- [ ] Testes E2E passando em ambiente de staging
- [ ] Webhooks testados com Stripe CLI
- [ ] Notificações PagSeguro testadas em sandbox
- [ ] Features ativadas corretamente após pagamento
- [ ] Cancelamento funcionando
- [ ] Histórico de pagamentos carregando
- [ ] Error handling validado

### Pós-Deploy
- [ ] Monitorar webhooks em produção
- [ ] Verificar logs de Cloud Functions
- [ ] Validar assinaturas criadas corretamente
- [ ] Confirmar features ativadas
- [ ] Monitorar falhas de pagamento

## Métricas de Sucesso

**KPIs**:
- ✅ Taxa de conversão Free → Premium: > 5%
- ✅ Taxa de conversão Free → Family: > 3%
- ✅ Taxa de sucesso de checkout: > 95%
- ✅ Taxa de webhook processado: > 99%
- ✅ Tempo médio de ativação: < 5 segundos
- ✅ Taxa de cancelamento: < 10%/mês

## Debugging

### Logs Importantes

**Cloud Functions**:
```bash
firebase functions:log --only stripeWebhook
firebase functions:log --only pagseguroNotification
```

**Firestore**:
```typescript
// Verificar subscription
const sub = await getDoc(doc(firestore, `users/${userId}/subscription/current`));
console.log(sub.data());
```

**Stripe Dashboard**:
- Events → Ver todos os webhooks recebidos
- Subscriptions → Status de cada assinatura
- Invoices → Histórico de pagamentos

**PagSeguro Dashboard**:
- Assinaturas → Status e transações
- Notificações → Log de notificações enviadas

## Troubleshooting

### Problema: Webhook não processa

**Solução**:
1. Verificar URL do webhook configurada
2. Verificar secret/token configurado
3. Ver logs do Cloud Functions
4. Testar com Stripe CLI: `stripe listen --forward-to localhost:5001/...`

### Problema: Features não ativam após pagamento

**Solução**:
1. Verificar webhook foi processado
2. Verificar Firestore foi atualizado
3. Verificar FeatureMappingService carregou subscription
4. Forçar reload: `subscriptionService.loadSubscription(userId)`

### Problema: Pagamento aprovado mas status = 'incomplete'

**Solução**:
1. Verificar `invoice.paid` webhook foi recebido
2. Verificar metadata no checkout session
3. Sync manual: `syncWithStripe(userId, subscriptionId)`

## Próximos Passos

- [ ] Adicionar testes de carga (stress testing)
- [ ] Implementar retry logic para webhooks
- [ ] Adicionar telemetria com Firebase Analytics
- [ ] Criar dashboard de métricas de pagamento
- [ ] Implementar A/B testing em pricing page
- [ ] Adicionar testes de acessibilidade
- [ ] Implementar testes de performance
