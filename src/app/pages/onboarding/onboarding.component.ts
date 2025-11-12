import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { CountryService, CountryDocument } from '../../services/country.service';
import { TranslationService } from '../../services/translation.service';
import { TermsOfUseService } from '../../services/terms-of-use.service';
import { CareNetworkService } from '../../services/care-network.service';
import { TermsOfUse } from '../../models/terms-of-use.model';
import { OnboardingSteps, TermsAcceptance } from '../../models/user.model';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { TranslateModule } from '@ngx-translate/core';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';
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
  IonButton,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonModal,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  cardOutline,
  calendarOutline,
  transgenderOutline,
  waterOutline,
  medicalOutline,
  callOutline,
  mailOutline,
  bookOutline,
  alertCircleOutline,
  checkmarkCircle,
  arrowForward,
  arrowBack,
  close,
  globeOutline,
  searchOutline,
  chevronDownOutline,
  peopleOutline,
  heartOutline,
  documentTextOutline,
  addOutline,
  trashOutline,
  personAddOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    PhoneInputComponent,
    PatientSelectorComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonModal,
    IonSpinner
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">medicamenta.me</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="onboarding-content">
      <!-- Progress Indicator -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="(currentStep() / totalSteps) * 100"></div>
        </div>
        <p class="progress-text">{{ 'COMMON.STEP' | translate }} {{ currentStep() }} {{ 'COMMON.OF' | translate }} {{ totalSteps }}</p>
      </div>

      <!-- Welcome Screen -->
      @if (currentStep() === 0) {
        <div class="welcome-screen">
          <div class="welcome-icon">
            <ion-icon name="medical" aria-hidden="true"></ion-icon>
          </div>
          <h1>{{ 'ONBOARDING.TITLE' | translate }}</h1>
          <p class="welcome-subtitle">
            {{ 'ONBOARDING.WELCOME.DESCRIPTION' | translate }}
          </p>
          <div class="welcome-steps">
            <div class="welcome-step">
              <div class="step-icon">
                <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
              </div>
              <h3>{{ 'ONBOARDING.PERSONAL_DATA.TITLE' | translate }}</h3>
              <p>{{ 'ONBOARDING.PERSONAL_DATA.DESCRIPTION' | translate }}</p>
            </div>
            <div class="welcome-step">
              <div class="step-icon">
                <ion-icon name="medical-outline" aria-hidden="true"></ion-icon>
              </div>
              <h3>{{ 'ONBOARDING.HEALTH_DATA.TITLE' | translate }}</h3>
              <p>{{ 'ONBOARDING.HEALTH_DATA.DESCRIPTION' | translate }}</p>
            </div>
            <div class="welcome-step">
              <div class="step-icon">
                <ion-icon name="call-outline" aria-hidden="true"></ion-icon>
              </div>
              <h3>{{ 'ONBOARDING.CONTACT.TITLE' | translate }}</h3>
              <p>{{ 'ONBOARDING.CONTACT.DESCRIPTION' | translate }}</p>
            </div>
          </div>
          <button class="onboarding-btn primary-btn" (click)="nextStep()">
            <span>{{ 'COMMON.START' | translate }}</span>
            <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
          </button>
        </div>
      }

      <!-- Step 1: Personal Data -->
      @if (currentStep() === 1) {
        <div class="onboarding-step">
          <div class="step-header">
            <div class="step-icon-header">
              <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
            </div>
            <h2>{{ 'ONBOARDING.PERSONAL_DATA.TITLE' | translate }}</h2>
            <p>{{ 'ONBOARDING.PERSONAL_DATA.DESCRIPTION' | translate }}</p>
          </div>

          <form [formGroup]="personalForm" class="onboarding-form">
            <div class="form-group">
              <label for="name">
                <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.NAME' | translate }}</span>
              </label>
              <ion-input
                id="name"
                formControlName="name"
                [placeholder]="'ONBOARDING.PERSONAL_DATA.NAME_PLACEHOLDER' | translate"
                [aria-label]="'ONBOARDING.PERSONAL_DATA.NAME' | translate"
                aria-required="true">
              </ion-input>
            </div>

            <div class="form-group">
              <label for="country">
                <ion-icon name="globe-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.COUNTRY' | translate }}</span>
              </label>
              <div class="country-select-wrapper" (click)="openCountryModal()">
                <div class="country-display">
                  <img [src]="'./assets/imgs/flags/' + selectedCountry().code.toLowerCase() + '.svg'" 
                       [alt]="selectedCountry().name + ' flag'"
                       class="country-flag-img"
                       loading="lazy">
                  <span class="country-name">{{ selectedCountry().name }}</span>
                  <ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label [for]="'document'">
                <ion-icon name="card-outline" aria-hidden="true"></ion-icon>
                <span>{{ selectedCountry().documentLabel }}</span>
              </label>
              <ion-input
                id="document"
                formControlName="document"
                [placeholder]="selectedCountry().documentPlaceholder"
                [aria-label]="selectedCountry().documentLabel"
                aria-required="true"
                (ionInput)="onDocumentInput($event)">
              </ion-input>
              <p class="field-hint">{{ 'ONBOARDING.PERSONAL_DATA.DOCUMENT_HINT' | translate:{ format: selectedCountry().documentPlaceholder } }}</p>
            </div>

            <div class="form-group">
              <label for="birth-date">
                <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.BIRTHDATE' | translate }}</span>
              </label>
              <ion-input
                id="birth-date"
                type="date"
                formControlName="birthDate"
                [aria-label]="'ONBOARDING.PERSONAL_DATA.BIRTHDATE' | translate"
                aria-required="true">
              </ion-input>
            </div>

            <div class="form-group">
              <label for="gender">
                <ion-icon name="transgender-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.GENDER' | translate }}</span>
              </label>
              <ion-select
                id="gender"
                formControlName="gender"
                [placeholder]="'COMMON.SELECT' | translate"
                interface="action-sheet">
                <ion-select-option value="male">{{ 'ONBOARDING.PERSONAL_DATA.GENDER_MALE' | translate }}</ion-select-option>
                <ion-select-option value="female">{{ 'ONBOARDING.PERSONAL_DATA.GENDER_FEMALE' | translate }}</ion-select-option>
                <ion-select-option value="other">{{ 'ONBOARDING.PERSONAL_DATA.GENDER_OTHER' | translate }}</ion-select-option>
                <ion-select-option value="prefer-not-say">{{ 'ONBOARDING.PERSONAL_DATA.GENDER_PREFER_NOT_SAY' | translate }}</ion-select-option>
              </ion-select>
            </div>

            <div class="form-group">
              <label for="email">
                <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.EMAIL' | translate }}</span>
              </label>
              <ion-input
                id="email"
                type="email"
                formControlName="email"
                [placeholder]="'ONBOARDING.PERSONAL_DATA.EMAIL_PLACEHOLDER' | translate"
                [aria-label]="'ONBOARDING.PERSONAL_DATA.EMAIL' | translate"
                aria-required="true"
                readonly>
              </ion-input>
              <p class="field-hint">{{ 'ONBOARDING.PERSONAL_DATA.EMAIL_HINT' | translate }}</p>
            </div>

            <div class="form-group">
              <label for="phone">
                <ion-icon name="call-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.PHONE' | translate }}</span>
              </label>
              <app-phone-input
                formControlName="phone"
                [defaultCountryCode]="selectedCountry().code"
                [required]="true">
              </app-phone-input>
            </div>

            <div class="form-group">
              <label for="religion">
                <ion-icon name="book-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'ONBOARDING.PERSONAL_DATA.RELIGION' | translate }} ({{ 'COMMON.OPTIONAL' | translate }})</span>
              </label>
              <ion-select
                id="religion"
                formControlName="religion"
                [placeholder]="'COMMON.SELECT' | translate"
                interface="action-sheet">
                <ion-select-option value="cristianismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_CRISTIANISMO' | translate }}</ion-select-option>
                <ion-select-option value="catolicismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_CATOLICISMO' | translate }}</ion-select-option>
                <ion-select-option value="protestantismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_PROTESTANTISMO' | translate }}</ion-select-option>
                <ion-select-option value="judaismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_JUDAISMO' | translate }}</ion-select-option>
                <ion-select-option value="islamismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_ISLAMISMO' | translate }}</ion-select-option>
                <ion-select-option value="budismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_BUDISMO' | translate }}</ion-select-option>
                <ion-select-option value="hinduismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_HINDUISMO' | translate }}</ion-select-option>
                <ion-select-option value="espiritismo">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_ESPIRITISMO' | translate }}</ion-select-option>
                <ion-select-option value="umbanda">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_UMBANDA' | translate }}</ion-select-option>
                <ion-select-option value="candomble">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_CANDOMBLE' | translate }}</ion-select-option>
                <ion-select-option value="ateu">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_ATEU' | translate }}</ion-select-option>
                <ion-select-option value="agnostico">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_AGNOSTICO' | translate }}</ion-select-option>
                <ion-select-option value="outro">{{ 'ONBOARDING.PERSONAL_DATA.RELIGION_OUTRO' | translate }}</ion-select-option>
              </ion-select>
            </div>
          </form>

          <div class="step-actions">
            <button class="onboarding-btn secondary-btn" (click)="previousStep()">
              <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
              <span>{{ 'COMMON.BACK' | translate }}</span>
            </button>
            <button 
              class="onboarding-btn primary-btn" 
              (click)="nextStep()"
              [disabled]="personalForm.invalid">
              <span>{{ 'COMMON.CONTINUE' | translate }}</span>
              <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>
      }

      <!-- Country Selection Modal -->
      <ion-modal [isOpen]="isCountryModalOpen()" (didDismiss)="closeCountryModal()">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ 'ONBOARDING.PERSONAL_DATA.COUNTRY' | translate }}</ion-title>
              <ion-button slot="end" fill="clear" (click)="closeCountryModal()">
                <ion-icon name="close" aria-hidden="true"></ion-icon>
              </ion-button>
            </ion-toolbar>
            <ion-toolbar>
              <ion-searchbar
                [placeholder]="'ONBOARDING.PERSONAL_DATA.SEARCH_COUNTRY' | translate"
                [(ngModel)]="countrySearchTerm"
                (ionInput)="onCountrySearch()"
                [debounce]="300">
              </ion-searchbar>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              @for (country of filteredCountries(); track country.code) {
                <ion-item button (click)="selectCountry(country)">
                  <img [src]="'./assets/imgs/flags/' + country.code.toLowerCase() + '.svg'" 
                       [alt]="country.name + ' flag'"
                       class="country-flag-img"
                       slot="start"
                       loading="lazy">
                  <ion-label>{{ country.name }}</ion-label>
                </ion-item>
              }
              @if (filteredCountries().length === 0) {
                <ion-item>
                  <ion-label class="ion-text-center">
                    <p>{{ 'COMMON.NO_RESULTS' | translate }}</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Step 2: Carers (Who Cares for Me) -->
      @if (currentStep() === 2) {
        <div class="onboarding-step">
          <div class="step-header">
            <div class="step-icon-header carers">
              <ion-icon name="people-outline" aria-hidden="true"></ion-icon>
            </div>
            <h2>{{ 'ONBOARDING.CARERS.TITLE' | translate }}</h2>
            <p>{{ 'ONBOARDING.CARERS.DESCRIPTION' | translate }}</p>
          </div>

          <div class="optional-notice">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p>{{ 'ONBOARDING.CARERS.OPTIONAL_MESSAGE' | translate }}</p>
          </div>

          <!-- Carers List -->
          <div class="care-network-section">
            @if (careNetworkService.whoCareForMe().length > 0) {
              <div class="care-list">
                <h3 class="list-title">Pessoas que cuidam de você</h3>
                @for (carer of careNetworkService.whoCareForMe(); track carer.userId) {
                  <div class="care-item">
                    <div class="care-avatar">
                      @if (carer.avatarUrl) {
                        <img [src]="carer.avatarUrl" [alt]="carer.name">
                      } @else {
                        <ion-icon name="person-outline"></ion-icon>
                      }
                    </div>
                    <div class="care-info">
                      <div class="care-name">{{ carer.name }}</div>
                      <div class="care-email">{{ carer.email }}</div>
                      @if (carer.status === 'pending') {
                        <span class="status-badge pending">Pendente</span>
                      }
                    </div>
                    <button 
                      type="button"
                      class="remove-btn" 
                      (click)="removeCarer(carer.userId)"
                      [attr.aria-label]="'Remover ' + carer.name">
                      <ion-icon name="trash-outline"></ion-icon>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Add Carer Form -->
            <div class="add-care-form">
              <h3 class="form-title">
                <ion-icon name="person-add-outline"></ion-icon>
                Adicionar cuidador
              </h3>
              
              <div class="form-fields">
                <div class="form-group">
                  <label for="carer-email">E-mail do cuidador</label>
                  <ion-input
                    id="carer-email"
                    type="email"
                    [(ngModel)]="carerEmail"
                    placeholder="email@exemplo.com"
                    [disabled]="isAddingCarer()">
                  </ion-input>
                </div>

                <div class="form-group">
                  <label for="carer-name">Nome (opcional se não cadastrado)</label>
                  <ion-input
                    id="carer-name"
                    type="text"
                    [(ngModel)]="carerName"
                    placeholder="Nome completo"
                    [disabled]="isAddingCarer()">
                  </ion-input>
                </div>

                <div class="form-group">
                  <label for="carer-relationship">Relacionamento (opcional)</label>
                  <ion-select
                    id="carer-relationship"
                    [(ngModel)]="carerRelationship"
                    placeholder="Selecione"
                    [disabled]="isAddingCarer()">
                    <ion-select-option value="parent">Pai/Mãe</ion-select-option>
                    <ion-select-option value="child">Filho(a)</ion-select-option>
                    <ion-select-option value="spouse">Cônjuge</ion-select-option>
                    <ion-select-option value="sibling">Irmão(ã)</ion-select-option>
                    <ion-select-option value="friend">Amigo(a)</ion-select-option>
                    <ion-select-option value="caregiver">Cuidador profissional</ion-select-option>
                    <ion-select-option value="other">Outro</ion-select-option>
                  </ion-select>
                </div>

                <button 
                  type="button"
                  class="add-btn"
                  (click)="addCarer()"
                  [disabled]="!carerEmail() || isAddingCarer()">
                  @if (isAddingCarer()) {
                    <ion-spinner name="crescent"></ion-spinner>
                    <span>Adicionando...</span>
                  } @else {
                    <ion-icon name="add-outline"></ion-icon>
                    <span>Adicionar cuidador</span>
                  }
                </button>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="onboarding-btn secondary-btn" (click)="previousStep()">
              <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
              <span>{{ 'COMMON.BACK' | translate }}</span>
            </button>
            <button 
              class="onboarding-btn primary-btn" 
              (click)="nextStep()">
              <span>{{ 'COMMON.CONTINUE' | translate }}</span>
              <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>
      }

      <!-- Step 3: Dependents (Who I Care For) -->
      @if (currentStep() === 3) {
        <div class="onboarding-step">
          <div class="step-header">
            <div class="step-icon-header dependents">
              <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
            </div>
            <h2>{{ 'ONBOARDING.DEPENDENTS.TITLE' | translate }}</h2>
            <p>{{ 'ONBOARDING.DEPENDENTS.DESCRIPTION' | translate }}</p>
          </div>

          <div class="optional-notice">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p>{{ 'ONBOARDING.DEPENDENTS.OPTIONAL_MESSAGE' | translate }}</p>
          </div>

          <!-- Dependents List -->
          <div class="care-network-section">
            @if (careNetworkService.iCareFor().length > 0) {
              <div class="care-list">
                <h3 class="list-title">Pessoas que você cuida</h3>
                @for (dependent of careNetworkService.iCareFor(); track dependent.userId) {
                  <div class="care-item">
                    <div class="care-avatar">
                      @if (dependent.avatarUrl) {
                        <img [src]="dependent.avatarUrl" [alt]="dependent.name">
                      } @else {
                        <ion-icon name="person-outline"></ion-icon>
                      }
                    </div>
                    <div class="care-info">
                      <div class="care-name">{{ dependent.name }}</div>
                      <div class="care-email">{{ dependent.email }}</div>
                      @if (dependent.relationship) {
                        <span class="relationship-badge">{{ dependent.relationship }}</span>
                      }
                      @if (dependent.status === 'pending') {
                        <span class="status-badge pending">Pendente</span>
                      } @else if (!dependent.isRegisteredUser) {
                        <span class="status-badge contact">Contato</span>
                      }
                    </div>
                    <button 
                      type="button"
                      class="remove-btn" 
                      (click)="removeDependent(dependent.userId)"
                      [attr.aria-label]="'Remover ' + dependent.name">
                      <ion-icon name="trash-outline"></ion-icon>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Add Dependent Form -->
            <div class="add-care-form">
              <h3 class="form-title">
                <ion-icon name="person-add-outline"></ion-icon>
                Adicionar dependente
              </h3>
              
              <div class="form-fields">
                <div class="form-group">
                  <label for="dependent-email">E-mail do dependente</label>
                  <ion-input
                    id="dependent-email"
                    type="email"
                    [(ngModel)]="dependentEmail"
                    placeholder="email@exemplo.com"
                    [disabled]="isAddingDependent()">
                  </ion-input>
                </div>

                <div class="form-group">
                  <label for="dependent-name">Nome (opcional se não cadastrado)</label>
                  <ion-input
                    id="dependent-name"
                    type="text"
                    [(ngModel)]="dependentName"
                    placeholder="Nome completo"
                    [disabled]="isAddingDependent()">
                  </ion-input>
                </div>

                <div class="form-group">
                  <label for="dependent-relationship">Relacionamento (opcional)</label>
                  <ion-select
                    id="dependent-relationship"
                    [(ngModel)]="dependentRelationship"
                    placeholder="Selecione"
                    [disabled]="isAddingDependent()">
                    <ion-select-option value="parent">Pai/Mãe</ion-select-option>
                    <ion-select-option value="child">Filho(a)</ion-select-option>
                    <ion-select-option value="spouse">Cônjuge</ion-select-option>
                    <ion-select-option value="sibling">Irmão(ã)</ion-select-option>
                    <ion-select-option value="grandparent">Avô/Avó</ion-select-option>
                    <ion-select-option value="grandchild">Neto(a)</ion-select-option>
                    <ion-select-option value="friend">Amigo(a)</ion-select-option>
                    <ion-select-option value="patient">Paciente</ion-select-option>
                    <ion-select-option value="other">Outro</ion-select-option>
                  </ion-select>
                </div>

                <button 
                  type="button"
                  class="add-btn"
                  (click)="addDependent()"
                  [disabled]="!dependentEmail() || isAddingDependent()">
                  @if (isAddingDependent()) {
                    <ion-spinner name="crescent"></ion-spinner>
                    <span>Adicionando...</span>
                  } @else {
                    <ion-icon name="add-outline"></ion-icon>
                    <span>Adicionar dependente</span>
                  }
                </button>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="onboarding-btn secondary-btn" (click)="previousStep()">
              <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
              <span>{{ 'COMMON.BACK' | translate }}</span>
            </button>
            <button 
              class="onboarding-btn primary-btn" 
              (click)="nextStep()">
              <span>{{ 'COMMON.CONTINUE' | translate }}</span>
              <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>
      }

      <!-- Step 4: First Medication (Optional) -->
      @if (currentStep() === 4) {
        <div class="onboarding-step">
          <div class="step-header">
            <div class="step-icon-header medication">
              <ion-icon name="medical" aria-hidden="true"></ion-icon>
            </div>
            <h2>Primeiro Medicamento</h2>
            <p>Cadastre seu primeiro medicamento ou pule esta etapa</p>
          </div>

          <div class="optional-notice">
            <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
            <p>Esta etapa é opcional. Você pode adicionar medicamentos depois.</p>
          </div>

          <!-- Patient Selector -->
          <div class="patient-selector-container">
            <app-patient-selector></app-patient-selector>
          </div>

          <div class="step-actions-vertical">
            <button 
              class="onboarding-btn primary-btn" 
              (click)="goToMedicationForm()">
              <ion-icon name="medical" aria-hidden="true"></ion-icon>
              <span>Adicionar Medicamento</span>
            </button>
            
            <button 
              class="onboarding-btn secondary-btn-outline" 
              (click)="nextStep()">
              <span>Pular por Enquanto</span>
              <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>
      }

      <!-- Step 5: Plans & Terms of Use -->
      @if (currentStep() === 5) {
        <div class="onboarding-step">
          <div class="step-header">
            <div class="step-icon-header terms">
              <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
            </div>
            <h2>{{ 'ONBOARDING.TERMS.TITLE' | translate }}</h2>
            <p>{{ 'ONBOARDING.TERMS.DESCRIPTION' | translate }}</p>
          </div>

          @if (loadingTerms()) {
            <div class="loading-container">
              <ion-spinner name="crescent"></ion-spinner>
              <p>{{ 'ONBOARDING.TERMS.LOADING' | translate }}</p>
            </div>
          } @else if (latestTerms()) {
            <div class="terms-container">
              <div class="terms-header">
                <h3>{{ 'ONBOARDING.TERMS.VERSION' | translate }} {{ latestTerms()!.version }}</h3>
                <p class="terms-date">{{ 'ONBOARDING.TERMS.EFFECTIVE_DATE' | translate }}: {{ latestTerms()!.effectiveDate | date:'dd/MM/yyyy' }}</p>
              </div>

              <div class="terms-content" [innerHTML]="latestTerms()!.text"></div>

              <form [formGroup]="termsForm" class="terms-acceptance-form">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    formControlName="acceptTerms"
                    id="accept-terms">
                  <span>{{ 'ONBOARDING.TERMS.ACCEPT_LABEL' | translate }}</span>
                </label>
              </form>
            </div>
          } @else {
            <div class="error-container">
              <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
              <p>{{ 'ONBOARDING.TERMS.ERROR_LOADING' | translate }}</p>
            </div>
          }

          <div class="step-actions">
            <button class="onboarding-btn secondary-btn" (click)="previousStep()">
              <ion-icon name="arrow-back" aria-hidden="true"></ion-icon>
              <span>{{ 'COMMON.BACK' | translate }}</span>
            </button>
            <button 
              class="onboarding-btn primary-btn" 
              (click)="completeOnboarding()"
              [disabled]="termsForm.invalid || !latestTerms()">
              <span>{{ 'ONBOARDING.TERMS.COMPLETE' | translate }}</span>
              <ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>
      }
    </ion-content>
  `,
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly countryService = inject(CountryService);
  private readonly translationService = inject(TranslationService);
  private readonly termsService = inject(TermsOfUseService);
  readonly careNetworkService = inject(CareNetworkService);
  private readonly toastController = inject(ToastController);

  currentStep = signal(0);
  totalSteps = 5; // Updated: 0=welcome, 1=personal, 2=carers, 3=dependents, 4=medications, 5=terms
  private isRestoringData = false;

  personalForm: FormGroup;
  termsForm: FormGroup;
  
  // Terms of use
  latestTerms = signal<TermsOfUse | null>(null);
  loadingTerms = signal(false);

  // Country management
  countries = this.countryService.getCountries();
  selectedCountry = signal<CountryDocument>(this.countryService.detectUserCountry());
  filteredCountries = signal<CountryDocument[]>(this.countries);
  isCountryModalOpen = signal(false);
  countrySearchTerm = '';

  // Carers management
  carerEmail = signal('');
  carerName = signal('');
  carerRelationship = signal('');
  isAddingCarer = signal(false);
  
  // Dependents management
  dependentEmail = signal('');
  dependentName = signal('');
  dependentRelationship = signal('');
  isAddingDependent = signal(false);

  constructor() {
    addIcons({
      personOutline,
      cardOutline,
      calendarOutline,
      'transgender-outline': transgenderOutline,
      'water-outline': waterOutline,
      medicalOutline,
      callOutline,
      'mail-outline': mailOutline,
      'book-outline': bookOutline,
      'people-outline': peopleOutline,
      'heart-outline': heartOutline,
      'document-text-outline': documentTextOutline,
      'alert-circle-outline': alertCircleOutline,
      'checkmark-circle': checkmarkCircle,
      'arrow-forward': arrowForward,
      'arrow-back': arrowBack,
      'add-outline': addOutline,
      'trash-outline': trashOutline,
      'person-add-outline': personAddOutline,
      close,
      medical: medicalOutline,
      'globe-outline': globeOutline,
      'search-outline': searchOutline,
      'chevron-down-outline': chevronDownOutline
    });

    const currentUser = this.userService.currentUser();
    const firebaseUser = this.authService.currentUser();
    const defaultCountry = this.countryService.detectUserCountry();

    this.personalForm = this.fb.group({
      country: [currentUser?.country || defaultCountry.code, Validators.required],
      name: [currentUser?.name || '', Validators.required],
      birthDate: [currentUser?.birthDate || '', Validators.required],
      gender: [currentUser?.gender || '', Validators.required],
      document: [currentUser?.document || '', Validators.required],
      email: [{value: firebaseUser?.email || '', disabled: true}, Validators.required],
      phone: [currentUser?.phone || '', Validators.required],
      religion: [currentUser?.religion || ''] // Optional
    });

    // Watch for country changes to update selected country
    this.personalForm.get('country')?.valueChanges.subscribe(countryCode => {
      const country = this.countryService.getCountryByCode(countryCode);
      if (country) {
        this.selectedCountry.set(country);
        // Clear document field when country changes
        this.personalForm.patchValue({ document: '' }, { emitEvent: false });
        
        // Change language based on country
        this.translationService.setLanguageByCountryCode(countryCode);
      }
    });

    this.termsForm = this.fb.group({
      acceptTerms: [false, Validators.requiredTrue]
    });

    // Watch for user data changes to restore onboarding progress
    effect(() => {
      const currentUser = this.userService.currentUser();
      if (currentUser && !this.isRestoringData) {
        this.restoreOnboardingProgress(currentUser);
      }
    });
  }

  ngOnInit() {
    console.log('[OnboardingComponent] Component initialized');
  }

  /**
   * Restore onboarding progress from saved user data
   */
  private restoreOnboardingProgress(user: any) {
    this.isRestoringData = true;

    console.log('[OnboardingComponent] Restoring progress for user:', user);

    // Restore current step based on onboardingSteps flags (new system)
    if (user.onboardingSteps) {
      const steps = user.onboardingSteps;
      if (!steps.welcome) {
        this.currentStep.set(0);
      } else if (!steps.personalData) {
        this.currentStep.set(1);
      } else if (!steps.carers) {
        this.currentStep.set(2);
      } else if (!steps.dependents) {
        this.currentStep.set(3);
      } else if (!steps.medications) {
        this.currentStep.set(4);
      } else if (!steps.plansAndTerms) {
        this.currentStep.set(5);
      }
      console.log('[OnboardingComponent] Restored to step from onboardingSteps:', this.currentStep());
    } else if (user.onboardingStep !== undefined && user.onboardingStep !== null) {
      // Fallback to old checkpoint system
      console.log('[OnboardingComponent] Restoring to step (legacy):', user.onboardingStep);
      this.currentStep.set(user.onboardingStep);
    }

    // Restore personal form data
    if (user.name || user.country || user.document || user.birthDate || user.gender || user.phone || user.religion) {
      const firebaseUser = this.authService.currentUser();
      this.personalForm.patchValue({
        country: user.country || this.countryService.detectUserCountry().code,
        name: user.name || '',
        birthDate: user.birthDate || '',
        gender: user.gender || '',
        document: user.document || '',
        email: firebaseUser?.email || '',
        phone: user.phone || '',
        religion: user.religion || ''
      }, { emitEvent: false });

      // Update selected country if available
      if (user.country) {
        const country = this.countryService.getCountryByCode(user.country);
        if (country) {
          this.selectedCountry.set(country);
        }
      }
    }

    this.isRestoringData = false;
  }

  /**
   * Open country selection modal
   */
  openCountryModal() {
    this.isCountryModalOpen.set(true);
    this.countrySearchTerm = '';
    this.filteredCountries.set(this.countries);
  }

  /**
   * Close country selection modal
   */
  closeCountryModal() {
    this.isCountryModalOpen.set(false);
    this.countrySearchTerm = '';
  }

  /**
   * Handle country search
   */
  onCountrySearch() {
    const filtered = this.countryService.searchCountries(this.countrySearchTerm);
    this.filteredCountries.set(filtered);
  }

  /**
   * Select a country from the modal
   */
  selectCountry(country: CountryDocument) {
    this.selectedCountry.set(country);
    this.personalForm.patchValue({ country: country.code });
    
    // Automatically change language based on selected country
    if (country.language) {
      this.translationService.setLanguage(country.language);
    }
    
    this.closeCountryModal();
  }

  async nextStep() {
    if (this.currentStep() < this.totalSteps) {
      // Validate current step before moving forward
      if (this.currentStep() === 1 && this.personalForm.invalid) {
        this.showToast('Por favor, preencha todos os campos obrigatórios', 'warning');
        return;
      }
      
      if (this.currentStep() === 5 && this.termsForm.invalid) {
        this.showToast('Por favor, aceite os Termos de Uso para continuar', 'warning');
        return;
      }

      // Save current step data before advancing
      await this.saveCurrentStep();

      this.currentStep.update(step => step + 1);
      
      // Load terms when reaching step 5
      if (this.currentStep() === 5) {
        await this.loadTermsOfUse();
      }
      
      window.scrollTo(0, 0);
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(step => step - 1);
      window.scrollTo(0, 0);
    }
  }

  async goToMedicationForm() {
    await this.saveOnboardingData();
    this.router.navigate(['/medication/add'], { 
      queryParams: { fromOnboarding: 'true' } 
    });
  }

  async completeOnboarding() {
    await this.saveOnboardingData();
    
    const toast = await this.toastController.create({
      message: 'Perfil configurado com sucesso!',
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    this.router.navigate(['/tabs/dashboard']);
  }
  
  /**
   * Load terms of use for user's country
   */
  async loadTermsOfUse() {
    this.loadingTerms.set(true);
    try {
      const user = this.userService.currentUser();
      const country = user?.country || this.countryService.detectUserCountry().code;
      
      const terms = await this.termsService.getLatestTermsForCountry(country);
      this.latestTerms.set(terms);
      
      if (!terms) {
        console.warn('[OnboardingComponent] No terms found for country:', country);
        this.showToast('Termos de uso não disponíveis para este país', 'warning');
      }
    } catch (error) {
      console.error('[OnboardingComponent] Error loading terms:', error);
      this.showToast('Erro ao carregar Termos de Uso', 'danger');
    } finally {
      this.loadingTerms.set(false);
    }
  }

  /**
   * Save current step progress to Firestore
   * Creates document if it doesn't exist yet
   */
  private async saveCurrentStep() {
    const country = this.selectedCountry();
    const documentType = country.documentType;

    const currentStepValue = this.currentStep();
    
    // Build onboardingSteps object based on current progress
    const onboardingSteps: OnboardingSteps = {
      welcome: currentStepValue > 0,
      personalData: currentStepValue > 1 && this.personalForm.valid,
      carers: currentStepValue > 2,
      dependents: currentStepValue > 3,
      medications: currentStepValue > 4,
      plansAndTerms: false // Only true on final completion
    };
    
    const updatedData: Partial<any> = {
      documentType,
      onboardingStep: currentStepValue,
      onboardingSteps
    };

    // Add personal data if step 1 is complete
    if (currentStepValue >= 1) {
      // Get raw value to include disabled fields (email)
      const personalData = this.personalForm.getRawValue();
      Object.assign(updatedData, personalData);
    }

    // Remove empty/null values to avoid overwriting existing data
    for (const key of Object.keys(updatedData)) {
      if (updatedData[key] === '' || updatedData[key] === null || updatedData[key] === undefined) {
        delete updatedData[key];
      }
    }

    console.log('[OnboardingComponent] Saving step', currentStepValue, 'with data:', updatedData);
    await this.userService.createOrUpdateUser(updatedData);
  }

  private async saveOnboardingData() {
    // Get document type from selected country
    const country = this.selectedCountry();
    const documentType = country.documentType;
    
    // Get terms acceptance data
    const terms = this.latestTerms();
    if (!terms) {
      this.showToast('Erro: Termos de uso não carregados', 'danger');
      return;
    }
    
    const termsAcceptance: TermsAcceptance = {
      termsId: terms.id || `${terms.country}_${terms.version}`,
      version: terms.version,
      country: terms.country,
      acceptedAt: new Date()
    };

    // Get raw value to include disabled fields (email)
    const formData: Partial<any> = {
      ...this.personalForm.getRawValue(),
      documentType, // Automatically set based on country
    };

    // Remove empty/null values from form data
    for (const key of Object.keys(formData)) {
      if (formData[key] === '' || formData[key] === null || formData[key] === undefined) {
        delete formData[key];
      }
    }

    // Add onboarding completion flags (these must ALWAYS be saved)
    const updatedData = {
      ...formData,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingStep: undefined, // Clear step when onboarding is complete
      onboardingSteps: {
        welcome: true,
        personalData: true,
        carers: true,
        dependents: true,
        medications: true,
        plansAndTerms: true
      },
      termsAcceptance: [termsAcceptance]
    };

    console.log('[OnboardingComponent] Completing onboarding with data:', updatedData);
    await this.userService.createOrUpdateUser(updatedData);
  }

  // Helper method to apply document mask
  onDocumentInput(event: any) {
    const input = event.target;
    const value = input.value;
    const country = this.selectedCountry();
    
    const maskedValue = this.countryService.applyMask(value, country.documentMask);
    this.personalForm.patchValue({ document: maskedValue }, { emitEvent: false });
  }

  /**
   * Add a carer (person who cares for me)
   */
  async addCarer() {
    const email = this.carerEmail().trim();
    const name = this.carerName().trim();
    
    if (!email) {
      this.showToast('Por favor, insira um e-mail', 'warning');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showToast('Por favor, insira um e-mail válido', 'warning');
      return;
    }

    this.isAddingCarer.set(true);

    try {
      // For carers, we need to send an invite (they will care for me)
      // This is the opposite of addCareForUser which is for people I care for
      const result = await this.sendCarerInvite(email, name);
      
      if (result.success) {
        this.showToast(result.message, 'success');
        // Clear form
        this.carerEmail.set('');
        this.carerName.set('');
        this.carerRelationship.set('');
        // Reload care network
        await this.careNetworkService.loadCareNetwork();
      } else {
        this.showToast(result.message, 'danger');
      }
    } catch (error) {
      console.error('[OnboardingComponent] Error adding carer:', error);
      this.showToast('Erro ao adicionar cuidador', 'danger');
    } finally {
      this.isAddingCarer.set(false);
    }
  }

  /**
   * Send invite for someone to be my carer
   */
  private async sendCarerInvite(email: string, name: string): Promise<{success: boolean, message: string}> {
    // This functionality would need to be implemented in CareNetworkService
    // For now, we'll show a message that the feature is coming soon
    return {
      success: false,
      message: 'Funcionalidade de convite para cuidadores em desenvolvimento. Use a aba "Rede de Cuidado" após completar o onboarding.'
    };
  }

  /**
   * Remove a carer
   */
  async removeCarer(carerId: string) {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return;

      const userRef = doc(this.careNetworkService['firestore'], 'users', currentUser.uid);
      const currentData = (await getDoc(userRef)).data();
      const currentCarers = currentData?.['whoCareForMe'] || [];

      // Remove carer from array
      const updatedCarers = currentCarers.filter((c: any) => c.userId !== carerId);

      await updateDoc(userRef, {
        whoCareForMe: updatedCarers
      });

      await this.careNetworkService.loadCareNetwork();
      this.showToast('Cuidador removido com sucesso', 'success');
    } catch (error) {
      console.error('[OnboardingComponent] Error removing carer:', error);
      this.showToast('Erro ao remover cuidador', 'danger');
    }
  }

  /**
   * Add a dependent (person I care for)
   */
  async addDependent() {
    const email = this.dependentEmail().trim();
    const name = this.dependentName().trim();
    const relationship = this.dependentRelationship();
    
    if (!email) {
      this.showToast('Por favor, insira um e-mail', 'warning');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showToast('Por favor, insira um e-mail válido', 'warning');
      return;
    }

    this.isAddingDependent.set(true);

    try {
      const result = await this.careNetworkService.addCareForUser(email, name, relationship);
      
      if (result.success) {
        let message = 'Dependente adicionado com sucesso';
        if (result.needsInvite) {
          message = 'Convite enviado com sucesso! O usuário receberá uma notificação.';
        }
        this.showToast(message, 'success');
        // Clear form
        this.dependentEmail.set('');
        this.dependentName.set('');
        this.dependentRelationship.set('');
        // Reload care network
        await this.careNetworkService.loadCareNetwork();
      } else {
        this.showToast(result.message, 'danger');
      }
    } catch (error) {
      console.error('[OnboardingComponent] Error adding dependent:', error);
      this.showToast('Erro ao adicionar dependente', 'danger');
    } finally {
      this.isAddingDependent.set(false);
    }
  }

  /**
   * Remove a dependent
   */
  async removeDependent(dependentId: string) {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return;

      const userRef = doc(this.careNetworkService['firestore'], 'users', currentUser.uid);
      const currentData = (await getDoc(userRef)).data();
      const currentDependents = currentData?.['iCareFor'] || [];

      // Remove dependent from array
      const updatedDependents = currentDependents.filter((d: any) => d.userId !== dependentId);

      await updateDoc(userRef, {
        iCareFor: updatedDependents
      });

      await this.careNetworkService.loadCareNetwork();
      this.showToast('Dependente removido com sucesso', 'success');
    } catch (error) {
      console.error('[OnboardingComponent] Error removing dependent:', error);
      this.showToast('Erro ao remover dependente', 'danger');
    }
  }

  private async showToast(message: string, color: string = 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }
}
