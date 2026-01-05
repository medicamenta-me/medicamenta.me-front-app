import { Component, inject, signal, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonIcon,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cubeOutline, closeOutline, checkmarkCircle } from 'ionicons/icons';
import { Medication } from '../../models/medication.model';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { StockService } from '../../services/stock.service';
import { LogService } from '../../services/log.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-restock-modal',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonInput,
    IonIcon
],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ 'STOCK.RESTOCK_TITLE' | translate }}</ion-title>
        <ion-button slot="end" fill="clear" (click)="dismiss()">
          <ion-icon name="close-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="restock-modal-content">
      <div class="modal-body">
        <div class="medication-info">
          <div class="info-icon">
            <ion-icon name="cube-outline"></ion-icon>
          </div>
          <div class="info-content">
            <h2>{{ medication.name }}</h2>
            <p class="current-stock">
              {{ 'STOCK.CURRENT_STOCK' | translate }}: 
              <strong>{{ currentStock() }} {{ medication.stockUnit || 'unidades' }}</strong>
            </p>
          </div>
        </div>

        <div class="input-group">
          <label for="quantity-input" class="input-label">
            {{ 'STOCK.RESTOCK_QUANTITY' | translate }}
          </label>
          <ion-input
            id="quantity-input"
            class="restock-input"
            type="number"
            [(ngModel)]="quantity"
            [placeholder]="'STOCK.RESTOCK_QUANTITY_PLACEHOLDER' | translate"
            min="1"
            [attr.aria-label]="'STOCK.RESTOCK_QUANTITY' | translate">
          </ion-input>
        </div>

        @if (quantity > 0) {
          <div class="new-stock-preview">
            <ion-icon name="checkmark-circle"></ion-icon>
            <span>
              {{ 'STOCK.NEW_STOCK_WILL_BE' | translate }}: 
              <strong>{{ currentStock() + quantity }} {{ medication.stockUnit || 'unidades' }}</strong>
            </span>
          </div>
        }
      </div>

      <div class="modal-actions">
        <ion-button expand="block" color="light" (click)="dismiss()">
          {{ 'COMMON.CANCEL' | translate }}
        </ion-button>
        <ion-button 
          expand="block" 
          color="primary" 
          (click)="restock()"
          [disabled]="quantity <= 0 || isLoading()">
          @if (isLoading()) {
            {{ 'COMMON.LOADING' | translate }}
          } @else {
            {{ 'STOCK.RESTOCK' | translate }}
          }
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .restock-modal-content {
      --padding-bottom: 80px;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .medication-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: linear-gradient(135deg, #34D187 0%, #2AB872 100%);
      border-radius: 12px;
      color: white;
      margin-bottom: 1.5rem;
    }

    .info-icon {
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .info-icon ion-icon {
      font-size: 2rem;
      color: white;
    }

    .info-content h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
    }

    .current-stock {
      font-size: 1rem;
      margin: 0;
      opacity: 0.95;
    }

    .current-stock strong {
      font-weight: 700;
    }

    .input-group {
      margin-bottom: 1.5rem;
    }

    .input-label {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1A1A1A;
      margin-bottom: 0.5rem;
    }

    .restock-input {
      --background: #FFFFFF;
      --border-color: #E0E0E0;
      --border-width: 2px;
      --border-style: solid;
      --border-radius: 12px;
      --padding-start: 1rem;
      --padding-end: 1rem;
      --padding-top: 0.875rem;
      --padding-bottom: 0.875rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .new-stock-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(52, 209, 135, 0.1);
      border: 2px solid #34D187;
      border-radius: 12px;
      color: #1B8A5A;
      font-size: 1rem;
      font-weight: 600;
    }

    .new-stock-preview ion-icon {
      font-size: 1.5rem;
      color: #34D187;
      flex-shrink: 0;
    }

    .modal-actions {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem;
      background: white;
      border-top: 1px solid #E0E0E0;
      display: flex;
      gap: 0.75rem;
    }

    .modal-actions ion-button {
      margin: 0;
      flex: 1;
      --border-radius: 12px;
      font-size: 1.0625rem;
      font-weight: 700;
      height: 50px;
    }
  `]
})
export class RestockModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly stockService = inject(StockService);
  private readonly logService = inject(LogService);
  private readonly toastController = inject(ToastController);
  private readonly translationService = inject(TranslationService);

  medication!: Medication;
  quantity = 0;
  currentStock = signal(0);
  isLoading = signal(false);

  constructor() {
    addIcons({
      'cube-outline': cubeOutline,
      'close-outline': closeOutline,
      'checkmark-circle': checkmarkCircle
    });
  }

  ngOnInit() {
    this.currentStock.set(this.medication.currentStock ?? this.medication.stock ?? 0);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async restock() {
    if (this.quantity <= 0) return;

    this.isLoading.set(true);

    try {
      const newStock = this.stockService.addStock(this.medication, this.quantity);
      await this.medicationService.updateMedicationStock(this.medication.id, newStock);

      // If medication was archived, unarchive it
      if (this.medication.isArchived) {
        await this.medicationService.unarchiveMedication(this.medication.id);
      }

      // Log restock action
      const message = this.translationService.instant('HISTORY.EVENTS.RESTOCK', {
        medication: this.medication.name,
        quantity: this.quantity,
        unit: this.medication.stockUnit || 'unidades'
      });
      await this.logService.addLog('restock', message);

      const toast = await this.toastController.create({
        message: this.translationService.instant('STOCK.RESTOCK_SUCCESS'),
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      this.modalController.dismiss({ restocked: true });
    } catch (error) {
      console.error('[RestockModal] Error restocking:', error);
      const toast = await this.toastController.create({
        message: this.translationService.instant('STOCK.RESTOCK_ERROR'),
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading.set(false);
    }
  }
}
