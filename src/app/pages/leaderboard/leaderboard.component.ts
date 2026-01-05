import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonButton,
  IonCard,
  IonCardContent,
  IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  trophyOutline, 
  trophy,
  medalOutline,
  flameOutline,
  ribbonOutline,
  chevronBackOutline,
  refreshOutline,
  peopleOutline,
  globeOutline
} from 'ionicons/icons';
import { LeaderboardService } from '../../services/leaderboard.service';
import { LeaderboardPeriod, LeaderboardEntry } from '../../models/leaderboard.model';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonBadge,
    IonIcon,
    IonButton,
    IonCard,
    IonCardContent,
    IonToggle,
    SkeletonComponent
],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-button slot="start" fill="clear" routerLink="/tabs/profile">
          <ion-icon name="chevron-back-outline"></ion-icon>
        </ion-button>
        <ion-title>🏆 Ranking</ion-title>
        <ion-button slot="end" fill="clear" (click)="refresh()">
          <ion-icon name="refresh-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>

      <!-- Period Selector -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedPeriod" (ionChange)="onPeriodChange()">
          <ion-segment-button value="week">
            <ion-label>Semanal</ion-label>
          </ion-segment-button>
          <ion-segment-button value="month">
            <ion-label>Mensal</ion-label>
          </ion-segment-button>
          <ion-segment-button value="allTime">
            <ion-label>Geral</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Leaderboard Type Toggle -->
      <ion-toolbar>
        <div class="leaderboard-toggle">
          <ion-icon name="people-outline" [class.active]="!showGlobal()"></ion-icon>
          <ion-label>Rede de Cuidado</ion-label>
          <ion-toggle 
            [(ngModel)]="showGlobalValue"
            (ionChange)="onToggleChange()"
            color="primary">
          </ion-toggle>
          <ion-label>Global</ion-label>
          <ion-icon name="globe-outline" [class.active]="showGlobal()"></ion-icon>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <!-- Skeleton Screen with Reusable Component -->
        <div class="skeleton-container">
          <!-- Podium Skeleton -->
          <div class="podium-container">
            <div class="podium">
              <!-- 2nd Place Skeleton -->
              <div class="podium-item rank-2">
                <div class="podium-avatar">
                  <app-skeleton type="avatar" [size]="64"></app-skeleton>
                  <app-skeleton type="badge" [size]="28"></app-skeleton>
                </div>
                <app-skeleton type="text" [width]="80" [height]="16"></app-skeleton>
                <app-skeleton type="text" [width]="60" [height]="14"></app-skeleton>
              </div>

              <!-- 1st Place Skeleton -->
              <div class="podium-item rank-1">
                <div class="podium-avatar">
                  <app-skeleton type="avatar" [size]="80"></app-skeleton>
                  <app-skeleton type="badge" [size]="32"></app-skeleton>
                </div>
                <app-skeleton type="text" [width]="80" [height]="16"></app-skeleton>
                <app-skeleton type="text" [width]="60" [height]="14"></app-skeleton>
              </div>

              <!-- 3rd Place Skeleton -->
              <div class="podium-item rank-3">
                <div class="podium-avatar">
                  <app-skeleton type="avatar" [size]="64"></app-skeleton>
                  <app-skeleton type="badge" [size]="28"></app-skeleton>
                </div>
                <app-skeleton type="text" [width]="80" [height]="16"></app-skeleton>
                <app-skeleton type="text" [width]="60" [height]="14"></app-skeleton>
              </div>
            </div>
          </div>

          <!-- List Skeleton -->
          <div class="rankings-list">
            <ion-list>
              <app-skeleton type="list-item" [count]="7"></app-skeleton>
            </ion-list>
          </div>
        </div>
      } @else if (leaderboard()) {
        <!-- Top 3 Podium -->
        @if (leaderboard()!.entries.length >= 3) {
          <div class="podium-container" data-cy="leaderboard-podium">
            <div class="podium">
              <!-- 2nd Place -->
              <div class="podium-item rank-2" data-cy="podium-second">
                <div class="podium-avatar">
                  <ion-avatar>
                    <div class="avatar-placeholder">{{ leaderboard()!.entries[1].userName.charAt(0) }}</div>
                  </ion-avatar>
                  <div class="rank-badge silver">🥈</div>
                </div>
                <div class="podium-name">{{ leaderboard()!.entries[1].userName }}</div>
                <div class="podium-points">{{ leaderboard()!.entries[1].points }} pts</div>
              </div>

              <!-- 1st Place -->
              <div class="podium-item rank-1" data-cy="podium-first">
                <div class="podium-avatar">
                  <ion-avatar>
                    <div class="avatar-placeholder">{{ leaderboard()!.entries[0].userName.charAt(0) }}</div>
                  </ion-avatar>
                  <div class="rank-badge gold">🥇</div>
                </div>
                <div class="podium-name">{{ leaderboard()!.entries[0].userName }}</div>
                <div class="podium-points">{{ leaderboard()!.entries[0].points }} pts</div>
              </div>

              <!-- 3rd Place -->
              <div class="podium-item rank-3" data-cy="podium-third">
                <div class="podium-avatar">
                  <ion-avatar>
                    <div class="avatar-placeholder">{{ leaderboard()!.entries[2].userName.charAt(0) }}</div>
                  </ion-avatar>
                  <div class="rank-badge bronze">🥉</div>
                </div>
                <div class="podium-name">{{ leaderboard()!.entries[2].userName }}</div>
                <div class="podium-points">{{ leaderboard()!.entries[2].points }} pts</div>
              </div>
            </div>
          </div>
        }

        <!-- Remaining Rankings (4-10) -->
        <div class="rankings-list">
          <ion-list data-cy="leaderboard-list">
            @for (entry of getRemainingEntries(); track entry.userId) {
              <ion-item 
                data-cy="leaderboard-entry"
                [class.current-user]="entry.isCurrentUser"
                lines="full">
                <div class="rank-number" slot="start">
                  {{ entry.rank }}
                </div>
                <ion-avatar slot="start">
                  <div class="avatar-placeholder">{{ entry.userName.charAt(0) }}</div>
                </ion-avatar>
                <ion-label>
                  <h2>{{ entry.userName }}</h2>
                  <p>
                    <ion-icon name="trophy-outline"></ion-icon> {{ entry.achievements }} conquistas
                    <ion-icon name="flame-outline"></ion-icon> {{ entry.streak }} dias
                  </p>
                </ion-label>
                <div class="entry-points" slot="end">
                  <ion-badge color="primary">{{ entry.points }}</ion-badge>
                  <span class="points-label">pontos</span>
                </div>
              </ion-item>
            }
          </ion-list>
        </div>

        <!-- Current User Position (if not in top 10) -->
        @if (leaderboard()!.userPosition && leaderboard()!.userPosition! > 10) {
          <ion-card class="user-position-card">
            <ion-card-content>
              <div class="user-position-header">
                <h3>Sua Posição</h3>
                <ion-badge color="medium"># {{ leaderboard()!.userPosition }}</ion-badge>
              </div>
              
              @if (leaderboard()!.userEntry) {
                <ion-item lines="none" class="current-user">
                  <div class="rank-number" slot="start">
                    {{ leaderboard()!.userEntry!.rank }}
                  </div>
                  <ion-avatar slot="start">
                    <div class="avatar-placeholder">{{ leaderboard()!.userEntry!.userName.charAt(0) }}</div>
                  </ion-avatar>
                  <ion-label>
                    <h2>{{ leaderboard()!.userEntry!.userName }}</h2>
                    <p>
                      <ion-icon name="trophy-outline"></ion-icon> {{ leaderboard()!.userEntry!.achievements }}
                      <ion-icon name="flame-outline"></ion-icon> {{ leaderboard()!.userEntry!.streak }}
                    </p>
                  </ion-label>
                  <div class="entry-points" slot="end">
                    <ion-badge color="primary">{{ leaderboard()!.userEntry!.points }}</ion-badge>
                  </div>
                </ion-item>
              }
            </ion-card-content>
          </ion-card>
        }

      } @else {
        <div class="empty-state">
          <ion-icon name="trophy-outline"></ion-icon>
          <h2>Nenhum dado disponível</h2>
          <p>Complete conquistas para aparecer no ranking!</p>
          <ion-button routerLink="/tabs/achievements">
            Ver Conquistas
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    /* Leaderboard Toggle */
    .leaderboard-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
    }

    .leaderboard-toggle ion-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .leaderboard-toggle ion-icon {
      font-size: 20px;
      color: var(--ion-color-medium);
      transition: all 0.3s ease;
    }

    .leaderboard-toggle ion-icon.active {
      color: var(--ion-color-primary);
      transform: scale(1.2);
    }

    .leaderboard-toggle ion-toggle {
      --handle-width: 20px;
      --handle-height: 20px;
    }

    /* Skeleton Animations */
    @keyframes shimmer {
      0% {
        background-position: -468px 0;
      }
      100% {
        background-position: 468px 0;
      }
    }

    .skeleton-container {
      animation: fadeIn 0.3s ease-in;
    }

    .skeleton-text,
    .skeleton-avatar,
    .skeleton-badge,
    .skeleton-rank,
    .skeleton-points-badge {
      background: linear-gradient(
        to right,
        #eeeeee 8%,
        #dddddd 18%,
        #eeeeee 33%
      );
      background-size: 800px 104px;
      animation: shimmer 1.5s infinite linear;
      border-radius: 4px;
    }

    /* Podium Skeleton */
    .podium-item.skeleton .skeleton-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin-bottom: 0.5rem;
    }

    .podium-item.rank-1.skeleton .skeleton-avatar {
      width: 80px;
      height: 80px;
    }

    .podium-item.skeleton .skeleton-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      position: absolute;
      bottom: 0;
      right: -4px;
    }

    .podium-item.skeleton .skeleton-name {
      width: 80px;
      height: 14px;
      margin: 0.5rem auto 0.25rem;
    }

    .podium-item.skeleton .skeleton-points {
      width: 60px;
      height: 12px;
      margin: 0 auto;
    }

    /* List Skeleton */
    .skeleton-item {
      --padding-start: 16px;
      --padding-end: 16px;
    }

    .skeleton-rank {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      margin-right: 16px;
    }

    .skeleton-item .skeleton-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 16px;
    }

    .skeleton-name-list {
      width: 140px;
      height: 18px;
      margin-bottom: 8px;
    }

    .skeleton-info {
      width: 180px;
      height: 14px;
    }

    .skeleton-points-badge {
      width: 60px;
      height: 28px;
      border-radius: 14px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 1rem;
    }

    .podium-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
      margin-bottom: 1rem;
    }

    .podium {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 1rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .podium-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .rank-1 {
      transform: translateY(-20px);
    }

    .podium-avatar {
      position: relative;
    }

    .podium-avatar ion-avatar {
      width: 80px;
      height: 80px;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .rank-1 .podium-avatar ion-avatar {
      width: 100px;
      height: 100px;
    }

    .rank-badge {
      position: absolute;
      bottom: -10px;
      right: -10px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .rank-1 .rank-badge {
      width: 48px;
      height: 48px;
      font-size: 28px;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      color: white;
      font-size: 32px;
      font-weight: bold;
    }

    .rank-1 .avatar-placeholder {
      font-size: 40px;
    }

    .podium-name {
      color: white;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
    }

    .rank-1 .podium-name {
      font-size: 16px;
    }

    .podium-points {
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      font-size: 12px;
    }

    .rank-1 .podium-points {
      font-size: 14px;
    }

    .rankings-list {
      padding: 0 1rem 1rem;
    }

    ion-item {
      --padding-start: 1rem;
      --padding-end: 1rem;
      --min-height: 72px;
    }

    ion-item.current-user {
      --background: rgba(52, 209, 135, 0.1);
      border-left: 4px solid #34D187;
    }

    .rank-number {
      font-size: 20px;
      font-weight: 700;
      color: var(--ion-color-medium);
      min-width: 40px;
      text-align: center;
    }

    ion-label h2 {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }

    ion-label p {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 13px;
      color: var(--ion-color-medium);
    }

    ion-label p ion-icon {
      font-size: 14px;
    }

    .entry-points {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .points-label {
      font-size: 11px;
      color: var(--ion-color-medium);
    }

    .user-position-card {
      margin: 1rem;
    }

    .user-position-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .user-position-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      text-align: center;
      gap: 1rem;
    }

    .empty-state ion-icon {
      font-size: 80px;
      color: var(--ion-color-medium);
      opacity: 0.5;
    }

    .empty-state h2 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      font-size: 16px;
      margin: 0;
    }
  `]
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private leaderboardService = inject(LeaderboardService);

  // State
  public selectedPeriod: LeaderboardPeriod = 'allTime';
  public readonly leaderboard = this.leaderboardService.leaderboard;
  public readonly isLoading = this.leaderboardService.isLoading;
  
  // Toggle state for UI binding
  public showGlobalValue = false;
  public readonly showGlobal = signal<boolean>(false);

  constructor() {
    addIcons({ 
      trophyOutline, 
      trophy, 
      medalOutline, 
      flameOutline, 
      ribbonOutline, 
      chevronBackOutline,
      refreshOutline,
      peopleOutline,
      globeOutline
    });

    // Load toggle preference from localStorage
    const savedPreference = localStorage.getItem('leaderboard_show_global');
    if (savedPreference !== null) {
      this.showGlobalValue = savedPreference === 'true';
      this.showGlobal.set(this.showGlobalValue);
    }
  }

  ngOnInit() {
    // Use real-time listener instead of one-time load
    this.loadLeaderboard();
  }

  ngOnDestroy() {
    // Stop real-time listener on component destroy
    this.leaderboardService.stopRealtimeLeaderboard();
  }

  async onPeriodChange() {
    await this.loadLeaderboard();
  }

  async onToggleChange() {
    // Update signal
    this.showGlobal.set(this.showGlobalValue);
    
    // Save preference to localStorage
    localStorage.setItem('leaderboard_show_global', this.showGlobalValue.toString());
    
    // Reload leaderboard with new scope
    await this.loadLeaderboard();
  }

  async loadLeaderboard() {
    // Start real-time listener
    await this.leaderboardService.startRealtimeLeaderboard(this.selectedPeriod, this.showGlobal());
  }

  async refresh() {
    await this.loadLeaderboard();
  }

  getRemainingEntries(): LeaderboardEntry[] {
    const entries = this.leaderboard()?.entries || [];
    return entries.slice(3); // Skip top 3 (podium)
  }
}
