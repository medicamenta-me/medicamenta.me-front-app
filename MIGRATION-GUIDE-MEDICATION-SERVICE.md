# Guia de Migração - MedicationService → MedicationServiceV2

**Objetivo:** Migrar componentes do `MedicationService` original para `MedicationServiceV2` (DDD).

**Estratégia:** Strangler Fig Pattern - Migração incremental sem quebrar código existente.

---

## 📋 Pré-requisitos

- ✅ Sprint 6 completo (MedicationServiceV2 implementado)
- ✅ Testes unitários da nova arquitetura (>80% coverage)
- ✅ Ambiente de staging para testes

---

## 🔄 Estratégia de Migração

### Fase 1: Coexistência (Semanas 1-2)

**Objetivo:** Ambos serviços funcionando em paralelo

**Passos:**
1. ✅ MedicationServiceV2 já implementado
2. ✅ MedicationService original continua funcionando
3. Componentes novos usam V2
4. Componentes existentes continuam usando original

**Configuração:**
```typescript
// app.config.ts ou providers
providers: [
  MedicationService,      // Original (legacy)
  MedicationServiceV2,    // Nova versão DDD
  // Ambos disponíveis
]
```

### Fase 2: Migração Gradual (Semanas 3-6)

**Objetivo:** Migrar componentes um por um

**Ordem sugerida:**
1. Componentes simples (read-only)
2. Componentes de criação/edição
3. Componentes complexos (dashboards)
4. Páginas principais

**Critérios de sucesso:**
- ✅ Testes E2E passando
- ✅ Sem regressões visuais
- ✅ Performance igual ou melhor
- ✅ Analytics mostrando uso correto

### Fase 3: Validação (Semanas 7-8)

**Objetivo:** Garantir que tudo funciona

**Atividades:**
- Testes de regressão completos
- Performance testing
- User acceptance testing
- Análise de analytics

### Fase 4: Limpeza (Semana 9+)

**Objetivo:** Remover código legado

**Passos:**
1. Verificar 100% dos componentes migrados
2. Remover MedicationService original
3. Renomear MedicationServiceV2 → MedicationService
4. Atualizar documentação

---

## 🔧 Como Migrar um Componente

### Passo 1: Trocar Injeção

**Antes:**
```typescript
import { MedicationService } from '@services/medication.service';

@Component({...})
export class MedicationListComponent {
  private medicationService = inject(MedicationService);
}
```

**Depois:**
```typescript
import { MedicationServiceV2 } from '@services/medication-v2.service';

@Component({...})
export class MedicationListComponent {
  private medicationService = inject(MedicationServiceV2);
}
```

### Passo 2: Verificar API Pública

**API idêntica - nenhuma mudança necessária:**
```typescript
// ✅ Funciona sem alterações
this.medications = this.medicationService.medications();
const med = this.medicationService.getMedicationById(id);
await this.medicationService.addMedication(data);
await this.medicationService.updateMedication(id, updates);
await this.medicationService.deleteMedication(id, name);
await this.medicationService.updateDoseStatus(id, time, status, admin);
```

### Passo 3: Aproveitar Novas Features (Opcional)

**Nova API DDD:**
```typescript
// Entities (em vez de DTOs)
const entity = await this.medicationService.getMedicationEntityById(id);
const adherence = entity.calculateAdherenceRate();
const nextDose = entity.getNextDose();

// Domain Services
const stockAnalysis = await this.medicationService.getStockAnalysis(id);
const recommendations = await this.medicationService.getRestockRecommendations();

// Validation
const validation = this.medicationService.validateMedicationData(data);
if (!validation.isValid) {
  // Show errors
  console.error(validation.errors);
}
```

### Passo 4: Testar

**Checklist:**
- [ ] Testes unitários passando
- [ ] Testes E2E passando
- [ ] Comportamento visual correto
- [ ] Performance OK
- [ ] Analytics funcionando

---

## 📊 Exemplos de Migração

### Exemplo 1: Componente de Lista (Read-Only)

**Component:** `medication-list.component.ts`

**Antes:**
```typescript
import { MedicationService } from '@services/medication.service';

@Component({
  selector: 'app-medication-list',
  template: `
    @for (med of medications(); track med.id) {
      <ion-item>{{ med.name }}</ion-item>
    }
  `
})
export class MedicationListComponent {
  private medicationService = inject(MedicationService);
  
  medications = this.medicationService.medications;
}
```

**Depois:**
```typescript
import { MedicationServiceV2 } from '@services/medication-v2.service';

@Component({
  selector: 'app-medication-list',
  template: `
    @for (med of medications(); track med.id) {
      <ion-item>{{ med.name }}</ion-item>
    }
  `
})
export class MedicationListComponent {
  private medicationService = inject(MedicationServiceV2);
  
  medications = this.medicationService.medications;
  
  // ✅ Opcional: usar entities para features avançadas
  medicationEntities = this.medicationService.medicationEntities;
}
```

**Mudanças:** Apenas 1 import (100% backward compatible)

---

### Exemplo 2: Componente de Criação

**Component:** `add-medication.component.ts`

**Antes:**
```typescript
async onSubmit() {
  try {
    const medicationData: Omit<Medication, 'id'> = {
      name: this.form.value.name,
      dosage: this.form.value.dosage,
      frequency: this.form.value.frequency,
      // ...
    };
    
    await this.medicationService.addMedication(medicationData);
    
    this.toastService.show('Medicamento adicionado com sucesso');
    this.router.navigate(['/medications']);
  } catch (error) {
    this.toastService.show('Erro ao adicionar medicamento');
  }
}
```

**Depois (opção 1 - backward compatible):**
```typescript
async onSubmit() {
  try {
    const medicationData: Omit<Medication, 'id'> = {
      name: this.form.value.name,
      dosage: this.form.value.dosage,
      frequency: this.form.value.frequency,
      // ...
    };
    
    // ✅ Mesma API, zero mudanças necessárias
    await this.medicationService.addMedication(medicationData);
    
    this.toastService.show('Medicamento adicionado com sucesso');
    this.router.navigate(['/medications']);
  } catch (error) {
    this.toastService.show('Erro ao adicionar medicamento');
  }
}
```

**Depois (opção 2 - com validação):**
```typescript
async onSubmit() {
  // ✅ Nova feature: validação antes de salvar
  const validation = this.medicationService.validateMedicationData({
    name: this.form.value.name,
    dosage: this.form.value.dosage,
    frequency: this.form.value.frequency,
  });
  
  if (!validation.isValid) {
    // Mostrar erros específicos
    this.toastService.show(validation.errors[0].message);
    return;
  }
  
  try {
    const medicationData: Omit<Medication, 'id'> = {
      name: this.form.value.name,
      dosage: this.form.value.dosage,
      frequency: this.form.value.frequency,
      // ...
    };
    
    await this.medicationService.addMedication(medicationData);
    
    this.toastService.show('Medicamento adicionado com sucesso');
    this.router.navigate(['/medications']);
  } catch (error) {
    this.toastService.show('Erro ao adicionar medicamento');
  }
}
```

---

### Exemplo 3: Componente com Stock Management

**Component:** `medication-detail.component.ts`

**Antes:**
```typescript
@Component({...})
export class MedicationDetailComponent {
  medication = signal<Medication | undefined>(undefined);
  
  async loadMedication(id: string) {
    this.medication.set(
      this.medicationService.getMedicationById(id)
    );
  }
  
  needsRestock(): boolean {
    const med = this.medication();
    return med ? med.currentStock <= 5 : false;
  }
}
```

**Depois (com Domain Services):**
```typescript
@Component({...})
export class MedicationDetailComponent {
  medication = signal<Medication | undefined>(undefined);
  stockAnalysis = signal<StockAnalysis | null>(null);
  
  async loadMedication(id: string) {
    this.medication.set(
      this.medicationService.getMedicationById(id)
    );
    
    // ✅ Nova feature: análise de estoque completa
    const analysis = await this.medicationService.getStockAnalysis(id);
    this.stockAnalysis.set(analysis);
  }
  
  needsRestock(): boolean {
    return this.stockAnalysis()?.needsRestocking ?? false;
  }
  
  // ✅ Novas informações disponíveis
  getDaysRemaining(): number | null {
    return this.stockAnalysis()?.daysRemaining ?? null;
  }
  
  getRestockAmount(): number {
    return this.stockAnalysis()?.recommendedRestockAmount ?? 0;
  }
}
```

**Template:**
```html
<!-- Antes -->
@if (needsRestock()) {
  <ion-badge color="warning">Estoque baixo</ion-badge>
}

<!-- Depois (mais informativo) -->
@if (needsRestock()) {
  <ion-badge [color]="stockAnalysis()?.daysRemaining === 0 ? 'danger' : 'warning'">
    @if (stockAnalysis()?.daysRemaining === 0) {
      Estoque esgotado!
    } @else {
      Estoque baixo ({{ getDaysRemaining() }} dias)
    }
  </ion-badge>
  <p>Reabastecer: {{ getRestockAmount() }} {{ medication()?.stockUnit }}</p>
}
```

---

### Exemplo 4: Dashboard com Múltiplos Medicamentos

**Component:** `dashboard.component.ts`

**Antes:**
```typescript
@Component({...})
export class DashboardComponent {
  medications = this.medicationService.medications;
  
  getLowStockCount(): number {
    return this.medications().filter(m => m.currentStock <= 5).length;
  }
}
```

**Depois (com Domain Services):**
```typescript
@Component({...})
export class DashboardComponent {
  medications = this.medicationService.medications;
  restockRecommendations = signal<RestockRecommendation[]>([]);
  
  async ngOnInit() {
    // ✅ Nova feature: recomendações automáticas
    const recommendations = await this.medicationService.getRestockRecommendations(7);
    this.restockRecommendations.set(recommendations);
  }
  
  getCriticalCount(): number {
    return this.restockRecommendations().filter(r => r.urgency === 'critical').length;
  }
  
  getHighPriorityCount(): number {
    return this.restockRecommendations().filter(r => r.urgency === 'high').length;
  }
}
```

**Template:**
```html
<!-- Alertas prioritários -->
@if (getCriticalCount() > 0) {
  <ion-card color="danger">
    <ion-card-header>
      <ion-card-title>Atenção Urgente!</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      {{ getCriticalCount() }} medicamento(s) com estoque esgotado
    </ion-card-content>
  </ion-card>
}

<!-- Lista de recomendações -->
@for (rec of restockRecommendations(); track rec.medicationId) {
  <ion-item [color]="getUrgencyColor(rec.urgency)">
    <ion-label>
      <h2>{{ rec.medicationName }}</h2>
      <p>{{ rec.reason }}</p>
      <p>Reabastecer: {{ rec.recommendedAmount }} unidades</p>
    </ion-label>
  </ion-item>
}
```

---

## ⚠️ Armadilhas Comuns

### 1. Injetar ambos os serviços simultaneamente

**❌ Evitar:**
```typescript
private medicationService = inject(MedicationService);
private medicationServiceV2 = inject(MedicationServiceV2);
```

**✅ Usar:**
```typescript
// Escolha UM durante migração
private medicationService = inject(MedicationServiceV2);
```

### 2. Misturar DTOs e Entities

**❌ Evitar:**
```typescript
const entity = await this.medicationService.getMedicationEntityById(id);
// Tentar usar entity como DTO
await this.someOldMethod(entity); // Type error!
```

**✅ Usar:**
```typescript
// Se precisa de DTO, use API backward compatible
const dto = this.medicationService.getMedicationById(id);

// Ou converta explicitamente
const entity = await this.medicationService.getMedicationEntityById(id);
const dto = entity.toPlainObject(); // Se necessário
```

### 3. Não testar após migração

**✅ Sempre:**
1. Rode testes unitários
2. Rode testes E2E
3. Teste manualmente no navegador
4. Verifique analytics

---

## 📈 Métricas de Sucesso

### Durante Migração

**Rastrear:**
- Número de componentes migrados
- Testes passando (unitários + E2E)
- Performance (tempo de carregamento)
- Erros em produção (should be 0)

**Dashboard sugerido:**
```
✅ Componentes migrados: 15/42 (35%)
✅ Testes passando: 100%
✅ Performance: -5ms (melhor)
✅ Erros: 0
```

### Após Migração Completa

**Métricas:**
- ✅ 100% componentes usando V2
- ✅ Código legado removido
- ✅ Bundle size (redução esperada: ~2%)
- ✅ Test coverage (aumento esperado: +10%)

---

## 🆘 Troubleshooting

### Problema: "Medication not found"

**Causa:** activePatientId não está setado

**Solução:**
```typescript
// Verificar contexto antes de chamar serviço
const patientId = this.patientSelectorService.activePatientId();
if (!patientId) {
  this.toastService.show('Selecione um paciente primeiro');
  return;
}
```

### Problema: Validation errors não aparecem

**Causa:** Exceção sendo capturada genericamente

**Solução:**
```typescript
try {
  await this.medicationService.addMedication(data);
} catch (error) {
  // ✅ Mostrar mensagem específica
  if (error instanceof Error) {
    this.toastService.show(error.message);
  } else {
    this.toastService.show('Erro desconhecido');
  }
}
```

### Problema: Stock warning não aparece

**Causa:** RecordDoseUseCase retorna warning em `result.stockWarning`

**Solução:**
```typescript
// MedicationServiceV2 já loga warning no console
// Para mostrar na UI, você pode:

// Opção 1: Observar console.warn
// Opção 2: Criar um service de notifications
// Opção 3: Verificar stock após registro de dose

async recordDose(...) {
  await this.medicationService.updateDoseStatus(...);
  
  // Verificar estoque após
  const analysis = await this.medicationService.getStockAnalysis(medId);
  if (analysis?.needsRestocking) {
    this.toastService.show(
      `Estoque baixo! Restam ${analysis.daysRemaining} dias`,
      'warning'
    );
  }
}
```

---

## 📚 Recursos Adicionais

- **Documentação DDD:** `DDD-MEDICATION-SERVICE-REFACTOR.md`
- **Código exemplo:** Ver testes unitários (quando implementados)
- **Support:** Abrir issue no repositório

---

## ✅ Checklist de Migração (Por Componente)

```
[ ] Import trocado (MedicationService → MedicationServiceV2)
[ ] Compilação sem erros
[ ] Testes unitários passando
[ ] Testes E2E passando
[ ] Teste manual no navegador
[ ] Performance OK (não piorou)
[ ] Analytics funcionando
[ ] Code review aprovado
[ ] Merge para main
```

---

**Última Atualização:** 08/11/2025  
**Versão:** 1.0  
**Autor:** Equipe Backend
