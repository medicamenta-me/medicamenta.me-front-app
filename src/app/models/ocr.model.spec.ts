import {
  getConfidenceLevel,
  isConfidenceAcceptable,
  formatConfidence,
  getCurrentMonth,
  hasExceededQuota,
  getRemainingQuota,
  OCR_ERROR_MESSAGES,
  OCR_SUCCESS_MESSAGES,
  DEFAULT_OCR_CONFIG,
  OCRConfidence
} from './ocr.model';

describe('OCR Model Helpers', () => {
  describe('getConfidenceLevel', () => {
    it('should return "high" for confidence >= 90', () => {
      expect(getConfidenceLevel(90)).toBe('high');
      expect(getConfidenceLevel(95)).toBe('high');
      expect(getConfidenceLevel(100)).toBe('high');
    });

    it('should return "medium" for confidence 70-89', () => {
      expect(getConfidenceLevel(70)).toBe('medium');
      expect(getConfidenceLevel(75)).toBe('medium');
      expect(getConfidenceLevel(89)).toBe('medium');
    });

    it('should return "low" for confidence < 70', () => {
      expect(getConfidenceLevel(69)).toBe('low');
      expect(getConfidenceLevel(50)).toBe('low');
      expect(getConfidenceLevel(0)).toBe('low');
    });

    it('should handle edge cases', () => {
      expect(getConfidenceLevel(89.9)).toBe('medium');
      expect(getConfidenceLevel(69.9)).toBe('low');
    });
  });

  describe('isConfidenceAcceptable', () => {
    it('should return true for confidence >= default threshold (70)', () => {
      expect(isConfidenceAcceptable(70)).toBeTrue();
      expect(isConfidenceAcceptable(85)).toBeTrue();
      expect(isConfidenceAcceptable(100)).toBeTrue();
    });

    it('should return false for confidence < default threshold', () => {
      expect(isConfidenceAcceptable(69)).toBeFalse();
      expect(isConfidenceAcceptable(50)).toBeFalse();
      expect(isConfidenceAcceptable(0)).toBeFalse();
    });

    it('should use custom threshold when provided', () => {
      expect(isConfidenceAcceptable(60, 50)).toBeTrue();
      expect(isConfidenceAcceptable(60, 80)).toBeFalse();
    });

    it('should handle edge cases with threshold', () => {
      expect(isConfidenceAcceptable(50, 50)).toBeTrue();
      expect(isConfidenceAcceptable(49.9, 50)).toBeFalse();
    });
  });

  describe('formatConfidence', () => {
    it('should format whole numbers', () => {
      expect(formatConfidence(90)).toBe('90%');
      expect(formatConfidence(100)).toBe('100%');
      expect(formatConfidence(0)).toBe('0%');
    });

    it('should round decimals', () => {
      expect(formatConfidence(89.9)).toBe('90%');
      expect(formatConfidence(89.4)).toBe('89%');
      expect(formatConfidence(89.5)).toBe('90%');
    });

    it('should handle very small decimals', () => {
      expect(formatConfidence(0.1)).toBe('0%');
      expect(formatConfidence(0.5)).toBe('1%');
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should match current date', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(getCurrentMonth()).toBe(expected);
    });

    it('should pad single digit months', () => {
      const result = getCurrentMonth();
      const month = result.split('-')[1];
      expect(month.length).toBe(2);
    });
  });

  describe('hasExceededQuota', () => {
    it('should return true when usage >= limit', () => {
      expect(hasExceededQuota(10, 10)).toBeTrue();
      expect(hasExceededQuota(15, 10)).toBeTrue();
    });

    it('should return false when usage < limit', () => {
      expect(hasExceededQuota(9, 10)).toBeFalse();
      expect(hasExceededQuota(0, 10)).toBeFalse();
    });

    it('should handle zero limit', () => {
      expect(hasExceededQuota(0, 0)).toBeTrue();
      expect(hasExceededQuota(1, 0)).toBeTrue();
    });

    it('should handle large numbers', () => {
      expect(hasExceededQuota(999999, 999999)).toBeTrue();
      expect(hasExceededQuota(999998, 999999)).toBeFalse();
    });
  });

  describe('getRemainingQuota', () => {
    it('should return remaining quota', () => {
      expect(getRemainingQuota(3, 10)).toBe(7);
      expect(getRemainingQuota(0, 10)).toBe(10);
    });

    it('should return 0 when quota exceeded', () => {
      expect(getRemainingQuota(10, 10)).toBe(0);
      expect(getRemainingQuota(15, 10)).toBe(0);
    });

    it('should never return negative', () => {
      expect(getRemainingQuota(100, 10)).toBe(0);
    });

    it('should handle zero limit', () => {
      expect(getRemainingQuota(0, 0)).toBe(0);
      expect(getRemainingQuota(5, 0)).toBe(0);
    });
  });

  describe('OCR_ERROR_MESSAGES', () => {
    it('should have message for all error types', () => {
      const errorTypes = [
        'initialization_failed',
        'image_load_failed',
        'processing_failed',
        'low_confidence',
        'no_text_detected',
        'quota_exceeded',
        'invalid_image_format',
        'image_too_large',
        'network_error',
        'timeout',
        'permission_denied',
        'feature_not_available'
      ];

      errorTypes.forEach(type => {
        expect(OCR_ERROR_MESSAGES[type as keyof typeof OCR_ERROR_MESSAGES]).toBeDefined();
        expect(typeof OCR_ERROR_MESSAGES[type as keyof typeof OCR_ERROR_MESSAGES]).toBe('string');
      });
    });

    it('should have non-empty messages', () => {
      Object.values(OCR_ERROR_MESSAGES).forEach(message => {
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('OCR_SUCCESS_MESSAGES', () => {
    it('should have all success message types', () => {
      expect(OCR_SUCCESS_MESSAGES.scan_complete).toBeDefined();
      expect(OCR_SUCCESS_MESSAGES.high_confidence).toBeDefined();
      expect(OCR_SUCCESS_MESSAGES.medium_confidence).toBeDefined();
      expect(OCR_SUCCESS_MESSAGES.low_confidence).toBeDefined();
    });

    it('should have non-empty messages', () => {
      Object.values(OCR_SUCCESS_MESSAGES).forEach(message => {
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DEFAULT_OCR_CONFIG', () => {
    it('should have default engine', () => {
      expect(DEFAULT_OCR_CONFIG.defaultEngine).toBe('tesseract');
    });

    it('should have default language', () => {
      expect(DEFAULT_OCR_CONFIG.defaultLanguage).toBe('por');
    });

    it('should have tesseract configuration', () => {
      expect(DEFAULT_OCR_CONFIG.tesseract).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.tesseract.workerPath).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.tesseract.langPath).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.tesseract.corePath).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.tesseract.languages).toContain('por');
    });

    it('should have preprocessing options', () => {
      expect(DEFAULT_OCR_CONFIG.preprocessing).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.preprocessing.enabled).toBeTrue();
      expect(DEFAULT_OCR_CONFIG.preprocessing.autoRotate).toBeTrue();
    });

    it('should have reasonable limits', () => {
      expect(DEFAULT_OCR_CONFIG.minConfidence).toBe(70);
      expect(DEFAULT_OCR_CONFIG.maxImageSizeMB).toBe(10);
      expect(DEFAULT_OCR_CONFIG.timeoutMs).toBe(30000);
    });

    it('should have quota limits per plan', () => {
      expect(DEFAULT_OCR_CONFIG.quotaLimits).toBeDefined();
      expect(DEFAULT_OCR_CONFIG.quotaLimits.free).toBe(0);
      expect(DEFAULT_OCR_CONFIG.quotaLimits.premium).toBeGreaterThan(0);
      expect(DEFAULT_OCR_CONFIG.quotaLimits.family).toBeGreaterThan(DEFAULT_OCR_CONFIG.quotaLimits.premium);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly evaluate scan result quality', () => {
      const confidence = 85;
      const level = getConfidenceLevel(confidence);
      const acceptable = isConfidenceAcceptable(confidence);
      const formatted = formatConfidence(confidence);

      expect(level).toBe('medium');
      expect(acceptable).toBeTrue();
      expect(formatted).toBe('85%');
    });

    it('should correctly evaluate quota status', () => {
      const usage = 15;
      const limit = 20;
      
      const exceeded = hasExceededQuota(usage, limit);
      const remaining = getRemainingQuota(usage, limit);

      expect(exceeded).toBeFalse();
      expect(remaining).toBe(5);
    });

    it('should handle quota exhaustion', () => {
      const usage = 20;
      const limit = 20;
      
      const exceeded = hasExceededQuota(usage, limit);
      const remaining = getRemainingQuota(usage, limit);

      expect(exceeded).toBeTrue();
      expect(remaining).toBe(0);
    });
  });
});
