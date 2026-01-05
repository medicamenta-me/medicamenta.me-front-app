import { Component, inject, Input, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonNote,
  IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, checkmark } from 'ionicons/icons';
import { MedicationOCRData } from '../../models/ocr.model';

@Component({
  selector: 'app-ocr-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonNote,
    IonIcon
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Revisar Dados</ion-title>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button (click)="confirm()" [strong]="true">
            <ion-icon name="checkmark"></ion-icon>
            Salvar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- Name -->
        <ion-item>
          <ion-label position="stacked">Nome do Medicamento *</ion-label>
          <ion-input 
            [(ngModel)]="editedData.name"
            placeholder="Ex: Dipirona"
            required>
          </ion-input>
        </ion-item>

        <!-- Dosage -->
        <ion-item>
          <ion-label position="stacked">Dosagem</ion-label>
          <ion-input 
            [(ngModel)]="editedData.dosage"
            placeholder="Ex: 500mg">
          </ion-input>
        </ion-item>

        <!-- Form -->
        <ion-item>
          <ion-label position="stacked">Forma</ion-label>
          <ion-input 
            [(ngModel)]="editedData.form"
            placeholder="Ex: comprimido, xarope">
          </ion-input>
        </ion-item>

        <!-- Frequency -->
        <ion-item>
          <ion-label position="stacked">Frequência</ion-label>
          <ion-input 
            [(ngModel)]="editedData.frequency"
            placeholder="Ex: 8/8h, 2x ao dia">
          </ion-input>
        </ion-item>

        <!-- Active Ingredient -->
        <ion-item>
          <ion-label position="stacked">Princípio Ativo</ion-label>
          <ion-input 
            [(ngModel)]="editedData.activeIngredient"
            placeholder="Ex: Dipirona Sódica">
          </ion-input>
        </ion-item>

        <!-- Manufacturer -->
        <ion-item>
          <ion-label position="stacked">Fabricante</ion-label>
          <ion-input 
            [(ngModel)]="editedData.manufacturer"
            placeholder="Ex: EMS">
          </ion-input>
        </ion-item>

        <!-- Instructions -->
        <ion-item>
          <ion-label position="stacked">Instruções</ion-label>
          <ion-textarea 
            [(ngModel)]="editedData.instructions"
            placeholder="Instruções de uso..."
            rows="3">
          </ion-textarea>
        </ion-item>

        <!-- Prescription Info Header -->
        <ion-item lines="none" class="section-header">
          <ion-label>
            <h3>Informações da Receita</h3>
          </ion-label>
        </ion-item>

        <!-- Prescription Number -->
        <ion-item>
          <ion-label position="stacked">Número da Receita</ion-label>
          <ion-input 
            [(ngModel)]="editedData.prescriptionNumber"
            placeholder="Ex: 12345">
          </ion-input>
        </ion-item>

        <!-- Doctor -->
        <ion-item>
          <ion-label position="stacked">Médico</ion-label>
          <ion-input 
            [(ngModel)]="editedData.doctor"
            placeholder="Dr. Nome Sobrenome">
          </ion-input>
        </ion-item>

        <!-- Doctor CRM -->
        <ion-item>
          <ion-label position="stacked">CRM</ion-label>
          <ion-input 
            [(ngModel)]="editedData.doctorCRM"
            placeholder="Ex: CRM-SP 123456">
          </ion-input>
        </ion-item>

        <!-- Prescription Date -->
        <ion-item>
          <ion-label position="stacked">Data da Receita</ion-label>
          <ion-input 
            [(ngModel)]="editedData.prescriptionDate"
            placeholder="DD/MM/AAAA">
          </ion-input>
        </ion-item>

        <!-- Expiration Date -->
        <ion-item>
          <ion-label position="stacked">Validade</ion-label>
          <ion-input 
            [(ngModel)]="editedData.expirationDate"
            placeholder="DD/MM/AAAA">
          </ion-input>
        </ion-item>

        <!-- Confidence Note -->
        <ion-item lines="none">
          <ion-note slot="start">
            Confiança do OCR: {{ originalData.confidence.toFixed(0) }}%
          </ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-list {
      padding: 1rem 0;
    }

    .section-header {
      margin-top: 1.5rem;
      
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-primary);
        margin: 0;
      }
    }

    ion-note {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }
  `]
})
export class OcrEditDialogComponent implements OnInit {
  @Input() data!: MedicationOCRData;

  private modalCtrl = inject(ModalController);

  // Store original and edited data
  originalData!: MedicationOCRData;
  editedData: Partial<MedicationOCRData> = {};

  constructor() {
    addIcons({ close, checkmark });
  }

  ngOnInit(): void {
    // Clone data for editing
    this.originalData = { ...this.data };
    this.editedData = {
      name: this.data.name,
      dosage: this.data.dosage,
      form: this.data.form,
      frequency: this.data.frequency,
      activeIngredient: this.data.activeIngredient,
      manufacturer: this.data.manufacturer,
      instructions: this.data.instructions,
      prescriptionNumber: this.data.prescriptionNumber,
      doctor: this.data.doctor,
      doctorCRM: this.data.doctorCRM,
      prescriptionDate: this.data.prescriptionDate,
      expirationDate: this.data.expirationDate
    };
  }

  /**
   * Cancel and close dialog
   */
  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Confirm and return edited data
   */
  async confirm(): Promise<void> {
    // Validate required fields
    if (!this.editedData.name || this.editedData.name.trim().length === 0) {
      // Show error (could use toast)
      console.error('[OCR Edit Dialog] Name is required');
      return;
    }

    // Merge with original data
    const finalData: MedicationOCRData = {
      ...this.originalData,
      ...this.editedData,
      // Preserve technical fields
      confidence: this.originalData.confidence,
      confidenceLevel: this.originalData.confidenceLevel,
      rawText: this.originalData.rawText,
      language: this.originalData.language
    };

    await this.modalCtrl.dismiss(finalData, 'confirm');
  }
}
