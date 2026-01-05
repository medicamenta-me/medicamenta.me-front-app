import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(() => {
    // Create spy objects
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present', 'dismiss']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create', 'dismiss', 'getTop']);
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream', 'addLangs', 'setDefaultLang', 'use'], {
      onTranslationChange: { subscribe: () => {} },
      onLangChange: { subscribe: () => {} },
      onDefaultLangChange: { subscribe: () => {} },
      currentLang: 'pt',
      defaultLang: 'pt'
    });

    // Setup default return values
    toastControllerSpy.create.and.returnValue(Promise.resolve(toastSpy));
    toastSpy.present.and.returnValue(Promise.resolve());
    translateServiceSpy.instant.and.returnValue('Translated message');
    translateServiceSpy.get.and.returnValue({ subscribe: () => {} } as any);
    translateServiceSpy.stream.and.callFake((key: string) => ({ subscribe: (fn: any) => fn(key) } as any));
    translateServiceSpy.use.and.returnValue({ subscribe: () => {} } as any);
    translateServiceSpy.addLangs.and.stub();
    translateServiceSpy.setDefaultLang.and.stub();

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: TranslateService, useValue: translateServiceSpy }
      ]
    });

    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showSuccess', () => {
    it('should show success toast with correct parameters', async () => {
      await service.showSuccess('SUCCESS_MESSAGE');

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('SUCCESS_MESSAGE', undefined);
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Translated message',
          color: 'success',
          duration: 3000,
          icon: 'checkmark-circle',
          cssClass: 'success-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should show success toast with translation params', async () => {
      await service.showSuccess('SUCCESS_MESSAGE', { count: 5 });

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('SUCCESS_MESSAGE', { count: 5 });
    });
  });

  describe('showError', () => {
    it('should show error toast with correct parameters', async () => {
      await service.showError('ERROR_MESSAGE');

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('ERROR_MESSAGE');
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Translated message',
          color: 'danger',
          duration: 5000,
          icon: 'close-circle',
          cssClass: 'error-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should show error toast with translation params', async () => {
      await service.showError('ERROR_MESSAGE', { error: 'Network error' });

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('ERROR_MESSAGE', { error: 'Network error' });
    });
  });

  describe('showWarning', () => {
    it('should show warning toast with correct parameters', async () => {
      await service.showWarning('WARNING_MESSAGE');

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('WARNING_MESSAGE');
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Translated message',
          color: 'warning',
          duration: 4000,
          icon: 'warning',
          cssClass: 'warning-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });
  });

  describe('showInfo', () => {
    it('should show info toast with correct parameters', async () => {
      await service.showInfo('INFO_MESSAGE');

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('INFO_MESSAGE', undefined);
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Translated message',
          color: 'primary',
          duration: 3000,
          icon: 'information-circle',
          cssClass: 'info-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });
  });

  describe('success (alias)', () => {
    it('should show success toast with direct message', async () => {
      await service.success('Direct success message');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Direct success message',
          color: 'success',
          duration: 3000,
          cssClass: 'success-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should accept custom duration', async () => {
      await service.success('Success message', 5000);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          duration: 5000
        })
      );
    });
  });

  describe('error (alias)', () => {
    it('should show error toast with direct message', async () => {
      await service.error('Direct error message');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Direct error message',
          color: 'danger',
          duration: 4000,
          cssClass: 'error-toast'
        })
      );
      expect(toastSpy.present).toHaveBeenCalled();
    });

    it('should accept custom duration', async () => {
      await service.error('Error message', 6000);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          duration: 6000
        })
      );
    });
  });

  describe('info (alias)', () => {
    it('should show info toast with direct message', async () => {
      await service.info('Direct info message');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Direct info message',
          color: 'primary',
          cssClass: 'info-toast'
        })
      );
    });
  });

  describe('warning (alias)', () => {
    it('should show warning toast with direct message', async () => {
      await service.warning('Direct warning message');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Direct warning message',
          color: 'warning',
          cssClass: 'warning-toast'
        })
      );
    });
  });

  describe('showSyncComplete', () => {
    it('should show success toast when no failures', async () => {
      await service.showSyncComplete(10, 0);

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.SYNC_SUCCESS', { count: 10 });
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success',
          cssClass: 'success-toast'
        })
      );
    });

    it('should show warning toast when there are failures', async () => {
      await service.showSyncComplete(8, 2);

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.SYNC_PARTIAL', {
        success: 8,
        failed: 2
      });
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'warning',
          cssClass: 'warning-toast'
        })
      );
    });
  });

  describe('showSyncError', () => {
    it('should show error toast for sync error', async () => {
      await service.showSyncError();

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.SYNC_ERROR');
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger',
          cssClass: 'error-toast'
        })
      );
    });
  });

  describe('showOffline', () => {
    it('should show warning toast for offline status', async () => {
      await service.showOffline();

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.OFFLINE');
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'warning',
          cssClass: 'warning-toast'
        })
      );
    });
  });

  describe('showOnline', () => {
    it('should show success toast for online status', async () => {
      await service.showOnline();

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.ONLINE', undefined);
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success',
          cssClass: 'success-toast'
        })
      );
    });
  });

  describe('showConflict', () => {
    it('should show warning toast with conflict count', async () => {
      await service.showConflict(3);

      expect(translateServiceSpy.instant).toHaveBeenCalledWith('OFFLINE.TOAST.CONFLICTS', { count: 3 });
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'warning',
          cssClass: 'warning-toast'
        })
      );
    });
  });

  describe('show', () => {
    it('should create toast with custom options', async () => {
      await service.show({
        message: 'Custom message',
        duration: 2000,
        color: 'success',
        position: 'top',
        icon: 'star'
      });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Custom message',
          duration: 2000,
          color: 'success',
          position: 'top',
          icon: 'star',
          cssClass: 'success-toast'
        })
      );
    });

    it('should use default values when options not provided', async () => {
      await service.show({ message: 'Message' });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          duration: 3000,
          color: 'dark',
          position: 'bottom'
        })
      );
    });

    it('should use correct cssClass for success color', async () => {
      await service.show({ message: 'Success', color: 'success' });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cssClass: 'success-toast'
        })
      );
    });

    it('should use correct cssClass for danger color', async () => {
      await service.show({ message: 'Error', color: 'danger' });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cssClass: 'error-toast'
        })
      );
    });

    it('should use correct cssClass for warning color', async () => {
      await service.show({ message: 'Warning', color: 'warning' });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cssClass: 'warning-toast'
        })
      );
    });

    it('should use correct cssClass for primary color', async () => {
      await service.show({ message: 'Info', color: 'primary' });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cssClass: 'info-toast'
        })
      );
    });

    it('should use explicit type parameter over color inference', async () => {
      await service.show({ message: 'Message', color: 'dark' }, 'success');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          cssClass: 'success-toast'
        })
      );
    });

    it('should include custom buttons when provided', async () => {
      const customButtons = [{ text: 'Custom', role: 'cancel' }];
      await service.show({
        message: 'Message',
        buttons: customButtons
      });

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          buttons: customButtons
        })
      );
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all toasts when toasts exist', async () => {
      toastControllerSpy.getTop.and.returnValue(Promise.resolve(toastSpy));

      await service.dismissAll();

      expect(toastControllerSpy.getTop).toHaveBeenCalled();
      expect(toastControllerSpy.dismiss).toHaveBeenCalled();
    });

    it('should not call dismiss when no toasts exist', async () => {
      toastControllerSpy.getTop.and.returnValue(Promise.resolve(undefined));

      await service.dismissAll();

      expect(toastControllerSpy.getTop).toHaveBeenCalled();
      expect(toastControllerSpy.dismiss).not.toHaveBeenCalled();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      await service.success('');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: ''
        })
      );
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(500);
      await service.success(longMessage);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: longMessage
        })
      );
    });

    it('should handle special characters in message', async () => {
      const specialMessage = '<script>alert("xss")</script>';
      await service.success(specialMessage);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: specialMessage
        })
      );
    });

    it('should handle zero duration', async () => {
      await service.success('Message', 0);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          duration: 0
        })
      );
    });

    it('should handle very large duration', async () => {
      await service.success('Message', 999999);

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          duration: 999999
        })
      );
    });
  });

  // Error handling
  describe('Error Handling', () => {
    it('should handle toastController.create failure', async () => {
      toastControllerSpy.create.and.returnValue(Promise.reject(new Error('Create failed')));

      await expectAsync(service.success('Message')).toBeRejected();
    });

    it('should handle toast.present failure', async () => {
      toastSpy.present.and.returnValue(Promise.reject(new Error('Present failed')));

      await expectAsync(service.success('Message')).toBeRejected();
    });

    it('should handle translate.instant returning undefined', async () => {
      translateServiceSpy.instant.and.returnValue(undefined as any);

      await service.showSuccess('MESSAGE');

      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: undefined
        })
      );
    });
  });
});
