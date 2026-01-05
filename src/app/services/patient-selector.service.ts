import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { CareNetworkService } from './care-network.service';
import { LogService } from './log.service';

/**
 * Represents a patient that can be selected for medication management
 */
export interface SelectablePatient {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  relationship?: string;
  isSelf: boolean; // true if this is the logged-in user
  canRegister: boolean; // always true for self, comes from permissions for care network
}

@Injectable({
  providedIn: 'root'
})
export class PatientSelectorService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly careNetworkService = inject(CareNetworkService);
  private readonly logService = inject(LogService, { optional: true });

  /**
   * Currently selected patient ID
   */
  private readonly _activePatientId = signal<string>('');
  public readonly activePatientId = this._activePatientId.asReadonly();

  /**
   * List of all patients that the current user can manage medications for
   * Includes: self + people they care for with canRegister permission
   */
  public readonly availablePatients = computed<SelectablePatient[]>(() => {
    const authUser = this.authService.currentUser();
    const userData = this.userService.currentUser();
    if (!authUser) return [];

    const patients: SelectablePatient[] = [];

    // 1. Always add self as first patient
    // Use userData.name from Firestore (not authUser.displayName from Firebase Auth)
    patients.push({
      userId: authUser.uid,
      name: userData?.name || 'Você',
      email: authUser.email || '',
      avatarUrl: userData?.avatarUrl || authUser.photoURL || 'https://ionicframework.com/docs/img/demos/avatar.svg',
      relationship: undefined,
      isSelf: true,
      canRegister: true
    });

    // 2. Add people the user cares for (with canRegister permission)
    const iCareFor = this.careNetworkService.iCareFor();
    const patientsWithPermission = iCareFor.filter(person => 
      person.isRegisteredUser && person.status === 'active'
    );

    for (const person of patientsWithPermission) {
      patients.push({
        userId: person.userId,
        name: person.name,
        email: person.email,
        avatarUrl: person.avatarUrl,
        relationship: person.relationship,
        isSelf: false,
        canRegister: true // They gave permission when accepting the invite
      });
    }

    return patients;
  });

  /**
   * Currently selected patient object
   */
  public readonly activePatient = computed<SelectablePatient | null>(() => {
    const patientId = this._activePatientId();
    const patients = this.availablePatients();
    return patients.find(p => p.userId === patientId) || null;
  });

  constructor() {
    // Auto-select self when user logs in
    effect(() => {
      const authUser = this.authService.currentUser();
      const currentActiveId = this._activePatientId();
      
      if (authUser && !currentActiveId) {
        // Set self as default active patient
        this._activePatientId.set(authUser.uid);
      } else if (!authUser) {
        // Clear selection when user logs out
        this._activePatientId.set('');
      }
    });

    // Verify active patient is still in available list
    effect(() => {
      const patients = this.availablePatients();
      const currentActiveId = this._activePatientId();
      
      if (currentActiveId && patients.length > 0) {
        const stillAvailable = patients.some(p => p.userId === currentActiveId);
        if (!stillAvailable) {
          // Active patient no longer available, default to self
          const self = patients.find(p => p.isSelf);
          if (self) {
            this._activePatientId.set(self.userId);
          }
        }
      }
    });
  }

  /**
   * Set the active patient
   */
  setActivePatient(userId: string): void {
    const patients = this.availablePatients();
    const patient = patients.find(p => p.userId === userId);
    
    if (patient) {
      this._activePatientId.set(userId);
    } else {
      this.logService?.error('PatientSelectorService', 'Patient not found or not available: ' + userId);
    }
  }

  /**
   * Reset to self (logged-in user)
   */
  resetToSelf(): void {
    const authUser = this.authService.currentUser();
    if (authUser) {
      this._activePatientId.set(authUser.uid);
    }
  }
}

