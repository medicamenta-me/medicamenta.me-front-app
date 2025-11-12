import { Injectable } from '@angular/core';

/**
 * Tipos de templates de relatório disponíveis
 */
export type ReportTemplateType = 'medical-consultation' | 'family-report' | 'caregiver-audit';

/**
 * Seções que podem ser incluídas no relatório
 */
export interface ReportSection {
  id: string;
  name: string;
  enabled: boolean;
  required: boolean;
}

/**
 * Template de relatório
 */
export interface ReportTemplate {
  id: ReportTemplateType;
  name: string;
  description: string;
  sections: ReportSection[];
  color: string; // Cor primária do template
  icon: string; // Ícone Ionic
}

/**
 * Configuração de seções do relatório
 */
export const REPORT_SECTIONS = {
  PATIENT_INFO: 'patient-info',
  ACTIVE_MEDICATIONS: 'active-medications',
  ADHERENCE_CHART: 'adherence-chart',
  ADHERENCE_TABLE: 'adherence-table',
  CRITICAL_EVENTS: 'critical-events',
  SCHEDULE_HISTORY: 'schedule-history',
  MEDICATION_CHANGES: 'medication-changes',
  CAREGIVER_NOTES: 'caregiver-notes',
  STATISTICS: 'statistics',
  RECOMMENDATIONS: 'recommendations'
};

/**
 * Service para gerenciar templates de relatórios
 * 
 * Templates disponíveis:
 * 1. Consulta Médica - Relatório completo para apresentar ao médico
 * 2. Relatório Familiar - Resumo para compartilhar com familiares
 * 3. Auditoria de Cuidador - Relatório detalhado de aderência e eventos
 */
@Injectable({
  providedIn: 'root'
})
export class ReportTemplatesService {
  
  private templates: ReportTemplate[] = [
    {
      id: 'medical-consultation',
      name: 'Consulta Médica',
      description: 'Relatório completo para apresentar ao médico',
      color: '#3880ff',
      icon: 'medkit',
      sections: [
        {
          id: REPORT_SECTIONS.PATIENT_INFO,
          name: 'Dados do Paciente',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ACTIVE_MEDICATIONS,
          name: 'Medicamentos Ativos',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ADHERENCE_CHART,
          name: 'Gráfico de Aderência',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.ADHERENCE_TABLE,
          name: 'Tabela de Aderência',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.CRITICAL_EVENTS,
          name: 'Eventos Críticos',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.MEDICATION_CHANGES,
          name: 'Alterações de Medicamentos',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.STATISTICS,
          name: 'Estatísticas',
          enabled: true,
          required: false
        }
      ]
    },
    {
      id: 'family-report',
      name: 'Relatório Familiar',
      description: 'Resumo para compartilhar com familiares',
      color: '#10dc60',
      icon: 'people',
      sections: [
        {
          id: REPORT_SECTIONS.PATIENT_INFO,
          name: 'Dados do Paciente',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ACTIVE_MEDICATIONS,
          name: 'Medicamentos Ativos',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ADHERENCE_CHART,
          name: 'Gráfico de Aderência',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.SCHEDULE_HISTORY,
          name: 'Histórico de Horários',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.CAREGIVER_NOTES,
          name: 'Observações do Cuidador',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.STATISTICS,
          name: 'Estatísticas',
          enabled: false,
          required: false
        }
      ]
    },
    {
      id: 'caregiver-audit',
      name: 'Auditoria de Cuidador',
      description: 'Relatório detalhado de aderência e eventos',
      color: '#ffce00',
      icon: 'clipboard',
      sections: [
        {
          id: REPORT_SECTIONS.PATIENT_INFO,
          name: 'Dados do Paciente',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ACTIVE_MEDICATIONS,
          name: 'Medicamentos Ativos',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.ADHERENCE_TABLE,
          name: 'Tabela de Aderência',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.CRITICAL_EVENTS,
          name: 'Eventos Críticos',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.SCHEDULE_HISTORY,
          name: 'Histórico de Horários',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.MEDICATION_CHANGES,
          name: 'Alterações de Medicamentos',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.CAREGIVER_NOTES,
          name: 'Observações do Cuidador',
          enabled: true,
          required: true
        },
        {
          id: REPORT_SECTIONS.STATISTICS,
          name: 'Estatísticas',
          enabled: true,
          required: false
        },
        {
          id: REPORT_SECTIONS.RECOMMENDATIONS,
          name: 'Recomendações',
          enabled: true,
          required: false
        }
      ]
    }
  ];

  constructor() {}

  /**
   * Obtém todos os templates disponíveis
   */
  getTemplates(): ReportTemplate[] {
    return [...this.templates];
  }

  /**
   * Obtém um template específico por ID
   */
  getTemplate(id: ReportTemplateType): ReportTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  /**
   * Obtém template padrão (Consulta Médica)
   */
  getDefaultTemplate(): ReportTemplate {
    return this.templates[0];
  }

  /**
   * Cria template customizado baseado em um existente
   */
  createCustomTemplate(baseTemplateId: ReportTemplateType, customSections: string[]): ReportTemplate {
    const baseTemplate = this.getTemplate(baseTemplateId);
    
    if (!baseTemplate) {
      return this.getDefaultTemplate();
    }

    // Clonar template base
    const customTemplate: ReportTemplate = {
      ...baseTemplate,
      sections: baseTemplate.sections.map(section => ({
        ...section,
        enabled: section.required || customSections.includes(section.id)
      }))
    };

    return customTemplate;
  }

  /**
   * Valida se o template tem todas as seções obrigatórias habilitadas
   */
  validateTemplate(template: ReportTemplate): { valid: boolean; missingRequired: string[] } {
    const missingRequired = template.sections
      .filter(s => s.required && !s.enabled)
      .map(s => s.name);

    return {
      valid: missingRequired.length === 0,
      missingRequired
    };
  }

  /**
   * Obtém seções habilitadas de um template
   */
  getEnabledSections(template: ReportTemplate): ReportSection[] {
    return template.sections.filter(s => s.enabled);
  }

  /**
   * Conta quantas seções estão habilitadas
   */
  countEnabledSections(template: ReportTemplate): number {
    return template.sections.filter(s => s.enabled).length;
  }

  /**
   * Obtém nome da seção por ID
   */
  getSectionName(sectionId: string): string {
    const sectionNames: { [key: string]: string } = {
      [REPORT_SECTIONS.PATIENT_INFO]: 'Dados do Paciente',
      [REPORT_SECTIONS.ACTIVE_MEDICATIONS]: 'Medicamentos Ativos',
      [REPORT_SECTIONS.ADHERENCE_CHART]: 'Gráfico de Aderência',
      [REPORT_SECTIONS.ADHERENCE_TABLE]: 'Tabela de Aderência',
      [REPORT_SECTIONS.CRITICAL_EVENTS]: 'Eventos Críticos',
      [REPORT_SECTIONS.SCHEDULE_HISTORY]: 'Histórico de Horários',
      [REPORT_SECTIONS.MEDICATION_CHANGES]: 'Alterações de Medicamentos',
      [REPORT_SECTIONS.CAREGIVER_NOTES]: 'Observações do Cuidador',
      [REPORT_SECTIONS.STATISTICS]: 'Estatísticas',
      [REPORT_SECTIONS.RECOMMENDATIONS]: 'Recomendações'
    };

    return sectionNames[sectionId] || sectionId;
  }
}

