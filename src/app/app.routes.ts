import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  {
    path: 'share-target',
    loadComponent: () => import('./pages/share-target/share-target.component').then(m => m.ShareTargetPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./pages/onboarding/onboarding.routes').then(m => m.ONBOARDING_ROUTES),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.component').then(m => m.TabsComponent),
    canActivate: [authGuard, onboardingGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/tabs/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'medications',
        loadComponent: () => import('./pages/tabs/medications/medications.component').then(m => m.MedicationsComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/tabs/history/history.component').then(m => m.HistoryComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/tabs/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },
  {
    path: 'medication/add',
    loadComponent: () => import('./pages/medication-form/medication-form.component').then(m => m.MedicationFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'medication/new',
    loadComponent: () => import('./pages/medication-form/medication-form.component').then(m => m.MedicationFormComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'medication/edit/:id',
    loadComponent: () => import('./pages/medication-form/medication-form.component').then(m => m.MedicationFormComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'medication/:id',
    loadComponent: () => import('./pages/medication-detail/medication-detail.component').then(m => m.MedicationDetailComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./pages/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'profile/add-dependent',
    loadComponent: () => import('./pages/profile-add-dependent/profile-add-dependent.component').then(m => m.ProfileAddDependentComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'profile/edit-dependent/:id',
    loadComponent: () => import('./pages/profile-edit-dependent/profile-edit-dependent.component').then(m => m.ProfileEditDependentComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'care-network',
    loadComponent: () => import('./pages/care-network/care-network.component').then(m => m.CareNetworkComponent),
    canActivate: [authGuard],
  },
  {
    path: 'achievements',
    loadComponent: () => import('./pages/achievements/achievements.component').then(m => m.AchievementsPage),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'family-dashboard',
    loadComponent: () => import('./pages/family-dashboard/family-dashboard.component').then(m => m.FamilyDashboardComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'family-reports',
    loadComponent: () => import('./pages/family-reports/family-reports.component').then(m => m.FamilyReportsComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'family-calendar',
    loadComponent: () => import('./pages/family-calendar/family-calendar.component').then(m => m.FamilyCalendarComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'family-notification-settings',
    loadComponent: () => import('./pages/family-notification-settings/family-notification-settings.component').then(m => m.FamilyNotificationSettingsComponent),
    canActivate: [authGuard, onboardingGuard],
  },
  {
    path: 'reports',
    loadChildren: () => import('./pages/reports/reports.routes').then(m => m.REPORTS_ROUTES),
  },
  {
    path: 'calendar-sync',
    loadChildren: () => import('./pages/calendar-sync/calendar-sync.routes').then(m => m.CALENDAR_ROUTES),
  },
  {
    path: 'migrate-permissions',
    loadComponent: () => import('./pages/migrate-permissions/migrate-permissions.component').then(m => m.MigratePermissionsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'wearable-settings',
    loadComponent: () => import('./pages/wearable-settings/wearable-settings.page').then( m => m.WearableSettingsPage)
  },
  {
    path: 'upgrade',
    loadComponent: () => import('./pages/upgrade/upgrade.component').then(m => m.UpgradeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'payment/success',
    loadComponent: () => import('./pages/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent),
    canActivate: [authGuard],
  },
  {
    path: 'payment/cancel',
    loadComponent: () => import('./pages/payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' }
// Fallback route
];
