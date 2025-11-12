import { Injectable, inject, computed } from '@angular/core';
import { Firestore } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { CareNetworkService } from './care-network.service';
import { PatientSelectorService } from './patient-selector.service';
import { FirebaseService } from './firebase.service';
import { CarePermissions } from '../models/user.model';

/**
 * Permission Service
 * Centralizes all permission logic for care network access control
 * 
 * Permission Rules:
 * - view: Always true (mandatory base permission)
 * - register: Can create and edit medications
 * - administer: Can mark medications as taken/missed
 * 
 * Dependencies:
 * - register and administer both require view
 * - register and administer are independent of each other
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);
  private careNetworkService = inject(CareNetworkService);
  private patientSelectorService = inject(PatientSelectorService);
  private firebaseService = inject(FirebaseService);
  private firestore: Firestore;

  constructor() {
    this.firestore = this.firebaseService.firestore;
  }

  /**
   * Current user's permissions for active patient (computed signal)
   */
  activePatientPermissions = computed<CarePermissions | null>(() => {
    const currentUserId = this.authService.currentUser()?.uid;
    const activePatientId = this.patientSelectorService.activePatientId();

    if (!currentUserId || !activePatientId) {
      return null;
    }

    // If viewing own profile, full permissions
    if (currentUserId === activePatientId) {
      return {
        view: true,
        register: true,
        administer: true
      };
    }

    // If viewing someone else, check care network permissions
    const careFor = this.careNetworkService.iCareFor();
    const patient = careFor.find(p => p.userId === activePatientId);

    if (!patient) {
      // No relationship = no access
      return {
        view: false,
        register: false,
        administer: false
      };
    }

    // Patient is in care network - check if they granted permissions
    return this.getPermissionsForPatient(currentUserId, activePatientId);
  });

  /**
   * Get permissions that a specific user has for a specific patient
   * @param userId The user (caregiver) ID
   * @param patientId The patient ID
   * @returns Permission flags
   */
  getPermissionsForPatient(userId: string, patientId: string): CarePermissions {
    // Same user = full access
    if (userId === patientId) {
      return { view: true, register: true, administer: true };
    }

    // Check if we're the patient and looking at what this user can do
    const currentUserId = this.authService.currentUser()?.uid;
    if (currentUserId === patientId) {
      // We're the patient, check whoCareForMe
      const whoCareForMe = this.careNetworkService.whoCareForMe();
      const carer = whoCareForMe.find(c => c.userId === userId);
      return carer?.permissions || { view: false, register: false, administer: false };
    }

    // Check if userId is in patient's care network (we're viewing as caregiver)
    const careFor = this.careNetworkService.iCareFor();
    const patient = careFor.find(p => p.userId === patientId);

    if (!patient) {
      return { view: false, register: false, administer: false };
    }

    // Default permissions when viewing as caregiver
    // In a real scenario, we'd need to fetch patient's whoCareForMe
    // But since we're viewing as caregiver, trust the relationship exists
    return { view: true, register: false, administer: false };
  }

  /**
   * Check if current user can view active patient's data
   */
  canView(): boolean {
    return this.activePatientPermissions()?.view ?? false;
  }

  /**
   * Check if current user can register (create/edit) medications for active patient
   */
  canRegister(): boolean {
    const perms = this.activePatientPermissions();
    return perms ? (perms.view && perms.register) : false;
  }

  /**
   * Check if current user can administer (mark taken/missed) medications for active patient
   */
  canAdminister(): boolean {
    const perms = this.activePatientPermissions();
    return perms ? (perms.view && perms.administer) : false;
  }

  /**
   * Check if a specific user has view permission for a specific patient
   */
  userCanView(userId: string, patientId: string): boolean {
    return this.getPermissionsForPatient(userId, patientId).view;
  }

  /**
   * Check if a specific user has register permission for a specific patient
   */
  userCanRegister(userId: string, patientId: string): boolean {
    const perms = this.getPermissionsForPatient(userId, patientId);
    return perms.view && perms.register;
  }

  /**
   * Check if a specific user has administer permission for a specific patient
   */
  userCanAdminister(userId: string, patientId: string): boolean {
    const perms = this.getPermissionsForPatient(userId, patientId);
    return perms.view && perms.administer;
  }

  /**
   * Get default permissions for new care network invites
   */
  getDefaultPermissions(): CarePermissions {
    return {
      view: true,        // Always granted
      register: false,   // Opt-in
      administer: false  // Opt-in
    };
  }

  /**
   * Validate permissions (ensures view is always true if others are true)
   */
  validatePermissions(permissions: CarePermissions): CarePermissions {
    return {
      view: true, // Always true
      register: permissions.view ? permissions.register : false,
      administer: permissions.view ? permissions.administer : false
    };
  }
}

