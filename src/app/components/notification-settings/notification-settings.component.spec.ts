/**
 * 🧪 NotificationSettingsComponent Tests
 *
 * Testes unitários para o componente de configurações de notificação.
 * Cobertura: permissões, toggles, preferências e teste de notificação.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationSettingsComponent } from './notification-settings.component';
import { NotificationService } from '../../services/notification.service';
import { NotificationSchedulerService } from '../../services/notification-scheduler.service';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, WritableSignal, signal } from '@angular/core';

// Fake TranslateLoader for tests
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'NOTIFICATIONS.TITLE': 'Notification Settings',
      'NOTIFICATIONS.ENABLE': 'Enable Notifications',
      'NOTIFICATIONS.ENABLE_DESC': 'Receive medication reminders',
      'NOTIFICATIONS.PERMISSION_STATUS': 'Permission Status',
      'NOTIFICATIONS.PERMISSION_GRANTED': 'Granted',
      'NOTIFICATIONS.PERMISSION_DENIED': 'Denied',
      'NOTIFICATIONS.PERMISSION_DEFAULT': 'Not requested',
      'NOTIFICATIONS.NOT_SUPPORTED': 'Notifications not supported',
      'NOTIFICATIONS.PERMISSION_DENIED_HELP': 'Enable in browser settings',
      'NOTIFICATIONS.ADVANCE_TIME': 'Advance Reminder',
      'NOTIFICATIONS.ADVANCE_TIME_DESC': 'Time before scheduled dose',
      'NOTIFICATIONS.ON_TIME': 'On time',
      'NOTIFICATIONS.SOUND': 'Sound',
      'NOTIFICATIONS.SOUND_DESC': 'Play sound with notification',
      'NOTIFICATIONS.VIBRATION': 'Vibration',
      'NOTIFICATIONS.VIBRATION_DESC': 'Vibrate with notification',
      'NOTIFICATIONS.SCHEDULED_COUNT': '{{count}} notifications scheduled',
      'NOTIFICATIONS.TEST': 'Test Notification',
      'NOTIFICATIONS.REQUEST_PERMISSION': 'Request Permission',
      'COMMON.MINUTES': 'minutes'
    });
  }
}

describe('NotificationSettingsComponent', () => {
  let component: NotificationSettingsComponent;
  let fixture: ComponentFixture<NotificationSettingsComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let schedulerServiceSpy: jasmine.SpyObj<NotificationSchedulerService>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;

  // Signals to control permission state in tests
  let permissionStateSignal: WritableSignal<NotificationPermission>;
  let isEnabledSignal: WritableSignal<boolean>;

  const mockPreferences = {
    enabled: true,
    advanceMinutes: 15,
    soundEnabled: true,
    vibrationEnabled: true
  };

  beforeEach(async () => {
    permissionStateSignal = signal<NotificationPermission>('default');
    isEnabledSignal = signal(false);

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [], {
      permissionState: permissionStateSignal,
      isSupported: true
    });

    schedulerServiceSpy = jasmine.createSpyObj('NotificationSchedulerService', [
      'isEnabled',
      'enable',
      'disable',
      'getPreferences',
      'updatePreferences',
      'getScheduledCount',
      'sendTestNotification'
    ]);

    schedulerServiceSpy.isEnabled.and.callFake(() => isEnabledSignal());
    schedulerServiceSpy.getPreferences.and.returnValue(mockPreferences);
    schedulerServiceSpy.getScheduledCount.and.returnValue(5);
    schedulerServiceSpy.enable.and.resolveTo(true);
    schedulerServiceSpy.sendTestNotification.and.resolveTo();

    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo()
    } as any);

    await TestBed.configureTestingModule({
      imports: [
        NotificationSettingsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: NotificationSchedulerService, useValue: schedulerServiceSpy },
        { provide: ToastController, useValue: toastControllerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load preferences from scheduler service', () => {
      expect(schedulerServiceSpy.getPreferences).toHaveBeenCalled();
      expect(component.advanceMinutes).toBe(15);
      expect(component.soundEnabled).toBe(true);
      expect(component.vibrationEnabled).toBe(true);
    });

    it('should initialize scheduled count', () => {
      expect(schedulerServiceSpy.getScheduledCount).toHaveBeenCalled();
      expect(component.scheduledCount()).toBe(5);
    });

    it('should check permission state from service', () => {
      expect(component.permissionState()).toBe('default');
    });

    it('should check isSupported from service', () => {
      expect(component.isSupported).toBe(true);
    });
  });

  // ============================================================================
  // PERMISSION ICON TESTS
  // ============================================================================

  describe('getPermissionIcon()', () => {
    it('should return checkmark-circle for granted', () => {
      permissionStateSignal.set('granted');
      expect(component.getPermissionIcon()).toBe('checkmark-circle');
    });

    it('should return alert-circle for denied', () => {
      permissionStateSignal.set('denied');
      expect(component.getPermissionIcon()).toBe('alert-circle');
    });

    it('should return alert-circle for default', () => {
      permissionStateSignal.set('default');
      expect(component.getPermissionIcon()).toBe('alert-circle');
    });
  });

  // ============================================================================
  // PERMISSION COLOR TESTS
  // ============================================================================

  describe('getPermissionColor()', () => {
    it('should return success for granted', () => {
      permissionStateSignal.set('granted');
      expect(component.getPermissionColor()).toBe('success');
    });

    it('should return danger for denied', () => {
      permissionStateSignal.set('denied');
      expect(component.getPermissionColor()).toBe('danger');
    });

    it('should return warning for default', () => {
      permissionStateSignal.set('default');
      expect(component.getPermissionColor()).toBe('warning');
    });
  });

  // ============================================================================
  // PERMISSION TEXT TESTS
  // ============================================================================

  describe('getPermissionText()', () => {
    it('should return granted translation key', () => {
      permissionStateSignal.set('granted');
      expect(component.getPermissionText()).toBe('NOTIFICATIONS.PERMISSION_GRANTED');
    });

    it('should return denied translation key', () => {
      permissionStateSignal.set('denied');
      expect(component.getPermissionText()).toBe('NOTIFICATIONS.PERMISSION_DENIED');
    });

    it('should return default translation key', () => {
      permissionStateSignal.set('default');
      expect(component.getPermissionText()).toBe('NOTIFICATIONS.PERMISSION_DEFAULT');
    });
  });

  // ============================================================================
  // NOTIFICATIONS ENABLED COMPUTED TESTS
  // ============================================================================

  describe('notificationsEnabled', () => {
    it('should return true when scheduler is enabled', () => {
      isEnabledSignal.set(true);
      // Force re-evaluation
      fixture.detectChanges();
      expect(component.notificationsEnabled()).toBe(true);
    });

    it('should return false when scheduler is disabled', () => {
      isEnabledSignal.set(false);
      fixture.detectChanges();
      expect(component.notificationsEnabled()).toBe(false);
    });
  });

  // ============================================================================
  // REQUEST PERMISSION TESTS
  // ============================================================================

  describe('requestPermission()', () => {
    it('should call scheduler enable', async () => {
      await component.requestPermission();
      expect(schedulerServiceSpy.enable).toHaveBeenCalled();
    });

    it('should show success toast when permission granted', async () => {
      schedulerServiceSpy.enable.and.resolveTo(true);
      
      await component.requestPermission();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success'
        })
      );
    });

    it('should update scheduled count after successful enable', async () => {
      schedulerServiceSpy.enable.and.resolveTo(true);
      schedulerServiceSpy.getScheduledCount.calls.reset();
      
      await component.requestPermission();
      
      expect(schedulerServiceSpy.getScheduledCount).toHaveBeenCalled();
    });

    it('should show error toast when permission denied', async () => {
      schedulerServiceSpy.enable.and.resolveTo(false);
      
      await component.requestPermission();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger'
        })
      );
    });
  });

  // ============================================================================
  // TOGGLE NOTIFICATIONS TESTS
  // ============================================================================

  describe('toggleNotifications()', () => {
    it('should enable notifications when toggle is checked', async () => {
      const event = { detail: { checked: true }, target: { checked: true } };
      
      await component.toggleNotifications(event);
      
      expect(schedulerServiceSpy.enable).toHaveBeenCalled();
    });

    it('should disable notifications when toggle is unchecked', async () => {
      const event = { detail: { checked: false }, target: { checked: false } };
      
      await component.toggleNotifications(event);
      
      expect(schedulerServiceSpy.disable).toHaveBeenCalled();
    });

    it('should revert toggle when permission denied', async () => {
      schedulerServiceSpy.enable.and.resolveTo(false);
      const event = { detail: { checked: true }, target: { checked: true } };
      
      await component.toggleNotifications(event);
      
      expect(event.target.checked).toBe(false);
    });

    it('should reset scheduled count when disabled', async () => {
      const event = { detail: { checked: false }, target: { checked: false } };
      
      await component.toggleNotifications(event);
      
      expect(component.scheduledCount()).toBe(0);
    });
  });

  // ============================================================================
  // UPDATE PREFERENCES TESTS
  // ============================================================================

  describe('updateAdvanceTime()', () => {
    it('should update preferences with new advance time', () => {
      component.advanceMinutes = 30;
      
      component.updateAdvanceTime();
      
      expect(schedulerServiceSpy.updatePreferences).toHaveBeenCalledWith({ advanceMinutes: 30 });
    });

    it('should update scheduled count after change', () => {
      schedulerServiceSpy.getScheduledCount.calls.reset();
      
      component.updateAdvanceTime();
      
      expect(schedulerServiceSpy.getScheduledCount).toHaveBeenCalled();
    });
  });

  describe('updateSound()', () => {
    it('should update preferences with sound enabled', () => {
      component.soundEnabled = false;
      
      component.updateSound();
      
      expect(schedulerServiceSpy.updatePreferences).toHaveBeenCalledWith({ soundEnabled: false });
    });
  });

  describe('updateVibration()', () => {
    it('should update preferences with vibration enabled', () => {
      component.vibrationEnabled = false;
      
      component.updateVibration();
      
      expect(schedulerServiceSpy.updatePreferences).toHaveBeenCalledWith({ vibrationEnabled: false });
    });
  });

  // ============================================================================
  // TEST NOTIFICATION TESTS
  // ============================================================================

  describe('testNotification()', () => {
    it('should call scheduler sendTestNotification', async () => {
      await component.testNotification();
      
      expect(schedulerServiceSpy.sendTestNotification).toHaveBeenCalled();
    });

    it('should show success toast after sending', async () => {
      await component.testNotification();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success',
          duration: 2000
        })
      );
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should show main settings card', () => {
      const card = fixture.nativeElement.querySelector('ion-card');
      expect(card).toBeTruthy();
    });

    it('should show notification icon in header', () => {
      const icon = fixture.nativeElement.querySelector('.header-icon');
      expect(icon).toBeTruthy();
    });

    it('should show request permission button when state is default', () => {
      permissionStateSignal.set('default');
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('.request-button');
      expect(button).toBeTruthy();
    });

    it('should show denied help message when permission denied', () => {
      permissionStateSignal.set('denied');
      fixture.detectChanges();
      
      const deniedBox = fixture.nativeElement.querySelector('.info-box.denied');
      expect(deniedBox).toBeTruthy();
    });

    it('should show options when enabled and granted', () => {
      permissionStateSignal.set('granted');
      isEnabledSignal.set(true);
      fixture.detectChanges();
      
      const options = fixture.nativeElement.querySelector('.notification-options');
      expect(options).toBeTruthy();
    });
  });

  // ============================================================================
  // NOT SUPPORTED TESTS
  // ============================================================================

  describe('Not Supported Browser', () => {
    beforeEach(async () => {
      // Recreate component with isSupported = false
      notificationServiceSpy = jasmine.createSpyObj('NotificationService', [], {
        permissionState: permissionStateSignal,
        isSupported: false
      });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [
          NotificationSettingsComponent,
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: NotificationService, useValue: notificationServiceSpy },
          { provide: NotificationSchedulerService, useValue: schedulerServiceSpy },
          { provide: ToastController, useValue: toastControllerSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }).compileComponents();

      fixture = TestBed.createComponent(NotificationSettingsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show warning box when not supported', () => {
      const warningBox = fixture.nativeElement.querySelector('.warning-box');
      expect(warningBox).toBeTruthy();
    });
  });
});
