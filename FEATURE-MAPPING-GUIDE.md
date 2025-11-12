# 🔐 Sistema de Feature Mapping e Limites por Plano

Documentação completa do sistema de controle de acesso a funcionalidades e limites quantitativos por plano de assinatura.

---

## 📋 Visão Geral

O **Feature Mapping System** implementa controle granular de acesso a funcionalidades e limites de uso baseados no plano de assinatura do usuário. O sistema garante que:

- ✅ Usuários acessem apenas features disponíveis em seu plano
- ✅ Limites de quantidade sejam respeitados (dependentes, relatórios, scans OCR, etc)
- ✅ Feedback claro seja fornecido quando limites são atingidos
- ✅ Upsell contextual seja apresentado no momento certo

---

## 🎯 Limites por Plano

### 🆓 Free
| Recurso | Limite |
|---------|--------|
| Medicações | Ilimitado |
| Dependentes | 1 |
| Cuidadores | 2 |
| Relatórios/mês | 3 |
| Scans OCR/mês | 0 |
| Consultas telemedicina/mês | 0 |
| Histórico de insights | 30 dias |

### 💎 Premium
| Recurso | Limite |
|---------|--------|
| Medicações | Ilimitado |
| Dependentes | Ilimitado |
| Cuidadores | Ilimitado |
| Relatórios/mês | Ilimitado |
| Scans OCR/mês | **20** |
| Consultas telemedicina/mês | **1** |
| Histórico de insights | Ilimitado |

### 👨‍👩‍👧 Family
| Recurso | Limite |
|---------|--------|
| Medicações | Ilimitado |
| Dependentes | Ilimitado |
| Cuidadores | Ilimitado |
| Relatórios/mês | Ilimitado |
| Scans OCR/mês | **Ilimitado** |
| Consultas telemedicina/mês | **3** |
| Histórico de insights | Ilimitado |

### 🏢 Enterprise
| Recurso | Limite |
|---------|--------|
| **TODOS** | **Ilimitado** |

---

## 🏗️ Arquitetura

### Componentes Principais

```
src/app/
├── models/
│   ├── feature-mapping.model.ts      # Tipos, interfaces e configurações
│   └── subscription.model.ts         # Modelos de assinatura
├── services/
│   ├── feature-mapping.service.ts    # Serviço principal de validação
│   └── subscription.service.ts       # Gerenciamento de assinaturas
├── guards/
│   └── feature-mapping.guard.ts      # Guards de rota
├── directives/
│   └── feature-mapping.directive.ts  # Diretivas estruturais
├── components/
│   └── limit-reached-modal/          # Modal de limite atingido
└── shared/
    └── feature-limit.helpers.ts      # Funções auxiliares
```

---

## 🚀 Guia de Uso

### 1️⃣ Verificar Acesso a Feature (Service)

```typescript
import { Component, inject } from '@angular/core';
import { FeatureMappingService } from '@services/feature-mapping.service';

export class MyComponent {
  private featureMapping = inject(FeatureMappingService);

  async checkOCRAccess() {
    const result = this.featureMapping.hasAccess('ocr_scanner');
    
    if (result.allowed) {
      // Usuário tem acesso
      this.startOCRScan();
    } else {
      // Usuário não tem acesso
      console.log('Upgrade necessário:', result.requiredPlan);
      this.featureMapping.navigateToUpgrade('ocr_scanner');
    }
  }
}
```

### 2️⃣ Verificar Limites de Quantidade

```typescript
import { Component, inject } from '@angular/core';
import { useFeatureLimitHelpers } from '@shared/feature-limit.helpers';

export class AddDependentComponent {
  private helpers = useFeatureLimitHelpers();

  async onAddDependent() {
    const currentCount = await this.getDependentCount();
    
    // Valida e mostra modal se necessário
    const canAdd = await this.helpers.canAddDependent(currentCount);
    
    if (canAdd) {
      await this.saveDependentToDatabase();
    }
    // Modal já foi exibido automaticamente se limite foi atingido
  }
  
  private async getDependentCount(): Promise<number> {
    // Buscar contagem do banco de dados
    return 0;
  }
}
```

### 3️⃣ Proteger Rotas com Guards

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { featureGuard, planGuard, premiumGuard } from '@guards/feature-mapping.guard';

export const routes: Routes = [
  // Proteger por feature específica
  {
    path: 'ocr-scanner',
    loadComponent: () => import('./pages/ocr-scanner/ocr-scanner.page'),
    canActivate: [featureGuard('ocr_scanner')]
  },
  
  // Proteger por plano mínimo
  {
    path: 'family-dashboard',
    loadComponent: () => import('./pages/family-dashboard/family-dashboard.page'),
    canActivate: [planGuard('family')]
  },
  
  // Shortcut para Premium+
  {
    path: 'advanced-insights',
    loadComponent: () => import('./pages/advanced-insights/advanced-insights.page'),
    canActivate: [premiumGuard()]
  }
];
```

### 4️⃣ Renderização Condicional em Templates

```html
<!-- Mostrar apenas se tiver acesso à feature -->
<ion-button *hasFeature="'ocr_scanner'">
  <ion-icon name="camera"></ion-icon>
  Escanear Receita
</ion-button>

<!-- Com template alternativo -->
<div *hasFeature="'advanced_insights'; else upgradePrompt">
  <app-advanced-insights></app-advanced-insights>
</div>

<ng-template #upgradePrompt>
  <ion-card>
    <ion-card-header>
      <ion-card-title>🎯 Recurso Premium</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>Insights avançados com Machine Learning</p>
      <ion-button routerLink="/upgrade" expand="block">
        Ver Planos
      </ion-button>
    </ion-card-content>
  </ion-card>
</ng-template>

<!-- Mostrar apenas para plano específico -->
<ion-item *requiresPlan="'family'">
  <ion-icon name="people" slot="start"></ion-icon>
  <ion-label>Dashboard Familiar</ion-label>
</ion-item>

<!-- Shortcuts convenientes -->
<div *isPremium>
  Conteúdo exclusivo Premium
</div>

<div *isFamily>
  Conteúdo exclusivo Família
</div>

<!-- Mostrar quando feature está bloqueada (inverso) -->
<ion-card *featureLocked="'ocr_scanner'">
  <ion-card-content>
    <h3>🔒 Scanner OCR Bloqueado</h3>
    <p>Faça upgrade para Premium e digitalize receitas automaticamente!</p>
    <ion-button routerLink="/upgrade">Upgrade</ion-button>
  </ion-card-content>
</ion-card>
```

### 5️⃣ Exibir Informações de Uso

```html
<!-- Mostrar progresso de uso -->
<ion-card>
  <ion-card-header>
    <ion-card-subtitle>Relatórios este mês</ion-card-subtitle>
    <ion-card-title>{{ usageInfo.display }}</ion-card-title>
  </ion-card-header>
  
  <ion-card-content>
    <ion-progress-bar 
      [value]="usageInfo.percentage / 100"
      [color]="usageInfo.percentage >= 80 ? 'danger' : 'primary'">
    </ion-progress-bar>
    
    <ion-note *ngIf="usageInfo.percentage >= 80" color="warning">
      ⚠️ Você está próximo do limite!
    </ion-note>
    
    <ion-button 
      *ngIf="usageInfo.percentage >= 100" 
      expand="block"
      routerLink="/upgrade">
      Fazer Upgrade para Relatórios Ilimitados
    </ion-button>
  </ion-card-content>
</ion-card>
```

```typescript
// Component
export class ReportsComponent {
  private featureMapping = inject(FeatureMappingService);
  private helpers = useFeatureLimitHelpers();

  usageInfo = {
    used: 0,
    limit: 3,
    display: '0/3',
    percentage: 0,
  };

  async ngOnInit() {
    await this.loadUsageInfo();
  }

  async loadUsageInfo() {
    const result = await this.featureMapping.canGenerateReport();
    const limits = this.featureMapping.getCurrentPlanLimits();
    
    this.usageInfo = {
      used: result.currentUsage,
      limit: limits.reportsPerMonth,
      display: this.helpers.getUsageDisplay(result.currentUsage, 'reportsPerMonth'),
      percentage: this.helpers.getUsagePercentage(result.currentUsage, 'reportsPerMonth'),
    };
  }
}
```

### 6️⃣ Integração em Serviços

```typescript
import { Injectable, inject } from '@angular/core';
import { FeatureMappingService } from './feature-mapping.service';
import { SubscriptionService } from './subscription.service';
import { useFeatureLimitHelpers } from '@shared/feature-limit.helpers';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private featureMapping = inject(FeatureMappingService);
  private subscription = inject(SubscriptionService);
  private helpers = useFeatureLimitHelpers();

  async generateReport(data: any): Promise<boolean> {
    // 1. Verificar acesso à feature
    const hasAccess = this.featureMapping.hasAccess('generate_reports');
    if (!hasAccess.allowed) {
      this.featureMapping.navigateToUpgrade('generate_reports');
      return false;
    }

    // 2. Verificar limite mensal
    const canGenerate = await this.helpers.canGenerateReport();
    if (!canGenerate) {
      return false; // Modal já foi exibido
    }

    // 3. Gerar relatório
    await this.doGenerateReport(data);

    // 4. Incrementar contador de uso
    const userId = this.getCurrentUserId();
    await this.subscription.incrementUsage(userId, 'reportsThisMonth');

    return true;
  }

  private async doGenerateReport(data: any): Promise<void> {
    // Lógica de geração de relatório
  }

  private getCurrentUserId(): string {
    // Obter ID do usuário atual
    return '';
  }
}
```

---

## 📊 Features Disponíveis

### Core (Todos os Planos)
- `basic_medication_tracking` - Rastreamento básico de medicações
- `local_reminders` - Lembretes locais
- `offline_sync` - Sincronização offline
- `basic_gamification` - Gamificação básica

### Premium+
- `ocr_scanner` - Scanner OCR de receitas (20/mês Premium, ilimitado Family)
- `interaction_checker` - Verificador de interações medicamentosas
- `smart_reminders` - Lembretes inteligentes com ML
- `advanced_insights` - Insights avançados
- `wearable_integration` - Integração com wearables
- `push_notifications` - Push notifications remotas
- `priority_support` - Suporte prioritário

### Family+
- `family_dashboard` - Dashboard familiar
- `caretaker_chat` - Chat entre cuidadores
- `shared_calendar` - Calendário compartilhado

### Enterprise
- `white_label` - White label
- `sso` - Single Sign-On
- `api_access` - Acesso à API REST
- `bulk_import` - Importação em massa
- `audit_logs` - Logs de auditoria

---

## 🎨 Customização

### Modificar Limites de um Plano

Edite `src/app/models/feature-mapping.model.ts`:

```typescript
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  premium: {
    // ...outros limites
    ocrScansPerMonth: 30, // Alterar de 20 para 30
  },
};
```

### Adicionar Nova Feature

1. Adicione o ID em `FeatureId`:

```typescript
export type FeatureId =
  | 'existing_feature'
  | 'my_new_feature'; // Nova feature
```

2. Configure a feature em `FEATURE_MAP`:

```typescript
export const FEATURE_MAP: Record<FeatureId, FeatureAccess> = {
  // ...features existentes
  my_new_feature: {
    id: 'my_new_feature',
    name: 'Minha Nova Feature',
    description: 'Descrição da feature',
    category: FeatureCategory.CORE,
    requiredPlan: 'premium', // Plano mínimo
    isEnabled: true,
  },
};
```

3. Use a feature:

```html
<ion-button *hasFeature="'my_new_feature'">
  Usar Nova Feature
</ion-button>
```

### Adicionar Novo Limite Quantitativo

1. Adicione o limite em `PlanLimits`:

```typescript
export interface PlanLimits {
  // ...limites existentes
  maxCustomLimit: number;
}
```

2. Configure valores por plano:

```typescript
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    // ...
    maxCustomLimit: 5,
  },
  premium: {
    // ...
    maxCustomLimit: -1, // Ilimitado
  },
};
```

3. Crie método de validação no `FeatureMappingService`:

```typescript
async canAddCustomItem(currentCount: number): Promise<LimitCheckResult> {
  return this.checkLimit('maxCustomLimit', currentCount);
}
```

---

## 🧪 Testes

### Testar Diferentes Planos

```typescript
// No console do navegador ou em testes

// Simular usuário Free
localStorage.setItem('test_plan', 'free');

// Simular usuário Premium
localStorage.setItem('test_plan', 'premium');

// Simular usuário Family
localStorage.setItem('test_plan', 'family');

// Simular limite atingido
localStorage.setItem('test_reports_used', '3');
```

---

## 🔍 Troubleshooting

### Modal de limite não aparece

Verifique se:
1. `LimitReachedModalComponent` está importado
2. `ModalController` está injetado corretamente
3. Helper está sendo chamado com `await`

### Diretiva *hasFeature não funciona

Verifique se:
1. Diretiva está importada no componente standalone
2. Nome da feature está correto (case-sensitive)
3. Feature está habilitada (`isEnabled: true`)

### Limite não é respeitado

Verifique se:
1. Contador de uso está sendo incrementado após ação
2. Reset mensal está funcionando
3. Limite correto está configurado no modelo

---

## 📚 Referências Rápidas

### Helpers Disponíveis

```typescript
const helpers = useFeatureLimitHelpers();

// Validação de features
await helpers.checkFeatureAccess('ocr_scanner');

// Validação de limites
await helpers.canAddDependent(currentCount);
await helpers.canAddCaretaker(currentCount);
await helpers.canGenerateReport();
await helpers.canUseOCR();

// Informações de uso
helpers.getUsageDisplay(5, 'reportsPerMonth'); // "5/10"
helpers.getUsagePercentage(5, 'reportsPerMonth'); // 50
```

### Guards Disponíveis

```typescript
// Por feature
featureGuard('ocr_scanner')
featureWithLimitGuard('generate_reports', 'reportsPerMonth')

// Por plano
planGuard('premium')
premiumGuard()
familyGuard()
enterpriseGuard()

// Por limite
limitGuard('maxDependents', getCurrentCountFn)
```

### Diretivas Disponíveis

```html
*hasFeature="'feature_id'"
*requiresPlan="'premium'"
*featureLocked="'feature_id'"
*isPremium
*isFamily
```

---

## 🎯 Próximos Passos

1. ✅ Sistema base de feature mapping implementado
2. ✅ Limites quantitativos configurados
3. ✅ Guards e diretivas criados
4. ✅ Modal de upgrade contextual
5. ⏳ Integrar com serviços reais (medication, dependent, etc)
6. ⏳ Implementar analytics de conversão
7. ⏳ A/B testing de mensagens de upgrade
8. ⏳ Gamificação de upsell

---

## 💡 Boas Práticas

1. **Sempre valide limites antes de permitir ações**
   ```typescript
   const canAdd = await helpers.canAddDependent(count);
   if (canAdd) await addToDatabase();
   ```

2. **Use guards para proteger rotas premium**
   ```typescript
   canActivate: [featureGuard('premium_feature')]
   ```

3. **Forneça feedback visual de uso**
   ```html
   <ion-progress-bar [value]="percentage / 100"></ion-progress-bar>
   ```

4. **Incremente contadores após ações**
   ```typescript
   await subscriptionService.incrementUsage(userId, 'reportsThisMonth');
   ```

5. **Mostre upgrade contextual**
   ```typescript
   featureMapping.navigateToUpgrade('feature_id', 'reason');
   ```

---

## 📞 Suporte

Para dúvidas sobre o sistema de feature mapping:
- Documentação: Este arquivo
- Exemplos: `src/app/services/feature-mapping.integration.example.ts`
- Issues: GitHub Issues

---

**Desenvolvido com ❤️ para Medicamenta.me**
