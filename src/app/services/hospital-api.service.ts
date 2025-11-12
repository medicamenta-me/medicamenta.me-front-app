import { Injectable, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EnterpriseService } from './enterprise.service';
import { ApiConfiguration } from '../models/enterprise.model';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Hospital API Service
 * 
 * Gerenciamento de APIs para integração hospitalar
 * - Geração de API keys
 * - Revogação de API keys
 * - Configuração de webhooks
 * - Rate limiting
 * - HL7/FHIR mapping (futuro)
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */
@Injectable({
  providedIn: 'root'
})
export class HospitalApiService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly enterpriseService = inject(EnterpriseService);

  /**
   * Gera nova API key
   */
  async generateApiKey(config: {
    name: string;
    permissions: ApiConfiguration['permissions'];
    rateLimit?: ApiConfiguration['rateLimit'];
    webhooks?: ApiConfiguration['webhooks'];
  }): Promise<ApiConfiguration> {
    const org = this.enterpriseService.currentOrganization();
    if (!org) throw new Error('No organization');
    if (!this.enterpriseService.hasFeature('apiAccess')) {
      throw new Error('API access not available in current plan');
    }

    const db = this.firebaseService.firestore;
    const configId = `api_${Date.now()}`;
    
    // Gerar API key e secret
    const apiKey = `medic_live_${this.generateRandomString(32)}`;
    const apiSecret = this.generateRandomString(64);

    const apiConfig: ApiConfiguration = {
      id: configId,
      organizationId: org.id,
      name: config.name,
      apiKey,
      apiSecret,
      permissions: config.permissions,
      rateLimit: config.rateLimit || {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      webhooks: config.webhooks,
      ipWhitelist: [],
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
    };

    await setDoc(doc(db, `api-configurations/${configId}`), {
      ...apiConfig,
      createdAt: Timestamp.fromDate(apiConfig.createdAt),
      expiresAt: Timestamp.fromDate(apiConfig.expiresAt!)
    });

    await this.enterpriseService.logAudit({
      organizationId: org.id,
      action: 'api.create-key',
      description: `API key created: ${config.name}`,
      resourceType: 'api',
      resourceId: configId,
      severity: 'warning'
    });

    return apiConfig;
  }

  /**
   * Revoga API key
   */
  async revokeApiKey(configId: string): Promise<void> {
    const org = this.enterpriseService.currentOrganization();
    if (!org) throw new Error('No organization');

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `api-configurations/${configId}`), {
      isActive: false,
      revokedAt: Timestamp.now()
    });

    await this.enterpriseService.logAudit({
      organizationId: org.id,
      action: 'api.revoke-key',
      description: 'API key revoked',
      resourceType: 'api',
      resourceId: configId,
      severity: 'warning'
    });
  }

  /**
   * Gera string aleatória
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Valida API key (para uso interno ou backend)
   */
  validateApiKey(apiKey: string): boolean {
    // TODO: Implementar validação real buscando no Firestore
    // Por segurança, essa validação deve ser feita no backend (Cloud Functions)
    return apiKey.startsWith('medic_live_');
  }

  /**
   * Mapeia Patient para FHIR (futuro)
   */
  mapPatientToFHIR(patient: any): any {
    // TODO: Implementar mapeamento completo FHIR R4
    return {
      resourceType: 'Patient',
      id: patient.id,
      name: [{ text: patient.name }],
      birthDate: patient.birthDate,
      gender: patient.gender
    };
  }

  /**
   * Mapeia Medication para FHIR (futuro)
   */
  mapMedicationToFHIR(medication: any): any {
    // TODO: Implementar mapeamento completo FHIR R4
    return {
      resourceType: 'MedicationRequest',
      id: medication.id,
      status: medication.isActive ? 'active' : 'completed',
      intent: 'order',
      medicationCodeableConcept: {
        text: medication.name
      }
    };
  }
}

