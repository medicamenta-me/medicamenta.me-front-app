import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { PatientSelectorService } from './patient-selector.service';
import { LogService } from './log.service';

/**
 * Profile types available in the system
 * - patient: User is managing their own medications
 * - caregiver: User is managing medications for others they care for
 */
export type ProfileType = 'patient' | 'caregiver';

const STORAGE_KEY = 'medicamenta_profile_type';

/**
 * Service to manage the user's active profile type
 * Allows users to switch between managing their own medications (patient mode)
 * and managing medications for people they care for (caregiver mode)
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileTypeService {
  private readonly authService = inject(AuthService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly logService = inject(LogService);

  /**
   * Current active profile type
   */
  private readonly _activeProfileType = signal<ProfileType>('patient');
  public readonly activeProfileType = this._activeProfileType.asReadonly();

  /**
   * Whether caregiver mode is available for the current user
   * True if user has at least one person they care for
   */
  public readonly caregiverModeAvailable = computed<boolean>(() => {
    const availablePatients = this.patientSelectorService.availablePatients();
    // Caregiver mode available if there are patients besides self
    return availablePatients.filter(p => !p.isSelf).length > 0;
  });

  /**
   * Whether the user can switch profile types
   */
  public readonly canSwitchProfile = computed<boolean>(() => {
    return this.caregiverModeAvailable();
  });

  /**
   * Descriptive text for current profile type
   */
  public readonly profileDescription = computed<string>(() => {
    const type = this._activeProfileType();
    if (type === 'patient') {
      return 'Gerenciando seus próprios medicamentos';
    } else {
      return 'Gerenciando medicamentos de outras pessoas';
    }
  });

  constructor() {
    // Load saved profile type from localStorage
    effect(() => {
      const authUser = this.authService.currentUser();
      if (authUser) {
        const savedType = localStorage.getItem(STORAGE_KEY);
        if (savedType === 'patient' || savedType === 'caregiver') {
          // Only restore caregiver mode if it's available
          if (savedType === 'caregiver' && this.caregiverModeAvailable()) {
            this._activeProfileType.set(savedType);
          } else if (savedType === 'patient') {
            this._activeProfileType.set(savedType);
          }
        }
      } else {
        // Clear on logout
        this._activeProfileType.set('patient');
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    // Auto-switch active patient when profile type changes
    effect(() => {
      const profileType = this._activeProfileType();
      const authUser = this.authService.currentUser();
      const availablePatients = this.patientSelectorService.availablePatients();
      
      if (!authUser || availablePatients.length === 0) return;

      if (profileType === 'patient') {
        // Switch to self
        const self = availablePatients.find(p => p.isSelf);
        if (self) {
          this.patientSelectorService.setActivePatient(self.userId);
        }
      } else if (profileType === 'caregiver') {
        // Switch to first person they care for (not self)
        const firstDependent = availablePatients.find(p => !p.isSelf);
        if (firstDependent) {
          this.patientSelectorService.setActivePatient(firstDependent.userId);
        } else {
          // No dependents available, switch back to patient mode
          this._activeProfileType.set('patient');
        }
      }
    });

    // If active patient changes to self, switch to patient mode
    // If active patient changes to dependent, switch to caregiver mode
    effect(() => {
      const activePatient = this.patientSelectorService.activePatient();
      const currentProfileType = this._activeProfileType();
      
      if (activePatient) {
        if (activePatient.isSelf && currentProfileType === 'caregiver') {
          // User selected themselves while in caregiver mode, switch to patient mode
          this._activeProfileType.set('patient');
        } else if (!activePatient.isSelf && currentProfileType === 'patient') {
          // User selected a dependent while in patient mode, switch to caregiver mode
          this._activeProfileType.set('caregiver');
        }
      }
    });
  }

  /**
   * Switch to patient mode (managing own medications)
   */
  switchToPatient(): void {
    if (this.authService.currentUser()) {
      this._activeProfileType.set('patient');
      localStorage.setItem(STORAGE_KEY, 'patient');
    }
  }

  /**
   * Switch to caregiver mode (managing medications for others)
   */
  switchToCaregiver(): void {
    if (this.caregiverModeAvailable()) {
      this._activeProfileType.set('caregiver');
      localStorage.setItem(STORAGE_KEY, 'caregiver');
    } else {
      this.logService.warn('ProfileTypeService', 'Caregiver mode not available - no dependents to care for');
    }
  }

  /**
   * Toggle between patient and caregiver modes
   */
  toggleProfileType(): void {
    const current = this._activeProfileType();
    if (current === 'patient') {
      this.switchToCaregiver();
    } else {
      this.switchToPatient();
    }
  }

  /**
   * Set profile type directly
   */
  setProfileType(type: ProfileType): void {
    if (type === 'patient') {
      this.switchToPatient();
    } else if (type === 'caregiver') {
      this.switchToCaregiver();
    }
  }
}

