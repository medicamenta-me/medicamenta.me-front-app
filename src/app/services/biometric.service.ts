import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  BiometricAuth, 
  BiometryType, 
  BiometryError,
  BiometryErrorType,
  AuthenticateOptions 
} from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { LogService } from './log.service';

/**
 * Biometric Authentication Service
 * Handles Face ID / Touch ID authentication
 */
@Injectable({
  providedIn: 'root'
})
export class BiometricService {
  private readonly logService = inject(LogService);
  
  // Signals (public for template access)
  readonly isAvailable = signal<boolean>(false);
  readonly biometryType = signal<BiometryType>(BiometryType.none);
  readonly isEnabled = signal<boolean>(false);
  
  // Computed
  readonly canUseBiometrics = computed(() => this.isAvailable() && this.isEnabled());
  readonly biometryName = computed(() => {
    const type = this.biometryType();
    switch (type) {
      case BiometryType.faceId:
        return 'Face ID';
      case BiometryType.touchId:
        return 'Touch ID';
      case BiometryType.fingerprintAuthentication:
        return 'Impressão Digital';
      case BiometryType.faceAuthentication:
        return 'Reconhecimento Facial';
      case BiometryType.irisAuthentication:
        return 'Íris';
      default:
        return 'Biometria';
    }
  });

  constructor() {
    this.initialize();
  }

  /**
   * Initialize biometric auth capabilities
   */
  private async initialize(): Promise<void> {
    try {
      // Check if biometric auth is available on device
      const result = await BiometricAuth.checkBiometry();
      
      this.isAvailable.set(result.isAvailable);
      this.biometryType.set(result.biometryType);

      this.logService.debug('BiometricService', 'Biometry available', { isAvailable: result.isAvailable });
      this.logService.debug('BiometricService', 'Biometry type', { biometryType: result.biometryType });

      // Load user preference
      const { value } = await Preferences.get({ key: 'biometric_enabled' });
      this.isEnabled.set(value === 'true');

    } catch (error: any) {
      this.logService.error('BiometricService', 'Initialization error', error);
      this.isAvailable.set(false);
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(options?: Partial<AuthenticateOptions>): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Biometric authentication not available');
    }

    if (!this.isEnabled()) {
      throw new Error('Biometric authentication not enabled by user');
    }

    try {
      const defaultOptions: AuthenticateOptions = {
        reason: 'Confirme sua identidade',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Usar senha',
        androidTitle: 'Autenticação',
        androidSubtitle: 'Medicamenta.me',
        androidConfirmationRequired: false,
      };

      await BiometricAuth.authenticate({
        ...defaultOptions,
        ...options,
      });

      this.logService.info('BiometricService', 'Authentication successful');
      return true;

    } catch (error: any) {
      this.handleBiometricError(error as BiometryError);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable(): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Biometric authentication not available on this device');
    }

    try {
      // Test authentication before enabling
      const success = await this.authenticate({
        reason: 'Ative a autenticação biométrica',
      });

      if (success) {
        await Preferences.set({ key: 'biometric_enabled', value: 'true' });
        this.isEnabled.set(true);
        this.logService.info('BiometricService', 'Biometric authentication enabled');
        return true;
      }

      return false;

    } catch (error: any) {
      this.logService.error('BiometricService', 'Enable error', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disable(): Promise<void> {
    await Preferences.set({ key: 'biometric_enabled', value: 'false' });
    this.isEnabled.set(false);
    this.logService.info('BiometricService', 'Biometric authentication disabled');
  }

  /**
   * Check if biometrics can be used
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const result = await BiometricAuth.checkBiometry();
      this.isAvailable.set(result.isAvailable);
      this.biometryType.set(result.biometryType);
      return result.isAvailable;
    } catch (error: any) {
      this.logService.error('BiometricService', 'Check availability error', error);
      return false;
    }
  }

  /**
   * Handle biometric authentication errors
   */
  private handleBiometricError(error: BiometryError): void {
    const errorType = error.code as BiometryErrorType;

    switch (errorType) {
      case BiometryErrorType.biometryNotAvailable:
        this.logService.error('BiometricService', 'Biometry not available', new Error('Biometry not available'));
        break;
      case BiometryErrorType.biometryNotEnrolled:
        this.logService.error('BiometricService', 'No biometrics enrolled', new Error('No biometrics enrolled'));
        break;
      case BiometryErrorType.userCancel:
        this.logService.debug('BiometricService', 'User canceled authentication');
        break;
      case BiometryErrorType.userFallback:
        this.logService.debug('BiometricService', 'User chose fallback');
        break;
      case BiometryErrorType.biometryLockout:
        this.logService.error('BiometricService', 'Too many failed attempts', new Error('Too many failed attempts'));
        break;
      case BiometryErrorType.authenticationFailed:
        this.logService.error('BiometricService', 'Authentication failed', new Error('Authentication failed'));
        break;
      default:
        this.logService.error('BiometricService', 'Unknown error', error);
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: BiometryError): string {
    const errorType = error.code as BiometryErrorType;

    switch (errorType) {
      case BiometryErrorType.biometryNotAvailable:
        return 'Autenticação biométrica não disponível neste dispositivo';
      case BiometryErrorType.biometryNotEnrolled:
        return 'Nenhuma biometria cadastrada. Configure nas configurações do dispositivo';
      case BiometryErrorType.userCancel:
        return 'Autenticação cancelada';
      case BiometryErrorType.biometryLockout:
        return 'Muitas tentativas falhadas. Tente novamente mais tarde';
      case BiometryErrorType.authenticationFailed:
        return 'Falha na autenticação. Tente novamente';
      default:
        return 'Erro na autenticação biométrica';
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isAvailable: this.isAvailable(),
      isEnabled: this.isEnabled(),
      biometryType: this.biometryType(),
      biometryName: this.biometryName(),
    };
  }
}

