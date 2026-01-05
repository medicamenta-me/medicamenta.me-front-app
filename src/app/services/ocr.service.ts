import { Injectable, signal, inject } from '@angular/core';
import type { Worker, LoggerMessage } from 'tesseract.js';
import { 
  OCRResult, 
  OCRConfig, 
  OCRError, 
  MedicationOCRData,
  OCRErrorType,
  OCRStatus,
  TesseractResult,
  DEFAULT_OCR_CONFIG,
  getConfidenceLevel,
  isConfidenceAcceptable,
  getCurrentMonth,
  OCR_ERROR_MESSAGES
} from '../models/ocr.model';
import { AnalyticsService } from './analytics.service';
import { FeatureFlagsService } from './feature-flags.service';
import { RemoteConfigService } from './remote-config.service';
import { Firestore, doc, getDoc, setDoc, increment } from '@angular/fire/firestore';
import { LogService } from './log.service';

// Dynamic import for Tesseract.js (bundle optimization - ~500KB)
const loadTesseract = () => import('tesseract.js');

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  private analytics = inject(AnalyticsService);
  private featureFlags = inject(FeatureFlagsService);
  private remoteConfig = inject(RemoteConfigService);
  private firestore = inject(Firestore);

  private readonly logService = inject(LogService);
  
  // State Signals
  status = signal<OCRStatus>('idle');
  progress = signal<number>(0);
  currentResult = signal<OCRResult | null>(null);
  error = signal<OCRError | null>(null);

  // Tesseract Worker
  private worker: Worker | null = null;
  private workerReady = false;
  
  // Config
  private config: OCRConfig = DEFAULT_OCR_CONFIG;

  constructor() {
    this.loadConfig();
  }

  /**
   * Load OCR configuration from Remote Config
   */
  private loadConfig(): void {
    // Load from Remote Config if available
    const minConfidence = this.remoteConfig.getNumber('ocr_min_confidence');
    if (minConfidence > 0) {
      this.config.minConfidence = minConfidence;
    }

    const maxImageSize = this.remoteConfig.getNumber('ocr_max_image_size_mb');
    if (maxImageSize > 0) {
      this.config.maxImageSizeMB = maxImageSize;
    }

    const timeout = this.remoteConfig.getNumber('ocr_timeout_ms');
    if (timeout > 0) {
      this.config.timeoutMs = timeout;
    }

    // Get quota limits from Remote Config
    const limits = this.remoteConfig.getLimits();
    this.config.quotaLimits = {
      free: 0,
      premium: limits.maxOcrPhotosPerMonth,
      family: limits.maxOcrPhotosPerMonth * 2.5, // 50 for family
      enterprise: 999999
    };
  }

  /**
   * Initialize Tesseract Worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.workerReady && this.worker) {
      return;
    }

    try {
      this.status.set('loading');
      this.progress.set(0);

      this.logService.info('OcrService', 'Initializing Tesseract worker');
      
      // Dynamic import of Tesseract.js for bundle optimization
      const { createWorker, OEM } = await loadTesseract();
      
      this.worker = await createWorker(this.config.defaultLanguage, OEM.LSTM_ONLY, {
        logger: (m: LoggerMessage) => {
          // Update progress
          if (m.status === 'recognizing text') {
            this.progress.set(Math.round(m.progress * 100));
          }
        }
      });

      this.workerReady = true;
      this.logService.info('OcrService', 'Worker initialized successfully');
      
    } catch (err: unknown) {
      this.logService.error('OcrService', 'Failed to initialize worker', err as Error);
      throw this.createError('initialization_failed', err);
    }
  }

  /**
   * Process an image with OCR
   */
  async processImage(
    imageData: string | File,
    userId: string
  ): Promise<OCRResult> {
    try {
      // Check feature flag
      const access = this.featureFlags.hasAccess('ocr_scanner');
      if (!access.allowed) {
        throw this.createError('feature_not_available');
      }

      // Check quota
      const quota = await this.checkQuota(userId);
      if (quota.exceeded) {
        this.analytics.trackOcrLimitReached(quota.current, quota.limit);
        throw this.createError('quota_exceeded');
      }

      // Track start
      this.analytics.trackOcrScanStarted();
      
      // Validate image
      await this.validateImage(imageData);

      // Initialize worker if needed
      await this.initializeWorker();

      // Create result object
      const result: OCRResult = {
        id: this.generateId(),
        status: 'processing',
        engine: 'tesseract',
        userId,
        createdAt: new Date(),
        monthlyUsageCount: quota.current + 1
      };

      this.currentResult.set(result);
      this.status.set('processing');
      this.error.set(null);

      // Process with timeout
      const startTime = Date.now();
      const ocrData = await this.processWithTimeout(imageData);
      const processingTime = Date.now() - startTime;

      // Extract medication data
      const medicationData = this.extractMedicationData(ocrData);

      // Update result
      result.status = 'success';
      result.processingTimeMs = processingTime;
      result.confidence = ocrData.confidence;
      result.extractedData = medicationData;
      result.processedAt = new Date();

      // Store image data
      if (typeof imageData === 'string') {
        result.imageDataUrl = imageData;
      }

      this.currentResult.set(result);
      this.status.set('success');

      // Save to Firestore
      await this.saveResult(result);
      await this.incrementUsage(userId);

      // Track success
      const medicationsFound = medicationData.name ? 1 : 0;
      this.analytics.trackOcrScanSuccess(medicationsFound, processingTime);

      this.logService.info('OcrService', 'Processing completed', { confidence: result.confidence });
      return result;

    } catch (err: unknown) {
      this.logService.error('OcrService', 'Processing failed', err as Error);
      
      let ocrError: OCRError;
      if (this.isOCRError(err)) {
        ocrError = err;
      } else {
        ocrError = this.createError('processing_failed', err);
      }

      this.error.set(ocrError);
      this.status.set('error');

      // Track failure
      this.analytics.trackOcrScanFailed(ocrError.type);

      throw ocrError;
    }
  }

  /**
   * Process image with timeout
   */
  private processWithTimeout(imageData: string | File): Promise<TesseractResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(this.createError('timeout'));
      }, this.config.timeoutMs);

      const process = async () => {
        try {
          if (!this.worker) {
            throw this.createError('initialization_failed');
          }

          const { data } = await this.worker.recognize(imageData);
          
          clearTimeout(timeout);
          
          // Check minimum confidence
          if (!isConfidenceAcceptable(data.confidence, this.config.minConfidence)) {
            reject(this.createError('low_confidence'));
            return;
          }

          // Check if any text detected
          if (!data.text || data.text.trim().length === 0) {
            reject(this.createError('no_text_detected'));
            return;
          }

          // Map Tesseract v6 Page to TesseractResult
          resolve({
            text: data.text,
            confidence: data.confidence,
            lines: [],  // Simplified - v6 doesn't expose lines easily
            words: []   // Simplified - v6 doesn't expose words easily
          });
          
        } catch (err: unknown) {
          clearTimeout(timeout);
          reject(err);
        }
      };

      void process();
    });
  }

  /**
   * Extract medication data from OCR text
   */
  private extractMedicationData(ocrData: TesseractResult): MedicationOCRData {
    const text = ocrData.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const data: MedicationOCRData = {
      rawText: text,
      confidence: ocrData.confidence,
      confidenceLevel: getConfidenceLevel(ocrData.confidence),
      language: this.config.defaultLanguage
    };

    // Extract medication name (usually first line or after "Medicamento:")
    data.name = this.extractMedicationName(lines);

    // Extract dosage (pattern: number + mg/ml/g/etc)
    data.dosage = this.extractDosage(text);

    // Extract frequency (pattern: 8/8h, 12/12h, 2x/dia, etc)
    data.frequency = this.extractFrequency(text);

    // Extract form (comprimido, cápsula, xarope, etc)
    data.form = this.extractForm(text);

    // Extract prescription number
    data.prescriptionNumber = this.extractPrescriptionNumber(text);

    // Extract dates
    data.prescriptionDate = this.extractDate(text, ['data', 'receita', 'prescrição']);
    data.expirationDate = this.extractDate(text, ['validade', 'vencimento', 'exp']);

    // Extract doctor info
    data.doctor = this.extractDoctor(text);
    data.doctorCRM = this.extractCRM(text);

    // Extract instructions
    data.instructions = this.extractInstructions(lines);

    return data;
  }

  /**
   * Extract medication name from lines
   */
  private extractMedicationName(lines: string[]): string | undefined {
    // Look for common medication patterns
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Skip common header/footer words
      if (lower.includes('receita') || 
          lower.includes('prescrição') ||
          lower.includes('farmácia') ||
          lower.length < 3) {
        continue;
      }

      // First substantial line is often the medication name
      if (line.length > 3) {
        return line;
      }
    }

    return lines[0]; // Fallback to first line
  }

  /**
   * Extract dosage (e.g., "500mg", "10ml", "5g")
   */
  private extractDosage(text: string): string | undefined {
    const dosagePattern = /(\d+(?:[.,]\d+)?)\s*(mg|ml|g|mcg|ui|%)/gi;
    const match = text.match(dosagePattern);
    return match ? match[0] : undefined;
  }

  /**
   * Extract frequency (e.g., "8/8h", "12/12h", "2x ao dia")
   */
  private extractFrequency(text: string): string | undefined {
    // Pattern: 8/8h, 12/12h, etc
    const hourPattern = /(\d+\/\d+\s*h)/gi;
    let match = text.match(hourPattern);
    if (match) return match[0];

    // Pattern: 2x ao dia, 3x por dia
    const timesPattern = /(\d+\s*x\s*(ao|por)\s*dia)/gi;
    match = text.match(timesPattern);
    if (match) return match[0];

    // Pattern: a cada 8 horas
    const everyPattern = /(a\s*cada\s*\d+\s*horas?)/gi;
    match = text.match(everyPattern);
    if (match) return match[0];

    return undefined;
  }

  /**
   * Extract medication form
   */
  private extractForm(text: string): string | undefined {
    const lower = text.toLowerCase();
    const forms = [
      'comprimido', 'cápsula', 'xarope', 'suspensão', 'solução',
      'gotas', 'ampola', 'injetável', 'pomada', 'creme', 'gel',
      'spray', 'aerosol', 'pó', 'sachê', 'drágea'
    ];

    for (const form of forms) {
      if (lower.includes(form)) {
        return form;
      }
    }

    return undefined;
  }

  /**
   * Extract prescription number
   */
  private extractPrescriptionNumber(text: string): string | undefined {
    const patterns = [
      /n[°º]?\s*(\d+)/gi,
      /receita\s*n[°º]?\s*(\d+)/gi,
      /prescrição\s*n[°º]?\s*(\d+)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract date based on keywords
   */
  private extractDate(text: string, keywords: string[]): string | undefined {
    for (const keyword of keywords) {
      // Pattern: keyword: DD/MM/YYYY
      const pattern = new RegExp(`${keyword}[:\\s]*([0-3]?\\d[/\\-][0-1]?\\d[/\\-]\\d{2,4})`, 'gi');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: any date pattern DD/MM/YYYY
    const datePattern = /([0-3]?\d[/-][0-1]?\d[/-]\d{2,4})/g;
    const match = text.match(datePattern);
    return match ? match[0] : undefined;
  }

  /**
   * Extract doctor name
   */
  private extractDoctor(text: string): string | undefined {
    const patterns = [
      /dra?[.:]?\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/gi,
      /médicoa?:\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract CRM (doctor registration)
   */
  private extractCRM(text: string): string | undefined {
    const pattern = /CRM[:\s]*([A-Z]{2}[:\s]*\d+)/gi;
    const match = text.match(pattern);
    return match ? match[0] : undefined;
  }

  /**
   * Extract instructions
   */
  private extractInstructions(lines: string[]): string | undefined {
    // Look for lines with common instruction keywords
    const keywords = ['tomar', 'usar', 'aplicar', 'ingerir', 'administrar'];
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return line;
        }
      }
    }

    return undefined;
  }

  /**
   * Validate image before processing
   */
  private async validateImage(imageData: string | File): Promise<void> {
    if (typeof imageData === 'string') {
      // Base64 data URL
      if (!imageData.startsWith('data:image/')) {
        throw this.createError('invalid_image_format');
      }

      // Check size (rough estimate: base64 is ~1.37x original size)
      const sizeBytes = (imageData.length * 0.75);
      const sizeMB = sizeBytes / (1024 * 1024);
      
      if (sizeMB > this.config.maxImageSizeMB) {
        throw this.createError('image_too_large');
      }

    } else if (imageData instanceof File) {
      // File object
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(imageData.type)) {
        throw this.createError('invalid_image_format');
      }

      const sizeMB = imageData.size / (1024 * 1024);
      if (sizeMB > this.config.maxImageSizeMB) {
        throw this.createError('image_too_large');
      }
    }
  }

  /**
   * Check OCR quota for user
   */
  async checkQuota(userId: string): Promise<{ current: number; limit: number; exceeded: boolean }> {
    try {
      const currentMonth = getCurrentMonth();
      const usageRef = doc(this.firestore, `users/${userId}/ocr_usage/${currentMonth}`);
      const usageDoc = await getDoc(usageRef);

      const current = usageDoc.exists() ? (usageDoc.data()['count'] || 0) : 0;
      
      // Get user's plan limit (default to premium for now)
      const userPlan = 'premium';
      const limit = this.config.quotaLimits[userPlan] || 0;

      return {
        current,
        limit,
        exceeded: current >= limit
      };

    } catch (err: unknown) {
      this.logService.error('OcrService', 'Failed to check quota', err as Error);
      // On error, allow the scan (fail open)
      return { current: 0, limit: 999, exceeded: false };
    }
  }

  /**
   * Increment usage count
   */
  private async incrementUsage(userId: string): Promise<void> {
    try {
      const currentMonth = getCurrentMonth();
      const usageRef = doc(this.firestore, `users/${userId}/ocr_usage/${currentMonth}`);

      await setDoc(usageRef, {
        count: increment(1),
        lastScanDate: new Date(),
        month: currentMonth
      }, { merge: true });

    } catch (err: unknown) {
      this.logService.warn('OcrService', 'Failed to increment usage', { error: err });
      // Non-critical, continue
    }
  }

  /**
   * Save OCR result to Firestore
   */
  private async saveResult(result: OCRResult): Promise<void> {
    try {
      const resultRef = doc(this.firestore, `users/${result.userId}/ocr_scans/${result.id}`);
      
      await setDoc(resultRef, {
        ...result,
        createdAt: result.createdAt.toISOString(),
        processedAt: result.processedAt?.toISOString()
      });

    } catch (err: unknown) {
      this.logService.warn('OcrService', 'Failed to save result', { error: err });
      // Non-critical, continue
    }
  }

  /**
   * Check if error is OCRError
   */
  private isOCRError(err: unknown): err is OCRError {
    return typeof err === 'object' && err !== null && 'type' in err && 'message' in err && 'timestamp' in err;
  }

  /**
   * Create OCR error
   */
  private createError(type: OCRErrorType, originalError?: unknown): OCRError {
    const message = OCR_ERROR_MESSAGES[type] || 'Erro desconhecido';
    const details = originalError instanceof Error ? originalError.message : String(originalError);

    return {
      type,
      message,
      details,
      timestamp: new Date()
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Terminate Tesseract worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
      this.logService.info('OcrService', 'Worker terminated');
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.status.set('idle');
    this.progress.set(0);
    this.currentResult.set(null);
    this.error.set(null);
  }
}

