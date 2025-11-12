/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export type LogEventType = 'taken' | 'missed' | 'upcoming' | 'add_med' | 'update_med' | 'delete_med' | 'restock' | 'note' | 'view';

export interface LogEntry {
  id: string;
  userId?: string; // For IndexedDB indexing (patient ID)
  timestamp: Date;
  eventType: LogEventType;
  message: string;
  level?: LogLevel; // Optional severity level
  context?: string; // Service/component name
  metadata?: Record<string, any>; // Additional structured data
  stackTrace?: string; // For error logging
}

/**
 * Structured log for production monitoring (Sentry/Firebase Analytics)
 */
export interface StructuredLog {
  timestamp: string; // ISO 8601
  level: LogLevel;
  message: string;
  context: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  environment: 'development' | 'production';
  appVersion: string;
}

