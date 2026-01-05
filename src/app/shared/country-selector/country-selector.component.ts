import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonSearchbar, IonList, IonItem, IonLabel, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

@Component({
  selector: 'app-country-selector',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent
],
  template: `
    <div class="country-selector-container">
      <button 
        type="button"
        class="country-button"
        (click)="openModal()"
        [attr.aria-label]="'Select country'">
        @if (selectedCountry) {
          <div class="country-button-content">
            <img 
              [src]="'assets/imgs/flags/' + selectedCountry.code.toLowerCase() + '.svg'" 
              [alt]="selectedCountry.name + ' flag'"
              class="country-flag-img">
            <span class="country-name">{{ selectedCountry.name }}</span>
          </div>
        } @else {
          <div class="country-button-content">
            <svg class="country-flag-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path fill="currentColor" d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm90.2 140.2l-32.9 36.4-49.1-5.6-20.3 45.7-41.4-22.3-29.3 37.6-3.7-49.3-45.8-20.1 22.4-41.4-37.7-29.3 49.3-3.7 20.1-45.8 41.4 22.4 29.3-37.7 3.7 49.3 45.8 20.1-22.4 41.4 37.7 29.3-49.3 3.7z"/>
            </svg>
            <span class="country-placeholder">{{ 'COUNTRY_SELECTOR.SELECT_COUNTRY' | translate }}</span>
          </div>
        }
        <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M184 112l144 144-144 144"/>
        </svg>
      </button>

      <ion-modal [isOpen]="isModalOpen" (didDismiss)="closeModal()">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>{{ 'COUNTRY_SELECTOR.TITLE' | translate }}</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeModal()">{{ 'COUNTRY_SELECTOR.CLOSE' | translate }}</ion-button>
              </ion-buttons>
            </ion-toolbar>
            <ion-toolbar>
              <ion-searchbar
                [(ngModel)]="searchTerm"
                (ionInput)="filterCountries()"
                [placeholder]="'COUNTRY_SELECTOR.SEARCH_PLACEHOLDER' | translate"
                [debounce]="300">
              </ion-searchbar>
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <ion-list>
              @for(country of filteredCountries; track country.code) {
                <ion-item 
                  button 
                  (click)="selectCountry(country)"
                  [class.selected]="selectedCountry?.code === country.code">
                  <img 
                    [src]="'assets/imgs/flags/' + country.code.toLowerCase() + '.svg'" 
                    [alt]="country.name + ' flag'"
                    class="item-flag-img"
                    slot="start">
                  <ion-label>
                    <h2>{{ country.name }}</h2>
                    <p>{{ country.dialCode }}</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>
          </ion-content>
        </ng-template>
      </ion-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .country-selector-container {
      width: 100%;
    }

    .country-button {
      width: 100%;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      font-size: 1.125rem;
      min-height: 4.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .country-button:hover {
      border-color: #34D187;
      box-shadow: 0 4px 12px rgba(52, 209, 135, 0.2);
      transform: translateY(-1px);
    }

    .country-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(52, 209, 135, 0.15);
    }

    .country-button-content {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex: 1;
      min-width: 0;
    }

    .country-flag-img {
      width: 2.5rem;
      height: 2.5rem;
      object-fit: contain;
      border-radius: 4px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .country-flag-placeholder {
      width: 2.5rem;
      height: 2.5rem;
      color: #999;
      flex-shrink: 0;
    }

    .country-name {
      font-weight: 700;
      color: #333;
      font-size: 1.25rem;
      line-height: 1.4;
      flex: 1;
      text-align: left;
      letter-spacing: -0.3px;
    }

    .country-placeholder {
      color: #999;
      font-weight: 600;
      font-size: 1.125rem;
      flex: 1;
      text-align: left;
    }

    .chevron-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #34D187;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .country-button:hover .chevron-icon {
      transform: translateX(3px);
    }

    .item-flag-img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
      border-radius: 3px;
      margin-right: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    ion-item.selected {
      --background: rgba(52, 209, 135, 0.1);
      --border-color: #34D187;
    }

    ion-item h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 0.25rem;
    }

    ion-item p {
      font-size: 1rem;
      color: #666;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    @media (prefers-color-scheme: dark) {
      .country-button {
        background: #1e1e1e;
        border-color: #444;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .country-button:hover {
        background: #2a2a2a;
        border-color: #34D187;
        box-shadow: 0 4px 12px rgba(52, 209, 135, 0.3);
      }

      .country-name {
        color: #ffffff;
      }

      .country-placeholder {
        color: #888;
      }

      ion-item h2 {
        color: #ffffff;
      }

      ion-item p {
        color: #cccccc;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CountrySelectorComponent implements OnInit {
  @Input() countries: Country[] = [];
  @Input() selectedCountry: Country | null = null;
  @Output() countrySelected = new EventEmitter<Country>();

  isModalOpen = false;
  searchTerm = '';
  filteredCountries: Country[] = [];

  ngOnInit() {
    this.filteredCountries = [...this.countries];
  }

  openModal() {
    this.isModalOpen = true;
    this.searchTerm = '';
    this.filteredCountries = [...this.countries];
  }

  closeModal() {
    this.isModalOpen = false;
  }

  selectCountry(country: Country) {
    this.selectedCountry = country;
    this.countrySelected.emit(country);
    this.closeModal();
  }

  filterCountries() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredCountries = [...this.countries];
      return;
    }

    this.filteredCountries = this.countries.filter(country =>
      country.name.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term) ||
      country.dialCode.includes(term)
    );
  }
}
