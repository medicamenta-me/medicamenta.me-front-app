/**
 * Enterprise Models
 * Modelos para Modo Profissional B2B
 * 
 * Suporta:
 * - Organizações (clínicas, hospitais, casas de repouso)
 * - Equipes e hierarquia
 * - Permissões granulares
 * - Auditoria completa
 * - Compliance regulatório
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */

/**
 * Tipo de organização
 */
export type OrganizationType = 
  | 'clinic'          // Clínica
  | 'hospital'        // Hospital
  | 'nursing-home'    // Casa de repouso
  | 'home-care'       // Cuidados domiciliares
  | 'pharmacy'        // Farmácia
  | 'other';          // Outros

/**
 * Status da organização
 */
export type OrganizationStatus = 
  | 'trial'           // Período de trial (30 dias)
  | 'active'          // Ativa e paga
  | 'suspended'       // Suspensa (não pagamento)
  | 'cancelled';      // Cancelada

/**
 * Plano de assinatura
 */
export type SubscriptionPlan = 
  | 'trial'           // Trial gratuito (30 dias, até 10 pacientes)
  | 'starter'         // Starter (50 pacientes, R$ 1.500/mês)
  | 'professional'    // Professional (200 pacientes, R$ 5.000/mês)
  | 'enterprise';     // Enterprise (ilimitado, custom pricing)

/**
 * Organização (Clínica, Hospital, Casa de Repouso)
 */
export interface Organization {
  id: string;
  
  // Informações básicas
  name: string;
  displayName: string;
  type: OrganizationType;
  cnpj?: string; // Brasil
  ein?: string;  // USA
  
  // Endereço
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Contato
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  
  // Assinatura
  subscription: {
    plan: SubscriptionPlan;
    status: OrganizationStatus;
    startDate: Date;
    endDate?: Date;
    billingEmail: string;
    maxPatients: number;      // Limite de pacientes
    currentPatients: number;  // Pacientes ativos
    maxTeamMembers: number;   // Limite de membros da equipe
    currentTeamMembers: number;
  };
  
  // Features habilitadas
  features: {
    multiPatientDashboard: boolean;
    teamManagement: boolean;
    complianceReports: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    sso: boolean; // Single Sign-On
    hipaaCompliance: boolean;
    customReports: boolean;
    prioritySupport: boolean;
  };
  
  // White-label
  branding?: {
    logo?: string; // URL ou base64
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
    favicon?: string;
  };
  
  // Administradores
  adminIds: string[]; // User IDs dos administradores
  
  // Metadados
  createdAt: Date;
  createdBy: string; // User ID
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Role (Papel/Função) na organização
 */
export type TeamRole = 
  | 'admin'           // Administrador total
  | 'manager'         // Gerente (pode gerenciar equipe)
  | 'nurse'           // Enfermeiro
  | 'caregiver'       // Cuidador
  | 'doctor'          // Médico (read-only, relatórios)
  | 'pharmacist'      // Farmacêutico
  | 'viewer';         // Visualizador (read-only)

/**
 * Permissões granulares
 */
export interface Permissions {
  // Pacientes
  canViewPatients: boolean;
  canAddPatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  
  // Medicações
  canViewMedications: boolean;
  canAddMedications: boolean;
  canEditMedications: boolean;
  canDeleteMedications: boolean;
  canRegisterDoses: boolean;
  
  // Equipe
  canViewTeam: boolean;
  canManageTeam: boolean;
  canAssignRoles: boolean;
  
  // Relatórios
  canViewReports: boolean;
  canGenerateReports: boolean;
  canExportData: boolean;
  
  // Compliance
  canViewCompliance: boolean;
  canGenerateComplianceReports: boolean;
  canViewAuditLogs: boolean;
  
  // Configurações
  canManageOrganization: boolean;
  canManageBilling: boolean;
  canManageIntegrations: boolean;
}

/**
 * Permissões padrão por role
 */
export const DEFAULT_PERMISSIONS: Record<TeamRole, Permissions> = {
  admin: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: true,
    canViewMedications: true,
    canAddMedications: true,
    canEditMedications: true,
    canDeleteMedications: true,
    canRegisterDoses: true,
    canViewTeam: true,
    canManageTeam: true,
    canAssignRoles: true,
    canViewReports: true,
    canGenerateReports: true,
    canExportData: true,
    canViewCompliance: true,
    canGenerateComplianceReports: true,
    canViewAuditLogs: true,
    canManageOrganization: true,
    canManageBilling: true,
    canManageIntegrations: true,
  },
  manager: {
    canViewPatients: true,
    canAddPatients: true,
    canEditPatients: true,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: true,
    canEditMedications: true,
    canDeleteMedications: false,
    canRegisterDoses: true,
    canViewTeam: true,
    canManageTeam: true,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: true,
    canExportData: true,
    canViewCompliance: true,
    canGenerateComplianceReports: false,
    canViewAuditLogs: true,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
  nurse: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: true,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: false,
    canEditMedications: false,
    canDeleteMedications: false,
    canRegisterDoses: true,
    canViewTeam: true,
    canManageTeam: false,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: false,
    canExportData: false,
    canViewCompliance: false,
    canGenerateComplianceReports: false,
    canViewAuditLogs: false,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
  caregiver: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: false,
    canEditMedications: false,
    canDeleteMedications: false,
    canRegisterDoses: true,
    canViewTeam: false,
    canManageTeam: false,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: false,
    canExportData: false,
    canViewCompliance: false,
    canGenerateComplianceReports: false,
    canViewAuditLogs: false,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
  doctor: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: false,
    canEditMedications: false,
    canDeleteMedications: false,
    canRegisterDoses: false,
    canViewTeam: false,
    canManageTeam: false,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: true,
    canExportData: true,
    canViewCompliance: true,
    canGenerateComplianceReports: false,
    canViewAuditLogs: false,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
  pharmacist: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: true,
    canEditMedications: true,
    canDeleteMedications: false,
    canRegisterDoses: false,
    canViewTeam: false,
    canManageTeam: false,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: false,
    canExportData: false,
    canViewCompliance: false,
    canGenerateComplianceReports: false,
    canViewAuditLogs: false,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
  viewer: {
    canViewPatients: true,
    canAddPatients: false,
    canEditPatients: false,
    canDeletePatients: false,
    canViewMedications: true,
    canAddMedications: false,
    canEditMedications: false,
    canDeleteMedications: false,
    canRegisterDoses: false,
    canViewTeam: false,
    canManageTeam: false,
    canAssignRoles: false,
    canViewReports: true,
    canGenerateReports: false,
    canExportData: false,
    canViewCompliance: false,
    canGenerateComplianceReports: false,
    canViewAuditLogs: false,
    canManageOrganization: false,
    canManageBilling: false,
    canManageIntegrations: false,
  },
};

/**
 * Membro da equipe
 */
export interface TeamMember {
  id: string;
  organizationId: string;
  userId: string; // Referência ao User
  
  // Informações do membro
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  
  // Role e permissões
  role: TeamRole;
  permissions: Permissions;
  customPermissions?: Partial<Permissions>; // Override de permissões específicas
  
  // Atribuições
  assignedPatientIds: string[]; // Pacientes atribuídos a este membro
  department?: string; // Departamento (Enfermaria, UTI, etc)
  shift?: 'morning' | 'afternoon' | 'night' | 'rotating'; // Turno
  
  // Credenciais profissionais
  professionalId?: string; // CRM, COREN, etc
  license?: {
    number: string;
    type: string; // CRM, COREN, CRF, etc
    state: string;
    expiresAt?: Date;
  };
  
  // Status
  isActive: boolean;
  invitedAt: Date;
  joinedAt?: Date;
  invitedBy: string; // User ID
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt?: Date;
}

/**
 * Relatório de Compliance
 */
export interface ComplianceReport {
  id: string;
  organizationId: string;
  
  // Período
  startDate: Date;
  endDate: Date;
  
  // Métricas de adesão
  adherence: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    lateRegister: number;
    adherenceRate: number; // 0-100%
    
    // Por paciente
    byPatient: {
      patientId: string;
      patientName: string;
      adherenceRate: number;
      totalDoses: number;
      takenDoses: number;
      missedDoses: number;
    }[];
    
    // Por medicação
    byMedication: {
      medicationName: string;
      adherenceRate: number;
      totalDoses: number;
      takenDoses: number;
    }[];
  };
  
  // Erros de medicação
  medicationErrors: {
    total: number;
    wrongDose: number;
    wrongMedication: number;
    wrongPatient: number;
    wrongTime: number;
    incidents: {
      id: string;
      type: string;
      patientId: string;
      medicationId: string;
      timestamp: Date;
      reportedBy: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      resolved: boolean;
    }[];
  };
  
  // Estoque
  stockManagement: {
    lowStockAlerts: number;
    expiredMedications: number;
    stockValue: number; // Valor total em estoque
    topMedications: {
      name: string;
      quantity: number;
      value: number;
    }[];
  };
  
  // Equipe
  teamPerformance: {
    totalMembers: number;
    activeMembers: number;
    dosesRegisteredByMember: {
      memberId: string;
      memberName: string;
      dosesRegistered: number;
    }[];
  };
  
  // Auditoria
  auditSummary: {
    totalActions: number;
    actionsByType: Record<string, number>;
    flaggedActions: number;
  };
  
  // Compliance regulatório
  regulatoryCompliance: {
    hipaaCompliant: boolean;
    lgpdCompliant: boolean;
    documentsGenerated: number;
    auditTrailComplete: boolean;
  };
  
  // Metadados
  generatedBy: string; // User ID
  generatedAt: Date;
  format: 'pdf' | 'excel' | 'json';
  fileUrl?: string;
}

/**
 * Tipo de ação de auditoria
 */
export type AuditActionType = 
  // Pacientes
  | 'patient.create'
  | 'patient.update'
  | 'patient.delete'
  | 'patient.view'
  // Medicações
  | 'medication.create'
  | 'medication.update'
  | 'medication.delete'
  | 'medication.view'
  // Doses
  | 'dose.register'
  | 'dose.update'
  | 'dose.delete'
  // Equipe
  | 'team.invite'
  | 'team.remove'
  | 'team.update-role'
  | 'team.update-permissions'
  // Organização
  | 'organization.update'
  | 'organization.settings'
  // Relatórios
  | 'report.generate'
  | 'report.export'
  // Login
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed-login'
  // API
  | 'api.access'
  | 'api.error'
  | 'api.create-key'
  | 'api.revoke-key';

/**
 * Log de auditoria
 */
export interface AuditLog {
  id: string;
  organizationId: string;
  
  // Ação
  action: AuditActionType;
  description: string;
  
  // Quem
  userId: string;
  userName: string;
  userRole: TeamRole;
  
  // O quê
  resourceType: 'patient' | 'medication' | 'dose' | 'team' | 'organization' | 'report' | 'api';
  resourceId?: string;
  resourceName?: string;
  
  // Dados
  changes?: {
    before?: any;
    after?: any;
  };
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  location?: {
    city?: string;
    country?: string;
  };
  
  // Flags
  isSuspicious: boolean;
  isError: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Timestamp
  timestamp: Date;
}

/**
 * Configuração de API para integração hospitalar
 */
export interface ApiConfiguration {
  id: string;
  organizationId: string;
  name: string; // Nome descritivo da API key
  
  // API Key
  apiKey: string;
  apiSecret: string;
  
  // Permissões da API
  permissions: {
    canReadPatients: boolean;
    canWritePatients: boolean;
    canReadMedications: boolean;
    canWriteMedications: boolean;
    canReadLogs: boolean;
    canWriteLogs: boolean;
    canReadReports: boolean;
  };
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  
  // Webhooks
  webhooks?: {
    url: string;
    events: string[]; // 'dose.missed', 'medication.low-stock', etc
    secret: string;
  }[];
  
  // IP whitelist
  ipWhitelist?: string[];
  
  // Status
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date; // Data de expiração da API key
  
  // Metadata
  createdAt: Date;
  createdBy?: string;
}

/**
 * Estatísticas do dashboard multi-paciente
 */
export interface MultiPatientStats {
  organizationId: string;
  
  // Contadores gerais
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  
  // Medicações
  totalMedications: number;
  activeMedications: number;
  criticalStockAlerts: number;
  
  // Adesão hoje
  todayStats: {
    scheduledDoses: number;
    takenDoses: number;
    missedDoses: number;
    pendingDoses: number;
    adherenceRate: number;
  };
  
  // Adesão geral (últimos 30 dias)
  overallAdherence: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    adherenceRate: number;
  };
  
  // Top alertas
  topAlerts: {
    type: 'missed-dose' | 'low-stock' | 'expired' | 'critical-patient';
    patientId: string;
    patientName: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }[];
  
  // Performance da equipe
  teamStats: {
    totalMembers: number;
    activeMembers: number;
    dosesRegisteredToday: number;
  };
  
  calculatedAt: Date;
}

/**
 * Filtros para dashboard multi-paciente
 */
export interface MultiPatientFilters {
  // Busca textual
  search?: string;
  
  // Filtros
  department?: string;
  assignedTo?: string; // Team member ID
  adherenceLevel?: 'excellent' | 'good' | 'moderate' | 'poor';
  hasAlerts?: boolean;
  hasLowStock?: boolean;
  
  // Paginação
  page: number;
  pageSize: number;
  
  // Ordenação
  sortBy: 'name' | 'adherence' | 'alerts' | 'lastUpdate';
  sortOrder: 'asc' | 'desc';
}

/**
 * Item do dashboard multi-paciente
 */
export interface MultiPatientDashboardItem {
  // Paciente
  patientId: string;
  patientName: string;
  patientAge: number;
  patientAvatar?: string;
  department?: string;
  
  // Assigned to
  assignedTo: {
    memberId: string;
    memberName: string;
    memberRole: TeamRole;
  }[];
  
  // Adesão
  adherence: {
    rate: number; // 0-100%
    level: 'excellent' | 'good' | 'moderate' | 'poor';
    streak: number; // Dias consecutivos sem falhar
  };
  
  // Doses hoje
  todayDoses: {
    total: number;
    taken: number;
    missed: number;
    pending: number;
    next?: {
      time: string;
      medicationName: string;
      minutesUntil: number;
    };
  };
  
  // Alertas
  alerts: {
    count: number;
    highestSeverity: 'low' | 'medium' | 'high' | 'critical';
    types: string[];
  };
  
  // Medicações
  medications: {
    total: number;
    critical: number; // Baixo estoque ou vencidas
  };
  
  // Última atualização
  lastUpdate: Date;
  lastUpdateBy: string;
}
