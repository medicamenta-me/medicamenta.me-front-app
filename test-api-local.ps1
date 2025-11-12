# 🚀 Script de Teste Local - Medicamenta.me API

# Configuração
$baseUrl = "http://localhost:5001/medicamenta-me/us-central1/api"
$apiKey = "mk_test_1234567890abcdef1234567890abcdef"

Write-Host "`n=== MEDICAMENTA.ME API - TESTES LOCAIS ===`n" -ForegroundColor Cyan

# Função auxiliar para fazer requisições
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [bool]$UseAuth = $true
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($UseAuth) {
        $headers["X-API-Key"] = $apiKey
    }
    
    $params = @{
        Uri = "$baseUrl$Endpoint"
        Method = $Method
        Headers = $headers
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        Write-Host "✅ $Method $Endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
        return $content
    } catch {
        Write-Host "❌ $Method $Endpoint - Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "   Response: $errorBody" -ForegroundColor Yellow
        }
        return $null
    }
}

# 1. Health Check
Write-Host "`n[1] Testing Health Check..." -ForegroundColor Yellow
$health = Invoke-ApiRequest -Method GET -Endpoint "/health" -UseAuth $false

# 2. API Info
Write-Host "`n[2] Testing API Info..." -ForegroundColor Yellow
$info = Invoke-ApiRequest -Method GET -Endpoint "/" -UseAuth $false

# 3. Test Authentication - Without API Key (should fail)
Write-Host "`n[3] Testing Authentication - No API Key (should fail)..." -ForegroundColor Yellow
Invoke-ApiRequest -Method GET -Endpoint "/v1/patients" -UseAuth $false

# 4. Test Authentication - With API Key (should work)
Write-Host "`n[4] Testing Authentication - With API Key..." -ForegroundColor Yellow
Invoke-ApiRequest -Method GET -Endpoint "/v1/patients" -UseAuth $true

# 5. Create Patient
Write-Host "`n[5] Creating Test Patient..." -ForegroundColor Yellow
$newPatient = @{
    name = "João da Silva Test"
    dateOfBirth = "1980-05-15"
    email = "joao.test@example.com"
    phone = "+5511999999999"
    gender = "M"
}
$patient = Invoke-ApiRequest -Method POST -Endpoint "/v1/patients" -Body $newPatient

if ($patient) {
    $patientId = $patient.id
    Write-Host "   Patient ID: $patientId" -ForegroundColor Cyan
    
    # 6. Get Patient by ID
    Write-Host "`n[6] Getting Patient by ID..." -ForegroundColor Yellow
    Invoke-ApiRequest -Method GET -Endpoint "/v1/patients/$patientId"
    
    # 7. Update Patient
    Write-Host "`n[7] Updating Patient..." -ForegroundColor Yellow
    $updateData = @{
        phone = "+5511988888888"
    }
    Invoke-ApiRequest -Method PATCH -Endpoint "/v1/patients/$patientId" -Body $updateData
    
    # 8. Create Medication
    Write-Host "`n[8] Creating Medication for Patient..." -ForegroundColor Yellow
    $newMedication = @{
        patientId = $patientId
        name = "Losartana"
        dosage = "50mg"
        frequency = "daily"
        times = @("08:00", "20:00")
        instructions = "Tomar com água"
    }
    $medication = Invoke-ApiRequest -Method POST -Endpoint "/v1/medications" -Body $newMedication
    
    if ($medication) {
        $medicationId = $medication.id
        Write-Host "   Medication ID: $medicationId" -ForegroundColor Cyan
        
        # 9. List Medications
        Write-Host "`n[9] Listing Medications..." -ForegroundColor Yellow
        Invoke-ApiRequest -Method GET -Endpoint "/v1/medications?patientId=$patientId"
        
        # 10. Confirm Dose
        Write-Host "`n[10] Confirming Dose Taken..." -ForegroundColor Yellow
        $doseConfirm = @{
            patientId = $patientId
            medicationId = $medicationId
            scheduledTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            takenAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            notes = "Dose tomada conforme prescrito"
        }
        Invoke-ApiRequest -Method POST -Endpoint "/v1/adherence/confirm" -Body $doseConfirm
        
        # 11. Get Adherence Metrics
        Write-Host "`n[11] Getting Adherence Metrics..." -ForegroundColor Yellow
        Invoke-ApiRequest -Method GET -Endpoint "/v1/adherence/$patientId"
        
        # 12. Get Adherence History
        Write-Host "`n[12] Getting Adherence History..." -ForegroundColor Yellow
        Invoke-ApiRequest -Method GET -Endpoint "/v1/adherence/$patientId/history"
    }
}

# 13. List All Patients
Write-Host "`n[13] Listing All Patients..." -ForegroundColor Yellow
Invoke-ApiRequest -Method GET -Endpoint "/v1/patients?limit=10"

# 14. Generate Adherence Report
Write-Host "`n[14] Generating Adherence Report..." -ForegroundColor Yellow
Invoke-ApiRequest -Method GET -Endpoint "/v1/reports/adherence"

# 15. Generate Compliance Report
Write-Host "`n[15] Generating Compliance Report..." -ForegroundColor Yellow
Invoke-ApiRequest -Method GET -Endpoint "/v1/reports/compliance"

# 16. Create Webhook
Write-Host "`n[16] Creating Webhook..." -ForegroundColor Yellow
$newWebhook = @{
    url = "https://example.com/webhooks/medicamenta"
    events = @("dose.confirmed", "dose.missed", "patient.created")
    secret = "webhook_secret_12345"
}
$webhook = Invoke-ApiRequest -Method POST -Endpoint "/v1/webhooks" -Body $newWebhook

if ($webhook) {
    $webhookId = $webhook.id
    Write-Host "   Webhook ID: $webhookId" -ForegroundColor Cyan
    
    # 17. List Webhooks
    Write-Host "`n[17] Listing Webhooks..." -ForegroundColor Yellow
    Invoke-ApiRequest -Method GET -Endpoint "/v1/webhooks"
    
    # 18. Test Webhook
    Write-Host "`n[18] Testing Webhook..." -ForegroundColor Yellow
    Invoke-ApiRequest -Method POST -Endpoint "/v1/webhooks/$webhookId/test"
    
    # 19. Delete Webhook
    Write-Host "`n[19] Deleting Webhook..." -ForegroundColor Yellow
    Invoke-ApiRequest -Method DELETE -Endpoint "/v1/webhooks/$webhookId"
}

# 20. Cleanup - Delete Test Patient
if ($patientId) {
    Write-Host "`n[20] Cleanup - Deleting Test Patient..." -ForegroundColor Yellow
    Invoke-ApiRequest -Method DELETE -Endpoint "/v1/patients/$patientId?hard=true"
}

Write-Host "`n=== TESTES CONCLUÍDOS ===`n" -ForegroundColor Cyan
Write-Host "Para ver os logs detalhados, verifique o terminal do Firebase Emulator" -ForegroundColor Gray
Write-Host "Para acessar o Swagger UI, abra: $baseUrl/api-docs" -ForegroundColor Gray
