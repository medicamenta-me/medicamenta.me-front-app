# 🧪 Sandbox - Medicamenta.me API

## URLs de Acesso

### API Base URL
```
https://us-central1-medicamenta-me.cloudfunctions.net/api
```

### Swagger UI (Documentação Interativa)
```
https://us-central1-medicamenta-me.cloudfunctions.net/api/api-docs
```

### Health Check
```
https://us-central1-medicamenta-me.cloudfunctions.net/api/health
```

## 🔑 Credenciais de Teste

### API Key de Teste (Professional Tier)
```
mk_sandbox_test_1234567890abcdef1234567890abcdef
```

**Rate Limits:**
- 2.000 requisições/minuto
- 200.000 requisições/dia

### Configuração Manual Necessária

⚠️ **AÇÃO NECESSÁRIA:** Crie as credenciais de teste no Firestore:

1. Acesse o Firestore Console:
   ```
   https://console.firebase.google.com/project/medicamenta-me/firestore
   ```

2. Crie a collection `partners` com este documento:
   ```json
   Document ID: sandbox_partner_001
   {
     "name": "Sandbox Test Partner",
     "email": "sandbox@medicamenta.me",
     "tier": "professional",
     "status": "active",
     "createdAt": [Timestamp: now],
     "apiKeyEnabled": true
   }
   ```

3. Crie a collection `api_keys` com este documento:
   ```json
   Document ID: [auto]
   {
     "key": "mk_sandbox_test_1234567890abcdef1234567890abcdef",
     "partnerId": "sandbox_partner_001",
     "tier": "professional",
     "status": "active",
     "createdAt": [Timestamp: now],
     "lastUsedAt": null,
     "usageCount": 0,
     "rateLimit": {
       "requestsPerMinute": 2000,
       "requestsPerDay": 200000
     }
   }
   ```

4. Execute o script de configuração:
   ```powershell
   .\setup-sandbox.ps1
   ```

## 📖 Exemplos de Uso

### cURL

```bash
# Health Check
curl https://us-central1-medicamenta-me.cloudfunctions.net/api/health

# Listar pacientes
curl -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/patients

# Criar paciente
curl -X POST \
     -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Maria Santos",
       "dateOfBirth": "1990-03-20",
       "email": "maria@example.com"
     }' \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/patients

# Criar medicamento
curl -X POST \
     -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     -H "Content-Type: application/json" \
     -d '{
       "patientId": "PATIENT_ID",
       "name": "Losartana",
       "dosage": "50mg",
       "frequency": "daily",
       "times": ["08:00", "20:00"]
     }' \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/medications

# Obter métricas de adesão
curl -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/adherence/PATIENT_ID
```

### PowerShell

```powershell
# Configurar headers
$headers = @{
    "X-API-Key" = "mk_sandbox_test_1234567890abcdef1234567890abcdef"
    "Content-Type" = "application/json"
}

# Health Check
Invoke-RestMethod -Uri "https://us-central1-medicamenta-me.cloudfunctions.net/api/health"

# Criar paciente
$patient = @{
    name = "João Silva"
    dateOfBirth = "1980-05-15"
    email = "joao@example.com"
} | ConvertTo-Json

$result = Invoke-RestMethod `
    -Uri "https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/patients" `
    -Method POST `
    -Headers $headers `
    -Body $patient

# Listar pacientes
Invoke-RestMethod `
    -Uri "https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/patients" `
    -Headers $headers
```

### JavaScript/TypeScript

```javascript
import { MedicamentaClient } from '@medicamenta/api-client';

const client = new MedicamentaClient({
  apiKey: 'mk_sandbox_test_1234567890abcdef1234567890abcdef',
  baseUrl: 'https://us-central1-medicamenta-me.cloudfunctions.net/api'
});

// Criar paciente
const patient = await client.patients.create({
  name: 'Maria Santos',
  dateOfBirth: '1990-03-20',
  email: 'maria@example.com',
  phone: '+5511999999999'
});

console.log('Paciente criado:', patient.id);

// Listar pacientes
const { data: patients } = await client.patients.list({ limit: 10 });
console.log('Total de pacientes:', patients.length);

// Criar medicamento
const medication = await client.medications.create({
  patientId: patient.id,
  name: 'Atenolol',
  dosage: '25mg',
  frequency: 'daily',
  times: ['08:00']
});

// Obter métricas de adesão
const metrics = await client.adherence.get(patient.id);
console.log('Taxa de adesão:', metrics.metrics.adherenceRate, '%');
```

### Python

```python
from medicamenta import MedicamentaClient

client = MedicamentaClient(
    api_key='mk_sandbox_test_1234567890abcdef1234567890abcdef',
    base_url='https://us-central1-medicamenta-me.cloudfunctions.net/api'
)

# Criar paciente
patient = client.patients.create(
    name='João Silva',
    date_of_birth='1980-05-15',
    email='joao@example.com',
    phone='+5511999999999'
)

print(f'Paciente criado: {patient["id"]}')

# Listar pacientes
response = client.patients.list(limit=10)
patients = response['data']
print(f'Total de pacientes: {len(patients)}')

# Criar medicamento
medication = client.medications.create(
    patient_id=patient['id'],
    name='Losartana',
    dosage='50mg',
    frequency='daily',
    times=['08:00', '20:00']
)

# Obter métricas de adesão
metrics = client.adherence.get(patient['id'])
print(f"Taxa de adesão: {metrics['metrics']['adherenceRate']}%")
```

### Java

```java
import me.medicamenta.client.MedicamentaClient;

MedicamentaClient client = new MedicamentaClient.Builder()
    .apiKey("mk_sandbox_test_1234567890abcdef1234567890abcdef")
    .baseUrl("https://us-central1-medicamenta-me.cloudfunctions.net/api")
    .build();

// Criar paciente
Patient patient = client.patients().create(
    new CreatePatientRequest()
        .name("Maria Santos")
        .dateOfBirth("1990-03-20")
        .email("maria@example.com")
);

System.out.println("Paciente criado: " + patient.id);

// Listar pacientes
ListResponse<Patient> response = client.patients().list(
    new ListPatientsRequest().limit(10)
);
System.out.println("Total: " + response.data.size());

// Criar medicamento
Medication medication = client.medications().create(
    new CreateMedicationRequest()
        .patientId(patient.id)
        .name("Atenolol")
        .dosage("25mg")
);

// Obter métricas
AdherenceMetrics metrics = client.adherence().get(
    patient.id,
    new GetAdherenceRequest()
);
System.out.println("Adesão: " + metrics.metrics.adherenceRate + "%");
```

## 🔗 Webhook Testing

Use [webhook.site](https://webhook.site) para testar webhooks:

1. Acesse https://webhook.site
2. Copie a URL única gerada
3. Crie um webhook via API:

```bash
curl -X POST \
     -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://webhook.site/your-unique-id",
       "events": ["dose.confirmed", "dose.missed", "patient.created"],
       "secret": "webhook_secret_123"
     }' \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/webhooks
```

4. As notificações aparecerão automaticamente no webhook.site

### Verificar Assinatura do Webhook

```javascript
// Node.js
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const [timestamp, hash] = signature.split(',').map(s => s.split('=')[1]);
  
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return hash === expectedHash;
}

// No seu endpoint de webhook
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'webhook_secret_123';
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Processar evento
  console.log('Evento:', req.body.type);
  res.status(200).send('OK');
});
```

## 📊 Endpoints Disponíveis

### Autenticação
- `POST /v1/auth/token` - Gerar OAuth token
- `POST /v1/auth/revoke` - Revogar token
- `POST /v1/auth/api-key` - Gerar API key

### Pacientes
- `POST /v1/patients` - Criar paciente
- `GET /v1/patients` - Listar pacientes
- `GET /v1/patients/:id` - Buscar paciente
- `PATCH /v1/patients/:id` - Atualizar paciente
- `DELETE /v1/patients/:id` - Deletar paciente

### Medicamentos
- `POST /v1/medications` - Criar medicamento
- `GET /v1/medications` - Listar medicamentos
- `GET /v1/medications/:id` - Buscar medicamento
- `PATCH /v1/medications/:id` - Atualizar medicamento
- `DELETE /v1/medications/:id` - Deletar medicamento

### Adesão
- `GET /v1/adherence/:patientId` - Métricas de adesão
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

## ⚠️ Limitações do Sandbox

- ✅ Todos os endpoints disponíveis
- ✅ Dados persistidos no Firestore (produção)
- ✅ Rate limiting ativo (2000 req/min)
- ⚠️ Dados compartilhados entre desenvolvedores
- ⚠️ Dados podem ser limpos periodicamente
- ⚠️ **NÃO enviar dados reais de pacientes**
- ⚠️ Uso apenas para testes e desenvolvimento

## 🛠️ Recursos Adicionais

### SDKs Oficiais
- **JavaScript/TypeScript:** `npm install @medicamenta/api-client`
- **Python:** `pip install medicamenta-api-client`
- **Java:** Maven/Gradle (ver `sdk/java/README.md`)

### Documentação
- **API README:** `API-README.md` (guia completo)
- **Testing Guide:** `TESTING-GUIDE.md` (guia de testes)
- **OpenAPI Spec:** Disponível em `/api-docs`

### Scripts Úteis
- **setup-sandbox.ps1:** Configurar ambiente sandbox
- **test-api-local.ps1:** Testar API localmente

## 📞 Suporte

- **Email:** api-support@medicamenta.me
- **Documentação:** https://docs.medicamenta.me
- **Issues:** https://github.com/medicamenta/api-client/issues

## 📈 Status da API

Verificar status em tempo real:
```
https://us-central1-medicamenta-me.cloudfunctions.net/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-11T18:44:00.480Z",
  "uptime": 523.857688368
}
```

## 💰 Custos

**Plano Blaze (Pay-as-you-go):**
- Mínimo mensal: $7.11 (1 instância warm)
- Requisições adicionais: Cobradas por uso
- Ver detalhes: https://firebase.google.com/pricing

**Monitoramento:**
- Console: https://console.firebase.google.com/project/medicamenta-me/functions
- Logs: https://console.firebase.google.com/project/medicamenta-me/logs

---

**Ambiente:** Produção (Sandbox)  
**URL da API:** https://us-central1-medicamenta-me.cloudfunctions.net/api  
**Última atualização:** 2025-11-11  
**Versão:** 1.0.0
