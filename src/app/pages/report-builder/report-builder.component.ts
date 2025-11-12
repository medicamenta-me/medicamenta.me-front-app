import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonSelect, IonSelectOption, IonCheckbox, IonButton, IonIcon, IonList,
  IonListHeader, IonNote, IonSpinner, IonChip, IonProgressBar, IonText,
  IonActionSheet, IonModal, IonDatetime, IonFab, IonFabButton,
  LoadingController, ToastController, ActionSheetController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  documentText, download, share, eye, calendar, checkmarkCircle,
  close, create, chevronForward, alertCircle, informationCircle
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { ReportGeneratorService, ProfessionalReportConfig, PatientData, AdherenceData, CriticalEvent, MedicationChange, CaregiverNote } from '../../services/report-generator.service';
import { ReportTemplatesService, ReportTemplate } from '../../services/report-templates.service';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { UserService } from '../../services/user.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { LogService } from '../../services/log.service';
import { FirebaseService } from '../../services/firebase.service';
import { Share } from '@capacitor/share';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { LogEventType } from '../../models/log-entry.model';
import { Medication } from '../../models/medication.model';

@Component({
  selector: 'app-report-builder',
  templateUrl: './report-builder.component.html',
  styleUrls: ['./report-builder.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonCheckbox, IonButton, IonIcon, IonList,
    IonListHeader, IonNote, IonSpinner, IonChip, IonText,
    IonModal, IonDatetime
  ]
})
export class ReportBuilderPage implements OnInit {
  private readonly reportGenerator = inject(ReportGeneratorService);
  private readonly reportTemplates = inject(ReportTemplatesService);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly userService = inject(UserService);
  private readonly patientSelector = inject(PatientSelectorService);
  private readonly logService = inject(LogService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);

  // State
  templates = signal<ReportTemplate[]>([]);
  selectedTemplate = signal<ReportTemplate | null>(null);
  periodStart = signal<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 dias atrás
  periodEnd = signal<Date>(new Date());
  isGenerating = signal<boolean>(false);
  generatedPdfBlob = signal<Blob | null>(null);
  showPreview = signal<boolean>(false);
  showDateModal = signal<boolean>(false);
  datePickerType = signal<'start' | 'end'>('start');

  constructor() {
    addIcons({ documentText, download, share, eye, calendar, checkmarkCircle, close, create, chevronForward, alertCircle, informationCircle });
  }

  ngOnInit() {
    this.loadTemplates();
  }

  /**
   * Carrega templates disponíveis
   */
  loadTemplates() {
    this.templates.set(this.reportTemplates.getTemplates());
    // Selecionar template padrão
    this.selectedTemplate.set(this.reportTemplates.getDefaultTemplate());
  }

  /**
   * Seleciona template
   */
  onTemplateSelect(templateId: string) {
    const template = this.templates().find(t => t.id === templateId);
    if (template) {
      this.selectedTemplate.set(template);
    }
  }

  /**
   * Toggle seção do relatório
   */
  toggleSection(sectionId: string) {
    const template = this.selectedTemplate();
    if (!template) return;

    const section = template.sections.find(s => s.id === sectionId);
    if (section && !section.required) {
      section.enabled = !section.enabled;
      this.selectedTemplate.set({ ...template });
    }
  }

  /**
   * Abre modal de seleção de data
   */
  openDatePicker(type: 'start' | 'end') {
    this.datePickerType.set(type);
    this.showDateModal.set(true);
  }

  /**
   * Confirma seleção de data
   */
  onDateChange(event: any) {
    const dateValue = event.detail.value;
    if (dateValue) {
      const date = new Date(dateValue);
      
      if (this.datePickerType() === 'start') {
        this.periodStart.set(date);
      } else {
        this.periodEnd.set(date);
      }
    }
    this.showDateModal.set(false);
  }

  /**
   * Seleciona período pré-definido
   */
  async selectQuickPeriod() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecionar Período',
      buttons: [
        {
          text: 'Últimos 7 dias',
          handler: () => {
            this.periodStart.set(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            this.periodEnd.set(new Date());
          }
        },
        {
          text: 'Últimos 15 dias',
          handler: () => {
            this.periodStart.set(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000));
            this.periodEnd.set(new Date());
          }
        },
        {
          text: 'Últimos 30 dias',
          handler: () => {
            this.periodStart.set(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            this.periodEnd.set(new Date());
          }
        },
        {
          text: 'Últimos 60 dias',
          handler: () => {
            this.periodStart.set(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
            this.periodEnd.set(new Date());
          }
        },
        {
          text: 'Últimos 90 dias',
          handler: () => {
            this.periodStart.set(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
            this.periodEnd.set(new Date());
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Gera relatório PDF
   */
  async generateReport() {
    const template = this.selectedTemplate();
    if (!template) {
      await this.showToast('Selecione um template', 'warning');
      return;
    }

    // Validar template
    const validation = this.reportTemplates.validateTemplate(template);
    if (!validation.valid) {
      await this.showToast(`Seções obrigatórias faltando: ${validation.missingRequired.join(', ')}`, 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Gerando relatório...',
      spinner: 'crescent'
    });
    await loading.present();

    this.isGenerating.set(true);

    try {
      // Preparar dados do relatório
      const config: ProfessionalReportConfig = {
        template: template,
        patient: this.getPatientData(),
        period: {
          start: this.periodStart(),
          end: this.periodEnd()
        },
        medications: this.medicationService.medications(),
        adherenceData: await this.getAdherenceData(), // ✅ Dados reais
        criticalEvents: await this.getCriticalEvents(), // ✅ Dados reais
        medicationChanges: await this.getMedicationChanges(), // ✅ Dados reais
        caregiverNotes: await this.getCaregiverNotes(), // ✅ Dados reais
        statistics: this.calculateStatistics() // ✅ Dados reais
      };

      // Gerar PDF
      const pdfBlob = await this.reportGenerator.generatePDF(config);
      this.generatedPdfBlob.set(pdfBlob);

      await loading.dismiss();
      await this.showToast('Relatório gerado com sucesso!', 'success');
      
      // Mostrar opções
      await this.showReportActions();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      await loading.dismiss();
      await this.showToast('Erro ao gerar relatório', 'danger');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Obtém dados do paciente
   */
  private getPatientData(): PatientData {
    const patient = this.patientSelector.activePatient();
    const user = this.userService.currentUser();

    return {
      name: patient?.name || (user as any)?.displayName || user?.email || 'Paciente',
      email: user?.email || undefined,
      // Outros dados podem ser adicionados quando disponíveis
    };
  }

  /**
   * Obtém dados reais de aderência do Firestore
   */
  private async getAdherenceData(): Promise<AdherenceData[]> {
    const patientId = this.patientSelector.activePatientId();
    if (!patientId) return [];

    const data: AdherenceData[] = [];
    const start = this.periodStart();
    const end = this.periodEnd();

    try {
      // Buscar todos os logs do período
      const logsRef = collection(this.firebaseService.firestore, `users/${patientId}/logs`);
      const logsQuery = query(
        logsRef,
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'asc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data()['timestamp']?.toDate() || new Date()
      }));

      console.log(`[ReportBuilder] Carregados ${logs.length} logs para análise de aderência`);

      // Buscar medicações ativas no período
      const medications = this.medicationService.medications();
      const activeMeds = medications.filter((m: Medication) => !m.isArchived && !m.isCompleted);

      // Agrupar logs por dia
      const dayMs = 24 * 60 * 60 * 1000;
      const startTime = start.getTime();
      const endTime = end.getTime();

      for (let time = startTime; time <= endTime; time += dayMs) {
        const date = new Date(time);
        const dateStr = date.toISOString().split('T')[0];
        
        // Filtrar logs do dia
        const dayLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate.toISOString().split('T')[0] === dateStr;
        });

        // Calcular doses tomadas e totais
        const takenLogs = dayLogs.filter(log => (log as any).eventType === 'taken');
        const taken = takenLogs.length;

        // Calcular total esperado (soma de todas as doses agendadas por dia)
        let total = 0;
        activeMeds.forEach((med: Medication) => {
          if (med.schedule && Array.isArray(med.schedule)) {
            total += med.schedule.length;
          }
        });

        // Se não houver medicações ativas, pular o dia
        if (total === 0) continue;

        data.push({
          date: dateStr,
          taken,
          total,
          percentage: total > 0 ? (taken / total) * 100 : 0
        });
      }

      console.log(`[ReportBuilder] Calculados ${data.length} dias de aderência`);
      return data;

    } catch (error) {
      console.error('[ReportBuilder] Erro ao buscar dados de aderência:', error);
      return [];
    }
  }

  /**
   * Obtém eventos críticos reais do Firestore
   */
  private async getCriticalEvents(): Promise<CriticalEvent[]> {
    const patientId = this.patientSelector.activePatientId();
    if (!patientId) return [];

    const events: CriticalEvent[] = [];

    try {
      // Buscar logs de eventos críticos (missed, error, etc.)
      const logsRef = collection(this.firebaseService.firestore, `users/${patientId}/logs`);
      const logsQuery = query(
        logsRef,
        where('timestamp', '>=', Timestamp.fromDate(this.periodStart())),
        where('timestamp', '<=', Timestamp.fromDate(this.periodEnd())),
        orderBy('timestamp', 'desc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      
      logsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventType = data['eventType'] as string;
        const timestamp = data['timestamp']?.toDate() || new Date();

        // Filtrar apenas eventos críticos (missed principalmente)
        if (eventType === 'missed') {
          const severity: 'low' | 'medium' | 'high' = 'medium';

          events.push({
            date: timestamp,
            type: eventType as any,
            medicationName: data['medicationName'] || 'Medicamento não especificado',
            description: data['message'] || 'Dose não tomada',
            severity
          });
        }
      });

      console.log(`[ReportBuilder] Encontrados ${events.length} eventos críticos`);
      return events;

    } catch (error) {
      console.error('[ReportBuilder] Erro ao buscar eventos críticos:', error);
      return [];
    }
  }

  /**
   * Obtém mudanças de medicamentos reais do histórico
   */
  private async getMedicationChanges(): Promise<MedicationChange[]> {
    const patientId = this.patientSelector.activePatientId();
    if (!patientId) return [];

    const changes: MedicationChange[] = [];

    try {
      // Buscar logs de mudanças de medicamentos
      const logsRef = collection(this.firebaseService.firestore, `users/${patientId}/logs`);
      const logsQuery = query(
        logsRef,
        where('timestamp', '>=', Timestamp.fromDate(this.periodStart())),
        where('timestamp', '<=', Timestamp.fromDate(this.periodEnd())),
        orderBy('timestamp', 'desc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      
      logsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventType = data['eventType'] as string;
        const timestamp = data['timestamp']?.toDate() || new Date();

        // Filtrar eventos de mudanças de medicamentos
        if (eventType === 'add_med' || eventType === 'update_med' || eventType === 'delete_med') {
          let type: 'added' | 'modified' | 'removed' = 'modified';
          
          if (eventType === 'add_med') {
            type = 'added';
          } else if (eventType === 'delete_med') {
            type = 'removed';
          }

          changes.push({
            date: timestamp,
            medicationName: data['medicationName'] || 'Medicamento não especificado',
            type,
            description: data['message'] || 'Sem descrição'
          });
        }
      });

      console.log(`[ReportBuilder] Encontradas ${changes.length} mudanças de medicamentos`);
      return changes;

    } catch (error) {
      console.error('[ReportBuilder] Erro ao buscar mudanças de medicamentos:', error);
      return [];
    }
  }

  /**
   * Obtém observações de cuidadores reais
   */
  private async getCaregiverNotes(): Promise<CaregiverNote[]> {
    const patientId = this.patientSelector.activePatientId();
    if (!patientId) return [];

    const notes: CaregiverNote[] = [];

    try {
      // Buscar logs com notas de cuidadores
      const logsRef = collection(this.firebaseService.firestore, `users/${patientId}/logs`);
      const logsQuery = query(
        logsRef,
        where('timestamp', '>=', Timestamp.fromDate(this.periodStart())),
        where('timestamp', '<=', Timestamp.fromDate(this.periodEnd())),
        orderBy('timestamp', 'desc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      
      logsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventType = data['eventType'] as LogEventType;
        const timestamp = data['timestamp']?.toDate() || new Date();

        // Filtrar logs que são notas/observações
        if (eventType === 'note' || data['isNote']) {
          notes.push({
            date: timestamp,
            author: data['registeredBy'] || 'Cuidador',
            note: data['message'] || '',
            category: this.categorizeNote(data['message'] || '')
          });
        }
      });

      console.log(`[ReportBuilder] Encontradas ${notes.length} observações de cuidadores`);
      return notes;

    } catch (error) {
      console.error('[ReportBuilder] Erro ao buscar observações:', error);
      return [];
    }
  }

  /**
   * Categoriza nota baseada no conteúdo
   */
  private categorizeNote(note: string): 'general' | 'medication' | 'health' | 'behavior' {
    const lowerNote = note.toLowerCase();
    
    if (lowerNote.includes('medicamento') || lowerNote.includes('dose') || lowerNote.includes('remédio')) {
      return 'medication';
    } else if (lowerNote.includes('saúde') || lowerNote.includes('sintoma') || lowerNote.includes('dor')) {
      return 'health';
    } else if (lowerNote.includes('comportamento') || lowerNote.includes('humor') || lowerNote.includes('ânimo')) {
      return 'behavior';
    }
    
    return 'general';
  }

  /**
   * Calcula estatísticas reais baseadas nos dados
   */
  private calculateStatistics() {
    const meds = this.medicationService.medications();
    const logs = this.logService.logs();
    
    // Filtrar logs do período
    const periodLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= this.periodStart() && logDate <= this.periodEnd();
    });

    // Contar doses por tipo
    const takenLogs = periodLogs.filter(log => log.eventType === 'taken');
    const missedLogs = periodLogs.filter(log => log.eventType === 'missed');
    
    // Separar doses no horário e atrasadas
    let onTimeDoses = 0;
    let lateDoses = 0;

    takenLogs.forEach(log => {
      // Se o log tem informação de scheduledTime, verificar se está atrasado
      const logData = log as any;
      if (logData.scheduledTime && logData.timestamp) {
        const scheduled = new Date(logData.scheduledTime);
        const actual = new Date(log.timestamp);
        const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60);
        
        if (diffMinutes > 30) { // Mais de 30 minutos de atraso
          lateDoses++;
        } else {
          onTimeDoses++;
        }
      } else {
        // Se não tem informação, considerar no horário
        onTimeDoses++;
      }
    });

    // Calcular aderência geral
    const totalExpected = takenLogs.length + missedLogs.length;
    const overallAdherence = totalExpected > 0 
      ? (takenLogs.length / totalExpected) * 100 
      : 0;

    return {
      totalMedications: meds.length,
      activeMedications: meds.filter((m: Medication) => !m.isArchived && !m.isCompleted).length,
      overallAdherence: Math.round(overallAdherence * 10) / 10, // Arredondar para 1 casa decimal
      missedDoses: missedLogs.length,
      onTimeDoses,
      lateDoses
    };
  }

  /**
   * Gera dados mock de aderência (OBSOLETO - mantido para compatibilidade)
   * @deprecated Use getAdherenceData() para dados reais
   */
  private generateMockAdherenceData(): AdherenceData[] {
    const data: AdherenceData[] = [];
    const start = this.periodStart().getTime();
    const end = this.periodEnd().getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let time = start; time <= end; time += dayMs) {
      const date = new Date(time);
      const taken = Math.floor(Math.random() * 3) + 2; // 2-4 doses tomadas
      const total = 4; // 4 doses totais
      
      data.push({
        date: date.toISOString().split('T')[0],
        taken,
        total,
        percentage: (taken / total) * 100
      });
    }

    return data;
  }

  /**
   * Gera eventos críticos mock (OBSOLETO)
   * @deprecated Use getCriticalEvents() para dados reais
   */
  private generateMockCriticalEvents(): CriticalEvent[] {
    return [
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        type: 'missed',
        medicationName: 'Exemplo Medicamento 1',
        description: 'Dose não tomada às 08:00',
        severity: 'medium'
      }
    ];
  }

  /**
   * Gera alterações de medicamentos mock (OBSOLETO)
   * @deprecated Use getMedicationChanges() para dados reais
   */
  private generateMockMedicationChanges(): MedicationChange[] {
    return [
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        medicationName: 'Exemplo Medicamento 2',
        type: 'added',
        description: 'Medicamento adicionado ao tratamento'
      }
    ];
  }

  /**
   * Gera observações do cuidador mock (OBSOLETO)
   * @deprecated Use getCaregiverNotes() para dados reais
   */
  private generateMockCaregiverNotes(): CaregiverNote[] {
    return [
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        author: 'Cuidador',
        note: 'Paciente apresentou boa aderência aos medicamentos.',
        category: 'general'
      }
    ];
  }

  /**
   * Gera estatísticas mock (OBSOLETO)
   * @deprecated Use calculateStatistics() para dados reais
   */
  private generateMockStatistics() {
    const meds = this.medicationService.medications();
    return {
      totalMedications: meds.length,
      activeMedications: meds.filter((m: any) => !m.isArchived && !m.isCompleted).length,
      overallAdherence: 85.5,
      missedDoses: 6,
      onTimeDoses: 45,
      lateDoses: 3
    };
  }

  /**
   * Mostra ações do relatório
   */
  async showReportActions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Relatório Gerado',
      buttons: [
        {
          text: 'Download',
          icon: 'download',
          handler: () => {
            this.downloadReport();
          }
        },
        {
          text: 'Compartilhar',
          icon: 'share',
          handler: () => {
            this.shareReport();
          }
        },
        {
          text: 'Fechar',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Faz download do relatório
   */
  downloadReport() {
    const blob = this.generatedPdfBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicamenta-relatorio-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    this.showToast('Download iniciado', 'success');
  }

  /**
   * Compartilha relatório
   */
  async shareReport() {
    const blob = this.generatedPdfBlob();
    if (!blob) return;

    try {
      // Converter Blob para File
      const file = new File([blob], `medicamenta-relatorio-${new Date().toISOString().split('T')[0]}.pdf`, {
        type: 'application/pdf'
      });

      // Criar URL para compartilhamento
      const url = URL.createObjectURL(file);

      // Tentar compartilhar via Capacitor Share API
      if (await Share.canShare()) {
        await Share.share({
          title: 'Relatório Medicamenta.me',
          text: 'Relatório de medicamentos gerado pelo Medicamenta.me',
          url: url,
          dialogTitle: 'Compartilhar Relatório'
        });
      } else {
        // Fallback: copiar link
        await navigator.clipboard.writeText(url);
        await this.showToast('Link copiado para área de transferência', 'success');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      await this.showToast('Erro ao compartilhar relatório', 'danger');
    }
  }

  /**
   * Formata data para exibição
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Conta seções habilitadas
   */
  countEnabledSections(): number {
    const template = this.selectedTemplate();
    return template ? this.reportTemplates.countEnabledSections(template) : 0;
  }

  /**
   * Mostra toast
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
