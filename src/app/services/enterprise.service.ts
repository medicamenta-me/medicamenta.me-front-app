import { Injectable, inject, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';
import {
  Organization,
  OrganizationType,
  OrganizationStatus,
  SubscriptionPlan,
  TeamMember,
  TeamRole,
  Permissions,
  DEFAULT_PERMISSIONS,
  ComplianceReport,
  AuditLog,
  AuditActionType,
  ApiConfiguration,
  MultiPatientStats,
  MultiPatientFilters,
  MultiPatientDashboardItem
} from '../models/enterprise.model';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

/**
 * EnterpriseService
 * 
 * Gerenciamento completo de funcionalidades B2B Enterprise:
 * - Organizações (clínicas, hospitais, casas de repouso)
 * - Equipes e permissões granulares
 * - Dashboard multi-paciente (100+)
 * - Relatórios de compliance
 * - Auditoria completa
 * - API para integração hospitalar
 * - White-label
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */
@Injectable({
  providedIn: 'root'
})
export class EnterpriseService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly userService = inject(UserService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);

  // Estado
  private readonly _currentOrganization = signal<Organization | null>(null);
  private readonly _teamMembers = signal<TeamMember[]>([]);
  private readonly _myPermissions = signal<Permissions | null>(null);
  private readonly _multiPatientStats = signal<MultiPatientStats | null>(null);

  // Sinais públicos
  public readonly currentOrganization = this._currentOrganization.asReadonly();
  public readonly teamMembers = this._teamMembers.asReadonly();
  public readonly myPermissions = this._myPermissions.asReadonly();
  public readonly multiPatientStats = this._multiPatientStats.asReadonly();

  // Computed
  public readonly isEnterprise = computed(() => this._currentOrganization() !== null);
  public readonly isAdmin = computed(() => {
    const org = this._currentOrganization();
    const user = this.userService.currentUser();
    return org && user && org.adminIds.includes(user.id);
  });
  public readonly canManageTeam = computed(() => {
    const perms = this._myPermissions();
    return perms?.canManageTeam || false;
  });

  constructor() {
    this.logService.debug('EnterpriseService', 'Service initialized');
    this.loadCurrentOrganization();
  }

  // ============================================================================
  // ORGANIZATION MANAGEMENT
  // ============================================================================

  /**
   * Cria uma nova organização
   */
  async createOrganization(data: {
    name: string;
    displayName: string;
    type: OrganizationType;
    cnpj?: string;
    address: Organization['address'];
    contact: Organization['contact'];
    plan: SubscriptionPlan;
  }): Promise<Organization> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) throw new Error('User not authenticated');

    const db = this.firebaseService.firestore;
    const orgId = doc(collection(db, 'organizations')).id;

    // Determinar limites baseado no plano
    const limits = this.getPlanLimits(data.plan);

    const organization: Organization = {
      id: orgId,
      name: data.name,
      displayName: data.displayName,
      type: data.type,
      cnpj: data.cnpj,
      address: data.address,
      contact: data.contact,
      subscription: {
        plan: data.plan,
        status: data.plan === 'trial' ? 'trial' : 'active',
        startDate: new Date(),
        endDate: data.plan === 'trial' ? this.addDays(new Date(), 30) : undefined,
        billingEmail: data.contact.email,
        maxPatients: limits.maxPatients,
        currentPatients: 0,
        maxTeamMembers: limits.maxTeamMembers,
        currentTeamMembers: 1, // O criador
      },
      features: limits.features,
      adminIds: [userId],
      createdAt: new Date(),
      createdBy: userId,
      updatedAt: new Date(),
      isActive: true,
    };

    // Salvar no Firestore
    await setDoc(doc(db, `organizations/${orgId}`), {
      ...organization,
      createdAt: Timestamp.fromDate(organization.createdAt),
      updatedAt: serverTimestamp(),
    });

    // Adicionar usuário como admin da equipe
    await this.addTeamMember({
      organizationId: orgId,
      userId,
      role: 'admin',
      assignedPatientIds: [],
    });

    // Log de auditoria
    await this.logAudit({
      organizationId: orgId,
      action: 'organization.update',
      description: 'Organization created',
      resourceType: 'organization',
      resourceId: orgId,
      severity: 'info',
    });

    this._currentOrganization.set(organization);

    this.logService.info('EnterpriseService', 'Organization created', { orgId });
    return organization;
  }

  /**
   * Carrega organização atual do usuário
   */
  private async loadCurrentOrganization(): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) return;

    try {
      const db = this.firebaseService.firestore;

      // Buscar equipes do usuário
      const teamsQuery = query(
        collection(db, 'team-members'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        limit(1)
      );

      const teamsSnap = await getDocs(teamsQuery);
      if (teamsSnap.empty) {
        this.logService.debug('EnterpriseService', 'User not in any organization');
        return;
      }

      const teamMember = teamsSnap.docs[0].data() as TeamMember;
      const orgId = teamMember.organizationId;

      // Buscar organização
      const orgDoc = await getDoc(doc(db, `organizations/${orgId}`));
      if (!orgDoc.exists()) {
        this.logService.error('EnterpriseService', 'Organization not found', new Error('Organization document does not exist'));
        return;
      }

      const org = {
        ...orgDoc.data(),
        id: orgDoc.id,
        createdAt: orgDoc.data()['createdAt']?.toDate() || new Date(),
        updatedAt: orgDoc.data()['updatedAt']?.toDate() || new Date(),
      } as Organization;

      this._currentOrganization.set(org);
      this._myPermissions.set(teamMember.permissions);

      // Carregar equipe
      await this.loadTeamMembers(orgId);

      this.logService.debug('EnterpriseService', 'Organization loaded', { orgId });

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error loading organization', error as Error);
    }
  }

  /**
   * Atualiza organização
   */
  async updateOrganization(updates: Partial<Organization>): Promise<void> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `organizations/${org.id}`), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    this._currentOrganization.update(current => 
      current ? { ...current, ...updates, updatedAt: new Date() } : null
    );

    await this.logAudit({
      organizationId: org.id,
      action: 'organization.update',
      description: 'Organization updated',
      resourceType: 'organization',
      resourceId: org.id,
      severity: 'info',
    });
  }

  // ============================================================================
  // TEAM MANAGEMENT
  // ============================================================================

  /**
   * Adiciona membro à equipe
   */
  async addTeamMember(data: {
    organizationId: string;
    userId: string;
    role: TeamRole;
    assignedPatientIds: string[];
    department?: string;
    shift?: TeamMember['shift'];
    customPermissions?: Partial<Permissions>;
  }): Promise<TeamMember> {
    const db = this.firebaseService.firestore;
    const memberId = doc(collection(db, 'team-members')).id;
    const currentUser = this.userService.currentUser();

    // Buscar dados do usuário convidado
    const userDoc = await getDoc(doc(db, `users/${data.userId}`));
    if (!userDoc.exists()) throw new Error('User not found');

    const userData = userDoc.data();

    // Determinar permissões
    const basePermissions = DEFAULT_PERMISSIONS[data.role];
    const permissions = data.customPermissions 
      ? { ...basePermissions, ...data.customPermissions }
      : basePermissions;

    const member: TeamMember = {
      id: memberId,
      organizationId: data.organizationId,
      userId: data.userId,
      name: userData['name'] || userData['email'],
      email: userData['email'],
      phone: userData['phone'],
      avatar: userData['avatar'],
      role: data.role,
      permissions,
      customPermissions: data.customPermissions,
      assignedPatientIds: data.assignedPatientIds,
      department: data.department,
      shift: data.shift,
      isActive: true,
      invitedAt: new Date(),
      invitedBy: currentUser?.id || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, `team-members/${memberId}`), {
      ...member,
      invitedAt: Timestamp.fromDate(member.invitedAt),
      createdAt: Timestamp.fromDate(member.createdAt),
      updatedAt: serverTimestamp(),
    });

    // Atualizar contador da organização
    await updateDoc(doc(db, `organizations/${data.organizationId}`), {
      'subscription.currentTeamMembers': (this._currentOrganization()?.subscription.currentTeamMembers || 0) + 1,
    });

    this._teamMembers.update(members => [...members, member]);

    await this.logAudit({
      organizationId: data.organizationId,
      action: 'team.invite',
      description: `Team member invited: ${member.name}`,
      resourceType: 'team',
      resourceId: memberId,
      severity: 'info',
    });

    return member;
  }

  /**
   * Carrega membros da equipe
   */
  private async loadTeamMembers(organizationId: string): Promise<void> {
    const db = this.firebaseService.firestore;

    const membersQuery = query(
      collection(db, 'team-members'),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    );

    const snap = await getDocs(membersQuery);
    const members: TeamMember[] = [];

    snap.forEach(doc => {
      members.push({
        ...doc.data(),
        id: doc.id,
        invitedAt: doc.data()['invitedAt']?.toDate() || new Date(),
        joinedAt: doc.data()['joinedAt']?.toDate(),
        createdAt: doc.data()['createdAt']?.toDate() || new Date(),
        updatedAt: doc.data()['updatedAt']?.toDate() || new Date(),
        lastAccessAt: doc.data()['lastAccessAt']?.toDate(),
      } as TeamMember);
    });

    this._teamMembers.set(members);
    this.logService.debug('EnterpriseService', 'Loaded team members', { count: members.length });
  }

  /**
   * Atualiza role de membro
   */
  async updateMemberRole(memberId: string, newRole: TeamRole): Promise<void> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    const db = this.firebaseService.firestore;
    const newPermissions = DEFAULT_PERMISSIONS[newRole];

    await updateDoc(doc(db, `team-members/${memberId}`), {
      role: newRole,
      permissions: newPermissions,
      updatedAt: serverTimestamp(),
    });

    this._teamMembers.update(members =>
      members.map(m => m.id === memberId 
        ? { ...m, role: newRole, permissions: newPermissions, updatedAt: new Date() }
        : m
      )
    );

    await this.logAudit({
      organizationId: org.id,
      action: 'team.update-role',
      description: `Role updated to ${newRole}`,
      resourceType: 'team',
      resourceId: memberId,
      severity: 'warning',
    });
  }

  /**
   * Atualiza permissões customizadas de membro
   */
  async updateMemberPermissions(memberId: string, permissions: Permissions): Promise<void> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');
    const currentUser = this.userService.currentUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Verificar se o usuário atual é admin
    const myPermissions = this._myPermissions();
    if (!myPermissions?.canManageOrganization) {
      throw new Error('Permission denied: only admins can update member permissions');
    }

    const db = this.firebaseService.firestore;

    // Atualizar no Firestore
    await updateDoc(doc(db, `team-members/${memberId}`), {
      permissions,
      customPermissions: permissions,
      updatedAt: serverTimestamp(),
    });

    // Atualizar no state local
    this._teamMembers.update(members =>
      members.map(m => m.id === memberId 
        ? { ...m, permissions, customPermissions: permissions, updatedAt: new Date() }
        : m
      )
    );

    // Contar quantas permissões foram habilitadas
    const enabledCount = Object.values(permissions).filter(v => v === true).length;
    const totalCount = Object.keys(permissions).length;

    // Registrar auditoria
    await this.logAudit({
      organizationId: org.id,
      action: 'team.update-permissions',
      description: `Custom permissions updated: ${enabledCount}/${totalCount} enabled`,
      resourceType: 'team',
      resourceId: memberId,
      severity: 'warning',
    });

    this.logService.debug('EnterpriseService', 'Updated member permissions', { memberId, enabledCount, totalCount });
  }

  /**
   * Remove membro da equipe
   */
  async removeMember(memberId: string): Promise<void> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `team-members/${memberId}`), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });

    // Atualizar contador
    await updateDoc(doc(db, `organizations/${org.id}`), {
      'subscription.currentTeamMembers': Math.max(0, org.subscription.currentTeamMembers - 1),
    });

    this._teamMembers.update(members => members.filter(m => m.id !== memberId));

    await this.logAudit({
      organizationId: org.id,
      action: 'team.remove',
      description: 'Team member removed',
      resourceType: 'team',
      resourceId: memberId,
      severity: 'warning',
    });
  }

  // ============================================================================
  // MULTI-PATIENT DASHBOARD
  // ============================================================================

  /**
   * Busca pacientes para dashboard multi-paciente
   */
  async getMultiPatientDashboard(filters: MultiPatientFilters): Promise<{
    items: MultiPatientDashboardItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    try {
      // 1. Buscar membros da equipe para filtro de departamento
      const teamMembers = this._teamMembers();
      
      // 2. Buscar todos os pacientes da organização (via whoCareForMeIds)
      const patientsRef = collection(this.firebaseService.firestore, 'users');
      const patientsQuery = query(
        patientsRef,
        where('whoCareForMeIds', 'array-contains-any', 
          teamMembers.slice(0, 10).map(m => m.userId) // Firestore limit: 10 items in array-contains-any
        )
      );

      const patientsSnapshot = await getDocs(patientsQuery);
      const allPatients: any[] = [];
      patientsSnapshot.forEach(doc => {
        allPatients.push({ id: doc.id, ...doc.data() });
      });

      // 3. Para cada paciente, buscar medicações e logs
      const dashboardItems: MultiPatientDashboardItem[] = [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      for (const patient of allPatients) {
        // Buscar medicações do paciente
        const medicationsRef = collection(this.firebaseService.firestore, 'medications');
        const medicationsQuery = query(
          medicationsRef,
          where('patientId', '==', patient.id),
          where('isArchived', '!=', true)
        );
        const medicationsSnapshot = await getDocs(medicationsQuery);
        const medications: any[] = [];
        medicationsSnapshot.forEach(doc => {
          medications.push({ id: doc.id, ...doc.data() });
        });

        // Buscar logs dos últimos 30 dias
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const logsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const logsSnapshot = await getDocs(logsQuery);
        const logs: any[] = [];
        logsSnapshot.forEach(doc => {
          logs.push({ id: doc.id, ...doc.data() });
        });

        // Calcular adherence dos últimos 30 dias
        const adherenceLogs = logs.filter(l => 
          l.eventType === 'taken' || l.eventType === 'missed'
        );
        const takenDoses = adherenceLogs.filter(l => l.eventType === 'taken').length;
        const totalDoses = adherenceLogs.length;
        const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

        // Calcular doses de hoje
        const todayLogs = logs.filter(l => {
          const logDate = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
          return logDate >= todayStart && logDate < todayEnd;
        });
        const todayTaken = todayLogs.filter(l => l.eventType === 'taken').length;
        const todayMissed = todayLogs.filter(l => l.eventType === 'missed').length;
        
        // Estimar doses agendadas para hoje (baseado em schedule das medications)
        let todayScheduled = 0;
        medications.forEach(med => {
          if (med.schedule && Array.isArray(med.schedule)) {
            todayScheduled += med.schedule.length;
          }
        });
        const todayPending = Math.max(0, todayScheduled - todayTaken - todayMissed);

        // Calcular streak (dias consecutivos sem doses perdidas)
        const streak = this.calculateStreak(logs);

        // Identificar alerts
        const alertsList: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];
        
        // Alert de aderência baixa
        if (adherenceRate < 70) {
          alertsList.push({
            type: 'low-adherence',
            message: `Aderência baixa: ${adherenceRate.toFixed(1)}%`,
            severity: adherenceRate < 50 ? 'critical' : 'high'
          });
        }

        // Alert de estoque baixo
        const lowStockMeds = medications.filter(m => {
          const currentStock = m.currentStock ?? m.stock ?? 0;
          const threshold = m.lowStockThreshold ?? 7;
          return currentStock < threshold;
        });
        if (lowStockMeds.length > 0) {
          alertsList.push({
            type: 'low-stock',
            message: `${lowStockMeds.length} medicamento(s) com estoque baixo`,
            severity: 'medium'
          });
        }

        // Alert de doses perdidas hoje
        if (todayMissed > 0) {
          alertsList.push({
            type: 'missed-doses',
            message: `${todayMissed} dose(s) perdida(s) hoje`,
            severity: 'high'
          });
        }

        // Resumo de alerts
        const alerts = {
          count: alertsList.length,
          highestSeverity: alertsList.length > 0 
            ? alertsList.reduce((highest, alert) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[alert.severity] > severityOrder[highest] 
                  ? alert.severity 
                  : highest;
              }, 'low' as 'low' | 'medium' | 'high' | 'critical')
            : 'low' as 'low' | 'medium' | 'high' | 'critical',
          types: alertsList.map(a => a.type)
        };

        // Buscar membros da equipe atribuídos a este paciente
        const assignedMembers = teamMembers.filter(m => 
          m.assignedPatientIds?.includes(patient.id)
        );

        // Próxima dose (calcular baseado em schedule e hora atual)
        let nextDose: { time: string; medicationName: string; minutesUntil: number } | undefined;
        const currentTime = now.getHours() * 60 + now.getMinutes();
        for (const med of medications) {
          if (med.schedule && Array.isArray(med.schedule)) {
            for (const dose of med.schedule) {
              if (dose.time) {
                const [hours, minutes] = dose.time.split(':').map(Number);
                const doseTime = hours * 60 + minutes;
                if (doseTime > currentTime) {
                  const minutesUntil = doseTime - currentTime;
                  if (!nextDose || minutesUntil < nextDose.minutesUntil) {
                    nextDose = {
                      medicationName: med.name,
                      time: dose.time,
                      minutesUntil
                    };
                  }
                }
              }
            }
          }
        }

        // Determinar departamento (buscar do membro da equipe principal)
        const department = assignedMembers[0]?.department || undefined;

        // Determinar nível de aderência
        let adherenceLevel: 'excellent' | 'good' | 'moderate' | 'poor';
        if (adherenceRate >= 90) adherenceLevel = 'excellent';
        else if (adherenceRate >= 70) adherenceLevel = 'good';
        else if (adherenceRate >= 50) adherenceLevel = 'moderate';
        else adherenceLevel = 'poor';

        // Criar item do dashboard
        const dashboardItem: MultiPatientDashboardItem = {
          patientId: patient.id,
          patientName: patient.name || 'Sem nome',
          patientAge: this.calculateAge(patient.birthDate) || 0,
          patientAvatar: patient.avatarUrl,
          department,
          assignedTo: assignedMembers.map(m => ({
            memberId: m.id,
            memberName: m.name || m.email,
            memberRole: m.role
          })),
          adherence: {
            rate: adherenceRate,
            level: adherenceLevel,
            streak
          },
          todayDoses: {
            total: todayScheduled,
            taken: todayTaken,
            missed: todayMissed,
            pending: todayPending,
            next: nextDose
          },
          alerts,
          medications: {
            total: medications.length,
            critical: lowStockMeds.length
          },
          lastUpdate: new Date(),
          lastUpdateBy: assignedMembers[0]?.userId || patient.id
        };

        dashboardItems.push(dashboardItem);
      }

      // 4. Aplicar filtros
      let filteredItems = dashboardItems;

      // Filtro de busca (nome do paciente)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.patientName.toLowerCase().includes(searchLower)
        );
      }

      // Filtro de departamento
      if (filters.department) {
        filteredItems = filteredItems.filter(item => 
          item.department === filters.department
        );
      }

      // Filtro de membro da equipe atribuído
      if (filters.assignedTo) {
        filteredItems = filteredItems.filter(item =>
          item.assignedTo.some(member => member.memberId === filters.assignedTo)
        );
      }

      // Filtro de nível de aderência
      if (filters.adherenceLevel) {
        filteredItems = filteredItems.filter(item => 
          item.adherence.level === filters.adherenceLevel
        );
      }

      // Filtro de alerts
      if (filters.hasAlerts) {
        filteredItems = filteredItems.filter(item => item.alerts.count > 0);
      }

      // Filtro de estoque baixo
      if (filters.hasLowStock) {
        filteredItems = filteredItems.filter(item =>
          item.alerts.types.includes('low-stock')
        );
      }

      // 5. Ordenação
      if (filters.sortBy) {
        filteredItems.sort((a, b) => {
          let comparison = 0;
          switch (filters.sortBy) {
            case 'name':
              comparison = a.patientName.localeCompare(b.patientName);
              break;
            case 'adherence':
              comparison = b.adherence.rate - a.adherence.rate;
              break;
            case 'alerts':
              comparison = b.alerts.count - a.alerts.count;
              break;
            case 'lastUpdate':
              comparison = b.lastUpdate.getTime() - a.lastUpdate.getTime();
              break;
          }
          return filters.sortOrder === 'desc' ? comparison : -comparison;
        });
      }

      // 6. Paginação
      const total = filteredItems.length;
      const startIndex = (filters.page - 1) * filters.pageSize;
      const endIndex = startIndex + filters.pageSize;
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      this.logService.debug('EnterpriseService', 'Multi-patient dashboard fetched', { totalPatients: total, page: filters.page, pageSize: paginatedItems.length });

      return {
        items: paginatedItems,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
      };

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error fetching multi-patient dashboard', error as Error);
      throw error;
    }
  }

  /**
   * Calcula idade a partir da data de nascimento
   */
  private calculateAge(birthDate?: string): number | undefined {
    if (!birthDate) return undefined;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Calcula streak (dias consecutivos sem doses perdidas)
   */
  private calculateStreak(logs: any[]): number {
    // Ordenar logs por data (mais recente primeiro)
    const sortedLogs = logs
      .filter(l => l.eventType === 'taken' || l.eventType === 'missed')
      .sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

    if (sortedLogs.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = sortedLogs[i].timestamp?.toDate ? 
        sortedLogs[i].timestamp.toDate() : 
        new Date(sortedLogs[i].timestamp);
      logDate.setHours(0, 0, 0, 0);

      // Se é uma dose perdida, quebra o streak
      if (sortedLogs[i].eventType === 'missed') {
        break;
      }

      // Se é o mesmo dia ou dia anterior consecutivo
      const dayDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 0 || dayDiff === 1) {
        streak = dayDiff + 1;
        currentDate = logDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calcula estatísticas do dashboard
   */
  async calculateMultiPatientStats(): Promise<MultiPatientStats> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    try {
      const teamMembers = this._teamMembers();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // 1. Buscar todos os pacientes da organização
      const patientsRef = collection(this.firebaseService.firestore, 'users');
      const patientsQuery = query(
        patientsRef,
        where('whoCareForMeIds', 'array-contains-any', 
          teamMembers.slice(0, 10).map(m => m.userId)
        )
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      const allPatients: any[] = [];
      patientsSnapshot.forEach(doc => {
        allPatients.push({ id: doc.id, ...doc.data() });
      });

      const totalPatients = allPatients.length;
      const activePatients = allPatients.filter(p => !p.isArchived).length;
      const inactivePatients = totalPatients - activePatients;

      // 2. Buscar todas as medicações dos pacientes
      let totalMedications = 0;
      let activeMedications = 0;
      let criticalStockAlerts = 0;
      const allAlerts: Array<{ 
        type: 'missed-dose' | 'low-stock' | 'expired' | 'critical-patient';
        patientId: string; 
        patientName: string; 
        message: string; 
        severity: 'low' | 'medium' | 'high' | 'critical';
        timestamp: Date;
      }> = [];

      for (const patient of allPatients) {
        const medicationsRef = collection(this.firebaseService.firestore, 'medications');
        const medicationsQuery = query(
          medicationsRef,
          where('patientId', '==', patient.id)
        );
        const medicationsSnapshot = await getDocs(medicationsQuery);
        
        medicationsSnapshot.forEach(doc => {
          const med = doc.data();
          totalMedications++;
          
          if (!med['isArchived'] && !med['isCompleted']) {
            activeMedications++;
          }

          // Verificar estoque crítico (< 3 dias)
          const currentStock = med['currentStock'] ?? med['stock'] ?? 0;
          const threshold = 3; // Crítico = menos de 3 dias
          if (currentStock < threshold) {
            criticalStockAlerts++;
            allAlerts.push({
              type: 'low-stock',
              patientId: patient.id,
              patientName: patient['name'] || 'Sem nome',
              message: `${med['name']}: estoque crítico (${currentStock} unidades)`,
              severity: 'critical',
              timestamp: new Date()
            });
          }
        });
      }

      // 3. Buscar logs de hoje
      let todayTaken = 0;
      let todayMissed = 0;
      let todayScheduled = 0;

      for (const patient of allPatients) {
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const todayLogsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(todayStart)),
          where('timestamp', '<', Timestamp.fromDate(todayEnd))
        );
        const todayLogsSnapshot = await getDocs(todayLogsQuery);
        
        todayLogsSnapshot.forEach(doc => {
          const log = doc.data();
          if (log['eventType'] === 'taken') todayTaken++;
          if (log['eventType'] === 'missed') todayMissed++;
        });

        // Estimar doses agendadas (baseado em schedule das medications ativas)
        const medicationsRef = collection(this.firebaseService.firestore, 'medications');
        const activeMedsQuery = query(
          medicationsRef,
          where('patientId', '==', patient.id),
          where('isArchived', '!=', true)
        );
        const activeMedsSnapshot = await getDocs(activeMedsQuery);
        
        activeMedsSnapshot.forEach(doc => {
          const med = doc.data();
          if (med['schedule'] && Array.isArray(med['schedule'])) {
            todayScheduled += med['schedule'].length;
          }
        });
      }

      const todayPending = Math.max(0, todayScheduled - todayTaken - todayMissed);
      const todayAdherenceRate = todayScheduled > 0 ? 
        (todayTaken / (todayTaken + todayMissed)) * 100 : 0;

      // 4. Buscar logs dos últimos 30 dias para aderência geral
      let overallTaken = 0;
      let overallMissed = 0;

      for (const patient of allPatients) {
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const thirtyDaysLogsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const thirtyDaysLogsSnapshot = await getDocs(thirtyDaysLogsQuery);
        
        thirtyDaysLogsSnapshot.forEach(doc => {
          const log = doc.data();
          if (log['eventType'] === 'taken') overallTaken++;
          if (log['eventType'] === 'missed') overallMissed++;
        });
      }

      const overallTotal = overallTaken + overallMissed;
      const overallAdherenceRate = overallTotal > 0 ? 
        (overallTaken / overallTotal) * 100 : 0;

      // 5. Identificar top 5 alerts por severidade
      const sortedAlerts = allAlerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
      const topAlerts = sortedAlerts.slice(0, 5);

      // 6. Calcular stats da equipe
      const activeMembers = teamMembers.filter(m => m.isActive).length;
      
      // Contar doses registradas hoje por membros da equipe
      let dosesRegisteredToday = 0;
      for (const patient of allPatients) {
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const todayLogsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(todayStart)),
          where('timestamp', '<', Timestamp.fromDate(todayEnd))
        );
        const todayLogsSnapshot = await getDocs(todayLogsQuery);
        
        todayLogsSnapshot.forEach(doc => {
          const log = doc.data();
          // Contar apenas logs registrados por membros da equipe (não pelo próprio paciente)
          if (log['registeredBy'] && log['registeredBy'] !== patient.id) {
            dosesRegisteredToday++;
          }
        });
      }

      // 7. Compilar estatísticas
      const stats: MultiPatientStats = {
        organizationId: org.id,
        totalPatients,
        activePatients,
        inactivePatients,
        totalMedications,
        activeMedications,
        criticalStockAlerts,
        todayStats: {
          scheduledDoses: todayScheduled,
          takenDoses: todayTaken,
          missedDoses: todayMissed,
          pendingDoses: todayPending,
          adherenceRate: Math.round(todayAdherenceRate * 10) / 10,
        },
        overallAdherence: {
          totalDoses: overallTotal,
          takenDoses: overallTaken,
          missedDoses: overallMissed,
          adherenceRate: Math.round(overallAdherenceRate * 10) / 10,
        },
        topAlerts,
        teamStats: {
          totalMembers: teamMembers.length,
          activeMembers,
          dosesRegisteredToday,
        },
        calculatedAt: new Date(),
      };

      this._multiPatientStats.set(stats);
      this.logService.debug('EnterpriseService', 'Calculated multi-patient stats', stats);
      return stats;

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error calculating multi-patient stats', error as Error);
      throw error;
    }
  }

  // ============================================================================
  // COMPLIANCE & AUDIT
  // ============================================================================

  /**
   * Gera relatório de compliance
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');
    const userId = this.userService.currentUser()?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const teamMembers = this._teamMembers();

      // 1. Buscar todos os pacientes da organização
      const patientsRef = collection(this.firebaseService.firestore, 'users');
      const patientsQuery = query(
        patientsRef,
        where('whoCareForMeIds', 'array-contains-any', 
          teamMembers.slice(0, 10).map(m => m.userId)
        )
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      const allPatients: any[] = [];
      patientsSnapshot.forEach(doc => {
        allPatients.push({ id: doc.id, ...doc.data() });
      });

      // 2. Buscar todos os logs do período
      let totalTaken = 0;
      let totalMissed = 0;
      let lateRegister = 0;
      const adherenceByPatient: Array<{
        patientId: string;
        patientName: string;
        adherenceRate: number;
        totalDoses: number;
        takenDoses: number;
        missedDoses: number;
      }> = [];

      const medicationStats = new Map<string, { taken: number; total: number }>();

      for (const patient of allPatients) {
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const logsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(endDate))
        );
        const logsSnapshot = await getDocs(logsQuery);
        
        let patientTaken = 0;
        let patientMissed = 0;

        logsSnapshot.forEach(doc => {
          const log = doc.data();
          
          if (log['eventType'] === 'taken') {
            patientTaken++;
            totalTaken++;
            
            // Verificar se foi registrado com atraso (> 1 hora após horário agendado)
            if (log['scheduledTime'] && log['timestamp']) {
              const scheduled = new Date(log['scheduledTime']);
              const actual = log['timestamp'].toDate();
              const diffHours = (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
              if (diffHours > 1) {
                lateRegister++;
              }
            }

            // Agrupar por medicação
            if (log['medicationName']) {
              const current = medicationStats.get(log['medicationName']) || { taken: 0, total: 0 };
              current.taken++;
              current.total++;
              medicationStats.set(log['medicationName'], current);
            }
          }
          
          if (log['eventType'] === 'missed') {
            patientMissed++;
            totalMissed++;

            // Agrupar por medicação
            if (log['medicationName']) {
              const current = medicationStats.get(log['medicationName']) || { taken: 0, total: 0 };
              current.total++;
              medicationStats.set(log['medicationName'], current);
            }
          }
        });

        const patientTotal = patientTaken + patientMissed;
        const patientAdherence = patientTotal > 0 ? (patientTaken / patientTotal) * 100 : 0;

        if (patientTotal > 0) {
          adherenceByPatient.push({
            patientId: patient.id,
            patientName: patient['name'] || 'Sem nome',
            adherenceRate: Math.round(patientAdherence * 10) / 10,
            totalDoses: patientTotal,
            takenDoses: patientTaken,
            missedDoses: patientMissed
          });
        }
      }

      const totalDoses = totalTaken + totalMissed;
      const adherenceRate = totalDoses > 0 ? (totalTaken / totalDoses) * 100 : 0;

      // Converter medicationStats para array
      const adherenceByMedication = Array.from(medicationStats.entries()).map(([name, stats]) => ({
        medicationName: name,
        adherenceRate: Math.round((stats.taken / stats.total) * 100 * 10) / 10,
        totalDoses: stats.total,
        takenDoses: stats.taken
      }));

      // 3. Identificar erros de medicação (buscar em audit logs)
      const auditLogsRef = collection(this.firebaseService.firestore, 'audit-logs');
      const errorQuery = query(
        auditLogsRef,
        where('organizationId', '==', org.id),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        where('severity', 'in', ['high', 'critical'])
      );
      const errorSnapshot = await getDocs(errorQuery);
      
      const medicationErrors: any[] = [];
      let wrongDose = 0;
      let wrongMedication = 0;
      let wrongPatient = 0;
      let wrongTime = 0;

      errorSnapshot.forEach(doc => {
        const error = doc.data();
        if (error['action'].includes('medication')) {
          medicationErrors.push({
            id: doc.id,
            type: error['action'],
            patientId: error['resourceId'] || '',
            medicationId: error['metadata']?.medicationId || '',
            timestamp: error['timestamp'].toDate(),
            reportedBy: error['userId'],
            severity: error['severity'],
            resolved: error['metadata']?.resolved || false
          });

          // Classificar tipo de erro baseado na descrição
          const desc = error['description'].toLowerCase();
          if (desc.includes('dose')) wrongDose++;
          if (desc.includes('medication') || desc.includes('medicamento')) wrongMedication++;
          if (desc.includes('patient') || desc.includes('paciente')) wrongPatient++;
          if (desc.includes('time') || desc.includes('horário')) wrongTime++;
        }
      });

      // 4. Gestão de estoque
      let lowStockAlerts = 0;
      let expiredMedications = 0;
      let stockValue = 0;
      const medicationCounts = new Map<string, { quantity: number; value: number }>();

      for (const patient of allPatients) {
        const medicationsRef = collection(this.firebaseService.firestore, 'medications');
        const medicationsQuery = query(
          medicationsRef,
          where('patientId', '==', patient.id)
        );
        const medicationsSnapshot = await getDocs(medicationsQuery);
        
        medicationsSnapshot.forEach(doc => {
          const med = doc.data();
          const currentStock = med['currentStock'] ?? med['stock'] ?? 0;
          const threshold = med['lowStockThreshold'] ?? 7;

          if (currentStock < threshold) {
            lowStockAlerts++;
          }

          // Verificar medicações expiradas (se houver endDate)
          if (med['endDate']) {
            const endDate = new Date(med['endDate']);
            if (endDate < new Date()) {
              expiredMedications++;
            }
          }

          // Estimar valor do estoque (assumindo R$ 20 por unidade como padrão)
          const unitValue = med['unitValue'] || 20;
          stockValue += currentStock * unitValue;

          // Agrupar por medicação
          const current = medicationCounts.get(med['name']) || { quantity: 0, value: 0 };
          current.quantity += currentStock;
          current.value += currentStock * unitValue;
          medicationCounts.set(med['name'], current);
        });
      }

      // Top 5 medicações por quantidade
      const topMedications = Array.from(medicationCounts.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // 5. Performance da equipe
      const dosesRegisteredByMember = new Map<string, number>();
      
      for (const patient of allPatients) {
        const logsRef = collection(this.firebaseService.firestore, 'logs');
        const logsQuery = query(
          logsRef,
          where('userId', '==', patient.id),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(endDate))
        );
        const logsSnapshot = await getDocs(logsQuery);
        
        logsSnapshot.forEach(doc => {
          const log = doc.data();
          if (log['registeredBy']) {
            const current = dosesRegisteredByMember.get(log['registeredBy']) || 0;
            dosesRegisteredByMember.set(log['registeredBy'], current + 1);
          }
        });
      }

      const teamPerformance = Array.from(dosesRegisteredByMember.entries()).map(([memberId, count]) => {
        const member = teamMembers.find(m => m.userId === memberId);
        return {
          memberId,
          memberName: member?.name || member?.email || 'Desconhecido',
          dosesRegistered: count
        };
      });

      // 6. Sumário de auditoria
      const auditQuery = query(
        auditLogsRef,
        where('organizationId', '==', org.id),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate))
      );
      const auditSnapshot = await getDocs(auditQuery);
      
      const actionsByType: Record<string, number> = {};
      let flaggedActions = 0;

      auditSnapshot.forEach(doc => {
        const audit = doc.data();
        actionsByType[audit['action']] = (actionsByType[audit['action']] || 0) + 1;
        if (audit['severity'] === 'high' || audit['severity'] === 'critical') {
          flaggedActions++;
        }
      });

      // 7. Compilar relatório
      const report: ComplianceReport = {
        id: doc(collection(this.firebaseService.firestore, 'compliance-reports')).id,
        organizationId: org.id,
        startDate,
        endDate,
        adherence: {
          totalDoses,
          takenDoses: totalTaken,
          missedDoses: totalMissed,
          lateRegister,
          adherenceRate: Math.round(adherenceRate * 10) / 10,
          byPatient: adherenceByPatient,
          byMedication: adherenceByMedication,
        },
        medicationErrors: {
          total: medicationErrors.length,
          wrongDose,
          wrongMedication,
          wrongPatient,
          wrongTime,
          incidents: medicationErrors,
        },
        stockManagement: {
          lowStockAlerts,
          expiredMedications,
          stockValue: Math.round(stockValue * 100) / 100,
          topMedications,
        },
        teamPerformance: {
          totalMembers: teamMembers.length,
          activeMembers: teamMembers.filter(m => m.isActive).length,
          dosesRegisteredByMember: teamPerformance,
        },
        auditSummary: {
          totalActions: auditSnapshot.size,
          actionsByType,
          flaggedActions,
        },
        regulatoryCompliance: {
          hipaaCompliant: org.features.hipaaCompliance,
          lgpdCompliant: true,
          documentsGenerated: auditSnapshot.size,
          auditTrailComplete: true,
        },
        generatedBy: userId,
        generatedAt: new Date(),
        format: 'pdf',
      };

      // 8. Salvar no Firestore
      const db = this.firebaseService.firestore;
      await setDoc(doc(db, `compliance-reports/${report.id}`), {
        ...report,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        generatedAt: serverTimestamp()
      });

      // 9. Registrar auditoria
      await this.logAudit({
        organizationId: org.id,
        action: 'report.generate',
        description: `Compliance report generated for period ${startDate.toISOString()} - ${endDate.toISOString()}. Total patients: ${allPatients.length}, Total doses: ${totalDoses}, Adherence: ${report.adherence.adherenceRate}%`,
        resourceType: 'report',
        resourceId: report.id,
        severity: 'info'
      });

      this.logService.info('EnterpriseService', 'Generated compliance report', { reportId: report.id });
      return report;

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error generating compliance report', error as Error);
      throw error;
    }
  }

  /**
   * Registra log de auditoria
   */
  async logAudit(data: {
    organizationId: string;
    action: AuditActionType;
    description: string;
    resourceType: AuditLog['resourceType'];
    resourceId?: string;
    resourceName?: string;
    changes?: AuditLog['changes'];
    severity: AuditLog['severity'];
  }): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) return;

    const member = this._teamMembers().find(m => m.userId === userId);
    const db = this.firebaseService.firestore;
    const logId = doc(collection(db, 'audit-logs')).id;

    const auditLog: AuditLog = {
      id: logId,
      organizationId: data.organizationId,
      action: data.action,
      description: data.description,
      userId,
      userName: member?.name || 'Unknown',
      userRole: member?.role || 'viewer',
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      changes: data.changes,
      isSuspicious: false,
      isError: data.severity === 'error' || data.severity === 'critical',
      severity: data.severity,
      timestamp: new Date(),
    };

    await setDoc(doc(db, `audit-logs/${logId}`), {
      ...auditLog,
      timestamp: serverTimestamp(),
    });
  }

  /**
   * Busca logs de auditoria
   */
  async getAuditLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: AuditActionType;
    limit?: number;
  }): Promise<AuditLog[]> {
    const org = this._currentOrganization();
    if (!org) throw new Error('No organization selected');

    const db = this.firebaseService.firestore;
    let q = query(
      collection(db, 'audit-logs'),
      where('organizationId', '==', org.id),
      orderBy('timestamp', 'desc')
    );

    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const snap = await getDocs(q);
    const logs: AuditLog[] = [];

    snap.forEach(doc => {
      logs.push({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data()['timestamp']?.toDate() || new Date(),
      } as AuditLog);
    });

    return logs;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getPlanLimits(plan: SubscriptionPlan) {
    const limits = {
      trial: {
        maxPatients: 10,
        maxTeamMembers: 3,
        features: {
          multiPatientDashboard: true,
          teamManagement: true,
          complianceReports: false,
          apiAccess: false,
          whiteLabel: false,
          customDomain: false,
          sso: false,
          hipaaCompliance: false,
          customReports: false,
          prioritySupport: false,
        },
      },
      starter: {
        maxPatients: 50,
        maxTeamMembers: 10,
        features: {
          multiPatientDashboard: true,
          teamManagement: true,
          complianceReports: true,
          apiAccess: false,
          whiteLabel: false,
          customDomain: false,
          sso: false,
          hipaaCompliance: false,
          customReports: false,
          prioritySupport: false,
        },
      },
      professional: {
        maxPatients: 200,
        maxTeamMembers: 50,
        features: {
          multiPatientDashboard: true,
          teamManagement: true,
          complianceReports: true,
          apiAccess: true,
          whiteLabel: false,
          customDomain: false,
          sso: false,
          hipaaCompliance: true,
          customReports: true,
          prioritySupport: true,
        },
      },
      enterprise: {
        maxPatients: 999999,
        maxTeamMembers: 999999,
        features: {
          multiPatientDashboard: true,
          teamManagement: true,
          complianceReports: true,
          apiAccess: true,
          whiteLabel: true,
          customDomain: true,
          sso: true,
          hipaaCompliance: true,
          customReports: true,
          prioritySupport: true,
        },
      },
    };

    return limits[plan];
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Verifica se usuário tem permissão
   */
  hasPermission(permission: keyof Permissions): boolean {
    return this._myPermissions()?.[permission] || false;
  }

  /**
   * Verifica se feature está habilitada
   */
  hasFeature(feature: keyof Organization['features']): boolean {
    return this._currentOrganization()?.features[feature] || false;
  }

  // ============================================================================
  // EXPORT METHODS
  // ============================================================================

  /**
   * Exporta relatório de compliance para PDF
   * Usa jsPDF e jspdf-autotable para formatação profissional
   */
  async exportComplianceReportToPDF(report: ComplianceReport): Promise<void> {
    this.logService.debug('EnterpriseService', 'Exporting compliance report to PDF', { reportId: report.id });

    try {
      // Imports dinâmicos para reduzir bundle inicial
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // Criar documento PDF (A4, portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // ===== HEADER =====
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('Relatório de Compliance', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const currentOrg = this._currentOrganization();
      if (currentOrg) {
        doc.text(currentOrg.name, pageWidth / 2, yPosition, { align: 'center' });
      }

      yPosition += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 8;

      // ===== INFO DO RELATÓRIO =====
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const startDate = new Date(report.startDate).toLocaleDateString('pt-BR');
      const endDate = new Date(report.endDate).toLocaleDateString('pt-BR');
      const generatedAt = new Date(report.generatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.text(`Período: ${startDate} a ${endDate}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Gerado em: ${generatedAt}`, 20, yPosition);
      yPosition += 10;

      // ===== SEÇÃO 1: RESUMO EXECUTIVO =====
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('1. Resumo Executivo', 20, yPosition);
      yPosition += 8;

      const summaryData = [
        ['Métrica', 'Valor'],
        ['Taxa de Adesão', `${report.adherence.adherenceRate.toFixed(1)}%`],
        ['Total de Doses', report.adherence.totalDoses.toString()],
        ['Doses Tomadas', report.adherence.takenDoses.toString()],
        ['Doses Perdidas', report.adherence.missedDoses.toString()],
        ['Erros de Medicação', report.medicationErrors.total.toString()],
        ['Alertas de Estoque Baixo', report.stockManagement.lowStockAlerts.toString()],
        ['Medicações Vencidas', report.stockManagement.expiredMedications.toString()],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { halign: 'right', cellWidth: 'auto' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===== SEÇÃO 2: ADESÃO POR PACIENTE =====
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('2. Adesão por Paciente', 20, yPosition);
      yPosition += 8;

      const patientData = [
        ['Paciente', 'Taxa de Adesão', 'Total', 'Tomadas', 'Perdidas']
      ];

      report.adherence.byPatient.slice(0, 10).forEach(p => {
        patientData.push([
          p.patientName,
          `${p.adherenceRate.toFixed(1)}%`,
          p.totalDoses.toString(),
          p.takenDoses.toString(),
          p.missedDoses.toString()
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [patientData[0]],
        body: patientData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'center', cellWidth: 30 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 25 }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===== SEÇÃO 3: ADESÃO POR MEDICAÇÃO =====
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('3. Adesão por Medicação', 20, yPosition);
      yPosition += 8;

      const medicationData = [
        ['Medicação', 'Taxa de Adesão', 'Total', 'Tomadas']
      ];

      report.adherence.byMedication.slice(0, 10).forEach(m => {
        medicationData.push([
          m.medicationName,
          `${m.adherenceRate.toFixed(1)}%`,
          m.totalDoses.toString(),
          m.takenDoses.toString()
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [medicationData[0]],
        body: medicationData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 30 }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===== SEÇÃO 4: ERROS DE MEDICAÇÃO =====
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('4. Erros de Medicação', 20, yPosition);
      yPosition += 8;

      const errorSummary = [
        ['Tipo de Erro', 'Quantidade'],
        ['Dose Errada', report.medicationErrors.wrongDose.toString()],
        ['Medicação Errada', report.medicationErrors.wrongMedication.toString()],
        ['Paciente Errado', report.medicationErrors.wrongPatient.toString()],
        ['Horário Errado', report.medicationErrors.wrongTime.toString()],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [errorSummary[0]],
        body: errorSummary.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'right', cellWidth: 'auto' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===== SEÇÃO 5: PERFORMANCE DA EQUIPE =====
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('5. Performance da Equipe', 20, yPosition);
      yPosition += 8;

      const teamData = [
        ['Membro', 'Doses Registradas']
      ];

      report.teamPerformance.dosesRegisteredByMember.slice(0, 10).forEach(m => {
        teamData.push([
          m.memberName,
          m.dosesRegistered.toString()
        ]);
      });

      autoTable(doc, {
        startY: yPosition,
        head: [teamData[0]],
        body: teamData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { halign: 'center', cellWidth: 'auto' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // ===== SEÇÃO 6: COMPLIANCE REGULATÓRIO =====
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('6. Compliance Regulatório', 20, yPosition);
      yPosition += 8;

      const complianceData = [
        ['Requisito', 'Status'],
        ['HIPAA Compliant', report.regulatoryCompliance.hipaaCompliant ? '✓ Sim' : '✗ Não'],
        ['LGPD Compliant', report.regulatoryCompliance.lgpdCompliant ? '✓ Sim' : '✗ Não'],
        ['Documentos Gerados', report.regulatoryCompliance.documentsGenerated.toString()],
        ['Audit Trail Completo', report.regulatoryCompliance.auditTrailComplete ? '✓ Sim' : '✗ Não'],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [complianceData[0]],
        body: complianceData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [155, 89, 182], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'center', cellWidth: 'auto' }
        }
      });

      // ===== FOOTER EM TODAS AS PÁGINAS =====
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          'Medicamenta.me Enterprise - Relatório Confidencial',
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      // ===== SALVAR PDF =====
      const fileName = `compliance-report-${startDate.replace(/\//g, '-')}-${endDate.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);

      this.logService.info('EnterpriseService', 'PDF exported successfully', { fileName });

      // Registrar auditoria
      const orgForAudit = this._currentOrganization();
      if (orgForAudit) {
        await this.logAudit({
          organizationId: orgForAudit.id,
          action: 'report.export',
          description: `Relatório de compliance exportado para PDF (${report.id})`,
          resourceType: 'report',
          resourceId: report.id,
          resourceName: `Compliance Report ${startDate} - ${endDate}`,
          severity: 'info'
        });
      }

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error exporting PDF', error as Error);
      throw error;
    }
  }

  /**
   * Exporta relatório de compliance para Excel
   * Usa ExcelJS para criar arquivo com múltiplas abas (seguro, sem vulnerabilidades)
   * @lgpd Dados são sanitizados antes da exportação
   */
  async exportComplianceReportToExcel(report: ComplianceReport): Promise<void> {
    this.logService.debug('EnterpriseService', 'Exporting compliance report to Excel', { reportId: report.id });

    try {
      // Import dinâmico do ExcelJS e FileSaver
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      // Criar workbook
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Medicamenta.me';
      wb.created = new Date();

      // ===== ABA 1: RESUMO EXECUTIVO =====
      const wsSummary = wb.addWorksheet('Resumo');
      wsSummary.columns = [
        { header: 'Campo', key: 'campo', width: 30 },
        { header: 'Valor', key: 'valor', width: 40 }
      ];

      wsSummary.addRow({ campo: 'RELATÓRIO DE COMPLIANCE', valor: '' });
      wsSummary.addRow({ campo: '', valor: '' });
      wsSummary.addRow({ campo: 'Organização:', valor: this._currentOrganization()?.name || '' });
      wsSummary.addRow({ campo: 'Período:', valor: `${new Date(report.startDate).toLocaleDateString('pt-BR')} a ${new Date(report.endDate).toLocaleDateString('pt-BR')}` });
      wsSummary.addRow({ campo: 'Gerado em:', valor: new Date(report.generatedAt).toLocaleString('pt-BR') });
      wsSummary.addRow({ campo: '', valor: '' });
      wsSummary.addRow({ campo: 'MÉTRICAS PRINCIPAIS', valor: '' });
      wsSummary.addRow({ campo: 'Taxa de Adesão', valor: `${report.adherence.adherenceRate.toFixed(1)}%` });
      wsSummary.addRow({ campo: 'Total de Doses', valor: report.adherence.totalDoses });
      wsSummary.addRow({ campo: 'Doses Tomadas', valor: report.adherence.takenDoses });
      wsSummary.addRow({ campo: 'Doses Perdidas', valor: report.adherence.missedDoses });
      wsSummary.addRow({ campo: 'Registros Atrasados', valor: report.adherence.lateRegister });
      wsSummary.addRow({ campo: '', valor: '' });
      wsSummary.addRow({ campo: 'ERROS E ALERTAS', valor: '' });
      wsSummary.addRow({ campo: 'Erros de Medicação', valor: report.medicationErrors.total });
      wsSummary.addRow({ campo: 'Alertas de Estoque Baixo', valor: report.stockManagement.lowStockAlerts });
      wsSummary.addRow({ campo: 'Medicações Vencidas', valor: report.stockManagement.expiredMedications });
      wsSummary.addRow({ campo: '', valor: '' });
      wsSummary.addRow({ campo: 'EQUIPE', valor: '' });
      wsSummary.addRow({ campo: 'Total de Membros', valor: report.teamPerformance.totalMembers });
      wsSummary.addRow({ campo: 'Membros Ativos', valor: report.teamPerformance.activeMembers });

      // ===== ABA 2: ADESÃO POR PACIENTE =====
      const wsPatients = wb.addWorksheet('Adesão por Paciente');
      wsPatients.columns = [
        { header: 'Paciente', key: 'paciente', width: 30 },
        { header: 'Taxa de Adesão (%)', key: 'taxa', width: 20 },
        { header: 'Total de Doses', key: 'total', width: 15 },
        { header: 'Doses Tomadas', key: 'tomadas', width: 15 },
        { header: 'Doses Perdidas', key: 'perdidas', width: 15 }
      ];

      report.adherence.byPatient.forEach(p => {
        wsPatients.addRow({
          paciente: p.patientName,
          taxa: p.adherenceRate.toFixed(1),
          total: p.totalDoses,
          tomadas: p.takenDoses,
          perdidas: p.missedDoses
        });
      });

      // ===== ABA 3: ADESÃO POR MEDICAÇÃO =====
      const wsMedications = wb.addWorksheet('Adesão por Medicação');
      wsMedications.columns = [
        { header: 'Medicação', key: 'medicacao', width: 40 },
        { header: 'Taxa de Adesão (%)', key: 'taxa', width: 20 },
        { header: 'Total de Doses', key: 'total', width: 15 },
        { header: 'Doses Tomadas', key: 'tomadas', width: 15 }
      ];

      report.adherence.byMedication.forEach(m => {
        wsMedications.addRow({
          medicacao: m.medicationName,
          taxa: m.adherenceRate.toFixed(1),
          total: m.totalDoses,
          tomadas: m.takenDoses
        });
      });

      // ===== ABA 4: ERROS DE MEDICAÇÃO =====
      const wsErrors = wb.addWorksheet('Erros de Medicação');
      wsErrors.columns = [
        { header: 'Tipo de Erro', key: 'tipo', width: 20 },
        { header: 'Quantidade', key: 'qtd', width: 15 }
      ];
      wsErrors.addRow({ tipo: 'Dose Errada', qtd: report.medicationErrors.wrongDose });
      wsErrors.addRow({ tipo: 'Medicação Errada', qtd: report.medicationErrors.wrongMedication });
      wsErrors.addRow({ tipo: 'Paciente Errado', qtd: report.medicationErrors.wrongPatient });
      wsErrors.addRow({ tipo: 'Horário Errado', qtd: report.medicationErrors.wrongTime });
      wsErrors.addRow({ tipo: 'Total', qtd: report.medicationErrors.total });
      wsErrors.addRow({ tipo: '', qtd: '' });

      // Incidentes detalhados
      const wsIncidents = wb.addWorksheet('Incidentes');
      wsIncidents.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 20 },
        { header: 'Paciente ID', key: 'pacienteId', width: 15 },
        { header: 'Medicação ID', key: 'medicacaoId', width: 15 },
        { header: 'Data/Hora', key: 'dataHora', width: 20 },
        { header: 'Reportado Por', key: 'reportado', width: 20 },
        { header: 'Severidade', key: 'severidade', width: 12 },
        { header: 'Resolvido', key: 'resolvido', width: 10 }
      ];

      report.medicationErrors.incidents.forEach(inc => {
        wsIncidents.addRow({
          id: inc.id,
          tipo: inc.type,
          pacienteId: inc.patientId,
          medicacaoId: inc.medicationId,
          dataHora: new Date(inc.timestamp).toLocaleString('pt-BR'),
          reportado: inc.reportedBy,
          severidade: inc.severity,
          resolvido: inc.resolved ? 'Sim' : 'Não'
        });
      });

      // ===== ABA 5: GESTÃO DE ESTOQUE =====
      const wsStock = wb.addWorksheet('Gestão de Estoque');
      wsStock.columns = [
        { header: 'Métrica', key: 'metrica', width: 40 },
        { header: 'Valor', key: 'valor', width: 20 }
      ];
      wsStock.addRow({ metrica: 'Alertas de Estoque Baixo', valor: report.stockManagement.lowStockAlerts });
      wsStock.addRow({ metrica: 'Medicações Vencidas', valor: report.stockManagement.expiredMedications });
      wsStock.addRow({ metrica: 'Valor Total em Estoque', valor: `R$ ${report.stockManagement.stockValue.toFixed(2)}` });
      wsStock.addRow({ metrica: '', valor: '' });

      // Top Medicações
      const wsTopMeds = wb.addWorksheet('Top Medicações');
      wsTopMeds.columns = [
        { header: 'Medicação', key: 'medicacao', width: 40 },
        { header: 'Quantidade', key: 'quantidade', width: 15 },
        { header: 'Valor (R$)', key: 'valor', width: 15 }
      ];

      report.stockManagement.topMedications.forEach(med => {
        wsTopMeds.addRow({
          medicacao: med.name,
          quantidade: med.quantity,
          valor: med.value.toFixed(2)
        });
      });

      // ===== ABA 6: PERFORMANCE DA EQUIPE =====
      const wsTeam = wb.addWorksheet('Performance da Equipe');
      wsTeam.columns = [
        { header: 'Métrica', key: 'metrica', width: 40 },
        { header: 'Valor', key: 'valor', width: 20 }
      ];
      wsTeam.addRow({ metrica: 'Total de Membros', valor: report.teamPerformance.totalMembers });
      wsTeam.addRow({ metrica: 'Membros Ativos', valor: report.teamPerformance.activeMembers });
      wsTeam.addRow({ metrica: '', valor: '' });
      wsTeam.addRow({ metrica: 'DOSES REGISTRADAS POR MEMBRO', valor: '' });

      report.teamPerformance.dosesRegisteredByMember.forEach(m => {
        wsTeam.addRow({ metrica: m.memberName, valor: m.dosesRegistered });
      });

      // ===== ABA 7: AUDITORIA =====
      const wsAudit = wb.addWorksheet('Auditoria');
      wsAudit.columns = [
        { header: 'Métrica', key: 'metrica', width: 30 },
        { header: 'Valor', key: 'valor', width: 15 }
      ];
      wsAudit.addRow({ metrica: 'Total de Ações', valor: report.auditSummary.totalActions });
      wsAudit.addRow({ metrica: 'Ações Sinalizadas', valor: report.auditSummary.flaggedActions });
      wsAudit.addRow({ metrica: '', valor: '' });
      wsAudit.addRow({ metrica: 'AÇÕES POR TIPO', valor: '' });

      Object.entries(report.auditSummary.actionsByType).forEach(([type, count]) => {
        wsAudit.addRow({ metrica: type, valor: count });
      });

      // ===== ABA 8: COMPLIANCE REGULATÓRIO =====
      const wsRegulatory = wb.addWorksheet('Compliance');
      wsRegulatory.columns = [
        { header: 'Requisito', key: 'requisito', width: 30 },
        { header: 'Status', key: 'status', width: 15 }
      ];
      wsRegulatory.addRow({ requisito: 'HIPAA Compliant', status: report.regulatoryCompliance.hipaaCompliant ? 'Sim' : 'Não' });
      wsRegulatory.addRow({ requisito: 'LGPD Compliant', status: report.regulatoryCompliance.lgpdCompliant ? 'Sim' : 'Não' });
      wsRegulatory.addRow({ requisito: 'Documentos Gerados', status: report.regulatoryCompliance.documentsGenerated });
      wsRegulatory.addRow({ requisito: 'Audit Trail Completo', status: report.regulatoryCompliance.auditTrailComplete ? 'Sim' : 'Não' });

      // ===== SALVAR EXCEL COM EXCELJS =====
      const startDate = new Date(report.startDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
      const endDate = new Date(report.endDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `compliance-report-${startDate}-${endDate}.xlsx`;
      
      // Usar ExcelJS para gerar buffer e salvar com file-saver
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      this.logService.info('EnterpriseService', 'Excel exported successfully', { fileName });

      // Registrar auditoria
      const org = this._currentOrganization();
      if (org) {
        await this.logAudit({
          organizationId: org.id,
          action: 'report.export',
          description: `Relatório de compliance exportado para Excel (${report.id})`,
          resourceType: 'report',
          resourceId: report.id,
          resourceName: `Compliance Report ${startDate} - ${endDate}`,
          severity: 'info'
        });
      }

    } catch (error: any) {
      this.logService.error('EnterpriseService', 'Error exporting Excel', error as Error);
      throw error;
    }
  }
}

