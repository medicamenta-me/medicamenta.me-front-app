import { Injectable, inject, computed, signal } from '@angular/core';
import { FamilyService } from './family.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { Dose } from '../models/medication.model';

/**
 * Representa um dia no calendário com informações agregadas
 */
export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  doses: DoseSummary[];
  memberColors: string[]; // Cores dos membros com doses neste dia
  hasTaken: boolean;
  hasMissed: boolean;
  hasPending: boolean;
  totalDoses: number;
  takenCount: number;
  missedCount: number;
  pendingCount: number;
}

/**
 * Resumo de dose para um dia
 */
export interface DoseSummary {
  medicationId: string;
  medicationName: string;
  memberName: string;
  memberColor: string;
  time: string;
  status: Dose['status'] | 'pending';
  dosage: string;
  notes?: string;
}

/**
 * Dados de um mês completo
 */
export interface MonthData {
  year: number;
  month: number; // 0-11
  monthName: string;
  days: CalendarDay[];
  totalDays: number;
  activeMemberCount: number;
}

/**
 * Detalhes expandidos de um dia
 */
export interface DayDetail {
  date: Date;
  dateString: string;
  doses: DoseSummary[];
  summaryText: string;
  takenCount: number;
  missedCount: number;
  pendingCount: number;
}

/**
 * Filtro de membros ativos
 */
export interface MemberFilter {
  memberId: string;
  memberName: string;
  color: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FamilyCalendarService {
  private readonly familyService = inject(FamilyService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);

  // Estado do calendário
  private readonly _currentYear = signal<number>(new Date().getFullYear());
  private readonly _currentMonth = signal<number>(new Date().getMonth());
  private readonly _memberFilters = signal<MemberFilter[]>([]);

  // Getters públicos
  currentYear = this._currentYear.asReadonly();
  currentMonth = this._currentMonth.asReadonly();
  memberFilters = this._memberFilters.asReadonly();

  constructor() {
    this.initializeMemberFilters();
  }

  /**
   * Inicializa filtros de membros baseado na família
   */
  private initializeMemberFilters(): void {
    const members = this.familyService.familyMembers();
    const filters: MemberFilter[] = members.map(member => ({
      memberId: member.id,
      memberName: member.name,
      color: this.familyService.getMemberColor(member.id),
      active: true // Todos ativos por padrão
    }));
    this._memberFilters.set(filters);
  }

  /**
   * Dados do mês atual
   */
  monthData = computed<MonthData>(() => {
    const year = this._currentYear();
    const month = this._currentMonth();
    const filters = this._memberFilters();
    const activeMemberIds = filters.filter(f => f.active).map(f => f.memberId);

    return this.generateMonthData(year, month, activeMemberIds);
  });

  /**
   * Membros ativos (filtrados)
   */
  activeMembers = computed(() => {
    return this._memberFilters().filter(f => f.active);
  });

  /**
   * Gera dados completos de um mês
   */
  private generateMonthData(year: number, month: number, activeMemberIds: string[]): MonthData {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Determinar dia da semana do primeiro dia (0 = Domingo)
    const startDayOfWeek = firstDay.getDay();
    
    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = startDayOfWeek;
    
    // Dias do próximo mês para completar 6 semanas (42 dias)
    const totalCells = 42;
    const nextMonthDays = totalCells - (prevMonthDays + daysInMonth);

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dias do mês anterior
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(this.createCalendarDay(date, false, activeMemberIds, today));
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(this.createCalendarDay(date, true, activeMemberIds, today));
    }

    // Dias do próximo mês
    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push(this.createCalendarDay(date, false, activeMemberIds, today));
    }

    return {
      year,
      month,
      monthName: this.getMonthName(month),
      days,
      totalDays: daysInMonth,
      activeMemberCount: activeMemberIds.length
    };
  }

  /**
   * Cria objeto CalendarDay para uma data específica
   */
  private createCalendarDay(
    date: Date,
    isCurrentMonth: boolean,
    activeMemberIds: string[],
    today: Date
  ): CalendarDay {
    const doses = this.getDosesForDate(date, activeMemberIds);
    const memberColors = [...new Set(doses.map(d => d.memberColor))];
    
    const takenCount = doses.filter(d => d.status === 'taken').length;
    const missedCount = doses.filter(d => d.status === 'missed').length;
    const pendingCount = doses.filter(d => d.status === 'pending' || d.status === 'upcoming').length;

    return {
      date,
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      isCurrentMonth,
      doses,
      memberColors,
      hasTaken: takenCount > 0,
      hasMissed: missedCount > 0,
      hasPending: pendingCount > 0,
      totalDoses: doses.length,
      takenCount,
      missedCount,
      pendingCount
    };
  }

  /**
   * Obtém todas as doses para uma data específica
   */
  private getDosesForDate(date: Date, activeMemberIds: string[]): DoseSummary[] {
    const dateStr = this.formatDateKey(date);
    const allDoses: DoseSummary[] = [];

    // Iterar sobre membros ativos
    for (const memberId of activeMemberIds) {
      const medications = this.medicationService.medications().filter(
        m => m.userId === memberId && !m.isArchived && !m.isCompleted
      );

      for (const medication of medications) {
        const memberName = this.familyService.familyMembers().find(m => m.id === memberId)?.name || 'Desconhecido';
        const memberColor = this.familyService.getMemberColor(memberId);

        // Verificar se medicação estava ativa nesta data
        if (!this.isMedicationActiveOnDate(medication, date)) {
          continue;
        }

        // Obter doses do dia
        const dayDoses = this.getScheduleDosesForDate(medication, dateStr, memberName, memberColor);
        allDoses.push(...dayDoses);
      }
    }

    // Ordenar por horário
    return allDoses.sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Verifica se medicação estava ativa em uma data
   */
  private isMedicationActiveOnDate(medication: any, date: Date): boolean {
    if (!medication.startDate) return true;

    const medStartDate = new Date(medication.startDate);
    medStartDate.setHours(0, 0, 0, 0);
    
    if (medication.endDate) {
      const medEndDate = new Date(medication.endDate);
      medEndDate.setHours(23, 59, 59, 999);
      return date >= medStartDate && date <= medEndDate;
    }
    
    return date >= medStartDate;
  }

  /**
   * Obtém doses agendadas para uma data específica
   */
  private getScheduleDosesForDate(
    medication: any,
    dateStr: string,
    memberName: string,
    memberColor: string
  ): DoseSummary[] {
    const doses: DoseSummary[] = [];
    
    // Caso schedule seja array de doses (formato antigo) - verificar primeiro!
    if (Array.isArray(medication.schedule)) {
      for (const dose of medication.schedule) {
        doses.push({
          medicationId: medication.id,
          medicationName: medication.name,
          memberName,
          memberColor,
          time: dose.time,
          status: dose.status === 'upcoming' ? 'pending' : dose.status,
          dosage: medication.dosage,
          notes: dose.notes
        });
      }
    }
    // Verificar se há schedule como objeto indexado por data
    else if (medication.schedule && typeof medication.schedule === 'object') {
      const daySchedule = (medication.schedule as any)[dateStr];
      if (Array.isArray(daySchedule)) {
        for (const dose of daySchedule) {
          doses.push({
            medicationId: medication.id,
            medicationName: medication.name,
            memberName,
            memberColor,
            time: dose.time,
            status: dose.status === 'upcoming' ? 'pending' : dose.status,
            dosage: medication.dosage,
            notes: dose.notes
          });
        }
      }
    }

    return doses;
  }

  /**
   * Obtém detalhes completos de um dia
   */
  getDayDetails(date: Date): DayDetail {
    const activeMemberIds = this._memberFilters()
      .filter(f => f.active)
      .map(f => f.memberId);
    
    const doses = this.getDosesForDate(date, activeMemberIds);
    const takenCount = doses.filter(d => d.status === 'taken').length;
    const missedCount = doses.filter(d => d.status === 'missed').length;
    const pendingCount = doses.filter(d => d.status === 'pending' || d.status === 'upcoming').length;

    const summaryText = this.buildSummaryText(doses.length, takenCount, missedCount, pendingCount);

    return {
      date,
      dateString: this.formatDateFull(date),
      doses,
      summaryText,
      takenCount,
      missedCount,
      pendingCount
    };
  }

  /**
   * Constrói texto de resumo
   */
  private buildSummaryText(total: number, taken: number, missed: number, pending: number): string {
    if (total === 0) {
      return 'Nenhuma dose agendada';
    }
    
    const parts = [];
    if (taken > 0) parts.push(`${taken} tomada${taken > 1 ? 's' : ''}`);
    if (missed > 0) parts.push(`${missed} perdida${missed > 1 ? 's' : ''}`);
    if (pending > 0) parts.push(`${pending} pendente${pending > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  }

  /**
   * Navega para o mês anterior
   */
  previousMonth(): void {
    const currentMonth = this._currentMonth();
    if (currentMonth === 0) {
      this._currentMonth.set(11);
      this._currentYear.update(y => y - 1);
    } else {
      this._currentMonth.update(m => m - 1);
    }
  }

  /**
   * Navega para o próximo mês
   */
  nextMonth(): void {
    const currentMonth = this._currentMonth();
    if (currentMonth === 11) {
      this._currentMonth.set(0);
      this._currentYear.update(y => y + 1);
    } else {
      this._currentMonth.update(m => m + 1);
    }
  }

  /**
   * Volta para o mês atual
   */
  goToToday(): void {
    const today = new Date();
    this._currentYear.set(today.getFullYear());
    this._currentMonth.set(today.getMonth());
  }

  /**
   * Toggle filtro de membro
   */
  toggleMemberFilter(memberId: string): void {
    this._memberFilters.update(filters => 
      filters.map(f => 
        f.memberId === memberId ? { ...f, active: !f.active } : f
      )
    );
  }

  /**
   * Ativa todos os membros
   */
  showAllMembers(): void {
    this._memberFilters.update(filters =>
      filters.map(f => ({ ...f, active: true }))
    );
  }

  /**
   * Desativa todos os membros
   */
  hideAllMembers(): void {
    this._memberFilters.update(filters =>
      filters.map(f => ({ ...f, active: false }))
    );
  }

  /**
   * Formata data como chave (YYYY-MM-DD)
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formata data completa (DD de MMMM de YYYY)
   */
  private formatDateFull(date: Date): string {
    const day = date.getDate();
    const month = this.getMonthName(date.getMonth());
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  /**
   * Obtém nome do mês
   */
  private getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month];
  }

  /**
   * Obtém nome abreviado do dia da semana
   */
  getDayName(dayIndex: number): string {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayIndex];
  }
}

