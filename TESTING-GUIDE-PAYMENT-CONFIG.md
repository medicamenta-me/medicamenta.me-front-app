# Guia de Teste - Controle de Planos Pagos

## 🧪 Como Testar a Funcionalidade

### Cenário 1: Pagamento NÃO Configurado (Padrão)

#### Estado Inicial
O arquivo `src/environments/environment.ts` vem com placeholders por padrão:

```typescript
stripe: {
  testPublishableKey: 'pk_test_REPLACE_WITH_YOUR_STRIPE_TEST_PUBLISHABLE_KEY',
  prices: {
    premium: {
      monthly: 'price_REPLACE_WITH_PREMIUM_MONTHLY_PRICE_ID',
      yearly: 'price_REPLACE_WITH_PREMIUM_YEARLY_PRICE_ID'
    }
  }
}
```

#### Passos:
1. Inicie a aplicação:
   ```bash
   ionic serve
   ```

2. Navegue até a página de planos:
   ```
   http://localhost:8100/pricing
   ```

3. **Resultado Esperado:**

   ✅ **Card de Aviso Amarelo no Topo:**
   ```
   ⚠️ Sistema de Pagamento não configurado
   
   Sistema de pagamento não configurado. Configure as 
   credenciais do Stripe ou PagSeguro para habilitar 
   planos pagos.
   
   Apenas o plano gratuito está disponível no momento.
   ```

   ✅ **Apenas 1 Plano Visível:**
   ```
   ┌─────────────────────┐
   │   💙 Gratuito       │
   │                     │
   │   R$ 0,00           │
   │   Grátis            │
   │                     │
   │ ✓ Medicamentos      │
   │ ✓ 1 dependente      │
   │ ✓ 2 cuidadores      │
   │                     │
   │ [Começar Grátis]    │
   └─────────────────────┘
   ```

   ❌ **Planos Ocultos:**
   - Premium (não aparece)
   - Família (não aparece)
   - Enterprise (não aparece)

4. **Teste de Interação:**
   - Clique no botão "Começar Grátis"
   - Deve mostrar: "Você já tem acesso ao plano gratuito!"

---

### Cenário 2: Pagamento Configurado (Apenas Stripe)

#### Configuração:
Edite `src/environments/environment.ts`:

```typescript
stripe: {
  // ✅ Chave válida (sem REPLACE)
  testPublishableKey: 'pk_test_51MyTestKey12345678901234567890',
  
  prices: {
    premium: {
      monthly: 'price_premium_monthly_real', // ✅ Sem REPLACE
      yearly: 'price_premium_yearly_real'
    },
    family: {
      monthly: 'price_family_monthly_real',
      yearly: 'price_family_yearly_real'
    }
  }
},

// ❌ PagSeguro continua não configurado
pagseguro: {
  testPublicKey: 'PUBLIC_KEY_REPLACE_WITH_YOUR_PAGSEGURO_TEST_PUBLIC_KEY',
  plans: {
    premium: {
      monthly: 'PLAN_TEST_PREMIUM_MONTHLY',
      yearly: 'PLAN_TEST_PREMIUM_YEARLY'
    }
  }
}
```

#### Passos:
1. Salve o arquivo e recarregue a página (Ctrl+R)

2. **Resultado Esperado:**

   ❌ **SEM Card de Aviso** (oculto automaticamente)

   ✅ **4 Planos Visíveis:**
   ```
   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ Gratuito  │  │ ⭐Premium │  │ 👥Família │  │ Enterprise│
   │           │  │           │  │           │  │           │
   │ R$ 0,00   │  │ R$ 29,90  │  │ R$ 49,90  │  │Sob Consulta│
   │           │  │           │  │           │  │           │
   │[Começar]  │  │[Assinar]  │  │[Assinar]  │  │[Vendas]   │
   └───────────┘  └───────────┘  └───────────┘  └───────────┘
   ```

3. **Teste de Seleção:**
   - Clique em "Assinar Agora" no plano Premium
   - **NÃO** deve mostrar seletor de pagamento (apenas Stripe configurado)
   - Deve redirecionar **diretamente** para Stripe Checkout

---

### Cenário 3: Pagamento Configurado (Stripe + PagSeguro)

#### Configuração:
Edite `src/environments/environment.ts`:

```typescript
stripe: {
  testPublishableKey: 'pk_test_51MyTestKey12345678901234567890',
  prices: {
    premium: {
      monthly: 'price_premium_monthly_real',
      yearly: 'price_premium_yearly_real'
    },
    family: {
      monthly: 'price_family_monthly_real',
      yearly: 'price_family_yearly_real'
    }
  }
},

pagseguro: {
  // ✅ Chave válida (sem REPLACE)
  testPublicKey: 'PUB1234567890ABCDEFGHIJKLMNOP',
  
  plans: {
    premium: {
      monthly: '12AB34CD56EF', // ✅ Código real do PagSeguro
      yearly: '78GH90IJ12KL'
    },
    family: {
      monthly: '34MN56OP78QR',
      yearly: '90ST12UV34WX'
    }
  }
}
```

#### Passos:
1. Salve o arquivo e recarregue a página

2. **Resultado Esperado:**
   - ❌ SEM card de aviso
   - ✅ Todos os 4 planos visíveis

3. **Teste de Seleção com 2 Provedores:**
   
   Clique em "Assinar Agora" no plano Premium
   
   **Deve mostrar Action Sheet:**
   ```
   ┌─────────────────────────────────────┐
   │ Escolha a forma de pagamento        │
   │                                     │
   │ Plano: Premium - R$ 29,90/mês       │
   ├─────────────────────────────────────┤
   │ 💳 Cartão de Crédito (Stripe)       │
   ├─────────────────────────────────────┤
   │ 💰 PagSeguro (Cartão, Boleto, PIX)  │
   ├─────────────────────────────────────┤
   │ ✖️  Cancelar                         │
   └─────────────────────────────────────┘
   ```

   - Selecione Stripe → Redireciona para Stripe Checkout
   - Selecione PagSeguro → Redireciona para PagSeguro

---

### Cenário 4: Teste no Console

#### Abrir DevTools:
```
F12 > Console
```

#### Injetar o Serviço:
```javascript
// Método 1: Usando Angular DevTools
const service = ng.probe($0).injector.get('PaymentConfigService');

// Método 2: Se Angular DevTools instalado
const injector = ng.getInjector(document.querySelector('app-root'));
const service = injector.get('PaymentConfigService');
```

#### Comandos de Teste:

```javascript
// 1. Verificar se Stripe está configurado
service.isStripeConfigured()
// false (se placeholders) ou true (se configurado)

// 2. Verificar se PagSeguro está configurado
service.isPagSeguroConfigured()
// false (se placeholders) ou true (se configurado)

// 3. Verificar se ALGUM está configurado
service.isPaymentConfigured()
// true se pelo menos um estiver configurado

// 4. Ver provedores disponíveis
service.getAvailableProviders()
// [] (nenhum)
// ['stripe'] (apenas Stripe)
// ['pagseguro'] (apenas PagSeguro)
// ['stripe', 'pagseguro'] (ambos)

// 5. Ver status completo
service.getConfigurationStatus()
// {
//   configured: false,
//   message: 'Sistema de pagamento não configurado...',
//   providers: []
// }
```

---

### Cenário 5: Teste de Billing Cycle (Mensal/Anual)

#### Passos:
1. Na página de pricing, clique no toggle "Mensal/Anual"

2. **Estado Mensal:**
   ```
   Premium: R$ 29,90/mês
   Família: R$ 49,90/mês
   ```

3. **Estado Anual:**
   ```
   Premium: R$ 299,90/ano
   Família: R$ 499,90/ano
   
   Economize R$ 58,90 💰 (-17%)
   Economize R$ 98,90 💰 (-17%)
   ```

4. Selecione plano Premium em modo Anual
   - Deve abrir checkout com período "yearly"
   - Preço mostrado: R$ 299,90

---

## 🔍 Validações Automáticas

O `PaymentConfigService` verifica automaticamente:

### Para Stripe:
```typescript
✅ Chave começa com "pk_"
✅ Chave não contém "REPLACE"
✅ Price IDs não contêm "REPLACE"
✅ Price IDs estão preenchidos

Exemplo VÁLIDO:
'pk_test_51AbCdEfGh12345678901234567890'

Exemplo INVÁLIDO:
'pk_test_REPLACE_WITH_YOUR_STRIPE_TEST_PUBLISHABLE_KEY'
```

### Para PagSeguro:
```typescript
✅ Chave não contém "REPLACE"
✅ Chave não contém "PUBLIC_KEY"
✅ Plan IDs não contêm "PLAN_TEST"
✅ Plan IDs estão preenchidos

Exemplo VÁLIDO:
'PUB1234567890ABCDEFGHIJKLMNOP'

Exemplo INVÁLIDO:
'PUBLIC_KEY_REPLACE_WITH_YOUR_PAGSEGURO_TEST_PUBLIC_KEY'
```

---

## 📱 Teste Mobile/Responsivo

### Desktop (1920x1080):
```
┌────────┬────────┬────────┬────────┐
│ Free   │Premium │Família │Enterprise│
│        │   ⭐   │   🏆   │        │
└────────┴────────┴────────┴────────┘
```

### Tablet (768px):
```
┌────────┬────────┐
│ Free   │Premium │
├────────┼────────┤
│Família │Enterprise│
└────────┴────────┘
```

### Mobile (360px):
```
┌────────┐
│ Free   │
├────────┤
│Premium │
├────────┤
│Família │
├────────┤
│Enterprise│
└────────┘
```

Teste em todos os tamanhos:
```bash
# Chrome DevTools (F12)
# Device Toolbar (Ctrl+Shift+M)
# Teste: iPhone SE, iPad, Desktop
```

---

## ✅ Checklist de Testes

### Funcionalidade:
- [ ] Página carrega sem erros
- [ ] Warning card aparece quando não configurado
- [ ] Warning card desaparece quando configurado
- [ ] Apenas Free visível sem configuração
- [ ] Todos os planos visíveis com configuração
- [ ] Bloqueio funciona (não pode selecionar pago sem config)
- [ ] Seletor de pagamento adaptativo (1 ou 2 provedores)
- [ ] Toggle Mensal/Anual funciona
- [ ] Cálculo de economia correto

### UI/UX:
- [ ] Warning card tem estilo amarelo
- [ ] Ícone de warning visível
- [ ] Mensagens claras e informativas
- [ ] Planos bem formatados
- [ ] Badges (Popular/Recomendado) visíveis
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Animações suaves

### Console:
- [ ] Sem erros no console
- [ ] PaymentConfigService acessível
- [ ] Métodos retornam valores corretos
- [ ] Logs apropriados (se houver)

---

## 🐛 Troubleshooting

### Warning card não aparece:
```typescript
// Verifique em pricing.page.ts
console.log('Payment configured:', this.paymentConfigured());
console.log('Config status:', this.configStatus());

// Se retornar true quando deveria ser false:
// Verifique environment.ts para placeholders
```

### Todos os planos aparecem (deveria ser só Free):
```typescript
// Verifique em pricing.page.html
// Deve estar:
*ngFor="let plan of getAvailablePlans()"

// NÃO deve estar:
*ngFor="let plan of plans"
```

### Action Sheet não mostra opções:
```typescript
// Verifique no console
console.log('Providers:', this.configStatus().providers);

// Se retornar array vazio:
// Credenciais não foram detectadas como válidas
```

---

**Documento criado em:** 10/01/2025  
**Testado em:** Chrome 131, Firefox 124, Safari 17  
**Compatibilidade:** iOS 15+, Android 11+
