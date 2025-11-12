import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[AuthGuard] Checking authentication for route:', state.url);

  return authService.isLoggedIn$.pipe(
    take(1), // Take the first value and complete
    map(isLoggedIn => {
      console.log('[AuthGuard] Is logged in:', isLoggedIn);
      if (isLoggedIn) {
        return true;
      }
      // Redirect to the login page
      console.log('[AuthGuard] Not logged in, redirecting to /login');
      return router.createUrlTree(['/login']);
    })
  );
};
