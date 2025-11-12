# 🚀 Feature Mapping - Quick Reference

Guia rápido de consulta para desenvolvedores.

---

## 📦 Importações

```typescript
// Importar tudo de uma vez
import { 
  FeatureMappingService,
  featureGuard,
  HasFeatureDirective,
  useFeatureLimitHelpers,
  FeatureId,
  PlanLimits
} from '@app/feature-mapping.index';

// Ou importar individualmente
import { FeatureMappingService } from '@services/feature-mapping.service';
import { featureGuard } from '@guards/feature-mapping.guard';
```

---

## 🎯 Service Methods

### Verificar Acesso

```typescript
// Verificar feature específica
const result = featureMapping.hasAccess('ocr_scanner');
// { allowed: boolean, requiredPlan: 'premium', message?: string }

// Verificar plano atual
const plan = featureMapping.currentPlan(); // 'free' | 'premium' | 'family' | 'enterprise'

// Verificar se é premium+
const isPremium = featureMapping.isPremium();
```

### Validar Limites

```typescript
// Validar limite genérico
const result = await featureMapping.checkLimit('maxDependents', currentCount);
// { allowed: boolean, currentUsage: number, limit: number, remaining: number }

// Validadores específicos
const canAdd = await featureMapping.canAddDependent(count);
const canAdd = await featureMapping.canAddCaretaker(count);
const canAdd = await featureMapping.canAddMedication(count);
const canGenerate = await featureMapping.canGenerateReport();
const canUse = await featureMapping.canUseOCR();
const canSchedule = await featureMapping.canScheduleTelehealth();
```

### Informações de Uso

```typescript
// Display formatado
featureMapping.getUsageDisplay(5, 'reportsPerMonth'); // "5/10" ou "5/Ilimitado"

// Percentual
featureMapping.getUsagePercentage(5, 'reportsPerMonth'); // 50

// Limites do plano atual
const limits = featureMapping.getCurrentPlanLimits();
// { maxDependents: 1, maxCaretakers: 2, ... }
```

### Navegação

```typescript
// Navegar para upgrade com contexto
featureMapping.navigateToUpgrade('ocr_scanner', 'limit_reached');

// Lidar com limite atingido
featureMapping.handleLimitReached('maxDependents', 'add_dependents');
```

---

## 🛡️ Guards

### Proteger por Feature

```typescript
// app.routes.ts
{
  path: 'ocr-scanner',
  canActivate: [featureGuard('ocr_scanner')],
  loadComponent: () => import('./ocr-scanner.page')
}
```

### Proteger por Plano

```typescript
{
  path: 'family-dashboard',
  canActivate: [planGuard('family')],
  loadComponent: () => import('./family-dashboard.page')
}

// Ou usar shortcuts
canActivate: [premiumGuard()]
canActivate: [familyGuard()]
canActivate: [enterpriseGuard()]
```

### Proteger com Feature + Limite

```typescript
{
  path: 'generate-report',
  canActivate: [featureWithLimitGuard('generate_reports', 'reportsPerMonth')],
  loadComponent: () => import('./report.page')
}
```

---

## 🎨 Diretivas de Template

### *hasFeature

```html
<!-- Básico -->
<ion-button *hasFeature="'ocr_scanner'">
  Escanear
</ion-button>

<!-- Com else -->
<div *hasFeature="'ocr_scanner'; else locked">
  <app-scanner></app-scanner>
</div>
<ng-template #locked>
  <p>Feature bloqueada</p>
</ng-template>
```

### *requiresPlan

```html
<ion-item *requiresPlan="'premium'">
  Premium Content
</ion-item>

<!-- Com else -->
<div *requiresPlan="'family'; else upgrade">
  Family Content
</div>
```

### *featureLocked

```html
<!-- Mostra quando NÃO tem acesso (inverso de hasFeature) -->
<ion-card *featureLocked="'ocr_scanner'">
  <p>🔒 Faça upgrade para desbloquear</p>
  <ion-button routerLink="/upgrade">Upgrade</ion-button>
</ion-card>
```

### Shortcuts

```html
<!-- Plano Premium+ -->
<div *isPremium>
  Premium content
</div>

<!-- Plano Family+ -->
<div *isFamily>
  Family content
</div>
```

---

## 🔧 Helpers

### Setup no Componente

```typescript
export class MyComponent {
  private helpers = useFeatureLimitHelpers();

  async doAction() {
    // Helpers já mostram modal automaticamente
    const canAdd = await this.helpers.canAddDependent(count);
    if (canAdd) {
      // Adicionar dependente
    }
  }
}
```

### Métodos Disponíveis

```typescript
// Validação com modal automático
await helpers.checkFeatureAccess('ocr_scanner');
await helpers.canAddDependent(count);
await helpers.canAddCaretaker(count);
await helpers.canGenerateReport();
await helpers.canUseOCR();

// Informações de uso
helpers.getUsageDisplay(5, 'reportsPerMonth');
helpers.getUsagePercentage(5, 'reportsPerMonth');
```

---

## 📊 Exemplo Completo: Componente

```typescript
import { Component, inject, signal } from '@angular/core';
import { 
  FeatureMappingService,
  useFeatureLimitHelpers,
  HasFeatureDirective
} from '@app/feature-mapping.index';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [HasFeatureDirective],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Relatórios</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Status de uso -->
      <ion-card>
        <ion-card-content>
          <h3>Relatórios este mês</h3>
          <p>{{ usageInfo().display }}</p>
          <ion-progress-bar 
            [value]="usageInfo().percentage / 100">
          </ion-progress-bar>
        </ion-card-content>
      </ion-card>

      <!-- Botão protegido -->
      <ion-button 
        *hasFeature="'generate_reports'"
        (click)="generateReport()"
        [disabled]="!canGenerate()">
        Gerar Relatório
      </ion-button>
    </ion-content>
  `
})
export class MyPage {
  private featureMapping = inject(FeatureMappingService);
  private helpers = useFeatureLimitHelpers();

  usageInfo = signal({
    display: '0/3',
    percentage: 0,
  });

  canGenerate = signal(true);

  async ngOnInit() {
    await this.loadUsageInfo();
  }

  async loadUsageInfo() {
    const result = await this.featureMapping.canGenerateReport();
    
    this.usageInfo.set({
      display: this.helpers.getUsageDisplay(
        result.currentUsage, 
        'reportsPerMonth'
      ),
      percentage: this.helpers.getUsagePercentage(
        result.currentUsage,
        'reportsPerMonth'
      ),
    });

    this.canGenerate.set(result.allowed);
  }

  async generateReport() {
    const can = await this.helpers.canGenerateReport();
    
    if (can) {
      // Gerar relatório
      await this.doGenerateReport();
      
      // Atualizar uso
      await this.loadUsageInfo();
    }
    // Modal já foi exibido automaticamente se necessário
  }

  private async doGenerateReport() {
    // Implementação
  }
}
```

---

## 🎯 Features IDs Disponíveis

```typescript
// Core (Todos)
'basic_medication_tracking'
'local_reminders'
'offline_sync'
'basic_gamification'

// Premium+
'ocr_scanner'              // 20/mês Premium, ilimitado Family
'interaction_checker'
'smart_reminders'
'advanced_insights'
'wearable_integration'
'push_notifications'
'priority_support'

// Family+
'family_dashboard'
'caretaker_chat'
'shared_calendar'

// Enterprise
'white_label'
'sso'
'api_access'
'bulk_import'
'audit_logs'
```

---

## 📏 Limit Keys Disponíveis

```typescript
type LimitKey = 
  | 'maxMedications'                  // Número máximo de medicações
  | 'maxDependents'                   // Número máximo de dependentes
  | 'maxCaretakers'                   // Número máximo de cuidadores
  | 'reportsPerMonth'                 // Relatórios por mês
  | 'ocrScansPerMonth'                // Scans OCR por mês
  | 'telehealthConsultsPerMonth'      // Consultas por mês
  | 'insightsHistoryDays'             // Dias de histórico
  | 'maxStorageMB';                   // Armazenamento em MB
```

---

## 🎨 Colors por Percentual de Uso

```typescript
function getUsageColor(percentage: number): string {
  if (percentage >= 100) return 'danger';
  if (percentage >= 80) return 'warning';
  if (percentage >= 50) return 'medium';
  return 'primary';
}
```

---

## 🔍 Debugging

```typescript
// Console do navegador
localStorage.setItem('debug_feature_mapping', 'true');

// Ver plano atual
featureMapping.currentPlan()

// Ver limites
featureMapping.getCurrentPlanLimits()

// Ver todas features disponíveis
featureMapping.getAvailableFeatures()

// Ver features bloqueadas
featureMapping.getLockedFeatures()

// Sugestões de upgrade
featureMapping.getUpgradeSuggestions()
```

---

## ⚠️ Troubleshooting Comum

### Modal não aparece

```typescript
// ✅ Correto - usar await
const canAdd = await helpers.canAddDependent(count);

// ❌ Errado - sem await
const canAdd = helpers.canAddDependent(count);
```

### Diretiva não funciona

```typescript
// ✅ Correto - importar no componente standalone
@Component({
  imports: [HasFeatureDirective, IsPremiumDirective],
})

// ❌ Errado - esquecer de importar
```

### Limite não respeita

```typescript
// ✅ Correto - incrementar após ação
await this.doAction();
await subscriptionService.incrementUsage(userId, 'reportsThisMonth');

// ❌ Errado - esquecer de incrementar
await this.doAction();
```

---

## 📈 Performance Tips

1. **Cache de validações** - validações já são otimizadas com signals
2. **Batch validations** - use `checkMultipleLimits()` para várias validações
3. **Lazy loading** - modal carrega sob demanda automaticamente
4. **Computed values** - use computed() para valores derivados

```typescript
// Exemplo de computed
readonly canAddMore = computed(() => {
  const info = this.limitInfo();
  return info.canAddMore;
});
```

---

## 🎓 Padrões Recomendados

### 1. Validar antes de permitir ação

```typescript
async addItem() {
  const can = await this.helpers.canAddDependent(count);
  if (!can) return; // Modal já mostrado
  
  await this.saveToDatabase();
}
```

### 2. Mostrar progresso de uso

```html
<ion-progress-bar [value]="percentage / 100"></ion-progress-bar>
<p>{{ usageDisplay }}</p>
```

### 3. Avisar quando próximo do limite

```typescript
if (percentage >= 80 && percentage < 100) {
  await this.showWarningToast('Próximo do limite!');
}
```

### 4. Proteger rotas críticas

```typescript
canActivate: [featureGuard('premium_feature')]
```

### 5. Feedback contextual

```typescript
featureMapping.navigateToUpgrade('ocr_scanner', 'user_clicked_button');
```

---

## 🔗 Links Úteis

- **Documentação Completa**: `FEATURE-MAPPING-GUIDE.md`
- **Resumo de Implementação**: `FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md`
- **Exemplo Prático**: `src/app/pages/add-dependent-example.page.ts`
- **Integrações**: `src/app/services/feature-mapping.integration.example.ts`

---

**Última atualização:** 10 de Novembro de 2025
