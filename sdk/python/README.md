# Medicamenta.me Python SDK

Official Python SDK for the Medicamenta.me Public API.

## 📦 Installation

```bash
pip install medicamenta-api-client
```

## 🚀 Quick Start

```python
from medicamenta import MedicamentaClient

# Initialize with API Key
client = MedicamentaClient(api_key='YOUR_API_KEY')

# Or with OAuth access token
client = MedicamentaClient(access_token='YOUR_ACCESS_TOKEN')
```

## 📖 Usage Examples

### Patients

```python
# Create patient
patient = client.patients.create(
    name='João Silva',
    date_of_birth='1980-05-15',
    email='joao@example.com',
    phone='+5511999999999'
)

# List patients
response = client.patients.list(limit=10, status='active')
patients = response['data']

# Get patient
patient = client.patients.get('patient-id')

# Update patient
client.patients.update('patient-id', phone='+5511988888888')

# Delete patient (soft delete)
client.patients.delete('patient-id')

# Hard delete
client.patients.delete('patient-id', hard=True)
```

### Medications

```python
# Create medication
medication = client.medications.create(
    patient_id='patient-id',
    name='Losartana',
    dosage='50mg',
    frequency='daily',
    times=['08:00'],
    instructions='Tomar com água'
)

# List medications
response = client.medications.list(
    patient_id='patient-id',
    status='active'
)

# Update medication
client.medications.update(
    'medication-id',
    dosage='100mg',
    times=['08:00', '20:00']
)
```

### Adherence

```python
# Get adherence metrics
metrics = client.adherence.get(
    'patient-id',
    start_date='2024-01-01',
    end_date='2024-01-31'
)

print(f"Adherence rate: {metrics['metrics']['adherenceRate']}%")

# Get dose history
response = client.adherence.history('patient-id', limit=50, status='taken')
history = response['data']

# Confirm dose taken
from datetime import datetime

client.adherence.confirm(
    patient_id='patient-id',
    medication_id='medication-id',
    scheduled_time='2024-01-15T08:00:00Z',
    taken_at=datetime.now().isoformat(),
    notes='Tomado conforme prescrito'
)
```

### Reports

```python
# Adherence report
adherence_report = client.reports.adherence(
    start_date='2024-01-01',
    end_date='2024-01-31',
    patient_id='patient-id'
)

# Compliance report
compliance_report = client.reports.compliance()

# Export report
export_data = client.reports.export(
    report_type='adherence',
    format='csv'
)
```

### Webhooks

```python
# Create webhook
webhook = client.webhooks.create(
    url='https://your-app.com/webhooks',
    events=['dose.confirmed', 'dose.missed'],
    secret='your-webhook-secret'
)

# List webhooks
response = client.webhooks.list()
webhooks = response['data']

# Test webhook
result = client.webhooks.test('webhook-id')
print(f"Test {'passed' if result['success'] else 'failed'}")

# Delete webhook
client.webhooks.delete('webhook-id')
```

### Webhook Signature Verification

```python
from medicamenta import verify_webhook_signature
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    secret = 'your-webhook-secret'
    
    if not verify_webhook_signature(payload, signature, secret):
        return 'Invalid signature', 401
    
    # Process webhook
    event = request.json
    print(f"Event: {event['type']}")
    
    return 'OK', 200
```

## ⚙️ Configuration

```python
client = MedicamentaClient(
    api_key='YOUR_API_KEY',           # Required if not using access_token
    access_token='YOUR_ACCESS_TOKEN', # Required if not using api_key
    base_url='https://custom-url',    # Optional, defaults to production
    timeout=30                        # Optional, request timeout in seconds
)
```

## 🔐 Authentication

### API Key (Recommended for server-to-server)

```python
client = MedicamentaClient(api_key='mk_starter_abc123...')
```

### OAuth 2.0 Access Token (For user-based access)

```python
client = MedicamentaClient(access_token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
```

## 🚨 Error Handling

```python
from medicamenta import MedicamentaError

try:
    patient = client.patients.get('invalid-id')
except MedicamentaError as e:
    print(f'API Error: {e}')
    # Handle error appropriately
```

## 📚 API Documentation

For complete API documentation, visit:
- OpenAPI Spec: `https://your-api.com/api-docs`
- Developer Docs: `https://docs.medicamenta.me`

## 🧪 Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

## 📝 License

MIT

## 🤝 Support

- Email: api-support@medicamenta.me
- Documentation: https://docs.medicamenta.me
- Issues: https://github.com/medicamenta/api-client-python/issues

## Changelog

### 1.0.0 (2024-01-15)
- Initial release
- Full support for Patients, Medications, Adherence, Reports, and Webhooks APIs
- OAuth 2.0 and API Key authentication
- Webhook signature verification
