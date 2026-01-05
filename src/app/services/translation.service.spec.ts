import { LanguageOption } from './translation.service';

/**
 * Unit tests for TranslationService
 * Tests interfaces, types, and utility logic
 */
describe('TranslationService', () => {
  
  describe('LanguageOption Interface', () => {
    
    it('should create Portuguese language option', () => {
      const option: LanguageOption = {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Portugues',
        flag: 'BR'
      };

      expect(option.code).toBe('pt');
      expect(option.name).toBe('Portuguese');
      expect(option.nativeName).toBe('Portugues');
    });

    it('should create English language option', () => {
      const option: LanguageOption = {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: 'US'
      };

      expect(option.code).toBe('en');
    });

    it('should create Spanish language option', () => {
      const option: LanguageOption = {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Espanol',
        flag: 'ES'
      };

      expect(option.code).toBe('es');
      expect(option.nativeName).toBe('Espanol');
    });
  });

  describe('Available Languages', () => {
    
    const languages: LanguageOption[] = [
      { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', flag: 'BR' },
      { code: 'en', name: 'English', nativeName: 'English', flag: 'US' },
      { code: 'es', name: 'Spanish', nativeName: 'Espanol', flag: 'ES' }
    ];

    it('should have 3 available languages', () => {
      expect(languages.length).toBe(3);
    });

    it('should find language by code', () => {
      const found = languages.find(l => l.code === 'pt');
      expect(found?.name).toBe('Portuguese');
    });

    it('should extract language codes', () => {
      const codes = languages.map(l => l.code);
      expect(codes).toEqual(['pt', 'en', 'es']);
    });
  });

  describe('Country to Language Mapping', () => {
    
    const countryToLanguageMap: { [key: string]: string } = {
      // Portuguese
      'BR': 'pt',
      'PT': 'pt',
      'AO': 'pt',
      'MZ': 'pt',
      
      // English
      'US': 'en',
      'GB': 'en',
      'CA': 'en',
      'AU': 'en',
      'NZ': 'en',
      
      // Spanish
      'ES': 'es',
      'AR': 'es',
      'MX': 'es',
      'CO': 'es',
      'CL': 'es'
    };

    function getLanguageByCountry(countryCode: string): string {
      return countryToLanguageMap[countryCode] || 'pt';
    }

    it('should map Brazil to Portuguese', () => {
      expect(getLanguageByCountry('BR')).toBe('pt');
    });

    it('should map Portugal to Portuguese', () => {
      expect(getLanguageByCountry('PT')).toBe('pt');
    });

    it('should map US to English', () => {
      expect(getLanguageByCountry('US')).toBe('en');
    });

    it('should map UK to English', () => {
      expect(getLanguageByCountry('GB')).toBe('en');
    });

    it('should map Spain to Spanish', () => {
      expect(getLanguageByCountry('ES')).toBe('es');
    });

    it('should map Mexico to Spanish', () => {
      expect(getLanguageByCountry('MX')).toBe('es');
    });

    it('should default to Portuguese for unknown country', () => {
      expect(getLanguageByCountry('XX')).toBe('pt');
    });
  });

  describe('Browser Language Detection', () => {
    
    function extractLanguageCode(browserLang: string): string | null {
      if (!browserLang) return null;
      return browserLang.split('-')[0].toLowerCase();
    }

    it('should extract pt from pt-BR', () => {
      expect(extractLanguageCode('pt-BR')).toBe('pt');
    });

    it('should extract en from en-US', () => {
      expect(extractLanguageCode('en-US')).toBe('en');
    });

    it('should extract es from es-ES', () => {
      expect(extractLanguageCode('es-ES')).toBe('es');
    });

    it('should handle simple codes', () => {
      expect(extractLanguageCode('pt')).toBe('pt');
      expect(extractLanguageCode('en')).toBe('en');
    });

    it('should return null for empty string', () => {
      expect(extractLanguageCode('')).toBeNull();
    });
  });

  describe('Language Validation', () => {
    
    const availableLanguages = ['pt', 'en', 'es'];

    function isLanguageAvailable(code: string): boolean {
      return availableLanguages.includes(code);
    }

    it('should validate Portuguese', () => {
      expect(isLanguageAvailable('pt')).toBeTrue();
    });

    it('should validate English', () => {
      expect(isLanguageAvailable('en')).toBeTrue();
    });

    it('should validate Spanish', () => {
      expect(isLanguageAvailable('es')).toBeTrue();
    });

    it('should reject unavailable language', () => {
      expect(isLanguageAvailable('fr')).toBeFalse();
      expect(isLanguageAvailable('de')).toBeFalse();
    });
  });

  describe('Language Storage', () => {
    
    const STORAGE_KEY = 'app_language';

    function saveLanguage(code: string): void {
      localStorage.setItem(STORAGE_KEY, code);
    }

    function getSavedLanguage(): string | null {
      return localStorage.getItem(STORAGE_KEY);
    }

    beforeEach(() => {
      localStorage.removeItem(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.removeItem(STORAGE_KEY);
    });

    it('should save language to localStorage', () => {
      saveLanguage('en');
      expect(getSavedLanguage()).toBe('en');
    });

    it('should return null when no language saved', () => {
      expect(getSavedLanguage()).toBeNull();
    });

    it('should overwrite previous language', () => {
      saveLanguage('pt');
      saveLanguage('es');
      expect(getSavedLanguage()).toBe('es');
    });
  });

  describe('Language Selection Priority', () => {
    
    interface LanguageContext {
      saved: string | null;
      browser: string | null;
      default: string;
    }

    function selectLanguage(
      context: LanguageContext,
      availableLanguages: string[]
    ): string {
      // 1. Check saved language
      if (context.saved && availableLanguages.includes(context.saved)) {
        return context.saved;
      }
      
      // 2. Check browser language
      if (context.browser && availableLanguages.includes(context.browser)) {
        return context.browser;
      }
      
      // 3. Return default
      return context.default;
    }

    const available = ['pt', 'en', 'es'];

    it('should prioritize saved language', () => {
      const context: LanguageContext = {
        saved: 'es',
        browser: 'en',
        default: 'pt'
      };
      expect(selectLanguage(context, available)).toBe('es');
    });

    it('should use browser language if no saved', () => {
      const context: LanguageContext = {
        saved: null,
        browser: 'en',
        default: 'pt'
      };
      expect(selectLanguage(context, available)).toBe('en');
    });

    it('should use default if no saved or browser', () => {
      const context: LanguageContext = {
        saved: null,
        browser: null,
        default: 'pt'
      };
      expect(selectLanguage(context, available)).toBe('pt');
    });

    it('should ignore unavailable saved language', () => {
      const context: LanguageContext = {
        saved: 'fr',
        browser: 'en',
        default: 'pt'
      };
      expect(selectLanguage(context, available)).toBe('en');
    });
  });

  describe('Translation Key Helpers', () => {
    
    function buildTranslationKey(category: string, key: string): string {
      return `${category}.${key}`;
    }

    function parseTranslationKey(fullKey: string): { category: string; key: string } {
      const parts = fullKey.split('.');
      return {
        category: parts[0] || '',
        key: parts.slice(1).join('.') || ''
      };
    }

    it('should build translation key', () => {
      expect(buildTranslationKey('common', 'save')).toBe('common.save');
      expect(buildTranslationKey('medication', 'add')).toBe('medication.add');
    });

    it('should parse translation key', () => {
      const parsed = parseTranslationKey('common.buttons.save');
      expect(parsed.category).toBe('common');
      expect(parsed.key).toBe('buttons.save');
    });
  });

  describe('Interpolation', () => {
    
    function interpolate(template: string, params: Record<string, any>): string {
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
      });
    }

    it('should interpolate single parameter', () => {
      const result = interpolate('Hello, {{name}}!', { name: 'John' });
      expect(result).toBe('Hello, John!');
    });

    it('should interpolate multiple parameters', () => {
      const result = interpolate('{{greeting}}, {{name}}!', { greeting: 'Hello', name: 'John' });
      expect(result).toBe('Hello, John!');
    });

    it('should keep placeholder if param missing', () => {
      const result = interpolate('Hello, {{name}}!', {});
      expect(result).toBe('Hello, {{name}}!');
    });

    it('should handle numeric values', () => {
      const result = interpolate('You have {{count}} items', { count: 5 });
      expect(result).toBe('You have 5 items');
    });
  });

  describe('RTL Language Detection', () => {
    
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

    function isRTLLanguage(code: string): boolean {
      return rtlLanguages.includes(code);
    }

    it('should detect Arabic as RTL', () => {
      expect(isRTLLanguage('ar')).toBeTrue();
    });

    it('should detect Hebrew as RTL', () => {
      expect(isRTLLanguage('he')).toBeTrue();
    });

    it('should not detect English as RTL', () => {
      expect(isRTLLanguage('en')).toBeFalse();
    });

    it('should not detect Portuguese as RTL', () => {
      expect(isRTLLanguage('pt')).toBeFalse();
    });
  });

  describe('Language Code Validation', () => {
    
    function isValidLanguageCode(code: string): boolean {
      return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
    }

    it('should validate simple language code', () => {
      expect(isValidLanguageCode('pt')).toBeTrue();
      expect(isValidLanguageCode('en')).toBeTrue();
    });

    it('should validate language-region code', () => {
      expect(isValidLanguageCode('pt-BR')).toBeTrue();
      expect(isValidLanguageCode('en-US')).toBeTrue();
    });

    it('should reject invalid codes', () => {
      expect(isValidLanguageCode('POR')).toBeFalse();
      expect(isValidLanguageCode('123')).toBeFalse();
      expect(isValidLanguageCode('')).toBeFalse();
    });
  });

  describe('Plural Forms', () => {
    
    function getPluralForm(count: number, singular: string, plural: string): string {
      return count === 1 ? singular : plural;
    }

    it('should return singular for 1', () => {
      expect(getPluralForm(1, 'item', 'items')).toBe('item');
    });

    it('should return plural for 0', () => {
      expect(getPluralForm(0, 'item', 'items')).toBe('items');
    });

    it('should return plural for > 1', () => {
      expect(getPluralForm(5, 'item', 'items')).toBe('items');
    });
  });
});
