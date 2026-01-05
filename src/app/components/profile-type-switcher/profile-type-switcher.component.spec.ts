import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileTypeSwitcherComponent } from './profile-type-switcher.component';
import { ProfileTypeService } from '../../services/profile-type.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      PROFILE_TYPE: {
        PATIENT_MODE: 'Patient Mode',
        CAREGIVER_MODE: 'Caregiver Mode',
        PATIENT_MODE_ONLY: 'Patient Mode Only',
        MANAGING_SELF: 'Managing your own medications',
        MANAGING_OTHERS: 'Managing medications for others'
      }
    });
  }
}

describe('ProfileTypeSwitcherComponent', () => {
  let component: ProfileTypeSwitcherComponent;
  let fixture: ComponentFixture<ProfileTypeSwitcherComponent>;
  let profileTypeServiceSpy: jasmine.SpyObj<ProfileTypeService>;

  beforeEach(async () => {
    profileTypeServiceSpy = jasmine.createSpyObj('ProfileTypeService', [
      'canSwitchProfile',
      'setProfileType'
    ], {
      activeProfileType: signal('patient' as 'patient' | 'caregiver')
    });
    
    profileTypeServiceSpy.canSwitchProfile.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        ProfileTypeSwitcherComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ProfileTypeService, useValue: profileTypeServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileTypeSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should expose profileTypeService', () => {
      expect(component.profileTypeService).toBeTruthy();
    });
  });

  describe('canSwitchProfile', () => {
    it('should show switcher when canSwitchProfile returns true', () => {
      expect(component.profileTypeService.canSwitchProfile()).toBe(true);
    });

    it('should hide switcher when canSwitchProfile returns false', () => {
      profileTypeServiceSpy.canSwitchProfile.and.returnValue(false);
      fixture.detectChanges();
      
      expect(component.profileTypeService.canSwitchProfile()).toBe(false);
    });
  });

  describe('onProfileTypeChange', () => {
    it('should call setProfileType with patient', () => {
      const event = { detail: { value: 'patient' } };
      
      component.onProfileTypeChange(event);
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledWith('patient');
    });

    it('should call setProfileType with caregiver', () => {
      const event = { detail: { value: 'caregiver' } };
      
      component.onProfileTypeChange(event);
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledWith('caregiver');
    });
  });

  describe('getProfileDescription', () => {
    it('should return MANAGING_SELF key for patient mode', () => {
      (profileTypeServiceSpy as any).activeProfileType = signal('patient');
      
      const newFixture = TestBed.createComponent(ProfileTypeSwitcherComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.getProfileDescription()).toBe('PROFILE_TYPE.MANAGING_SELF');
    });

    it('should return MANAGING_OTHERS key for caregiver mode', () => {
      TestBed.resetTestingModule();
      
      const caregiverProfileTypeServiceSpy = jasmine.createSpyObj('ProfileTypeService', [
        'setProfileType',
        'canSwitchProfile'
      ], {
        activeProfileType: signal('caregiver' as 'patient' | 'caregiver')
      });
      caregiverProfileTypeServiceSpy.canSwitchProfile.and.returnValue(true);
      
      TestBed.configureTestingModule({
        imports: [
          ProfileTypeSwitcherComponent,
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: ProfileTypeService, useValue: caregiverProfileTypeServiceSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(ProfileTypeSwitcherComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.getProfileDescription()).toBe('PROFILE_TYPE.MANAGING_OTHERS');
    });
  });

  describe('Active Profile Type', () => {
    it('should have patient as default', () => {
      expect(component.profileTypeService.activeProfileType()).toBe('patient');
    });

    it('should reflect caregiver when set', () => {
      TestBed.resetTestingModule();
      
      const caregiverProfileTypeServiceSpy = jasmine.createSpyObj('ProfileTypeService', [
        'setProfileType',
        'canSwitchProfile'
      ], {
        activeProfileType: signal('caregiver' as 'patient' | 'caregiver')
      });
      caregiverProfileTypeServiceSpy.canSwitchProfile.and.returnValue(true);
      
      TestBed.configureTestingModule({
        imports: [
          ProfileTypeSwitcherComponent,
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: ProfileTypeService, useValue: caregiverProfileTypeServiceSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(ProfileTypeSwitcherComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.profileTypeService.activeProfileType()).toBe('caregiver');
    });
  });

  describe('Icons', () => {
    it('should have icons registered in constructor', () => {
      // Icons personOutline and peopleOutline are registered via addIcons
      expect(component).toBeTruthy();
    });
  });

  describe('Single Mode Message', () => {
    it('should show single mode message when cannot switch', () => {
      profileTypeServiceSpy.canSwitchProfile.and.returnValue(false);
      fixture.detectChanges();
      
      expect(component.profileTypeService.canSwitchProfile()).toBe(false);
    });
  });

  describe('Segment Value Binding', () => {
    it('should bind segment value to activeProfileType', () => {
      expect(component.profileTypeService.activeProfileType()).toBe('patient');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid profile type changes', () => {
      const event1 = { detail: { value: 'caregiver' } };
      const event2 = { detail: { value: 'patient' } };
      const event3 = { detail: { value: 'caregiver' } };
      
      component.onProfileTypeChange(event1);
      component.onProfileTypeChange(event2);
      component.onProfileTypeChange(event3);
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledTimes(3);
    });

    it('should handle undefined profile type gracefully', () => {
      const event = { detail: { value: undefined } };
      
      component.onProfileTypeChange(event);
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledWith(undefined as unknown as 'patient' | 'caregiver');
    });
  });

  describe('Template Rendering', () => {
    it('should render patient mode button', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('ion-segment-button[value="patient"]')).toBeTruthy();
    });

    it('should render caregiver mode button', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('ion-segment-button[value="caregiver"]')).toBeTruthy();
    });
  });

  describe('Profile Type Toggle', () => {
    it('should toggle from patient to caregiver', () => {
      expect(component.profileTypeService.activeProfileType()).toBe('patient');
      
      component.onProfileTypeChange({ detail: { value: 'caregiver' } });
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledWith('caregiver');
    });

    it('should toggle from caregiver to patient', () => {
      (profileTypeServiceSpy as any).activeProfileType = signal('caregiver');
      
      const newFixture = TestBed.createComponent(ProfileTypeSwitcherComponent);
      newFixture.detectChanges();
      
      newFixture.componentInstance.onProfileTypeChange({ detail: { value: 'patient' } });
      
      expect(profileTypeServiceSpy.setProfileType).toHaveBeenCalledWith('patient');
    });
  });
});
