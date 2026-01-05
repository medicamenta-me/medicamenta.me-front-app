import { Component, signal, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonIcon,
  IonProgressBar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonButtons,
  IonBackButton,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  camera, 
  image as imageIcon, 
  closeCircle, 
  checkmarkCircle, 
  refresh, 
  save,
  close, create } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { OcrService } from '../../services/ocr.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { OCRResult } from '../../models/ocr.model';
import { Medication } from '../../models/medication.model';
import { OcrEditDialogComponent } from '../ocr-edit-dialog/ocr-edit-dialog.component';

@Component({
  selector: 'app-ocr-scanner',
  standalone: true,
  imports: [
    TranslateModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonProgressBar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonButtons,
    IonBackButton
],
  templateUrl: './ocr-scanner.component.html',
  styleUrls: ['./ocr-scanner.component.scss']
})
export class OcrScannerComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly ocrService = inject(OcrService);
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AuthService);
  private readonly medicationService = inject(MedicationServiceV2);

  // State Signals
  capturedImage = signal<string | null>(null);
  isProcessing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  result = signal<OCRResult | null>(null);
  error = signal<string | null>(null);

  // Computed from OCR Service
  status = this.ocrService.status;
  progress = this.ocrService.progress;

  constructor() {
    addIcons({close,camera,refresh,closeCircle,checkmarkCircle,create,save,image:imageIcon});
  }

  /**
   * Take photo with camera
   */
  async takePhoto(): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: true,
        correctOrientation: true
      });

      if (photo.dataUrl) {
        this.capturedImage.set(photo.dataUrl);
        
        // Auto-process after capture
        this.processImage(photo.dataUrl).catch(console.error);
      }

    } catch (err: unknown) {
      console.error('[OCR Scanner] Camera error:', err);
      
      // Check if user denied permission
      if (err instanceof Error && err.message.includes('denied')) {
        this.showError(this.translate.instant('OCR.ERRORS.CAMERA_PERMISSION_DENIED')).catch(console.error);
      } else {
        this.showError(this.translate.instant('OCR.ERRORS.CAMERA_ACCESS')).catch(console.error);
      }
    }
  }

  /**
   * Pick image from gallery
   */
  async pickFromGallery(): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90
      });

      if (photo.dataUrl) {
        this.capturedImage.set(photo.dataUrl);
        
        // Auto-process after selection
        this.processImage(photo.dataUrl).catch(console.error);
      }

    } catch (err: unknown) {
      console.error('[OCR Scanner] Gallery error:', err);
      this.showError(this.translate.instant('OCR.ERRORS.GALLERY_ERROR')).catch(console.error);
    }
  }

  /**
   * Process captured image with OCR
   */
  private async processImage(imageData: string): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      this.showError(this.translate.instant('OCR.ERRORS.NOT_AUTHENTICATED')).catch(console.error);
      return;
    }

    this.isProcessing.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const ocrResult = await this.ocrService.processImage(imageData, userId);
      this.result.set(ocrResult);
      
      // Show success message
      if (ocrResult.extractedData?.name) {
        this.showSuccess(this.translate.instant('OCR.DETECTED', { name: ocrResult.extractedData.name })).catch(console.error);
      } else {
        this.showSuccess(this.translate.instant('OCR.SCAN_COMPLETE')).catch(console.error);
      }

    } catch (err: unknown) {
      console.error('[OCR Scanner] Processing error:', err);
      
      if (err instanceof Error) {
        this.error.set(err.message);
        this.showError(err.message).catch(console.error);
      } else {
        this.error.set(this.translate.instant('OCR.ERRORS.PROCESSING_ERROR'));
        this.showError(this.translate.instant('OCR.ERRORS.PROCESSING_ERROR')).catch(console.error);
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Retry with current image
   */
  async retry(): Promise<void> {
    const image = this.capturedImage();
    if (image) {
      this.processImage(image).catch(console.error);
    }
  }

  /**
   * Clear and start over
   */
  reset(): void {
    this.capturedImage.set(null);
    this.result.set(null);
    this.error.set(null);
    this.isProcessing.set(false);
    this.ocrService.reset();
  }

  /**
   * Edit extracted data before saving
   */
  async editMedication(): Promise<void> {
    const extractedData = this.result()?.extractedData;
    if (!extractedData) return;

    const modal = await this.modalCtrl.create({
      component: OcrEditDialogComponent,
      componentProps: {
        data: extractedData
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      // Update result with edited data
      const currentResult = this.result();
      if (currentResult) {
        currentResult.extractedData = data;
        this.result.set({ ...currentResult });
      }

      // Auto-save after edit
      await this.saveMedication();
    }
  }

  /**
   * Save extracted medication data
   */
  async saveMedication(): Promise<void> {
    const extractedData = this.result()?.extractedData;
    if (!extractedData?.name) {
      this.showError('Nenhum medicamento detectado para salvar.').catch(console.error);
      return;
    }

    this.isSaving.set(true);

    try {
      // Convert OCR data to Medication format
      const medicationData: Omit<Medication, 'id'> = {
        name: extractedData.name,
        patientId: this.auth.currentUser()?.uid || '',
        dosage: extractedData.dosage || '',
        frequency: this.parseFrequencyToString(extractedData.frequency),
        schedule: this.parseScheduleFromFrequency(extractedData.frequency),
        stock: 0,
        notes: this.buildNotes(extractedData),
        userId: this.auth.currentUser()?.uid || '',
        lastModified: new Date(),
        // Stock info
        currentStock: 0,
        stockUnit: this.parseStockUnit(extractedData.form),
        lowStockThreshold: 5,
        // Optional fields from OCR
      };

      // Save to Firestore via MedicationService
      await this.medicationService.addMedication(medicationData);

      // Track success
      this.analytics.logEvent('medication_created_from_ocr', {
        confidence: this.result()?.confidence || 0,
        has_dosage: !!extractedData.dosage,
        has_frequency: !!extractedData.frequency,
        has_instructions: !!extractedData.instructions
      });

      this.showSuccess('Medicamento salvo com sucesso!').catch(console.error);
      this.close().catch(console.error);

    } catch (err: unknown) {
      console.error('[OCR Scanner] Failed to save medication:', err);
      
      const errorMessage = err instanceof Error ? err.message : this.translate.instant('OCR.ERRORS.SAVE_ERROR');
      this.showError(errorMessage).catch(console.error);

      // Track error
      this.analytics.logEvent('medication_save_failed', {
        error: errorMessage
      });

    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Parse frequency from OCR text to string format
   */
  private parseFrequencyToString(frequencyText?: string): string {
    if (!frequencyText) return 'Diariamente';

    const text = frequencyText.toLowerCase();

    // Return original if it looks good
    if (text.includes('/') || text.includes('x')) {
      return frequencyText;
    }

    return 'Diariamente';
  }

  /**
   * Parse frequency from OCR text to array format (for future use)
   * Examples: "8/8h" -> ['08:00', '16:00', '00:00']
   *           "2x ao dia" -> ['08:00', '20:00']
   */
  private parseFrequency(frequencyText?: string): string[] {
    if (!frequencyText) return ['08:00'];

    const text = frequencyText.toLowerCase();

    // Pattern: 8/8h, 12/12h
    const hourPattern = /(\d+)\/\d+\s*h/;
    const hourMatch = hourPattern.exec(text);
    if (hourMatch) {
      const interval = Number.parseInt(hourMatch[1], 10);
      const times: string[] = [];
      for (let hour = 8; hour < 24; hour += interval) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
      if (times.length === 0) times.push('08:00');
      return times;
    }

    // Pattern: 2x ao dia, 3x por dia
    const timesPattern = /(\d+)\s*x\s*(ao|por)\s*dia/;
    const timesMatch = timesPattern.exec(text);
    if (timesMatch) {
      const count = Number.parseInt(timesMatch[1], 10);
      if (count === 1) return ['08:00'];
      if (count === 2) return ['08:00', '20:00'];
      if (count === 3) return ['08:00', '14:00', '20:00'];
      if (count === 4) return ['08:00', '12:00', '16:00', '20:00'];
    }

    // Default
    return ['08:00'];
  }

  /**
   * Parse time array to single string (for backward compatibility)
   */
  private parseTimeFromFrequency(frequencyText?: string): string {
    const times = this.parseFrequency(frequencyText);
    return times[0] || '08:00';
  }

  /**
   * Parse frequency to Dose[] schedule format
   */
  private parseScheduleFromFrequency(frequencyText?: string): { time: string; status: 'upcoming' | 'taken' | 'missed' }[] {
    const times = this.parseFrequency(frequencyText);
    return times.map(time => ({
      time,
      status: 'upcoming' as const
    }));
  }

  /**
   * Build comprehensive notes from OCR data
   */
  private buildNotes(data: any): string {
    const notes: string[] = [];

    if (data.instructions) {
      notes.push(`Instruções: ${data.instructions}`);
    }

    if (data.prescriptionNumber) {
      notes.push(`Receita: ${data.prescriptionNumber}`);
    }

    if (data.doctor) {
      const doctorInfo = data.doctorCRM ? `${data.doctor} (${data.doctorCRM})` : data.doctor;
      notes.push(`Médico: ${doctorInfo}`);
    }

    if (data.prescriptionDate) {
      notes.push(`Data da receita: ${data.prescriptionDate}`);
    }

    if (data.expirationDate) {
      notes.push(`Validade: ${data.expirationDate}`);
    }

    if (data.batchNumber) {
      notes.push(`Lote: ${data.batchNumber}`);
    }

    notes.push(`\n[Extraído via OCR - Confiança: ${this.result()?.confidence?.toFixed(0)}%]`);

    return notes.join('\n');
  }

  /**
   * Parse stock unit from medication form
   */
  private parseStockUnit(form?: string): string {
    if (!form) return 'unidades';

    const lowerForm = form.toLowerCase();
    if (lowerForm.includes('comprimido') || lowerForm.includes('cápsula') || lowerForm.includes('drágea')) {
      return 'comprimidos';
    }
    if (lowerForm.includes('ml') || lowerForm.includes('xarope') || lowerForm.includes('suspensão')) {
      return 'ml';
    }
    if (lowerForm.includes('gota')) {
      return 'gotas';
    }
    if (lowerForm.includes('sachê')) {
      return 'sachês';
    }
    if (lowerForm.includes('ampola')) {
      return 'ampolas';
    }

    return 'unidades';
  }

  /**
   * Close modal
   */
  async close(): Promise<void> {
    await this.modalCtrl.dismiss();
  }

  /**
   * Show success toast
   */
  private async showSuccess(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle'
    });
    await toast.present();
  }

  /**
   * Show error toast
   */
  private async showError(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      color: 'danger',
      position: 'top',
      icon: 'close-circle'
    });
    await toast.present();
  }

  /**
   * Get confidence color
   */
  getConfidenceColor(confidence?: number): string {
    if (!confidence) return 'medium';
    if (confidence >= 90) return 'success';
    if (confidence >= 70) return 'warning';
    return 'danger';
  }

  /**
   * Get status message
   */
  getStatusMessage(): string {
    const status = this.status();
    switch (status) {
      case 'loading':
        return 'Carregando scanner...';
      case 'processing':
        return 'Processando imagem...';
      case 'success':
        return 'Scan concluído!';
      case 'error':
        return 'Erro ao processar';
      case 'quota_exceeded':
        return 'Limite mensal atingido';
      default:
        return 'Pronto para scan';
    }
  }
}
