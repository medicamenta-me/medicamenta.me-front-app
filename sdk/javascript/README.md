# Medicamenta.me JavaScript/TypeScript SDK

Official SDK for the Medicamenta.me Public API.

## 📦 Installation

```bash
npm install @medicamenta/api-client
```

## 🚀 Quick Start

```typescript
import { MedicamentaClient } from '@medicamenta/api-client';

// Initialize with API Key
const client = new MedicamentaClient({
  apiKey: 'YOUR_API_KEY'
});

// Or with OAuth access token
const client = new MedicamentaClient({
  accessToken: 'YOUR_ACCESS_TOKEN'
});
```

## 📖 Usage Examples

### Patients

```typescript
// Create patient
const patient = await client.patients.create({
  name: 'João Silva',
  dateOfBirth: '1980-05-15',
  email: 'joao@example.com',
  phone: '+5511999999999'
});

// List patients
const { data: patients } = await client.patients.list({
  limit: 10,
  status: 'active'
});

// Get patient
const patient = await client.patients.get('patient-id');

// Update patient
await client.patients.update('patient-id', {
  phone: '+5511988888888'
});

// Delete patient (soft delete)
await client.patients.delete('patient-id');

// Hard delete
await client.patients.delete('patient-id', true);
```

### Medications

```typescript
// Create medication
const medication = await client.medications.create({
  patientId: 'patient-id',
  name: 'Losartana',
  dosage: '50mg',
  frequency: 'daily',
  times: ['08:00'],
  instructions: 'Tomar com água'
});

// List medications
const { data: medications } = await client.medications.list({
  patientId: 'patient-id',
  status: 'active'
});

// Update medication
await client.medications.update('medication-id', {
  dosage: '100mg',
  times: ['08:00', '20:00']
});
```

### Adherence

```typescript
// Get adherence metrics
const metrics = await client.adherence.get('patient-id', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

console.log(`Adherence rate: ${metrics.metrics.adherenceRate}%`);

// Get dose history
const { data: history } = await client.adherence.history('patient-id', {
  limit: 50,
  status: 'taken'
});

// Confirm dose taken
await client.adherence.confirm({
  patientId: 'patient-id',
  medicationId: 'medication-id',
  scheduledTime: new Date('2024-01-15T08:00:00'),
  takenAt: new Date(),
  notes: 'Tomado conforme prescrito'
});
```

### Reports

```typescript
// Adherence report
const adherenceReport = await client.reports.adherence({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  patientId: 'patient-id'
});

// Compliance report
const complianceReport = await client.reports.compliance();

// Export report
const exportData = await client.reports.export({
  reportType: 'adherence',
  format: 'csv'
});
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.webhooks.create({
  url: 'https://your-app.com/webhooks',
  events: ['dose.confirmed', 'dose.missed'],
  secret: 'your-webhook-secret'
});

// List webhooks
const { data: webhooks } = await client.webhooks.list();

// Test webhook
const result = await client.webhooks.test('webhook-id');
console.log(`Test ${result.success ? 'passed' : 'failed'}`);

// Delete webhook
await client.webhooks.delete('webhook-id');
```

### Webhook Signature Verification

```typescript
import { verifyWebhookSignature } from '@medicamenta/api-client';

// In your webhook endpoint
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your-webhook-secret';
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const event = req.body;
  console.log(`Event: ${event.type}`);
  
  res.status(200).send('OK');
});
```

## ⚙️ Configuration

```typescript
const client = new MedicamentaClient({
  apiKey: 'YOUR_API_KEY',           // Required if not using accessToken
  accessToken: 'YOUR_ACCESS_TOKEN', // Required if not using apiKey
  baseUrl: 'https://custom-url',    // Optional, defaults to production
  timeout: 30000                    // Optional, request timeout in ms
});
```

## 🔐 Authentication

### API Key (Recommended for server-to-server)

```typescript
const client = new MedicamentaClient({
  apiKey: 'mk_starter_abc123...'
});
```

### OAuth 2.0 Access Token (For user-based access)

```typescript
const client = new MedicamentaClient({
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});
```

## 📊 TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import { Patient, Medication, AdherenceMetrics } from '@medicamenta/api-client';

const patient: Patient = await client.patients.get('patient-id');
const medication: Medication = await client.medications.create({...});
const metrics: AdherenceMetrics = await client.adherence.get('patient-id');
```

## 🚨 Error Handling

```typescript
try {
  const patient = await client.patients.get('invalid-id');
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

## 📚 API Documentation

For complete API documentation, visit:
- OpenAPI Spec: `https://your-api.com/api-docs`
- Developer Docs: `https://docs.medicamenta.me`

## 📝 License

MIT

## 🤝 Support

- Email: api-support@medicamenta.me
- Documentation: https://docs.medicamenta.me
- Issues: https://github.com/medicamenta/api-client-js/issues
