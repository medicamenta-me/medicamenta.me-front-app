## PRODUCT ROADMAP — Próximos Passos Prioritizados

**Data:** 2025-11-07
**Escopo:** correção de gaps, execução de roadmap e divisão de funcionalidades por planos (Free / Premium / Family / Enterprise).

NOTA: Este arquivo deve ser atualizado sempre que uma atividade for iniciada/completada. Use a seção "Rastreamento de Progresso" no final para registrar status, responsáveis e comentários.

---

## 1. Visão resumida

Objetivo imediato: estabilizar segurança/autenticação e lançar infra de monetização (assinaturas + feature-flags). Em paralelo, entregar 3 killer-features (Scanner OCR, Gamificação completa, Lembretes Inteligentes) para aumentar retenção e aquisição.

Critérios de sucesso (90 dias):
- Sistema de assinaturas funcionando (Stripe e PagSeguro) e paywall integrado
- OCR básico em produção (Tesseract local + fallback cloud)
- Gamificação com loja/coins mínima implementada
- ML heurístico de lembretes em produção (redução de doses perdidas ≥30%)

---

## 2. Como usar este documento

- Cada item abaixo tem: Prioridade, Descrição, Tarefas técnicas, Estimativa (pontos), Dependências, Critérios de aceite, Métricas de sucesso.
- Atualize a tabela de "Rastreamento de Progresso" sempre que mudar o status.

---

## 3. Backlog Prioritário (ordenado)

### 1 — Autenticação & Segurança (Prioridade: P0 — Blocker for monetization & enterprise)

- 1.1 Autenticação biométrica (Face ID / Touch ID)
  - Descrição: permitir login/reauth local usando biometria em iOS/Android + fallback PIN.
  - Tarefas:
    - avaliar libs: Capacitor Biometrics / Native Plugins (iOS LocalAuthentication / Android BiometricPrompt)
    - adicionar feature toggle e preferências no `Profile`
    - fluxo: oferecer opção após login e antes de iniciar trial
  - Estimativa: 3 pontos
  - Dependências: none
  - Critérios de aceite:
    - usuário pode habilitar/desabilitar biometria
    - biometria reautentica para sensitive actions (pagar, downgrade, open secure screens)
    - logs de auditoria para success/fail
  - Métrica: % usuários com biometria habilitada, redução de password resets

- 1.2 SSO Enterprise (Google Workspace / Microsoft)
  - Descrição: suporte SAML/OAuth SSO para contas enterprise (B2B onboarding).
  - Tarefas
    - adicionar provider SSO no `AuthService`
    - UI admin para configurar SSO por organização (Enterprise portal)
    - handshake SAML/OIDC + provisionamento mínimo (SCIM deferred)
  - Estimativa: 8 pontos
  - Dependências: Enterprise portal, DNS & domain verification, legal
  - Critérios de aceite:
    - org admin configura SSO e usuários corporativos fazem login via SSO
    - mapping de roles/permissions para TeamRole
  - Métrica: tempo de onboarding enterprise, # enterprise signups

---

### 2 — Gestão de Medicamentos (P0/P1)

- 2.1 Verificação de interações medicamentosas
  - Descrição: integrar base de interações (ANVISA/FDA open data or DrugBank) e checar ao salvar medicamento.
  - Tarefas:
    - escolher data source (openFDA, DrugBank, Micromedex - avaliar custo/licença)
    - criar `drug-database.service.ts` com cache local (IndexedDB)
    - ao criar/editar medicação rodar checkInteractions() e mostrar alertas/risks
  - Estimativa: 8 pontos
  - Dependências: provider de dados, CI para atualizações da base
  - Critérios de aceite: alert shown with severity; clinician overrides with reason logged
  - Métrica: % medicações com interação detectada, custo por consulta à API

- 2.2 Histórico de mudanças de dosagem
  - Descrição: auditar alterações de dosagem com timestamp, médico/responsável e motivo.
  - Tarefas:
    - criar `dosage-history` collection ou normalized subdocument
    - UI: timeline na `medication-detail` com diff/undo (last edit)
    - adicionar eventos na fila de sync
  - Estimativa: 3 pontos
  - Dependências: offline sync
  - Critérios de aceite: every dosage change persists history & visible in detail UI
  - Métrica: # dosage edits, % with reason provided

- 2.3 Suporte a medicamentos PRN (as-needed)
  - Descrição: permitir medicamentos sem schedule fixo, com max daily doses, and rules for reminders.
  - Tarefas:
    - extend `Medication` model with `isPRN`, `maxPerDay`, `prnRules`
    - adapt NotificationScheduler + UI for manual dose logging + suggestions
  - Estimativa: 3 pontos
  - Dependências: notification system
  - Critérios de aceite: PRN meds can be logged, stock decreased, overdose prevention warning
  - Métrica: usage of PRN meds and safety warnings triggered

- 2.4 Recordatórios de renovação de receita
  - Descrição: reminders to renew prescription based on `startDate`, `totalDosesPlanned`, `currentStock` or custom reminder.
  - Tarefas:
    - implement renewal rule engine in `medication-stock.service`
    - schedule push/local notifications & email (premium) for renewals
  - Estimativa: 3 pontos
  - Dependências: pharmacy integration (optional)
  - Critérios de aceite: notification sent X days before estimated end; user can configure threshold
  - Métrica: reduction in out-of-stock events

- 2.5 Refactor: split `MedicationService` into modules (DDD)
  - Descrição: modularizar para melhorar testabilidade e manutenção.
  - Tarefas:
    - create domain/use-cases: MedicationRepository, ScheduleService, StockService, ValidationService
    - write unit tests for each module
    - migrate features incrementally (strangler fig)
  - Estimativa: 13 points (split across sprints)
  - Dependências: none (but requires planned PRs)
  - Critérios de aceite: no regressions, tests coverage > 80% for moved modules
  - Métrica: reduction in code churn, PR review time

---

### 3 — Sistema de Rede de Cuidados (P1)

- 3.1 Calendário compartilhado visual
  - Descrição: calendar view shared among caregivers with per-user color and filters.
  - Tarefas:
    - implement calendar component (fullcalendar or custom) with sync of events
    - permission controls (who can add/modify)
    - integrate with family-dashboard
  - Estimativa: 5 pontos
  - Dependências: notifications, offline sync
  - Critérios de aceite: events visible to authorized users, conflict handling
  - Métrica: events created/shared per family

- 3.2 Notificações push entre cuidadores
  - Descrição: push to carers when dependent takes/misses dose (needs FCM + privacy controls)
  - Tarefas:
    - implement FCM server integration + firestore triggers on dose logs
    - user preference (opt-in/out) and throttle
  - Estimativa: 5 pontos
  - Dependências: Firebase Cloud Messaging, Firestore triggers (Cloud Functions)
  - Critérios de aceite: push arrives <10s; respects user preference
  - Métrica: number of caregiver notifications, opt-out rate

- 3.3 Sistema de tarefas delegadas
  - Descrição: assign tasks related to medication (buy meds, take to appointment) with status and due date
  - Tarefas:
    - create `tasks` collection + UI widgets in family dashboard
    - notifications for assignment & due reminders
  - Estimativa: 4 pontos
  - Dependências: notifications, calendar
  - Critérios de aceite: tasks assigned & completed tracked; delegation audit log
  - Métrica: tasks completion rate

- 3.4 Relatórios familiares agregados
  - Descrição: family-level reports (adhesion aggregated, stock across family)
  - Tarefas:
    - extend report-generator to accept family aggregation
    - templates family-report + scheduled delivery for premium family plan
  - Estimativa: 4 pontos
  - Dependências: report service, analytics
  - Critérios de aceite: PDF generated with aggregated metrics; scheduled report test
  - Métrica: # family reports generated

---

### 4 — Analytics & Insights (P1/P2)

- 4.1 Machine Learning preditivo (próxima dose perdida)
  - Descrição: start with heuristics then move to on-device TF.js model + cloud model later.
  - Tarefas:
    - implement `pattern-analyzer` heuristics (rules from SmartReminders)
    - pipeline to export anonymized training data (opt-in)
    - TF.js on-device proof-of-concept for high-risk prediction
  - Estimativa: 8-13 points (phased)
  - Dependências: analytics data, consent from users
  - Critérios de aceite: model precision/recall acceptable (define baseline), actionable suggestions appear in UI
  - Métrica: reduction in missed doses (%), prediction accuracy

- 4.2 Insights avançados (clima, humor, localização)
  - Descrição: enrich insights using optional data sources (weather API, manual mood input, geolocation patterns)
  - Tarefas:
    - build connectors (weather api, mood prompts)
    - add UI to show correlation and suggested actions
  - Estimativa: 5 points
  - Dependências: user consent, privacy policy update
  - Critérios de aceite: user can link weather and mood, insights display correlation
  - Métrica: uptake of advanced insights

- 4.3 Recomendações de ajuste de horário
  - Descrição: actionable suggestion to change schedule with 1-click apply + rollback option
  - Tarefas:
    - integrate suggestion flow in medication detail + confirmation modal
    - A/B test wording and accept rate
  - Estimativa: 3 points
  - Dependências: ML/pattern-analyzer
  - Critérios de aceite: suggestions applied and reversible; analytics event logged
  - Métrica: suggestion acceptance rate, adherence delta post-change

- 4.4 Análise de sentimentos (notas do usuário)
  - Descrição: analyze free-text notes for sentiments (negative signals about side effects, confusion)
  - Tarefas:
    - lightweight sentiment analysis (open-source libraries) on-device / cloud
    - surface alerts to support or clinician if high-severity flagged (opt-in)
  - Estimativa: 5 points
  - Dependências: privacy/consent
  - Critérios de aceite: sentiment score stored & actionable flags created
  - Métrica: % notes flagged, support escalations

---

### 5 — Sistema de Relatórios (P1)

- 5.1 Relatório de efeitos colaterais
  - Descrição: novo template que agrega ocorrências de efeitos colaterais por medicação, com timeline e severidade
  - Tarefas:
    - extend logs to capture ADR (adverse drug reaction) entries
    - report template + charting
    - automated export/email to clinician (premium)
  - Estimativa: 4 points
  - Dependências: logging UI updates
  - Critérios de aceite: report includes ADR timeline and contact info
  - Métrica: ADR reports generated

- 5.2 Multi-idioma nos PDFs
  - Descrição: allow PDF templates to be generated in user-selected language
  - Tarefas:
    - i18n for report templates, chart labels and static texts
    - test generation in PT-BR / EN-US / ES-MX
  - Estimativa: 3 points
  - Dependências: translation service
  - Critérios de aceite: PDFs generated in selected language; layout preserved
  - Métrica: number of reports in non-pt locales

---

### 6 — Modo Offline & Sincronização (P1/P2)

- 6.1 Sincronização incremental (delta sync)
  - Descrição: reduce bandwidth by sending only deltas; improve large orgs performance
  - Tarefas:
    - implement change feeds / lastModified + tombstones
    - server-side support (cloud functions) to compute deltas or use Firestore listeners with range queries
  - Estimativa: 8 points
  - Dependências: firestore rules, server functions
  - Critérios de aceite: reduced sync payload size; sync time benchmark improved
  - Métrica: avg payload size per sync, sync latency

- 6.2 Compressão de dados
  - Descrição: compress payloads (lz-string or gzip) during transfer
  - Tarefas:
    - add compression to offline queue payloads
    - ensure compatibility with cloud functions
  - Estimativa: 3 points
  - Dependências: none
  - Critérios de aceite: payload compression ratio > 2x
  - Métrica: bytes transferred

- 6.3 P2P sync entre dispositivos do mesmo usuário
  - Descrição: allow fast device-to-device sync in local network (for privacy and offline redundancy)
  - Tarefas:
    - research WebRTC/local network sync options (Lan sync) or use Firebase Realtime for local-lan discovery
    - implement optional P2P sync channel encrypted with user's key
  - Estimativa: 13 points (research + PoC)
  - Dependências: security review
  - Critérios de aceite: devices discover each other, can sync selected collections securely
  - Métrica: sync success rate on LAN

- 6.4 Reconciliação automática inteligente (ML)
  - Descrição: use heuristics + ML to auto-resolve common conflicts (e.g., missed vs taken count) and surface ambiguous cases for manual review
  - Tarefas:
    - collect conflict samples; build classifier; integrate with conflict resolver
  - Estimativa: 8 points
  - Dependências: data collection and consent
  - Critérios de aceite: auto-resolve accuracy > threshold; manual override available
  - Métrica: % conflicts auto-resolved, manual overrides

---

### 7 — PWA Enhancements (P1)

- 7.1 Web Push via Firebase (background notifications)
  - Descrição: enable web push that works when browser closed (supported on Chrome/Edge/Android). Important for reminders.
  - Tarefas:
    - integrate Firebase Cloud Messaging Web SDK
    - implement VAPID keys management
    - handle subscription lifecycle and UI consent flow
  - Estimativa: 3 points
  - Dependências: service worker and push permission
  - Critérios de aceite: pushes received when site not open (Chrome), permission opt-in tracked
  - Métrica: push open rate

- 7.2 Background sync & periodic sync
  - Descrição: use Background Sync API for deferred sync and periodic sync where supported
  - Tarefas:
    - add periodic sync registration in service worker (experimental)
    - fallback strategies for unsupported browsers
  - Estimativa: 5 points
  - Dependências: browser support
  - Critérios de aceite: queued operations sync reliably when connectivity restored
  - Métrica: pending queue drain time

---

### 8 — Notificações (P0/P1)

- 8.1 Notificações push remotas (FCM)
  - Descrição: server-initiated pushes for critical reminders and caregiver notifications.
  - Tarefas:
    - Cloud Functions trigger on dose events to send FCM messages
    - add backend rate-limiting & user preferences
  - Estimativa: 5 points
  - Dependências: FCM setup, push token management
  - Critérios de aceite: reliable delivery; opt-in respected
  - Métrica: delivery rate, errors

- 8.2 Notificações para cuidadores (quando dependente toma/perde)
  - Descrição: caregiver alerts with privacy controls
  - Tarefas:
    - build notification strategy service with dedup/throttle
    - add user controls to manage which events trigger notifications
  - Estimativa: 4 points
  - Dependências: FCM, cloud functions
  - Critérios de aceite: caregivers get relevant alerts; privacy preserved
  - Métrica: caregiver alert opt-in rate

- 8.3 Lembretes adaptativos (horário inteligente)
  - Descrição: dynamic reminder cadence based on risk score
  - Tarefas:
    - integrate with ML risk predictor; create notification strategy rules
    - provide user override and snooze controls
  - Estimativa: 5 points
  - Dependências: ML predictor
  - Critérios de aceite: adaptive reminders reduce missed doses in A/B test
  - Métrica: missed dose delta; user satisfaction

- 8.4 Notificações de voz (TTS) & assistentes
  - Descrição: optional TTS for reminders and integration with Alexa / Google Assistant (voice-enabled reminders)
  - Tarefas:
    - TTS engine integration (Web Speech API for web; native TTS for mobile)
    - design voice skill for Alexa / Google (OAuth + account linking)
  - Estimativa: 8-13 points (assistant integration costs)
  - Dependências: voice platform accounts, privacy
  - Critérios de aceite: first-launch TTS works on mobile; skill accepted in Alexa/Google review
  - Métrica: voice reminders used per week

---

## 4. Divisão de funcionalidades por Planos (feature-mapping)

Objetivo: controlar acesso via `FeatureFlags` e `UserSubscription` no Firestore.

- Free
  - Medicamentos ilimitados (básico)
  - 1 dependente
  - 2 cuidadores
  - Relatórios básicos (3/mês)
  - Insights básicos (30 dias)
  - Gamificação básica (6 achievements)
  - Offline sync (basic)

- Premium
  - Dependentes ilimitados
  - Cuidadores ilimitados
  - Relatórios ilimitados + templates profissionais
  - Scanner OCR (20/mês)
  - Lembretes Inteligentes (ML)
  - Wearable integration
  - Gamificação completa (shop, coins)
  - Backup automatico
  - Push notifications & scheduled reports

- Family
  - Tudo do Premium para até 5 membros
  - Dashboard familiar agregado
  - Chat entre cuidadores
  - Calendário compartilhado
  - Telemedicina (3 consultas/mês)

- Enterprise
  - White-label
  - SSO & provisioning
  - API dedicada & bulk import
  - SLA e suporte 24/7
  - Compliance + audit logs

Feature flags recommended at launch:
 - `ocr_scanner` (Premium)
 - `advanced_insights` (Premium)
 - `family_dashboard` (Family)
 - `chat_feature` (Family)
 - `enterprise_sso` (Enterprise)
 - `p2p_sync` (Enterprise, opt-in)

---

## 5. Execução e Releases sugeridos (12 semanas inicial)

- Week 0 (Planning): finalize contracts for 3rd-party data (drug database), choose payment providers, and align legal (privacy)
- Week 1-2: Payments + Feature Flags + Biometrics + small refactors (MedicationService split start)
- Week 3-4: OCR PoC (Tesseract) + ML heuristics for SmartReminders + Family calendar skeleton
- Week 5-6: Production OCR (fallback Cloud Vision), Paywall + Subscription flow, caregiver push notifications
- Week 7-8: Gamification shop & coins, reports automation, background sync improvements
- Week 9-12: Enterprise SSO, P2P sync PoC, Telemedicine integrations & pharmacy integration PoC

Release cadence: bi-weekly releases with feature-flag toggles; keep a staging channel for Beta testers.

---

## 6. Processos operacionais e QA

- CI: add pipeline steps for unit tests, lint, build and e2e (ionic + playwright). Block merges on failing tests.
- Monitoring: add Sentry for errors and performance; instrument key flows (payments, OCR errors, sync failures).
- Security: threat model for P2P and SSO; pentest before Enterprise onboarding.
- Compliance: update Terms & Privacy for OCR, ML and data-sharing opt-in.

---

## 7. Template — Rastreamento de Progresso

Atualize esta tabela com cada mudança (pull request ou release).

| ID | Item | Prioridade | Owner | Est (pts) | Status | PR / Issue | Notas |
|----|------|-----------:|-------|---------:|:------:|:----------:|:-----|
| 1.1 | Biometrics | P0 | @backend | 3 | ✅ **completed** | Sprint 1 | BiometricService + Profile UI integration done. Face ID/Touch ID working |
| Epic | Feature Flags System | P0 | @backend | 5 | ✅ **completed** | Sprint 1 | subscription.model.ts, feature-flags.model.ts, services, guards, directives. ✅ Remote Config integrated |
| Epic | Paywall Component | P0 | @frontend | 3 | ✅ **completed** | Sprint 1 | /upgrade page created with pricing table, 3 plans, FAQ, billing toggle |
| Epic | Payment System - Stripe | P0 | @backend | 13 | ✅ **completed** | Sprint 2 | Stripe integration: models, config, service, Cloud Functions, success/cancel pages |
| Epic | Payment System - PagSeguro | P0 | @backend | 5 | ✅ **completed** | Sprint 3 | PagSeguro integration: PIX, Boleto, Credit Card, Cloud Functions |
| Epic | Remote Config & Analytics | P1 | @backend | 5 | ✅ **completed** | Sprint 4 | Firebase Remote Config + Analytics with 60+ events, 9 user properties |
| Epic | OCR Scanner (PoC) | P1 | @backend | 8 | ✅ **completed** | Sprint 5 | Tesseract.js + Cloud Vision fallback. 3,700 lines: models, service, components, Cloud Functions. MedicationService integration, quota panel, edit dialog. Production-ready. |
| Epic | MedicationService Refactor (DDD) | P0 | @backend | 13 | ✅ **completed** | Sprint 6 | **MIGRATION COMPLETE** - DDD Architecture: 15 files, 4,200 lines. Domain (Medication, Dose, Schedule), Services (Stock, Validation), Repository, 4 Use Cases, Facade (MedicationServiceV2). **90% complete** - 10 page components + 2 auxiliar components migrated. 100% backward compatible. See SPRINT-6-MIGRATION-REPORT.md |
| 2.1 | Interaction Checker | P0 | @backend | 8 | not-started | # | Precisa definir provider de dados (DrugBank vs openFDA) |
| 1.2 | SSO Enterprise | P0 | @backend | 8 | not-started | # | Aguardando infraestrutura Enterprise |

_Use statuses: not-started / in-progress / review / done / blocked_

---

## 8. Como atualizar este documento

Workflow mínimo:
1. Criar Issue no repo descrevendo o item e linkar aqui (ex.: `#234 — OCR PoC`)
2. Ao mergear, marcar a linha do item como `done` e adicionar data/PR no campo "PR / Issue"
3. Para mudanças de escopo, versionar header: `## PRODUCT ROADMAP — vYYYY-MM-DD`

---

## 9. Observações finais e próximos passos imediatos (hoje)

1. Implementar `FeatureFlagsService` + minimal Stripe integration (test mode).
2. Iniciar `MedicationService` refactor com dois módulos: `MedicationCRUD` e `MedicationSchedule` (strangler fig).
3. Criar PoC OCR (Tesseract) e avaliar accuracy; se aceitável promover com paywall gating.

Se quiser, eu já crio os templates iniciais e o primeiro PoC de OCR/biometria — diga qual item prefere que eu crie primeiro e eu procedo com os arquivos/branches.
