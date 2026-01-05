import { TermsOfUse } from '../models/terms-of-use.model';
import { TermsAcceptance } from '../models/user.model';

/**
 * Unit tests for TermsOfUseService
 * Tests interfaces, types, and utility logic
 */
describe('TermsOfUseService', () => {
  
  describe('TermsOfUse Interface', () => {
    
    it('should create valid TermsOfUse', () => {
      const terms: TermsOfUse = {
        id: 'terms-br-v1',
        version: '1.0.0',
        country: 'BR',
        effectiveDate: new Date('2024-01-01'),
        createdAt: new Date('2023-12-15'),
        text: 'Terms of use content...',
        summary: 'Short summary of terms',
        language: 'pt',
        isActive: true
      };

      expect(terms.id).toBe('terms-br-v1');
      expect(terms.version).toBe('1.0.0');
      expect(terms.country).toBe('BR');
      expect(terms.isActive).toBeTrue();
    });

    it('should create inactive terms', () => {
      const terms: TermsOfUse = {
        id: 'terms-old',
        version: '0.9.0',
        country: 'BR',
        effectiveDate: new Date('2023-01-01'),
        createdAt: new Date('2022-12-01'),
        text: 'Old terms',
        language: 'pt',
        isActive: false
      };

      expect(terms.isActive).toBeFalse();
    });

    it('should create terms without summary', () => {
      const terms: TermsOfUse = {
        id: 'terms-basic',
        version: '1.0.0',
        country: 'US',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Full terms text',
        language: 'en',
        isActive: true
      };

      expect(terms.summary).toBeUndefined();
    });

    it('should validate version format', () => {
      const validVersions = ['1.0.0', '2.1.0', '10.5.3'];
      
      validVersions.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it('should support multiple countries', () => {
      const countries = ['BR', 'US', 'ES', 'PT', 'MX'];
      
      countries.forEach(country => {
        const terms: TermsOfUse = {
          id: `terms-${country.toLowerCase()}`,
          version: '1.0.0',
          country,
          effectiveDate: new Date(),
          createdAt: new Date(),
          text: 'Terms',
          language: 'en',
          isActive: true
        };
        expect(terms.country).toBe(country);
      });
    });
  });

  describe('TermsAcceptance Interface', () => {
    
    it('should create valid acceptance record', () => {
      const acceptance: TermsAcceptance = {
        termsId: 'terms-br-v1',
        version: '1.0.0',
        country: 'BR',
        acceptedAt: new Date(),
        ipAddress: '192.168.1.1'
      };

      expect(acceptance.termsId).toBe('terms-br-v1');
      expect(acceptance.version).toBe('1.0.0');
      expect(acceptance.acceptedAt).toBeInstanceOf(Date);
      expect(acceptance.ipAddress).toBe('192.168.1.1');
    });

    it('should create acceptance without IP', () => {
      const acceptance: TermsAcceptance = {
        termsId: 'terms-us-v1',
        version: '1.0.0',
        country: 'US',
        acceptedAt: new Date()
      };

      expect(acceptance.ipAddress).toBeUndefined();
    });
  });

  describe('Version Comparison', () => {
    
    function compareVersions(v1: string, v2: string): number {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      
      for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
      }
      return 0;
    }

    it('should detect newer version', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should detect older version', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should detect same version', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
    });
  });

  describe('Terms Acceptance Validation', () => {
    
    function needsNewAcceptance(
      currentTerms: TermsOfUse,
      lastAcceptance: TermsAcceptance | null
    ): boolean {
      if (!lastAcceptance) return true;
      return currentTerms.version !== lastAcceptance.version;
    }

    it('should require acceptance for first time', () => {
      const terms: TermsOfUse = {
        id: 'terms-1',
        version: '1.0.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Terms',
        language: 'pt',
        isActive: true
      };

      expect(needsNewAcceptance(terms, null)).toBeTrue();
    });

    it('should require acceptance for new version', () => {
      const terms: TermsOfUse = {
        id: 'terms-1',
        version: '2.0.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Terms',
        language: 'pt',
        isActive: true
      };

      const lastAcceptance: TermsAcceptance = {
        termsId: 'terms-old',
        version: '1.0.0',
        country: 'BR',
        acceptedAt: new Date()
      };

      expect(needsNewAcceptance(terms, lastAcceptance)).toBeTrue();
    });

    it('should not require acceptance if already accepted', () => {
      const terms: TermsOfUse = {
        id: 'terms-1',
        version: '1.0.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Terms',
        language: 'pt',
        isActive: true
      };

      const lastAcceptance: TermsAcceptance = {
        termsId: 'terms-1',
        version: '1.0.0',
        country: 'BR',
        acceptedAt: new Date()
      };

      expect(needsNewAcceptance(terms, lastAcceptance)).toBeFalse();
    });
  });

  describe('Country Code Validation', () => {
    
    function isValidCountryCode(code: string): boolean {
      return /^[A-Z]{2}$/.test(code);
    }

    it('should validate standard country codes', () => {
      const validCodes = ['BR', 'US', 'ES', 'PT', 'GB', 'DE', 'FR'];
      
      validCodes.forEach(code => {
        expect(isValidCountryCode(code)).toBeTrue();
      });
    });

    it('should reject invalid country codes', () => {
      const invalidCodes = ['br', 'USA', 'B', 'BRAZIL', '12'];
      
      invalidCodes.forEach(code => {
        expect(isValidCountryCode(code)).toBeFalse();
      });
    });
  });

  describe('Language Detection by Country', () => {
    
    function getLanguageByCountry(countryCode: string): string {
      const countryToLanguageMap: { [key: string]: string } = {
        'BR': 'pt', 'PT': 'pt',
        'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es'
      };
      return countryToLanguageMap[countryCode] || 'en';
    }

    it('should return Portuguese for Brazil', () => {
      expect(getLanguageByCountry('BR')).toBe('pt');
    });

    it('should return English for US', () => {
      expect(getLanguageByCountry('US')).toBe('en');
    });

    it('should return Spanish for Spain', () => {
      expect(getLanguageByCountry('ES')).toBe('es');
    });

    it('should default to English for unknown country', () => {
      expect(getLanguageByCountry('XX')).toBe('en');
    });
  });

  describe('Effective Date Logic', () => {
    
    function isTermsEffective(effectiveDate: Date): boolean {
      return effectiveDate <= new Date();
    }

    function daysUntilEffective(effectiveDate: Date): number {
      const now = new Date();
      const diff = effectiveDate.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    it('should detect effective terms', () => {
      const pastDate = new Date('2023-01-01');
      expect(isTermsEffective(pastDate)).toBeTrue();
    });

    it('should detect future terms', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(isTermsEffective(futureDate)).toBeFalse();
    });

    it('should calculate days until effective', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const days = daysUntilEffective(futureDate);
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(8);
    });
  });

  describe('Terms Text Processing', () => {
    
    function extractSections(text: string): string[] {
      return text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    }

    function getWordCount(text: string): number {
      return text.split(/\s+/).filter(w => w.length > 0).length;
    }

    it('should extract sections from text', () => {
      const text = 'Section 1 content\n\nSection 2 content\n\nSection 3 content';
      const sections = extractSections(text);
      expect(sections.length).toBe(3);
    });

    it('should count words in text', () => {
      const text = 'This is a test with seven words';
      expect(getWordCount(text)).toBe(7);
    });

    it('should handle empty text', () => {
      expect(getWordCount('')).toBe(0);
      expect(extractSections('')).toEqual([]);
    });
  });

  describe('Firestore Query Configuration', () => {
    
    interface QueryConfig {
      collection: string;
      where: Array<{ field: string; op: string; value: any }>;
      orderBy: string;
      limit: number;
    }

    it('should configure query for latest terms', () => {
      const config: QueryConfig = {
        collection: 'termsOfUse',
        where: [
          { field: 'country', op: '==', value: 'BR' },
          { field: 'isActive', op: '==', value: true }
        ],
        orderBy: 'effectiveDate',
        limit: 1
      };

      expect(config.collection).toBe('termsOfUse');
      expect(config.where.length).toBe(2);
      expect(config.limit).toBe(1);
    });
  });

  describe('Acceptance History', () => {
    
    interface AcceptanceHistory {
      acceptances: TermsAcceptance[];
    }

    function getLatestAcceptance(history: AcceptanceHistory): TermsAcceptance | null {
      if (history.acceptances.length === 0) return null;
      return history.acceptances.sort(
        (a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime()
      )[0];
    }

    it('should get latest acceptance', () => {
      const history: AcceptanceHistory = {
        acceptances: [
          { termsId: 'terms-1', version: '1.0.0', country: 'BR', acceptedAt: new Date('2023-01-01') },
          { termsId: 'terms-2', version: '2.0.0', country: 'BR', acceptedAt: new Date('2024-01-01') }
        ]
      };

      const latest = getLatestAcceptance(history);
      expect(latest?.version).toBe('2.0.0');
    });

    it('should return null for empty history', () => {
      const history: AcceptanceHistory = { acceptances: [] };
      expect(getLatestAcceptance(history)).toBeNull();
    });
  });
});
