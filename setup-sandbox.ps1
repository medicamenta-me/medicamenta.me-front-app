# 🔧 Configuração do Ambiente Sandbox
# Medicamenta.me API

<#
.SYNOPSIS
    Script de configuração do ambiente sandbox para a API Medicamenta.me

.DESCRIPTION
    Este script cria dados de teste, API keys e configurações necessárias
    para o ambiente sandbox da API.

.NOTES
    Executar após deploy da API em produção
#>

$ErrorActionPreference = "Stop"

# Configurações
$apiUrl = "https://us-central1-medicamenta-me.cloudfunctions.net/api"
$projectId = "medicamenta-me"

Write-Host "`n=== CONFIGURAÇÃO DO SANDBOX - MEDICAMENTA.ME API ===`n" -ForegroundColor Cyan

# Função para fazer requisições à API
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$ApiKey = ""
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($ApiKey) {
        $headers["X-API-Key"] = $ApiKey
    }
    
    $params = @{
        Uri = "$apiUrl$Endpoint"
        Method = $Method
        Headers = $headers
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return $response
    } catch {
        Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Verificar API
Write-Host "[1] Verificando API..." -ForegroundColor Yellow
$health = Invoke-ApiRequest -Method GET -Endpoint "/health"
if ($health.status -eq "healthy") {
    Write-Host "✅ API online e saudável" -ForegroundColor Green
    Write-Host "   Versão: $($health.version)" -ForegroundColor Gray
    Write-Host "   Uptime: $([Math]::Round($health.uptime, 2))s" -ForegroundColor Gray
} else {
    Write-Host "❌ API não está respondendo corretamente" -ForegroundColor Red
    exit 1
}

# 2. Criar parceiro de teste via Firestore (manual)
Write-Host "`n[2] Configuração de Parceiro de Teste" -ForegroundColor Yellow
Write-Host "⚠️  AÇÃO MANUAL NECESSÁRIA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Acesse o Firestore Console:" -ForegroundColor Cyan
Write-Host "https://console.firebase.google.com/project/$projectId/firestore" -ForegroundColor Cyan
Write-Host ""
Write-Host "Crie uma collection 'partners' com este documento:" -ForegroundColor White
Write-Host ""
Write-Host "Document ID: sandbox_partner_001" -ForegroundColor Gray
Write-Host "{" -ForegroundColor Gray
Write-Host '  "name": "Sandbox Test Partner",' -ForegroundColor Gray
Write-Host '  "email": "sandbox@medicamenta.me",' -ForegroundColor Gray
Write-Host '  "tier": "professional",' -ForegroundColor Gray
Write-Host '  "status": "active",' -ForegroundColor Gray
Write-Host '  "createdAt": (use Timestamp: now),' -ForegroundColor Gray
Write-Host '  "apiKeyEnabled": true' -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""

# 3. Gerar API Key de teste
Write-Host "[3] API Keys de Teste" -ForegroundColor Yellow
Write-Host ""
Write-Host "Após criar o parceiro no Firestore, crie API keys manualmente:" -ForegroundColor White
Write-Host ""
Write-Host "Collection: api_keys" -ForegroundColor Gray
Write-Host "Document ID: (auto)" -ForegroundColor Gray
Write-Host "{" -ForegroundColor Gray
Write-Host '  "key": "mk_sandbox_test_1234567890abcdef1234567890abcdef",' -ForegroundColor Gray
Write-Host '  "partnerId": "sandbox_partner_001",' -ForegroundColor Gray
Write-Host '  "tier": "professional",' -ForegroundColor Gray
Write-Host '  "status": "active",' -ForegroundColor Gray
Write-Host '  "createdAt": (use Timestamp: now),' -ForegroundColor Gray
Write-Host '  "lastUsedAt": null,' -ForegroundColor Gray
Write-Host '  "usageCount": 0' -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""

# Pausar para permitir criação manual
Write-Host "Pressione ENTER após criar o parceiro e API key no Firestore..." -ForegroundColor Yellow
Read-Host

# 4. Testar API Key
Write-Host "`n[4] Testando API Key..." -ForegroundColor Yellow
$testApiKey = "mk_sandbox_test_1234567890abcdef1234567890abcdef"

$testPatient = @{
    name = "João da Silva (Sandbox)"
    dateOfBirth = "1980-05-15"
    email = "joao.sandbox@example.com"
    phone = "+5511999999999"
    gender = "M"
    medicalConditions = @("Hipertensão")
    allergies = @("Penicilina")
}

Write-Host "Criando paciente de teste..." -ForegroundColor Gray
$patient = Invoke-ApiRequest -Method POST -Endpoint "/v1/patients" -Body $testPatient -ApiKey $testApiKey

if ($patient -and $patient.id) {
    Write-Host "✅ Paciente de teste criado com sucesso!" -ForegroundColor Green
    Write-Host "   ID: $($patient.id)" -ForegroundColor Cyan
    $patientId = $patient.id
    
    # 5. Criar medicamento de teste
    Write-Host "`n[5] Criando medicamento de teste..." -ForegroundColor Yellow
    $testMedication = @{
        patientId = $patientId
        name = "Losartana"
        dosage = "50mg"
        frequency = "daily"
        times = @("08:00", "20:00")
        instructions = "Tomar com água, em jejum"
    }
    
    $medication = Invoke-ApiRequest -Method POST -Endpoint "/v1/medications" -Body $testMedication -ApiKey $testApiKey
    
    if ($medication -and $medication.id) {
        Write-Host "✅ Medicamento criado com sucesso!" -ForegroundColor Green
        Write-Host "   ID: $($medication.id)" -ForegroundColor Cyan
        $medicationId = $medication.id
        
        # 6. Confirmar dose
        Write-Host "`n[6] Confirmando dose de teste..." -ForegroundColor Yellow
        $doseConfirm = @{
            patientId = $patientId
            medicationId = $medicationId
            scheduledTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            takenAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            notes = "Dose tomada - teste sandbox"
        }
        
        $dose = Invoke-ApiRequest -Method POST -Endpoint "/v1/adherence/confirm" -Body $doseConfirm -ApiKey $testApiKey
        
        if ($dose) {
            Write-Host "✅ Dose confirmada com sucesso!" -ForegroundColor Green
        }
        
        # 7. Obter métricas de adesão
        Write-Host "`n[7] Obtendo métricas de adesão..." -ForegroundColor Yellow
        $adherence = Invoke-ApiRequest -Method GET -Endpoint "/v1/adherence/$patientId" -ApiKey $testApiKey
        
        if ($adherence) {
            Write-Host "✅ Métricas obtidas com sucesso!" -ForegroundColor Green
            Write-Host "   Taxa de adesão: $($adherence.metrics.adherenceRate)%" -ForegroundColor Cyan
        }
    }
    
    # 8. Criar webhook de teste
    Write-Host "`n[8] Criando webhook de teste..." -ForegroundColor Yellow
    $testWebhook = @{
        url = "https://webhook.site/unique-id"
        events = @("dose.confirmed", "dose.missed", "patient.created")
        secret = "sandbox_webhook_secret_123"
    }
    
    $webhook = Invoke-ApiRequest -Method POST -Endpoint "/v1/webhooks" -Body $testWebhook -ApiKey $testApiKey
    
    if ($webhook -and $webhook.id) {
        Write-Host "✅ Webhook criado com sucesso!" -ForegroundColor Green
        Write-Host "   ID: $($webhook.id)" -ForegroundColor Cyan
        Write-Host "   URL: $($webhook.url)" -ForegroundColor Gray
    }
}

# 9. Gerar documentação do sandbox
Write-Host "`n[9] Gerando documentação do sandbox..." -ForegroundColor Yellow

$sandboxDoc = @"
# 🧪 Sandbox - Medicamenta.me API

## URLs de Acesso

### API Base URL
\`\`\`
https://us-central1-medicamenta-me.cloudfunctions.net/api
\`\`\`

### Swagger UI (Documentação Interativa)
\`\`\`
https://us-central1-medicamenta-me.cloudfunctions.net/api/api-docs
\`\`\`

### Health Check
\`\`\`
https://us-central1-medicamenta-me.cloudfunctions.net/api/health
\`\`\`

## Credenciais de Teste

### API Key (Professional Tier)
\`\`\`
mk_sandbox_test_1234567890abcdef1234567890abcdef
\`\`\`

**Rate Limits:**
- 2000 requisições/minuto
- 200.000 requisições/dia

### Parceiro de Teste
- **ID:** sandbox_partner_001
- **Nome:** Sandbox Test Partner
- **Email:** sandbox@medicamenta.me
- **Tier:** Professional

## Dados de Teste

### Paciente de Teste
- **Nome:** João da Silva (Sandbox)
- **Data de Nascimento:** 1980-05-15
- **Email:** joao.sandbox@example.com
- **Telefone:** +5511999999999
- **ID:** $patientId

### Medicamento de Teste
- **Nome:** Losartana
- **Dosagem:** 50mg
- **Frequência:** Diária (08:00, 20:00)
- **ID:** $medicationId

## Exemplos de Uso

### cURL

\`\`\`bash
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

# Obter métricas de adesão
curl -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/adherence/$patientId
\`\`\`

### JavaScript

\`\`\`javascript
import { MedicamentaClient } from '@medicamenta/api-client';

const client = new MedicamentaClient({
  apiKey: 'mk_sandbox_test_1234567890abcdef1234567890abcdef',
  baseUrl: 'https://us-central1-medicamenta-me.cloudfunctions.net/api'
});

// Listar pacientes
const { data: patients } = await client.patients.list({ limit: 10 });
console.log(patients);

// Criar medicamento
const medication = await client.medications.create({
  patientId: '$patientId',
  name: 'Atenolol',
  dosage: '25mg',
  frequency: 'daily',
  times: ['08:00']
});
\`\`\`

### Python

\`\`\`python
from medicamenta import MedicamentaClient

client = MedicamentaClient(
    api_key='mk_sandbox_test_1234567890abcdef1234567890abcdef',
    base_url='https://us-central1-medicamenta-me.cloudfunctions.net/api'
)

# Listar pacientes
response = client.patients.list(limit=10)
print(response['data'])

# Obter adesão
metrics = client.adherence.get('$patientId')
print(f"Taxa de adesão: {metrics['metrics']['adherenceRate']}%")
\`\`\`

## Webhook Testing

Use [webhook.site](https://webhook.site) para testar webhooks:

1. Acesse https://webhook.site
2. Copie a URL única gerada
3. Crie um webhook via API:

\`\`\`bash
curl -X POST \
     -H "X-API-Key: mk_sandbox_test_1234567890abcdef1234567890abcdef" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://webhook.site/your-unique-id",
       "events": ["dose.confirmed", "dose.missed"],
       "secret": "webhook_secret_123"
     }' \
     https://us-central1-medicamenta-me.cloudfunctions.net/api/v1/webhooks
\`\`\`

4. As notificações aparecerão automaticamente no webhook.site

## Limitações do Sandbox

- ✅ Todos os endpoints disponíveis
- ✅ Dados persistidos no Firestore (produção)
- ✅ Rate limiting ativo
- ⚠️ Dados podem ser limpos periodicamente
- ⚠️ Não enviar dados reais de pacientes
- ⚠️ Uso apenas para testes e desenvolvimento

## Suporte

- **Email:** api-support@medicamenta.me
- **Documentação:** https://docs.medicamenta.me
- **Issues:** https://github.com/medicamenta/api-client/issues

## Status da API

Verificar status em tempo real:
\`\`\`
https://us-central1-medicamenta-me.cloudfunctions.net/api/health
\`\`\`

---

**Ambiente:** Produção (Dados de Teste)  
**Última atualização:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$sandboxDoc | Out-File -FilePath "SANDBOX-README.md" -Encoding UTF8
Write-Host "✅ Documentação do sandbox criada: SANDBOX-README.md" -ForegroundColor Green

# 10. Resumo final
Write-Host "`n=== CONFIGURAÇÃO DO SANDBOX CONCLUÍDA ===`n" -ForegroundColor Green
Write-Host "📋 Informações importantes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 API URL:" -ForegroundColor Yellow
Write-Host "     https://us-central1-medicamenta-me.cloudfunctions.net/api" -ForegroundColor White
Write-Host ""
Write-Host "  🔑 API Key de Teste:" -ForegroundColor Yellow
Write-Host "     mk_sandbox_test_1234567890abcdef1234567890abcdef" -ForegroundColor White
Write-Host ""
Write-Host "  📚 Swagger UI:" -ForegroundColor Yellow
Write-Host "     https://us-central1-medicamenta-me.cloudfunctions.net/api/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "  📖 Documentação:" -ForegroundColor Yellow
Write-Host "     Ver arquivo SANDBOX-README.md" -ForegroundColor White
Write-Host ""
Write-Host "  👤 Paciente de Teste ID:" -ForegroundColor Yellow
if ($patientId) {
    Write-Host "     $patientId" -ForegroundColor White
}
Write-Host ""
Write-Host "  💊 Medicamento de Teste ID:" -ForegroundColor Yellow
if ($medicationId) {
    Write-Host "     $medicationId" -ForegroundColor White
}
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Testar endpoints com Swagger UI" -ForegroundColor Gray
Write-Host "  2. Integrar SDKs em suas aplicações" -ForegroundColor Gray
Write-Host "  3. Configurar webhooks para eventos" -ForegroundColor Gray
Write-Host "  4. Revisar documentação completa (API-README.md)" -ForegroundColor Gray
Write-Host ""
