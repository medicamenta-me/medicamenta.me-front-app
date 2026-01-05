import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, timeout, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Onboarding Guard
 * Protects routes that require completed onboarding
 * 
 * Business Logic:
 * 1. Wait for user data to load from Firestore (with 20s timeout)
 * 2. Check onboardingCompleted flag AND required fields validation
 * 3. If incomplete, redirect to /onboarding at currentStep
 * 4. On timeout or offline, check IndexedDB for cached data
 */
export const onboardingGuard = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  return toObservable(userService.currentUser).pipe(
    // Wait for non-null user (Firestore data loaded)
    filter(user => user !== null),
    // Timeout after 20 seconds
    timeout(20000),
    // Validate onboarding completion
    map(currentUser => {
      if (!currentUser) {
        // Should not happen due to filter, but safety check
        router.navigate(['/onboarding']);
        return false;
      }

      // Check if onboarding is completed
      if (!currentUser.onboardingCompleted) {
        router.navigate(['/onboarding']);
        return false;
      }

      // Validate required fields (double validation as per requirements)
      const hasRequiredFields = validateRequiredFields(currentUser);
      if (!hasRequiredFields) {
        router.navigate(['/onboarding']);
        return false;
      }

      // All checks passed
      return true;
    }),
    // Handle timeout or errors
    catchError(error => {
      console.error('[OnboardingGuard] Error or timeout:', error);
      
      // On timeout/error, check if we have cached user data with required fields
      const currentUser = userService.currentUser();
      if (currentUser?.onboardingCompleted && validateRequiredFields(currentUser)) {
        return of(true);
      }

      // No valid cached data, show connection error and redirect
      router.navigate(['/onboarding'], {
        queryParams: { connectionError: 'true' }
      });
      return of(false);
    })
  );
};

/**
 * Validate that all required fields are filled
 * Required fields per step:
 * - Step 1 (Personal Data): country, name, birthDate, gender, document, phone
 * - Step 2 (Carers): Optional, can be empty
 * - Step 3 (Dependents): Optional, can be empty
 * - Step 4 (Medications): Optional, can be empty
 * - Step 5 (Plans & Terms): termsAcceptance must have at least one entry
 */
function validateRequiredFields(user: any): boolean {
  // Step 1: Personal Data (all required)
  if (!user.country || !user.name || !user.birthDate || !user.gender || !user.document || !user.phone) {
    return false;
  }

  // Step 5: Terms acceptance (must have at least one accepted version)
  if (!user.termsAcceptance || user.termsAcceptance.length === 0) {
    return false;
  }

  return true;
}

