export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  avatarUrl: string;
  // Personal Data
  country?: string; // Country code (e.g., 'BR', 'AR', 'US')
  document?: string;
  documentType?: string; // Automatically set based on country (e.g., 'CPF', 'DNI', 'SSN')
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-say';
  // Health Data
  bloodType?: string;
  allergies?: string;
  healthNotes?: string;
  // Contact Data
  phone?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
}

// Care Network Models

/**
 * Care Permissions Interface
 * - view: Can view medications, dashboard (read-only)
 * - register: Can create and edit medications
 * - administer: Can mark medications as taken/missed
 * 
 * Rules:
 * - view is mandatory (always true)
 * - register and administer require view
 * - register and administer are independent of each other
 */
export interface CarePermissions {
  view: boolean;        // Always true (mandatory)
  register: boolean;    // Can create/edit medications
  administer: boolean;  // Can mark taken/missed
}

export interface CareForUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string; // Phone with DDI
  country?: string; // Country code
  relationship?: string; // Vínculo: Mãe, Pai, Avó, Enfermeira, Cuidadora, etc. (opcional)
  addedAt: Date;
  status: 'active' | 'pending' | 'revoked';
  isRegisteredUser: boolean; // true if user exists in system, false if just a contact
}

export interface CarerUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string; // Phone with DDI
  country?: string; // Country code
  permissions: CarePermissions; // View, Register, Administer permissions
  addedAt: Date;
  status: 'active' | 'pending' | 'revoked';
}

export interface CareInvite {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  fromUserPhone?: string; // Phone with DDI
  fromUserCountry?: string; // Country code
  toUserId: string;
  toUserEmail: string;
  type: 'care-for' | 'carer'; // care-for: I want to care for you, carer: I want you to care for me
  permissions: CarePermissions; // View, Register, Administer permissions
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Patient' | 'Family Member' | 'Nurse' | 'Doctor';
  avatarUrl: string;
  dependents: Dependent[];
  
  // Personal Data
  country?: string; // Country code (e.g., 'BR', 'AR', 'US')
  document?: string;
  documentType?: string; // Automatically set based on country (e.g., 'CPF', 'DNI', 'SSN')
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-say';
  religion?: string; // Optional: user's religion
  
  // Health Data
  bloodType?: string;
  allergies?: string;
  healthNotes?: string;
  
  // Contact Data
  phone?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  
  // Care Network
  iCareFor?: CareForUser[];
  whoCareForMe?: CarerUser[];
  
  // Helper arrays for Firestore Rules (extracted from above arrays)
  // These make permission checking much simpler in security rules
  whoCareForMeIds?: string[]; // Array of user IDs who can manage this patient
  
  // Onboarding
  onboardingCompleted?: boolean;
  onboardingStep?: number; // Track which step user is on (0=welcome, 1=personal, 2=carers, 3=dependents, 4=medications, 5=plans)
  onboardingSteps?: OnboardingSteps; // Detailed step completion tracking
  onboardingCompletedAt?: Date; // Timestamp when onboarding was fully completed
  termsAcceptance?: TermsAcceptance[]; // Array of accepted terms versions
  
  // Gamification Preferences
  leaderboardVisible?: boolean; // Whether user wants to appear in leaderboards (default: true)
  soundEnabled?: boolean; // Sound effects enabled (default: true)
  hapticsEnabled?: boolean; // Haptic feedback enabled (default: true)
  
  // Offline support
  lastSync?: Date; // Last synchronization timestamp
}

/**
 * Onboarding Steps Tracking
 * Each step has a completed flag to track individual progress
 */
export interface OnboardingSteps {
  welcome: boolean;           // Step 0: Welcome screen
  personalData: boolean;      // Step 1: Name, country, document, birth date, gender, phone, religion
  carers: boolean;            // Step 2: People who care for the user (cuidadores)
  dependents: boolean;        // Step 3: People the user cares for (dependentes)
  medications: boolean;       // Step 4: Medication list setup
  plansAndTerms: boolean;     // Step 5: Plan selection and terms acceptance
}

/**
 * Geolocation Data
 * Coordinates captured when user accepts terms
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;          // Accuracy in meters
  timestamp?: Date;           // When coordinates were captured
}

/**
 * Terms of Use Acceptance Record
 * Tracks which versions of terms the user has accepted and when
 * Includes IP address and geolocation for audit/legal purposes
 */
export interface TermsAcceptance {
  termsId: string;            // Document ID from Firestore (e.g., "BR_1.0")
  version: string;            // e.g., "1.0", "2.0"
  country: string;            // Country code (BR, AR, US, etc.)
  acceptedAt: Date;           // Timestamp of acceptance
  ipAddress?: string;         // IP address at time of acceptance
  geolocation?: GeoLocation;  // GPS coordinates at time of acceptance (if permission granted)
}
