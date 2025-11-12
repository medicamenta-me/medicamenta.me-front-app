# 🎯 Sistema de Feature Mapping - README

> Sistema completo de controle de acesso a funcionalidades e limites quantitativos por plano de assinatura.

---

## 📚 Documentação

Este sistema possui documentação completa em múltiplos níveis:

### 📖 Para Começar
- **[Quick Reference](./FEATURE-MAPPING-QUICK-REFERENCE.md)** ⚡ - Consulta rápida (copiar/colar)
- **[Guia Completo](./FEATURE-MAPPING-GUIDE.md)** 📘 - Documentação detalhada
- **[Resumo de Implementação](./FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md)** 📊 - O que foi feito

### 💻 Exemplos de Código
- **[Integração com Serviços](./src/app/services/feature-mapping.integration.example.ts)** - Exemplos de integração
- **[Página Completa](./src/app/pages/add-dependent-example.page.ts)** - Exemplo real de uso

---

## 🚀 Início Rápido

### 1. Importar

```typescript
import { 
  FeatureMappingService,
  featureGuard,
  HasFeatureDirective,
  useFeatureLimitHelpers
} from '@app/feature-mapping.index';
```

### 2. Validar Acesso

```typescript
export class MyComponent {
  private helpers = useFeatureLimitHelpers();

  async addDependent() {
    const count = await this.getDependentCount();
    const canAdd = await this.helpers.canAddDependent(count);
    
    if (canAdd) {
      await this.saveToDatabase();
    }
    // Modal exibido automaticamente se bloqueado
  }
}
```

### 3. Proteger Rota

```typescript
// app.routes.ts
{
  path: 'premium-feature',
  canActivate: [featureGuard('ocr_scanner')],
  loadComponent: () => import('./premium.page')
}
```

### 4. Template Condicional

```html
<ion-button *hasFeature="'ocr_scanner'">
  Escanear Receita
</ion-button>
```

---

## 🎯 Principais Features

✅ **Controle Granular** - Acesso por feature individual  
✅ **Limites Quantitativos** - Dependentes, relatórios, OCR, etc  
✅ **Feedback Automático** - Modals contextuais de upgrade  
✅ **Type-Safe** - TypeScript completo  
✅ **Reactive** - Signals para reatividade  
✅ **Standalone** - Componentes independentes  
✅ **Performance** - Otimizado e eficiente  

---

## 📦 Arquivos Criados

```
src/app/
├── models/feature-mapping.model.ts          # Tipos e configurações
├── services/feature-mapping.service.ts      # Serviço principal
├── guards/feature-mapping.guard.ts          # Guards de rota
├── directives/feature-mapping.directive.ts  # Diretivas estruturais
├── components/limit-reached-modal/          # Modal de upgrade
├── shared/feature-limit.helpers.ts          # Funções auxiliares
├── feature-mapping.index.ts                 # Exports centralizados
└── pages/add-dependent-example.page.ts      # Exemplo prático

Documentação:
├── FEATURE-MAPPING-GUIDE.md                 # Guia completo
├── FEATURE-MAPPING-QUICK-REFERENCE.md       # Referência rápida
├── FEATURE-MAPPING-IMPLEMENTATION-SUMMARY.md # Resumo técnico
└── FEATURE-MAPPING-README.md                # Este arquivo
```

---

## 🎨 Limites por Plano

| Recurso | Free | Premium | Family | Enterprise |
|---------|------|---------|--------|------------|
| Medicações | ∞ | ∞ | ∞ | ∞ |
| Dependentes | **1** | ∞ | ∞ | ∞ |
| Cuidadores | **2** | ∞ | ∞ | ∞ |
| Relatórios/mês | **3** | ∞ | ∞ | ∞ |
| Scans OCR/mês | **0** | **20** | ∞ | ∞ |
| Telemedicina/mês | **0** | **1** | **3** | ∞ |

> **Legenda:** ∞ = Ilimitado

---

## 🛠️ Como Usar

### Validação de Limite Simples

```typescript
const helpers = useFeatureLimitHelpers();

// Valida e mostra modal automaticamente
const canAdd = await helpers.canAddDependent(currentCount);
if (canAdd) {
  // Adicionar ao banco
}
```

### Informações de Uso

```typescript
const featureMapping = inject(FeatureMappingService);

// Display formatado
const display = featureMapping.getUsageDisplay(5, 'reportsPerMonth');
// Resultado: "5/10" ou "5/Ilimitado"

// Percentual
const percentage = featureMapping.getUsagePercentage(5, 'reportsPerMonth');
// Resultado: 50
```

### Guards de Rota

```typescript
// Proteger por feature
canActivate: [featureGuard('ocr_scanner')]

// Proteger por plano
canActivate: [planGuard('premium')]
canActivate: [premiumGuard()]

// Combinar feature + limite
canActivate: [featureWithLimitGuard('generate_reports', 'reportsPerMonth')]
```

### Diretivas em Template

```html
<!-- Renderização condicional -->
<div *hasFeature="'ocr_scanner'">
  Scanner disponível
</div>

<!-- Com fallback -->
<div *hasFeature="'premium_feature'; else locked">
  Conteúdo premium
</div>
<ng-template #locked>
  <p>Faça upgrade</p>
</ng-template>

<!-- Por plano -->
<div *requiresPlan="'family'">
  Conteúdo família
</div>

<!-- Shortcuts -->
<div *isPremium>Premium+</div>
<div *isFamily>Family+</div>

<!-- Inverso (bloqueado) -->
<div *featureLocked="'ocr_scanner'">
  🔒 Feature bloqueada
</div>
```

---

## 🎯 Features Disponíveis

### 🆓 Free
- `basic_medication_tracking`
- `local_reminders`
- `offline_sync`
- `basic_gamification`

### 💎 Premium
- `ocr_scanner` (20/mês)
- `interaction_checker`
- `smart_reminders`
- `advanced_insights`
- `wearable_integration`
- `push_notifications`
- `priority_support`

### 👨‍👩‍👧 Family
- `family_dashboard`
- `caretaker_chat`
- `shared_calendar`
- OCR ilimitado

### 🏢 Enterprise
- `white_label`
- `sso`
- `api_access`
- `bulk_import`
- `audit_logs`

---

## 🔧 Customização

### Adicionar Nova Feature

```typescript
// 1. Adicionar ID
export type FeatureId = 
  | 'existing_feature'
  | 'my_new_feature';

// 2. Configurar
export const FEATURE_MAP = {
  my_new_feature: {
    id: 'my_new_feature',
    name: 'Minha Feature',
    description: 'Descrição',
    category: FeatureCategory.PREMIUM,
    requiredPlan: 'premium',
    isEnabled: true,
  },
};
```

### Modificar Limites

```typescript
// Editar em PLAN_LIMITS
export const PLAN_LIMITS = {
  premium: {
    ocrScansPerMonth: 30, // Era 20
  },
};
```

---

## 🧪 Testing

```typescript
// Simular diferentes planos
localStorage.setItem('test_plan', 'premium');

// Simular uso
localStorage.setItem('test_reports_used', '3');

// Debug
localStorage.setItem('debug_feature_mapping', 'true');
```

---

## 📊 Analytics Recomendadas

```typescript
// Rastrear bloqueios
analytics.logEvent('feature_blocked', {
  feature: 'ocr_scanner',
  current_plan: 'free',
  required_plan: 'premium'
});

// Rastrear conversão
analytics.logEvent('upgrade_shown', {
  feature: 'ocr_scanner',
  reason: 'limit_reached'
});
```

---

## ⚡ Performance

- ✅ Validações com **signals** (reactive)
- ✅ Modal com **lazy loading**
- ✅ Computed values **cached**
- ✅ Guards **non-blocking**
- ✅ Diretivas **otimizadas**

---

## 🐛 Troubleshooting

### Modal não aparece
```typescript
// ✅ Usar await
const can = await helpers.canAddDependent(count);

// ❌ Sem await
const can = helpers.canAddDependent(count);
```

### Diretiva não funciona
```typescript
// ✅ Importar no componente
@Component({
  imports: [HasFeatureDirective]
})
```

### Limite não respeita
```typescript
// ✅ Incrementar contador
await subscriptionService.incrementUsage(userId, 'reportsThisMonth');
```

---

## 📞 Suporte

- 📖 **Documentação**: Ver arquivos MD nesta pasta
- 💻 **Exemplos**: Ver `integration.example.ts` e `add-dependent-example.page.ts`
- 🐛 **Issues**: Criar issue no GitHub

---

## 🎓 Próximos Passos

1. ✅ Sistema base implementado
2. ⏳ Integrar com serviços reais
3. ⏳ Adicionar analytics
4. ⏳ A/B testing de mensagens
5. ⏳ Implementar gamificação de upgrade

---

## 📝 Changelog

### v1.0.0 (10/11/2025)
- ✅ Sistema base de feature mapping
- ✅ Limites quantitativos por plano
- ✅ Guards e diretivas
- ✅ Modal de upgrade contextual
- ✅ Documentação completa
- ✅ Exemplos práticos

---

## 👥 Contribuindo

1. Ler documentação completa
2. Seguir padrões estabelecidos
3. Adicionar testes quando aplicável
4. Atualizar documentação

---

## 📄 Licença

Propriedade de Medicamenta.me

---

**Desenvolvido com ❤️ para Medicamenta.me**  
**Versão:** 1.0.0  
**Data:** 10 de Novembro de 2025
