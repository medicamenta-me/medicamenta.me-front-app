import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountrySelectorComponent, Country } from './country-selector.component';
import { TranslateModule } from '@ngx-translate/core';
import { provideIonicAngular } from '@ionic/angular/standalone';

describe('CountrySelectorComponent', () => {
  let component: CountrySelectorComponent;
  let fixture: ComponentFixture<CountrySelectorComponent>;

  const mockCountries: Country[] = [
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
    { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
    { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CountrySelectorComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideIonicAngular()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CountrySelectorComponent);
    component = fixture.componentInstance;
    component.countries = [...mockCountries];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should have empty countries array by default', () => {
      const newComponent = TestBed.createComponent(CountrySelectorComponent).componentInstance;
      expect(newComponent.countries).toEqual([]);
    });

    it('should have null selectedCountry by default', () => {
      const newComponent = TestBed.createComponent(CountrySelectorComponent).componentInstance;
      expect(newComponent.selectedCountry).toBeNull();
    });

    it('should have modal closed by default', () => {
      expect(component.isModalOpen).toBeFalse();
    });

    it('should have empty search term by default', () => {
      expect(component.searchTerm).toBe('');
    });

    it('should initialize filteredCountries on ngOnInit', () => {
      expect(component.filteredCountries.length).toBe(mockCountries.length);
    });
  });

  describe('openModal', () => {
    it('should set isModalOpen to true', () => {
      component.openModal();
      expect(component.isModalOpen).toBeTrue();
    });

    it('should reset search term', () => {
      component.searchTerm = 'test';
      component.openModal();
      expect(component.searchTerm).toBe('');
    });

    it('should reset filtered countries to all countries', () => {
      component.filteredCountries = [];
      component.openModal();
      expect(component.filteredCountries.length).toBe(mockCountries.length);
    });
  });

  describe('closeModal', () => {
    it('should set isModalOpen to false', () => {
      component.isModalOpen = true;
      component.closeModal();
      expect(component.isModalOpen).toBeFalse();
    });
  });

  describe('selectCountry', () => {
    it('should set selectedCountry', () => {
      const country = mockCountries[0];
      component.selectCountry(country);
      expect(component.selectedCountry).toBe(country);
    });

    it('should emit countrySelected event', () => {
      const country = mockCountries[0];
      let emittedCountry: Country | undefined;
      component.countrySelected.subscribe(c => emittedCountry = c);
      
      component.selectCountry(country);
      expect(emittedCountry).toEqual(country);
    });

    it('should close modal after selection', () => {
      component.isModalOpen = true;
      component.selectCountry(mockCountries[0]);
      expect(component.isModalOpen).toBeFalse();
    });
  });

  describe('filterCountries', () => {
    beforeEach(() => {
      component.openModal(); // Reset filteredCountries
    });

    it('should filter by country name', () => {
      component.searchTerm = 'Brazil';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('BR');
    });

    it('should filter by country name case insensitive', () => {
      component.searchTerm = 'brazil';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('BR');
    });

    it('should filter by country code', () => {
      component.searchTerm = 'US';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('US');
    });

    it('should filter by country code case insensitive', () => {
      component.searchTerm = 'us';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('US');
    });

    it('should filter by dial code', () => {
      component.searchTerm = '+55';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('BR');
    });

    it('should return all countries when search term is empty', () => {
      component.searchTerm = '';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(mockCountries.length);
    });

    it('should return all countries when search term is only whitespace', () => {
      component.searchTerm = '   ';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(mockCountries.length);
    });

    it('should return empty array when no match found', () => {
      component.searchTerm = 'xyz123';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(0);
    });

    it('should filter by partial name match', () => {
      component.searchTerm = 'port';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(1);
      expect(component.filteredCountries[0].code).toBe('PT');
    });

    it('should handle multiple results', () => {
      // Both France and Germany have 'an' in their names
      component.searchTerm = 'an';
      component.filterCountries();
      
      expect(component.filteredCountries.length).toBe(2);
      const codes = component.filteredCountries.map(c => c.code);
      expect(codes).toContain('DE'); // Germany
      expect(codes).toContain('FR'); // France
    });
  });

  describe('inputs', () => {
    it('should accept countries input', () => {
      const newCountries = [mockCountries[0]];
      component.countries = newCountries;
      expect(component.countries).toBe(newCountries);
    });

    it('should accept selectedCountry input', () => {
      const country = mockCountries[0];
      component.selectedCountry = country;
      expect(component.selectedCountry).toBe(country);
    });
  });

  describe('outputs', () => {
    it('should emit country on selection', (done) => {
      const country = mockCountries[0];
      
      component.countrySelected.subscribe(emitted => {
        expect(emitted).toBe(country);
        done();
      });
      
      component.selectCountry(country);
    });
  });

  describe('edge cases', () => {
    it('should handle empty countries array', () => {
      component.countries = [];
      component.ngOnInit();
      
      expect(component.filteredCountries).toEqual([]);
    });

    it('should handle filter with special characters', () => {
      component.searchTerm = '+';
      component.filterCountries();
      
      // All countries have dial codes with + prefix
      expect(component.filteredCountries.length).toBe(mockCountries.length);
    });

    it('should handle selecting same country twice', () => {
      const country = mockCountries[0];
      let emitCount = 0;
      
      component.countrySelected.subscribe(() => emitCount++);
      
      component.selectCountry(country);
      component.selectCountry(country);
      
      expect(emitCount).toBe(2);
      expect(component.selectedCountry).toBe(country);
    });

    it('should maintain country reference on selection', () => {
      const country = mockCountries[2];
      component.selectCountry(country);
      
      expect(component.selectedCountry?.code).toBe('PT');
      expect(component.selectedCountry?.name).toBe('Portugal');
    });
  });

  describe('modal state', () => {
    it('should toggle modal state', () => {
      expect(component.isModalOpen).toBeFalse();
      
      component.openModal();
      expect(component.isModalOpen).toBeTrue();
      
      component.closeModal();
      expect(component.isModalOpen).toBeFalse();
    });

    it('should maintain search term when modal is open', () => {
      component.openModal();
      component.searchTerm = 'test';
      
      expect(component.searchTerm).toBe('test');
    });

    it('should clear search on reopening modal', () => {
      component.openModal();
      component.searchTerm = 'test';
      component.closeModal();
      component.openModal();
      
      expect(component.searchTerm).toBe('');
    });
  });
});
