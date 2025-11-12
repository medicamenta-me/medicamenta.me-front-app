# 🔵 Medicamenta.me Public API

RESTful API para integração de parceiros com a plataforma Medicamenta.me.

## 📚 Documentação

- **Swagger UI**: `/api-docs`
- **OpenAPI Spec**: `/openapi.json`
- **Health Check**: `/health`

## 🚀 Quick Start

### 1. Obter Credenciais

Cadastre-se como parceiro em https://partner.medicamenta.me e obtenha:
- `client_id` (Partner ID)
- `client_secret` (Partner Secret)

### 2. Gerar Access Token

```bash
curl -X POST https://api.medicamenta.me/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-partner-id",
    "client_secret": "your-partner-secret"
  }'
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "refresh_token_here"
}
```

### 3. Criar API Key (Recomendado)

```bash
curl -X POST https://api.medicamenta.me/v1/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-partner-id",
    "client_secret": "your-partner-secret",
    "name": "Production API Key",
    "tier": "professional"
  }'
```

**Resposta:**
```json
{
  "api_key": "mk_professional_abc123...",
  "name": "Production API Key",
  "tier": "professional",
  "permissions": [],
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 4. Fazer Requisições

#### Usando Bearer Token:
```bash
curl https://api.medicamenta.me/v1/patients \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Usando API Key:
```bash
curl https://api.medicamenta.me/v1/patients \
  -H "X-API-Key: YOUR_API_KEY"
```

## 📖 Endpoints Principais

### Autenticação

- `POST /v1/auth/token` - Obter access token
- `POST /v1/auth/revoke` - Revogar refresh token
- `POST /v1/auth/api-key` - Gerar API key

### Pacientes

- `POST /v1/patients` - Criar paciente
- `GET /v1/patients` - Listar pacientes
- `GET /v1/patients/:id` - Buscar paciente
- `PATCH /v1/patients/:id` - Atualizar paciente
- `DELETE /v1/patients/:id` - Deletar paciente

### Medicamentos

- `POST /v1/medications` - Adicionar medicamento
- `GET /v1/medications` - Listar medicamentos
- `GET /v1/medications/:id` - Buscar medicamento
- `PATCH /v1/medications/:id` - Atualizar medicamento
- `DELETE /v1/medications/:id` - Deletar medicamento

### Adesão

- `GET /v1/adherence/:patientId` - Taxa de adesão
- `GET /v1/adherence/:patientId/history` - Histórico de doses
- `POST /v1/adherence/confirm` - Confirmar dose

### Relatórios

- `GET /v1/reports/adherence` - Relatório de adesão
- `GET /v1/reports/compliance` - Relatório de compliance
- `POST /v1/reports/export` - Exportar relatório

### Webhooks

- `POST /v1/webhooks` - Criar webhook
- `GET /v1/webhooks` - Listar webhooks
- `GET /v1/webhooks/:id` - Buscar webhook
- `DELETE /v1/webhooks/:id` - Deletar webhook
- `POST /v1/webhooks/:id/test` - Testar webhook

## 💡 Exemplos de Uso

### Criar Paciente

```javascript
const response = await fetch('https://api.medicamenta.me/v1/patients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999',
    dateOfBirth: '1980-05-15',
    gender: 'M',
    medicalConditions: ['Hipertensão', 'Diabetes Tipo 2'],
    allergies: ['Penicilina']
  })
});

const patient = await response.json();
console.log('Patient created:', patient.id);
```

### Adicionar Medicamento

```javascript
const medication = await fetch('https://api.medicamenta.me/v1/medications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    patientId: 'patient_abc123',
    name: 'Losartana Potássica',
    dosage: '50mg',
    frequency: 'daily',
    times: ['08:00'],
    instructions: 'Tomar em jejum',
    prescribedBy: 'Dr. Carlos Silva - CRM 12345'
  })
});
```

### Confirmar Dose

```javascript
await fetch('https://api.medicamenta.me/v1/adherence/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    patientId: 'patient_abc123',
    medicationId: 'med_xyz789',
    scheduledTime: '2024-01-15T08:00:00Z',
    takenAt: '2024-01-15T08:05:00Z',
    notes: 'Tomado conforme prescrito'
  })
});
```

### Configurar Webhook

```javascript
const webhook = await fetch('https://api.medicamenta.me/v1/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/medicamenta',
    events: [
      'dose.taken',
      'dose.missed',
      'adherence.low',
      'stock.low'
    ],
    secret: 'your-webhook-secret' // Opcional
  })
});
```

### Receber Webhooks

```javascript
// Express.js example
app.post('/webhooks/medicamenta', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const [timestamp, hash] = signature.split(',').map(s => s.split('=')[1]);
  const expectedHash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  if (hash !== expectedHash) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const { event, data } = req.body;
  
  switch (event) {
    case 'dose.taken':
      console.log('Dose taken:', data);
      break;
    case 'dose.missed':
      console.log('Dose missed:', data);
      // Send alert to caregiver
      break;
    case 'adherence.low':
      console.log('Low adherence detected:', data);
      // Trigger intervention
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🔐 Autenticação

### OAuth 2.0 (Bearer Token)

**Prós:**
- Padrão da indústria
- Suporte a refresh tokens
- Expira automaticamente (24h)

**Uso:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.medicamenta.me/v1/patients
```

### API Key

**Prós:**
- Mais simples
- Não expira
- Ideal para server-to-server

**Uso:**
```bash
curl -H "X-API-Key: YOUR_API_KEY" https://api.medicamenta.me/v1/patients
```

## ⏱️ Rate Limiting

Limites por tier:

| Tier | Requests/min | Requests/dia | Preço |
|------|-------------|-------------|--------|
| **Free** | 100 | 10.000 | Grátis |
| **Starter** | 500 | 50.000 | R$ 199/mês |
| **Professional** | 2.000 | 200.000 | R$ 999/mês |
| **Business** | 5.000 | 500.000 | R$ 2.999/mês |
| **Enterprise** | 10.000 | Ilimitado | Custom |

**Headers de Rate Limit:**
```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1850
X-RateLimit-Reset: 2024-01-15T10:05:00Z
```

Quando o limite é excedido:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 seconds"
  }
}
```

## 🚨 Tratamento de Erros

Todos os erros seguem o mesmo formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-15T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Códigos de Erro Comuns

| Código | Status | Descrição |
|--------|--------|-----------|
| `UNAUTHORIZED` | 401 | API key ou token inválido |
| `FORBIDDEN` | 403 | Sem permissão para acessar recurso |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `VALIDATION_ERROR` | 400 | Dados inválidos |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requisições excedido |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

## 📊 Eventos de Webhook

### Pacientes
- `patient.created` - Paciente criado
- `patient.updated` - Paciente atualizado
- `patient.deleted` - Paciente deletado

### Medicamentos
- `medication.created` - Medicamento adicionado
- `medication.updated` - Medicamento atualizado
- `medication.deleted` - Medicamento removido
- `medication.stock_low` - Estoque baixo

### Adesão
- `dose.taken` - Dose confirmada
- `dose.missed` - Dose perdida
- `dose.skipped` - Dose pulada
- `adherence.threshold` - Adesão abaixo do limiar (< 80%)

### Alarmes
- `alarm.triggered` - Alarme disparado
- `alarm.snoozed` - Alarme adiado
- `alarm.dismissed` - Alarme dispensado

## 🔧 SDKs Oficiais

### JavaScript/TypeScript

```bash
npm install @medicamenta/api-client
```

```typescript
import { MedicamentaClient } from '@medicamenta/api-client';

const client = new MedicamentaClient({
  apiKey: 'YOUR_API_KEY'
});

// Criar paciente
const patient = await client.patients.create({
  name: 'João Silva',
  dateOfBirth: '1980-05-15'
});

// Listar medicamentos
const medications = await client.medications.list({
  patientId: patient.id
});

// Confirmar dose
await client.adherence.confirm({
  patientId: patient.id,
  medicationId: medications.data[0].id,
  scheduledTime: new Date()
});
```

### Python

```bash
pip install medicamenta
```

```python
from medicamenta import Client

client = Client(api_key='YOUR_API_KEY')

# Criar paciente
patient = client.patients.create(
    name='João Silva',
    date_of_birth='1980-05-15'
)

# Listar medicamentos
medications = client.medications.list(patient_id=patient.id)

# Confirmar dose
client.adherence.confirm(
    patient_id=patient.id,
    medication_id=medications[0].id,
    scheduled_time='2024-01-15T08:00:00Z'
)
```

### Java

```xml
<dependency>
    <groupId>com.medicamenta</groupId>
    <artifactId>medicamenta-java</artifactId>
    <version>1.0.0</version>
</dependency>
```

```java
import com.medicamenta.MedicamentaClient;

MedicamentaClient client = new MedicamentaClient("YOUR_API_KEY");

// Criar paciente
Patient patient = client.patients().create(
    new PatientCreateParams()
        .setName("João Silva")
        .setDateOfBirth("1980-05-15")
);

// Confirmar dose
client.adherence().confirm(
    new DoseConfirmParams()
        .setPatientId(patient.getId())
        .setMedicationId("med_123")
        .setScheduledTime(Instant.now())
);
```

## 🧪 Sandbox / Ambiente de Testes

Endpoint de sandbox: `https://sandbox-api.medicamenta.me`

- Mesma API, dados simulados
- Não afeta dados de produção
- Ideal para desenvolvimento e testes

```bash
curl https://sandbox-api.medicamenta.me/v1/patients \
  -H "X-API-Key: test_mk_abc123..."
```

## 📞 Suporte

- **Email**: api-support@medicamenta.me
- **Docs**: https://docs.medicamenta.me
- **Status**: https://status.medicamenta.me
- **Discord**: https://discord.gg/medicamenta

## 📜 Changelog

### v1.0.0 (2024-01-15)
- ✨ Lançamento inicial da API pública
- 🔐 OAuth 2.0 + API Keys
- 👤 Endpoints de pacientes
- 💊 Endpoints de medicamentos
- 📊 Endpoints de adesão
- 📈 Endpoints de relatórios
- 🔔 Sistema de webhooks
- 📚 Documentação OpenAPI/Swagger

## 📄 Licença

Proprietary - © 2024 Medicamenta.me
