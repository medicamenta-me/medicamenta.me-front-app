import { Component, ChangeDetectionStrategy, inject, computed, signal, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { TranslationService } from '../../../services/translation.service';
import { CountryService, CountryDocument } from '../../../services/country.service';
import { GamificationService } from '../../../services/gamification.service';
import { ShareService } from '../../../services/share.service';
import { AudioService } from '../../../services/audio.service';
import { HapticService } from '../../../services/haptic.service';
import { BiometricService } from '../../../services/biometric.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CountrySelectorComponent, Country } from '../../../shared/country-selector/country-selector.component';
import { NotificationSettingsComponent } from '../../../components/notification-settings/notification-settings.component';
import { LevelBadgeComponent } from '../../../components/level-badge/level-badge.component';
import { AchievementCardComponent } from '../../../components/achievement-card/achievement-card.component';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonAvatar,
  IonIcon,
  IonButton,
  IonToggle,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronForwardOutline, 
  logOutOutline, 
  moonOutline, 
  createOutline, 
  peopleOutline, 
  globeOutline, 
  callOutline, 
  trophyOutline, 
  flameOutline, 
  ribbonOutline,
  arrowForward,
  musicalNotesOutline,
  phonePortraitOutline,
  eyeOutline,
  fingerPrintOutline
} from 'ionicons/icons';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-profile',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (currentUser(); as user) {
        <div class="profile-header">
          @if (hasExternalProvider()) {
            <div class="profile-avatar-container">
              <ion-avatar class="profile-avatar">
                <img [ngSrc]="user.avatarUrl" width="120" height="120" alt="User Avatar"/>
              </ion-avatar>
            </div>
          }
          <h1>{{ user.name }}</h1>
          <p class="user-email">{{ user.email }}</p>
          @if (user.phone) {
            <p class="user-phone">
              <ion-icon name="call-outline"></ion-icon>
              {{ user.phone }}
            </p>
          }
        </div>

        <!-- Gamification Section -->
        <div class="profile-section gamification-section">
          <div class="gamification-header">
            <app-level-badge [compact]="false"></app-level-badge>
          </div>
          
          <div class="gamification-stats">
            <div class="stat-card">
              <div class="stat-icon">
                <ion-icon name="trophy-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ unlockedAchievementsCount() }}</div>
                <div class="stat-label">Conquistas</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">
                <ion-icon name="ribbon-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ totalPoints() }}</div>
                <div class="stat-label">Pontos</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">
                <ion-icon name="flame-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ currentStreak() }}</div>
                <div class="stat-label">Dias de Streak</div>
              </div>
            </div>
          </div>

          <!-- Share Profile Button -->
          <ion-button 
            expand="block" 
            fill="outline"
            class="share-profile-button"
            (click)="onShareProfile()">
            <ion-icon slot="start" name="share-social-outline"></ion-icon>
            Compartilhar Progresso
          </ion-button>

          <!-- Leaderboard Button -->
          <ion-button 
            expand="block" 
            fill="solid"
            color="primary"
            class="leaderboard-button"
            routerLink="/leaderboard">
            <ion-icon slot="start" name="trophy-outline"></ion-icon>
            Ver Ranking
          </ion-button>
        </div>

        <!-- Unlocked Achievements Section -->
        @if (recentAchievements().length > 0) {
          <div class="profile-section achievements-section">
            <div class="section-header">
              <h2>Conquistas Desbloqueadas</h2>
              <ion-button 
                fill="clear" 
                size="small"
                class="view-all-btn"
                routerLink="/achievements">
                Ver Todas
                <ion-icon slot="end" name="arrow-forward"></ion-icon>
              </ion-button>
            </div>
            
            <div class="achievements-grid">
              @for (achievement of recentAchievements(); track achievement.id) {
                <app-achievement-card 
                  [achievement]="achievement">
                </app-achievement-card>
              }
            </div>
          </div>
        }

        <!-- Edit Profile Section -->
        <div class="profile-section edit-profile-section">
          <ion-button 
            expand="block"
            fill="outline"
            class="edit-profile-button" 
            routerLink="/profile/edit">
            <ion-icon slot="start" name="create-outline"></ion-icon>
            {{ 'PROFILE.EDIT' | translate }}
          </ion-button>
        </div>

        <!-- Care Network Section -->
        <div class="profile-section">
          <div class="care-network-card" routerLink="/care-network">
            <div class="care-network-icon">
              <ion-icon name="people-outline"></ion-icon>
            </div>
            <div class="care-network-content">
              <h3>{{ 'CARE_NETWORK.TITLE' | translate }}</h3>
              <p>{{ 'CARE_NETWORK.DESCRIPTION' | translate }}</p>
            </div>
            <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
          </div>
        </div>

        <div class="profile-section">
          <div class="section-header">
            <h2>{{ 'PROFILE.SETTINGS' | translate }}</h2>
          </div>

          <div class="settings-container">
            <div class="setting-item country-selector-item">
              <div class="setting-label">
                <ion-icon name="globe-outline"></ion-icon>
                <span>{{ 'PROFILE.COUNTRY' | translate }}</span>
              </div>
              <app-country-selector
                [countries]="availableCountries()"
                [selectedCountry]="currentCountry()"
                (countrySelected)="onCountryChange($event)">
              </app-country-selector>
            </div>

            <div class="setting-item dark-mode-item">
              <div class="setting-label">
                <ion-icon name="moon-outline"></ion-icon>
                <span>{{ 'PROFILE.DARK_MODE' | translate }}</span>
              </div>
              <div class="dark-mode-buttons">
                <button 
                  type="button"
                  class="dark-mode-btn"
                  [class.active]="!isDarkMode()"
                  (click)="setDarkMode(false)">
                  {{ 'COMMON.NO' | translate }}
                </button>
                <button 
                  type="button"
                  class="dark-mode-btn"
                  [class.active]="isDarkMode()"
                  (click)="setDarkMode(true)">
                  {{ 'COMMON.YES' | translate }}
                </button>
              </div>
            </div>

            <!-- Sound Effects Toggle -->
            <div class="setting-item toggle-item">
              <div class="setting-label">
                <ion-icon name="musical-notes-outline"></ion-icon>
                <span>Efeitos Sonoros</span>
              </div>
              <ion-toggle 
                [checked]="!isSoundMuted()"
                (ionChange)="toggleSound()">
              </ion-toggle>
            </div>

            <!-- Haptic Feedback Toggle -->
            <div class="setting-item toggle-item">
              <div class="setting-label">
                <ion-icon name="phone-portrait-outline"></ion-icon>
                <span>Feedback Tátil</span>
              </div>
              <ion-toggle 
                [checked]="isHapticsEnabled()"
                (ionChange)="toggleHaptics()">
              </ion-toggle>
            </div>

            <!-- Leaderboard Visibility Toggle -->
            <div class="setting-item toggle-item">
              <div class="setting-label">
                <ion-icon name="eye-outline"></ion-icon>
                <span>Aparecer no Ranking</span>
              </div>
              <ion-toggle 
                [checked]="isLeaderboardVisible()"
                (ionChange)="toggleLeaderboardVisibility()">
              </ion-toggle>
            </div>

            <!-- Biometric Authentication Toggle -->
            @if (biometricService.isAvailable()) {
              <div class="setting-item toggle-item">
                <div class="setting-label">
                  <ion-icon name="finger-print-outline"></ion-icon>
                  <span>{{ biometricService.biometryName() }}</span>
                  <span class="setting-description">Acesso rápido e seguro</span>
                </div>
                <ion-toggle 
                  [checked]="biometricService.isEnabled()"
                  (ionChange)="toggleBiometric()">
                </ion-toggle>
              </div>
            }
          </div>
        </div>

        <!-- Phase E: Notification Settings -->
        <div class="profile-section">
          <div class="section-header">
            <h2>{{ 'NOTIFICATIONS.TITLE' | translate }}</h2>
          </div>
          <app-notification-settings></app-notification-settings>
        </div>

        <div class="profile-section">
          <div class="settings-container">
            <ion-button 
              data-cy="logout-button"
              expand="block" 
              fill="outline" 
              color="danger" 
              class="logout-button"
              (click)="logout()">
              <ion-icon name="log-out-outline" slot="start"></ion-icon>
              {{ 'AUTH.LOGOUT' | translate }}
            </ion-button>
          </div>
        </div>
      } @else {
        <p class="ion-padding">{{ 'PROFILE.LOADING' | translate }}</p>
      }
    </ion-content>
  `,
  styles: [`
    /* ============================================
       ACCESSIBLE PROFILE - Minimalista Design
       Optimized for: elderly, visually impaired, autistic, colorblind
       ============================================ */

    /* Profile Header - Similar to Dashboard/Medications */
    .profile-header {
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: white;
      margin-bottom: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .profile-avatar-container {
      margin-bottom: 1.25rem;
    }

    .profile-avatar {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      border: 5px solid white;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .profile-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: white;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }

    .user-email {
      font-size: 1.125rem;
      margin: 0 0 0.5rem 0;
      opacity: 0.95;
      color: white;
      line-height: 1.4;
      font-weight: 500;
    }

    .user-phone {
      font-size: 1.0625rem;
      margin: 0 0 1.5rem 0;
      opacity: 0.9;
      color: white;
      line-height: 1.4;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .user-phone ion-icon {
      font-size: 1.25rem;
    }

    /* Gamification Section */
    .gamification-section {
      background: white;
      padding: 1.5rem;
      margin-bottom: 0;
    }

    .gamification-header {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .gamification-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .stat-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(52, 209, 135, 0.15);
      border-color: #34D187;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon ion-icon {
      font-size: 1.75rem;
      color: white;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #34D187;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6C757D;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .share-profile-button {
      --border-color: #34D187;
      --color: #34D187;
      --color-hover: #2eb877;
      margin-top: 1.5rem;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0.5px;
    }

    .share-profile-button ion-icon {
      font-size: 1.25rem;
    }

    /* Achievements Section */
    .achievements-section {
      background: white;
      padding: 1.5rem;
    }

    .achievements-section .section-header {
      margin-bottom: 1.5rem;
    }

    .view-all-btn {
      --color: #34D187;
      --color-activated: #2eb877;
      font-size: 1rem;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0;
    }

    .view-all-btn ion-icon {
      margin-left: 0.25rem;
      font-size: 1.125rem;
    }

    .achievements-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (max-width: 576px) {
      .gamification-stats {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .stat-card {
        flex-direction: row;
        justify-content: flex-start;
        padding: 1rem;
        text-align: left;
      }

      .stat-content {
        align-items: flex-start;
      }

      .achievements-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (min-width: 577px) and (max-width: 991px) {
      .gamification-stats {
        gap: 1.25rem;
      }
    }

    @media (min-width: 992px) {
      .achievements-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Edit Profile Section */
    .edit-profile-section {
      padding: 1rem;
      background: #f8f9fa;
    }

    .edit-profile-button {
      --border-radius: 12px;
      --border-width: 2px;
      --border-color: #B3001B;
      --color: #B3001B;
      --background: transparent;
      --background-hover: rgba(179, 0, 27, 0.05);
      --background-activated: rgba(179, 0, 27, 0.1);
      --ripple-color: rgba(179, 0, 27, 0.2);
      font-size: 1.125rem;
      font-weight: 700;
      height: 3.5rem;
      margin: 0;
      text-transform: none;
      letter-spacing: 0.025em;
      box-shadow: 0 2px 8px rgba(179, 0, 27, 0.15);
    }

    .edit-profile-button ion-icon {
      font-size: 1.25rem;
    }

    /* Care Network Card */
    .care-network-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 2px solid transparent;
    }

    .care-network-card:hover {
      border-color: #34D187;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 209, 135, 0.2);
    }

    .care-network-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .care-network-icon ion-icon {
      font-size: 2rem;
      color: white;
    }

    .care-network-content {
      flex: 1;
    }

    .care-network-content h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0 0 0.25rem 0;
    }

    .care-network-content p {
      font-size: 0.9375rem;
      color: #6C757D;
      margin: 0;
    }

    .care-network-card .chevron {
      font-size: 1.5rem;
      color: #34D187;
      flex-shrink: 0;
    }

    /* Sections */
    .profile-section {
      padding: 1.5rem 1rem;
      background: #f8f9fa;
    }

    .profile-section:first-of-type {
      padding-top: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .section-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
      margin: 0;
      line-height: 1.3;
      letter-spacing: -0.3px;
    }

    /* Settings Container */
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .setting-item {
      background: white;
      border: none;
      border-radius: 12px;
      padding: 1.375rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.25rem;
      min-height: 4.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .setting-label {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex: 1;
    }

    .setting-label ion-icon {
      font-size: 2rem;
      color: #34D187;
      flex-shrink: 0;
    }

    .setting-label span {
      font-size: 1.125rem;
      font-weight: 700;
      color: #333;
      line-height: 1.4;
      letter-spacing: -0.2px;
    }

    /* Country Selector */
    .country-selector-item {
      flex-direction: column;
      align-items: stretch;
      padding: 1.5rem 1.25rem;
    }

    .country-selector-item .setting-label {
      margin-bottom: 1rem;
    }

    .country-selector-item app-country-selector {
      width: 100%;
      display: block;
    }

    /* Phone Item */
    .phone-item {
      flex-direction: column;
      align-items: stretch;
      padding: 1.5rem 1.25rem;
    }

    .phone-item .setting-label {
      margin-bottom: 1rem;
    }

    .phone-item app-phone-input {
      width: 100%;
      display: block;
    }

    /* Dark Mode Buttons */
    .dark-mode-item {
      flex-direction: row;
      align-items: center;
    }

    /* Toggle Settings */
    .toggle-item {
      flex-direction: row;
      align-items: center;
    }

    .toggle-item ion-toggle {
      --handle-width: 24px;
      --handle-height: 24px;
      --handle-spacing: 4px;
      --background: #e0e0e0;
      --background-checked: #34D187;
      --handle-background: white;
      --handle-background-checked: white;
      width: 52px;
      height: 32px;
    }

    .dark-mode-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .dark-mode-btn {
      flex: 1;
      min-width: 80px;
      padding: 0.875rem 1.5rem;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-family: inherit;
      font-size: 1.125rem;
      font-weight: 700;
      color: #666;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
      letter-spacing: -0.2px;
    }

    .dark-mode-btn:hover {
      border-color: #34D187;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(52, 209, 135, 0.15);
    }

    .dark-mode-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(52, 209, 135, 0.1);
    }

    .dark-mode-btn.active {
      background: #34D187;
      border-color: #34D187;
      color: white;
      box-shadow: 0 4px 8px rgba(52, 209, 135, 0.25);
    }

    .dark-mode-btn.active:hover {
      background: #2eb877;
      border-color: #2eb877;
    }

    .logout-button {
      --border-radius: 12px;
      --border-width: 2px;
      font-size: 1.125rem;
      font-weight: 700;
      height: 3.75rem;
      margin-top: 1rem;
      box-shadow: 0 2px 8px rgba(179, 0, 27, 0.15);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: white;
      border: none;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .empty-icon {
      font-size: 4.5rem;
      color: #bbb;
      margin-bottom: 1.25rem;
    }

    .empty-state p {
      font-size: 1.125rem;
      color: #666;
      margin: 0;
      line-height: 1.5;
      font-weight: 500;
    }

    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      .profile-section {
        background: #121212;
      }

      .gamification-section,
      .achievements-section {
        background: #1e1e1e;
      }

      .stat-card {
        background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
        border-color: #444;
      }

      .stat-card:hover {
        border-color: #34D187;
      }

      .stat-label {
        color: #aaa;
      }

      .section-header h2,
      .setting-label span {
        color: #ffffff;
      }

      .empty-state p {
        color: #cccccc;
      }

      .setting-item,
      .empty-state {
        background: #1e1e1e;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .empty-icon {
        color: #555;
      }

      .dark-mode-btn {
        background: #1e1e1e;
        border-color: #444;
        color: #cccccc;
      }

      .dark-mode-btn:hover {
        background: #2a2a2a;
        border-color: #34D187;
      }

      .dark-mode-btn.active {
        background: #34D187;
        border-color: #34D187;
        color: white;
      }

    }

    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .profile-header {
        background: #34D187;
        border-bottom: 5px solid #000;
      }

      .setting-item,
      .empty-state {
        border: 3px solid #000;
        box-shadow: none;
      }

      .section-header h2,
      .setting-label span {
        font-weight: 900;
      }

      .dark-mode-btn {
        border-width: 3px;
      }

      .dark-mode-btn.active {
        background: #34D187;
        color: #000;
        font-weight: 900;
      }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      .edit-profile-button,
      .logout-button {
        transition: none;
      }

      .dark-mode-btn {
        transition: none;
      }

      .dark-mode-btn:hover {
        transform: none;
      }
    }

    /* Mobile Adjustments */
    @media (max-width: 576px) {
      .profile-header {
        padding: 2rem 1rem;
      }

      .profile-avatar {
        width: 100px;
        height: 100px;
        border-width: 4px;
      }

      .profile-header h1 {
        font-size: 1.75rem;
      }

      .profile-header p {
        font-size: 1rem;
      }

      .edit-profile-button {
        height: 2.5rem;
        font-size: 0.9375rem;
      }

      .profile-section {
        padding: 1.25rem 1rem;
      }

      .section-header h2 {
        font-size: 1.375rem;
      }

      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.25rem 1rem;
      }

      .dark-mode-item {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .country-selector-item,
      .phone-item {
        padding: 1.25rem 1rem;
      }

      .dark-mode-buttons {
        width: 100%;
        gap: 0.5rem;
      }

      .dark-mode-btn {
        min-width: 70px;
        padding: 0.75rem 1.25rem;
        font-size: 1rem;
      }

      .logout-button {
        height: 3.5rem;
      }
    }

    /* Tablet Adjustments */
    @media (min-width: 577px) and (max-width: 991px) {
      .profile-section {
        padding: 1.75rem 1.5rem;
      }

      .setting-item {
        padding: 1.375rem;
      }
    }

    /* Large Text Accessibility */
    @media (min-width: 1200px) {
      .profile-header h1 {
        font-size: 2.5rem;
      }

      .profile-header p {
        font-size: 1.25rem;
      }

      .section-header h2 {
        font-size: 1.75rem;
      }

      .setting-label span {
        font-size: 1.25rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgOptimizedImage,
    CountrySelectorComponent,
    NotificationSettingsComponent,
    LevelBadgeComponent,
    AchievementCardComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonAvatar,
    IonIcon, IonButton, IonToggle,
    TranslateModule
  ],
})
export class ProfileComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly translationService = inject(TranslationService);
  private readonly countryService = inject(CountryService);
  private readonly translate = inject(TranslateService);
  public readonly gamificationService = inject(GamificationService);
  private readonly shareService = inject(ShareService);
  private readonly audioService = inject(AudioService);
  private readonly hapticService = inject(HapticService);
  public readonly biometricService = inject(BiometricService);
  private readonly alertController = inject(AlertController);
  
  // Leaderboard visibility preference (synced with Firestore)
  private readonly leaderboardVisible = signal(
    localStorage.getItem('leaderboardVisible') !== 'false'
  );
  
  public readonly currentUser = this.userService.currentUser;
  public readonly isDarkMode = this.themeService.isDarkMode;
  public readonly firebaseUser = this.authService.currentUser;
  
  // Gamification computed signals
  public readonly unlockedAchievementsCount = computed(() => 
    this.gamificationService.unlockedAchievements().length
  );
  
  public readonly totalPoints = computed(() => 
    this.gamificationService.totalPoints()
  );
  
  public readonly currentStreak = computed(() => 
    this.gamificationService.streak()?.currentStreak || 0
  );
  
  public readonly recentAchievements = computed(() => {
    const unlocked = this.gamificationService.unlockedAchievements();
    const sorted = [...unlocked].sort((a, b) => {
      const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return dateB - dateA;
    });
    return sorted.slice(0, 6);
  });
  
  // Country selector data
  public readonly availableCountries = computed(() => {
    const allCountries = this.countryService.getCountries();
    return allCountries.map((country: CountryDocument) => ({
      code: country.code,
      name: country.name,
      flag: country.flag,
      dialCode: country.phoneCode
    }));
  });
  
  public readonly currentCountry = signal<Country | null>(null);

  constructor() {
    addIcons({ 
      chevronForwardOutline, 
      logOutOutline, 
      moonOutline, 
      createOutline, 
      peopleOutline, 
      globeOutline, 
      callOutline,
      trophyOutline,
      flameOutline,
      ribbonOutline,
      arrowForward,
      musicalNotesOutline,
      phonePortraitOutline,
      eyeOutline,
      fingerPrintOutline
    });
    
    // Initialize current country and phone from user data
    effect(() => {
      const user = this.currentUser();
      if (user) {
        // Update country
        if (user.country) {
          const countryDoc = this.countryService.getCountryByCode(user.country);
          if (countryDoc) {
            this.currentCountry.set({
              code: countryDoc.code,
              name: countryDoc.name,
              flag: countryDoc.flag,
              dialCode: countryDoc.phoneCode
            });
          }
        }
        
        // Sync leaderboard visibility from Firestore
        const firestoreValue = user.leaderboardVisible !== false; // Default to true
        const localStorageValue = localStorage.getItem('leaderboardVisible') !== 'false';
        
        // Sync if values differ
        if (firestoreValue !== localStorageValue) {
          this.leaderboardVisible.set(firestoreValue);
          localStorage.setItem('leaderboardVisible', firestoreValue.toString());
        }
      }
    });
  }
  
  hasExternalProvider(): boolean {
    const firebaseUser = this.firebaseUser();
    if (!firebaseUser?.providerData) {
      return false;
    }
    
    // Check if user has any provider other than email/password
    return firebaseUser.providerData.some(provider => 
      provider.providerId !== 'password' && 
      (provider.providerId.includes('google') || 
       provider.providerId.includes('apple') || 
       provider.providerId.includes('microsoft') ||
       provider.providerId.includes('facebook') ||
       provider.providerId.includes('twitter') ||
       provider.providerId.includes('github'))
    );
  }
  
  setDarkMode(enabled: boolean) {
    if (enabled !== this.isDarkMode()) {
      this.themeService.toggleDarkMode();
    }
  }
  
  async onCountryChange(country: Country) {
    this.currentCountry.set(country);
    
    // Update user country in database
    try {
      await this.userService.updateUser({ country: country.code });
    } catch (error) {
      console.error('Error updating country:', error);
    }
    
    // Change language based on country if available
    const countryDoc = this.countryService.getCountryByCode(country.code);
    if (countryDoc?.language) {
      this.translationService.setLanguage(countryDoc.language);
    }
  }

  toggleDarkMode() {
    this.themeService.toggleDarkMode();
  }

  async onShareProfile(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    const currentLevel = this.gamificationService.currentLevel();

    const stats = {
      userName: user.name,
      level: currentLevel.level, // Extract level number from Level object
      points: this.totalPoints(),
      achievements: this.unlockedAchievementsCount(),
      streak: this.currentStreak()
    };

    await this.shareService.shareProfile(stats);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: this.translate.instant('AUTH.CONFIRM_LOGOUT'),
      message: this.translate.instant('AUTH.CONFIRM_LOGOUT_MESSAGE'),
      cssClass: 'confirm-logout-dialog',
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'cancel-logout-btn'
        },
        {
          text: this.translate.instant('AUTH.LOGOUT'),
          role: 'confirm',
          cssClass: 'confirm-logout-btn',
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

  // Toggle methods for settings
  isSoundMuted(): boolean {
    return this.audioService.isMutedStatus();
  }

  toggleSound(): void {
    this.audioService.toggleMute();
  }

  isHapticsEnabled(): boolean {
    return this.hapticService.isHapticsEnabled();
  }

  toggleHaptics(): void {
    this.hapticService.toggleHaptics();
  }

  isLeaderboardVisible(): boolean {
    return this.leaderboardVisible();
  }

  async toggleLeaderboardVisibility(): Promise<void> {
    const newValue = !this.leaderboardVisible();
    this.leaderboardVisible.set(newValue);
    
    // Update in localStorage for immediate feedback
    localStorage.setItem('leaderboardVisible', newValue.toString());
    
    // Sync with Firestore
    try {
      await this.userService.updateUser({ leaderboardVisible: newValue });
    } catch (error) {
      console.error('[Profile] Failed to sync leaderboard visibility:', error);
      // Revert on error
      this.leaderboardVisible.set(!newValue);
      localStorage.setItem('leaderboardVisible', (!newValue).toString());
    }
  }

  async toggleBiometric(): Promise<void> {
    const currentState = this.biometricService.isEnabled();
    
    if (currentState) {
      // User wants to disable biometric
      await this.biometricService.disable();
    } else {
      // User wants to enable biometric
      await this.biometricService.enable();
    }
  }
}
