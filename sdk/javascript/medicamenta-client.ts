/**
 * 🔵 Medicamenta.me JavaScript/TypeScript SDK
 * 
 * Official SDK for the Medicamenta.me Public API
 * 
 * @example
 * ```typescript
 * import { MedicamentaClient } from '@medicamenta/api-client';
 * 
 * const client = new MedicamentaClient({
 *   apiKey: 'YOUR_API_KEY'
 * });
 * 
 * const patient = await client.patients.create({
 *   name: 'João Silva',
 *   dateOfBirth: '1980-05-15'
 * });
 * ```
 */

export interface ClientConfig {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender?: 'M' | 'F' | 'Other';
  medicalConditions?: string[];
  allergies?: string[];
  status: 'active' | 'inactive' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'custom';
  times: string[];
  instructions?: string;
  adherenceRate: number;
  status: 'active' | 'completed' | 'deleted';
}

export interface AdherenceMetrics {
  patientId: string;
  metrics: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    skippedDoses: number;
    pendingDoses: number;
    adherenceRate: number;
  };
  byMedication?: Array<{
    medicationId: string;
    medicationName: string;
    adherenceRate: number;
  }>;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'suspended';
  secret: string;
}

export class MedicamentaClient {
  private config: Required<ClientConfig>;

  constructor(config: ClientConfig) {
    this.config = {
      apiKey: config.apiKey || '',
      accessToken: config.accessToken || '',
      baseUrl: config.baseUrl || 'https://us-central1-medicamenta-app.cloudfunctions.net/api',
      timeout: config.timeout || 30000,
    };

    if (!this.config.apiKey && !this.config.accessToken) {
      throw new Error('Either apiKey or accessToken must be provided');
    }
  }

  /**
   * Make authenticated HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    queryParams?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`);

    // Add query parameters
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    } else if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Patients API
   */
  get patients() {
    return {
      /**
       * Create a new patient
       */
      create: async (data: Omit<Patient, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
        return this.request<Patient>('POST', '/v1/patients', data);
      },

      /**
       * List patients
       */
      list: async (params?: {
        limit?: number;
        offset?: number;
        status?: 'active' | 'inactive' | 'deleted';
        search?: string;
      }): Promise<{ data: Patient[]; pagination: any }> => {
        return this.request('GET', '/v1/patients', undefined, params);
      },

      /**
       * Get patient by ID
       */
      get: async (id: string): Promise<Patient> => {
        return this.request<Patient>('GET', `/v1/patients/${id}`);
      },

      /**
       * Update patient
       */
      update: async (id: string, data: Partial<Omit<Patient, 'id'>>): Promise<Patient> => {
        return this.request<Patient>('PATCH', `/v1/patients/${id}`, data);
      },

      /**
       * Delete patient
       */
      delete: async (id: string, hard = false): Promise<void> => {
        await this.request('DELETE', `/v1/patients/${id}`, undefined, { hard });
      },
    };
  }

  /**
   * Medications API
   */
  get medications() {
    return {
      /**
       * Create medication
       */
      create: async (data: Omit<Medication, 'id' | 'adherenceRate' | 'status'>): Promise<Medication> => {
        return this.request<Medication>('POST', '/v1/medications', data);
      },

      /**
       * List medications
       */
      list: async (params?: {
        patientId?: string;
        status?: string;
        limit?: number;
        offset?: number;
      }): Promise<{ data: Medication[] }> => {
        return this.request('GET', '/v1/medications', undefined, params);
      },

      /**
       * Get medication by ID
       */
      get: async (id: string): Promise<Medication> => {
        return this.request<Medication>('GET', `/v1/medications/${id}`);
      },

      /**
       * Update medication
       */
      update: async (id: string, data: Partial<Medication>): Promise<Medication> => {
        return this.request<Medication>('PATCH', `/v1/medications/${id}`, data);
      },

      /**
       * Delete medication
       */
      delete: async (id: string): Promise<void> => {
        await this.request('DELETE', `/v1/medications/${id}`);
      },
    };
  }

  /**
   * Adherence API
   */
  get adherence() {
    return {
      /**
       * Get adherence metrics
       */
      get: async (
        patientId: string,
        params?: {
          startDate?: string;
          endDate?: string;
          medicationId?: string;
        }
      ): Promise<AdherenceMetrics> => {
        return this.request<AdherenceMetrics>(
          'GET',
          `/v1/adherence/${patientId}`,
          undefined,
          params
        );
      },

      /**
       * Get dose history
       */
      history: async (
        patientId: string,
        params?: {
          limit?: number;
          offset?: number;
          status?: string;
          medicationId?: string;
        }
      ): Promise<{ data: any[] }> => {
        return this.request(
          'GET',
          `/v1/adherence/${patientId}/history`,
          undefined,
          params
        );
      },

      /**
       * Confirm dose taken
       */
      confirm: async (data: {
        patientId: string;
        medicationId: string;
        scheduledTime: string | Date;
        takenAt?: string | Date;
        notes?: string;
      }): Promise<any> => {
        const payload = {
          ...data,
          scheduledTime: data.scheduledTime instanceof Date
            ? data.scheduledTime.toISOString()
            : data.scheduledTime,
          takenAt: data.takenAt
            ? data.takenAt instanceof Date
              ? data.takenAt.toISOString()
              : data.takenAt
            : undefined,
        };
        return this.request('POST', '/v1/adherence/confirm', payload);
      },
    };
  }

  /**
   * Reports API
   */
  get reports() {
    return {
      /**
       * Get adherence report
       */
      adherence: async (params?: {
        startDate?: string;
        endDate?: string;
        patientId?: string;
      }): Promise<any> => {
        return this.request('GET', '/v1/reports/adherence', undefined, params);
      },

      /**
       * Get compliance report
       */
      compliance: async (): Promise<any> => {
        return this.request('GET', '/v1/reports/compliance');
      },

      /**
       * Export report
       */
      export: async (params: {
        reportType: 'adherence' | 'compliance';
        format?: 'json' | 'csv';
      }): Promise<any> => {
        return this.request('POST', '/v1/reports/export', params);
      },
    };
  }

  /**
   * Webhooks API
   */
  get webhooks() {
    return {
      /**
       * Create webhook
       */
      create: async (data: {
        url: string;
        events: string[];
        secret?: string;
      }): Promise<Webhook> => {
        return this.request<Webhook>('POST', '/v1/webhooks', data);
      },

      /**
       * List webhooks
       */
      list: async (): Promise<{ data: Webhook[] }> => {
        return this.request('GET', '/v1/webhooks');
      },

      /**
       * Get webhook by ID
       */
      get: async (id: string): Promise<Webhook> => {
        return this.request<Webhook>('GET', `/v1/webhooks/${id}`);
      },

      /**
       * Delete webhook
       */
      delete: async (id: string): Promise<void> => {
        await this.request('DELETE', `/v1/webhooks/${id}`);
      },

      /**
       * Test webhook
       */
      test: async (id: string): Promise<{ success: boolean; statusCode?: number }> => {
        return this.request('POST', `/v1/webhooks/${id}/test`);
      },
    };
  }
}

/**
 * Helper: Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const [timestamp, hash] = signature.split(',').map(s => s.split('=')[1]);
  
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return hash === expectedHash;
}
