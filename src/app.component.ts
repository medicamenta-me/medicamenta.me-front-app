import { Component, ChangeDetectionStrategy, inject, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, Platform } from "@ionic/angular/standalone";
import { LocalNotifications } from '@capacitor/local-notifications';
import { TranslationService } from './app/services/translation.service';
import { UserService } from './app/services/user.service';
import { TermsOfUseService } from './app/services/terms-of-use.service';
import { GamificationService } from './app/services/gamification.service';
import { PwaInstallPromptComponent } from './app/components/pwa-install-prompt/pwa-install-prompt.component';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      <app-pwa-install-prompt />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonApp, 
    IonRouterOutlet,
    PwaInstallPromptComponent
  ]
})
export class AppComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly userService = inject(UserService);
  private readonly termsService = inject(TermsOfUseService);
  private readonly gamificationService = inject(GamificationService);
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);
  
  private streakCheckInterval: any;
  
  // Effect to check terms when user changes - must be created in injection context
  private readonly termsCheckEffect = effect(async () => {
    const user = this.userService.currentUser();
    if (user?.country) {
      const termsOk = await this.termsService.checkAndHandleTerms(user);
      if (!termsOk) {
        console.warn('[AppComponent] Terms check failed - user may need to logout');
        // If terms check fails, could force logout here
        // await this.authService.logout();
      }
    }
  });
  
  constructor() {
    // Inicializa o serviço de tradução
    
    // Setup app lifecycle listeners
    this.setupAppLifecycle();
    
    // Setup notification listeners
    this.setupNotificationListeners();
  }

  ngOnInit() {
    // Start daily streak check
    this.startDailyStreakCheck();
  }

  /**
   * Setup app lifecycle listeners (resume, pause)
   */
  private setupAppLifecycle() {
    this.platform.ready().then(() => {
      // When app resumes (comes to foreground)
      this.platform.resume.subscribe(() => {
        this.gamificationService.checkAndNotifyStreakRisk();
      });
    });
  }

  /**
   * Start daily streak check
   * Runs every 12 hours to check if streak is at risk
   */
  private startDailyStreakCheck() {
    // Check immediately on app start
    setTimeout(() => {
      this.gamificationService.checkAndNotifyStreakRisk();
    }, 5000); // Wait 5s after app loads
    
    // Check every 12 hours
    this.streakCheckInterval = setInterval(() => {
      this.gamificationService.checkAndNotifyStreakRisk();
    }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds
  }

  /**
   * Setup notification listeners
   * Handles deep links when user taps on a notification
   */
  private setupNotificationListeners() {
    this.platform.ready().then(() => {
      // Listen for notification taps
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const extra = notification.notification.extra;
        
        if (extra && extra.deepLink) {
          // Navigate to deep link URL
          this.router.navigateByUrl(extra.deepLink);
        } else if (extra && extra.type === 'family-dose') {
          // Family notification - navigate to family dashboard
          this.router.navigate(['/family-dashboard']);
        }
      });
    });
  }
}