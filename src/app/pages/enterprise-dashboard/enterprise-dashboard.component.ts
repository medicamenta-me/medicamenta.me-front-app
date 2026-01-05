import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { EnterpriseService } from '../../services/enterprise.service';
import { UserService } from '../../services/user.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import {
  MultiPatientDashboardItem,
  MultiPatientFilters,
  MultiPatientStats,
  TeamMember
} from '../../models/enterprise.model';

/**
 * Enterprise Dashboard Component
 * 
 * Dashboard multi-paciente para organizações Enterprise
 * Suporta 100+ pacientes com:
 * - Virtual scrolling
 * - Filtros avançados
 * - Search
 * - Paginação
 * - Métricas agregadas
 * - Real-time updates
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */
@Component({
  selector: 'app-enterprise-dashboard',
  templateUrl: './enterprise-dashboard.component.html',
  styleUrls: ['./enterprise-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule]
})
export class EnterpriseDashboardComponent implements OnInit {
  private readonly enterpriseService = inject(EnterpriseService);
  private readonly userService = inject(UserService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  // Signals
  protected readonly patients = signal<MultiPatientDashboardItem[]>([]);
  protected readonly stats = this.enterpriseService.multiPatientStats;
  protected readonly organization = this.enterpriseService.currentOrganization;
  protected readonly teamMembers = this.enterpriseService.teamMembers;
  protected readonly isLoading = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedDepartment = signal<string | undefined>(undefined);
  protected readonly selectedTeamMember = signal<string | undefined>(undefined);
  protected readonly selectedAdherenceLevel = signal<'excellent' | 'good' | 'moderate' | 'poor' | undefined>(undefined);
  protected readonly showAlertsOnly = signal(false);
  protected readonly showLowStockOnly = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(50);
  protected readonly sortBy = signal<'name' | 'adherence' | 'alerts' | 'lastUpdate'>('name');
  protected readonly sortOrder = signal<'asc' | 'desc'>('asc');

  // Computed
  protected readonly totalPages = computed(() => {
    const total = this.stats()?.totalPatients || 0;
    return Math.ceil(total / this.pageSize());
  });

  protected readonly departments = computed(() => {
    const members = this.teamMembers();
    const depts = new Set<string>();
    members.forEach(m => {
      if (m.department) depts.add(m.department);
    });
    return Array.from(depts).sort();
  });

  protected readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchTerm() ||
      this.selectedDepartment() ||
      this.selectedTeamMember() ||
      this.selectedAdherenceLevel() ||
      this.showAlertsOnly() ||
      this.showLowStockOnly()
    );
  });

  async ngOnInit() {
    // Verificar se usuário tem acesso
    if (!this.enterpriseService.isEnterprise()) {
      await this.router.navigate(['/tabs/dashboard']);
      return;
    }

    if (!this.enterpriseService.hasFeature('multiPatientDashboard')) {
      await this.router.navigate(['/tabs/dashboard']);
      return;
    }

    await this.loadData();
  }

  /**
   * Carrega dados do dashboard
   */
  async loadData() {
    this.isLoading.set(true);

    try {
      // Carregar estatísticas agregadas
      await this.enterpriseService.calculateMultiPatientStats();

      // Carregar pacientes com filtros
      await this.loadPatients();

    } catch (error) {
      console.error('[EnterpriseDashboard] Error loading data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Carrega lista de pacientes com filtros
   */
  async loadPatients() {
    const filters: MultiPatientFilters = {
      search: this.searchTerm() || undefined,
      department: this.selectedDepartment(),
      assignedTo: this.selectedTeamMember(),
      adherenceLevel: this.selectedAdherenceLevel(),
      hasAlerts: this.showAlertsOnly() || undefined,
      hasLowStock: this.showLowStockOnly() || undefined,
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    const result = await this.enterpriseService.getMultiPatientDashboard(filters);
    this.patients.set(result.items);
  }

  /**
   * Aplica filtros
   */
  async applyFilters() {
    this.currentPage.set(1); // Reset para primeira página
    await this.loadPatients();
  }

  /**
   * Limpa todos os filtros
   */
  async clearFilters() {
    this.searchTerm.set('');
    this.selectedDepartment.set(undefined);
    this.selectedTeamMember.set(undefined);
    this.selectedAdherenceLevel.set(undefined);
    this.showAlertsOnly.set(false);
    this.showLowStockOnly.set(false);
    this.currentPage.set(1);
    await this.loadPatients();
  }

  /**
   * Muda página
   */
  async changePage(direction: 'prev' | 'next') {
    const current = this.currentPage();
    const total = this.totalPages();

    if (direction === 'prev' && current > 1) {
      this.currentPage.set(current - 1);
    } else if (direction === 'next' && current < total) {
      this.currentPage.set(current + 1);
    }

    await this.loadPatients();
  }

  /**
   * Muda ordenação
   */
  async changeSort(field: 'name' | 'adherence' | 'alerts' | 'lastUpdate') {
    if (this.sortBy() === field) {
      // Toggle order
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }

    await this.loadPatients();
  }

  /**
   * Navega para detalhes do paciente
   * Seleciona o paciente e redireciona para o dashboard principal
   */
  async viewPatient(patient: MultiPatientDashboardItem) {
    try {
      // Verificar se o paciente está disponível na lista de pacientes selecionáveis
      const availablePatients = this.patientSelectorService.availablePatients();
      const targetPatient = availablePatients.find(p => p.userId === patient.patientId);
      
      if (targetPatient) {
        // Selecionar o paciente via PatientSelectorService
        this.patientSelectorService.setActivePatient(patient.patientId);
        
        // Navegar para o dashboard principal (onde o contexto do paciente será exibido)
        await this.router.navigate(['/tabs/dashboard']);
      } else {
        console.warn('[EnterpriseDashboard] Patient not available in selector:', patient.patientId);
        
        // Paciente pode não estar na rede de cuidados do usuário atual
        // Mostrar mensagem informativa
        alert(`Você não tem permissão para visualizar detalhes deste paciente (${patient.patientName}). Apenas pacientes na sua rede de cuidados podem ser acessados.`);
      }
    } catch (error) {
      console.error('[EnterpriseDashboard] Error navigating to patient:', error);
      alert(this.translate.instant('ENTERPRISE_DASHBOARD.PATIENT_DETAILS_ERROR'));
    }
  }

  /**
   * Retorna cor baseada no nível de aderência
   */
  getAdherenceColor(level: 'excellent' | 'good' | 'moderate' | 'poor'): string {
    const colors = {
      excellent: 'success',
      good: 'primary',
      moderate: 'warning',
      poor: 'danger'
    };
    return colors[level];
  }

  /**
   * Retorna cor baseada na severidade do alerta
   */
  getSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'medium',
      medium: 'warning',
      high: 'danger',
      critical: 'danger'
    };
    return colors[severity];
  }

  /**
   * Formata porcentagem
   */
  formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  /**
   * Retorna ícone do role
   */
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      admin: 'shield-checkmark',
      manager: 'briefcase',
      nurse: 'medkit',
      caregiver: 'heart',
      doctor: 'fitness',
      pharmacist: 'flask',
      viewer: 'eye'
    };
    return icons[role] || 'person';
  }

  /**
   * Atualiza dados (pull to refresh)
   */
  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }
}
