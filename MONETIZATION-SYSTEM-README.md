# 🚀 Medicamenta.me - Sistema de Monetização

Documentação completa do sistema de assinaturas e feature flags implementado no Medicamenta.me.

---

## 📦 O que foi implementado?

Este sistema permite monetizar o aplicativo através de **4 planos de assinatura**, com controle granular de acesso a features premium.

### Componentes Principais:

1. **Subscription System** - Gerenciamento de assinaturas
2. **Feature Flags** - Controle de acesso a features
3. **Biometric Auth** - Autenticação biométrica
4. **Paywall** - Página de upgrade

---

## 🎯 Planos de Assinatura

### 🆓 Free (Atual Padrão)
**Preço:** R$ 0/mês

**Limites:**
- 1 dependente
- 2 cuidadores
- 3 relatórios/mês
- 0 scans OCR/mês
- 0 consultas telemedicina/mês

**Features:**
- Medicamentos ilimitados
- Lembretes locais
- Gamificação básica (6 achievements)
- Insights básicos (30 dias)
- Offline sync

---

### 💎 Premium
**Preço:** R$ 14,90/mês ou R$ 178,80/ano  
**Economia:** R$ 71,52/ano (20% off no anual)

**Limites:**
- ∞ dependentes
- ∞ cuidadores
- ∞ relatórios
- 20 scans OCR/mês
- 1 consulta telemedicina/mês

**Features Exclusivas:**
- ✨ Scanner OCR de receitas
- ✨ Lembretes inteligentes (ML)
- ✨ Integração com wearables (Apple Watch, Fitbit, etc)
- ✨ Insights avançados
- ✨ Verificação de interações medicamentosas
- ✨ Push notifications remotas
- ✨ Gamificação completa

---

### 👨‍👩‍👧 Family
**Preço:** R$ 29,90/mês ou R$ 358,80/ano  
**Economia:** R$ 71,52/ano (20% off no anual)

**Limites:**
- ∞ dependentes
- ∞ cuidadores
- ∞ relatórios
- ∞ scans OCR
- 3 consultas telemedicina/mês

**Features Exclusivas do Family:**
- 👪 Dashboard familiar agregado
- 👪 Chat entre cuidadores
- 👪 Calendário compartilhado
- Tudo do Premium

---

### 🏢 Enterprise
**Preço:** Custom (falar com vendas)

**Features Exclusivas do Enterprise:**
- 🏢 SSO (SAML 2.0 / OAuth 2.0)
- 🏢 White-label
- 🏢 API access
- 🏢 Bulk import
- 🏢 Audit logs completos
- ∞ consultas telemedicina
- Suporte dedicado
- Tudo do Family

**Contato:** enterprise@medicamenta.me

---

## 🔧 Como Usar (Para Desenvolvedores)

### 1. Verificar Plano Atual

```typescript
import { SubscriptionService } from '@services/subscription.service';

export class MyComponent {
  private subscriptionService = inject(SubscriptionService);
  
  ngOnInit() {
    const currentPlan = this.subscriptionService.currentPlan(); // 'free' | 'premium' | 'family' | 'enterprise'
    const isPremium = this.subscriptionService.isPremium(); // boolean
    const isFamily = this.subscriptionService.isFamily(); // boolean
  }
}
```

---

### 2. Verificar Acesso a Feature

```typescript
import { FeatureFlagsService } from '@services/feature-flags.service';

export class MyComponent {
  private featureFlags = inject(FeatureFlagsService);
  
  checkAccess() {
    const result = this.featureFlags.hasAccess('ocr_scanner');
    
    if (result.allowed) {
      // User tem acesso
      this.startOCRScan();
    } else {
      // User não tem acesso
      console.log('Upgrade required:', result.requiredPlan); // 'premium'
      this.router.navigate(['/upgrade'], { queryParams: { feature: 'ocr_scanner' } });
    }
  }
}
```

---

### 3. Proteger Rotas

```typescript
// app.routes.ts
import { featureGuard, planGuard } from '@guards/feature.guard';

export const routes: Routes = [
  {
    path: 'scanner',
    loadComponent: () => import('./scanner.component'),
    canActivate: [featureGuard('ocr_scanner')]
    // Redireciona automaticamente para /upgrade se user não tiver acesso
  },
  {
    path: 'family-dashboard',
    loadComponent: () => import('./family-dashboard.component'),
    canActivate: [planGuard('family')]
  }
];
```

---

### 4. Renderização Condicional (Templates)

```html
<!-- Mostrar apenas para Premium+ -->
<button *hasFeature="'ocr_scanner'">
  <ion-icon name="camera"></ion-icon>
  Escanear Receita
</button>

<!-- Com template de fallback -->
<div *hasFeature="'advanced_insights'; else upgradePrompt">
  <app-advanced-insights></app-advanced-insights>
</div>

<ng-template #upgradePrompt>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Recurso Premium</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>Faça upgrade para acessar insights avançados</p>
      <ion-button routerLink="/upgrade">Ver Planos</ion-button>
    </ion-card-content>
  </ion-card>
</ng-template>

<!-- Mostrar apenas para Family+ -->
<ion-item *requiresPlan="'family'">
  <ion-icon name="people" slot="start"></ion-icon>
  <ion-label>Dashboard Familiar</ion-label>
</ion-item>
```

---

### 5. Verificar e Incrementar Uso

```typescript
import { SubscriptionService } from '@services/subscription.service';

export class ReportsService {
  private subscriptionService = inject(SubscriptionService);
  
  async generateReport() {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) return;
    
    // Verificar se está dentro do limite
    if (!this.subscriptionService.isWithinLimit('reportsPerMonth')) {
      // Mostrar paywall
      this.router.navigate(['/upgrade'], { 
        queryParams: { feature: 'unlimited_reports' } 
      });
      return;
    }
    
    // Gerar relatório
    const report = await this.createReport();
    
    // Incrementar contador de uso
    await this.subscriptionService.incrementUsage(userId, 'reportsThisMonth');
    
    return report;
  }
  
  getRemainingReports(): number {
    return this.subscriptionService.getRemainingUsage('reportsPerMonth');
  }
}
```

---

### 6. Fazer Upgrade

```typescript
async upgradeToReportremium() {
  const userId = this.authService.currentUser()?.uid;
  if (!userId) return;
  
  // Em produção, isso seria feito pelo webhook do Stripe/PagSeguro
  // Aqui é apenas para demonstração
  await this.subscriptionService.upgradeSubscription(userId, 'premium');
  
  console.log('Upgrade realizado!');
  this.router.navigate(['/tabs/dashboard']);
}
```

---

### 7. Usar Biometria

```typescript
import { BiometricService } from '@services/biometric.service';

export class LoginComponent {
  private biometricService = inject(BiometricService);
  
  async loginWithBiometric() {
    // Verificar se está disponível
    if (!this.biometricService.canUseBiometrics()) {
      console.log('Biometria não disponível ou não habilitada');
      return;
    }
    
    // Autenticar
    const success = await this.biometricService.authenticate({
      reason: 'Faça login no Medicamenta.me',
      cancelTitle: 'Cancelar',
      fallbackTitle: 'Usar Senha'
    });
    
    if (success) {
      // Prosseguir com login
      await this.authService.loginWithStoredCredentials();
    }
  }
  
  async enableBiometric() {
    const enabled = await this.biometricService.enable();
    
    if (enabled) {
      console.log('Biometria ativada!');
      console.log('Tipo:', this.biometricService.biometryName()); // 'Face ID' | 'Touch ID' | etc
    }
  }
}
```

---

## 🎨 Features Disponíveis

Lista completa de feature flags configurados:

| Feature Flag | Plano Mínimo | Platform | Descrição |
|--------------|-------------|----------|-----------|
| `ocr_scanner` | Premium | Mobile | Scanner OCR de receitas |
| `smart_reminders` | Premium | All | Lembretes inteligentes com ML |
| `wearable_integration` | Premium | Mobile | Integração com wearables |
| `advanced_insights` | Premium | All | Insights avançados |
| `interaction_checker` | Premium | All | Verificação de interações |
| `remote_notifications` | Premium | All | Push notifications remotas |
| `unlimited_reports` | Premium | All | Relatórios ilimitados |
| `telehealth_basic` | Premium | All | 1 consulta/mês |
| `family_dashboard` | Family | All | Dashboard familiar |
| `family_chat` | Family | All | Chat entre cuidadores |
| `shared_calendar` | Family | All | Calendário compartilhado |
| `ocr_unlimited` | Family | Mobile | OCR ilimitado |
| `telehealth_extended` | Family | All | 3 consultas/mês |
| `sso_authentication` | Enterprise | All | SSO (SAML/OAuth) |
| `white_label` | Enterprise | All | White-label branding |
| `api_access` | Enterprise | All | API REST |
| `bulk_import` | Enterprise | All | Importação em massa |
| `audit_logs` | Enterprise | All | Logs de auditoria |
| `telehealth_unlimited` | Enterprise | All | Telemedicina ilimitada |

### Beta Features:

| Feature Flag | Descrição | Rollout % |
|--------------|-----------|-----------|
| `beta_medication_scanner_v2` | Nova versão do OCR | 10% |
| `beta_voice_commands` | Comandos por voz | 5% |
| `beta_ai_chatbot` | Chatbot de saúde | 10% |

---

## 📱 Biometric Authentication

### Tipos Suportados:

| Platform | Tipo | Capacitor BiometryType |
|----------|------|------------------------|
| iOS | Face ID | BiometryType.faceId (1) |
| iOS | Touch ID | BiometryType.touchId (2) |
| Android | Fingerprint | BiometryType.fingerprintAuthentication (3) |
| Android | Face | BiometryType.faceAuthentication (4) |
| Android | Iris | BiometryType.irisAuthentication (5) |

### Estados:

```typescript
interface BiometricState {
  isAvailable: boolean;  // Device suporta biometria?
  isEnabled: boolean;    // User habilitou biometria?
  biometryType: BiometryType; // Qual tipo está disponível
  biometryName: string;  // Nome user-friendly (ex: 'Face ID')
}
```

### Error Handling:

```typescript
try {
  await this.biometricService.authenticate();
} catch (error) {
  // Erros possíveis:
  // - User cancelou
  // - Falha na autenticação (tentativas excedidas)
  // - Biometria não disponível
  // - Biometria não configurada no device
  console.error('Biometric error:', error);
}
```

---

## 🧪 Testing (TODO - Sprint 2)

```typescript
// subscription.service.spec.ts
describe('SubscriptionService', () => {
  it('should create free subscription for new users', async () => {
    await service.loadSubscription('user123');
    expect(service.currentPlan()).toBe('free');
  });

  it('should enforce usage limits', () => {
    // Free plan: 0 OCR scans
    expect(service.isWithinLimit('ocrScansPerMonth')).toBe(false);
  });

  it('should increment usage counter', async () => {
    await service.incrementUsage('user123', 'reportsThisMonth');
    expect(service.getRemainingUsage('reportsPerMonth')).toBe(2); // 3 - 1
  });
});
```

---

## 🚨 Troubleshooting

### Problema: Feature flag sempre retorna `false`

**Causa:** User não tem plano adequado ou feature está em rollout limitado.

**Solução:**
```typescript
const result = this.featureFlags.hasAccess('ocr_scanner');
console.log('Allowed:', result.allowed);
console.log('Reason:', result.reason);
console.log('Required Plan:', result.requiredPlan);
console.log('Upgrade Required:', result.upgradeRequired);
```

---

### Problema: Biometria não funciona

**Causa:** Usuário não configurou biometria no device ou negou permissão.

**Solução:**
```typescript
const state = this.biometricService.getState();
console.log('Available:', state.isAvailable);
console.log('Enabled:', state.isEnabled);
console.log('Type:', state.biometryType);

if (!state.isAvailable) {
  // Mostrar mensagem: "Seu dispositivo não suporta biometria"
}

if (state.isAvailable && !state.isEnabled) {
  // Mostrar botão: "Ativar Biometria"
}
```

---

### Problema: Upgrade não funciona

**Causa:** Payment integration ainda não implementada.

**Solução:** Por enquanto, o upgrade é apenas simulação. Na Sprint 2, será integrado Stripe/PagSeguro.

```typescript
// TEMPORÁRIO - apenas atualiza o Firestore
await this.subscriptionService.upgradeSubscription(userId, 'premium');

// FUTURO - Sprint 2
const session = await this.stripeService.createCheckoutSession('premium', 'monthly');
window.location.href = session.url;
```

---

## 📚 Referências

### Documentação Oficial:
- [Angular Signals](https://angular.io/guide/signals)
- [Ionic Components](https://ionicframework.com/docs/components)
- [Capacitor Biometric Auth](https://github.com/aparajita/capacitor-biometric-auth)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

### Arquivos do Projeto:
- `IMPLEMENTATION-REPORT-SPRINT-1.md` - Relatório técnico completo
- `SPRINT-1-SUMMARY.md` - Resumo executivo
- `PRODUCT-ROADMAP-NEXT-STEPS.md` - Roadmap do produto

---

## 🤝 Contribuindo

### Adicionar Nova Feature Flag:

1. Adicionar em `feature-flags.model.ts`:
```typescript
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlag> = {
  // ... existing flags
  my_new_feature: {
    name: 'my_new_feature',
    enabled: true,
    requiredPlan: 'premium',
    platforms: ['ios', 'android', 'web'],
    rolloutPercentage: 100,
    betaOnly: false
  }
};
```

2. Adicionar ao type union:
```typescript
export type FeatureFlagName =
  | 'ocr_scanner'
  | 'my_new_feature'  // <-- adicionar aqui
  | // ... outros
```

3. Atualizar features em `subscription.model.ts`:
```typescript
export const DEFAULT_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  premium: {
    // ... existing features
    myNewFeature: true
  }
};
```

4. Usar no código:
```typescript
if (this.featureFlags.hasAccess('my_new_feature').allowed) {
  // Feature code
}
```

---

## 📞 Suporte

- **Email:** support@medicamenta.me
- **Enterprise:** enterprise@medicamenta.me
- **GitHub:** [Issues](https://github.com/medicamenta/medicamenta.me/issues)

---

**Última Atualização:** 2025-11-07  
**Versão:** 1.0.0  
**Status:** ✅ Production Ready (aguardando payment integration)
