import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { AnalyticsService } from './analytics.service';
import { User } from '../models/user.model';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly analyticsService = inject(AnalyticsService, { optional: true });
  private readonly logService = inject(LogService, { optional: true });
  private readonly auth: Auth = this.firebaseService.auth;
  private readonly firestore: Firestore = this.firebaseService.firestore;

  public readonly currentUser = signal<FirebaseUser | null>(null);
  public readonly isLoggedIn$ = new BehaviorSubject<boolean>(false);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      this.isLoggedIn$.next(!!user);
      
      // Set analytics user ID when auth state changes
      if (user) {
        this.analyticsService?.setUserId(user.uid);
        this.logService?.debug('AuthService', 'Analytics user ID set', { userId: user.uid });
      } else {
        this.analyticsService?.setUserId(null);
        this.logService?.debug('AuthService', 'Analytics user ID cleared');
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error: any) {
      this.logService?.error('AuthService', 'Login error', error as Error);
      throw error;
    }
  }

  async signup(name: string, email: string, password: string, role: User['role']): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Create a user document in Firestore
      const newUser: Omit<User, 'id' | 'dependents'> = {
        name,
        email,
        role: role,
        avatarUrl: `https://picsum.photos/seed/${user.uid}/128/128`,
      };
      
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, { id: user.uid, ...newUser, dependents: []});
      
    } catch (error: any) {
      this.logService?.error('AuthService', 'Signup error', error as Error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: any) {
      this.logService?.error('AuthService', 'Logout error', error as Error);
      throw error;
    }
  }

  /**
   * Obtém o usuário atual de forma assíncrona
   * @returns Usuário Firebase ou null
   */
  async getCurrentUser(): Promise<FirebaseUser | null> {
    return this.currentUser();
  }

  /**
   * Obtém o UID do usuário atual
   * @returns UID ou null
   */
  getCurrentUserId(): string | null {
    return this.currentUser()?.uid || null;
  }
}
