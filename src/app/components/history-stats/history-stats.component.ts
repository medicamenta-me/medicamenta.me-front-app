import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryStatsService, PeriodStats } from '../../services/history-stats.service';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonIcon,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, trendingUpOutline, trendingDownOutline, removeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-history-stats',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonIcon,
    IonChip
  ],
  template: `
    <div class="stats-container">
      <!-- Period Selector -->
      <ion-segment [value]="selectedPeriod()" (ionChange)="onPeriodChange($event)">
        <ion-segment-button value="week">
          <ion-label>{{ 'HISTORY_STATS.WEEK' | translate }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="month">
          <ion-label>{{ 'HISTORY_STATS.MONTH' | translate }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="year">
          <ion-label>{{ 'HISTORY_STATS.YEAR' | translate }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="all">
          <ion-label>{{ 'HISTORY_STATS.ALL_TIME' | translate }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (currentStats(); as stats) {
        <!-- Overall Adherence Card -->
        <ion-card class="adherence-card">
          <ion-card-header>
            <ion-card-title>{{ 'HISTORY_STATS.OVERALL_ADHERENCE' | translate }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="adherence-circle" [class.excellent]="stats.adherence.adherenceRate >= 90"
                 [class.good]="stats.adherence.adherenceRate >= 70 && stats.adherence.adherenceRate < 90"
                 [class.moderate]="stats.adherence.adherenceRate >= 50 && stats.adherence.adherenceRate < 70"
                 [class.poor]="stats.adherence.adherenceRate < 50">
              <div class="percentage">{{ stats.adherence.adherenceRate }}%</div>
              <div class="label">{{ 'HISTORY_STATS.ADHERENCE' | translate }}</div>
            </div>

            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ stats.adherence.totalDoses }}</div>
                <div class="stat-label">{{ 'HISTORY_STATS.TOTAL_DOSES' | translate }}</div>
              </div>
              <div class="stat-item success">
                <div class="stat-value">{{ stats.adherence.takenDoses }}</div>
                <div class="stat-label">{{ 'HISTORY_STATS.TAKEN' | translate }}</div>
              </div>
              <div class="stat-item danger">
                <div class="stat-value">{{ stats.adherence.missedDoses }}</div>
                <div class="stat-label">{{ 'HISTORY_STATS.MISSED' | translate }}</div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Insights Card -->
        <ion-card class="insights-card">
          <ion-card-header>
            <ion-card-title>{{ 'HISTORY_STATS.INSIGHTS' | translate }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @for (insight of insights(); track $index) {
              <div class="insight-item">
                <ion-icon [name]="getInsightIcon(insight)" [color]="getInsightColor(insight)"></ion-icon>
                <span>{{ insight }}</span>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Time Patterns Card -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ 'HISTORY_STATS.TIME_PATTERNS' | translate }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="bar-chart">
              <div class="bar-item">
                <div class="bar-label">{{ 'HISTORY_STATS.MORNING' | translate }}</div>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="stats.timePatterns.morningAdherence"
                       [class.best]="stats.timePatterns.bestTimeSlot === 'morning'"
                       [class.worst]="stats.timePatterns.worstTimeSlot === 'morning'"></div>
                </div>
                <div class="bar-value">{{ stats.timePatterns.morningAdherence }}%</div>
              </div>
              
              <div class="bar-item">
                <div class="bar-label">{{ 'HISTORY_STATS.AFTERNOON' | translate }}</div>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="stats.timePatterns.afternoonAdherence"
                       [class.best]="stats.timePatterns.bestTimeSlot === 'afternoon'"
                       [class.worst]="stats.timePatterns.worstTimeSlot === 'afternoon'"></div>
                </div>
                <div class="bar-value">{{ stats.timePatterns.afternoonAdherence }}%</div>
              </div>
              
              <div class="bar-item">
                <div class="bar-label">{{ 'HISTORY_STATS.EVENING' | translate }}</div>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="stats.timePatterns.eveningAdherence"
                       [class.best]="stats.timePatterns.bestTimeSlot === 'evening'"
                       [class.worst]="stats.timePatterns.worstTimeSlot === 'evening'"></div>
                </div>
                <div class="bar-value">{{ stats.timePatterns.eveningAdherence }}%</div>
              </div>
              
              <div class="bar-item">
                <div class="bar-label">{{ 'HISTORY_STATS.NIGHT' | translate }}</div>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="stats.timePatterns.nightAdherence"
                       [class.best]="stats.timePatterns.bestTimeSlot === 'night'"
                       [class.worst]="stats.timePatterns.worstTimeSlot === 'night'"></div>
                </div>
                <div class="bar-value">{{ stats.timePatterns.nightAdherence }}%</div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Day Patterns Card -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ 'HISTORY_STATS.DAY_PATTERNS' | translate }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="weekday-comparison">
              <div class="comparison-item">
                <div class="comparison-label">{{ 'HISTORY_STATS.WEEKDAYS' | translate }}</div>
                <div class="comparison-bar" [style.width.%]="stats.dayPatterns.weekdayAdherence"></div>
                <div class="comparison-value">{{ stats.dayPatterns.weekdayAdherence }}%</div>
              </div>
              <div class="comparison-item">
                <div class="comparison-label">{{ 'HISTORY_STATS.WEEKENDS' | translate }}</div>
                <div class="comparison-bar" [style.width.%]="stats.dayPatterns.weekendAdherence"></div>
                <div class="comparison-value">{{ stats.dayPatterns.weekendAdherence }}%</div>
              </div>
            </div>

            <div class="daily-chart">
              @for (day of stats.dayPatterns.dailyAdherence; track day.day) {
                <div class="daily-bar">
                  <div class="daily-fill" [style.height.%]="day.rate"
                       [class.best]="day.day === stats.dayPatterns.bestDay"
                       [class.worst]="day.day === stats.dayPatterns.worstDay"></div>
                  <div class="daily-label">{{ ('HISTORY_STATS.DAY_' + day.day.toUpperCase()) | translate }}</div>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Medication Breakdown Card -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ 'HISTORY_STATS.BY_MEDICATION' | translate }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (stats.medicationBreakdown.length > 0) {
              <div class="medication-list">
                @for (med of stats.medicationBreakdown; track med.medicationId) {
                  <div class="medication-item">
                    <div class="medication-header">
                      <span class="medication-name">{{ med.medicationName }}</span>
                      <ion-chip [color]="getMedicationChipColor(med.adherenceRate)">
                        {{ med.adherenceRate }}%
                      </ion-chip>
                    </div>
                    <div class="medication-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="med.adherenceRate"
                             [class.excellent]="med.adherenceRate >= 90"
                             [class.good]="med.adherenceRate >= 70 && med.adherenceRate < 90"
                             [class.moderate]="med.adherenceRate >= 50 && med.adherenceRate < 70"
                             [class.poor]="med.adherenceRate < 50"></div>
                      </div>
                      <div class="medication-details">
                        <span>{{ med.takenDoses }}/{{ med.totalDoses }} {{ 'HISTORY_STATS.DOSES' | translate }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <p>{{ 'HISTORY_STATS.NO_DATA' | translate }}</p>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Export Button -->
        <div class="export-section">
          <ion-button expand="block" (click)="exportStats()">
            <ion-icon slot="start" name="download-outline"></ion-icon>
            {{ 'HISTORY_STATS.EXPORT_CSV' | translate }}
          </ion-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .stats-container {
      padding: 16px;
      padding-bottom: 80px;
    }

    ion-segment {
      margin-bottom: 16px;
    }

    .adherence-card {
      text-align: center;
    }

    .adherence-circle {
      width: 180px;
      height: 180px;
      margin: 20px auto;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 8px solid;
      position: relative;

      &.excellent {
        border-color: #2E7D32;
        background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
      }

      &.good {
        border-color: #1976D2;
        background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
      }

      &.moderate {
        border-color: #F57C00;
        background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
      }

      &.poor {
        border-color: #C62828;
        background: linear-gradient(135deg, #FFEBEE, #FFCDD2);
      }

      .percentage {
        font-size: 48px;
        font-weight: bold;
      }

      .label {
        font-size: 14px;
        opacity: 0.7;
        margin-top: 8px;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 20px;
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      border-radius: 12px;
      background: var(--ion-color-light);

      &.success {
        background: #E8F5E9;
        color: #2E7D32;
      }

      &.danger {
        background: #FFEBEE;
        color: #C62828;
      }

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .stat-label {
        font-size: 12px;
        opacity: 0.7;
      }
    }

    .insights-card {
      .insight-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        background: var(--ion-color-light);

        ion-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        span {
          flex: 1;
          font-size: 14px;
        }
      }
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .bar-item {
      display: grid;
      grid-template-columns: 80px 1fr 50px;
      align-items: center;
      gap: 12px;

      .bar-label {
        font-size: 14px;
        font-weight: 500;
      }

      .bar-container {
        height: 32px;
        background: var(--ion-color-light);
        border-radius: 16px;
        overflow: hidden;
        position: relative;
      }

      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #1976D2, #42A5F5);
        border-radius: 16px;
        transition: width 0.3s ease;

        &.best {
          background: linear-gradient(90deg, #2E7D32, #66BB6A);
        }

        &.worst {
          background: linear-gradient(90deg, #C62828, #EF5350);
        }
      }

      .bar-value {
        font-size: 14px;
        font-weight: bold;
        text-align: right;
      }
    }

    .weekday-comparison {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .comparison-item {
      display: grid;
      grid-template-columns: 100px 1fr 60px;
      align-items: center;
      gap: 12px;

      .comparison-label {
        font-size: 14px;
        font-weight: 500;
      }

      .comparison-bar {
        height: 24px;
        background: linear-gradient(90deg, #7B1FA2, #AB47BC);
        border-radius: 12px;
      }

      .comparison-value {
        font-size: 14px;
        font-weight: bold;
        text-align: right;
      }
    }

    .daily-chart {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 150px;
      gap: 4px;
      padding: 0 8px;
    }

    .daily-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
    }

    .daily-fill {
      width: 100%;
      background: linear-gradient(180deg, #1976D2, #42A5F5);
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.3s ease;

      &.best {
        background: linear-gradient(180deg, #2E7D32, #66BB6A);
      }

      &.worst {
        background: linear-gradient(180deg, #C62828, #EF5350);
      }
    }

    .daily-label {
      font-size: 10px;
      margin-top: 8px;
      text-align: center;
      font-weight: 500;
    }

    .medication-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .medication-item {
      padding: 12px;
      border-radius: 12px;
      background: var(--ion-color-light);
    }

    .medication-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .medication-name {
        font-weight: 500;
        font-size: 16px;
      }
    }

    .medication-progress {
      .progress-bar {
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;

        &.excellent {
          background: linear-gradient(90deg, #2E7D32, #66BB6A);
        }

        &.good {
          background: linear-gradient(90deg, #1976D2, #42A5F5);
        }

        &.moderate {
          background: linear-gradient(90deg, #F57C00, #FFA726);
        }

        &.poor {
          background: linear-gradient(90deg, #C62828, #EF5350);
        }
      }

      .medication-details {
        font-size: 12px;
        opacity: 0.7;
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }

    .export-section {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .bar-item {
        grid-template-columns: 70px 1fr 45px;
      }

      .daily-label {
        font-size: 9px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryStatsComponent {
  private readonly statsService = inject(HistoryStatsService);

  selectedPeriod = signal<'week' | 'month' | 'year' | 'all'>('month');

  currentStats = computed(() => {
    const period = this.selectedPeriod();
    return this.statsService.calculatePeriodStats(period);
  });

  insights = computed(() => {
    const stats = this.currentStats();
    return this.statsService.getInsights(stats);
  });

  constructor() {
    addIcons({ downloadOutline, trendingUpOutline, trendingDownOutline, removeOutline });
  }

  onPeriodChange(event: any) {
    this.selectedPeriod.set(event.detail.value);
  }

  exportStats() {
    const stats = this.currentStats();
    const csv = this.statsService.exportToCSV(stats);
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `medicamenta-relatorio-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getMedicationChipColor(rate: number): string {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'primary';
    if (rate >= 50) return 'warning';
    return 'danger';
  }

  getInsightIcon(insight: string): string {
    if (insight.includes('Excelente') || insight.includes('🎉')) return 'trending-up-outline';
    if (insight.includes('baixa') || insight.includes('🚨')) return 'trending-down-outline';
    return 'remove-outline';
  }

  getInsightColor(insight: string): string {
    if (insight.includes('Excelente') || insight.includes('🎉')) return 'success';
    if (insight.includes('baixa') || insight.includes('🚨')) return 'danger';
    if (insight.includes('moderada') || insight.includes('⚠️')) return 'warning';
    return 'primary';
  }
}
