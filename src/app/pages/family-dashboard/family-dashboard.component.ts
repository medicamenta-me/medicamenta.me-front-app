import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonChip,
  IonSegment,
  IonSegmentButton,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personOutline,
  calendarOutline,
  statsChartOutline,
  notificationsOutline,
  checkmarkCircleOutline,
  timeOutline,
  alertCircleOutline,
  filterOutline,
  closeCircleOutline,
  chevronForwardOutline,
  checkmarkOutline,
  closeOutline, trophyOutline } from 'ionicons/icons';
import { FamilyService } from '../../services/family.service';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { LogService } from '../../services/log.service';
import { FamilyAchievementsModalComponent } from '../../components/family-achievements-modal/family-achievements-modal.component';

@Component({
  selector: 'app-family-dashboard',
  templateUrl: './family-dashboard.component.html',
  styleUrls: ['./family-dashboard.component.css'],
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
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonBadge,
    IonChip,
    IonSegment,
    IonSegmentButton,
    IonGrid,
    IonRow,
    IonCol,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class FamilyDashboardComponent {
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly modalController = inject(ModalController);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly logService = inject(LogService);
  public readonly familyService = inject(FamilyService);

  // UI state
  public readonly activeView = signal<'doses' | 'alerts' | 'stats' | 'calendar'>('doses');
  public readonly showFilters = signal(false);
  public readonly processingDose = signal<string | null>(null);

  constructor() {
    addIcons({trophyOutline,notificationsOutline,filterOutline,timeOutline,checkmarkCircleOutline,alertCircleOutline,statsChartOutline,peopleOutline,checkmarkOutline,closeOutline,calendarOutline,personOutline,closeCircleOutline,chevronForwardOutline});
  }

  /**
   * Handle refresh
   */
  handleRefresh(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  /**
   * Mark dose as taken
   */
  async markAsTaken(dose: any, event: Event) {
    event.stopPropagation();
    
    if (this.processingDose() === dose.medicationId + dose.time) {
      return;
    }

    try {
      this.processingDose.set(dose.medicationId + dose.time);

      // Update dose status
      await this.medicationService.updateDoseStatus(
        dose.medicationId,
        dose.time,
        'taken',
        dose.member.name,
        `Marcado via Dashboard Familiar às ${new Date().toLocaleTimeString()}`
      );

      // Log action
      await this.logService.addLog(
        'taken',
        `${dose.medicationName} - ${dose.dosage} tomado por ${dose.member.name} às ${dose.time}`,
        dose.member.id
      );

      // Show success toast
      const toast = await this.toastController.create({
        message: `✅ Dose marcada como tomada para ${dose.member.name}`,
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Error marking dose as taken:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao marcar dose como tomada',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.processingDose.set(null);
    }
  }

  /**
   * Mark dose as missed
   */
  async markAsMissed(dose: any, event: Event) {
    event.stopPropagation();
    
    if (this.processingDose() === dose.medicationId + dose.time) {
      return;
    }

    try {
      this.processingDose.set(dose.medicationId + dose.time);

      // Update dose status
      await this.medicationService.updateDoseStatus(
        dose.medicationId,
        dose.time,
        'missed',
        dose.member.name,
        `Marcado como perdida via Dashboard Familiar às ${new Date().toLocaleTimeString()}`
      );

      // Log action
      await this.logService.addLog(
        'missed',
        `${dose.medicationName} - ${dose.dosage} perdido por ${dose.member.name} às ${dose.time}`,
        dose.member.id
      );

      // Show warning toast
      const toast = await this.toastController.create({
        message: `⚠️ Dose marcada como perdida para ${dose.member.name}`,
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Error marking dose as missed:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao marcar dose como perdida',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.processingDose.set(null);
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Toggle member filter
   */
  toggleMember(memberId: string) {
    this.familyService.toggleMemberFilter(memberId);
  }

  /**
   * Clear all member filters
   */
  clearMemberFilters() {
    this.familyService.clearMemberFilter();
  }

  /**
   * Toggle status filter
   */
  toggleStatus(status: string) {
    this.familyService.toggleStatusFilter(status);
  }

  /**
   * Navigate to member detail
   */
  goToMember(memberId: string) {
    const member = this.familyService.familyMembers().find(m => m.id === memberId);
    if (member?.isMainUser) {
      this.router.navigate(['/profile/edit']);
    } else {
      this.router.navigate(['/profile/edit-dependent', memberId]);
    }
  }

  /**
   * Navigate to medication detail
   */
  goToMedication(medicationId: string) {
    this.router.navigate(['/medication', medicationId]);
  }

  /**
   * Navigate to alert action
   */
  handleAlert(alert: any) {
    if (alert.actionUrl) {
      this.router.navigateByUrl(alert.actionUrl);
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'taken':
        return 'checkmark-circle-outline';
      case 'overdue':
        return 'alert-circle-outline';
      case 'pending':
      default:
        return 'time-outline';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'taken':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
    }
  }

  /**
   * Get alert icon
   */
  getAlertIcon(type: string): string {
    switch (type) {
      case 'overdue':
        return 'alert-circle-outline';
      case 'low-stock':
        return 'notifications-outline';
      case 'expiring':
        return 'time-outline';
      case 'missed':
        return 'close-circle-outline';
      default:
        return 'alert-circle-outline';
    }
  }

  /**
   * Get alert color
   */
  getAlertColor(severity: string): string {
    switch (severity) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'medium';
    }
  }

  /**
   * Navigate to family reports
   */
  goToFamilyReports() {
    this.router.navigate(['/family-reports']);
  }

  /**
   * Navigate to family calendar
   */
  goToFamilyCalendar() {
    this.router.navigate(['/family-calendar']);
  }

  /**
   * Open family achievements modal
   */
  async openFamilyAchievements() {
    const modal = await this.modalController.create({
      component: FamilyAchievementsModalComponent,
      cssClass: 'family-achievements-modal'
    });

    await modal.present();
  }
}
