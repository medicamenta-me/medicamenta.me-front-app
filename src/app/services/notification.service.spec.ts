/**
 * NotificationService Unit Tests
 * 
 * Tests for the Notification Service that manages browser push notifications (PWA).
 * 
 * Coverage:
 * - Permission management
 * - Local notification sending
 * - Medication reminders
 * - Stock alerts
 * - Service Worker integration
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { LogService } from './log.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockNotification: jasmine.Spy;
  let mockServiceWorker: any;

  beforeEach(() => {
    // Mock LogService
    mockLogService = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    // Mock Notification API
    mockNotification = jasmine.createSpy('Notification');
    (globalThis as any).Notification = mockNotification;
    (globalThis as any).Notification.permission = 'default';
    (globalThis as any).Notification.requestPermission = jasmine.createSpy('requestPermission').and.returnValue(
      Promise.resolve('granted')
    );

    // Mock Service Worker (use Object.defineProperty because serviceWorker is read-only)
    mockServiceWorker = {
      ready: Promise.resolve({
        showNotification: jasmine.createSpy('showNotification').and.returnValue(Promise.resolve()),
        getNotifications: jasmine.createSpy('getNotifications').and.returnValue(Promise.resolve([]))
      }),
      controller: {}
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    // Cleanup
    delete (globalThis as any).Notification;
    // Restore serviceWorker to original state (or remove mock)
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true
    });
  });

  // ==================== INITIALIZATION ====================

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with browser notification permission state', () => {
      expect(service.permissionState()).toBe('default');
    });

    it('should detect notification support', () => {
      expect(service.isSupported).toBe(true);
    });

    it('should compute isPermissionGranted correctly', () => {
      expect(service.isPermissionGranted()).toBe(false);
    });

    it('should compute isPermissionDenied correctly', () => {
      expect(service.isPermissionDenied()).toBe(false);
    });

    it('should compute canRequestPermission correctly', () => {
      expect(service.canRequestPermission()).toBe(true);
    });

    it('should handle unsupported browsers gracefully', () => {
      // Remove Notification API
      delete (globalThis as any).Notification;

      // Create new service without Notification support
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationService,
          { provide: LogService, useValue: mockLogService }
        ]
      });

      const serviceNoSupport = TestBed.inject(NotificationService);
      expect(serviceNoSupport.isSupported).toBe(false);
    });
  });

  // ==================== PERMISSION MANAGEMENT ====================

  describe('Permission Management', () => {
    it('should request notification permission successfully', async () => {
      const permission = await service.requestPermission();

      expect(permission).toBe('granted');
      expect((globalThis as any).Notification.requestPermission).toHaveBeenCalled();
      expect(service.permissionState()).toBe('granted');
      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Notification permission granted'
      );
    });

    it('should return granted if permission already granted', async () => {
      // Set initial permission to granted
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');

      const permission = await service.requestPermission();

      expect(permission).toBe('granted');
      // Should NOT call requestPermission again
      expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      (globalThis as any).Notification.requestPermission = jasmine.createSpy('requestPermission').and.returnValue(
        Promise.resolve('denied')
      );

      const permission = await service.requestPermission();

      expect(permission).toBe('denied');
      expect(service.permissionState()).toBe('denied');
      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Notification permission denied'
      );
    });

    it('should handle request permission error', async () => {
      const mockError = new Error('Permission request failed');
      (globalThis as any).Notification.requestPermission = jasmine.createSpy('requestPermission').and.returnValue(
        Promise.reject(mockError)
      );

      const permission = await service.requestPermission();

      expect(permission).toBe('denied');
      expect(mockLogService.error).toHaveBeenCalledWith(
        'NotificationService',
        'Error requesting notification permission',
        mockError
      );
    });

    it('should return denied if notifications not supported', async () => {
      // Remove Notification API
      delete (globalThis as any).Notification;
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationService,
          { provide: LogService, useValue: mockLogService }
        ]
      });

      const serviceNoSupport = TestBed.inject(NotificationService);
      const permission = await serviceNoSupport.requestPermission();

      expect(permission).toBe('denied');
      expect(mockLogService.warn).toHaveBeenCalledWith(
        'NotificationService',
        'Notifications are not supported in this browser'
      );
    });
  });

  // ==================== SEND NOTIFICATIONS ====================

  describe('Send Notifications', () => {
    beforeEach(() => {
      // Set permission to granted for these tests
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');
    });

    it('should send notification via Service Worker', async () => {
      await service.sendNotification('Test Title', { body: 'Test Body' });

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        'Test Title',
        jasmine.objectContaining({
          body: 'Test Body',
          icon: '/assets/icon/icon-192x192.png',
          badge: '/assets/icon/icon-72x72.png',
          tag: 'medication-reminder'
        })
      );
      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Notification sent',
        { title: 'Test Title' }
      );
    });

    it('should send notification via browser Notification API (fallback)', async () => {
      // Remove Service Worker to test fallback
      // Need to completely remove the property, not just set to undefined
      const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
      delete (navigator as any).serviceWorker;

      await service.sendNotification('Test Title', { body: 'Test Body' });

      expect(mockNotification).toHaveBeenCalledWith(
        'Test Title',
        jasmine.objectContaining({
          body: 'Test Body',
          icon: '/assets/icon/icon-192x192.png',
          tag: 'medication-reminder'
        })
      );
      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Notification sent',
        { title: 'Test Title' }
      );

      // Restore
      if (originalServiceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
      }
    });

    it('should not send notification if permission not granted', async () => {
      (service as any)._permissionState.set('denied');

      await service.sendNotification('Test Title', { body: 'Test Body' });

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).not.toHaveBeenCalled();
      expect(mockNotification).not.toHaveBeenCalled();
      expect(mockLogService.warn).toHaveBeenCalledWith(
        'NotificationService',
        'Notification permission not granted'
      );
    });

    it('should not send notification if not supported', async () => {
      // Remove Notification API
      delete (globalThis as any).Notification;
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationService,
          { provide: LogService, useValue: mockLogService }
        ]
      });

      const serviceNoSupport = TestBed.inject(NotificationService);
      await serviceNoSupport.sendNotification('Test Title', { body: 'Test Body' });

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'NotificationService',
        'Notifications are not supported'
      );
    });

    it('should handle send notification error', async () => {
      const mockError = new Error('Failed to show notification');
      const registration = await mockServiceWorker.ready;
      registration.showNotification.and.returnValue(Promise.reject(mockError));

      await service.sendNotification('Test Title', { body: 'Test Body' });

      expect(mockLogService.error).toHaveBeenCalledWith(
        'NotificationService',
        'Error sending notification',
        mockError
      );
    });
  });

  // ==================== MEDICATION REMINDERS ====================

  describe('Medication Reminders', () => {
    beforeEach(() => {
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');
    });

    it('should send medication reminder notification', async () => {
      await service.sendMedicationReminder('Aspirina', '100mg', '08:00', 'med123');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '💊 Lembrete de Medicação',
        jasmine.objectContaining({
          body: 'Hora de tomar: Aspirina (100mg)\nHorário: 08:00',
          tag: 'med123',
          data: jasmine.objectContaining({
            type: 'medication-reminder',
            medicationId: 'med123',
            medicationName: 'Aspirina',
            dosage: '100mg',
            time: '08:00'
          })
        })
      );
    });

    it('should send medication reminder without medication ID', async () => {
      await service.sendMedicationReminder('Paracetamol', '500mg', '14:00');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '💊 Lembrete de Medicação',
        jasmine.objectContaining({
          body: 'Hora de tomar: Paracetamol (500mg)\nHorário: 14:00',
          tag: 'medication-reminder',
          data: jasmine.objectContaining({
            type: 'medication-reminder',
            medicationName: 'Paracetamol',
            dosage: '500mg',
            time: '14:00'
          })
        })
      );
    });

    it('should send low stock alert notification', async () => {
      await service.sendLowStockAlert('Aspirina', 3, 'comprimidos');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '⚠️ Estoque Baixo',
        jasmine.objectContaining({
          body: 'Aspirina está com estoque baixo: 3 comprimidos',
          tag: 'low-stock-alert',
          data: jasmine.objectContaining({
            type: 'low-stock-alert',
            medicationName: 'Aspirina',
            currentStock: 3,
            unit: 'comprimidos'
          })
        })
      );
    });

    it('should send critical stock alert notification', async () => {
      await service.sendCriticalStockAlert('Insulina');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '🚨 Estoque Crítico',
        jasmine.objectContaining({
          body: 'Insulina está sem estoque! Reabasteça urgentemente.',
          tag: 'critical-stock-alert',
          requireInteraction: true,
          data: jasmine.objectContaining({
            type: 'critical-stock-alert',
            medicationName: 'Insulina'
          })
        })
      );
    });

    it('should send treatment completion congratulation', async () => {
      await service.sendCompletionCongratulation('Antibiótico');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '🎉 Parabéns!',
        jasmine.objectContaining({
          body: 'Você concluiu o tratamento de Antibiótico!',
          tag: 'treatment-completion',
          data: jasmine.objectContaining({
            type: 'treatment-completion',
            medicationName: 'Antibiótico'
          })
        })
      );
    });

    it('should send test notification', async () => {
      await service.sendTestNotification();

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '✅ Notificações Funcionando!',
        jasmine.objectContaining({
          body: 'Você receberá lembretes de medicação neste formato.',
          tag: 'test-notification'
        })
      );
    });
  });

  // ==================== NOTIFICATION MANAGEMENT ====================

  describe('Notification Management', () => {
    it('should clear all notifications', async () => {
      const mockNotifications = [
        { close: jasmine.createSpy('close') },
        { close: jasmine.createSpy('close') },
        { close: jasmine.createSpy('close') }
      ];
      const registration = await mockServiceWorker.ready;
      registration.getNotifications.and.returnValue(Promise.resolve(mockNotifications));

      await service.clearAllNotifications();

      expect(registration.getNotifications).toHaveBeenCalled();
      expect(mockNotifications[0].close).toHaveBeenCalled();
      expect(mockNotifications[1].close).toHaveBeenCalled();
      expect(mockNotifications[2].close).toHaveBeenCalled();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Cleared notifications',
        { count: 3 }
      );
    });

    it('should clear notifications when there are none', async () => {
      const registration = await mockServiceWorker.ready;
      registration.getNotifications.and.returnValue(Promise.resolve([]));

      await service.clearAllNotifications();

      expect(mockLogService.info).toHaveBeenCalledWith(
        'NotificationService',
        'Cleared notifications',
        { count: 0 }
      );
    });

    it('should get permission state text for granted', () => {
      (service as any)._permissionState.set('granted');

      expect(service.getPermissionStateText()).toBe('Habilitadas');
    });

    it('should get permission state text for denied', () => {
      (service as any)._permissionState.set('denied');

      expect(service.getPermissionStateText()).toBe('Bloqueadas');
    });

    it('should get permission state text for default', () => {
      (service as any)._permissionState.set('default');

      expect(service.getPermissionStateText()).toBe('Não Configuradas');
    });
  });

  // ==================== COMPUTED SIGNALS ====================

  describe('Computed Signals', () => {
    it('should update isPermissionGranted when permission changes to granted', () => {
      (service as any)._permissionState.set('granted');

      expect(service.isPermissionGranted()).toBe(true);
      expect(service.isPermissionDenied()).toBe(false);
      expect(service.canRequestPermission()).toBe(false);
    });

    it('should update isPermissionDenied when permission changes to denied', () => {
      (service as any)._permissionState.set('denied');

      expect(service.isPermissionGranted()).toBe(false);
      expect(service.isPermissionDenied()).toBe(true);
      expect(service.canRequestPermission()).toBe(false);
    });

    it('should update canRequestPermission when permission is default', () => {
      (service as any)._permissionState.set('default');

      expect(service.isPermissionGranted()).toBe(false);
      expect(service.isPermissionDenied()).toBe(false);
      expect(service.canRequestPermission()).toBe(true);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle Service Worker not ready', async () => {
      mockServiceWorker.ready = Promise.reject(new Error('Service Worker not ready'));
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');

      await service.sendNotification('Test', { body: 'Test' });

      expect(mockLogService.error).toHaveBeenCalled();
    });

    it('should handle multiple notifications with same tag', async () => {
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');

      await service.sendMedicationReminder('Med1', '100mg', '08:00', 'med1');
      await service.sendMedicationReminder('Med1', '100mg', '08:00', 'med1');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle notification with special characters', async () => {
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');

      await service.sendMedicationReminder('Ácido Acetilsalicílico', '100mg', '08:00');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith(
        '💊 Lembrete de Medicação',
        jasmine.objectContaining({
          body: jasmine.stringContaining('Ácido Acetilsalicílico')
        })
      );
    });

    it('should handle very long medication names', async () => {
      (globalThis as any).Notification.permission = 'granted';
      (service as any)._permissionState.set('granted');

      const longName = 'A'.repeat(200);
      await service.sendMedicationReminder(longName, '100mg', '08:00');

      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalled();
    });

    it('should handle concurrent permission requests', async () => {
      const promise1 = service.requestPermission();
      const promise2 = service.requestPermission();
      const promise3 = service.requestPermission();

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      expect(result1).toBe('granted');
      expect(result2).toBe('granted');
      expect(result3).toBe('granted');
    });
  });
});
