import { Injectable, inject, signal } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';
import { TermsOfUse } from '../models/terms-of-use.model';
import { User, TermsAcceptance } from '../models/user.model';
import { TermsAcceptanceModalComponent } from '../components/terms-acceptance-modal/terms-acceptance-modal.component';
import { GeolocationService } from './geolocation.service';
import { UserService } from './user.service';
import { LogService } from './log.service';

/**
 * Terms of Use Service
 * Manages retrieval of terms of use documents from Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class TermsOfUseService {
  private firestore = inject(Firestore);
  private modalController = inject(ModalController);
  private geolocationService = inject(GeolocationService);
  private userService = inject(UserService);
  private readonly logService = inject(LogService);
  
  private termsCollection: CollectionReference<DocumentData>;

  // Signal to hold latest terms for current user's country
  latestTerms = signal<TermsOfUse | null>(null);
  
  // Flag to prevent multiple modal instances
  private isModalOpen = false;

  constructor() {
    this.termsCollection = collection(this.firestore, 'termsOfUse');
  }

  /**
   * Get the latest active terms for a specific country
   */
  async getLatestTermsForCountry(country: string): Promise<TermsOfUse | null> {
    try {
      const q = query(
        this.termsCollection,
        where('country', '==', country),
        where('isActive', '==', true),
        orderBy('effectiveDate', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        this.logService.warn('TermsOfUseService', 'No active terms found for country', { country });
        return null;
      }

      const docData = snapshot.docs[0].data();
      const terms: TermsOfUse = {
        id: snapshot.docs[0].id,
        version: docData['version'],
        country: docData['country'],
        effectiveDate: docData['effectiveDate']?.toDate() || new Date(),
        createdAt: docData['createdAt']?.toDate() || new Date(),
        text: docData['text'],
        summary: docData['summary'],
        language: docData['language'],
        isActive: docData['isActive']
      };

      this.latestTerms.set(terms);
      return terms;
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error fetching latest terms', error as Error);
      return null;
    }
  }

  /**
   * Get a specific version of terms by ID
   */
  async getTermsById(id: string): Promise<TermsOfUse | null> {
    try {
      const docRef = doc(this.termsCollection, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        this.logService.warn('TermsOfUseService', 'Terms not found', { termsId: id });
        return null;
      }

      const docData = docSnap.data();
      return {
        id: docSnap.id,
        version: docData['version'],
        country: docData['country'],
        effectiveDate: docData['effectiveDate']?.toDate() || new Date(),
        createdAt: docData['createdAt']?.toDate() || new Date(),
        text: docData['text'],
        summary: docData['summary'],
        language: docData['language'],
        isActive: docData['isActive']
      };
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error fetching terms by ID', error as Error);
      return null;
    }
  }

  /**
   * Get all versions of terms for a specific country
   */
  async getAllTermsForCountry(country: string): Promise<TermsOfUse[]> {
    try {
      const q = query(
        this.termsCollection,
        where('country', '==', country),
        orderBy('effectiveDate', 'desc')
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          version: docData['version'],
          country: docData['country'],
          effectiveDate: docData['effectiveDate']?.toDate() || new Date(),
          createdAt: docData['createdAt']?.toDate() || new Date(),
          text: docData['text'],
          summary: docData['summary'],
          language: docData['language'],
          isActive: docData['isActive']
        };
      });
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error fetching all terms', error as Error);
      return [];
    }
  }

  /**
   * Check if user needs to accept new terms
   * 
   * Returns true if:
   * 1. User has never accepted terms (termsAcceptance is empty/null)
   * 2. Latest terms version for user's country is newer than last accepted
   * 3. User changed country and hasn't accepted terms for new country
   * 
   * @param user Current user object
   * @param latestTerms Latest terms for user's country
   * @returns true if user needs to accept new terms
   */
  needsAcceptance(user: User | null, latestTerms: TermsOfUse | null): boolean {
    if (!user || !latestTerms) {
      return false;
    }

    // No terms acceptance history = needs to accept
    if (!user.termsAcceptance || user.termsAcceptance.length === 0) {
      this.logService.debug('TermsOfUseService', 'User has no terms acceptance history');
      return true;
    }

    // Find if user has accepted terms for current country
    const acceptedForCountry = user.termsAcceptance.filter(
      acceptance => acceptance.country === user.country
    );

    // No terms accepted for current country = needs to accept
    if (acceptedForCountry.length === 0) {
      this.logService.debug('TermsOfUseService', 'User has not accepted terms for country', { country: user.country });
      return true;
    }

    // Get most recent acceptance for current country
    const latestAcceptance = acceptedForCountry.sort((a, b) => {
      return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime();
    })[0];

    // Compare versions using simple string comparison or semantic versioning
    const needsUpdate = this.isNewerVersion(latestTerms.version, latestAcceptance.version);

    if (needsUpdate) {
      this.logService.info('TermsOfUseService', 'New terms version available', { 
        latestVersion: latestTerms.version, 
        userVersion: latestAcceptance.version 
      });
    }

    return needsUpdate;
  }

  /**
   * Compare version strings
   * Returns true if newVersion > oldVersion
   * 
   * Supports:
   * - Semantic versioning (1.0, 1.1, 2.0, etc.)
   * - Simple string comparison as fallback
   */
  private isNewerVersion(newVersion: string, oldVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const oldParts = oldVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, oldParts.length); i++) {
      const newPart = newParts[i] || 0;
      const oldPart = oldParts[i] || 0;

      if (newPart > oldPart) return true;
      if (newPart < oldPart) return false;
    }

    return false; // Versions are equal
  }

  /**
   * Show terms acceptance modal (blocking)
   * User MUST accept to dismiss
   * 
   * @param terms Terms to display
   * @returns Promise<boolean> true if accepted, false if somehow dismissed
   */
  async showTermsModal(terms: TermsOfUse): Promise<boolean> {
    // Prevent multiple modals
    if (this.isModalOpen) {
      this.logService.warn('TermsOfUseService', 'Modal already open, skipping');
      return false;
    }

    this.isModalOpen = true;

    try {
      const modal = await this.modalController.create({
        component: TermsAcceptanceModalComponent,
        backdropDismiss: false, // Cannot dismiss by clicking backdrop
        keyboardClose: false,    // Cannot dismiss by keyboard
        cssClass: 'terms-acceptance-modal',
        componentProps: {
          terms: terms
        }
      });

      await modal.present();

      const { data, role } = await modal.onDidDismiss();

      this.isModalOpen = false;

      // Check if user accepted
      if (role === 'accept' && data?.accepted) {
        this.logService.info('TermsOfUseService', 'User accepted terms', { termsId: terms.id });
        return true;
      }

      this.logService.warn('TermsOfUseService', 'Terms modal dismissed without acceptance');
      return false;
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error showing terms modal', error as Error);
      this.isModalOpen = false;
      return false;
    }
  }

  /**
   * Process terms acceptance:
   * 1. Get IP and geolocation
   * 2. Create acceptance record
   * 3. Update user document
   * 
   * @param user Current user
   * @param terms Accepted terms
   */
  async processAcceptance(user: User, terms: TermsOfUse): Promise<boolean> {
    try {
      this.logService.debug('TermsOfUseService', 'Processing terms acceptance...');

      // Get IP and geolocation data
      const { ip, geolocation } = await this.geolocationService.getAcceptanceData().toPromise() || 
                                   { ip: null, geolocation: null };

      // Create acceptance record
      const acceptance: TermsAcceptance = {
        termsId: terms.id || `${terms.country}_${terms.version}`,
        version: terms.version,
        country: terms.country,
        acceptedAt: new Date(),
        ipAddress: ip || undefined,
        geolocation: geolocation || undefined
      };

      // Add to user's acceptance history
      const updatedAcceptance = [
        ...(user.termsAcceptance || []),
        acceptance
      ];

      // Update user document
      await this.userService.updateUser({
        termsAcceptance: updatedAcceptance
      });

      this.logService.info('TermsOfUseService', 'Terms acceptance processed successfully');
      this.logService.debug('TermsOfUseService', 'Acceptance IP', { ip: ip || 'unavailable' });
      this.logService.debug('TermsOfUseService', 'Acceptance geolocation', { geo: this.geolocationService.formatCoordinates(geolocation) });

      return true;
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error processing acceptance', error as Error);
      return false;
    }
  }

  /**
   * Check and handle terms acceptance for a user
   * Call this after login or when app opens
   * 
   * @param user Current user
   * @returns Promise<boolean> true if terms are up to date (accepted or not needed)
   */
  async checkAndHandleTerms(user: User | null): Promise<boolean> {
    if (!user || !user.country) {
      this.logService.debug('TermsOfUseService', 'No user or country, skipping terms check');
      return true;
    }

    try {
      // Get latest terms for user's country
      const latestTerms = await this.getLatestTermsForCountry(user.country);

      if (!latestTerms) {
        this.logService.warn('TermsOfUseService', 'No terms found for country', { country: user.country });
        return true; // No terms available, allow access
      }

      // Check if user needs to accept
      const needsAcceptance = this.needsAcceptance(user, latestTerms);

      if (!needsAcceptance) {
        this.logService.debug('TermsOfUseService', 'Terms are up to date');
        return true;
      }

      // Show modal and wait for acceptance
      this.logService.debug('TermsOfUseService', 'Showing terms acceptance modal...');
      const accepted = await this.showTermsModal(latestTerms);

      if (!accepted) {
        this.logService.error('TermsOfUseService', 'Terms not accepted', new Error('User did not accept required terms'));
        return false;
      }

      // Process acceptance (save to Firestore)
      const processed = await this.processAcceptance(user, latestTerms);

      return processed;
    } catch (error: any) {
      this.logService.error('TermsOfUseService', 'Error in checkAndHandleTerms', error as Error);
      return false;
    }
  }
}

