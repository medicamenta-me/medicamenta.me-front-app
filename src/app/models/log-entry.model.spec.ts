/**
 * Log Entry Model Tests
 * Tests for log entry types, enums and interfaces
 */
import { LogLevel, LogEventType, LogEntry, StructuredLog } from './log-entry.model';

describe('Log Entry Model', () => {
  describe('LogLevel enum', () => {
    it('should have DEBUG level', () => {
      expect(LogLevel.DEBUG).toBe('debug');
    });

    it('should have INFO level', () => {
      expect(LogLevel.INFO).toBe('info');
    });

    it('should have WARN level', () => {
      expect(LogLevel.WARN).toBe('warn');
    });

    it('should have ERROR level', () => {
      expect(LogLevel.ERROR).toBe('error');
    });

    it('should have FATAL level', () => {
      expect(LogLevel.FATAL).toBe('fatal');
    });

    it('should have exactly 5 levels', () => {
      const levels = Object.values(LogLevel);
      expect(levels.length).toBe(5);
    });

    it('should have all string values', () => {
      Object.values(LogLevel).forEach(level => {
        expect(typeof level).toBe('string');
      });
    });
  });

  describe('LogEventType type', () => {
    it('should accept taken event type', () => {
      const eventType: LogEventType = 'taken';
      expect(eventType).toBe('taken');
    });

    it('should accept missed event type', () => {
      const eventType: LogEventType = 'missed';
      expect(eventType).toBe('missed');
    });

    it('should accept upcoming event type', () => {
      const eventType: LogEventType = 'upcoming';
      expect(eventType).toBe('upcoming');
    });

    it('should accept add_med event type', () => {
      const eventType: LogEventType = 'add_med';
      expect(eventType).toBe('add_med');
    });

    it('should accept update_med event type', () => {
      const eventType: LogEventType = 'update_med';
      expect(eventType).toBe('update_med');
    });

    it('should accept delete_med event type', () => {
      const eventType: LogEventType = 'delete_med';
      expect(eventType).toBe('delete_med');
    });

    it('should accept restock event type', () => {
      const eventType: LogEventType = 'restock';
      expect(eventType).toBe('restock');
    });

    it('should accept note event type', () => {
      const eventType: LogEventType = 'note';
      expect(eventType).toBe('note');
    });

    it('should accept view event type', () => {
      const eventType: LogEventType = 'view';
      expect(eventType).toBe('view');
    });
  });

  describe('LogEntry interface', () => {
    it('should have required properties', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'taken',
        message: 'Medication taken'
      };
      expect(entry.id).toBe('log-123');
      expect(entry.timestamp).toBeDefined();
      expect(entry.eventType).toBe('taken');
      expect(entry.message).toBe('Medication taken');
    });

    it('should allow optional userId', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'taken',
        message: 'Medication taken',
        userId: 'user-456'
      };
      expect(entry.userId).toBe('user-456');
    });

    it('should allow optional level', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'missed',
        message: 'Medication missed',
        level: LogLevel.WARN
      };
      expect(entry.level).toBe(LogLevel.WARN);
    });

    it('should allow optional context', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'taken',
        message: 'Medication taken',
        context: 'MedicationService'
      };
      expect(entry.context).toBe('MedicationService');
    });

    it('should allow optional metadata', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'taken',
        message: 'Medication taken',
        metadata: {
          medicationId: 'med-789',
          dosage: '500mg'
        }
      };
      expect(entry.metadata).toEqual({
        medicationId: 'med-789',
        dosage: '500mg'
      });
    });

    it('should allow optional stackTrace', () => {
      const entry: LogEntry = {
        id: 'log-123',
        timestamp: new Date(),
        eventType: 'taken',
        message: 'Error occurred',
        level: LogLevel.ERROR,
        stackTrace: 'Error: Something went wrong\n    at function1\n    at function2'
      };
      expect(entry.stackTrace).toContain('Error: Something went wrong');
    });

    it('should allow all optional properties', () => {
      const entry: LogEntry = {
        id: 'log-full',
        timestamp: new Date(),
        eventType: 'add_med',
        message: 'Medication added successfully',
        userId: 'user-123',
        level: LogLevel.INFO,
        context: 'MedicationService',
        metadata: { medicationName: 'Aspirin' },
        stackTrace: undefined
      };
      expect(entry.id).toBe('log-full');
      expect(entry.userId).toBe('user-123');
      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.context).toBe('MedicationService');
      expect(entry.metadata).toEqual({ medicationName: 'Aspirin' });
    });

    // Event Type Scenarios
    describe('Event Type Scenarios', () => {
      it('should create taken event', () => {
        const entry: LogEntry = {
          id: 'log-1',
          timestamp: new Date(),
          eventType: 'taken',
          message: 'Aspirin 500mg taken at 08:00'
        };
        expect(entry.eventType).toBe('taken');
      });

      it('should create missed event', () => {
        const entry: LogEntry = {
          id: 'log-2',
          timestamp: new Date(),
          eventType: 'missed',
          message: 'Aspirin 500mg missed at 08:00'
        };
        expect(entry.eventType).toBe('missed');
      });

      it('should create upcoming event', () => {
        const entry: LogEntry = {
          id: 'log-3',
          timestamp: new Date(),
          eventType: 'upcoming',
          message: 'Aspirin 500mg due at 14:00'
        };
        expect(entry.eventType).toBe('upcoming');
      });

      it('should create add_med event', () => {
        const entry: LogEntry = {
          id: 'log-4',
          timestamp: new Date(),
          eventType: 'add_med',
          message: 'New medication added: Aspirin 500mg'
        };
        expect(entry.eventType).toBe('add_med');
      });

      it('should create update_med event', () => {
        const entry: LogEntry = {
          id: 'log-5',
          timestamp: new Date(),
          eventType: 'update_med',
          message: 'Medication updated: Aspirin dosage changed to 1000mg'
        };
        expect(entry.eventType).toBe('update_med');
      });

      it('should create delete_med event', () => {
        const entry: LogEntry = {
          id: 'log-6',
          timestamp: new Date(),
          eventType: 'delete_med',
          message: 'Medication deleted: Aspirin'
        };
        expect(entry.eventType).toBe('delete_med');
      });

      it('should create restock event', () => {
        const entry: LogEntry = {
          id: 'log-7',
          timestamp: new Date(),
          eventType: 'restock',
          message: 'Stock restocked: Aspirin +30 units'
        };
        expect(entry.eventType).toBe('restock');
      });

      it('should create note event', () => {
        const entry: LogEntry = {
          id: 'log-8',
          timestamp: new Date(),
          eventType: 'note',
          message: 'Note added: Feeling better after medication'
        };
        expect(entry.eventType).toBe('note');
      });

      it('should create view event', () => {
        const entry: LogEntry = {
          id: 'log-9',
          timestamp: new Date(),
          eventType: 'view',
          message: 'Medication details viewed: Aspirin'
        };
        expect(entry.eventType).toBe('view');
      });
    });
  });

  describe('StructuredLog interface', () => {
    it('should have required properties', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: 'Application started',
        context: 'AppComponent',
        environment: 'development',
        appVersion: '1.0.0'
      };
      expect(log.timestamp).toBeDefined();
      expect(log.level).toBe(LogLevel.INFO);
      expect(log.message).toBe('Application started');
      expect(log.context).toBe('AppComponent');
      expect(log.environment).toBe('development');
      expect(log.appVersion).toBe('1.0.0');
    });

    it('should have ISO 8601 timestamp format', () => {
      const log: StructuredLog = {
        timestamp: '2025-12-28T22:30:00.000Z',
        level: LogLevel.INFO,
        message: 'Test message',
        context: 'TestContext',
        environment: 'development',
        appVersion: '1.0.0'
      };
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should allow development environment', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        message: 'Debug message',
        context: 'DebugService',
        environment: 'development',
        appVersion: '1.0.0-dev'
      };
      expect(log.environment).toBe('development');
    });

    it('should allow production environment', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        message: 'Production error',
        context: 'ErrorHandler',
        environment: 'production',
        appVersion: '2.1.3'
      };
      expect(log.environment).toBe('production');
    });

    it('should allow optional userId', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: 'User action',
        context: 'UserService',
        environment: 'production',
        appVersion: '1.0.0',
        userId: 'user-abc-123'
      };
      expect(log.userId).toBe('user-abc-123');
    });

    it('should allow optional sessionId', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        message: 'Session started',
        context: 'AuthService',
        environment: 'production',
        appVersion: '1.0.0',
        sessionId: 'session-xyz-789'
      };
      expect(log.sessionId).toBe('session-xyz-789');
    });

    it('should allow optional metadata', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.WARN,
        message: 'Low memory warning',
        context: 'PerformanceMonitor',
        environment: 'production',
        appVersion: '1.0.0',
        metadata: {
          memoryUsage: '85%',
          heapSize: '128MB'
        }
      };
      expect(log.metadata).toEqual({
        memoryUsage: '85%',
        heapSize: '128MB'
      });
    });

    it('should allow optional stackTrace for errors', () => {
      const log: StructuredLog = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        message: 'Unhandled exception',
        context: 'GlobalErrorHandler',
        environment: 'production',
        appVersion: '1.0.0',
        stackTrace: 'TypeError: Cannot read property x of undefined\n    at SomeClass.method'
      };
      expect(log.stackTrace).toContain('TypeError');
    });

    it('should allow all optional properties', () => {
      const log: StructuredLog = {
        timestamp: '2025-12-28T22:35:00.000Z',
        level: LogLevel.ERROR,
        message: 'Critical error in payment processing',
        context: 'PaymentService',
        environment: 'production',
        appVersion: '2.0.0',
        userId: 'user-premium-123',
        sessionId: 'session-active-456',
        metadata: {
          paymentId: 'pay-789',
          amount: 99.99,
          currency: 'BRL'
        },
        stackTrace: 'Error: Payment gateway timeout\n    at PaymentService.process'
      };
      expect(log.userId).toBe('user-premium-123');
      expect(log.sessionId).toBe('session-active-456');
      expect(log.metadata?.['paymentId']).toBe('pay-789');
      expect(log.stackTrace).toContain('Payment gateway timeout');
    });

    // Log Level Scenarios
    describe('Log Level Scenarios', () => {
      it('should create DEBUG log', () => {
        const log: StructuredLog = {
          timestamp: new Date().toISOString(),
          level: LogLevel.DEBUG,
          message: 'Variable value: x = 42',
          context: 'Debugger',
          environment: 'development',
          appVersion: '1.0.0'
        };
        expect(log.level).toBe('debug');
      });

      it('should create INFO log', () => {
        const log: StructuredLog = {
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          message: 'User logged in successfully',
          context: 'AuthService',
          environment: 'production',
          appVersion: '1.0.0'
        };
        expect(log.level).toBe('info');
      });

      it('should create WARN log', () => {
        const log: StructuredLog = {
          timestamp: new Date().toISOString(),
          level: LogLevel.WARN,
          message: 'API rate limit approaching',
          context: 'ApiService',
          environment: 'production',
          appVersion: '1.0.0'
        };
        expect(log.level).toBe('warn');
      });

      it('should create ERROR log', () => {
        const log: StructuredLog = {
          timestamp: new Date().toISOString(),
          level: LogLevel.ERROR,
          message: 'Database connection failed',
          context: 'DatabaseService',
          environment: 'production',
          appVersion: '1.0.0'
        };
        expect(log.level).toBe('error');
      });

      it('should create FATAL log', () => {
        const log: StructuredLog = {
          timestamp: new Date().toISOString(),
          level: LogLevel.FATAL,
          message: 'Application crashed',
          context: 'CrashHandler',
          environment: 'production',
          appVersion: '1.0.0'
        };
        expect(log.level).toBe('fatal');
      });
    });
  });
});
