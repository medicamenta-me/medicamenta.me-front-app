# Medicamenta.me - Mobile App Frontend

## 📋 Descrição

Aplicativo mobile para gestão de medicamentos, com funcionalidades para pacientes, dependentes, cuidadores e equipes empresariais.

**Plataformas:** iOS e Android  
**Status:** ✅ Build funcional após reestruturação (12/11/2025)  
**CI/CD:** ✅ GitHub Actions configurado para deploy automático no Firebase Hosting

## 🛠️ Tecnologias

- **Framework:** Ionic Framework 8.6.0
- **Frontend:** Angular 20.3.0
- **Linguagem:** TypeScript 5.8.2
- **Mobile:** Capacitor 7.x
- **Estilos:** SCSS + Ionic Components
- **Backend:** Firebase (Firestore, Auth, Functions, Storage)

## �️ Estrutura do Projeto

Este aplicativo faz parte da arquitetura reestruturada:

```
applications/
├── medicamenta.me-back-functions/   # Backend (Firebase Functions)
├── medicamenta.me-front-app/        # ← Este projeto (App Mobile)
├── medicamenta.me-front-marketplace/
└── medicamenta.me-front-backoffice/
```

**Integração:** O app se conecta ao backend através do Firebase SDK.

## �🚀 Começando

### Pré-requisitos

```bash
node >= 18.0.0
npm >= 9.0.0
@ionic/cli
@angular/cli
@capacitor/cli
```

### Instalação

```bash
# Instalar dependências
npm install

# Instalar Ionic CLI globalmente (se necessário)
npm install -g @ionic/cli

# Capacitor CLI já está nas devDependencies
```

### Desenvolvimento

```bash
# Build do aplicativo (produção de www/)
npm run build
# ou
ionic build

# Sincronizar com plataformas nativas
ionic cap sync

# Abrir em IDE nativo
ionic cap open ios     # Xcode
ionic cap open android # Android Studio
```

### Executar em Dispositivos

```bash
# iOS
ionic cap open ios

# Android
ionic cap open android
```

## 📁 Estrutura do Projeto

```
medicamenta.me-front-app/
├── android/                   # Projeto Android nativo
├── ios/                       # Projeto iOS nativo
├── src/
│   ├── app/
│   │   ├── core/              # Serviços core, guards, interceptors
│   │   ├── shared/            # Componentes compartilhados
│   │   ├── features/          # Features do app
│   │   │   ├── medications/   # Gestão de medicamentos
│   │   │   ├── schedule/      # Agendamento e lembretes
│   │   │   ├── dependents/    # Gestão de dependentes
│   │   │   ├── caregivers/    # Sistema de cuidadores
│   │   │   ├── enterprise/    # Gestão empresarial
│   │   │   ├── gamification/  # Sistema de gamificação
│   │   │   ├── ocr/           # Scanner de receitas
│   │   │   └── wearables/     # Integração com wearables
│   │   └── pages/             # Páginas principais
│   ├── assets/                # Imagens, ícones, animações
│   ├── environments/          # Configurações de ambiente
│   └── theme/                 # Temas e estilos globais
├── capacitor.config.ts
├── ionic.config.json
├── angular.json
├── package.json
└── tsconfig.json
```

## 🎯 Funcionalidades Principais

### 👤 Para Pacientes
- ✅ Cadastro e gestão de medicamentos
- ✅ Lembretes inteligentes
- ✅ Histórico de adesão
- ✅ Scanner OCR de receitas
- ✅ Calendário de medicamentos
- ✅ Relatórios personalizados
- ✅ Gamificação e recompensas

### 👨‍👩‍👧‍👦 Dependentes
- ✅ Gestão de múltiplos dependentes
- ✅ Perfis individualizados
- ✅ Controle de medicamentos por dependente
- ✅ Compartilhamento com cuidadores

### 👨‍⚕️ Cuidadores
- ✅ Acesso aos medicamentos dos pacientes
- ✅ Notificações de adesão
- ✅ Relatórios de acompanhamento
- ✅ Comunicação com pacientes

### 🏢 Empresarial
- ✅ Gestão de colaboradores
- ✅ Dashboards corporativos
- ✅ Relatórios gerenciais
- ✅ Controle de subscrições

### 🎮 Gamificação
- ✅ Sistema de pontos
- ✅ Conquistas e badges
- ✅ Rankings
- ✅ Recompensas

### 📱 Recursos Mobile
- ✅ Notificações push
- ✅ Biometria
- ✅ Câmera (OCR)
- ✅ Calendário nativo
- ✅ Compartilhamento
- ✅ Preferências locais
- ✅ Haptic feedback

### ⌚ Wearables
- ✅ Apple Health Kit
- ✅ Google Fit (planejado)

## 🔌 Plugins Capacitor

- `@capacitor/camera` - Câmera e galeria
- `@capacitor/local-notifications` - Notificações locais
- `@capacitor/preferences` - Armazenamento local
- `@capacitor/share` - Compartilhamento
- `@capacitor/haptics` - Feedback tátil
- `@aparajita/capacitor-biometric-auth` - Autenticação biométrica
- `@ebarooni/capacitor-calendar` - Integração com calendário
- Custom: `capacitor-health-kit` - Apple Health Kit

## 🌐 Ambientes

- **Desenvolvimento:** `ionic serve`
- **Homologação:** Build com environment.staging
- **Produção:** Build com environment.production

## 📝 Scripts Disponíveis

- `npm start` - Inicia servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm test` - Executa testes unitários
- `ionic cap sync` - Sincroniza com plataformas nativas
- `ionic cap open ios` - Abre projeto iOS no Xcode
- `ionic cap open android` - Abre projeto Android no Android Studio

## 🔧 Build de Produção

```bash
# Build web
ionic build --prod

# Build e sincronização com plataformas
ionic build --prod
ionic cap sync

# Build iOS (requer macOS e Xcode)
ionic cap build ios

# Build Android
ionic cap build android
```

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes com cobertura
npm run test:coverage

# E2E (configurar conforme necessário)
npm run e2e
```

## 🔗 Projetos Relacionados

- [medicamenta.me-back-functions](../medicamenta.me-back-functions) - Backend Functions
- [medicamenta.me-front-marketplace](../medicamenta.me-front-marketplace) - Marketplace Web
- [medicamenta.me-front-backoffice](../medicamenta.me-front-backoffice) - Painel Administrativo

---

## 📝 Histórico de Reestruturação

### ✅ Migração Concluída - 12/11/2025

#### Mudanças Realizadas:
1. **Renomeação do projeto:** `medicamenta.me/` → `medicamenta.me-front-app/`
2. **Remoção de código legado:** Pasta `functions/` removida (migrada para backend separado)
3. **Atualização de configurações:**
   - `package.json` → `medicamenta.me-front-app` v1.0.0
   - `ionic.config.json` atualizado
4. **Correções TypeScript (15+ erros):**
   - Fixed `family-gamification.service.ts` - malformed object literal
   - Fixed catch block types em 50+ services
   - Fixed duplicate imports e type compatibility issues
5. **Build Status:**
   - ✅ TypeScript compilation successful
   - ✅ Capacitor sync successful
   - ✅ Ready for native deployment

#### Documentação Relacionada:
- [RESTRUCTURE-ROADMAP.md](../RESTRUCTURE-ROADMAP.md) - Roadmap completo
- [Backend API Docs](../medicamenta.me-back-functions/API-ENDPOINTS.md) - Endpoints disponíveis

---

## 📚 Documentação Adicional

- [Ionic Framework](https://ionicframework.com/docs)
- [Angular](https://angular.dev)
- [Capacitor](https://capacitorjs.com/docs)
- [Firebase](https://firebase.google.com/docs)

## 📄 Licença

Proprietary - Todos os direitos reservados
