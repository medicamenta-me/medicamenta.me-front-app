/**
 * EXEMPLO PRÁTICO: Página de Adicionar Dependente
 * 
 * Este exemplo mostra como integrar o sistema de feature mapping
 * em uma página real do aplicativo
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Feature Mapping imports
import { 
  FeatureMappingService,
  useFeatureLimitHelpers,
  HasFeatureDirective,
  IsPremiumDirective,
} from '../feature-mapping.index';

interface DependentLimitInfo {
  current: number;
  limit: number;
  display: string;
  percentage: number;
  canAddMore: boolean;
  isUnlimited: boolean;
}

@Component({
  selector: 'app-add-dependent-example',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    HasFeatureDirective,
    IsPremiumDirective,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button></ion-back-button>
        </ion-buttons>
        <ion-title>Adicionar Dependente</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Limit Status Card -->
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>Limite de Dependentes</ion-card-subtitle>
          <ion-card-title>{{ limitInfo().display }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <!-- Progress bar (only if not unlimited) -->
          <ion-progress-bar 
            *ngIf="!limitInfo().isUnlimited"
            [value]="limitInfo().percentage / 100"
            [color]="getProgressColor()">
          </ion-progress-bar>

          <!-- Unlimited badge -->
          <ion-badge *ngIf="limitInfo().isUnlimited" color="success">
            <ion-icon name="infinite"></ion-icon>
            Ilimitado
          </ion-badge>

          <!-- Warning if near limit -->
          <ion-note 
            *ngIf="!limitInfo().isUnlimited && limitInfo().percentage >= 80"
            color="warning"
            class="ion-margin-top ion-text-center">
            <ion-icon name="warning"></ion-icon>
            Você está próximo do limite!
          </ion-note>

          <!-- Upgrade prompt if at limit -->
          <div *ngIf="!limitInfo().canAddMore" class="upgrade-prompt">
            <ion-icon name="lock-closed" color="warning"></ion-icon>
            <p>Limite atingido!</p>
            <ion-button 
              expand="block" 
              color="primary"
              (click)="navigateToUpgrade()">
              <ion-icon name="arrow-up-circle" slot="start"></ion-icon>
              Fazer Upgrade
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Premium Features Teaser -->
      <ion-card *hasFeature="'add_dependents'; else premiumTeaser">
        <!-- Form (only shows if has access) -->
        <ion-card-content>
          <form [formGroup]="dependentForm" (ngSubmit)="onSubmit()">
            <ion-item>
              <ion-label position="stacked">Nome do Dependente</ion-label>
              <ion-input 
                formControlName="name"
                type="text"
                placeholder="Ex: Maria Silva">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Data de Nascimento</ion-label>
              <ion-input 
                formControlName="birthDate"
                type="date">
              </ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Parentesco</ion-label>
              <ion-select formControlName="relationship">
                <ion-select-option value="filho">Filho(a)</ion-select-option>
                <ion-select-option value="pai">Pai</ion-select-option>
                <ion-select-option value="mae">Mãe</ion-select-option>
                <ion-select-option value="avos">Avô/Avó</ion-select-option>
                <ion-select-option value="outro">Outro</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-button 
              expand="block" 
              type="submit"
              [disabled]="!dependentForm.valid || !limitInfo().canAddMore"
              class="ion-margin-top">
              <ion-icon name="add-circle" slot="start"></ion-icon>
              Adicionar Dependente
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>

      <!-- Premium Teaser (shows for free users) -->
      <ng-template #premiumTeaser>
        <ion-card class="premium-card">
          <ion-card-header>
            <ion-badge color="warning">Premium</ion-badge>
            <ion-card-title>Desbloqueie Dependentes Ilimitados</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <p>Com o plano Premium você pode:</p>
            <ul>
              <li>
                <ion-icon name="checkmark-circle" color="success"></ion-icon>
                Adicionar dependentes ilimitados
              </li>
              <li>
                <ion-icon name="checkmark-circle" color="success"></ion-icon>
                Gerenciar medicações de toda a família
              </li>
              <li>
                <ion-icon name="checkmark-circle" color="success"></ion-icon>
                Receber insights avançados
              </li>
              <li>
                <ion-icon name="checkmark-circle" color="success"></ion-icon>
                Scanner OCR de receitas
              </li>
            </ul>

            <div class="pricing">
              <div class="price">
                <span class="amount">R$ 14,90</span>
                <span class="period">/mês</span>
              </div>
              <span class="annual">ou R$ 149,00/ano (20% off)</span>
            </div>

            <ion-button 
              expand="block" 
              color="primary"
              size="large"
              (click)="navigateToUpgrade()">
              <ion-icon name="rocket" slot="start"></ion-icon>
              Começar Agora
            </ion-button>

            <ion-button 
              expand="block" 
              fill="clear"
              size="small"
              (click)="learnMore()">
              Saber Mais
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ng-template>

      <!-- Current Dependents List (Premium Feature) -->
      <div *isPremium>
        <h2 class="ion-padding-start">Dependentes Cadastrados</h2>
        <ion-card *ngFor="let dependent of mockDependents">
          <ion-item>
            <ion-avatar slot="start">
              <ion-icon name="person-circle"></ion-icon>
            </ion-avatar>
            <ion-label>
              <h3>{{ dependent.name }}</h3>
              <p>{{ dependent.relationship }}</p>
            </ion-label>
            <ion-button fill="clear" slot="end">
              <ion-icon name="ellipsis-vertical"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .upgrade-prompt {
      text-align: center;
      padding: 1.5rem;
      
      ion-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      p {
        font-weight: 600;
        color: var(--ion-color-medium);
        margin-bottom: 1rem;
      }
    }

    .premium-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      ion-card-title,
      ion-card-content,
      p, li {
        color: white;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0;

        li {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;

          ion-icon {
            margin-right: 0.75rem;
            font-size: 1.2rem;
          }
        }
      }

      .pricing {
        text-align: center;
        margin: 1.5rem 0;

        .price {
          .amount {
            font-size: 2.5rem;
            font-weight: bold;
          }

          .period {
            font-size: 1rem;
            opacity: 0.9;
          }
        }

        .annual {
          display: block;
          font-size: 0.9rem;
          opacity: 0.9;
          margin-top: 0.5rem;
        }
      }
    }

    ion-progress-bar {
      margin: 1rem 0;
      height: 8px;
      border-radius: 4px;
    }

    ion-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
  `]
})
export class AddDependentExamplePage {
  private featureMapping = inject(FeatureMappingService);
  private helpers = useFeatureLimitHelpers();
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private modalController = inject(ModalController);

  // Signals
  limitInfo = signal<DependentLimitInfo>({
    current: 0,
    limit: 1,
    display: '0/1',
    percentage: 0,
    canAddMore: true,
    isUnlimited: false,
  });

  // Form
  dependentForm: FormGroup;

  // Mock data
  mockDependents = [
    { name: 'João Silva', relationship: 'Filho' },
  ];

  constructor() {
    this.dependentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      birthDate: ['', Validators.required],
      relationship: ['', Validators.required],
    });

    this.loadLimitInfo();
  }

  async loadLimitInfo() {
    const currentCount = await this.getCurrentDependentCount();
    const limits = this.featureMapping.getCurrentPlanLimits();
    const result = await this.featureMapping.canAddDependent(currentCount);

    this.limitInfo.set({
      current: currentCount,
      limit: limits.maxDependents,
      display: this.helpers.getUsageDisplay(currentCount, 'maxDependents'),
      percentage: this.helpers.getUsagePercentage(currentCount, 'maxDependents'),
      canAddMore: result.allowed,
      isUnlimited: limits.maxDependents === -1,
    });
  }

  async onSubmit() {
    if (!this.dependentForm.valid) return;

    // Validate limit
    const currentCount = await this.getCurrentDependentCount();
    const canAdd = await this.helpers.canAddDependent(currentCount);

    if (!canAdd) {
      return; // Modal already shown by helper
    }

    try {
      // Save to database
      await this.saveDependentToDatabase(this.dependentForm.value);

      // Show success
      await this.showSuccessToast();

      // Reset form
      this.dependentForm.reset();

      // Reload limits
      await this.loadLimitInfo();

      // Navigate back
      this.router.navigate(['/dependents']);
    } catch (error) {
      console.error('Error adding dependent:', error);
      await this.showErrorToast();
    }
  }

  getProgressColor(): string {
    const percentage = this.limitInfo().percentage;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'primary';
  }

  navigateToUpgrade() {
    this.featureMapping.navigateToUpgrade('add_dependents', 'limit_maxDependents');
  }

  learnMore() {
    this.router.navigate(['/pricing']);
  }

  private async getCurrentDependentCount(): Promise<number> {
    // In real app, fetch from database
    // For now, return mock data
    return this.mockDependents.length;
  }

  private async saveDependentToDatabase(dependentData: any): Promise<void> {
    // In real app, save to Firestore
    console.log('Saving dependent:', dependentData);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async showSuccessToast() {
    // Toast implementation
    console.log('Dependente adicionado com sucesso!');
  }

  private async showErrorToast() {
    // Toast implementation
    console.log('Erro ao adicionar dependente');
  }
}
