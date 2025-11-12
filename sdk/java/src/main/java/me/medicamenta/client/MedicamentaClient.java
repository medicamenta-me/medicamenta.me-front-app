package me.medicamenta.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import okhttp3.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 🔵 Medicamenta.me Java SDK
 * 
 * Official SDK for the Medicamenta.me Public API
 * 
 * Example:
 * <pre>
 * MedicamentaClient client = new MedicamentaClient.Builder()
 *     .apiKey("YOUR_API_KEY")
 *     .build();
 * 
 * Patient patient = client.patients().create(
 *     new CreatePatientRequest()
 *         .name("João Silva")
 *         .dateOfBirth("1980-05-15")
 * );
 * </pre>
 */
public class MedicamentaClient {
    private static final String DEFAULT_BASE_URL = "https://us-central1-medicamenta-app.cloudfunctions.net/api";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient httpClient;
    private final String baseUrl;
    private final Gson gson;
    private final String apiKey;
    private final String accessToken;
    
    // Resource managers
    private PatientsResource patientsResource;
    private MedicationsResource medicationsResource;
    private AdherenceResource adherenceResource;
    private ReportsResource reportsResource;
    private WebhooksResource webhooksResource;
    
    private MedicamentaClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.accessToken = builder.accessToken;
        this.baseUrl = builder.baseUrl != null ? builder.baseUrl : DEFAULT_BASE_URL;
        this.gson = new GsonBuilder().create();
        
        OkHttpClient.Builder httpBuilder = new OkHttpClient.Builder()
            .connectTimeout(builder.timeout, TimeUnit.SECONDS)
            .readTimeout(builder.timeout, TimeUnit.SECONDS)
            .writeTimeout(builder.timeout, TimeUnit.SECONDS);
        
        // Add authentication interceptor
        httpBuilder.addInterceptor(chain -> {
            Request.Builder requestBuilder = chain.request().newBuilder();
            
            if (apiKey != null) {
                requestBuilder.header("X-API-Key", apiKey);
            } else if (accessToken != null) {
                requestBuilder.header("Authorization", "Bearer " + accessToken);
            }
            
            return chain.proceed(requestBuilder.build());
        });
        
        this.httpClient = httpBuilder.build();
        
        // Initialize resources
        this.patientsResource = new PatientsResource(this);
        this.medicationsResource = new MedicationsResource(this);
        this.adherenceResource = new AdherenceResource(this);
        this.reportsResource = new ReportsResource(this);
        this.webhooksResource = new WebhooksResource(this);
    }
    
    /**
     * Get Patients API resource
     */
    public PatientsResource patients() {
        return patientsResource;
    }
    
    /**
     * Get Medications API resource
     */
    public MedicationsResource medications() {
        return medicationsResource;
    }
    
    /**
     * Get Adherence API resource
     */
    public AdherenceResource adherence() {
        return adherenceResource;
    }
    
    /**
     * Get Reports API resource
     */
    public ReportsResource reports() {
        return reportsResource;
    }
    
    /**
     * Get Webhooks API resource
     */
    public WebhooksResource webhooks() {
        return webhooksResource;
    }
    
    /**
     * Make HTTP request
     */
    <T> T request(String method, String path, Object body, Map<String, String> queryParams, Class<T> responseClass) throws IOException {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + path).newBuilder();
        
        if (queryParams != null) {
            for (Map.Entry<String, String> entry : queryParams.entrySet()) {
                if (entry.getValue() != null) {
                    urlBuilder.addQueryParameter(entry.getKey(), entry.getValue());
                }
            }
        }
        
        Request.Builder requestBuilder = new Request.Builder()
            .url(urlBuilder.build());
        
        if ("GET".equals(method)) {
            requestBuilder.get();
        } else if ("POST".equals(method)) {
            String json = body != null ? gson.toJson(body) : "{}";
            requestBuilder.post(RequestBody.create(json, JSON));
        } else if ("PATCH".equals(method)) {
            String json = body != null ? gson.toJson(body) : "{}";
            requestBuilder.patch(RequestBody.create(json, JSON));
        } else if ("DELETE".equals(method)) {
            requestBuilder.delete();
        }
        
        try (Response response = httpClient.newCall(requestBuilder.build()).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                throw new MedicamentaException("API Error: " + response.code() + " - " + errorBody);
            }
            
            String responseBody = response.body().string();
            return gson.fromJson(responseBody, responseClass);
        }
    }
    
    /**
     * Builder for MedicamentaClient
     */
    public static class Builder {
        private String apiKey;
        private String accessToken;
        private String baseUrl;
        private int timeout = 30;
        
        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }
        
        public Builder accessToken(String accessToken) {
            this.accessToken = accessToken;
            return this;
        }
        
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }
        
        public Builder timeout(int seconds) {
            this.timeout = seconds;
            return this;
        }
        
        public MedicamentaClient build() {
            if (apiKey == null && accessToken == null) {
                throw new IllegalArgumentException("Either apiKey or accessToken must be provided");
            }
            return new MedicamentaClient(this);
        }
    }
    
    /**
     * Custom exception for API errors
     */
    public static class MedicamentaException extends RuntimeException {
        public MedicamentaException(String message) {
            super(message);
        }
        
        public MedicamentaException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    
    // ========== Models ==========
    
    public static class Patient {
        public String id;
        public String name;
        public String email;
        public String phone;
        public String dateOfBirth;
        public String gender;
        public List<String> medicalConditions;
        public List<String> allergies;
        public String status;
        public String createdAt;
        public String updatedAt;
    }
    
    public static class Medication {
        public String id;
        public String patientId;
        public String name;
        public String dosage;
        public String frequency;
        public List<String> times;
        public String instructions;
        public Double adherenceRate;
        public String status;
    }
    
    public static class AdherenceMetrics {
        public String patientId;
        public Metrics metrics;
        public List<MedicationAdherence> byMedication;
        
        public static class Metrics {
            public int totalDoses;
            public int takenDoses;
            public int missedDoses;
            public int skippedDoses;
            public int pendingDoses;
            public double adherenceRate;
        }
        
        public static class MedicationAdherence {
            public String medicationId;
            public String medicationName;
            public double adherenceRate;
        }
    }
    
    public static class Webhook {
        public String id;
        public String url;
        public List<String> events;
        public String status;
        public String secret;
    }
    
    public static class ListResponse<T> {
        public List<T> data;
        public Pagination pagination;
        
        public static class Pagination {
            public int total;
            public int limit;
            public int offset;
        }
    }
    
    // ========== Resource Classes ==========
    
    /**
     * Patients API resource
     */
    public static class PatientsResource {
        private final MedicamentaClient client;
        
        PatientsResource(MedicamentaClient client) {
            this.client = client;
        }
        
        public Patient create(CreatePatientRequest request) throws IOException {
            return client.request("POST", "/v1/patients", request, null, Patient.class);
        }
        
        public ListResponse<Patient> list(ListPatientsRequest request) throws IOException {
            Map<String, String> params = new HashMap<>();
            if (request != null) {
                if (request.limit != null) params.put("limit", request.limit.toString());
                if (request.offset != null) params.put("offset", request.offset.toString());
                if (request.status != null) params.put("status", request.status);
                if (request.search != null) params.put("search", request.search);
            }
            return (ListResponse<Patient>) client.request("GET", "/v1/patients", null, params, ListResponse.class);
        }
        
        public Patient get(String patientId) throws IOException {
            return client.request("GET", "/v1/patients/" + patientId, null, null, Patient.class);
        }
        
        public Patient update(String patientId, UpdatePatientRequest request) throws IOException {
            return client.request("PATCH", "/v1/patients/" + patientId, request, null, Patient.class);
        }
        
        public void delete(String patientId, boolean hard) throws IOException {
            Map<String, String> params = new HashMap<>();
            params.put("hard", String.valueOf(hard));
            client.request("DELETE", "/v1/patients/" + patientId, null, params, Void.class);
        }
    }
    
    public static class CreatePatientRequest {
        public String name;
        public String email;
        public String phone;
        public String dateOfBirth;
        public String gender;
        public List<String> medicalConditions;
        public List<String> allergies;
        
        public CreatePatientRequest name(String name) {
            this.name = name;
            return this;
        }
        
        public CreatePatientRequest email(String email) {
            this.email = email;
            return this;
        }
        
        public CreatePatientRequest dateOfBirth(String dateOfBirth) {
            this.dateOfBirth = dateOfBirth;
            return this;
        }
    }
    
    public static class ListPatientsRequest {
        public Integer limit;
        public Integer offset;
        public String status;
        public String search;
        
        public ListPatientsRequest limit(int limit) {
            this.limit = limit;
            return this;
        }
        
        public ListPatientsRequest status(String status) {
            this.status = status;
            return this;
        }
    }
    
    public static class UpdatePatientRequest {
        public String name;
        public String email;
        public String phone;
        public String gender;
        
        public UpdatePatientRequest phone(String phone) {
            this.phone = phone;
            return this;
        }
    }
    
    /**
     * Medications API resource
     */
    public static class MedicationsResource {
        private final MedicamentaClient client;
        
        MedicationsResource(MedicamentaClient client) {
            this.client = client;
        }
        
        public Medication create(CreateMedicationRequest request) throws IOException {
            return client.request("POST", "/v1/medications", request, null, Medication.class);
        }
        
        public ListResponse<Medication> list(ListMedicationsRequest request) throws IOException {
            Map<String, String> params = new HashMap<>();
            if (request != null) {
                if (request.patientId != null) params.put("patientId", request.patientId);
                if (request.status != null) params.put("status", request.status);
                if (request.limit != null) params.put("limit", request.limit.toString());
                if (request.offset != null) params.put("offset", request.offset.toString());
            }
            return (ListResponse<Medication>) client.request("GET", "/v1/medications", null, params, ListResponse.class);
        }
        
        public Medication get(String medicationId) throws IOException {
            return client.request("GET", "/v1/medications/" + medicationId, null, null, Medication.class);
        }
        
        public void delete(String medicationId) throws IOException {
            client.request("DELETE", "/v1/medications/" + medicationId, null, null, Void.class);
        }
    }
    
    public static class CreateMedicationRequest {
        public String patientId;
        public String name;
        public String dosage;
        public String frequency;
        public List<String> times;
        public String instructions;
        
        public CreateMedicationRequest patientId(String patientId) {
            this.patientId = patientId;
            return this;
        }
        
        public CreateMedicationRequest name(String name) {
            this.name = name;
            return this;
        }
        
        public CreateMedicationRequest dosage(String dosage) {
            this.dosage = dosage;
            return this;
        }
    }
    
    public static class ListMedicationsRequest {
        public String patientId;
        public String status;
        public Integer limit;
        public Integer offset;
    }
    
    /**
     * Adherence API resource
     */
    public static class AdherenceResource {
        private final MedicamentaClient client;
        
        AdherenceResource(MedicamentaClient client) {
            this.client = client;
        }
        
        public AdherenceMetrics get(String patientId, GetAdherenceRequest request) throws IOException {
            Map<String, String> params = new HashMap<>();
            if (request != null) {
                if (request.startDate != null) params.put("startDate", request.startDate);
                if (request.endDate != null) params.put("endDate", request.endDate);
                if (request.medicationId != null) params.put("medicationId", request.medicationId);
            }
            return client.request("GET", "/v1/adherence/" + patientId, null, params, AdherenceMetrics.class);
        }
    }
    
    public static class GetAdherenceRequest {
        public String startDate;
        public String endDate;
        public String medicationId;
    }
    
    /**
     * Reports API resource
     */
    public static class ReportsResource {
        private final MedicamentaClient client;
        
        ReportsResource(MedicamentaClient client) {
            this.client = client;
        }
        
        public Map<String, Object> adherence(AdherenceReportRequest request) throws IOException {
            Map<String, String> params = new HashMap<>();
            if (request != null) {
                if (request.startDate != null) params.put("startDate", request.startDate);
                if (request.endDate != null) params.put("endDate", request.endDate);
            }
            return (Map<String, Object>) client.request("GET", "/v1/reports/adherence", null, params, Map.class);
        }
    }
    
    public static class AdherenceReportRequest {
        public String startDate;
        public String endDate;
    }
    
    /**
     * Webhooks API resource
     */
    public static class WebhooksResource {
        private final MedicamentaClient client;
        
        WebhooksResource(MedicamentaClient client) {
            this.client = client;
        }
        
        public Webhook create(CreateWebhookRequest request) throws IOException {
            return client.request("POST", "/v1/webhooks", request, null, Webhook.class);
        }
        
        public ListResponse<Webhook> list() throws IOException {
            return (ListResponse<Webhook>) client.request("GET", "/v1/webhooks", null, null, ListResponse.class);
        }
        
        public void delete(String webhookId) throws IOException {
            client.request("DELETE", "/v1/webhooks/" + webhookId, null, null, Void.class);
        }
    }
    
    public static class CreateWebhookRequest {
        public String url;
        public List<String> events;
        public String secret;
        
        public CreateWebhookRequest url(String url) {
            this.url = url;
            return this;
        }
        
        public CreateWebhookRequest events(List<String> events) {
            this.events = events;
            return this;
        }
    }
}
