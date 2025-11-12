# 🧪 Guia de Testes - Medicamenta.me RESTful API

## 📋 Situação Atual

### ✅ Implementação Completa
- ✅ 21 endpoints implementados
- ✅ Autenticação OAuth 2.0 + JWT + API Keys
- ✅ Rate limiting funcional
- ✅ 3 SDKs oficiais (JavaScript, Python, Java)
- ✅ Documentação OpenAPI completa
- ✅ Código TypeScript compilado sem erros

### ⚠️ Bloqueio de Deploy
**Status:** API **NÃO deployada** em produção

**Motivo:** Projeto Firebase precisa estar no **Blaze Plan (pay-as-you-go)**

**Ação necessária:**
1. Acessar: https://console.firebase.google.com/project/medicamenta-me/usage/details
2. Fazer upgrade para Blaze Plan
3. Executar: `firebase deploy --only "functions:api"`

---

## 🔧 Opções de Teste

### Opção 1: Teste Local com Firebase Emulator (Recomendado)

#### Iniciar Emulator
```powershell
# Terminal 1 - Iniciar emulator
cd C:\Necxu\projects\medicamenta.me\applications\medicamenta.me
firebase emulators:start --only functions

# O emulator estará disponível em:
# http://localhost:5001/medicamenta-me/us-central1/api
```

#### Testar Endpoints

```powershell
# Health Check
curl http://localhost:5001/medicamenta-me/us-central1/api/health

# API Info
curl http://localhost:5001/medicamenta-me/us-central1/api/

# Swagger UI
# Abrir navegador: http://localhost:5001/medicamenta-me/us-central1/api/api-docs
```

#### Testar Autenticação

```powershell
# 1. Gerar API Key (simulado - em produção seria via endpoint /v1/auth/api-key)
$apiKey = "mk_test_1234567890abcdef1234567890abcdef"

# 2. Criar Paciente
$headers = @{
    "X-API-Key" = $apiKey
    "Content-Type" = "application/json"
}

$body = @{
    name = "João da Silva"
    dateOfBirth = "1980-05-15"
    email = "joao@example.com"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "http://localhost:5001/medicamenta-me/us-central1/api/v1/patients" `
    -Method POST `
    -Headers $headers `
    -Body $body

# 3. Listar Pacientes
Invoke-WebRequest `
    -Uri "http://localhost:5001/medicamenta-me/us-central1/api/v1/patients" `
    -Method GET `
    -Headers $headers
```

---

### Opção 2: Deploy em Produção (Requer Blaze Plan)

#### Pré-requisitos
1. ✅ Código implementado e compilado
2. ⚠️ **Projeto no Blaze Plan** (PENDENTE)
3. ⚠️ APIs habilitadas:
   - Cloud Functions API
   - Cloud Build API
   - Artifact Registry API

#### Comandos de Deploy

```powershell
# 1. Fazer upgrade do plano
# Acessar: https://console.firebase.google.com/project/medicamenta-me/usage/details
# Clicar em "Upgrade to Blaze"

# 2. Aguardar 1-2 minutos após upgrade

# 3. Deploy da API
firebase deploy --only "functions:api"

# 4. Aguardar deploy (3-5 minutos)
```

#### Testar em Produção

```powershell
# URL base da API
$baseUrl = "https://us-central1-medicamenta-app.cloudfunctions.net/api"

# Health Check
curl "$baseUrl/health"

# Swagger UI
# Abrir navegador: https://us-central1-medicamenta-app.cloudfunctions.net/api/api-docs
```

---

### Opção 3: Teste com SDKs

#### JavaScript/TypeScript

```bash
# Instalar SDK (após publicar no npm)
npm install @medicamenta/api-client

# Ou usar localmente
cd sdk/javascript
npm install
npm run build
```

```javascript
import { MedicamentaClient } from '@medicamenta/api-client';

const client = new MedicamentaClient({
  apiKey: 'mk_test_1234567890abcdef',
  baseUrl: 'http://localhost:5001/medicamenta-me/us-central1/api' // Local
  // baseUrl: 'https://us-central1-medicamenta-app.cloudfunctions.net/api' // Produção
});

// Criar paciente
const patient = await client.patients.create({
  name: 'João Silva',
  dateOfBirth: '1980-05-15',
  email: 'joao@example.com'
});

console.log('Paciente criado:', patient);

// Listar pacientes
const { data: patients } = await client.patients.list({ limit: 10 });
console.log('Pacientes:', patients);
```

#### Python

```bash
# Instalar SDK
pip install medicamenta-api-client

# Ou usar localmente
cd sdk/python
pip install -e .
```

```python
from medicamenta import MedicamentaClient

client = MedicamentaClient(
    api_key='mk_test_1234567890abcdef',
    base_url='http://localhost:5001/medicamenta-me/us-central1/api'  # Local
    # base_url='https://us-central1-medicamenta-app.cloudfunctions.net/api'  # Produção
)

# Criar paciente
patient = client.patients.create(
    name='João Silva',
    date_of_birth='1980-05-15',
    email='joao@example.com'
)

print(f'Paciente criado: {patient}')

# Listar pacientes
response = client.patients.list(limit=10)
print(f'Pacientes: {response["data"]}')
```

#### Java

```xml
<!-- Maven -->
<dependency>
    <groupId>me.medicamenta</groupId>
    <artifactId>medicamenta-api-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

```java
import me.medicamenta.client.MedicamentaClient;

MedicamentaClient client = new MedicamentaClient.Builder()
    .apiKey("mk_test_1234567890abcdef")
    .baseUrl("http://localhost:5001/medicamenta-me/us-central1/api") // Local
    // .baseUrl("https://us-central1-medicamenta-app.cloudfunctions.net/api") // Produção
    .build();

// Criar paciente
Patient patient = client.patients().create(
    new CreatePatientRequest()
        .name("João Silva")
        .dateOfBirth("1980-05-15")
        .email("joao@example.com")
);

System.out.println("Paciente criado: " + patient.id);

// Listar pacientes
ListResponse<Patient> response = client.patients().list(
    new ListPatientsRequest().limit(10)
);
System.out.println("Total: " + response.data.size());
```

---

## 🧪 Casos de Teste

### 1. Health Check
```powershell
# Deve retornar: { "status": "ok", "version": "1.0.0", "timestamp": "..." }
curl http://localhost:5001/medicamenta-me/us-central1/api/health
```

### 2. Autenticação - API Key
```powershell
# Com API Key válida - deve retornar 200
curl -H "X-API-Key: mk_test_abc123" http://localhost:5001/.../api/v1/patients

# Sem API Key - deve retornar 401
curl http://localhost:5001/.../api/v1/patients

# API Key inválida - deve retornar 401
curl -H "X-API-Key: invalid" http://localhost:5001/.../api/v1/patients
```

### 3. CRUD de Pacientes
```powershell
# CREATE - Criar paciente
curl -X POST http://localhost:5001/.../api/v1/patients \
  -H "X-API-Key: mk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "dateOfBirth": "1990-03-20",
    "email": "maria@example.com"
  }'

# READ - Listar pacientes
curl http://localhost:5001/.../api/v1/patients \
  -H "X-API-Key: mk_test_abc123"

# READ - Buscar por ID
curl http://localhost:5001/.../api/v1/patients/{id} \
  -H "X-API-Key: mk_test_abc123"

# UPDATE - Atualizar paciente
curl -X PATCH http://localhost:5001/.../api/v1/patients/{id} \
  -H "X-API-Key: mk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+5511999999999" }'

# DELETE - Deletar paciente (soft delete)
curl -X DELETE http://localhost:5001/.../api/v1/patients/{id} \
  -H "X-API-Key: mk_test_abc123"
```

### 4. Rate Limiting
```powershell
# Fazer múltiplas requisições rapidamente
for ($i=1; $i -le 150; $i++) {
    curl http://localhost:5001/.../api/v1/patients `
      -H "X-API-Key: mk_free_abc123" # Tier free: 100 req/min
    Write-Host "Request $i"
}
# A partir da requisição 101, deve retornar 429 (Too Many Requests)
```

### 5. Webhooks
```powershell
# Criar webhook
curl -X POST http://localhost:5001/.../api/v1/webhooks \
  -H "X-API-Key: mk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhooks",
    "events": ["dose.confirmed", "dose.missed"],
    "secret": "webhook_secret_123"
  }'

# Testar webhook
curl -X POST http://localhost:5001/.../api/v1/webhooks/{id}/test \
  -H "X-API-Key: mk_test_abc123"
```

---

## 📊 Checklist de Testes

### Funcionalidades Básicas
- [ ] Health check retorna 200
- [ ] API info retorna versão e endpoints
- [ ] Swagger UI carrega corretamente

### Autenticação
- [ ] API Key válida permite acesso
- [ ] API Key inválida retorna 401
- [ ] Requisição sem autenticação retorna 401
- [ ] OAuth 2.0 token generation funciona
- [ ] JWT refresh token funciona

### Rate Limiting
- [ ] Free tier limita a 100 req/min
- [ ] Headers X-RateLimit-* são retornados
- [ ] Erro 429 após exceder limite
- [ ] Rate limit reseta após 1 minuto

### Patients CRUD
- [ ] Criar paciente com dados válidos
- [ ] Listar pacientes com paginação
- [ ] Buscar paciente por ID
- [ ] Atualizar paciente
- [ ] Deletar paciente (soft delete)
- [ ] Validação de campos obrigatórios

### Medications CRUD
- [ ] Criar medicamento
- [ ] Listar medicamentos por paciente
- [ ] Atualizar medicamento
- [ ] Deletar medicamento

### Adherence
- [ ] Obter métricas de adesão
- [ ] Obter histórico de doses
- [ ] Confirmar dose tomada
- [ ] Calcular adherence rate corretamente

### Reports
- [ ] Gerar relatório de adesão
- [ ] Gerar relatório de compliance
- [ ] Exportar em JSON
- [ ] Exportar em CSV (se implementado)

### Webhooks
- [ ] Criar webhook subscription
- [ ] Listar webhooks
- [ ] Testar webhook delivery
- [ ] Verificar assinatura HMAC-SHA256
- [ ] Deletar webhook

### Error Handling
- [ ] Erros retornam JSON estruturado
- [ ] Status codes apropriados (400, 401, 404, 500)
- [ ] Mensagens de erro descritivas
- [ ] Stack traces não vazam em produção

---

## 🎯 Próximos Passos

### Imediato
1. **Upgrade para Blaze Plan**
   - Acessar: https://console.firebase.google.com/project/medicamenta-me/usage/details
   - Adicionar método de pagamento
   - Confirmar upgrade

2. **Deploy em Produção**
   ```bash
   firebase deploy --only "functions:api"
   ```

3. **Criar Dados de Teste**
   - Gerar API keys de teste
   - Criar parceiros de teste
   - Popular com pacientes e medicamentos de exemplo

### Curto Prazo
1. **Configurar Ambiente Sandbox**
   - Criar projeto separado: medicamenta-sandbox
   - Deploy da API
   - Configurar dados de teste
   - Documentar URLs do sandbox

2. **Testes Automatizados**
   - Criar suite de testes com Jest/Mocha
   - Testes de integração
   - Testes de carga (stress testing)

3. **Monitoramento**
   - Configurar Firebase Analytics
   - Configurar alertas de erro
   - Dashboard de métricas

---

## 📚 Recursos

### Documentação
- **API README:** `API-README.md`
- **OpenAPI Spec:** `functions/src/api/docs/openapi.json`
- **Implementation Report:** `API-IMPLEMENTATION-REPORT.md`

### SDKs
- **JavaScript:** `sdk/javascript/README.md`
- **Python:** `sdk/python/README.md`
- **Java:** `sdk/java/README.md`

### Links Úteis
- Firebase Console: https://console.firebase.google.com/project/medicamenta-me
- Upgrade Blaze: https://console.firebase.google.com/project/medicamenta-me/usage/details
- Cloud Functions Docs: https://firebase.google.com/docs/functions

---

## ❓ Troubleshooting

### Erro: "Project must be on Blaze plan"
**Solução:** Fazer upgrade em https://console.firebase.google.com/project/medicamenta-me/usage/details

### Erro: "Quota exceeded"
**Solução:** Aguardar 1-2 minutos ou habilitar APIs manualmente no Cloud Console

### Emulator não inicia
**Solução:** 
```bash
npm install -g firebase-tools@latest
firebase emulators:start --only functions
```

### TypeScript compilation errors
**Solução:**
```bash
cd functions
npm run build
```

### Rate limit muito restritivo em testes
**Solução:** Temporariamente aumentar limites em `functions/src/api/middleware/rate-limiter.ts`

---

**Status:** API implementada e pronta para deploy ✅  
**Bloqueio:** Requer Blaze Plan para produção ⚠️  
**Alternativa:** Testar localmente com Firebase Emulator 🔧
