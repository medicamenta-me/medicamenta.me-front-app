import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./onboarding.component').then(m => m.OnboardingComponent),
    canActivate: [authGuard],
  }
];
