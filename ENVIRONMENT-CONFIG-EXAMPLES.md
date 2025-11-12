# Exemplos de Configuração - environment.ts

## ❌ Configuração INVÁLIDA (Padrão - Planos Pagos Ocultos)

```typescript
export const environment = {
  production: false,
  firebase: {
    // ... configuração firebase ...
  },
  
  // ❌ STRIPE NÃO CONFIGURADO
  stripe: {
    testPublishableKey: 'pk_test_REPLACE_WITH_YOUR_STRIPE_TEST_PUBLISHABLE_KEY',
    //                          ^^^^^^^^ Contém "REPLACE" = INVÁLIDO
    
    prices: {
      premium: {
        monthly: 'price_REPLACE_WITH_PREMIUM_MONTHLY_PRICE_ID',
        //               ^^^^^^^^ Contém "REPLACE" = INVÁLIDO
        yearly: 'price_REPLACE_WITH_PREMIUM_YEARLY_PRICE_ID'
      },
      family: {
        monthly: 'price_REPLACE_WITH_FAMILY_MONTHLY_PRICE_ID',
        yearly: 'price_REPLACE_WITH_FAMILY_YEARLY_PRICE_ID'
      }
    }
  },
  
  // ❌ PAGSEGURO NÃO CONFIGURADO
  pagseguro: {
    testPublicKey: 'PUBLIC_KEY_REPLACE_WITH_YOUR_PAGSEGURO_TEST_PUBLIC_KEY',
    //              ^^^^^^^^^^^ Contém "PUBLIC_KEY" = INVÁLIDO
    
    plans: {
      premium: {
        monthly: 'PLAN_TEST_PREMIUM_MONTHLY',
        //       ^^^^^^^^^^ Contém "PLAN_TEST" = INVÁLIDO
        yearly: 'PLAN_TEST_PREMIUM_YEARLY'
      },
      family: {
        monthly: 'PLAN_TEST_FAMILY_MONTHLY',
        yearly: 'PLAN_TEST_FAMILY_YEARLY'
      }
    }
  }
};

// Resultado:
// ❌ isStripeConfigured() = false
// ❌ isPagSeguroConfigured() = false
// ❌ isPaymentConfigured() = false
// ⚠️ Warning card visível
// 📋 Apenas plano FREE disponível
```

---

## ✅ Configuração VÁLIDA #1 (Apenas Stripe)

```typescript
export const environment = {
  production: false,
  firebase: {
    // ... configuração firebase ...
  },
  
  // ✅ STRIPE CONFIGURADO
  stripe: {
    testPublishableKey: 'pk_test_51MwQxYAbCdEfGh1234567890',
    //                  ^^^^^^^^ Começa com "pk_test_" = VÁLIDO
    //                          Não contém "REPLACE" = VÁLIDO
    
    prices: {
      premium: {
        monthly: 'price_1NabCdEfGhIjKlMnOpQrStUv',
        //       ^^^^^^^^ Não contém "REPLACE" = VÁLIDO
        yearly: 'price_1WxyZaBcDeFgHiJkLmNoPqRs'
      },
      family: {
        monthly: 'price_1TuvWxYzAbCdEfGhIjKlMnOp',
        yearly: 'price_1QrStUvWxYzAbCdEfGhIjKl'
      }
    }
  },
  
  // ❌ PAGSEGURO NÃO CONFIGURADO (mas não importa, Stripe está OK)
  pagseguro: {
    testPublicKey: 'PUBLIC_KEY_REPLACE_WITH_YOUR_PAGSEGURO_TEST_PUBLIC_KEY',
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

// Resultado:
// ✅ isStripeConfigured() = true
// ❌ isPagSeguroConfigured() = false
// ✅ isPaymentConfigured() = true (pelo menos 1 configurado)
// ✅ getAvailableProviders() = ['stripe']
// ❌ Warning card oculto
// 📋 TODOS os planos disponíveis
// 💳 Seleção de plano redireciona DIRETO para Stripe
```

---

## ✅ Configuração VÁLIDA #2 (Apenas PagSeguro)

```typescript
export const environment = {
  production: false,
  firebase: {
    // ... configuração firebase ...
  },
  
  // ❌ STRIPE NÃO CONFIGURADO (mas não importa, PagSeguro está OK)
  stripe: {
    testPublishableKey: 'pk_test_REPLACE_WITH_YOUR_STRIPE_TEST_PUBLISHABLE_KEY',
    prices: {
      premium: {
        monthly: 'price_REPLACE_WITH_PREMIUM_MONTHLY_PRICE_ID',
        yearly: 'price_REPLACE_WITH_PREMIUM_YEARLY_PRICE_ID'
      },
      family: {
        monthly: 'price_REPLACE_WITH_FAMILY_MONTHLY_PRICE_ID',
        yearly: 'price_REPLACE_WITH_FAMILY_YEARLY_PRICE_ID'
      }
    }
  },
  
  // ✅ PAGSEGURO CONFIGURADO
  pagseguro: {
    testPublicKey: 'PUB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    //              ^^^ Não contém "PUBLIC_KEY" ou "REPLACE" = VÁLIDO
    
    plans: {
      premium: {
        monthly: '12AB34CD56EF78GH90IJ',
        //       ^^^^ Não contém "PLAN_TEST" = VÁLIDO
        yearly: '12KL34MN56OP78QR90ST'
      },
      family: {
        monthly: '12UV34WX56YZ78AB90CD',
        yearly: '12EF34GH56IJ78KL90MN'
      }
    }
  }
};

// Resultado:
// ❌ isStripeConfigured() = false
// ✅ isPagSeguroConfigured() = true
// ✅ isPaymentConfigured() = true
// ✅ getAvailableProviders() = ['pagseguro']
// ❌ Warning card oculto
// 📋 TODOS os planos disponíveis
// 💳 Seleção de plano redireciona DIRETO para PagSeguro
```

---

## ✅ Configuração VÁLIDA #3 (Stripe + PagSeguro)

```typescript
export const environment = {
  production: false,
  firebase: {
    // ... configuração firebase ...
  },
  
  // ✅ STRIPE CONFIGURADO
  stripe: {
    testPublishableKey: 'pk_test_51MwQxYAbCdEfGh1234567890',
    
    prices: {
      premium: {
        monthly: 'price_1NabCdEfGhIjKlMnOpQrStUv',
        yearly: 'price_1WxyZaBcDeFgHiJkLmNoPqRs'
      },
      family: {
        monthly: 'price_1TuvWxYzAbCdEfGhIjKlMnOp',
        yearly: 'price_1QrStUvWxYzAbCdEfGhIjKl'
      }
    }
  },
  
  // ✅ PAGSEGURO CONFIGURADO
  pagseguro: {
    testPublicKey: 'PUB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    
    plans: {
      premium: {
        monthly: '12AB34CD56EF78GH90IJ',
        yearly: '12KL34MN56OP78QR90ST'
      },
      family: {
        monthly: '12UV34WX56YZ78AB90CD',
        yearly: '12EF34GH56IJ78KL90MN'
      }
    }
  }
};

// Resultado:
// ✅ isStripeConfigured() = true
// ✅ isPagSeguroConfigured() = true
// ✅ isPaymentConfigured() = true
// ✅ getAvailableProviders() = ['stripe', 'pagseguro']
// ❌ Warning card oculto
// 📋 TODOS os planos disponíveis
// 💳 Seleção de plano mostra ACTION SHEET com 2 opções:
//    - Stripe
//    - PagSeguro
```

---

## ⚠️ Configuração INVÁLIDA #1 (Chave Stripe inválida)

```typescript
stripe: {
  testPublishableKey: 'sk_test_51MwQxYAbCdEfGh1234567890',
  //                  ^^ Começa com "sk_" (SECRET KEY)
  //                     Deveria ser "pk_" (PUBLISHABLE KEY)
  
  prices: {
    premium: {
      monthly: 'price_1NabCdEfGhIjKlMnOpQrStUv',
      yearly: 'price_1WxyZaBcDeFgHiJkLmNoPqRs'
    }
  }
}

// Resultado:
// ❌ isStripeConfigured() = false (não começa com "pk_")
// ⚠️ Warning card visível
// 📋 Apenas plano FREE disponível
```

---

## ⚠️ Configuração INVÁLIDA #2 (Chave OK, mas Price IDs inválidos)

```typescript
stripe: {
  testPublishableKey: 'pk_test_51MwQxYAbCdEfGh1234567890',
  //                  ✅ Chave válida
  
  prices: {
    premium: {
      monthly: 'price_REPLACE_WITH_PREMIUM_MONTHLY_PRICE_ID',
      //       ❌ Ainda tem placeholder
      yearly: 'price_1WxyZaBcDeFgHiJkLmNoPqRs'
    },
    family: {
      monthly: 'price_1TuvWxYzAbCdEfGhIjKlMnOp',
      yearly: 'price_1QrStUvWxYzAbCdEfGhIjKl'
    }
  }
}

// Resultado:
// ❌ arePlanPricesConfigured() = false
// ⚠️ Warning card visível
// 📋 Apenas plano FREE disponível
```

---

## ⚠️ Configuração INVÁLIDA #3 (Chave vazia)

```typescript
stripe: {
  testPublishableKey: '',
  //                  ❌ Vazio
  
  prices: {
    premium: {
      monthly: 'price_1NabCdEfGhIjKlMnOpQrStUv',
      yearly: 'price_1WxyZaBcDeFgHiJkLmNoPqRs'
    }
  }
}

// Resultado:
// ❌ isStripeConfigured() = false
// ⚠️ Warning card visível
// 📋 Apenas plano FREE disponível
```

---

## 📋 Tabela de Validação

| Campo | Válido ✅ | Inválido ❌ |
|-------|-----------|-------------|
| `stripe.testPublishableKey` | `pk_test_51Abc...` | `pk_test_REPLACE...` |
| | `pk_live_51Xyz...` | `sk_test_...` (secret key) |
| | | `''` (vazio) |
| `stripe.prices.premium.monthly` | `price_1NabCd...` | `price_REPLACE...` |
| | | `''` (vazio) |
| `pagseguro.testPublicKey` | `PUB123456...` | `PUBLIC_KEY_REPLACE...` |
| | `ABCD1234...` | `''` (vazio) |
| `pagseguro.plans.premium.monthly` | `12AB34CD56EF` | `PLAN_TEST_PREMIUM_MONTHLY` |
| | `XYZABC123` | `''` (vazio) |

---

## 🔧 Como Obter Chaves Válidas

### Stripe:
1. Acesse https://dashboard.stripe.com/test/apikeys
2. Copie a **Publishable key** (começa com `pk_test_`)
3. Acesse Products > Create product
4. Após criar, copie os **Price IDs** (começam com `price_`)

### PagSeguro:
1. Acesse https://sandbox.pagseguro.uol.com.br
2. Faça login/cadastro
3. Vá em Credenciais > Token de Sandbox
4. Use o script `scripts/create-pagseguro-plans.js` para criar planos
5. Copie os códigos retornados

---

## ✅ Checklist de Validação

Antes de considerar configurado, verifique:

### Stripe:
- [ ] `testPublishableKey` começa com `pk_`
- [ ] `testPublishableKey` não contém "REPLACE"
- [ ] `prices.premium.monthly` não contém "REPLACE"
- [ ] `prices.premium.yearly` não contém "REPLACE"
- [ ] `prices.family.monthly` não contém "REPLACE"
- [ ] `prices.family.yearly` não contém "REPLACE"

### PagSeguro:
- [ ] `testPublicKey` não contém "PUBLIC_KEY"
- [ ] `testPublicKey` não contém "REPLACE"
- [ ] `plans.premium.monthly` não contém "PLAN_TEST"
- [ ] `plans.premium.yearly` não contém "PLAN_TEST"
- [ ] `plans.family.monthly` não contém "PLAN_TEST"
- [ ] `plans.family.yearly` não contém "PLAN_TEST"

---

**Última atualização:** 10/01/2025  
**Versão:** 1.0.0
