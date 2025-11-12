# Arquivos Não Utilizados - Medicamenta.me

## 📋 Análise Completa

Data: 05/11/2025

---

## ✅ Arquivos MD e CJS Removidos

### Arquivos Markdown Removidos (24 arquivos):
- ✅ ACESSIBILIDADE.md
- ✅ CARE-NETWORK-FEATURE.md
- ✅ CHECKLIST-SETUP-TERMOS.md
- ✅ DASHBOARD-ACESSIVEL.md
- ✅ FASE-H-DASHBOARD-INSIGHTS.md
- ✅ FASE-H3-OFFLINE-COMPLETO.md
- ✅ FASE-I-OFFLINE-COMPLETO.md
- ✅ FASE-J-RELATORIOS-MEDICOS.md
- ✅ FASE-J-UX-OFFLINE.md
- ✅ FASE-K-CALENDARIO.md
- ✅ FASE-K-OTIMIZACOES.md
- ✅ FASE-L-FEATURES-AVANCADAS.md
- ✅ FASE-M-PWA-COMPLETO.md
- ✅ FIRESTORE-RULES-EXPLAINED.md
- ✅ GUIA-CORES.md
- ✅ GUIA-SETUP-TERMOS.md
- ✅ IMPLEMENTACAO-ONBOARDING-RESUMO.md
- ✅ IMPLEMENTACAO-TERMOS-VERSAO.md
- ✅ OFFLINE-INTEGRATION-GUIDE.md
- ✅ ONBOARDING-IMPLEMENTATION-GUIDE.md
- ✅ ONBOARDING-STATUS-REPORT.md
- ✅ perguntas.md
- ✅ TERMOS-DE-USO-SETUP.md
- ✅ TRADUCOES-ONBOARDING.md

### Arquivos CJS Removidos (4 arquivos):
- ✅ add-phone-codes.cjs
- ✅ create-terms.cjs
- ✅ migrate-permissions.cjs
- ✅ remove-ddi-from-masks.cjs

**Total removido: 28 arquivos**

---

## 🔍 Arquivos Não Utilizados Identificados

### 1. **index.tsx** ❌ NÃO UTILIZADO
**Localização:** `/index.tsx` (raiz)

**Análise:**
- Arquivo criado pelo AI Studio (comentário na linha 20)
- Contém bootstrap do Angular duplicado
- O projeto usa `src/main.ts` como entry point (definido em `angular.json` linha 25)
- Nenhuma importação ou referência em todo o projeto
- **PODE SER REMOVIDO**

**Motivo:** Angular CLI usa `src/main.ts` como main file, não `index.tsx`

---

### 2. **index.html** ❌ NÃO UTILIZADO
**Localização:** `/index.html` (raiz)

**Análise:**
- Contém imports de Tailwind CSS via CDN
- O projeto usa `src/index.html` como index (definido em `angular.json` linha 24)
- Não é referenciado em nenhum lugar do código
- **PODE SER REMOVIDO**

**Motivo:** Angular CLI usa `src/index.html`, não o da raiz

---

### 3. **fix-gabriel.ts** ❌ NÃO UTILIZADO
**Localização:** `/fix-gabriel.ts` (raiz)

**Análise:**
- Script de correção one-time para usuário específico (Gabriel)
- Adiciona `whoCareForMeIds` ao documento do usuário
- Não é importado em nenhum lugar
- Import inválido: `from './firebase'` (não existe)
- **PODE SER REMOVIDO** (ou mantido como referência histórica)

**Motivo:** Script temporário de migração já executado

---

### 4. **setup-terms.ts** ⚠️ SCRIPT UTILITÁRIO
**Localização:** `/setup-terms.ts` (raiz)

**Análise:**
- Script Node.js para criar Termos de Uso no Firestore
- Usa Firebase Admin SDK
- Executado manualmente via `npx ts-node setup-terms.ts`
- Não é importado no código da aplicação
- **DECISÃO:** Manter se ainda criar novos termos OU remover se já concluído

**Motivo:** Script de setup/migração executado externamente

---

### 5. **terms-data.json** ⚠️ DADOS DE MIGRAÇÃO
**Localização:** `/terms-data.json` (raiz)

**Análise:**
- Contém dados dos Termos de Uso v1.0 para BR
- Inclui versão, país, idioma, resumo e texto completo
- Não é importado ou referenciado no código
- Provavelmente usado por `setup-terms.ts` ou scripts CJS removidos
- **DECISÃO:** Manter como backup OU remover se dados já no Firestore

**Motivo:** Dados estáticos de migração

---

### 6. **metadata.json** ✅ UTILIZADO
**Localização:** `/metadata.json` (raiz)

**Análise:**
- Contém metadados do projeto (nome, descrição)
- Campo `requestFramePermissions` vazio
- **MANTER** - Pode ser usado por ferramentas de build/deployment

**Motivo:** Arquivo de configuração do projeto

---

## 📊 Resumo da Análise

### Arquivos que PODEM ser removidos:
1. ❌ `index.tsx` - Duplicado, entry point é `src/main.ts`
2. ❌ `index.html` - Duplicado, usado é `src/index.html`
3. ❌ `fix-gabriel.ts` - Script one-time já executado

### Arquivos que DEVEM ser revisados:
4. ⚠️ `setup-terms.ts` - Manter se ainda usado para criar termos
5. ⚠️ `terms-data.json` - Manter se for backup ou referência

### Arquivos que DEVEM ser mantidos:
6. ✅ `metadata.json` - Configuração do projeto
7. ✅ `PRD.md` - Documentação do produto
8. ✅ `README.md` - Documentação principal

---

## 🗂️ Estrutura de Arquivos Correta

### Entry Points do Projeto:
```
src/
├── index.html          ← Index HTML usado (Angular CLI)
├── main.ts             ← Entry point TypeScript (Angular CLI)
├── app.component.ts    ← Root component
└── app/
    └── app.routes.ts   ← Routing configuration
```

### Configurações do Angular:
```json
// angular.json
{
  "index": "src/index.html",    ← Index correto
  "main": "src/main.ts",        ← Main correto
  "outputPath": "www"           ← Build output
}
```

---

## 🔧 Comando para Remover Arquivos Não Utilizados

```powershell
# Remover arquivos não utilizados (CUIDADO!)
Remove-Item index.tsx -Force
Remove-Item index.html -Force
Remove-Item fix-gabriel.ts -Force

# Opcional - remover scripts de setup se já executados:
# Remove-Item setup-terms.ts -Force
# Remove-Item terms-data.json -Force
```

---

## ✅ Validação Final

Após remoção, executar:
```powershell
npm run build
```

Se build passar sem erros → arquivos não eram necessários ✅

---

## 📝 Recomendações

1. **Remover imediatamente:**
   - `index.tsx` (duplicado)
   - `index.html` da raiz (duplicado)
   - `fix-gabriel.ts` (script one-time)

2. **Avaliar necessidade:**
   - `setup-terms.ts` → Remover se não criar mais termos manualmente
   - `terms-data.json` → Remover se dados já estão no Firestore

3. **Manter:**
   - `metadata.json` (configuração)
   - `PRD.md` (documentação)
   - `README.md` (documentação)
   - Todos os arquivos em `src/` (código-fonte)

4. **Diretórios gerados automaticamente:**
   - `www/` → Output do build (pode ser deletado, será recriado)
   - `.angular/` → Cache do Angular (pode ser deletado)
   - `node_modules/` → Dependências NPM (pode ser deletado, rodar `npm install`)

---

## 🎯 Resultado Esperado

Após limpeza completa:
- **28 arquivos MD/CJS removidos** ✅
- **3 arquivos TS/HTML não utilizados removidos** (recomendado)
- **2 arquivos de migração para revisar** (setup-terms.ts, terms-data.json)
- **Projeto mais limpo e organizado** ✅
