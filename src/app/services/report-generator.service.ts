import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import { ReportTemplate, REPORT_SECTIONS } from './report-templates.service';
import { LogService } from './log.service';
import { Medication } from '../models/medication.model';

// Dynamic imports for heavy libraries (bundle optimization)
const loadJsPDF = () => import('jspdf').then(m => m.jsPDF);
const loadAutoTable = () => import('jspdf-autotable').then(m => m.default);
const loadChartJS = () => import('chart.js/auto').then(m => m.Chart);

/**
 * Dados do paciente para o relatório
 */
export interface PatientData {
  name: string;
  age?: number;
  gender?: string;
  email?: string;
  phone?: string;
  document?: string; // CPF ou RG
  address?: string;
}

/**
 * Evento crítico
 */
export interface CriticalEvent {
  date: Date;
  type: 'missed' | 'late' | 'early' | 'wrong-dose';
  medicationName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Histórico de alteração de medicamento
 */
export interface MedicationChange {
  date: Date;
  medicationName: string;
  type: 'added' | 'removed' | 'modified';
  description: string;
}

/**
 * Observação do cuidador
 */
export interface CaregiverNote {
  date: Date;
  author: string;
  note: string;
  category?: 'general' | 'medication' | 'health' | 'behavior';
}

/**
 * Dados de aderência
 */
export interface AdherenceData {
  date: string; // YYYY-MM-DD
  taken: number;
  total: number;
  percentage: number;
}

/**
 * Configuração de relatório (sistema antigo - HTML/CSV)
 */
export interface ReportConfig {
  type: 'medical' | 'family' | 'caregiver' | 'complete';
  period: 'week' | 'month' | 'year' | 'all';
  includeGraphs: boolean;
  includeMedications: boolean;
  includeAdherence: boolean;
  includePatterns: boolean;
  includeStock: boolean;
  notes?: string;
}

/**
 * Configuração para geração do relatório PDF profissional
 */
export interface ProfessionalReportConfig {
  template: ReportTemplate;
  patient: PatientData;
  period: {
    start: Date;
    end: Date;
  };
  medications: Medication[];
  adherenceData: AdherenceData[];
  criticalEvents: CriticalEvent[];
  medicationChanges: MedicationChange[];
  caregiverNotes: CaregiverNote[];
  statistics?: {
    totalMedications: number;
    activeMedications: number;
    overallAdherence: number;
    missedDoses: number;
    onTimeDoses: number;
    lateDoses: number;
  };
  customLogo?: string; // Base64 image
}

/**
 * Service para gerar relatórios médicos em PDF
 * 
 * Funcionalidades:
 * - Gera PDFs profissionais com logo e branding
 * - Inclui gráficos de aderência (Chart.js)
 * - Tabelas de medicamentos ativos
 * - Histórico de eventos críticos
 * - Observações do cuidador
 * - Templates customizáveis
 */
@Injectable({
  providedIn: 'root'
})
export class ReportGeneratorService {
  private readonly logService = new LogService();
  
  private readonly PRIMARY_COLOR = '#3880ff';
  private readonly SECONDARY_COLOR = '#5260ff';
  private readonly SUCCESS_COLOR = '#10dc60';
  private readonly WARNING_COLOR = '#ffce00';
  private readonly DANGER_COLOR = '#f04141';
  
  // Cached dynamic imports
  private autoTableFn: typeof import('jspdf-autotable').default | null = null;
  private ChartJS: typeof import('chart.js/auto').Chart | null = null;
  
  constructor() {}
  
  /**
   * Load autoTable dynamically (cached)
   */
  private async getAutoTable() {
    if (!this.autoTableFn) {
      this.autoTableFn = await loadAutoTable();
    }
    return this.autoTableFn;
  }
  
  /**
   * Load Chart.js dynamically (cached)
   */
  private async getChartJS() {
    if (!this.ChartJS) {
      this.ChartJS = await loadChartJS();
    }
    return this.ChartJS;
  }

  /**
   * Gera PDF do relatório
   */
  async generatePDF(config: ProfessionalReportConfig): Promise<Blob> {
    // Dynamic import of jsPDF for bundle optimization
    const jsPDFClass = await loadJsPDF();
    const autoTable = await this.getAutoTable();
    
    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let currentY = 20;

    // Header com logo e título
    currentY = this.addHeader(doc, config, currentY);

    // Adicionar seções conforme template
    const enabledSections = config.template.sections.filter(s => s.enabled);

    for (const section of enabledSections) {
      switch (section.id) {
        case REPORT_SECTIONS.PATIENT_INFO:
          currentY = await this.addPatientInfo(doc, autoTable, config.patient, currentY);
          break;
        case REPORT_SECTIONS.ACTIVE_MEDICATIONS:
          currentY = await this.addActiveMedications(doc, autoTable, config.medications, currentY);
          break;
        case REPORT_SECTIONS.ADHERENCE_CHART:
          currentY = await this.addAdherenceChart(doc, config.adherenceData, currentY);
          break;
        case REPORT_SECTIONS.ADHERENCE_TABLE:
          currentY = await this.addAdherenceTable(doc, autoTable, config.adherenceData, currentY);
          break;
        case REPORT_SECTIONS.CRITICAL_EVENTS:
          currentY = await this.addCriticalEvents(doc, autoTable, config.criticalEvents, currentY);
          break;
        case REPORT_SECTIONS.MEDICATION_CHANGES:
          currentY = await this.addMedicationChanges(doc, autoTable, config.medicationChanges, currentY);
          break;
        case REPORT_SECTIONS.CAREGIVER_NOTES:
          currentY = await this.addCaregiverNotes(doc, autoTable, config.caregiverNotes, currentY);
          break;
        case REPORT_SECTIONS.STATISTICS:
          currentY = await this.addStatistics(doc, autoTable, config.statistics, currentY);
          break;
      }
    }

    // Footer
    this.addFooter(doc);

    return doc.output('blob');
  }

  /**
   * Adiciona header com logo e título
   */
  private addHeader(doc: jsPDF, config: ProfessionalReportConfig, startY: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo (se fornecido)
    if (config.customLogo) {
      try {
        doc.addImage(config.customLogo, 'PNG', 15, startY - 5, 25, 25);
      } catch (error: any) {
        this.logService.error('ReportGenerator', 'Erro ao adicionar logo', error as Error);
      }
    }

    // Título
    doc.setFontSize(20);
    doc.setTextColor(this.PRIMARY_COLOR);
    doc.text('Medicamenta.me', config.customLogo ? 45 : 15, startY);

    // Subtítulo - Nome do template
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(config.template.name, config.customLogo ? 45 : 15, startY + 7);

    // Período do relatório
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const periodText = `Período: ${this.formatDate(config.period.start)} a ${this.formatDate(config.period.end)}`;
    doc.text(periodText, config.customLogo ? 45 : 15, startY + 13);

    // Data de geração (lado direito)
    const generatedText = `Gerado em: ${this.formatDate(new Date())}`;
    const textWidth = doc.getTextWidth(generatedText);
    doc.text(generatedText, pageWidth - textWidth - 15, startY);

    // Linha separadora
    doc.setDrawColor(this.PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(15, startY + 18, pageWidth - 15, startY + 18);

    return startY + 25;
  }

  /**
   * Adiciona informações do paciente
   */
  private async addPatientInfo(doc: jsPDF, autoTable: any, patient: PatientData, startY: number): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    this.addSectionTitle(doc, 'Dados do Paciente', startY);
    startY += 10;

    const data: string[][] = [];

    if (patient.name) data.push(['Nome', patient.name]);
    if (patient.age) data.push(['Idade', `${patient.age} anos`]);
    if (patient.gender) data.push(['Sexo', patient.gender]);
    if (patient.document) data.push(['Documento', patient.document]);
    if (patient.email) data.push(['Email', patient.email]);
    if (patient.phone) data.push(['Telefone', patient.phone]);
    if (patient.address) data.push(['Endereço', patient.address]);

    autoTable(doc, {
      startY: startY,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: pageWidth - 70 }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona tabela de medicamentos ativos
   */
  private async addActiveMedications(doc: jsPDF, autoTable: any, medications: Medication[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Medicamentos Ativos', startY);
    startY += 10;

    const activeMeds = medications.filter(m => !m.isArchived && !m.isCompleted);

    if (activeMeds.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum medicamento ativo no período.', 15, startY);
      return startY + 10;
    }

    const tableData = activeMeds.map(med => [
      med.name,
      med.dosage || '-',
      med.frequency || '-',
      med.schedule?.map(d => d.time).join(', ') || '-',
      med.notes || '-'
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Medicamento', 'Dosagem', 'Frequência', 'Horários', 'Instruções']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.PRIMARY_COLOR,
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona gráfico de aderência
   */
  private async addAdherenceChart(doc: jsPDF, adherenceData: AdherenceData[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Gráfico de Aderência', startY);
    startY += 10;

    if (adherenceData.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Sem dados de aderência no período.', 15, startY);
      return startY + 10;
    }

    try {
      // Dynamic import Chart.js for bundle optimization
      const Chart = await this.getChartJS();
      
      // Criar canvas temporário para o Chart.js
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;

      const ctx = canvas.getContext('2d');
      if (!ctx) return startY;

      // Criar gráfico
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: adherenceData.map(d => this.formatDate(new Date(d.date))),
          datasets: [{
            label: 'Aderência (%)',
            data: adherenceData.map(d => d.percentage),
            borderColor: this.PRIMARY_COLOR,
            backgroundColor: this.PRIMARY_COLOR + '20',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: true },
            title: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => value + '%'
              }
            }
          }
        }
      });

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 100));

      // Converter canvas para imagem
      const chartImage = canvas.toDataURL('image/png');

      // Adicionar ao PDF
      const pageWidth = doc.internal.pageSize.getWidth();
      const chartWidth = pageWidth - 30;
      const chartHeight = (chartWidth * 400) / 800;

      // Checar se precisa de nova página
      if (startY + chartHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        startY = 20;
      }

      doc.addImage(chartImage, 'PNG', 15, startY, chartWidth, chartHeight);

      // Destruir chart
      chart.destroy();
      canvas.remove();

      return startY + chartHeight + 10;
    } catch (error: any) {
      this.logService.error('ReportGenerator', 'Erro ao gerar gráfico', error as Error);
      doc.setFontSize(10);
      doc.setTextColor(this.DANGER_COLOR);
      doc.text('Erro ao gerar gráfico de aderência.', 15, startY);
      return startY + 10;
    }
  }

  /**
   * Adiciona tabela de aderência
   */
  private async addAdherenceTable(doc: jsPDF, autoTable: any, adherenceData: AdherenceData[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Tabela de Aderência', startY);
    startY += 10;

    if (adherenceData.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Sem dados de aderência no período.', 15, startY);
      return startY + 10;
    }

    const tableData = adherenceData.map(d => [
      this.formatDate(new Date(d.date)),
      d.taken.toString(),
      d.total.toString(),
      `${d.percentage.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Data', 'Tomados', 'Total', 'Aderência']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.SUCCESS_COLOR,
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona eventos críticos
   */
  private async addCriticalEvents(doc: jsPDF, autoTable: any, events: CriticalEvent[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Eventos Críticos', startY);
    startY += 10;

    if (events.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhum evento crítico registrado no período.', 15, startY);
      return startY + 10;
    }

    const tableData = events.map(e => [
      this.formatDate(e.date),
      this.translateEventType(e.type),
      e.medicationName,
      e.description,
      this.translateSeverity(e.severity)
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Data', 'Tipo', 'Medicamento', 'Descrição', 'Gravidade']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.DANGER_COLOR,
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25, halign: 'center' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona alterações de medicamentos
   */
  private async addMedicationChanges(doc: jsPDF, autoTable: any, changes: MedicationChange[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Alterações de Medicamentos', startY);
    startY += 10;

    if (changes.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma alteração de medicamento no período.', 15, startY);
      return startY + 10;
    }

    const tableData = changes.map(c => [
      this.formatDate(c.date),
      this.translateChangeType(c.type),
      c.medicationName,
      c.description
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Data', 'Tipo', 'Medicamento', 'Descrição']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.WARNING_COLOR,
        textColor: 0,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 'auto' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona observações do cuidador
   */
  private async addCaregiverNotes(doc: jsPDF, autoTable: any, notes: CaregiverNote[], startY: number): Promise<number> {
    this.addSectionTitle(doc, 'Observações do Cuidador', startY);
    startY += 10;

    if (notes.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma observação registrada no período.', 15, startY);
      return startY + 10;
    }

    const tableData = notes.map(n => [
      this.formatDate(n.date),
      n.author,
      n.category ? this.translateCategory(n.category) : '-',
      n.note
    ]);

    autoTable(doc, {
      startY: startY,
      head: [['Data', 'Autor', 'Categoria', 'Observação']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.SECONDARY_COLOR,
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona estatísticas
   */
  private async addStatistics(doc: jsPDF, autoTable: any, statistics: any, startY: number): Promise<number> {
    if (!statistics) return startY;

    this.addSectionTitle(doc, 'Estatísticas do Período', startY);
    startY += 10;

    const data: string[][] = [
      ['Total de Medicamentos', statistics.totalMedications?.toString() || '0'],
      ['Medicamentos Ativos', statistics.activeMedications?.toString() || '0'],
      ['Aderência Geral', `${statistics.overallAdherence?.toFixed(1) || 0}%`],
      ['Doses Tomadas', statistics.onTimeDoses?.toString() || '0'],
      ['Doses Atrasadas', statistics.lateDoses?.toString() || '0'],
      ['Doses Perdidas', statistics.missedDoses?.toString() || '0']
    ];

    autoTable(doc, {
      startY: startY,
      head: [],
      body: data,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto', halign: 'right' }
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona título de seção
   */
  private addSectionTitle(doc: jsPDF, title: string, y: number): void {
    const pageHeight = doc.internal.pageSize.getHeight();

    // Nova página se necessário
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(this.PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, y);
    doc.setFont('helvetica', 'normal');
  }

  /**
   * Adiciona footer em todas as páginas
   */
  private addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      
      // Texto do footer
      const footerText = 'Medicamenta.me - Sistema de Gerenciamento de Medicamentos';
      const textWidth = doc.getTextWidth(footerText);
      doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
      
      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - pageTextWidth - 15, pageHeight - 10);
    }
  }

  /**
   * Formata data para DD/MM/YYYY
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Traduz tipo de evento
   */
  private translateEventType(type: string): string {
    const types: { [key: string]: string } = {
      'missed': 'Esquecido',
      'late': 'Atrasado',
      'early': 'Antecipado',
      'wrong-dose': 'Dose Incorreta'
    };
    return types[type] || type;
  }

  /**
   * Traduz gravidade
   */
  private translateSeverity(severity: string): string {
    const severities: { [key: string]: string } = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta'
    };
    return severities[severity] || severity;
  }

  /**
   * Traduz tipo de alteração
   */
  private translateChangeType(type: string): string {
    const types: { [key: string]: string } = {
      'added': 'Adicionado',
      'removed': 'Removido',
      'modified': 'Modificado'
    };
    return types[type] || type;
  }

  /**
   * Traduz categoria
   */
  private translateCategory(category: string): string {
    const categories: { [key: string]: string } = {
      'general': 'Geral',
      'medication': 'Medicamento',
      'health': 'Saúde',
      'behavior': 'Comportamento'
    };
    return categories[category] || category;
  }

  /**
   * Gera relatório HTML simples (sistema antigo)
   * TODO: Migrar para generatePDF
   */
  downloadHTMLReport(config: ReportConfig): void {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Medicamenta.me</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <h1>Relatório Medicamenta.me</h1>
        <p>Tipo: ${config.type}</p>
        <p>Período: ${config.period}</p>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicamenta-relatorio-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Gera relatório CSV simples (sistema antigo)
   * TODO: Migrar para generatePDF
   */
  downloadCSVReport(config: ReportConfig): void {
    const csv = `Relatório Medicamenta.me
Tipo,${config.type}
Período,${config.period}
Gerado em,${new Date().toLocaleString('pt-BR')}
`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicamenta-relatorio-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

