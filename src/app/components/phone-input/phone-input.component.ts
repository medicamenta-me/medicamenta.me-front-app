import { Component, Input, signal, forwardRef, inject, OnInit } from '@angular/core';

import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { 
  IonInput, 
  IonIcon, 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonSearchbar 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, chevronDownOutline } from 'ionicons/icons';
import { CountryService, CountryDocument } from '../../services/country.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonInput,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSearchbar
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="phone-input-container">
      <!-- Country Selector -->
      <div class="country-selector" (click)="openCountryModal()" (keyup.enter)="openCountryModal()" tabindex="0" role="button" [attr.aria-label]="'Select country: ' + selectedCountry().name">
        <img 
          [src]="'./assets/imgs/flags/' + selectedCountry().code.toLowerCase() + '.svg' "
          [alt]="selectedCountry().name + ' flag'"
          class="country-flag"
          loading="lazy">
        <span class="country-code">{{ getPhoneCode(selectedCountry()) }}</span>
        <ion-icon name="chevron-down-outline" class="dropdown-icon"></ion-icon>
      </div>

      <!-- Phone Number Input -->
      <ion-input
        class="phone-number-input"
        type="tel"
        [value]="phoneNumber()"
        (ionInput)="onPhoneInput($event)"
        [placeholder]="getPhoneMask()"
        [attr.aria-label]="ariaLabel"
        [attr.aria-required]="required">
      </ion-input>
    </div>

    <!-- Country Selection Modal -->
    <ion-modal [isOpen]="isCountryModalOpen()" (didDismiss)="closeCountryModal()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ 'ONBOARDING.SELECT_COUNTRY' | translate }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="closeCountryModal()">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              [placeholder]="'ONBOARDING.SEARCH_COUNTRY' | translate"
              [(ngModel)]="searchTerm"
              (ionInput)="filterCountries()"
              [debounce]="300">
            </ion-searchbar>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list>
            @for (country of filteredCountries(); track country.code) {
              <ion-item button (click)="selectCountry(country)">
                <img 
                  [src]="'./assets/imgs/flags/' + country.code.toLowerCase() + '.svg'" 
                  [alt]="country.name + ' flag'"
                  slot="start"
                  class="modal-country-flag"
                  loading="lazy">
                <ion-label>
                  <h3>{{ country.name }}</h3>
                  <p>{{ getPhoneCode(country) }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .phone-input-container {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
      width: 100%;
    }

    .country-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.75rem;
      background: #F5F5F5;
      border: 2px solid #E0E0E0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 110px;
      flex-shrink: 0;
    }

    .country-selector:hover {
      border-color: #34D187;
    }

    .country-flag {
      width: 24px;
      height: 18px;
      object-fit: cover;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .country-code {
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
      flex: 1;
    }

    .dropdown-icon {
      font-size: 1.125rem;
      color: #999;
      flex-shrink: 0;
    }

    .phone-number-input {
      flex: 1;
      --background: #F5F5F5;
      --color: #333;
      --padding-start: 1rem;
      --padding-end: 1rem;
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      --border-radius: 12px;
      font-size: 1.125rem;
      font-weight: 500;
      border: 2px solid #E0E0E0;
      border-radius: 12px;
      transition: all 0.3s ease;
      min-height: 58px;
    }

    .phone-number-input:hover {
      border-color: #34D187;
    }

    .phone-number-input.ion-focused,
    .phone-number-input.ion-focus-within {
      border-color: #34D187;
      box-shadow: 0 0 0 3px rgba(52, 209, 135, 0.2);
      outline: none;
    }

    .modal-country-flag {
      width: 32px;
      height: 24px;
      object-fit: cover;
      border-radius: 2px;
      margin-right: 1rem;
    }

    ion-modal ion-item {
      --padding-start: 1rem;
    }

    ion-modal ion-label h3 {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.25rem;
    }

    ion-modal ion-label p {
      color: #666;
      font-size: 0.9rem;
    }
  `]
})
export class PhoneInputComponent implements ControlValueAccessor, OnInit {
  private readonly countryService = inject(CountryService);

  @Input() ariaLabel = 'Phone number';
  @Input() required = false;
  @Input() defaultCountryCode = 'BR'; // Default to Brazil

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedCountry = signal<CountryDocument>(this.countryService.getCountryByCode(this.defaultCountryCode)!);
  readonly phoneNumber = signal<string>('');
  readonly isCountryModalOpen = signal<boolean>(false);
  readonly filteredCountries = signal<CountryDocument[]>([]);
  
  searchTerm = '';
  private allCountries: CountryDocument[] = [];

  constructor() {
    addIcons({
      'close-outline': closeOutline,
      'chevron-down-outline': chevronDownOutline
    });
  }

  ngOnInit() {
    this.allCountries = this.countryService.getCountries();
    this.filteredCountries.set(this.allCountries);

    // Set default country if not already set
    if (!this.selectedCountry()) {
      const defaultCountry = this.countryService.getCountryByCode(this.defaultCountryCode);
      if (defaultCountry) {
        this.selectedCountry.set(defaultCountry);
      }
    }
  }

  // Get phone code from country
  getPhoneCode(country: CountryDocument): string {
    return country.phoneCode || '';
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    if (value) {
      // Parse the value to extract country code and phone number
      // Expected format: "+55 (11) 98765-4321" or similar
      const phoneCodeRegex = /^\+(\d+)\s*(.+)$/;
      const match = phoneCodeRegex.exec(value);
      if (match) {
        const phoneCode = `+${match[1]}`;
        const number = match[2];
        
        // Find country by phone code
        const country = this.allCountries.find(c => c.phoneCode === phoneCode);
        if (country) {
          this.selectedCountry.set(country);
        }
        
        this.phoneNumber.set(number);
      } else {
        this.phoneNumber.set(value);
      }
    } else {
      this.phoneNumber.set('');
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Handle disabled state if needed
  }

  onPhoneInput(event: any) {
    const value = event.target.value;
    const formatted = this.formatPhoneNumber(value);
    this.phoneNumber.set(formatted);
    
    // Emit the full phone number with country code
    const phoneCode = this.getPhoneCode(this.selectedCountry());
    const fullNumber = `${phoneCode} ${formatted}`;
    this.onChange(fullNumber);
    this.onTouched();
  }

  formatPhoneNumber(value: string): string {
    // Remove all non-digit characters
    const cleaned = value.replaceAll(/\D/g, '');
    
    const country = this.selectedCountry();
    const mask = country.phoneMask;
    
    if (!mask) return cleaned;

    // Apply the mask directly (no DDI in mask anymore)
    let formatted = '';
    let valueIndex = 0;

    for (let i = 0; i < mask.length && valueIndex < cleaned.length; i++) {
      const maskChar = mask[i];
      
      if (maskChar === '0') {
        formatted += cleaned[valueIndex];
        valueIndex++;
      } else {
        formatted += maskChar;
      }
    }

    return formatted;
  }

  getPhoneMask(): string {
    const mask = this.selectedCountry().phoneMask;
    if (!mask) return '';
    
    // Replace '0' with placeholder character
    return mask.replaceAll('0', '_');
  }

  openCountryModal() {
    this.isCountryModalOpen.set(true);
    this.searchTerm = '';
    this.filteredCountries.set(this.allCountries);
  }

  closeCountryModal() {
    this.isCountryModalOpen.set(false);
  }

  selectCountry(country: CountryDocument) {
    this.selectedCountry.set(country);
    this.closeCountryModal();
    
    // Clear phone number when changing country
    this.phoneNumber.set('');
    this.onChange(`${country.phoneCode} `);
    this.onTouched();
  }

  filterCountries() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredCountries.set(this.allCountries);
      return;
    }

    const filtered = this.allCountries.filter(country =>
      country.name.toLowerCase().includes(term) ||
      country.phoneCode.includes(term)
    );

    this.filteredCountries.set(filtered);
  }
}
