import { Injectable, inject, signal, effect } from '@angular/core';
import { 
  Firestore,
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { CareForUser, CarerUser, CareInvite, CarePermissions } from '../models/user.model';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class CareNetworkService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);
  private readonly logService = inject(LogService);
  private readonly firestore: Firestore;

  // Signals for care network data
  iCareFor = signal<CareForUser[]>([]);
  whoCareForMe = signal<CarerUser[]>([]);
  pendingInvites = signal<CareInvite[]>([]);
  
  /**
   * Signal to indicate when permissions are synced and ready
   * Other services should wait for this before accessing Firestore
   */
  permissionsSynced = signal<boolean>(false);

  constructor() {
    this.firestore = this.firebaseService.firestore;

    // Load care network when user logs in
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.logService.debug('CareNetworkService', 'User logged in, starting permission sync', { userId: user.uid });
        
        // Reset permissions synced flag
        this.permissionsSynced.set(false);
        
        // CRITICAL: Sync helper arrays FIRST before any listeners start
        this.syncCarerIdsArray().then(() => {
          this.logService.debug('CareNetworkService', '✅ Permissions synced, enabling Firestore access');
          // Mark permissions as synced BEFORE loading data
          this.permissionsSynced.set(true);
          
          this.loadCareNetwork();
          this.loadPendingInvites();
          // Sync names to fix any users with email instead of name
          this.syncCareNetworkNames();
        }).catch(error => {
          this.logService.error('CareNetworkService', '❌ Failed to sync permissions', error as Error);
          // Even if sync fails, allow app to continue
          this.permissionsSynced.set(true);
        });
      } else {
        this.logService.debug('CareNetworkService', 'User logged out, clearing care network data');
        this.iCareFor.set([]);
        this.whoCareForMe.set([]);
        this.pendingInvites.set([]);
        this.permissionsSynced.set(false);
      }
    });
  }

  /**
   * Load care network for current user
   */
  async loadCareNetwork() {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
      const userData = userDoc.data();

      if (userData) {
        this.iCareFor.set(userData['iCareFor'] || []);
        this.whoCareForMe.set(userData['whoCareForMe'] || []);
      }
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error loading care network', error as Error);
    }
  }

  /**
   * Load pending invites for current user
   */
  async loadPendingInvites() {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const invitesRef = collection(this.firestore, 'careInvites');
      const q = query(
        invitesRef,
        where('toUserId', '==', user.uid),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invites: CareInvite[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data()['createdAt']?.toDate(),
        respondedAt: docSnap.data()['respondedAt']?.toDate()
      } as CareInvite));

      this.pendingInvites.set(invites);
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error loading pending invites', error as Error);
    }
  }

  /**
   * Search for user by email
   */
  async searchUserByEmail(email: string): Promise<{id: string, name: string, email: string, avatarUrl: string, phone?: string, country?: string} | null> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      return {
        id: userDoc.id,
        name: userData['name'],
        email: userData['email'],
        avatarUrl: userData['avatarUrl'] || 'https://ionicframework.com/docs/img/demos/avatar.svg',
        phone: userData['phone'],
        country: userData['country']
      };
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error searching user', error as Error);
      return null;
    }
  }

  /**
   * Add user to care for (I care for them)
   * If user doesn't exist, create as contact only
   */
  async addCareForUser(email: string, name: string, relationship?: string): Promise<{success: boolean, needsInvite: boolean, message: string}> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return {success: false, needsInvite: false, message: 'User not authenticated'};
    }

    try {
      // Validate: Cannot add yourself
      if (email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) {
        return {
          success: false,
          needsInvite: false,
          message: 'Cannot add yourself as dependent'
        };
      }

      // Validate: Check if already added
      const existingCareFor = this.iCareFor();
      const alreadyExists = existingCareFor.some(person => 
        person.email.toLowerCase().trim() === email.toLowerCase().trim()
      );

      if (alreadyExists) {
        return {
          success: false,
          needsInvite: false,
          message: 'User already added to care list'
        };
      }

      // Search if user exists
      const targetUser = await this.searchUserByEmail(email);

      if (targetUser) {
        // Validate: Cannot add yourself (double check with userId)
        if (targetUser.id === currentUser.uid) {
          return {
            success: false,
            needsInvite: false,
            message: 'Cannot add yourself as dependent'
          };
        }

        // Get current user data to include phone and name
        const currentUserRef = doc(this.firestore, 'users', currentUser.uid);
        const currentUserData = (await getDoc(currentUserRef)).data();

        // User exists - send invite
        const inviteId = `${currentUser.uid}_${targetUser.id}_${Date.now()}`;
        const invite: CareInvite = {
          id: inviteId,
          fromUserId: currentUser.uid,
          fromUserName: currentUserData?.['name'] || currentUser.displayName || currentUser.email || 'User',
          fromUserEmail: currentUser.email || '',
          fromUserPhone: currentUserData?.['phone'],
          fromUserCountry: currentUserData?.['country'],
          toUserId: targetUser.id,
          toUserEmail: targetUser.email,
          type: 'care-for',
          permissions: {
            view: true,
            register: true,
            administer: true
          },
          status: 'pending',
          createdAt: Timestamp.now().toDate()
        };

        await setDoc(doc(this.firestore, 'careInvites', inviteId), {
          ...invite,
          createdAt: Timestamp.fromDate(invite.createdAt)
        });

        return {
          success: true,
          needsInvite: true,
          message: 'Invite sent successfully'
        };
      } else {
        // User doesn't exist - add as contact
        const careForUser: CareForUser = {
          userId: `contact_${Date.now()}`,
          name: name,
          email: email,
          avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg',
          relationship: relationship,
          addedAt: Timestamp.now().toDate(),
          status: 'active',
          isRegisteredUser: false
        };

        const userRef = doc(this.firestore, 'users', currentUser.uid);
        const currentData = (await getDoc(userRef)).data();
        const currentCareFor = currentData?.['iCareFor'] || [];

        await updateDoc(userRef, {
          iCareFor: [...currentCareFor, {
            ...careForUser,
            addedAt: Timestamp.fromDate(careForUser.addedAt)
          }]
        });

        await this.loadCareNetwork();

        return {
          success: true,
          needsInvite: false,
          message: 'Contact added successfully'
        };
      }
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error adding care for user', error as Error);
      return {
        success: false,
        needsInvite: false,
        message: 'Error adding user'
      };
    }
  }

  /**
   * Invite user to be my carer (they care for me)
   */
  async inviteCarer(email: string, permissions: CarePermissions): Promise<{success: boolean, message: string}> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return {success: false, message: 'User not authenticated'};
    }

    try {
      const targetUser = await this.searchUserByEmail(email);

      if (!targetUser) {
        return {success: false, message: 'User not found'};
      }

      // Get current user data to include phone and name
      const currentUserRef = doc(this.firestore, 'users', currentUser.uid);
      const currentUserData = (await getDoc(currentUserRef)).data();

      const inviteId = `${currentUser.uid}_${targetUser.id}_${Date.now()}`;
      const invite: CareInvite = {
        id: inviteId,
        fromUserId: currentUser.uid,
        fromUserName: currentUserData?.['name'] || currentUser.displayName || currentUser.email || 'User',
        fromUserEmail: currentUser.email || '',
        fromUserPhone: currentUserData?.['phone'],
        fromUserCountry: currentUserData?.['country'],
        toUserId: targetUser.id,
        toUserEmail: targetUser.email,
        type: 'carer',
        permissions: permissions,
        status: 'pending',
        createdAt: Timestamp.now().toDate()
      };

      await setDoc(doc(this.firestore, 'careInvites', inviteId), {
        ...invite,
        createdAt: Timestamp.fromDate(invite.createdAt)
      });

      return {success: true, message: 'Invite sent successfully'};
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error inviting carer', error as Error);
      return {success: false, message: 'Error sending invite'};
    }
  }

  /**
   * Accept care invite
   */
  async acceptInvite(invite: CareInvite): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    const batch = writeBatch(this.firestore);

    try {
      // Update invite status
      const inviteRef = doc(this.firestore, 'careInvites', invite.id);
      batch.update(inviteRef, {
        status: 'accepted',
        respondedAt: Timestamp.now()
      });

      if (invite.type === 'care-for') {
        // From user wants to care for me
        // Add from user to my whoCareForMe list
        const myRef = doc(this.firestore, 'users', currentUser.uid);
        const myData = (await getDoc(myRef)).data();
        const myCarers = myData?.['whoCareForMe'] || [];

        const newCarer: CarerUser = {
          userId: invite.fromUserId,
          name: invite.fromUserName,
          email: invite.fromUserEmail,
          avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg',
          phone: invite.fromUserPhone,
          country: invite.fromUserCountry,
          permissions: {
            view: true,
            register: false,
            administer: false
          },
          addedAt: Timestamp.now().toDate(),
          status: 'active'
        };

        const whoCareForMeIds = myData?.['whoCareForMeIds'] || [];
        
        batch.update(myRef, {
          whoCareForMe: [...myCarers, {
            ...newCarer,
            addedAt: Timestamp.fromDate(newCarer.addedAt)
          }],
          whoCareForMeIds: [...whoCareForMeIds, invite.fromUserId]
        });

        // Add me to from user's iCareFor list
        const fromUserRef = doc(this.firestore, 'users', invite.fromUserId);
        const fromUserData = (await getDoc(fromUserRef)).data();
        const fromUserCareFor = fromUserData?.['iCareFor'] || [];

        const meAsCareFor: CareForUser = {
          userId: currentUser.uid,
          name: myData?.['name'] || 'User',
          email: currentUser.email || '',
          avatarUrl: myData?.['avatarUrl'] || currentUser.photoURL || 'https://ionicframework.com/docs/img/demos/avatar.svg',
          phone: myData?.['phone'],
          country: myData?.['country'],
          addedAt: Timestamp.now().toDate(),
          status: 'active',
          isRegisteredUser: true
        };

        batch.update(fromUserRef, {
          iCareFor: [...fromUserCareFor, {
            ...meAsCareFor,
            addedAt: Timestamp.fromDate(meAsCareFor.addedAt)
          }]
        });

      } else {
        // From user wants me to care for them
        // Add from user to my iCareFor list
        const myRef = doc(this.firestore, 'users', currentUser.uid);
        const myData = (await getDoc(myRef)).data();
        const myCareFor = myData?.['iCareFor'] || [];

        const newCareFor: CareForUser = {
          userId: invite.fromUserId,
          name: invite.fromUserName,
          email: invite.fromUserEmail,
          avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg',
          phone: invite.fromUserPhone,
          country: invite.fromUserCountry,
          addedAt: Timestamp.now().toDate(),
          status: 'active',
          isRegisteredUser: true
        };

        batch.update(myRef, {
          iCareFor: [...myCareFor, {
            ...newCareFor,
            addedAt: Timestamp.fromDate(newCareFor.addedAt)
          }]
        });

        // Add me to from user's whoCareForMe list
        const fromUserRef = doc(this.firestore, 'users', invite.fromUserId);
        const fromUserData = (await getDoc(fromUserRef)).data();
        const fromUserCarers = fromUserData?.['whoCareForMe'] || [];

        const meAsCarer: CarerUser = {
          userId: currentUser.uid,
          name: myData?.['name'] || currentUser.email || 'User',
          email: currentUser.email || '',
          avatarUrl: myData?.['avatarUrl'] || currentUser.photoURL || 'https://ionicframework.com/docs/img/demos/avatar.svg',
          phone: myData?.['phone'],
          country: myData?.['country'],
          permissions: invite.permissions,
          addedAt: Timestamp.now().toDate(),
          status: 'active'
        };

        const fromUserCarerIds = fromUserData?.['whoCareForMeIds'] || [];
        
        batch.update(fromUserRef, {
          whoCareForMe: [...fromUserCarers, {
            ...meAsCarer,
            addedAt: Timestamp.fromDate(meAsCarer.addedAt)
          }],
          whoCareForMeIds: [...fromUserCarerIds, currentUser.uid]
        });
      }

      await batch.commit();
      await this.loadCareNetwork();
      await this.loadPendingInvites();

      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error accepting invite', error as Error);
      return false;
    }
  }

  /**
   * Reject care invite
   */
  async rejectInvite(inviteId: string): Promise<boolean> {
    try {
      const inviteRef = doc(this.firestore, 'careInvites', inviteId);
      await updateDoc(inviteRef, {
        status: 'rejected',
        respondedAt: Timestamp.now()
      });

      await this.loadPendingInvites();
      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error rejecting invite', error as Error);
      return false;
    }
  }

  /**
   * Remove care for user
   */
  async removeCareForUser(userId: string): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    try {
      const batch = writeBatch(this.firestore);
      
      // Remove from my iCareFor list
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      const myCareFor = (myData?.['iCareFor'] || []).filter((user: any) => user.userId !== userId);

      batch.update(myRef, {iCareFor: myCareFor});

      // If it's a registered user, remove me from their whoCareForMe list
      const careForUser = this.iCareFor().find(u => u.userId === userId);
      if (careForUser?.isRegisteredUser) {
        const theirRef = doc(this.firestore, 'users', userId);
        const theirData = (await getDoc(theirRef)).data();
        const theirCarers = (theirData?.['whoCareForMe'] || []).filter((user: any) => user.userId !== currentUser.uid);

        batch.update(theirRef, {whoCareForMe: theirCarers});
      }

      await batch.commit();
      await this.loadCareNetwork();

      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error removing care for user', error as Error);
      return false;
    }
  }

  /**
   * Remove carer
   */
  async removeCarer(userId: string): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    try {
      const batch = writeBatch(this.firestore);
      
      // Remove from my whoCareForMe list
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      const myCarers = (myData?.['whoCareForMe'] || []).filter((user: any) => user.userId !== userId);

      batch.update(myRef, {whoCareForMe: myCarers});

      // Remove me from their iCareFor list
      const theirRef = doc(this.firestore, 'users', userId);
      const theirData = (await getDoc(theirRef)).data();
      const theirCareFor = (theirData?.['iCareFor'] || []).filter((user: any) => user.userId !== currentUser.uid);

      batch.update(theirRef, {iCareFor: theirCareFor});

      await batch.commit();
      await this.loadCareNetwork();

      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error removing carer', error as Error);
      return false;
    }
  }

  /**
   * Update a single care network user with latest data from Firestore
   */
  private async updateCareNetworkUser<T extends {userId: string, name: string, email: string, avatarUrl?: string}>(
    user: T, 
    isRegistered: boolean
  ): Promise<{updated: T, hasChanged: boolean}> {
    if (!isRegistered) {
      return {updated: user, hasChanged: false};
    }

    const userDoc = await getDoc(doc(this.firestore, 'users', user.userId));
    if (!userDoc.exists()) {
      return {updated: user, hasChanged: false};
    }

    const userData = userDoc.data();
    const updated = {
      ...user,
      name: userData['name'] || user.email,
      avatarUrl: userData['avatarUrl'] || user.avatarUrl
    };

    const hasChanged = user.name !== updated.name || user.avatarUrl !== updated.avatarUrl;
    return {updated, hasChanged};
  }

  /**
   * Sync whoCareForMeIds array from whoCareForMe for Firestore Rules
   * This helper array makes permission checking much faster in security rules
   */
  async syncCarerIdsArray(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.logService.debug('CareNetworkService', 'No current user, skipping carer IDs sync');
      return;
    }

    this.logService.debug('CareNetworkService', 'Starting carer IDs sync', { userId: currentUser.uid });

    try {
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      if (!myData) {
        this.logService.warn('CareNetworkService', 'User document not found during carer IDs sync');
        return;
      }

      const whoCareForMe: CarerUser[] = myData['whoCareForMe'] || [];
      const existingIds: string[] = myData['whoCareForMeIds'];
      
      this.logService.debug('CareNetworkService', `Found ${whoCareForMe.length} carers in whoCareForMe`);
      this.logService.debug('CareNetworkService', 'Existing whoCareForMeIds', { existingIds });
      
      // Extract user IDs from whoCareForMe array
      const carerIds = whoCareForMe.map(carer => carer.userId);
      this.logService.debug('CareNetworkService', 'Extracted carer IDs', { carerIds });
      
      // Always update if whoCareForMeIds doesn't exist or is different
      const needsUpdate = existingIds === undefined || 
                         existingIds === null ||
                         JSON.stringify([...carerIds].sort((a, b) => a.localeCompare(b))) !== 
                         JSON.stringify([...existingIds].sort((a, b) => a.localeCompare(b)));
      
      this.logService.debug('CareNetworkService', `Needs update: ${needsUpdate}`);
      
      if (needsUpdate) {
        await updateDoc(myRef, {
          whoCareForMeIds: carerIds
        });
        this.logService.debug('CareNetworkService', `✅ Sync completed successfully. ${carerIds.length} carer(s) saved.`);
      } else {
        this.logService.debug('CareNetworkService', 'ℹ️ No update needed, arrays already match');
      }
    } catch (error: any) {
      this.logService.error('CareNetworkService', '❌ Error syncing carer IDs', error as Error);
      throw error; // Re-throw to be caught by constructor
    }
  }

  /**
   * Sync names and avatars for all registered users in care network
   * Call this to fix any users that have email instead of name
   */
  async syncCareNetworkNames(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    try {
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      if (!myData) return;

      let hasChanges = false;

      // Sync iCareFor list
      const iCareFor: CareForUser[] = myData['iCareFor'] || [];
      const updatedCareFor: CareForUser[] = [];

      for (const person of iCareFor) {
        const result = await this.updateCareNetworkUser(person, person.isRegisteredUser);
        updatedCareFor.push(result.updated);
        if (result.hasChanged) hasChanges = true;
      }

      // Sync whoCareForMe list
      const whoCareForMe: CarerUser[] = myData['whoCareForMe'] || [];
      const updatedCarers: CarerUser[] = [];

      for (const carer of whoCareForMe) {
        const result = await this.updateCareNetworkUser(carer, true);
        updatedCarers.push(result.updated);
        if (result.hasChanged) hasChanges = true;
      }

      // Update Firestore if there were changes
      if (hasChanges) {
        await updateDoc(myRef, {
          iCareFor: updatedCareFor,
          whoCareForMe: updatedCarers
        });
        await this.loadCareNetwork();
        this.logService.debug('CareNetworkService', 'Care network names synced successfully');
      }
    } catch (error: any) {
      this.logService.error('CareNetworkService', 'Error syncing care network names', error as Error);
    }
  }

  /**
   * Update permissions for a specific carer
   * @param carerId The user ID of the carer
   * @param permissions New permissions to apply
   */
  async updateCarerPermissions(carerId: string, permissions: CarePermissions): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    try {
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      if (!myData) return false;

      const whoCareForMe: CarerUser[] = myData['whoCareForMe'] || [];
      const carerIndex = whoCareForMe.findIndex(c => c.userId === carerId);

      if (carerIndex === -1) {
        this.logService.warn('CareNetworkService', 'Carer not found in whoCareForMe list');
        return false;
      }

      // Validate permissions (view must always be true)
      const validatedPermissions: CarePermissions = {
        view: true, // Always true
        register: permissions.register,
        administer: permissions.administer
      };

      // Update carer permissions
      whoCareForMe[carerIndex] = {
        ...whoCareForMe[carerIndex],
        permissions: validatedPermissions
      };

      await updateDoc(myRef, {
        whoCareForMe: whoCareForMe
      });

      await this.loadCareNetwork();
      this.logService.debug('CareNetworkService', `✅ Permissions updated for carer ${carerId}`);
      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', '❌ Error updating permissions', error as Error);
      return false;
    }
  }

  /**
   * Grant a specific permission to a carer
   * @param carerId The user ID of the carer
   * @param permissionType 'register' or 'administer'
   */
  async grantPermission(carerId: string, permissionType: 'register' | 'administer'): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    try {
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      if (!myData) return false;

      const whoCareForMe: CarerUser[] = myData['whoCareForMe'] || [];
      const carerIndex = whoCareForMe.findIndex(c => c.userId === carerId);

      if (carerIndex === -1) {
        this.logService.warn('CareNetworkService', 'Carer not found in whoCareForMe list');
        return false;
      }

      // Update specific permission
      whoCareForMe[carerIndex].permissions[permissionType] = true;

      await updateDoc(myRef, {
        whoCareForMe: whoCareForMe
      });

      await this.loadCareNetwork();
      this.logService.debug('CareNetworkService', `✅ Granted ${permissionType} to carer ${carerId}`);
      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', '❌ Error granting permission', error as Error);
      return false;
    }
  }

  /**
   * Revoke a specific permission from a carer
   * @param carerId The user ID of the carer
   * @param permissionType 'register' or 'administer'
   */
  async revokePermission(carerId: string, permissionType: 'register' | 'administer'): Promise<boolean> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    try {
      const myRef = doc(this.firestore, 'users', currentUser.uid);
      const myData = (await getDoc(myRef)).data();
      if (!myData) return false;

      const whoCareForMe: CarerUser[] = myData['whoCareForMe'] || [];
      const carerIndex = whoCareForMe.findIndex(c => c.userId === carerId);

      if (carerIndex === -1) {
        this.logService.warn('CareNetworkService', 'Carer not found in whoCareForMe list');
        return false;
      }

      // Update specific permission
      whoCareForMe[carerIndex].permissions[permissionType] = false;

      await updateDoc(myRef, {
        whoCareForMe: whoCareForMe
      });

      await this.loadCareNetwork();
      this.logService.debug('CareNetworkService', `✅ Revoked ${permissionType} from carer ${carerId}`);
      return true;
    } catch (error: any) {
      this.logService.error('CareNetworkService', '❌ Error revoking permission', error as Error);
      return false;
    }
  }
}

