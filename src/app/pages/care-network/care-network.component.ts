import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CareNetworkService } from '../../services/care-network.service';
import { CareForUser, CarerUser, CareInvite } from '../../models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonBadge,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, 
  personAddOutline, 
  checkmarkCircle, 
  closeCircle,
  trashOutline,
  createOutline,
  mailOutline,
  shieldCheckmarkOutline,
  eyeOutline,
  medkitOutline,
  timeOutline,
  arrowBackOutline,
  heartOutline,
  callOutline
} from 'ionicons/icons';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-care-network',
  standalone: true,
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">medicamenta.me</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessible-care-network">
      <div class="care-network-header">
        <h1>{{ 'CARE_NETWORK.TITLE' | translate }}</h1>
        <p>{{ 'CARE_NETWORK.DESCRIPTION' | translate }}</p>
      </div>

      <!-- Back Button -->
      <div class="back-button-container">
        <button class="back-button" (click)="goBack()">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>{{ 'COMMON.BACK' | translate }}</span>
        </button>
      </div>

      <!-- Segments -->
      <div class="segment-container">
        <ion-segment [(ngModel)]="selectedSegment" (ionChange)="onSegmentChange()">
          <ion-segment-button value="care-for">
            <ion-label>{{ 'CARE_NETWORK.I_CARE_FOR' | translate }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="carers">
            <ion-label>{{ 'CARE_NETWORK.WHO_CARE_FOR_ME' | translate }}</ion-label>
            @if (pendingInvites().length > 0) {
              <ion-badge color="danger">{{ pendingInvites().length }}</ion-badge>
            }
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- I Care For Tab -->
      @if (selectedSegment === 'care-for') {
        <div class="tab-content">
          <div class="action-button-container">
            <button class="accessible-action-button" (click)="showAddCareForModal()">
              <ion-icon name="person-add-outline"></ion-icon>
              <span>{{ 'CARE_NETWORK.ADD_CARE_FOR' | translate }}</span>
            </button>
          </div>

          @if (iCareFor().length > 0) {
            <div class="care-list">
              @for (person of iCareFor(); track person.userId) {
                <div class="care-card">
                  <div class="care-card-header">
                    <div class="care-avatar">
                      <img [src]="person.avatarUrl" [alt]="person.name" />
                    </div>
                    <div class="care-info">
                      <h3>{{ person.name }}</h3>
                      @if (person.relationship) {
                        <p class="relationship">
                          <ion-icon name="heart-outline"></ion-icon>
                          {{ person.relationship }}
                        </p>
                      }
                      <p class="email">
                        <ion-icon name="mail-outline"></ion-icon>
                        {{ person.email }}
                      </p>
                      @if (person.phone) {
                        <p class="phone">
                          <ion-icon name="call-outline"></ion-icon>
                          {{ formatPhoneWithDDI(person.phone, person.country) }}
                        </p>
                      }
                      <p class="status-badge" [class.registered]="person.isRegisteredUser">
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                        {{ person.isRegisteredUser ? ('CARE_NETWORK.REGISTERED_USER' | translate) : ('CARE_NETWORK.CONTACT_ONLY' | translate) }}
                      </p>
                    </div>
                  </div>
                  <div class="care-card-actions">
                    <button class="action-btn danger" (click)="confirmRemoveCareFor(person)">
                      <ion-icon name="trash-outline"></ion-icon>
                      {{ 'CARE_NETWORK.REMOVE' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <ion-icon name="people-outline"></ion-icon>
              <h3>{{ 'CARE_NETWORK.NO_CARE_FOR' | translate }}</h3>
            </div>
          }
        </div>
      }

      <!-- Carers Tab -->
      @if (selectedSegment === 'carers') {
        <div class="tab-content">
          <div class="action-button-container">
            <button class="accessible-action-button" (click)="showAddCarerModal()">
              <ion-icon name="person-add-outline"></ion-icon>
              <span>{{ 'CARE_NETWORK.ADD_CARER' | translate }}</span>
            </button>
          </div>

          <!-- Pending Invites -->
          @if (pendingInvites().length > 0) {
            <div class="section-header">
              <h2>{{ 'CARE_NETWORK.PENDING_INVITES' | translate }}</h2>
            </div>
            <div class="invites-list">
              @for (invite of pendingInvites(); track invite.id) {
                <div class="invite-card">
                  <div class="invite-info">
                    <h3>{{ 'CARE_NETWORK.INVITE_FROM' | translate: {name: invite.fromUserName} }}</h3>
                    <p class="email">
                      <ion-icon name="mail-outline"></ion-icon>
                      {{ invite.fromUserEmail }}
                    </p>
                    @if (invite.fromUserPhone) {
                      <p class="phone">
                        <ion-icon name="call-outline"></ion-icon>
                        {{ formatPhoneWithDDI(invite.fromUserPhone, invite.fromUserCountry) }}
                      </p>
                    }
                    <p class="invite-message">{{ invite.type === 'care-for' ? ('CARE_NETWORK.WANTS_TO_CARE' | translate: {name: invite.fromUserName}) : ('CARE_NETWORK.WANTS_YOU_TO_CARE' | translate: {name: invite.fromUserName}) }}</p>
                    <div class="permissions-display">
                      <span class="permission-chip">
                        <ion-icon name="eye-outline"></ion-icon>
                        {{ 'CARE_NETWORK.CAN_VIEW' | translate }}
                      </span>
                      @if (invite.permissions.register) {
                        <span class="permission-chip">
                          <ion-icon name="medkit-outline"></ion-icon>
                          {{ 'CARE_NETWORK.CAN_REGISTER' | translate }}
                        </span>
                      }
                      @if (invite.permissions.administer) {
                        <span class="permission-chip">
                          <ion-icon name="time-outline"></ion-icon>
                          {{ 'CARE_NETWORK.CAN_ADMINISTER' | translate }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="invite-actions">
                    <button class="action-btn success" (click)="acceptInvite(invite)">
                      <ion-icon name="checkmark-circle"></ion-icon>
                      {{ 'CARE_NETWORK.ACCEPT' | translate }}
                    </button>
                    <button class="action-btn danger" (click)="confirmRejectInvite(invite)">
                      <ion-icon name="close-circle"></ion-icon>
                      {{ 'CARE_NETWORK.REJECT' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Carers List -->
          @if (whoCareForMe().length > 0) {
            <div class="section-header">
              <h2>{{ 'CARE_NETWORK.WHO_CARE_FOR_ME' | translate }}</h2>
            </div>
            <div class="care-list">
              @for (carer of whoCareForMe(); track carer.userId) {
                <div class="care-card">
                  <div class="care-card-header">
                    <div class="care-avatar">
                      <img [src]="carer.avatarUrl" [alt]="carer.name" />
                    </div>
                    <div class="care-info">
                      <h3>{{ carer.name }}</h3>
                      <p class="email">
                        <ion-icon name="mail-outline"></ion-icon>
                        {{ carer.email }}
                      </p>
                      @if (carer.phone) {
                        <p class="phone">
                          <ion-icon name="call-outline"></ion-icon>
                          {{ formatPhoneWithDDI(carer.phone, carer.country) }}
                        </p>
                      }
                      <div class="permissions-display">
                        @if (carer.permissions.view) {
                          <span class="permission-chip small">
                            <ion-icon name="eye-outline"></ion-icon>
                            {{ 'CARE_NETWORK.CAN_VIEW' | translate }}
                          </span>
                        }
                        @if (carer.permissions.register) {
                          <span class="permission-chip small">
                            <ion-icon name="medkit-outline"></ion-icon>
                            {{ 'CARE_NETWORK.CAN_REGISTER' | translate }}
                          </span>
                        }
                        @if (carer.permissions.administer) {
                          <span class="permission-chip small">
                            <ion-icon name="time-outline"></ion-icon>
                            {{ 'CARE_NETWORK.CAN_ADMINISTER' | translate }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="care-card-actions">
                    <button class="action-btn secondary" (click)="showEditPermissionsModal(carer)">
                      <ion-icon name="create-outline"></ion-icon>
                      {{ 'CARE_NETWORK.EDIT_PERMISSIONS' | translate }}
                    </button>
                    <button class="action-btn danger" (click)="confirmRemoveCarer(carer)">
                      <ion-icon name="trash-outline"></ion-icon>
                      {{ 'CARE_NETWORK.REMOVE' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            @if (pendingInvites().length === 0) {
              <div class="empty-state">
                <ion-icon name="people-outline"></ion-icon>
                <h3>{{ 'CARE_NETWORK.NO_CARERS' | translate }}</h3>
              </div>
            }
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    /* ============================================
       CARE NETWORK ACCESSIBLE STYLES
       ============================================ */

    .accessible-care-network {
      --background: #F8F9FA;
    }

    /* Header */
    .care-network-header {
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      padding: 2rem 1.5rem;
      color: white;
      text-align: center;
    }

    .care-network-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .care-network-header p {
      font-size: 1.125rem;
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 500;
    }

    /* Back Button */
    .back-button-container {
      padding: 1rem;
      background: #F8F9FA;
    }

    .back-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: transparent;
      border: 2px solid #34D187;
      color: #34D187;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.75rem;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: rgba(52, 209, 135, 0.1);
    }

    .back-button ion-icon {
      font-size: 1.5rem;
    }

    /* Segments */
    .segment-container {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    ion-segment {
      --background: #F8F9FA;
    }

    ion-segment-button {
      --indicator-color: #34D187;
      --color: #6C757D;
      --color-checked: #34D187;
      font-weight: 600;
      min-height: 3rem;
    }

    ion-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }

    /* Tab Content */
    .tab-content {
      padding: 1rem;
    }

    /* Action Button */
    .action-button-container {
      margin-bottom: 1.5rem;
    }

    .accessible-action-button {
      width: 100%;
      height: 3.5rem;
      background: #34D187;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.125rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .accessible-action-button:hover {
      background: #2eb877;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 209, 135, 0.3);
    }

    .accessible-action-button ion-icon {
      font-size: 1.5rem;
    }

    /* Section Header */
    .section-header {
      margin: 1.5rem 0 1rem;
    }

    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0;
    }

    /* Care Cards */
    .care-list,
    .invites-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .care-card,
    .invite-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .care-card-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .care-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      border: 3px solid #34D187;
    }

    .care-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .care-info {
      flex: 1;
    }

    .care-info h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0 0 0.5rem 0;
    }

    .care-info .relationship {
      font-size: 1rem;
      color: #34D187;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .care-info .relationship ion-icon {
      font-size: 1.125rem;
    }

    .care-info .email,
    .care-info .phone {
      font-size: 1rem;
      color: #6C757D;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .care-info .phone {
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      background: #E9ECEF;
      color: #6C757D;
      margin: 0;
    }

    .status-badge.registered {
      background: #D4EDDA;
      color: #155724;
    }

    .status-badge ion-icon {
      font-size: 1rem;
    }

    /* Permissions Display */
    .permissions-display {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.75rem;
      justify-content: center;
      align-items: center;
    }

    .permission-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 600;
      background: #E7F5EF;
      color: #34D187;
      border: 2px solid #34D187;
    }

    .permission-chip.small {
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
    }

    .permission-chip ion-icon {
      font-size: 1.25rem;
    }

    /* Card Actions */
    .care-card-actions,
    .invite-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .action-btn {
      flex: 1;
      min-width: 180px;
      height: 3.25rem;
      border: none;
      border-radius: 8px;
      font-size: 1.0625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      padding: 12px 16px;
    }

    .action-btn ion-icon {
      font-size: 1.25rem;
    }

    .action-btn.success {
      background: #34D187;
      color: white;
    }

    .action-btn.success:hover {
      background: #2eb877;
      transform: translateY(-1px);
    }

    .action-btn.secondary {
      background: #6C757D;
      color: white;
    }

    .action-btn.secondary:hover {
      background: #5A6268;
      transform: translateY(-1px);
    }

    .action-btn.danger {
      background: #B3001B;
      color: white;
    }

    .action-btn.danger:hover {
      background: #8F0016;
      transform: translateY(-1px);
    }

    /* Invite Card */
    .invite-card {
      border-left: 4px solid #34D187;
    }

    .invite-info h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0 0 0.75rem 0;
    }

    .invite-info .email,
    .invite-info .phone {
      font-size: 1rem;
      color: #6C757D;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .invite-info .phone {
      font-weight: 600;
    }

    .invite-info .invite-message {
      font-size: 1rem;
      color: #495057;
      margin: 0.75rem 0 1rem 0;
      font-weight: 500;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-state ion-icon {
      font-size: 5rem;
      color: #DEE2E6;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #6C757D;
      margin: 0;
    }

    /* ============================================
       RESPONSIVE DESIGN
       ============================================ */

    @media (max-width: 576px) {
      .care-network-header {
        padding: 1.5rem 1rem;
      }

      .care-network-header h1 {
        font-size: 1.75rem;
      }

      .care-network-header p {
        font-size: 1rem;
      }

      .care-card-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .care-info {
        width: 100%;
      }

      .care-card-actions,
      .invite-actions {
        flex-direction: column;
      }

      .action-btn {
        width: 100%;
      }
    }

    /* ============================================
       ACCESSIBILITY
       ============================================ */

    @media (prefers-reduced-motion: reduce) {
      .accessible-action-button,
      .action-btn {
        transition: none;
      }
    }

    @media (prefers-contrast: high) {
      .care-card,
      .invite-card {
        border: 2px solid #DEE2E6;
      }

      .permission-chip {
        border: 2px solid #34D187;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonBadge
  ]
})
export class CareNetworkComponent {
  private readonly careNetworkService = inject(CareNetworkService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);

  selectedSegment = 'care-for';
  
  iCareFor = this.careNetworkService.iCareFor;
  whoCareForMe = this.careNetworkService.whoCareForMe;
  pendingInvites = this.careNetworkService.pendingInvites;

  constructor() {
    addIcons({
      peopleOutline,
      personAddOutline,
      checkmarkCircle,
      closeCircle,
      trashOutline,
      createOutline,
      mailOutline,
      shieldCheckmarkOutline,
      eyeOutline,
      medkitOutline,
      timeOutline,
      arrowBackOutline,
      heartOutline,
      callOutline
    });
  }

  goBack() {
    this.router.navigate(['/tabs/profile']);
  }

  onSegmentChange() {
    // Handle segment change if needed
  }

  /**
   * Toggle permission for a carer
   */
  async togglePermission(carer: CarerUser, permissionType: 'register' | 'administer', event: any) {
    const isEnabled = event.detail.checked;
    
    try {
      if (isEnabled) {
        await this.careNetworkService.grantPermission(carer.userId, permissionType);
      } else {
        await this.careNetworkService.revokePermission(carer.userId, permissionType);
      }

      const message = isEnabled
        ? this.translateService.instant('CARE_NETWORK.PERMISSION_GRANTED')
        : this.translateService.instant('CARE_NETWORK.PERMISSION_REVOKED');

      const toast = await this.toastController.create({
        message,
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      console.error('Error toggling permission:', error);
      const toast = await this.toastController.create({
        message: this.translateService.instant('CARE_NETWORK.ERROR_UPDATING_PERMISSION'),
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();

      // Revert toggle
      event.target.checked = !isEnabled;
    }
  }

  /**
   * Format phone number with DDI for display
   */
  formatPhoneWithDDI(phone?: string, country?: string): string {
    if (!phone) return '';
    
    // If phone already has +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Map common country codes to DDI
    const ddiMap: { [key: string]: string } = {
      'BR': '+55',
      'AR': '+54',
      'US': '+1',
      'MX': '+52',
      'CL': '+56',
      'CO': '+57',
      'PE': '+51',
      'UY': '+598',
      'PY': '+595',
      'BO': '+591',
      'EC': '+593',
      'VE': '+58'
    };
    
    const ddi = country ? ddiMap[country] || '' : '';
    return ddi ? `${ddi} ${phone}` : phone;
  }

  async showAddCareForModal() {
    // Step 1: Search by email
    const searchAlert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-green',
      header: this.translateService.instant('CARE_NETWORK.ADD_CARE_FOR'),
      message: this.translateService.instant('CARE_NETWORK.SEARCH_BY_EMAIL'),
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: this.translateService.instant('CARE_NETWORK.EMAIL_PLACEHOLDER')
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('CARE_NETWORK.SEARCH_USER'),
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: async (data) => {
            if (data.email) {
              await this.searchAndAddCareFor(data.email);
            }
            return false; // Keep modal open if no email
          }
        }
      ]
    });

    await searchAlert.present();
  }

  /**
   * Step 2: Search user and show appropriate modal
   */
  async searchAndAddCareFor(email: string) {
    // Search if user exists
    const foundUser = await this.careNetworkService.searchUserByEmail(email);

    if (foundUser) {
      // User found - show confirmation modal
      const confirmAlert = await this.alertController.create({
        cssClass: 'accessible-alert alert-care-network-green',
        header: this.translateService.instant('CARE_NETWORK.USER_FOUND'),
        message: this.translateService.instant('CARE_NETWORK.USER_FOUND_MESSAGE', { name: foundUser.name }),
        buttons: [
          {
            text: this.translateService.instant('COMMON.CANCEL'),
            role: 'cancel',
            cssClass: 'alert-button-cancel'
          },
          {
            text: this.translateService.instant('COMMON.SEND'),
            role: 'confirm',
            cssClass: 'alert-button-confirm',
            handler: async () => {
              const result = await this.careNetworkService.addCareForUser(email, foundUser.name);
              
              if (result.success) {
                const toast = await this.toastController.create({
                  message: this.translateService.instant('CARE_NETWORK.INVITE_SENT'),
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
              } else {
                // Translate error message
                let errorMessage = result.message;
                if (result.message === 'Cannot add yourself as dependent') {
                  errorMessage = this.translateService.instant('CARE_NETWORK.ERROR_CANNOT_ADD_YOURSELF');
                } else if (result.message === 'User already added to care list') {
                  errorMessage = this.translateService.instant('CARE_NETWORK.ERROR_ALREADY_ADDED');
                }
                
                const toast = await this.toastController.create({
                  message: errorMessage,
                  duration: 3000,
                  color: 'danger'
                });
                await toast.present();
              }
            }
          }
        ]
      });
      await confirmAlert.present();
    } else {
      // User not found - show form to add as contact
      const contactAlert = await this.alertController.create({
        cssClass: 'accessible-alert alert-care-network-green',
        header: this.translateService.instant('CARE_NETWORK.ADD_CARE_FOR'),
        message: this.translateService.instant('CARE_NETWORK.USER_NOT_FOUND'),
        inputs: [
          {
            name: 'name',
            type: 'text',
            placeholder: this.translateService.instant('CARE_NETWORK.NAME_PLACEHOLDER'),
            value: ''
          },
          {
            name: 'relationship',
            type: 'text',
            placeholder: this.translateService.instant('CARE_NETWORK.RELATIONSHIP_PLACEHOLDER'),
            value: ''
          }
        ],
        buttons: [
          {
            text: this.translateService.instant('COMMON.CANCEL'),
            role: 'cancel',
            cssClass: 'alert-button-cancel'
          },
          {
            text: this.translateService.instant('COMMON.SAVE'),
            role: 'confirm',
            cssClass: 'alert-button-confirm',
            handler: async (data) => {
              if (data.name) {
                const result = await this.careNetworkService.addCareForUser(email, data.name, data.relationship);
                
                if (result.success) {
                  const toast = await this.toastController.create({
                    message: this.translateService.instant('CARE_NETWORK.CONTACT_ADDED'),
                    duration: 2000,
                    color: 'success'
                  });
                  await toast.present();
                } else {
                  // Translate error message
                  let errorMessage = result.message;
                  if (result.message === 'Cannot add yourself as dependent') {
                    errorMessage = this.translateService.instant('CARE_NETWORK.ERROR_CANNOT_ADD_YOURSELF');
                  } else if (result.message === 'User already added to care list') {
                    errorMessage = this.translateService.instant('CARE_NETWORK.ERROR_ALREADY_ADDED');
                  }
                  
                  const toast = await this.toastController.create({
                    message: errorMessage,
                    duration: 3000,
                    color: 'danger'
                  });
                  await toast.present();
                }
              }
              return !!data.name; // Close modal only if name provided
            }
          }
        ]
      });
      await contactAlert.present();
    }
  }

  async showAddCarerModal() {
    const alert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-green',
      header: this.translateService.instant('CARE_NETWORK.ADD_CARER'),
      message: this.translateService.instant('CARE_NETWORK.PERMISSIONS'),
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: this.translateService.instant('CARE_NETWORK.EMAIL_PLACEHOLDER')
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('COMMON.SEND'),
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: async (data) => {
            if (data.email) {
              const result = await this.careNetworkService.inviteCarer(data.email, {
                view: true,
                register: true,
                administer: true
              });
              
              if (result.success) {
                const toast = await this.toastController.create({
                  message: this.translateService.instant('CARE_NETWORK.INVITE_SENT'),
                  duration: 2000,
                  color: 'success'
                });
                await toast.present();
              } else {
                const toast = await this.toastController.create({
                  message: result.message,
                  duration: 3000,
                  color: 'danger'
                });
                await toast.present();
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async acceptInvite(invite: CareInvite) {
    const success = await this.careNetworkService.acceptInvite(invite);
    
    const toast = await this.toastController.create({
      message: success 
        ? this.translateService.instant('COMMON.SUCCESS')
        : this.translateService.instant('COMMON.ERROR'),
      duration: 2000,
      color: success ? 'success' : 'danger'
    });
    await toast.present();
  }

  async confirmRejectInvite(invite: CareInvite) {
    const alert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-red',
      header: this.translateService.instant('CARE_NETWORK.CONFIRM_REJECT_INVITE'),
      message: this.translateService.instant('CARE_NETWORK.CONFIRM_REJECT_INVITE_MESSAGE', {name: invite.fromUserName}),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('CARE_NETWORK.REJECT'),
          role: 'destructive',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            const success = await this.careNetworkService.rejectInvite(invite.id);
            
            const toast = await this.toastController.create({
              message: success 
                ? this.translateService.instant('COMMON.SUCCESS')
                : this.translateService.instant('COMMON.ERROR'),
              duration: 2000,
              color: success ? 'success' : 'danger'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmRemoveCareFor(person: CareForUser) {
    const alert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-red',
      header: this.translateService.instant('CARE_NETWORK.CONFIRM_REMOVE_CARE_FOR'),
      message: this.translateService.instant('CARE_NETWORK.CONFIRM_REMOVE_CARE_FOR_MESSAGE', {name: person.name}),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('CARE_NETWORK.REMOVE'),
          role: 'destructive',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            const success = await this.careNetworkService.removeCareForUser(person.userId);
            
            const toast = await this.toastController.create({
              message: success 
                ? this.translateService.instant('COMMON.SUCCESS')
                : this.translateService.instant('COMMON.ERROR'),
              duration: 2000,
              color: success ? 'success' : 'danger'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmRemoveCarer(carer: CarerUser) {
    const alert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-red',
      header: this.translateService.instant('CARE_NETWORK.CONFIRM_REMOVE_CARER'),
      message: this.translateService.instant('CARE_NETWORK.CONFIRM_REMOVE_CARER_MESSAGE', {name: carer.name}),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('CARE_NETWORK.REMOVE'),
          role: 'destructive',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            const success = await this.careNetworkService.removeCarer(carer.userId);
            
            const toast = await this.toastController.create({
              message: success 
                ? this.translateService.instant('COMMON.SUCCESS')
                : this.translateService.instant('COMMON.ERROR'),
              duration: 2000,
              color: success ? 'success' : 'danger'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async showEditPermissionsModal(carer: CarerUser) {
    const alert = await this.alertController.create({
      cssClass: 'accessible-alert alert-care-network-green',
      header: this.translateService.instant('CARE_NETWORK.EDIT_PERMISSIONS'),
      message: `${carer.name}<br><br><small>${this.translateService.instant('CARE_NETWORK.VIEW_PERMISSION_ALWAYS_ON')}</small>`,
      inputs: [
        {
          name: 'view',
          type: 'checkbox',
          label: `${this.translateService.instant('CARE_NETWORK.CAN_VIEW')} (${this.translateService.instant('CARE_NETWORK.REQUIRED')})`,
          value: 'view',
          checked: true,
          disabled: true // View is always required
        },
        {
          name: 'register',
          type: 'checkbox',
          label: this.translateService.instant('CARE_NETWORK.CAN_REGISTER'),
          value: 'register',
          checked: carer.permissions.register
        },
        {
          name: 'administer',
          type: 'checkbox',
          label: this.translateService.instant('CARE_NETWORK.CAN_ADMINISTER'),
          value: 'administer',
          checked: carer.permissions.administer
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: this.translateService.instant('CARE_NETWORK.UPDATE_PERMISSIONS'),
          role: 'confirm',
          cssClass: 'alert-button-confirm',
          handler: async (data) => {
            const success = await this.careNetworkService.updateCarerPermissions(carer.userId, {
              view: true, // Always true
              register: data.includes('register'),
              administer: data.includes('administer')
            });
            
            const toast = await this.toastController.create({
              message: success 
                ? this.translateService.instant('CARE_NETWORK.PERMISSIONS_UPDATED')
                : this.translateService.instant('COMMON.ERROR'),
              duration: 2000,
              color: success ? 'success' : 'danger'
            });
            await toast.present();
          }
        }
      ]
    });

    await alert.present();
  }
}
