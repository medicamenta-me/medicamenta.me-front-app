# 📱 Medicamenta.me - Mobile App

**Versão:** 3.0  
**Última Atualização:** 05 de janeiro de 2026  
**Status:** ✅ Produção  
**Plataformas:** iOS & Android

---

## 📋 Visão Geral

Aplicativo mobile para gestão completa de medicamentos, oferecendo controle de doses, lembretes inteligentes, gestão de dependentes, integração com wearables, gamificação para adesão ao tratamento, e integração com o Marketplace.

---

## 📊 Métricas do Projeto

| Métrica | Valor | Status |
|---------|-------|--------|
| **Testes Unitários** | 6.143 | ✅ 100% passing |
| **Cobertura Services** | 100% | ✅ |
| **LOC** | ~32.000 | ✅ |
| **Build Errors** | 0 | ✅ |
| **Lint Errors** | 0 | ✅ |
| **Vulnerabilidades** | 3* | ✅ (Cypress dev) |

---

## 🛠️ Stack Tecnológica

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Angular** | 20.x | Framework |
| **Ionic** | 8.x | UI Components |
| **Capacitor** | 7.x | Native Bridge |
| **TypeScript** | 5.8 | Linguagem |
| **RxJS** | 7.x | Reactive Programming |
| **NgRx Signals** | - | State Management |
| **Firebase** | 11.x | Backend Services |

### Capacitor Plugins

| Plugin | Propósito |
|--------|-----------|
| `@capacitor/push-notifications` | Push notifications |
| `@capacitor/local-notifications` | Lembretes locais |
| `@capacitor/camera` | Captura de receitas |
| `@capacitor/haptics` | Feedback tátil |
| `@capacitor/share` | Compartilhamento |
| `@capacitor/biometric` | Autenticação biométrica |

---

## 🏗️ Arquitetura

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MOBILE APP (Ionic/Angular)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         PRESENTATION LAYER                        │   │
│  │                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │    Pages    │  │ Components  │  │   Modals    │               │   │
│  │  │  (40+ pages)│  │ (50+ comps) │  │  (20+ mods) │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                          SERVICE LAYER                            │   │
│  │                                                                    │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                  │   │
│  │  │   Core Services    │  │  Feature Services  │                  │   │
│  │  │  - AuthService     │  │  - MedicationSvc   │                  │   │
│  │  │  - IntegrationSvc  │  │  - GamificationSvc │                  │   │
│  │  │  - OfflineSyncSvc  │  │  - FamilyService   │                  │   │
│  │  │  - NotificationSvc │  │  - WearableService │                  │   │
│  │  └────────────────────┘  └────────────────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                           DATA LAYER                              │   │
│  │                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  IndexedDB  │  │   Firebase  │  │  API v2     │               │   │
│  │  │  (Offline)  │  │  (Realtime) │  │  (Backend)  │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       NATIVE BRIDGE (Capacitor)                   │   │
│  │  Push │ Local Notif │ Camera │ Haptics │ Biometric │ Share       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌─────────────┐                 ┌─────────────┐
           │     iOS     │                 │   Android   │
           │   (Swift)   │                 │  (Kotlin)   │
           └─────────────┘                 └─────────────┘
```

### Estrutura de Diretórios

```
src/
├── app/
│   ├── app.component.ts           # Root component
│   ├── app.routes.ts              # Lazy-loaded routes
│   │
│   ├── services/                  # 72 services (100% tested)
│   │   ├── auth.service.ts        # Firebase Auth
│   │   ├── medication.service.ts  # CRUD medicamentos
│   │   ├── integration.service.ts # API v2 client
│   │   ├── offline-sync.service.ts # Sync offline
│   │   ├── offline-queue.service.ts # Fila com prioridade
│   │   ├── notification.service.ts # Push + Local
│   │   ├── gamification.service.ts # XP, Achievements
│   │   ├── family.service.ts      # Gestão familiar
│   │   ├── wearable.service.ts    # Apple Watch, WearOS
│   │   ├── ocr.service.ts         # Scanner de receitas
│   │   ├── stripe-payment.service.ts
│   │   ├── pagseguro-payment.service.ts
│   │   └── ... (60+ outros)
│   │
│   ├── pages/                     # 35+ páginas
│   │   ├── home/                  # Dashboard principal
│   │   ├── dashboard/             # Insights e métricas
│   │   ├── medication-detail/     # Detalhes do medicamento
│   │   ├── medication-form/       # Adicionar/editar
│   │   ├── achievements/          # Conquistas
│   │   ├── leaderboard/           # Ranking gamificação
│   │   ├── family-dashboard/      # Dashboard familiar
│   │   ├── marketplace-orders/    # Pedidos do marketplace
│   │   ├── wearable-settings/     # Config wearables
│   │   └── ...
│   │
│   ├── components/                # 50+ componentes
│   │   ├── achievement-card/
│   │   ├── level-badge/
│   │   ├── streak-widget/
│   │   ├── order-status-card/
│   │   ├── ocr-scanner/
│   │   ├── sync-status-indicator/
│   │   └── ...
│   │
│   ├── models/                    # Interfaces TypeScript
│   │   ├── medication.model.ts
│   │   ├── patient.model.ts
│   │   ├── achievement.model.ts
│   │   ├── order.model.ts
│   │   └── ...
│   │
│   └── guards/                    # Route guards
│       ├── auth.guard.ts
│       └── subscription.guard.ts
│
├── assets/
│   ├── i18n/                      # Traduções (pt-BR, en, es)
│   ├── animations/                # Lottie animations
│   └── icons/
│
├── environments/
│   ├── environment.ts             # Dev
│   └── environment.prod.ts        # Prod
│
├── android/                       # Projeto Android (Capacitor)
├── ios/                          # Projeto iOS (Capacitor)
└── cypress/                      # Testes E2E
```

---

## 🎯 Funcionalidades

### 💊 Gestão de Medicamentos

- **CRUD completo** de medicamentos com dosagem, horários, estoque
- **Lembretes inteligentes** com análise de padrões
- **Controle de estoque** com alertas de reposição
- **Histórico de doses** com compliance tracking
- **Scanner OCR** para receitas médicas

### 👨‍👩‍👧‍👦 Gestão Familiar

- **Múltiplos perfis** (dependentes, cuidadores)
- **Calendário familiar** compartilhado
- **Notificações** para cuidadores
- **Relatórios familiares** com PDF export

### 🎮 Gamificação

- **Sistema de XP** e níveis
- **Conquistas** desbloqueáveis (100+)
- **Streaks** de adesão ao tratamento
- **Leaderboard** (global/amigos/família)
- **Animações Lottie** para celebrações

### ⌚ Wearables

- **Apple Watch** - notificações e confirmação de doses
- **WearOS** - integração Android Wear
- **Sincronização** bidirecional

### 🛒 Marketplace Integration

- **Visualização de pedidos** do marketplace
- **Status em tempo real** (Firestore listeners)
- **Notificações de status** de entrega

### 📴 Offline-First

- **IndexedDB** para persistência local
- **Fila de operações** com prioridade
- **Sync automático** quando online
- **Resolução de conflitos**

### 💳 Pagamentos

- **Stripe** - cartões internacionais
- **PagSeguro** - PIX, boleto, cartão
- **Gestão de assinaturas** (Premium)

---

## 🚀 Comandos

### Instalação

```bash
# Instalar dependências
npm install

# Instalar CLI globais (se necessário)
npm install -g @ionic/cli @angular/cli
```

### Desenvolvimento

```bash
# Servidor de desenvolvimento (browser)
npm start
# ou
ionic serve

# Build de desenvolvimento
npm run build

# Build de produção
npm run build -- --configuration=production

# Testes unitários
npm test

# Testes com watch
npm test -- --watch

# Testes E2E
npm run cypress:open
```

### Mobile Build

```bash
# Sincronizar com plataformas nativas
ionic cap sync

# Abrir no Xcode (iOS)
ionic cap open ios

# Abrir no Android Studio
ionic cap open android

# Build Android APK
ionic cap build android

# Build iOS Archive
ionic cap build ios
```

### Lint & Quality

```bash
# Lint
npm run lint

# Lint com fix
npm run lint -- --fix
```

---

## 📱 Plataformas Suportadas

| Plataforma | Versão Mínima | Status |
|------------|---------------|--------|
| **iOS** | 14.0+ | ✅ Produção |
| **Android** | 8.0+ (API 26) | ✅ Produção |
| **PWA** | Modern browsers | ✅ Suportado |

---

## ⚙️ Configuração

### Variáveis de Ambiente

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  firebase: {
    apiKey: "...",
    authDomain: "medicamenta-me.firebaseapp.com",
    projectId: "medicamenta-me",
    storageBucket: "medicamenta-me.appspot.com",
    messagingSenderId: "...",
    appId: "..."
  },
  stripe: {
    publishableKey: "pk_live_..."
  },
  pagseguro: {
    environment: "production",
    publicKey: "..."
  },
  apiBaseUrl: "https://us-central1-medicamenta-me.cloudfunctions.net/api"
};
```

### Capacitor Config

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'me.medicamenta.app',
  appName: 'Medicamenta',
  webDir: 'www',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#4CAF50'
    }
  }
};
```

---

## 🧪 Testes

### Estrutura de Testes

```
src/app/
├── services/
│   ├── medication.service.spec.ts    # 150+ testes
│   ├── gamification.service.spec.ts  # 120+ testes
│   ├── offline-sync.service.spec.ts  # 100+ testes
│   └── ... (todos os 72 services)
├── components/
│   ├── achievement-card.component.spec.ts
│   ├── level-badge.component.spec.ts
│   └── ... (todos os 50+ components)
└── pages/
    └── ... (páginas críticas)

cypress/
├── e2e/
│   ├── marketplace-orders.cy.ts     # 25 testes
│   └── offline-integration.cy.ts    # 30 testes
└── support/
```

### Rodar Testes

```bash
# Unitários
npm test -- --no-watch --browsers=ChromeHeadless

# Com coverage
npm test -- --code-coverage

# E2E
npm run cypress:run
```

---

## 📊 Services Principais

| Service | Responsabilidade | Testes |
|---------|------------------|--------|
| `MedicationService` | CRUD medicamentos, histórico | 150+ |
| `GamificationService` | XP, achievements, streaks | 120+ |
| `OfflineSyncService` | Sincronização offline | 100+ |
| `IntegrationService` | API v2 client | 84 |
| `NotificationService` | Push + Local notifications | 80+ |
| `FamilyService` | Gestão de dependentes | 70+ |
| `WearableService` | Apple Watch, WearOS | 60+ |
| `OcrService` | Scanner de receitas | 53 |

---

## 🔗 Links

- **App Store:** https://apps.apple.com/app/medicamenta
- **Play Store:** https://play.google.com/store/apps/details?id=me.medicamenta.app
- **Firebase Console:** https://console.firebase.google.com/project/medicamenta-me

---

*Última atualização: 05/01/2026*
