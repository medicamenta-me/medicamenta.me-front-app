/**
 * OCR Models & Types
 * 
 * Defines types for Optical Character Recognition (OCR) scanning of prescription images.
 * Supports local processing (Tesseract.js) and cloud fallback (Google Cloud Vision API).
 */

/**
 * OCR Processing Status
 */
export type OCRStatus = 
  | 'idle'           // Not started
  | 'loading'        // Loading Tesseract worker
  | 'processing'     // Processing image
  | 'success'        // Successfully extracted data
  | 'error'          // Failed to process
  | 'quota_exceeded'; // Monthly quota exceeded

/**
 * OCR Engine Type
 */
export type OCREngine = 
  | 'tesseract'      // Local Tesseract.js processing
  | 'cloud_vision';  // Google Cloud Vision API (fallback)

/**
 * OCR Language
 */
export type OCRLanguage = 
  | 'por'            // Portuguese (Brazil)
  | 'eng'            // English
  | 'spa';           // Spanish

/**
 * OCR Confidence Level
 */
export type OCRConfidence = 
  | 'high'           // >= 90%
  | 'medium'         // 70-89%
  | 'low';           // < 70%

/**
 * Raw OCR Text Result from Tesseract.js
 */
export interface TesseractResult {
  text: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
    baseline: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  words: Array<{
    text: string;
    confidence: number;
  }>;
}

/**
 * Extracted Medication Data from OCR
 */
export interface MedicationOCRData {
  // Medication Details
  name?: string;                    // Medication name
  activeIngredient?: string;        // Active ingredient/substance
  dosage?: string;                  // Dosage (e.g., "500mg", "10ml")
  form?: string;                    // Form (comprimido, cápsula, xarope, etc.)
  manufacturer?: string;            // Laboratory/manufacturer
  
  // Prescription Details
  prescriptionNumber?: string;      // Prescription number
  prescriptionDate?: string;        // Date of prescription
  doctor?: string;                  // Doctor name
  doctorCRM?: string;              // Doctor's registration (CRM)
  
  // Instructions
  frequency?: string;               // Frequency (e.g., "8/8h", "2x/dia")
  duration?: string;                // Treatment duration
  instructions?: string;            // Additional instructions
  
  // Pharmacy/Dispensing
  pharmacy?: string;                // Pharmacy name
  dispensingDate?: string;          // Date medication was dispensed
  batchNumber?: string;             // Batch/lot number
  expirationDate?: string;          // Expiration date
  
  // Metadata
  confidence: number;               // Overall confidence (0-100)
  confidenceLevel: OCRConfidence;   // Confidence level
  rawText: string;                  // Raw extracted text
  language: OCRLanguage;            // Detected language
}

/**
 * OCR Processing Result
 */
export interface OCRResult {
  id: string;                       // Unique result ID
  status: OCRStatus;                // Processing status
  engine: OCREngine;                // Engine used
  
  // Image Info
  imageUrl?: string;                // Original image URL
  imageDataUrl?: string;            // Base64 data URL
  imageSize?: number;               // Size in bytes
  imageDimensions?: {
    width: number;
    height: number;
  };
  
  // Extracted Data
  extractedData?: MedicationOCRData;
  
  // Processing Info
  processingTimeMs?: number;        // Time taken to process
  confidence?: number;              // Overall confidence (0-100)
  
  // Error Info
  error?: OCRError;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  
  // User Info
  userId: string;
  monthlyUsageCount?: number;       // Current month usage
}

/**
 * OCR Error Types
 */
export type OCRErrorType =
  | 'initialization_failed'         // Failed to initialize Tesseract
  | 'image_load_failed'            // Failed to load image
  | 'processing_failed'            // Processing error
  | 'low_confidence'               // Confidence too low
  | 'no_text_detected'             // No text found in image
  | 'quota_exceeded'               // Monthly quota exceeded
  | 'invalid_image_format'         // Unsupported image format
  | 'image_too_large'              // Image exceeds size limit
  | 'network_error'                // Network/API error
  | 'timeout'                      // Processing timeout
  | 'permission_denied'            // Camera/storage permission denied
  | 'feature_not_available';       // Feature not available for plan

/**
 * OCR Error
 */
export interface OCRError {
  type: OCRErrorType;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
}

/**
 * OCR Configuration
 */
export interface OCRConfig {
  // Engine Settings
  defaultEngine: OCREngine;
  defaultLanguage: OCRLanguage;
  fallbackToCloud: boolean;         // Use Cloud Vision if Tesseract fails
  
  // Tesseract Settings
  tesseract: {
    workerPath: string;
    langPath: string;
    corePath: string;
    languages: OCRLanguage[];
  };
  
  // Processing Settings
  preprocessing: {
    enabled: boolean;
    autoRotate: boolean;            // Auto-rotate image
    denoise: boolean;               // Remove noise
    sharpen: boolean;               // Sharpen image
    binarize: boolean;              // Convert to black & white
  };
  
  // Quality Settings
  minConfidence: number;            // Minimum confidence threshold (0-100)
  maxImageSizeMB: number;          // Max image size in MB
  timeoutMs: number;               // Processing timeout in ms
  
  // Quota Settings
  quotaLimits: {
    free: number;                   // Free plan limit (0)
    premium: number;                // Premium limit (20/month)
    family: number;                 // Family limit (50/month)
    enterprise: number;             // Enterprise limit (unlimited)
  };
  
  // Cloud Vision Settings
  cloudVision: {
    enabled: boolean;
    endpoint: string;
    features: string[];
  };
}

/**
 * OCR Usage Statistics
 */
export interface OCRUsageStats {
  userId: string;
  currentMonth: string;             // YYYY-MM format
  count: number;                    // Total scans this month
  successful: number;               // Successful scans
  failed: number;                   // Failed scans
  averageConfidence: number;        // Average confidence
  averageProcessingTimeMs: number;  // Average processing time
  lastScanDate?: Date;
  engines: {
    tesseract: number;
    cloudVision: number;
  };
}

/**
 * OCR Scan History Entry
 */
export interface OCRScanHistoryEntry {
  id: string;
  userId: string;
  result: OCRResult;
  medicationCreated: boolean;       // Was medication created from this scan?
  medicationId?: string;            // ID of created medication
  createdAt: Date;
}

/**
 * Helper: Get confidence level from percentage
 */
export function getConfidenceLevel(confidence: number): OCRConfidence {
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  return 'low';
}

/**
 * Helper: Check if confidence is acceptable
 */
export function isConfidenceAcceptable(confidence: number, minThreshold: number = 70): boolean {
  return confidence >= minThreshold;
}

/**
 * Helper: Format confidence percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence)}%`;
}

/**
 * Helper: Get current month string
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Helper: Check if quota exceeded
 */
export function hasExceededQuota(usage: number, limit: number): boolean {
  return usage >= limit;
}

/**
 * Helper: Get remaining quota
 */
export function getRemainingQuota(usage: number, limit: number): number {
  return Math.max(0, limit - usage);
}

/**
 * Common OCR Error Messages (PT-BR)
 */
export const OCR_ERROR_MESSAGES: Record<OCRErrorType, string> = {
  initialization_failed: 'Falha ao inicializar o scanner. Tente novamente.',
  image_load_failed: 'Não foi possível carregar a imagem.',
  processing_failed: 'Erro ao processar a imagem. Tente com outra foto.',
  low_confidence: 'Texto não foi reconhecido com clareza. Tire outra foto com melhor iluminação.',
  no_text_detected: 'Nenhum texto foi detectado na imagem.',
  quota_exceeded: 'Você atingiu o limite mensal de scans. Faça upgrade para continuar.',
  invalid_image_format: 'Formato de imagem não suportado. Use JPG, PNG ou WEBP.',
  image_too_large: 'Imagem muito grande. Use uma imagem menor que 10MB.',
  network_error: 'Erro de conexão. Verifique sua internet.',
  timeout: 'Tempo de processamento excedido. Tente com uma imagem menor.',
  permission_denied: 'Permissão de câmera/galeria não concedida.',
  feature_not_available: 'Scanner OCR disponível apenas para planos Premium e Family.'
};

/**
 * OCR Success Messages (PT-BR)
 */
export const OCR_SUCCESS_MESSAGES = {
  scan_complete: 'Scan concluído com sucesso!',
  high_confidence: 'Texto reconhecido com alta precisão.',
  medium_confidence: 'Texto reconhecido. Revise os dados extraídos.',
  low_confidence: 'Texto reconhecido com baixa precisão. Verifique cuidadosamente.',
};

/**
 * Default OCR Configuration
 */
export const DEFAULT_OCR_CONFIG: OCRConfig = {
  defaultEngine: 'tesseract',
  defaultLanguage: 'por',
  fallbackToCloud: false,
  
  tesseract: {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4/tesseract-core.wasm.js',
    languages: ['por', 'eng']
  },
  
  preprocessing: {
    enabled: true,
    autoRotate: true,
    denoise: true,
    sharpen: true,
    binarize: true
  },
  
  minConfidence: 70,
  maxImageSizeMB: 10,
  timeoutMs: 30000,
  
  quotaLimits: {
    free: 0,
    premium: 20,
    family: 50,
    enterprise: 999999
  },
  
  cloudVision: {
    enabled: false,
    endpoint: '/api/ocr/cloudVision',
    features: ['TEXT_DETECTION', 'DOCUMENT_TEXT_DETECTION']
  }
};
