import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { User, Dependent } from '../models/user.model';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { IndexedDBService } from './indexed-db.service';
import { OfflineSyncService } from './offline-sync.service';
import { LogService } from './log.service';
import { doc, Firestore, onSnapshot, Unsubscribe, updateDoc, arrayUnion, arrayRemove, getDoc, collection, setDoc, deleteField } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly logService = inject(LogService, { optional: true });
  private readonly firestore: Firestore;

  private readonly _currentUser = signal<User | null>(null);
  private userSubscription: Unsubscribe | null = null;
  
  public readonly currentUser = this._currentUser.asReadonly();
  
  // A computed signal that returns the current user and their dependents as a list of "patients"
  public readonly patients = computed(() => {
      const user = this._currentUser();
      if (!user) return [];
      const self = { id: user.id, name: user.name, relationship: 'Self', avatarUrl: user.avatarUrl };
      const dependentsAsPatients = user.dependents.map(d => ({ id: d.id, name: d.name, relationship: d.relationship, avatarUrl: d.avatarUrl }));
      return [self, ...dependentsAsPatients];
  });

  constructor() {
    this.firestore = this.firebaseService.firestore;

    effect((onCleanup) => {
        const user = this.authService.currentUser();
        const isOnline = this.offlineSync.isOnline();
        this.logService?.debug('UserService', 'Auth user changed', { uid: user?.uid, isOnline });
        this.cleanupSubscription();

        if (user) {
            // Load from cache first
            this.loadFromCache(user.uid);

            if (isOnline) {
                const userDocRef = doc(this.firestore, `users/${user.uid}`);
                this.logService?.debug('UserService', 'Setting up snapshot listener for user', { uid: user.uid });
                this.userSubscription = onSnapshot(userDocRef, async (docSnap) => {
                    this.logService?.debug('UserService', 'Snapshot received', { exists: docSnap.exists() });
                    if (docSnap.exists()) {
                        const userData = docSnap.data() as User;
                        userData.lastSync = new Date();
                        this.logService?.debug('UserService', 'User data loaded', { uid: userData.id });
                        this._currentUser.set(userData);
                        
                        // Update analytics user properties
                        this.updateAnalyticsUserProperties(userData);
                        
                        // Cache user data
                        await this.cacheToIndexedDB(userData);
                    } else {
                        this.logService?.warn('UserService', 'User document does not exist');
                        this._currentUser.set(null);
                    }
                }, (error) => {
                    this.logService?.error('UserService', 'Snapshot error', error);
                    // Fallback to cache on error
                    this.loadFromCache(user.uid);
                });
            } else {
                this.logService?.debug('UserService', 'Offline mode - using cached user data');
            }
        } else {
            this.logService?.debug('UserService', 'No auth user, clearing current user');
            this._currentUser.set(null);
        }

        onCleanup(() => this.cleanupSubscription());
    });
  }

  private cleanupSubscription() {
      if (this.userSubscription) {
          this.userSubscription();
          this.userSubscription = null;
      }
  }

  /**
   * Load user from IndexedDB cache
   */
  private async loadFromCache(userId: string): Promise<void> {
    try {
      const cachedUser = await this.indexedDB.get<User>('users', userId);
      if (cachedUser) {
        this.logService?.debug('UserService', 'Loaded user from cache');
        this._currentUser.set(cachedUser);
      }
    } catch (error: any) {
      this.logService?.error('UserService', 'Failed to load from cache', error);
    }
  }

  /**
   * Cache user to IndexedDB
   */
  private async cacheToIndexedDB(user: User): Promise<void> {
    try {
      await this.indexedDB.put('users', user);
      this.logService?.debug('UserService', 'Cached user to IndexedDB');
    } catch (error: any) {
      this.logService?.error('UserService', 'Failed to cache to IndexedDB', error);
    }
  }

  async updateUser(profileData: Partial<User>) {
    const user = this.authService.currentUser();
    if (!user) throw new Error("No user logged in");
    
    const isOnline = this.offlineSync.isOnline();
    
    if (isOnline) {
      // Online: Update Firestore
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDocRef, profileData);
    } else {
      // Offline: Update cache and queue
      const cachedUser = await this.indexedDB.get<User>('users', user.uid);
      if (cachedUser) {
        const updatedUser = { ...cachedUser, ...profileData, lastSync: new Date() };
        await this.indexedDB.put('users', updatedUser);
        this._currentUser.set(updatedUser);
      }
      
      // Queue for sync
      this.offlineSync.queueOperation(
        'update',
        'users',
        user.uid,
        profileData,
        'normal'
      );
      
      this.logService?.debug('UserService', 'User update queued for sync');
    }
  }

  /**
   * Create or update user document
   * Use this for onboarding when document may not exist yet
   */
  async createOrUpdateUser(profileData: Partial<User>) {
    const authUser = this.authService.currentUser();
    if (!authUser) throw new Error("No user logged in");
    
    const userDocRef = doc(this.firestore, 'users', authUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    // Convert undefined values to deleteField() for Firestore
    const cleanedData: any = {};
    for (const key of Object.keys(profileData)) {
      const value = (profileData as any)[key];
      if (value === undefined) {
        cleanedData[key] = deleteField();
      } else {
        cleanedData[key] = value;
      }
    }
    
    if (userDoc.exists()) {
      // Document exists, update it
      await updateDoc(userDocRef, cleanedData);
    } else {
      // Document doesn't exist, create it with basic info
      // For new documents, remove undefined fields entirely
      const dataForCreate: any = {};
      for (const key of Object.keys(profileData)) {
        const value = (profileData as any)[key];
        if (value !== undefined) {
          dataForCreate[key] = value;
        }
      }
      
      const newUser = {
        id: authUser.uid,
        email: authUser.email || '',
        name: authUser.displayName || '',
        role: 'Patient' as const,
        avatarUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/128/128`,
        dependents: [],
        ...dataForCreate
      };
      await setDoc(userDocRef, newUser);
    }
  }
  
  async addDependent(dependentData: Omit<Dependent, 'id'>) {
      const user = this.authService.currentUser();
      if (!user) throw new Error("No user logged in");
      const userDocRef = doc(this.firestore, 'users', user.uid);
      
      const newDependent: Dependent = {
          id: doc(collection(this.firestore, 'dummy_collection')).id, // Generate a unique ID
          ...dependentData
      };
      
      await updateDoc(userDocRef, {
          dependents: arrayUnion(newDependent)
      });
  }

  async updateDependent(updatedDependent: Dependent) {
    const user = this.authService.currentUser();
    if (!user) throw new Error("No user logged in");

    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) throw new Error("User document not found");

    const currentUserData = userDoc.data() as User;
    const dependents = currentUserData.dependents.map(d =>
      d.id === updatedDependent.id ? updatedDependent : d
    );
    
    await updateDoc(userDocRef, { dependents });
  }

  async deleteDependent(dependentId: string) {
    const user = this.authService.currentUser();
    if (!user) throw new Error("No user logged in");
    
    const userDocRef = doc(this.firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) throw new Error("User document not found");

    const currentUserData = userDoc.data() as User;
    const dependentToDelete = currentUserData.dependents.find(d => d.id === dependentId);

    if (dependentToDelete) {
        await updateDoc(userDocRef, {
            dependents: arrayRemove(dependentToDelete)
        });
    }
  }
  
  /**
   * Update Firebase Analytics user properties
   * Called when user data is loaded or updated
   */
  private updateAnalyticsUserProperties(user: User): void {
    const properties: Record<string, string> = {
      role: user.role,
    };
    
    // Add optional properties if they exist
    if (user.country) {
      properties['country'] = user.country;
    }
    
    if (user.dependents && user.dependents.length > 0) {
      properties['has_dependents'] = 'true';
      properties['dependent_count'] = user.dependents.length.toString();
    }
    
    this.analyticsService.setUserProperties(properties);
    this.logService?.debug('UserService', 'Analytics user properties updated', { properties });
  }
}

