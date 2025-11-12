# Medicamenta.me Java SDK

Official Java SDK for the Medicamenta.me Public API.

## 📦 Installation

### Maven

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>me.medicamenta</groupId>
    <artifactId>medicamenta-api-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

Add to your `build.gradle`:

```gradle
implementation 'me.medicamenta:medicamenta-api-client:1.0.0'
```

## 🚀 Quick Start

```java
import me.medicamenta.client.MedicamentaClient;

// Initialize with API Key
MedicamentaClient client = new MedicamentaClient.Builder()
    .apiKey("YOUR_API_KEY")
    .build();

// Or with OAuth access token
MedicamentaClient client = new MedicamentaClient.Builder()
    .accessToken("YOUR_ACCESS_TOKEN")
    .build();
```

## 📖 Usage Examples

### Patients

```java
import me.medicamenta.client.MedicamentaClient.*;

// Create patient
Patient patient = client.patients().create(
    new CreatePatientRequest()
        .name("João Silva")
        .dateOfBirth("1980-05-15")
        .email("joao@example.com")
);

// List patients
ListResponse<Patient> response = client.patients().list(
    new ListPatientsRequest()
        .limit(10)
        .status("active")
);
List<Patient> patients = response.data;

// Get patient
Patient patient = client.patients().get("patient-id");

// Update patient
client.patients().update(
    "patient-id",
    new UpdatePatientRequest().phone("+5511988888888")
);

// Delete patient (soft delete)
client.patients().delete("patient-id", false);

// Hard delete
client.patients().delete("patient-id", true);
```

### Medications

```java
// Create medication
Medication medication = client.medications().create(
    new CreateMedicationRequest()
        .patientId("patient-id")
        .name("Losartana")
        .dosage("50mg")
);

// List medications
ListResponse<Medication> response = client.medications().list(
    new ListMedicationsRequest()
);
```

### Adherence

```java
// Get adherence metrics
AdherenceMetrics metrics = client.adherence().get(
    "patient-id",
    new GetAdherenceRequest()
);

System.out.println("Adherence rate: " + metrics.metrics.adherenceRate + "%");
```

### Reports

```java
// Adherence report
Map<String, Object> report = client.reports().adherence(
    new AdherenceReportRequest()
);
```

### Webhooks

```java
import java.util.Arrays;

// Create webhook
Webhook webhook = client.webhooks().create(
    new CreateWebhookRequest()
        .url("https://your-app.com/webhooks")
        .events(Arrays.asList("dose.confirmed", "dose.missed"))
);

// List webhooks
ListResponse<Webhook> webhooks = client.webhooks().list();

// Delete webhook
client.webhooks().delete("webhook-id");
```

## ⚙️ Configuration

```java
MedicamentaClient client = new MedicamentaClient.Builder()
    .apiKey("YOUR_API_KEY")           // Required if not using accessToken
    .accessToken("YOUR_ACCESS_TOKEN") // Required if not using apiKey
    .baseUrl("https://custom-url")    // Optional
    .timeout(30)                      // Optional, timeout in seconds
    .build();
```

## 🔐 Authentication

### API Key

```java
MedicamentaClient client = new MedicamentaClient.Builder()
    .apiKey("mk_starter_abc123...")
    .build();
```

### OAuth 2.0 Access Token

```java
MedicamentaClient client = new MedicamentaClient.Builder()
    .accessToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    .build();
```

## 🚨 Error Handling

```java
import me.medicamenta.client.MedicamentaClient.MedicamentaException;

try {
    Patient patient = client.patients().get("invalid-id");
} catch (MedicamentaException e) {
    System.err.println("API Error: " + e.getMessage());
}
```

## 📚 API Documentation

For complete API documentation, visit:
- OpenAPI Spec: `https://your-api.com/api-docs`
- Developer Docs: `https://docs.medicamenta.me`

## 🧪 Testing

```bash
mvn test
```

## 📝 License

MIT

## 🤝 Support

- Email: api-support@medicamenta.me
- Documentation: https://docs.medicamenta.me
- Issues: https://github.com/medicamenta/api-client-java/issues

## Changelog

### 1.0.0 (2024-01-15)
- Initial release
- Full support for Patients, Medications, Adherence, Reports, and Webhooks APIs
- OAuth 2.0 and API Key authentication
- Built on OkHttp and Gson
