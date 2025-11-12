import { Injectable, computed, inject, effect } from '@angular/core';
import { MedicationService } from './medication.service';
import { PatientSelectorService } from './patient-selector.service';
import { Medication } from '../models/medication.model';
import { updateDoc, doc, Firestore } from 'firebase/firestore';
import { LogService } from './log.service';

/**
 * Service responsible for detecting and managing treatment completions.
 * 
 * Completion Detection:
 * - Time-based: Non-continuous medications where endDate has passed
 * - Quantity-based: Non-continuous medications where all doses have been taken
 * 
 * Features:
 * - Automatic detection on medication load
 * - Manual marking of completion
 * - 3-day congratulation window management
 * - Completion history tracking
 */
@Injectable({
  providedIn: 'root'
})
export class CompletionDetectionService {
  private readonly medicationService = inject(MedicationService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly firestore = inject(Firestore);
  private readonly logService = inject(LogService);

  // Days to show congratulation message
  private readonly CONGRATULATION_WINDOW_DAYS = 3;

  /**
   * All medications for the selected patient (completed and active)
   */
  private allMedications = computed(() => {
    return this.medicationService.medications();
  });

  /**
   * All completed medications for the selected patient
   */
  completedMedications = computed(() => {
    return this.allMedications().filter(med => 
      med.isCompleted && !med.isArchived
    );
  });

  /**
   * Medications completed within the last 3 days (for congratulation cards)
   */
  recentlyCompleted = computed(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - this.CONGRATULATION_WINDOW_DAYS);

    return this.completedMedications().filter(med => {
      if (!med.completedAt) return false;
      const completedDate = med.completedAt instanceof Date 
        ? med.completedAt 
        : new Date(med.completedAt);
      return completedDate >= threeDaysAgo;
    });
  });

  /**
   * Check if there are any recently completed medications to celebrate
   */
  hasRecentCompletions = computed(() => this.recentlyCompleted().length > 0);

  constructor() {
    // Auto-check for completions when medications are loaded
    effect(() => {
      const medications = this.allMedications();
      this.checkAllForCompletion(medications);
    });
  }

  /**
   * Check all medications for potential completions
   * (only for non-completed, non-archived medications)
   */
  private async checkAllForCompletion(medications: Medication[]): Promise<void> {
    const toCheck = medications.filter(med => 
      !med.isCompleted && 
      !med.isArchived &&
      !med.isContinuousUse // Only check non-continuous medications
    );

    for (const medication of toCheck) {
      if (this.shouldAutoComplete(medication)) {
        const reason = this.detectCompletionReason(medication);
        if (reason) {
          await this.markAsCompleted(medication, reason);
        }
      }
    }
  }

  /**
   * Determine if a medication should be automatically marked as completed
   */
  shouldAutoComplete(medication: Medication): boolean {
    if (medication.isCompleted || medication.isArchived) {
      return false;
    }

    if (medication.isContinuousUse) {
      return false; // Continuous medications are never auto-completed
    }

    return this.detectTimeBasedCompletion(medication) || 
           this.detectQuantityBasedCompletion(medication);
  }

  /**
   * Detect if medication has reached its end date
   */
  detectTimeBasedCompletion(medication: Medication): boolean {
    if (!medication.endDate) {
      return false;
    }

    const endDate = typeof medication.endDate === 'string'
      ? new Date(medication.endDate)
      : medication.endDate;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates only, ignore time
    
    return endDate < now;
  }

  /**
   * Detect if medication has had all planned doses taken
   */
  detectQuantityBasedCompletion(medication: Medication): boolean {
    if (!medication.totalDosesPlanned || medication.totalDosesPlanned <= 0) {
      return false;
    }

    const dosesTaken = medication.dosesTaken || 0;
    return dosesTaken >= medication.totalDosesPlanned;
  }

  /**
   * Determine the reason for completion
   */
  private detectCompletionReason(medication: Medication): 'time_ended' | 'quantity_depleted' | null {
    if (this.detectQuantityBasedCompletion(medication)) {
      return 'quantity_depleted';
    }
    
    if (this.detectTimeBasedCompletion(medication)) {
      return 'time_ended';
    }

    return null;
  }

  /**
   * Mark a medication as completed
   * @param medication The medication to mark as completed
   * @param reason The reason for completion
   */
  async markAsCompleted(
    medication: Medication, 
    reason: 'time_ended' | 'quantity_depleted' | 'manual'
  ): Promise<void> {
    if (!medication.id) {
      this.logService.error('CompletionDetectionService', 'Cannot mark medication as completed: missing ID');
      return;
    }

    const selectedPatient = this.patientSelectorService.activePatient();
    if (!selectedPatient) {
      this.logService.error('CompletionDetectionService', 'Cannot mark medication as completed: no patient selected');
      return;
    }

    try {
      const medicationRef = doc(
        this.firestore,
        `patients/${selectedPatient.userId}/medications/${medication.id}`
      );

      await updateDoc(medicationRef, {
        isCompleted: true,
        completedAt: new Date(),
        completionReason: reason
      });

      this.logService.info('CompletionDetectionService', 'Medication marked as completed', { name: medication.name, reason });
    } catch (error: any) {
      this.logService.error('CompletionDetectionService', 'Error marking medication as completed', error as Error);
      throw error;
    }
  }

  /**
   * Manually mark a medication as completed by user action
   */
  async manuallyComplete(medication: Medication): Promise<void> {
    await this.markAsCompleted(medication, 'manual');
  }

  /**
   * Check if a specific medication should show congratulation message
   * (completed within last 3 days)
   */
  shouldShowCongratulation(medication: Medication): boolean {
    if (!medication.isCompleted || !medication.completedAt) {
      return false;
    }

    const completedDate = medication.completedAt instanceof Date 
      ? medication.completedAt 
      : new Date(medication.completedAt);
    
    const now = new Date();
    const daysSinceCompletion = Math.floor(
      (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceCompletion <= this.CONGRATULATION_WINDOW_DAYS;
  }

  /**
   * Get number of days since completion
   */
  getDaysCompletedAgo(medication: Medication): number | null {
    if (!medication.completedAt) {
      return null;
    }

    const completedDate = medication.completedAt instanceof Date 
      ? medication.completedAt 
      : new Date(medication.completedAt);
    
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff;
  }

  /**
   * Calculate completion progress (for quantity-based medications)
   * Returns percentage (0-100)
   */
  getCompletionProgress(medication: Medication): number | null {
    if (!medication.totalDosesPlanned || medication.totalDosesPlanned <= 0) {
      return null;
    }

    const dosesTaken = medication.dosesTaken || 0;
    const progress = (dosesTaken / medication.totalDosesPlanned) * 100;
    return Math.min(progress, 100); // Cap at 100%
  }

  /**
   * Increment doses taken and check for completion
   * Call this after user marks a dose as taken
   */
  async incrementDoseAndCheckCompletion(medication: Medication): Promise<void> {
    if (!medication.id || medication.isCompleted || medication.isContinuousUse) {
      return;
    }

    const selectedPatient = this.patientSelectorService.activePatient();
    if (!selectedPatient) {
      return;
    }

    try {
      const medicationRef = doc(
        this.firestore,
        `patients/${selectedPatient.userId}/medications/${medication.id}`
      );

      const newDosesTaken = (medication.dosesTaken || 0) + 1;
      
      // Update doses taken
      await updateDoc(medicationRef, {
        dosesTaken: newDosesTaken
      });

      // Check if this dose completed the treatment
      const updatedMedication = { ...medication, dosesTaken: newDosesTaken };
      if (this.detectQuantityBasedCompletion(updatedMedication)) {
        await this.markAsCompleted(updatedMedication, 'quantity_depleted');
      }
    } catch (error: any) {
      this.logService.error('CompletionDetectionService', 'Error incrementing dose', error as Error);
      throw error;
    }
  }

  /**
   * Reactivate a completed medication as a new treatment
   * Creates a copy without completion data
   */
  async reactivateTreatment(medication: Medication): Promise<void> {
    // This will be implemented in Phase D4 when integrating with the form
    // For now, just reset completion flags
    if (!medication.id) {
      return;
    }

    const selectedPatient = this.patientSelectorService.activePatient();
    if (!selectedPatient) {
      return;
    }

    try {
      const medicationRef = doc(
        this.firestore,
        `patients/${selectedPatient.userId}/medications/${medication.id}`
      );

      await updateDoc(medicationRef, {
        isCompleted: false,
        completedAt: null,
        completionReason: null,
        dosesTaken: 0
      });

      this.logService.info('CompletionDetectionService', 'Medication reactivated', { name: medication.name });
    } catch (error: any) {
      this.logService.error('CompletionDetectionService', 'Error reactivating medication', error as Error);
      throw error;
    }
  }
}

