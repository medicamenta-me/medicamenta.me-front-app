import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { onboardingGuard } from '../../guards/onboarding.guard';

export const CALENDAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./calendar-sync.component').then(m => m.CalendarSyncPage),
    canActivate: [authGuard, onboardingGuard],
  }
];
