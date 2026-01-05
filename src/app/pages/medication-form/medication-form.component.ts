import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { Medication } from '../../models/medication.model';
import { PatientSelectorComponent } from '../../components/patient-selector/patient-selector.component';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  saveOutline, 
  addCircleOutline, 
  trashOutline,
  createOutline,
  personCircleOutline,
  medicalOutline,
  flaskOutline,
  repeatOutline,
  cubeOutline,
  timeOutline,
  documentTextOutline,
  arrowBack,
  checkmarkCircle,
  addCircle,
  trash,
  calendarOutline,
  informationCircleOutline,
  informationCircle,
  medkitOutline,
  cardOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-medication-form',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="accessible-medication-form">
      <div class="form-header">
        <div class="header-icon">
          <ion-icon [name]="isEditMode ? 'create-outline' : 'add-circle-outline'" aria-hidden="true"></ion-icon>
        </div>
        <h1>{{ isEditMode ? ('MEDICATION_FORM.TITLE_EDIT' | translate) : ('MEDICATION_FORM.TITLE_NEW' | translate) }}</h1>
      </div>

      <form [formGroup]="medicationForm" (ngSubmit)="saveMedication()" data-cy="medication-form">
        <!-- Patient Selection -->
        <div class="form-section">
          <h2 class="section-title">{{ 'MEDICATION_FORM.PATIENT' | translate }}</h2>
          <div class="patient-selector-wrapper">
            <app-patient-selector></app-patient-selector>
          </div>
        </div>

        <!-- Medication Info -->
        <div class="form-section">
          <h2 class="section-title">{{ 'MEDICATION_DETAIL.INFORMATION' | translate }}</h2>
          <div class="form-card">
            <div class="input-group">
              <label class="input-label" for="med-name">
                <ion-icon name="medical-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATIONS.NAME' | translate }}</span>
              </label>
              <ion-input
                id="med-name"
                data-cy="medication-name"
                class="accessible-input"
                formControlName="name"
                [placeholder]="'MEDICATIONS.NAME_PLACEHOLDER' | translate"
                [attr.aria-label]="'MEDICATIONS.NAME' | translate"
                aria-required="true">
              </ion-input>
              @if (medicationForm.get('name')?.invalid && medicationForm.get('name')?.touched) {
                <div class="error-message" data-cy="error-name">
                  <ion-icon name="close-circle" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.ERROR_NAME_REQUIRED' | translate }}</span>
                </div>
              }
            </div>

            <div class="input-group">
              <label class="input-label" for="med-dosage">
                <ion-icon name="flask-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATIONS.DOSAGE' | translate }}</span>
              </label>
              <ion-input
                id="med-dosage"
                data-cy="medication-dosage"
                class="accessible-input"
                formControlName="dosage"
                [placeholder]="'MEDICATIONS.DOSAGE_PLACEHOLDER' | translate"
                [attr.aria-label]="'MEDICATIONS.DOSAGE' | translate"
                aria-required="true">
              </ion-input>
              @if (medicationForm.get('dosage')?.invalid && medicationForm.get('dosage')?.touched) {
                <div class="error-message" data-cy="error-dosage">
                  <ion-icon name="close-circle" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.ERROR_DOSAGE_REQUIRED' | translate }}</span>
                </div>
              }
            </div>

            <div class="input-group">
              <div class="input-label section-label" role="heading" aria-level="3">
                <ion-icon name="repeat-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATIONS.FREQUENCY' | translate }}</span>
              </div>
              <div class="frequency-row">
                <div class="frequency-value">
                  <label for="freq-value" class="sr-only">{{ 'MEDICATION_FORM.FREQUENCY_VALUE' | translate }}</label>
                  <ion-input
                    id="freq-value"
                    data-cy="frequency-value"
                    class="accessible-input"
                    type="number"
                    formControlName="frequencyValue"
                    placeholder="1"
                    min="1"
                    [attr.aria-label]="'MEDICATION_FORM.FREQUENCY_VALUE' | translate"
                    aria-required="true">
                  </ion-input>
                </div>
                <div class="frequency-unit">
                  <label for="freq-unit" class="sr-only">{{ 'MEDICATION_FORM.FREQUENCY_UNIT' | translate }}</label>
                  <ion-select
                    id="freq-unit"
                    data-cy="frequency-unit"
                    class="accessible-select"
                    formControlName="frequencyUnit"
                    interface="action-sheet"
                    [attr.aria-label]="'MEDICATION_FORM.FREQUENCY_UNIT' | translate">
                    <!-- Combined data-cy for backward compatibility -->
                    <ion-select-option data-cy="medication-frequency" value="minutes">{{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                    <ion-select-option value="hours">{{ 'COMMON.HOURS' | translate }}</ion-select-option>
                    <ion-select-option value="days">{{ 'COMMON.DAYS' | translate }}</ion-select-option>
                    <ion-select-option value="weeks">{{ 'COMMON.WEEKS' | translate }}</ion-select-option>
                    <ion-select-option value="months">{{ 'COMMON.MONTHS' | translate }}</ion-select-option>
                    <ion-select-option value="years">{{ 'COMMON.YEARS' | translate }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
              @if (getFrequencyDisplay()) {
                <div class="frequency-display">
                  <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.EVERY' | translate }} {{ getFrequencyDisplay() }}</span>
                </div>
              }
              @if ((medicationForm.get('frequencyValue')?.invalid && medicationForm.get('frequencyValue')?.touched) || (medicationForm.get('frequencyUnit')?.invalid && medicationForm.get('frequencyUnit')?.touched)) {
                <div class="error-message" data-cy="error-frequency">
                  <ion-icon name="close-circle" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.ERROR_FREQUENCY_REQUIRED' | translate }}</span>
                </div>
              }
            </div>

            <!-- Stock Management (Phase B) -->
            <div class="input-group">
              <div class="input-label section-label" role="heading" aria-level="3">
                <ion-icon name="repeat-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.MEDICATION_TYPE' | translate }}</span>
              </div>
              <div class="toggle-group">
                <button type="button" 
                  class="toggle-btn"
                  [class.active]="medicationForm.get('isContinuousUse')?.value === true"
                  (click)="setMedicationType(true)"
                  [attr.aria-pressed]="medicationForm.get('isContinuousUse')?.value === true">
                  <ion-icon name="repeat-outline" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.CONTINUOUS_USE' | translate }}</span>
                </button>
                <button type="button"
                  class="toggle-btn"
                  [class.active]="medicationForm.get('isContinuousUse')?.value === false"
                  (click)="setMedicationType(false)"
                  [attr.aria-pressed]="medicationForm.get('isContinuousUse')?.value === false">
                  <ion-icon name="medkit-outline" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATION_FORM.AS_NEEDED' | translate }}</span>
                </button>
              </div>
              @if (medicationForm.get('isContinuousUse')?.value === true) {
                <p class="input-hint">{{ 'MEDICATION_FORM.CONTINUOUS_USE_HINT' | translate }}</p>
              } @else {
                <p class="input-hint">{{ 'MEDICATION_FORM.AS_NEEDED_HINT' | translate }}</p>
              }
            </div>

            <div class="input-group">
              <label class="input-label" for="med-initial-stock">
                <ion-icon name="cube-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.INITIAL_STOCK' | translate }}</span>
              </label>
              <ion-input
                id="med-initial-stock"
                data-cy="initial-stock"
                class="accessible-input"
                type="number"
                formControlName="initialStock"
                [placeholder]="'MEDICATION_FORM.INITIAL_STOCK_PLACEHOLDER' | translate"
                min="0"
                [attr.aria-label]="'MEDICATION_FORM.INITIAL_STOCK' | translate"
                aria-required="true">
              </ion-input>
            </div>

            <div class="input-group">
              <label class="input-label" for="med-stock-unit">
                <ion-icon name="card-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.STOCK_UNIT' | translate }}</span>
              </label>
              <ion-select
                id="med-stock-unit"
                class="accessible-select"
                formControlName="stockUnit"
                interface="action-sheet"
                [placeholder]="'MEDICATION_FORM.STOCK_UNIT_PLACEHOLDER' | translate"
                [attr.aria-label]="'MEDICATION_FORM.STOCK_UNIT' | translate">
                <ion-select-option value="comprimidos">{{ 'MEDICATION_FORM.UNITS.TABLETS' | translate }}</ion-select-option>
                <ion-select-option value="cápsulas">{{ 'MEDICATION_FORM.UNITS.CAPSULES' | translate }}</ion-select-option>
                <ion-select-option value="ml">{{ 'MEDICATION_FORM.UNITS.ML' | translate }}</ion-select-option>
                <ion-select-option value="gotas">{{ 'MEDICATION_FORM.UNITS.DROPS' | translate }}</ion-select-option>
                <ion-select-option value="doses">{{ 'MEDICATION_FORM.UNITS.DOSES' | translate }}</ion-select-option>
                <ion-select-option value="ampolas">{{ 'MEDICATION_FORM.UNITS.AMPOULES' | translate }}</ion-select-option>
              </ion-select>
            </div>

            <div class="input-group">
              <label class="input-label" for="med-low-stock">
                <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.LOW_STOCK_THRESHOLD' | translate }}</span>
              </label>
              <ion-input
                id="med-low-stock"
                class="accessible-input"
                type="number"
                formControlName="lowStockThreshold"
                [placeholder]="getStockThresholdPlaceholder()"
                min="0"
                [attr.aria-label]="'MEDICATION_FORM.LOW_STOCK_THRESHOLD' | translate">
              </ion-input>
              <p class="input-hint">{{ 'MEDICATION_FORM.LOW_STOCK_THRESHOLD_HINT' | translate }}</p>
            </div>
          </div>
        </div>

        <!-- Dates -->
        <div class="form-section">
          <h2 class="section-title">{{ 'MEDICATION_FORM.TREATMENT_PERIOD' | translate }}</h2>
          <div class="form-card">
            <div class="input-group">
              <label class="input-label" for="start-date">
                <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.START_DATE' | translate }}</span>
              </label>
              <ion-input
                id="start-date"
                class="accessible-input"
                type="date"
                formControlName="startDate"
                [attr.aria-label]="'MEDICATION_FORM.START_DATE' | translate"
                aria-required="true">
              </ion-input>
            </div>

            <div class="input-group">
              <label class="input-label" for="end-date">
                <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.END_DATE' | translate }}</span>
              </label>
              <ion-input
                id="end-date"
                class="accessible-input"
                type="date"
                formControlName="endDate"
                [attr.aria-label]="'MEDICATION_FORM.END_DATE' | translate">
              </ion-input>
              <p class="input-hint">{{ 'MEDICATION_FORM.END_DATE_HINT' | translate }}</p>
            </div>
          </div>
        </div>

        <!-- Schedule -->
        <div class="form-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'MEDICATION_FORM.SCHEDULE' | translate }}</h2>
            <button type="button" class="add-dose-btn" (click)="addDose()" [attr.aria-label]="'MEDICATION_FORM.ADD_TIME' | translate">
              <ion-icon name="add-circle" aria-hidden="true"></ion-icon>
              <span>{{ 'COMMON.ADD' | translate }}</span>
            </button>
          </div>

          @if (getFrequencyDisplay()) {
            <div class="frequency-info-card">
              <ion-icon name="information-circle" aria-hidden="true"></ion-icon>
              <div class="frequency-info-text">
                <strong>{{ 'MEDICATION_FORM.FREQUENCY_DEFINED' | translate }}:</strong> {{ 'MEDICATION_FORM.EVERY' | translate }} {{ getFrequencyDisplay() }}
                <br>
                <span class="frequency-hint">{{ 'MEDICATION_FORM.SCHEDULE_HINT' | translate }}</span>
              </div>
            </div>
          }
          
          <div class="form-card">
            <div formArrayName="schedule">
              @if (schedule.controls.length === 0) {
                <div class="empty-schedule">
                  <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                  <p>{{ 'MEDICATION_FORM.NO_TIMES' | translate }}</p>
                  <p class="empty-hint">{{ 'MEDICATION_FORM.NO_TIMES_HINT' | translate }}</p>
                </div>
              } @else {
                @for(dose of schedule.controls; track $index) {
                  <div class="dose-row" [formGroupName]="$index">
                    <div class="dose-number">
                      <span>{{ $index + 1 }}</span>
                    </div>
                    <div class="dose-input-wrapper">
                      <label [for]="'dose-time-' + $index" class="sr-only">{{ 'MEDICATION_FORM.TIME' | translate }} {{ $index + 1 }}</label>
                      <ion-input
                        [id]="'dose-time-' + $index"
                        [attr.data-cy]="$index === 0 ? 'medication-time' : 'medication-time-' + $index"
                        class="accessible-input dose-time-input"
                        type="time"
                        formControlName="time"
                        [attr.aria-label]="('MEDICATION_FORM.TIME' | translate) + ' ' + ($index + 1)">
                      </ion-input>
                    </div>
                    <button 
                      type="button" 
                      class="remove-dose-btn" 
                      (click)="removeDose($index)"
                      [attr.aria-label]="('MEDICATION_FORM.REMOVE_TIME' | translate) + ' ' + ($index + 1)">
                      <ion-icon name="trash" aria-hidden="true"></ion-icon>
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Notes -->
        <!-- Doctor Information Section -->
        <div class="form-section">
          <h2 class="section-title">{{ 'MEDICATION_FORM.DOCTOR_INFO' | translate }}</h2>
          <div class="form-card">
            <div class="input-group">
              <label class="input-label" for="doctor-name">
                <ion-icon name="medkit-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.DOCTOR_NAME' | translate }}</span>
              </label>
              <ion-input
                id="doctor-name"
                class="accessible-input"
                formControlName="doctorName"
                [placeholder]="'MEDICATION_FORM.DOCTOR_NAME_PLACEHOLDER' | translate"
                [attr.aria-label]="'MEDICATION_FORM.DOCTOR_NAME' | translate">
              </ion-input>
            </div>

            <div class="input-group">
              <label class="input-label" for="doctor-crm">
                <ion-icon name="card-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.DOCTOR_CRM' | translate }}</span>
              </label>
              <ion-input
                id="doctor-crm"
                class="accessible-input"
                formControlName="doctorCRM"
                [placeholder]="'MEDICATION_FORM.DOCTOR_CRM_PLACEHOLDER' | translate"
                [attr.aria-label]="'MEDICATION_FORM.DOCTOR_CRM' | translate">
              </ion-input>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h2 class="section-title">{{ 'MEDICATIONS.NOTES' | translate }}</h2>
          <div class="form-card">
            <div class="input-group">
              <label class="input-label" for="med-notes">
                <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_FORM.NOTES_OPTIONAL' | translate }}</span>
              </label>
              <ion-textarea
                id="med-notes"
                class="accessible-textarea"
                formControlName="notes"
                [placeholder]="'MEDICATIONS.NOTES_PLACEHOLDER' | translate"
                [autoGrow]="true"
                rows="4"
                [attr.aria-label]="'MEDICATIONS.NOTES' | translate">
              </ion-textarea>
            </div>
          </div>
        </div>

        <!-- Bottom Action Buttons -->
        <div class="bottom-actions">
          <button 
            type="button" 
            data-cy="cancel-medication"
            class="action-btn-bottom back-btn" 
            routerLink="/tabs/medications"
            [attr.aria-label]="'COMMON.BACK' | translate">
            <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
            <span>{{ 'COMMON.BACK' | translate }}</span>
          </button>
          <button 
            type="submit" 
            data-cy="save-medication"
            class="action-btn-bottom save-btn" 
            [disabled]="medicationForm.invalid"
            [attr.aria-label]="'MEDICATION_FORM.SAVE' | translate">
            <ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>
            <span>{{ 'MEDICATION_FORM.SAVE' | translate }}</span>
          </button>
        </div>
      </form>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    PatientSelectorComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonTextarea
],
  styleUrls: ['./medication-form.component.css'],
})
export class MedicationFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly toastController = inject(ToastController);
  private readonly translateService = inject(TranslateService);
  
  medicationForm: FormGroup;
  isEditMode = false;
  private medId: string | null = null;

  constructor() {
    addIcons({ 
      saveOutline, 
      addCircleOutline, 
      trashOutline,
      'create-outline': createOutline,
      'add-circle-outline': addCircleOutline,
      'person-circle-outline': personCircleOutline,
      'medical-outline': medicalOutline,
      'flask-outline': flaskOutline,
      'repeat-outline': repeatOutline,
      'cube-outline': cubeOutline,
      'time-outline': timeOutline,
      'document-text-outline': documentTextOutline,
      'arrow-back': arrowBack,
      'checkmark-circle': checkmarkCircle,
      'add-circle': addCircle,
      'trash': trash,
      'calendar-outline': calendarOutline,
      'information-circle-outline': informationCircleOutline,
      'information-circle': informationCircle,
      'medkit-outline': medkitOutline,
      'card-outline': cardOutline
    });
    
    const today = new Date().toISOString().split('T')[0];
    
    // patientId is managed by PatientSelectorService, not in the form
    this.medicationForm = this.fb.group({
      name: ['', Validators.required],
      dosage: ['', Validators.required],
      frequencyValue: [1, [Validators.required, Validators.min(1)]],
      frequencyUnit: ['days', Validators.required],
      startDate: [today, Validators.required],
      endDate: [''],
      stock: [0, [Validators.required, Validators.min(0)]], // Deprecated, kept for backward compatibility
      doctorName: [''],
      doctorCRM: [''],
      notes: [''],
      schedule: this.fb.array([], Validators.required),
      // Phase B: Stock Management
      isContinuousUse: [true],
      initialStock: [0, [Validators.required, Validators.min(0)]],
      stockUnit: ['comprimidos'],
      lowStockThreshold: [null],
    });

    // Watch frequency changes to suggest schedule times
    this.medicationForm.get('frequencyValue')?.valueChanges.subscribe(() => this.suggestScheduleTimes());
    this.medicationForm.get('frequencyUnit')?.valueChanges.subscribe(() => this.suggestScheduleTimes());
  }

  ngOnInit() {
    this.medId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.medId;
    if (this.isEditMode && this.medId) {
      const medication = this.medicationService.getMedicationById(this.medId);
      if (medication) {
        // Clear previous schedule FormArray controls before patching
        this.schedule.clear();
        this.medicationForm.patchValue(medication);
        for (const dose of medication.schedule) {
          this.addDose(dose.time);
        }
      }
    }
  }

  get schedule() {
    return this.medicationForm.get('schedule') as FormArray;
  }

  addDose(time = '') {
    const doseForm = this.fb.group({
      time: [time, Validators.required],
      status: ['upcoming']
    });
    this.schedule.push(doseForm);
  }

  removeDose(index: number) {
    this.schedule.removeAt(index);
  }

  clearAndSuggestSchedule() {
    // Force clear and regenerate schedule
    this.schedule.clear();
    this.suggestScheduleTimesForced();
  }

  private suggestScheduleTimesForced() {
    const frequencyValue = this.medicationForm.get('frequencyValue')?.value;
    const frequencyUnit = this.medicationForm.get('frequencyUnit')?.value;

    if (!frequencyValue || !frequencyUnit) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    let suggestedTimes: string[] = [];

    if (frequencyUnit === 'minutes' || frequencyUnit === 'hours') {
      // Calculate interval in minutes
      const intervalMinutes = frequencyUnit === 'minutes' ? frequencyValue : frequencyValue * 60;
      const intervalsPerDay = this.calculateIntervalsPerDay(frequencyValue, frequencyUnit);
      
      if (intervalsPerDay > 0 && intervalsPerDay <= 48) {
        // Start from next hour after current time
        let nextHour = currentHour + 1;
        const nextMinute = 0;
        
        // If it's past midnight, wrap to next day
        if (nextHour >= 24) {
          nextHour = 0;
        }

        const firstTimeInMinutes = nextHour * 60 + nextMinute;

        // Generate times starting from the next available time
        for (let i = 0; i < intervalsPerDay; i++) {
          const timeInMinutes = (firstTimeInMinutes + (i * intervalMinutes)) % 1440; // 1440 minutes in a day
          const hour = Math.floor(timeInMinutes / 60);
          const minute = timeInMinutes % 60;
          suggestedTimes.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
        
        // Sort times to show them in chronological order
        suggestedTimes.sort((a, b) => {
          const [hourA, minA] = a.split(':').map(Number);
          const [hourB, minB] = b.split(':').map(Number);
          const timeA = hourA * 60 + minA;
          const timeB = hourB * 60 + minB;
          
          // Times after current time come first
          const isAfterA = timeA >= currentTimeInMinutes;
          const isAfterB = timeB >= currentTimeInMinutes;
          
          if (isAfterA && !isAfterB) return -1;
          if (!isAfterA && isAfterB) return 1;
          return timeA - timeB;
        });
      }
    } else if (frequencyUnit === 'days') {
      // For daily frequency, use smart time suggestions
      const timeSlots = this.getSmartTimeSlots(frequencyValue);
      
      // Find the next available time slot after current time
      let startIndex = 0;
      for (let i = 0; i < timeSlots.length; i++) {
        const [hour, minute] = timeSlots[i].split(':').map(Number);
        const slotTimeInMinutes = hour * 60 + minute;
        if (slotTimeInMinutes > currentTimeInMinutes) {
          startIndex = i;
          break;
        }
      }
      
      // Reorder times to start from the next available time
      suggestedTimes = [
        ...timeSlots.slice(startIndex),
        ...timeSlots.slice(0, startIndex)
      ];
    } else if (frequencyUnit === 'weeks' || frequencyUnit === 'months' || frequencyUnit === 'years') {
      // For weekly/monthly/yearly, suggest next available hour
      const nextHour = (currentHour + 1) % 24;
      suggestedTimes = [`${nextHour.toString().padStart(2, '0')}:00`];
    }

    // Add suggested times to schedule
    for (const time of suggestedTimes) {
      this.addDose(time);
    }
  }

  suggestScheduleTimes() {
    // Only suggest if schedule is empty (don't overwrite user's manual edits)
    if (this.schedule.length > 0) {
      return;
    }

    // Generate suggestions
    this.suggestScheduleTimesForced();
  }

  getSmartTimeSlots(timesPerDay: number): string[] {
    // Standard time slots based on frequency
    const timeSlotMap: { [key: number]: string[] } = {
      1: ['08:00'],
      2: ['08:00', '20:00'],
      3: ['08:00', '14:00', '20:00'],
      4: ['08:00', '12:00', '16:00', '20:00'],
      5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
      6: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
    };

    if (timeSlotMap[timesPerDay]) {
      return timeSlotMap[timesPerDay];
    }

    // For more than 6 times a day, distribute evenly from 8 AM to 10 PM
    const count = Math.min(timesPerDay, 15); // Max 15 times a day
    const totalHours = 14; // From 8 AM to 10 PM
    const hoursInterval = totalHours / (count - 1);
    const times: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const hour = 8 + Math.round(i * hoursInterval);
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    return times;
  }

  calculateIntervalsPerDay(value: number, unit: string): number {
    if (unit === 'minutes') {
      return Math.floor(1440 / value); // 1440 minutes in a day
    } else if (unit === 'hours') {
      return Math.floor(24 / value);
    }
    return 0;
  }

  getFrequencyDisplay(): string {
    const value = this.medicationForm.get('frequencyValue')?.value;
    const unit = this.medicationForm.get('frequencyUnit')?.value;
    
    if (!value || !unit) return '';

    const unitMap: { [key: string]: string } = {
      'minutes': 'COMMON.MINUTES',
      'hours': 'COMMON.HOURS',
      'days': 'COMMON.DAYS',
      'weeks': 'COMMON.WEEKS',
      'months': 'COMMON.MONTHS',
      'years': 'COMMON.YEARS'
    };

    const translatedUnit = this.translateService.instant(unitMap[unit] || unit);
    return `${value} ${translatedUnit.toLowerCase()}`;
  }

  setMedicationType(isContinuous: boolean) {
    this.medicationForm.patchValue({ isContinuousUse: isContinuous });
  }

  getStockThresholdPlaceholder(): string {
    const isContinuous = this.medicationForm.get('isContinuousUse')?.value ?? true;
    if (isContinuous) {
      const dailyDoses = this.schedule.length || 1;
      const threshold = dailyDoses * 7;
      return this.translateService.instant('MEDICATION_FORM.DEFAULT_THRESHOLD_CONTINUOUS', { days: 7, units: threshold });
    } else {
      return this.translateService.instant('MEDICATION_FORM.DEFAULT_THRESHOLD_AS_NEEDED', { units: 5 });
    }
  }

  async saveMedication() {
    if (this.medicationForm.invalid) {
      const toast = await this.toastController.create({
        message: this.translateService.instant('MEDICATION_FORM.REQUIRED_FIELDS'),
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    try {
      const formValue = this.medicationForm.value;
      const activePatient = this.patientSelectorService.activePatient();
      
      if (!activePatient) {
        const toast = await this.toastController.create({
          message: this.translateService.instant('MEDICATION_FORM.NO_PATIENT_SELECTED'),
          duration: 2000,
          color: 'warning'
        });
        await toast.present();
        return;
      }
      
      // Transform form data to match Medication model
      // patientId is set to active patient - stored in patient's own document
      
      // Phase B: Set initialStock and currentStock
      const initialStock = formValue.initialStock || 0;
      
      const medicationData: Omit<Medication, 'id'> = {
        patientId: activePatient.userId, // Store for reference, but saved in patient's document
        name: formValue.name,
        dosage: formValue.dosage,
        frequency: `${formValue.frequencyValue} ${formValue.frequencyUnit}`, // Combine frequency fields
        stock: initialStock, // Deprecated field, kept for backward compatibility
        doctorName: formValue.doctorName || undefined,
        doctorCRM: formValue.doctorCRM || undefined,
        notes: formValue.notes || '',
        startDate: formValue.startDate || null,
        endDate: formValue.endDate || null,
        schedule: (formValue.schedule || []).map((dose: any) => ({
          time: dose.time,
          status: 'upcoming' as const
        })),
        // Phase B: Stock Management
        isContinuousUse: formValue.isContinuousUse ?? true,
        initialStock: initialStock,
        currentStock: this.isEditMode ? undefined : initialStock, // Only set on creation; preserve on edit
        stockUnit: formValue.stockUnit || 'comprimidos',
        lowStockThreshold: formValue.lowStockThreshold || undefined,
        isArchived: false
      };

      if (this.isEditMode && this.medId) {
        await this.medicationService.updateMedication(this.medId, medicationData);
      } else {
        await this.medicationService.addMedication(medicationData);
      }
      const successKey = this.isEditMode ? 'MEDICATION_FORM.SUCCESS_UPDATED' : 'MEDICATION_FORM.SUCCESS_CREATED';
      const toast = await this.toastController.create({
        message: this.translateService.instant(successKey),
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.router.navigate(['/tabs/medications']);
    } catch (error: any) {
      console.error('[MedicationForm] Error saving medication:', error);
      const toast = await this.toastController.create({
        message: this.translateService.instant('MEDICATION_FORM.ERROR'),
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}
