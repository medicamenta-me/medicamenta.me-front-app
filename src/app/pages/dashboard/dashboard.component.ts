import { Component, ChangeDetectionStrategy, inject, computed, Signal } from '@angular/core';
import { UserService } from '../../services/user.service';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { GamificationService } from '../../services/gamification.service';
import { Dose } from '../../models/medication.model';
import { ProfileTypeSwitcherComponent } from '../../components/profile-type-switcher/profile-type-switcher.component';
import { SyncStatusIndicatorComponent } from '../../components/sync-status-indicator/sync-status-indicator.component';
import { PendingOperationsBadgeComponent } from '../../components/pending-operations-badge/pending-operations-badge.component';
import { SyncProgressBarComponent } from '../../components/sync-progress-bar/sync-progress-bar.component';
import { StreakWidgetComponent } from '../../components/streak-widget/streak-widget.component';
import { LevelBadgeComponent } from '../../components/level-badge/level-badge.component';
import { AchievementCardComponent } from '../../components/achievement-card/achievement-card.component';
import { TitleCasePipe, NgTemplateOutlet } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonListHeader,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonButtons,
  AlertController,
  IonNote,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline, arrowUndoOutline, trophyOutline, trophy, arrowForward } from 'ionicons/icons';

interface TodaysDose {
    medicationId: string;
    medicationName: string;
    dosage: string;
    dose: Dose;
}

@Component({
  selector: 'app-dashboard',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <!-- Level Badge in Header -->
          <div class="header-level-badge">
            <app-level-badge [compact]="true"></app-level-badge>
          </div>
          <app-pending-operations-badge></app-pending-operations-badge>
          <ion-button>
            <ion-icon slot="icon-only" name="notifications-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <app-profile-type-switcher></app-profile-type-switcher>
      
      <!-- Sync Status Bar (shown when online/offline/syncing) -->
      <app-sync-status-indicator></app-sync-status-indicator>
      
      <!-- Sync Progress Bar (shown during active sync) -->
      <app-sync-progress-bar></app-sync-progress-bar>
    </ion-header>

    <ion-content>
      @if(currentUser(); as user) {
        <div class="header-greet ion-padding">
          <h1>Hello, {{ user.name.split(' ')[0] }}!</h1>
          <p>Here's the schedule for today.</p>
        </div>

        <!-- Gamification Widgets -->
        <div class="gamification-section ion-padding-horizontal">
          <div class="gamification-grid">
            <app-level-badge [compact]="false"></app-level-badge>
            <app-streak-widget></app-streak-widget>
          </div>
          
          <!-- Achievements Summary -->
          <div class="achievements-summary">
            <div class="summary-header">
              <div class="summary-title">
                <ion-icon name="trophy"></ion-icon>
                <h3>Suas Conquistas</h3>
              </div>
              <ion-button size="small" fill="clear" routerLink="/achievements">
                Ver Todas
                <ion-icon slot="end" name="arrow-forward"></ion-icon>
              </ion-button>
            </div>
            
            <div class="achievements-stats">
              <div class="stat-item">
                <div class="stat-value">{{ unlockedAchievementsCount() }}</div>
                <div class="stat-label">Desbloqueadas</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">{{ totalPoints() }}</div>
                <div class="stat-label">Pontos</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-value">{{ completionRate() }}%</div>
                <div class="stat-label">Progresso</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Achievements Preview -->
        @if (recentAchievements().length > 0) {
          <ion-card class="achievements-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="trophy-outline"></ion-icon>
                Conquistas Recentes
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="achievements-preview">
                @for (achievement of recentAchievements(); track achievement.id) {
                  <app-achievement-card [achievement]="achievement" />
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <ion-list [inset]="true">
            <ion-item>
                <ion-select label="Viewing Schedule For" [value]="activePatientId()" (ionChange)="selectPatient($event)">
                  @for(patient of patients(); track patient.userId) {
                    <ion-select-option [value]="patient.userId">{{ patient.name }}</ion-select-option>
                  }
                </ion-select>
            </ion-item>
        </ion-list>
        
        @if (morningDoses().length > 0) {
          <ion-list [inset]="true">
            <ion-list-header><ion-label>Morning</ion-label></ion-list-header>
            @for(dose of morningDoses(); track (dose.medicationId + dose.dose.time)) {
              <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </ion-list>
        }

        @if (afternoonDoses().length > 0) {
          <ion-list [inset]="true">
            <ion-list-header><ion-label>Afternoon</ion-label></ion-list-header>
            @for(dose of afternoonDoses(); track (dose.medicationId + dose.dose.time)) {
              <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </ion-list>
        }
        
        @if (eveningDoses().length > 0) {
          <ion-list [inset]="true">
            <ion-list-header><ion-label>Evening</ion-label></ion-list-header>
            @for(dose of eveningDoses(); track (dose.medicationId + dose.dose.time)) {
             <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </ion-list>
        }

        @if(todaysDoses().length === 0) {
           <div class="empty-state">
             <ion-icon name="time-outline" class="empty-icon"></ion-icon>
             <h3>All Clear!</h3>
             <p>No medications scheduled for {{ selectedPatientName() }} today.</p>
           </div>
        }
        
      } @else {
         <div class="ion-padding">
            <p>Loading schedule...</p>
         </div>
      }

      <!-- Reusable Dose Template -->
      <ng-template #doseTemplate let-dose>
        <ion-item>
          <ion-icon [name]="getIconForStatus(dose.dose.status)" [color]="getColorForStatus(dose.dose.status)" slot="start"></ion-icon>
          <ion-label>
            <h2>{{ dose.medicationName }} ({{ dose.dosage }})</h2>
            <p>Scheduled for {{ dose.dose.time }}</p>
            @if(dose.dose.administeredBy) {
               <ion-note color="medium">
                {{ dose.dose.status | titlecase }} by {{ dose.dose.administeredBy.name.split(' ')[0] }}
               </ion-note>
            }
          </ion-label>
          <div class="actions" slot="end">
              @if (dose.dose.status === 'upcoming') {
                <ion-button fill="clear" size="small" (click)="confirmDoseStatus(dose, 'taken')">
                   <ion-icon slot="icon-only" name="checkmark-circle-outline" color="success"></ion-icon>
                </ion-button>
                 <ion-button fill="clear" size="small" (click)="confirmDoseStatus(dose, 'missed')">
                   <ion-icon slot="icon-only" name="close-circle-outline" color="danger"></ion-icon>
                </ion-button>
              } @else {
                 <ion-button fill="clear" size="small" (click)="updateDoseStatus(dose, 'upcoming')">
                   <ion-icon slot="icon-only" name="arrow-undo-outline" color="medium"></ion-icon>
                </ion-button>
              }
            </div>
        </ion-item>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    .header-greet h1 { font-weight: bold; }
    .header-greet p { color: var(--ion-color-medium); }
    ion-list { background: transparent; }
    .empty-state {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 40%; text-align: center;
        color: var(--ion-color-medium);
    }
    .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    
    /* Header Level Badge */
    .header-level-badge {
      display: flex;
      align-items: center;
      margin-right: 8px;
    }
    
    /* Gamification Section */
    .gamification-section {
      margin-bottom: 16px;
      padding-top: 16px;
    }
    
    .gamification-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    @media (min-width: 768px) {
      .gamification-grid {
        grid-template-columns: auto 1fr;
      }
    }
    
    /* Achievements Summary */
    .achievements-summary {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .summary-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .summary-title ion-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
    }
    
    .summary-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--ion-color-dark);
    }
    
    .achievements-stats {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 16px;
    }
    
    .stat-item {
      flex: 1;
      text-align: center;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--ion-color-primary);
      line-height: 1;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--ion-color-light-shade);
    }
    
    /* Achievements Card */
    .achievements-card {
      margin: 0 16px 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .achievements-card ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .achievements-card ion-card-title ion-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
    }
    
    .achievements-preview {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .achievements-preview:empty {
      display: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleCasePipe,
    NgTemplateOutlet,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
    IonIcon, IonListHeader, IonButton, IonSelect, IonSelectOption,
    IonButtons, IonNote, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    ProfileTypeSwitcherComponent,
    SyncStatusIndicatorComponent,
    PendingOperationsBadgeComponent,
    SyncProgressBarComponent,
    StreakWidgetComponent,
    LevelBadgeComponent,
    AchievementCardComponent
  ],
})
export class DashboardComponent {
  private readonly userService = inject(UserService);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly gamificationService = inject(GamificationService);
  private readonly alertController = inject(AlertController);

  public readonly currentUser = this.userService.currentUser;
  public readonly patients = this.patientSelectorService.availablePatients;
  public readonly activePatientId = this.patientSelectorService.activePatientId;

  public readonly todaysDoses: Signal<TodaysDose[]>;
  public readonly morningDoses: Signal<TodaysDose[]>;
  public readonly afternoonDoses: Signal<TodaysDose[]>;
  public readonly eveningDoses: Signal<TodaysDose[]>;
  
  // Gamification data
  public readonly recentAchievements = computed(() => {
    const unlocked = this.gamificationService.unlockedAchievements();
    return unlocked
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3); // Show only 3 most recent
  });
  
  public readonly unlockedAchievementsCount = computed(() => {
    return this.gamificationService.unlockedAchievements().length;
  });
  
  public readonly totalPoints = computed(() => {
    return this.gamificationService.totalPoints();
  });
  
  public readonly completionRate = computed(() => {
    const total = this.gamificationService.achievements().length;
    const unlocked = this.unlockedAchievementsCount();
    if (total === 0) return 0;
    return Math.round((unlocked / total) * 100);
  });
  
  public readonly recentUnlocks = computed(() => {
    return this.gamificationService.unlockedAchievements()
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3); // Show only 3 most recent
  });
  
  public readonly selectedPatientName = computed(() => {
    const patientId = this.activePatientId();
    return this.patients().find(p => p.userId === patientId)?.name || '...';
  });

  constructor() {
    addIcons({ notificationsOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline, arrowUndoOutline, trophyOutline, trophy, arrowForward });
    
    this.todaysDoses = computed(() => {
        const today = new Date();
        const allMeds = this.medicationService.medications();
        const patientId = this.activePatientId();

        // Filter medications by the active patient ID first
        const patientMeds = allMeds.filter(med => med.patientId === patientId);

        return patientMeds
          .filter(med => {
            if (!med.startDate) return true;
            const startDate = new Date(med.startDate);
            const endDate = med.endDate ? new Date(med.endDate) : null;
            startDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            return startDate <= today && (!endDate || today <= endDate);
          })
          .flatMap(med => med.schedule.map(dose => ({
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              dose
          })))
          .sort((a,b) => a.dose.time.localeCompare(b.dose.time));
    });

    this.morningDoses = computed(() => this.todaysDoses().filter(d => d.dose.time < '12:00'));
    this.afternoonDoses = computed(() => this.todaysDoses().filter(d => d.dose.time >= '12:00' && d.dose.time < '18:00'));
    this.eveningDoses = computed(() => this.todaysDoses().filter(d => d.dose.time >= '18:00'));
  }

  selectPatient(event: any) {
    this.patientSelectorService.setActivePatient(event.detail.value);
  }

  getIconForStatus(status: Dose['status']) {
      if (status === 'taken') return 'checkmark-circle-outline';
      if (status === 'missed') return 'close-circle-outline';
      return 'time-outline';
  }
  
  getColorForStatus(status: Dose['status']) {
      if (status === 'taken') return 'success';
      if (status === 'missed') return 'danger';
      return 'primary';
  }

  async confirmDoseStatus(item: TodaysDose, status: 'taken' | 'missed') {
    const alert = await this.alertController.create({
        header: `Confirm ${status === 'taken' ? 'Taken' : 'Missed'}`,
        message: 'Add any relevant notes below.',
        inputs: [{ name: 'notes', type: 'textarea', placeholder: 'Optional notes...' }],
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Confirm', handler: (data) => this.updateDoseStatus(item, status, data.notes) }
        ]
    });
    await alert.present();
  }

  updateDoseStatus(item: TodaysDose, status: 'taken' | 'missed' | 'upcoming', notes?: string) {
      const currentUser = this.currentUser();
      if (!currentUser) return;
      
      const administeredByName = this.patients().find(p => p.userId === currentUser.id)?.name || 'Unknown';
      
      this.medicationService.updateDoseStatus(item.medicationId, item.dose.time, status, administeredByName, notes);
  }
}
