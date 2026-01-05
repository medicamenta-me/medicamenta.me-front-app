import { Component, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonIcon,
  IonChip,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  statsChartOutline,
  alertCircleOutline,
  ribbonOutline,
  calendarOutline
} from 'ionicons/icons';
import type { Chart as ChartType } from 'chart.js';
import { FamilyReportsService, PeriodFilter } from '../../services/family-reports.service';
import { FamilyService } from '../../services/family.service';

// Dynamic imports for heavy libraries (bundle optimization)
const loadChartJS = async () => {
  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);
  return Chart;
};
const loadJsPDF = () => import('jspdf').then(m => m.default);
const loadHtml2Canvas = () => import('html2canvas').then(m => m.default);

@Component({
  selector: 'app-family-reports',
  templateUrl: './family-reports.component.html',
  styleUrls: ['./family-reports.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonIcon,
    IonChip,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonSpinner
  ]
})
export class FamilyReportsComponent implements AfterViewInit, OnDestroy {
  public readonly reportsService = inject(FamilyReportsService);
  public readonly familyService = inject(FamilyService);
  private readonly toastController = inject(ToastController);

  @ViewChild('adherenceChart') adherenceChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('comparisonChart') comparisonChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportContent') reportContentRef!: ElementRef<HTMLDivElement>;

  private adherenceChart?: ChartType;
  private distributionChart?: ChartType;
  private comparisonChart?: ChartType;
  private ChartJS?: typeof ChartType;

  isExporting = false;

  constructor() {
    addIcons({
      downloadOutline,
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      statsChartOutline,
      alertCircleOutline,
      ribbonOutline,
      calendarOutline
    });
  }

  ngAfterViewInit() {
    // Small delay to ensure canvases are ready
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  /**
   * Initialize all charts (with lazy loading)
   */
  private async initializeCharts() {
    // Lazy load Chart.js for bundle optimization
    if (!this.ChartJS) {
      this.ChartJS = await loadChartJS();
    }
    
    this.createAdherenceChart();
    this.createDistributionChart();
    this.createComparisonChart();
  }

  /**
   * Destroy all charts
   */
  private destroyCharts() {
    this.adherenceChart?.destroy();
    this.distributionChart?.destroy();
    this.comparisonChart?.destroy();
  }

  /**
   * Create Adherence Timeline Chart
   */
  private createAdherenceChart() {
    if (!this.adherenceChartRef || !this.ChartJS) return;

    const timeline = this.reportsService.adherenceTimeline();
    const members = this.familyService.familyMembers();

    const datasets = members.map(member => ({
      label: member.name,
      data: timeline.map(point => point.memberAdherence[member.id] || 0),
      borderColor: this.familyService.getMemberColor(member.id),
      backgroundColor: this.familyService.getMemberColor(member.id) + '20',
      tension: 0.4,
      fill: true
    }));

    this.adherenceChart = new this.ChartJS!(this.adherenceChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: timeline.map(point => {
          const date = new Date(point.date);
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Adesão ao Longo do Tempo'
          },
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y?.toFixed(1) || 0}%`
            }
          }
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
  }

  /**
   * Create Dose Distribution Chart
   */
  private createDistributionChart() {
    if (!this.distributionChartRef || !this.ChartJS) return;

    const distribution = this.reportsService.doseDistribution();

    this.distributionChart = new this.ChartJS!(this.distributionChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: distribution.map(d => d.period),
        datasets: [{
          data: distribution.map(d => d.count),
          backgroundColor: [
            '#FFA726', // Orange - Morning
            '#42A5F5', // Blue - Afternoon
            '#5C6BC0'  // Indigo - Evening
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribuição de Doses por Período'
          },
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = distribution[context.dataIndex].percentage;
                return `${label}: ${value} doses (${percentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create Medication Comparison Chart
   */
  private createComparisonChart() {
    if (!this.comparisonChartRef || !this.ChartJS) return;

    const comparison = this.reportsService.medicationComparison();

    this.comparisonChart = new this.ChartJS!(this.comparisonChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: comparison.map(m => m.memberName),
        datasets: [
          {
            label: 'Medicamentos Ativos',
            data: comparison.map(m => m.activeMedications),
            backgroundColor: '#34D187',
            borderRadius: 8
          },
          {
            label: 'Adesão (%)',
            data: comparison.map(m => m.adherenceRate),
            backgroundColor: '#3B82F6',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Comparativo de Medicamentos e Adesão'
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Change period filter
   */
  onPeriodChange(event: any) {
    const period = event.detail.value as PeriodFilter;
    this.reportsService.setPeriod(period);
    
    // Recreate charts with new data
    this.destroyCharts();
    setTimeout(() => this.initializeCharts(), 100);
  }

  /**
   * Export report to PDF
   */
  async exportToPDF() {
    this.isExporting = true;

    try {
      const content = this.reportContentRef.nativeElement;
      
      // Dynamic imports for bundle optimization
      const [html2canvas, jsPDF] = await Promise.all([
        loadHtml2Canvas(),
        loadJsPDF()
      ]);
      
      // Capture the content as canvas
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      const fileName = `relatorio-familiar-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Show success toast
      const toast = await this.toastController.create({
        message: 'Relatório exportado com sucesso!',
        duration: 3000,
        color: 'success',
        position: 'bottom',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();

    } catch (error) {
      console.error('Error exporting PDF:', error);
      
      const toast = await this.toastController.create({
        message: 'Erro ao exportar relatório',
        duration: 3000,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
      await toast.present();
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Get trend icon
   */
  getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving':
        return 'trending-up-outline';
      case 'declining':
        return 'trending-down-outline';
      default:
        return 'remove-outline';
    }
  }

  /**
   * Get trend color
   */
  getTrendColor(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving':
        return 'success';
      case 'declining':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

