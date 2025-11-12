import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { onboardingGuard } from '../../guards/onboarding.guard';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reports.component').then(m => m.ReportsComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'builder',
    loadComponent: () => import('../report-builder/report-builder.component').then(m => m.ReportBuilderPage),
    canActivate: [authGuard, onboardingGuard],
  }
];
