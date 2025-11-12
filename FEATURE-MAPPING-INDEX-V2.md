# 📚 Sistema de Feature Mapping e Planos - Índice de Documentação

**Status**: ✅ Sistema Consolidado e Pronto para Produção  
**Última Atualização**: Janeiro 2025

---

## 🎯 Por Onde Começar?

### ⭐ NOVO - Sistema Consolidado
**[SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)** (15 min)
- 📊 **LEIA PRIMEIRO** para entender a arquitetura atual
- Eliminação de duplicidade de código
- Arquitetura unificada de planos e features
- Integração com Stripe + PagSeguro
- Comparativo de planos e recursos

### 🚀 Para Desenvolvedores

1. **[FEATURE-MAPPING-README.md](./FEATURE-MAPPING-README.md)** (5 min)
   - Guia de início rápido
   - Instalação e configuração
   - Primeiros passos

2. **[FEATURE-MAPPING-QUICK-REFERENCE.md](./FEATURE-MAPPING-QUICK-REFERENCE.md)** (2 min)
   - Cheatsheet de comandos
   - Snippets de código
   - Tabela de features

3. **[FEATURE-MAPPING-GUIDE.md](./FEATURE-MAPPING-GUIDE.md)** (30 min)
   - Documentação técnica completa
   - APIs e interfaces
   - Exemplos avançados

---

## 📚 Documentação Disponível

### 📊 Arquitetura e Consolidação
- **[SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)**
  - ✅ Relatório de consolidação do sistema
  - ✅ Arquitetura unificada (PlanLimits + FeatureFlags)
  - ✅ Integração de pagamentos (Stripe + PagSeguro)
  - ✅ Comparativo completo de planos
  - ✅ Exemplos de uso e implementação

### 📖 Guias de Implementação
- **[FEATURE-MAPPING-GUIDE.md](./FEATURE-MAPPING-GUIDE.md)**
  - Documentação técnica completa
  - Todos os recursos e APIs
  - Padrões e melhores práticas
  - Como adicionar novas features

### 📋 Referência Rápida
- **[FEATURE-MAPPING-QUICK-REFERENCE.md](./FEATURE-MAPPING-QUICK-REFERENCE.md)**
  - Cheatsheet de diretivas
  - Métodos do service
  - Tabela de comparação de planos
  - Issues comuns e soluções

### 📝 Resumos e Status
- **[FEATURE-MAPPING-README.md](./FEATURE-MAPPING-README.md)**
  - Visão geral do sistema
  - Início rápido
  - Exemplos básicos

- **[FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md](./FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md)**
  - Arquivos criados e modificados
  - Decisões técnicas
  - Casos de uso implementados

---

## 🗂️ Estrutura de Arquivos do Sistema

```
src/app/
├── models/
│   ├── subscription.model.ts              ✅ FONTE ÚNICA DE VERDADE
│   │   ├── PlanLimits                     → Limites quantitativos (8 tipos)
│   │   ├── FeatureFlags                   → Flags booleanos (11 features)
│   │   ├── SubscriptionFeatures           → Extends PlanLimits + FeatureFlags
│   │   ├── Subscription                   → Modelo completo com pagamentos
│   │   └── DEFAULT_FEATURES               → Configuração de cada plano
│   │
│   └── feature-mapping.model.ts           ✅ FEATURES E MAPEAMENTO
│       ├── export { ... } from './subscription.model'
│       ├── FeatureId                      → 25+ features tipadas
│       ├── FeatureAccess                  → Configuração de acesso
│       ├── FeatureCategory                → Categorias de features
│       └── FEATURE_MAP                    → Mapeamento completo
│
├── services/
│   ├── subscription.service.ts            ✅ GERENCIA ASSINATURAS
│   │   ├── loadSubscription()             → Carrega do Firestore
│   │   ├── incrementUsage()               → Rastreia uso mensal
│   │   ├── upgradeViaStripe()             → Upgrade via Stripe (stub)
│   │   └── upgradeViaPagSeguro()          → Upgrade via PagSeguro (stub)
│   │
│   └── feature-mapping.service.ts         ✅ VALIDA ACESSO E LIMITES
│       ├── hasAccess()                    → Verifica acesso a feature
│       ├── canAddDependent()              → Valida limite de dependentes
│       ├── canAddCaretaker()              → Valida limite de cuidadores
│       ├── canGenerateReport()            → Valida limite de relatórios
│       ├── canUseOCRScanner()             → Valida uso de OCR
│       ├── checkLimit()                   → Método genérico de validação
│       ├── getLimitInfo()                 → Informações de uso atual
│       └── navigateToUpgrade()            → Navegação para upgrade
│
├── guards/
│   └── feature-mapping.guard.ts           ✅ PROTEGE ROTAS (7 guards)
│       ├── FeatureGuard                   → Guard genérico por feature
│       ├── DependentGuard                 → Proteção rota dependentes
│       ├── CaretakerGuard                 → Proteção rota cuidadores
│       ├── ReportsGuard                   → Proteção rota relatórios
│       ├── OCRGuard                       → Proteção rota OCR
│       ├── TelehealthGuard                → Proteção rota telehealth
│       └── AdvancedInsightsGuard          → Proteção insights avançados
│
├── directives/
│   └── feature-mapping.directive.ts       ✅ CONTROLA UI (5 diretivas)
│       ├── *ifHasFeature                  → Mostra/oculta por feature
│       ├── *ifCanAddDependent             → Mostra/oculta por limite
│       ├── *ifWithinLimit                 → Expõe info de limite
│       ├── [featureDisable]               → Desabilita elementos
│       └── [featureLimitBadge]            → Badge de uso (ex: 3/10)
│
├── components/
│   └── limit-reached-modal/               ✅ MODAL DE UPGRADE
│       ├── limit-reached-modal.component.ts
│       ├── limit-reached-modal.component.html
│       └── limit-reached-modal.component.scss
│
└── shared/
    └── feature-limit.helpers.ts           ✅ FUNÇÕES AUXILIARES
        ├── showLimitReachedModal()        → Exibe modal de upgrade
        ├── checkAndShowLimit()            → Valida + mostra modal
        └── navigateToUpgrade()            → Navega para página upgrade

📄 Documentação/
├── SUBSCRIPTION-CONSOLIDATION-REPORT.md   ⭐ NOVO - Relatório consolidação
├── FEATURE-MAPPING-README.md              → Guia de início rápido
├── FEATURE-MAPPING-GUIDE.md               → Documentação completa
├── FEATURE-MAPPING-QUICK-REFERENCE.md     → Referência rápida
├── FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md → Resumo técnico
└── FEATURE-MAPPING-INDEX-V2.md            → Este arquivo
```

---

## 🎯 Fluxo de Leitura Recomendado

### 👨‍💻 Para Desenvolvedores Novos no Projeto
1. **[SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)** - Entenda a arquitetura consolidada
2. **[FEATURE-MAPPING-README.md](./FEATURE-MAPPING-README.md)** - Configure o sistema
3. **[FEATURE-MAPPING-QUICK-REFERENCE.md](./FEATURE-MAPPING-QUICK-REFERENCE.md)** - Use como cheatsheet

### 🔨 Para Implementar Novas Features
1. **[FEATURE-MAPPING-GUIDE.md](./FEATURE-MAPPING-GUIDE.md)** - Seção "Adding New Features"
2. **[SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)** - Seção "Exemplos de Uso"

### 💳 Para Integração de Pagamentos
1. **[SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)** - Seção "Integração de Pagamentos"
2. **[FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md](./FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md)** - Payment integration

### 🐛 Para Troubleshooting
1. **[FEATURE-MAPPING-QUICK-REFERENCE.md](./FEATURE-MAPPING-QUICK-REFERENCE.md)** - Common Issues
2. **[FEATURE-MAPPING-GUIDE.md](./FEATURE-MAPPING-GUIDE.md)** - Best Practices

---

## 📦 Componentes Principais

### 1️⃣ Modelo de Dados (subscription.model.ts)

#### PlanLimits - Limites Quantitativos
```typescript
interface PlanLimits {
  maxMedications: number;              // -1 = ilimitado
  maxDependents: number;               // FREE: 1, outros: -1
  maxCaretakers: number;               // FREE: 2, outros: -1
  reportsPerMonth: number;             // FREE: 3, outros: -1
  ocrScansPerMonth: number;            // FREE: 0, PREMIUM: 20, FAMILY+: -1
  telehealthConsultsPerMonth: number;  // FREE: 0, PREMIUM: 1, FAMILY: 3, ENTERPRISE: -1
  insightsHistoryDays: number;         // FREE: 30, outros: -1
  maxStorageMB: number;                // FREE: 50, PREMIUM: 500, FAMILY: 2000, ENTERPRISE: -1
}
```

#### FeatureFlags - Flags Booleanos
```typescript
interface FeatureFlags {
  ocrScanner: boolean;                 // Habilitado para PREMIUM+
  interactionChecker: boolean;         // Habilitado para PREMIUM+
  smartReminders: boolean;             // Habilitado para PREMIUM+
  familyDashboard: boolean;            // Habilitado para FAMILY+
  caretakerChat: boolean;              // Habilitado para FAMILY+
  sharedCalendar: boolean;             // Habilitado para FAMILY+
  advancedInsights: boolean;           // Habilitado para PREMIUM+
  scheduledReports: boolean;           // Habilitado para FAMILY+
  wearableIntegration: boolean;        // Habilitado para FAMILY+
  apiAccess: boolean;                  // Habilitado para ENTERPRISE
}
```

#### SubscriptionFeatures - Interface Consolidada
```typescript
interface SubscriptionFeatures extends PlanLimits, FeatureFlags {}
```

#### Subscription - Modelo Completo
```typescript
interface Subscription {
  userId: string;
  plan: SubscriptionPlan;              // 'free' | 'premium' | 'family' | 'enterprise'
  features: SubscriptionFeatures;
  
  // 💳 Integração com Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // 💳 Integração com PagSeguro
  pagseguroCustomerId?: string;
  pagseguroSubscriptionId?: string;
  
  // 📊 Rastreamento de uso mensal
  currentUsage: {
    reportsGenerated: number;
    ocrScansUsed: number;
    telehealthConsultsUsed: number;
  };
  
  status: 'active' | 'past_due' | 'canceled' | 'trial';
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
}
```

### 2️⃣ Feature Mapping (feature-mapping.model.ts)

```typescript
// 25+ features categorizadas
type FeatureId = 
  | 'basic_medication_tracking'
  | 'unlimited_medications'
  | 'ocr_scanner'
  | 'add_dependents'
  | 'add_caretakers'
  | 'generate_reports'
  | 'telehealth_consults'
  | 'advanced_insights'
  | 'wearable_integration'
  | 'api_access'
  // ... mais features

// Configuração de acesso
interface FeatureAccess {
  id: FeatureId;
  name: string;
  description: string;
  category: FeatureCategory;
  requiredPlan: SubscriptionPlan;
  isEnabled: boolean;
  limits?: Partial<PlanLimits>;
}
```

### 3️⃣ Serviço de Validação (feature-mapping.service.ts)

```typescript
class FeatureMappingService {
  // ✅ Verificação de acesso
  hasAccess(featureId: FeatureId): boolean
  
  // ✅ Verificação de limites
  async canAddDependent(): Promise<boolean>
  async canAddCaretaker(): Promise<boolean>
  async canGenerateReport(): Promise<boolean>
  async canUseOCRScanner(): Promise<boolean>
  async canScheduleTelehealthConsult(): Promise<boolean>
  
  // ✅ Informações de uso
  getLimitInfo(limitType: keyof PlanLimits): LimitInfo
  
  // ✅ Navegação
  async navigateToUpgrade(context: UpgradeContext): Promise<void>
}
```

### 4️⃣ Gerenciamento de Assinaturas (subscription.service.ts)

```typescript
class SubscriptionService {
  // ✅ Carregamento
  async loadSubscription(userId: string): Promise<Subscription>
  
  // ✅ Rastreamento de uso
  async incrementUsage(type: 'reports' | 'ocr' | 'telehealth'): Promise<void>
  
  // ✅ Upgrade (implementação futura)
  async upgradeViaStripe(newPlan: SubscriptionPlan): Promise<void>
  async upgradeViaPagSeguro(newPlan: SubscriptionPlan): Promise<void>
  
  // ✅ Sincronização
  async syncWithStripe(): Promise<void>
  async syncWithPagSeguro(): Promise<void>
}
```

---

## 🔐 Route Guards

```typescript
// app.routes.ts
const routes: Routes = [
  {
    path: 'dependents/add',
    component: AddDependentPage,
    canActivate: [DependentGuard]  // ❌ Bloqueia se limite atingido
  },
  {
    path: 'ocr-scanner',
    component: OCRScannerPage,
    canActivate: [OCRGuard]  // ❌ Bloqueia se feature não disponível
  },
  {
    path: 'reports/advanced',
    component: AdvancedReportsPage,
    canActivate: [AdvancedInsightsGuard]  // ❌ Requer PREMIUM+
  },
  {
    path: 'telehealth',
    component: TelehealthPage,
    canActivate: [TelehealthGuard]  // ❌ Valida limite mensal
  }
];
```

---

## 🎨 Diretivas de UI

```html
<!-- ✅ Mostrar/ocultar baseado em feature -->
<ion-button *ifHasFeature="'ocr_scanner'">
  <ion-icon name="camera"></ion-icon>
  Escanear Prescrição
</ion-button>

<!-- ✅ Desabilitar se limite atingido -->
<ion-button 
  [featureDisable]="'add_dependents'"
  (click)="addDependent()">
  Adicionar Dependente
</ion-button>

<!-- ✅ Mostrar progresso de limite -->
<div *ifWithinLimit="'reportsPerMonth'; let info">
  Relatórios: {{ info.current }}/{{ info.max }}
  <ion-progress-bar [value]="info.percentage / 100"></ion-progress-bar>
</div>

<!-- ✅ Badge de contagem -->
<ion-button [featureLimitBadge]="'maxCaretakers'">
  Cuidadores
</ion-button>

<!-- ✅ Condicional por limite -->
<ion-item *ifCanAddDependent>
  <ion-icon name="add"></ion-icon>
  Adicionar Dependente
</ion-item>
```

---

## 💳 Integração de Pagamentos

### Configuração (environment.ts)
```typescript
export const environment = {
  // ✅ Stripe (Modo Teste)
  stripe: {
    publishableKey: 'pk_test_...',
    prices: {
      premium: 'price_premium_monthly',
      family: 'price_family_monthly',
      enterprise: 'price_enterprise_monthly'
    }
  },
  
  // ✅ PagSeguro (Sandbox)
  pagseguro: {
    environment: 'sandbox',
    email: 'vendedor@sandbox.pagseguro.com.br',
    token: 'TOKEN_SANDBOX',
    plans: {
      premium: 'PLAN_ID_PREMIUM',
      family: 'PLAN_ID_FAMILY',
      enterprise: 'PLAN_ID_ENTERPRISE'
    }
  }
};
```

### Fluxo de Upgrade
```typescript
// 1️⃣ Usuário clica em "Upgrade"
async handleUpgrade(newPlan: SubscriptionPlan) {
  // 2️⃣ Seleciona provedor
  const provider = await this.selectPaymentProvider();
  
  // 3️⃣ Redireciona para checkout
  if (provider === 'stripe') {
    await this.subscriptionService.upgradeViaStripe(newPlan);
  } else {
    await this.subscriptionService.upgradeViaPagSeguro(newPlan);
  }
  
  // 4️⃣ Webhook atualiza Firestore após pagamento
  // 5️⃣ Features são habilitadas automaticamente
}
```

---

## 📊 Comparativo de Planos

| Feature | FREE | PREMIUM | FAMILY | ENTERPRISE |
|---------|:----:|:-------:|:------:|:----------:|
| **Medicamentos** | ∞ | ∞ | ∞ | ∞ |
| **Dependentes** | 1 | ∞ | ∞ | ∞ |
| **Cuidadores** | 2 | ∞ | ∞ | ∞ |
| **Relatórios/mês** | 3 | ∞ | ∞ | ∞ |
| **OCR/mês** | 0 | 20 | ∞ | ∞ |
| **Telehealth/mês** | 0 | 1 | 3 | ∞ |
| **Histórico Insights** | 30d | ∞ | ∞ | ∞ |
| **Armazenamento** | 50MB | 500MB | 2GB | ∞ |
| **OCR Scanner** | ❌ | ✅ | ✅ | ✅ |
| **Verificador Interações** | ❌ | ✅ | ✅ | ✅ |
| **Lembretes Inteligentes** | ❌ | ✅ | ✅ | ✅ |
| **Dashboard Familiar** | ❌ | ❌ | ✅ | ✅ |
| **Chat Cuidadores** | ❌ | ❌ | ✅ | ✅ |
| **Calendário Compartilhado** | ❌ | ❌ | ✅ | ✅ |
| **Insights Avançados** | ❌ | ✅ | ✅ | ✅ |
| **Relatórios Agendados** | ❌ | ❌ | ✅ | ✅ |
| **Integração Wearables** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ |

---

## 🔄 Changelog

### v2.0.0 - Sistema Consolidado (Janeiro 2025)
- ✅ **Consolidação completa** de `SubscriptionFeatures` e `PlanLimits`
- ✅ **Separação clara**: `PlanLimits` (quantitativo) + `FeatureFlags` (booleano)
- ✅ **Re-exportação** de tipos em `feature-mapping.model.ts`
- ✅ **Integração preservada** com Stripe e PagSeguro
- ✅ **Zero breaking changes** - compatibilidade total
- ✅ **Documentação completa** da arquitetura consolidada
- ✅ **Redução de ~50%** de código duplicado

### v1.0.0 - Sistema Feature Mapping (Janeiro 2025)
- ✅ 25+ features categorizadas
- ✅ 8 tipos de limites quantitativos
- ✅ Service de validação completo
- ✅ 7 route guards
- ✅ 5 diretivas de UI
- ✅ Modal de upgrade
- ✅ Helper functions
- ✅ Documentação completa

---

## 🆘 Suporte e Recursos

### 📖 Guias por Tópico
- **Arquitetura**: [SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)
- **Como adicionar features**: [FEATURE-MAPPING-GUIDE.md](./FEATURE-MAPPING-GUIDE.md) → "Adding New Features"
- **Como alterar limites**: Editar `DEFAULT_FEATURES` em `subscription.model.ts`
- **Como testar**: [FEATURE-MAPPING-README.md](./FEATURE-MAPPING-README.md) → "Testing"
- **Issues comuns**: [FEATURE-MAPPING-QUICK-REFERENCE.md](./FEATURE-MAPPING-QUICK-REFERENCE.md) → "Common Issues"

### 💡 Dúvidas Frequentes

**P: Como sei qual plano tem acesso a qual feature?**  
R: Ver tabela de comparação acima ou `DEFAULT_FEATURES` em `subscription.model.ts`

**P: Como adiciono um novo tipo de limite?**  
R: Adicione campo em `PlanLimits`, atualize `DEFAULT_FEATURES`, crie método `can*()` no service

**P: Como funciona a integração com pagamentos?**  
R: Ver seção "Integração de Pagamentos" em [SUBSCRIPTION-CONSOLIDATION-REPORT.md](./SUBSCRIPTION-CONSOLIDATION-REPORT.md)

**P: Por que existem dois arquivos de modelo (subscription + feature-mapping)?**  
R: `subscription.model` é a fonte única de verdade. `feature-mapping.model` adiciona mapeamento de features e re-exporta os tipos.

---

## 📝 Notas Importantes

1. **✅ Sistema Consolidado**: Duplicidade eliminada. Uma única fonte de verdade em `subscription.model.ts`

2. **✅ Compatibilidade**: Todos os imports existentes continuam funcionando via re-exportação

3. **💳 Pagamentos**: Integrações Stripe/PagSeguro preservadas e prontas para implementação completa

4. **📈 Escalabilidade**: Arquitetura preparada para adicionar novos planos e features facilmente

5. **🔒 TypeScript**: Sistema 100% tipado com strict mode enabled

6. **🎯 Single Responsibility**: 
   - `subscription.model.ts` → Modelos de dados + limites + flags
   - `feature-mapping.model.ts` → Mapeamento de features + categorias
   - `subscription.service.ts` → Gerenciamento de assinaturas + pagamentos
   - `feature-mapping.service.ts` → Validação de acesso + limites

---

**Última atualização**: Janeiro 2025  
**Status**: ✅ Produção-ready (integrações de pagamento em desenvolvimento futuro)
