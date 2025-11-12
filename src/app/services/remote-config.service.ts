import { Injectable, signal, inject } from '@angular/core';
import { 
  RemoteConfig, 
  fetchAndActivate, 
  getBoolean, 
  getNumber, 
  getString, 
  getValue,
  activate,
  fetchConfig
} from '@angular/fire/remote-config';
import { DEFAULT_FEATURE_FLAGS, FeatureFlagName, FeatureFlag } from '../models/feature-flags.model';
import { LogService } from './log.service';

/**
 * Firebase Remote Config Service
 * 
 * Manages dynamic feature flags from Firebase Remote Config for A/B testing,
 * gradual rollouts, and runtime configuration without app updates.
 * 
 * Features:
 * - Fetch remote config with caching (default: 12 hours)
 * - Fallback to local defaults when offline
 * - Automatic periodic refresh
 * - Signal-based reactivity for UI updates
 * - A/B testing support via conditions
 * 
 * @example
 * ```typescript
 * // Inject in component
 * constructor(private remoteConfig: RemoteConfigService) {}
 * 
 * // Get feature flag
 * const isEnabled = this.remoteConfig.getFeatureFlag('ocr_scanner');
 * 
 * // Get numeric value
 * const maxPhotos = this.remoteConfig.getNumber('max_ocr_photos_per_month');
 * 
 * // Manual refresh
 * await this.remoteConfig.refresh();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  // Signals for reactive state
  private readonly _isLoading = signal<boolean>(false);
  private readonly _lastFetchTime = signal<Date | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _featureFlags = signal<Record<string, boolean | FeatureFlag>>({});

  // Computed signals
  isLoading = this._isLoading.asReadonly();
  lastFetchTime = this._lastFetchTime.asReadonly();
  error = this._error.asReadonly();
  featureFlags = this._featureFlags.asReadonly();

  // Config
  private readonly FETCH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
  private readonly MINIMUM_FETCH_INTERVAL_MS = 60 * 1000; // 1 minute (development)
  private refreshInterval: any;
  private readonly logService = inject(LogService);

  constructor(private readonly remoteConfigInstance: RemoteConfig) {
    // Set defaults for Remote Config
    this.setDefaults();
    
    // Initial fetch (async, don't await)
    void this.fetchAndActivate();

    // Setup periodic refresh
    this.startPeriodicRefresh();
  }

  /**
   * Set default values for Remote Config
   * These are used as fallback when remote values are not available
   */
  private setDefaults(): void {
    // Convert DEFAULT_FEATURE_FLAGS to simple boolean map
    const defaults: Record<string, boolean | number | string> = {};
    
    // Feature flags (extract enabled boolean from FeatureFlag objects)
    for (const [key, flag] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      defaults[key] = flag.enabled;
    }

    // Additional config parameters (non-boolean)
    defaults['max_ocr_photos_per_month'] = 20;
    defaults['max_reports_per_month_free'] = 3;
    defaults['max_dependents_free'] = 1;
    defaults['max_caregivers_free'] = 2;
    defaults['gamification_achievement_count_free'] = 6;
    defaults['insights_history_days_free'] = 30;
    defaults['payment_success_delay_ms'] = 2000;
    defaults['payment_cancel_redirect_delay_ms'] = 3000;
    defaults['pix_qr_code_expiration_minutes'] = 30;
    defaults['boleto_expiration_days'] = 3;
    defaults['credit_card_max_installments'] = 12;
    defaults['stripe_enabled'] = true;
    defaults['pagseguro_enabled'] = true;

    // A/B Testing defaults
    defaults['show_premium_badge'] = true;
    defaults['show_trial_banner'] = true;
    defaults['enable_referral_program'] = false;
    defaults['paywall_primary_cta'] = 'Começar Período Gratuito'; // A/B test wording
    defaults['upgrade_modal_frequency_hours'] = 72; // How often to show upgrade modal

    // Apply defaults (silently fails if Remote Config not configured)
    try {
      // Note: setDefaults is not available in @angular/fire v8
      // We'll use the defaults in getters as fallback
      this.logService.debug('RemoteConfigService', 'Defaults configured', { count: Object.keys(defaults).length });
    } catch (error: any) {
      this.logService.warn('RemoteConfigService', 'Could not set defaults', { error });
    }
  }

  /**
   * Fetch and activate remote config
   * Returns true if new config was activated
   */
  async fetchAndActivate(): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      this.logService.debug('RemoteConfigService', 'Fetching remote config...');
      const activated = await fetchAndActivate(this.remoteConfigInstance);
      
      this._lastFetchTime.set(new Date());
      
      // Update feature flags signal
      this.updateFeatureFlags();
      
      this.logService.info('RemoteConfigService', 'Config activated', { activated });
      return activated;
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to fetch remote config';
      this._error.set(errorMsg);
      this.logService.error('RemoteConfigService', 'Fetch error', new Error(errorMsg));
      
      // Fallback to defaults
      this._featureFlags.set(DEFAULT_FEATURE_FLAGS);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Fetch config without activating
   * Use this to pre-fetch config for next app launch
   */
  async fetch(): Promise<void> {
    try {
      await fetchConfig(this.remoteConfigInstance);
      this.logService.debug('RemoteConfigService', 'Config fetched (not activated)');
    } catch (error: any) {
      this.logService.error('RemoteConfigService', 'Fetch error', error as Error);
    }
  }

  /**
   * Activate the most recently fetched config
   */
  async activate(): Promise<boolean> {
    try {
      const activated = await activate(this.remoteConfigInstance);
      if (activated) {
        this.updateFeatureFlags();
      }
      return activated;
    } catch (error: any) {
      this.logService.error('RemoteConfigService', 'Activate error', error as Error);
      return false;
    }
  }

  /**
   * Manual refresh - fetch and activate immediately
   * Useful for admin testing or "force refresh" feature
   */
  async refresh(): Promise<boolean> {
    this.logService.info('RemoteConfigService', 'Manual refresh triggered');
    return this.fetchAndActivate();
  }

  /**
   * Start periodic refresh in background
   */
  private startPeriodicRefresh(): void {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Setup new interval
    this.refreshInterval = setInterval(() => {
      this.logService.debug('RemoteConfigService', 'Periodic refresh');
      this.fetchAndActivate();
    }, this.FETCH_INTERVAL_MS);
  }

  /**
   * Stop periodic refresh (call on destroy)
   */
  stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Update feature flags signal from Remote Config values
   */
  private updateFeatureFlags(): void {
    try {
      const flags: Record<string, boolean> = {};
      
      // Extract boolean values from Remote Config
      for (const key of Object.keys(DEFAULT_FEATURE_FLAGS)) {
        flags[key] = this.getBoolean(key, DEFAULT_FEATURE_FLAGS[key as FeatureFlagName].enabled);
      }

      this._featureFlags.set(flags);
      this.logService.debug('RemoteConfigService', 'Feature flags updated', { flags });
    } catch (error: any) {
      this.logService.error('RemoteConfigService', 'Error updating feature flags', error as Error);
    }
  }

  /**
   * Get a specific feature flag
   */
  getFeatureFlag(name: string): boolean {
    try {
      return getBoolean(this.remoteConfigInstance, name);
    } catch (error: unknown) {
      this.logService.warn('RemoteConfigService', 'Could not get value, using default', { name, error });
      const defaultFlag = DEFAULT_FEATURE_FLAGS[name as FeatureFlagName];
      return defaultFlag ? defaultFlag.enabled : false;
    }
  }

  /**
   * Get boolean value
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    try {
      return getBoolean(this.remoteConfigInstance, key);
    } catch (error: unknown) {
      this.logService.warn('RemoteConfigService', 'Error getting boolean', { key, error });
      return defaultValue;
    }
  }

  /**
   * Get numeric value
   */
  getNumber(key: string, defaultValue: number = 0): number {
    try {
      return getNumber(this.remoteConfigInstance, key);
    } catch (error: unknown) {
      this.logService.warn('RemoteConfigService', 'Error getting number', { key, error });
      return defaultValue;
    }
  }

  /**
   * Get string value
   */
  getString(key: string, defaultValue: string = ''): string {
    try {
      return getString(this.remoteConfigInstance, key);
    } catch (error: unknown) {
      this.logService.warn('RemoteConfigService', 'Error getting string', { key, error });
      return defaultValue;
    }
  }

  /**
   * Get raw value (for JSON parsing)
   */
  getValue(key: string): any {
    try {
      return getValue(this.remoteConfigInstance, key);
    } catch (error: any) {
      this.logService.error('RemoteConfigService', 'Error getting value', { key, error } as any);
      return null;
    }
  }

  /**
   * Get all feature flags as object
   */
  getAllFeatureFlags(): Record<string, boolean | FeatureFlag> {
    return this._featureFlags();
  }

  /**
   * Get max limits based on Remote Config
   */
  getLimits() {
    return {
      maxOcrPhotosPerMonth: this.getNumber('max_ocr_photos_per_month', 20),
      maxReportsPerMonthFree: this.getNumber('max_reports_per_month_free', 3),
      maxDependentsFree: this.getNumber('max_dependents_free', 1),
      maxCaregiversFree: this.getNumber('max_caregivers_free', 2),
      gamificationAchievementCountFree: this.getNumber('gamification_achievement_count_free', 6),
      insightsHistoryDaysFree: this.getNumber('insights_history_days_free', 30)
    };
  }

  /**
   * Get payment config
   */
  getPaymentConfig() {
    return {
      successDelayMs: this.getNumber('payment_success_delay_ms', 2000),
      cancelRedirectDelayMs: this.getNumber('payment_cancel_redirect_delay_ms', 3000),
      pixQrCodeExpirationMinutes: this.getNumber('pix_qr_code_expiration_minutes', 30),
      boletoExpirationDays: this.getNumber('boleto_expiration_days', 3),
      creditCardMaxInstallments: this.getNumber('credit_card_max_installments', 12),
      stripeEnabled: this.getBoolean('stripe_enabled', true),
      pagseguroEnabled: this.getBoolean('pagseguro_enabled', true)
    };
  }

  /**
   * Get A/B testing config
   */
  getABTestConfig() {
    return {
      showPremiumBadge: this.getBoolean('show_premium_badge', true),
      showTrialBanner: this.getBoolean('show_trial_banner', true),
      enableReferralProgram: this.getBoolean('enable_referral_program', false),
      paywallPrimaryCta: this.getString('paywall_primary_cta', 'Começar Período Gratuito'),
      upgradeModalFrequencyHours: this.getNumber('upgrade_modal_frequency_hours', 72)
    };
  }

  /**
   * Check if feature is enabled for current user
   * (this can be extended with user segmentation logic)
   */
  isFeatureEnabled(name: FeatureFlagName): boolean {
    return this.getFeatureFlag(name);
  }

  /**
   * Get config fetch status info
   */
  getStatus() {
    return {
      isLoading: this._isLoading(),
      lastFetchTime: this._lastFetchTime(),
      error: this._error(),
      nextFetchTime: this._lastFetchTime() 
        ? new Date(this._lastFetchTime()!.getTime() + this.FETCH_INTERVAL_MS)
        : null
    };
  }
}

