import { Injectable, inject, computed, signal } from '@angular/core';
import { UserService } from './user.service';
import { MedicationService } from './medication.service';
import { Medication } from '../models/medication.model';
import { User, Dependent } from '../models/user.model';

/**
 * Family Member Interface
 * Representa um membro da família (usuário principal ou dependente)
 */
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatarUrl: string;
  isMainUser: boolean;
}

/**
 * Family Dose Interface
 * Dose com informação do membro da família
 */
export interface FamilyDose {
  medicationId: string;
  medicationName: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed' | 'overdue';
  member: FamilyMember;
  date: Date;
  notes?: string;
}

/**
 * Family Stats Interface
 * Estatísticas consolidadas da família
 */
export interface FamilyStats {
  totalMembers: number;
  totalMedications: number;
  totalDosesToday: number;
  pendingDoses: number;
  takenDoses: number;
  adherenceRate: number;
  memberStats: {
    memberId: string;
    memberName: string;
    medications: number;
    adherence: number;
  }[];
}

/**
 * Family Alert Interface
 * Alertas centralizados da família
 */
export interface FamilyAlert {
  id: string;
  type: 'overdue' | 'low-stock' | 'expiring' | 'missed';
  severity: 'high' | 'medium' | 'low';
  message: string;
  member: FamilyMember;
  timestamp: Date;
  actionUrl?: string;
}

/**
 * Family Service
 * Gerencia dados agregados da família para o Family Dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyService {
  private readonly userService = inject(UserService);
  private readonly medicationService = inject(MedicationService);

  // Filter state
  private readonly _selectedMemberIds = signal<string[]>([]);
  private readonly _selectedStatuses = signal<string[]>(['pending', 'taken', 'overdue']);
  
  public readonly selectedMemberIds = this._selectedMemberIds.asReadonly();
  public readonly selectedStatuses = this._selectedStatuses.asReadonly();

  /**
   * Lista de todos os membros da família (usuário + dependentes)
   */
  public readonly familyMembers = computed<FamilyMember[]>(() => {
    const user = this.userService.currentUser();
    if (!user) return [];

    const mainUser: FamilyMember = {
      id: user.id,
      name: user.name,
      relationship: 'Você',
      avatarUrl: user.avatarUrl || '/assets/default-avatar.svg',
      isMainUser: true
    };

    const dependents: FamilyMember[] = user.dependents.map(dep => ({
      id: dep.id,
      name: dep.name,
      relationship: dep.relationship,
      avatarUrl: dep.avatarUrl || '/assets/default-avatar.svg',
      isMainUser: false
    }));

    return [mainUser, ...dependents];
  });

  /**
   * Total de membros da família
   */
  public readonly totalMembers = computed(() => this.familyMembers().length);

  /**
   * Verifica se está no modo família (tem dependentes)
   */
  public readonly isFamilyMode = computed(() => {
    const user = this.userService.currentUser();
    return user ? user.dependents.length > 0 : false;
  });

  /**
   * Todas as doses do dia de todos os membros (agregadas)
   */
  public readonly todayDoses = computed<FamilyDose[]>(() => {
    const members = this.familyMembers();
    const medications = this.medicationService.medications();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const doses: FamilyDose[] = [];

    medications.forEach((med: any) => {
      const member = members.find(m => m.id === med.userId);
      if (!member) return;

      // Generate doses for today based on medication schedule
      med.schedule.forEach((schedule: any) => {
        doses.push({
          medicationId: med.id!,
          medicationName: med.name,
          dosage: med.dosage,
          time: schedule.time,
          status: this.calculateDoseStatus(schedule.time, today),
          member,
          date: today,
          notes: schedule.notes
        });
      });
    });

    // Sort by time
    return doses.sort((a, b) => a.time.localeCompare(b.time));
  });

  /**
   * Doses filtradas (por membro e status)
   */
  public readonly filteredDoses = computed<FamilyDose[]>(() => {
    const doses = this.todayDoses();
    const selectedMembers = this._selectedMemberIds();
    const selectedStatuses = this._selectedStatuses();

    return doses.filter(dose => {
      const memberMatch = selectedMembers.length === 0 || selectedMembers.includes(dose.member.id);
      const statusMatch = selectedStatuses.includes(dose.status);
      return memberMatch && statusMatch;
    });
  });

  /**
   * Estatísticas consolidadas da família
   */
  public readonly familyStats = computed<FamilyStats>(() => {
    const members = this.familyMembers();
    const medications = this.medicationService.medications();
    const doses = this.todayDoses();

    const pendingDoses = doses.filter(d => d.status === 'pending' || d.status === 'overdue').length;
    const takenDoses = doses.filter(d => d.status === 'taken').length;
    const totalDoses = doses.length;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    // Stats por membro
    const memberStats = members.map(member => {
      const memberMedications = medications.filter((m: any) => m.userId === member.id);
      const memberDoses = doses.filter(d => d.member.id === member.id);
      const memberTaken = memberDoses.filter(d => d.status === 'taken').length;
      const memberTotal = memberDoses.length;
      const memberAdherence = memberTotal > 0 ? (memberTaken / memberTotal) * 100 : 0;

      return {
        memberId: member.id,
        memberName: member.name,
        medications: memberMedications.length,
        adherence: memberAdherence
      };
    });

    return {
      totalMembers: members.length,
      totalMedications: medications.length,
      totalDosesToday: totalDoses,
      pendingDoses,
      takenDoses,
      adherenceRate,
      memberStats
    };
  });

  /**
   * Alertas centralizados da família
   */
  public readonly familyAlerts = computed<FamilyAlert[]>(() => {
    const members = this.familyMembers();
    const medications = this.medicationService.medications();
    const doses = this.todayDoses();
    const alerts: FamilyAlert[] = [];

    // Doses atrasadas
    doses.filter(d => d.status === 'overdue').forEach((dose, index) => {
      alerts.push({
        id: `overdue-${index}`,
        type: 'overdue',
        severity: 'high',
        message: `${dose.member.name} - ${dose.medicationName} (${dose.time})`,
        member: dose.member,
        timestamp: new Date(),
        actionUrl: `/medication/${dose.medicationId}`
      });
    });

    // Estoque baixo (< 7 dias)
    medications.forEach((med: any) => {
      const member = members.find(m => m.id === med.userId);
      if (!member) return;

      const daysLeft = med.stock?.currentQuantity || 0;
      if (daysLeft > 0 && daysLeft < 7) {
        alerts.push({
          id: `low-stock-${med.id}`,
          type: 'low-stock',
          severity: daysLeft < 3 ? 'high' : 'medium',
          message: `${member.name} - ${med.name} (${daysLeft} dias restantes)`,
          member,
          timestamp: new Date(),
          actionUrl: `/medication/${med.id}`
        });
      }
    });

    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  });

  /**
   * Total de alertas
   */
  public readonly totalAlerts = computed(() => this.familyAlerts().length);

  /**
   * Alertas de alta prioridade
   */
  public readonly highPriorityAlerts = computed(() => 
    this.familyAlerts().filter(a => a.severity === 'high').length
  );

  /**
   * Atualiza filtro de membros selecionados
   */
  setSelectedMembers(memberIds: string[]): void {
    this._selectedMemberIds.set(memberIds);
  }

  /**
   * Toggle membro no filtro
   */
  toggleMemberFilter(memberId: string): void {
    const current = this._selectedMemberIds();
    if (current.includes(memberId)) {
      this._selectedMemberIds.set(current.filter(id => id !== memberId));
    } else {
      this._selectedMemberIds.set([...current, memberId]);
    }
  }

  /**
   * Limpa filtro de membros (todos)
   */
  clearMemberFilter(): void {
    this._selectedMemberIds.set([]);
  }

  /**
   * Atualiza filtro de status
   */
  setStatusFilter(statuses: string[]): void {
    this._selectedStatuses.set(statuses);
  }

  /**
   * Toggle status no filtro
   */
  toggleStatusFilter(status: string): void {
    const current = this._selectedStatuses();
    if (current.includes(status)) {
      this._selectedStatuses.set(current.filter(s => s !== status));
    } else {
      this._selectedStatuses.set([...current, status]);
    }
  }

  /**
   * Calcula status da dose baseado no horário
   */
  private calculateDoseStatus(time: string, date: Date): 'pending' | 'taken' | 'overdue' {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const doseTime = new Date(date);
    doseTime.setHours(hours, minutes, 0, 0);

    // Por simplicidade, sempre retorna pending
    // Em produção, isso deve verificar os logs de medicação
    if (now > doseTime) {
      // Check if it's more than 1 hour late
      const hoursDiff = (now.getTime() - doseTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 1 ? 'overdue' : 'pending';
    }
    
    return 'pending';
  }

  /**
   * Obtém cor do membro (para calendário e visualizações)
   */
  getMemberColor(memberId: string): string {
    const colors = [
      '#34D187', // Verde principal
      '#3B82F6', // Azul
      '#F59E0B', // Laranja
      '#EF4444', // Vermelho
      '#8B5CF6', // Roxo
      '#EC4899', // Rosa
      '#10B981', // Verde esmeralda
      '#F97316', // Laranja escuro
    ];
    
    const members = this.familyMembers();
    const index = members.findIndex(m => m.id === memberId);
    return colors[index % colors.length];
  }

  /**
   * Obtém iniciais do nome
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}

