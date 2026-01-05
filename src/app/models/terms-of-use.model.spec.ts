/**
 * @file terms-of-use.model.spec.ts
 * @description Testes unitários para o modelo de termos de uso
 * @coverage 100% target
 */

import {
  TermsOfUse,
  createTermsId,
  needsTermsUpdate
} from './terms-of-use.model';

describe('Terms of Use Model', () => {

  // ==========================================================================
  // createTermsId() FUNCTION TESTS
  // ==========================================================================

  describe('createTermsId()', () => {
    describe('Brazilian terms', () => {
      it('should create ID for Brazil version 1.0', () => {
        expect(createTermsId('BR', '1.0')).toBe('BR_1.0');
      });

      it('should create ID for Brazil version 2.0', () => {
        expect(createTermsId('BR', '2.0')).toBe('BR_2.0');
      });

      it('should create ID for Brazil version 1.0.1', () => {
        expect(createTermsId('BR', '1.0.1')).toBe('BR_1.0.1');
      });
    });

    describe('Other countries', () => {
      it('should create ID for Argentina', () => {
        expect(createTermsId('AR', '1.0')).toBe('AR_1.0');
      });

      it('should create ID for USA', () => {
        expect(createTermsId('US', '1.0')).toBe('US_1.0');
      });

      it('should create ID for Portugal', () => {
        expect(createTermsId('PT', '1.5')).toBe('PT_1.5');
      });

      it('should create ID for Spain', () => {
        expect(createTermsId('ES', '2.1')).toBe('ES_2.1');
      });

      it('should create ID for Mexico', () => {
        expect(createTermsId('MX', '1.0')).toBe('MX_1.0');
      });
    });

    describe('Version formats', () => {
      it('should handle single digit version', () => {
        expect(createTermsId('BR', '1')).toBe('BR_1');
      });

      it('should handle two digit version', () => {
        expect(createTermsId('BR', '1.0')).toBe('BR_1.0');
      });

      it('should handle three digit version', () => {
        expect(createTermsId('BR', '1.0.1')).toBe('BR_1.0.1');
      });

      it('should handle large version numbers', () => {
        expect(createTermsId('BR', '10.25.100')).toBe('BR_10.25.100');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty country code', () => {
        expect(createTermsId('', '1.0')).toBe('_1.0');
      });

      it('should handle empty version', () => {
        expect(createTermsId('BR', '')).toBe('BR_');
      });

      it('should handle both empty', () => {
        expect(createTermsId('', '')).toBe('_');
      });

      it('should preserve case', () => {
        expect(createTermsId('br', '1.0')).toBe('br_1.0');
        expect(createTermsId('Br', '1.0')).toBe('Br_1.0');
      });
    });
  });

  // ==========================================================================
  // needsTermsUpdate() FUNCTION TESTS
  // ==========================================================================

  describe('needsTermsUpdate()', () => {
    let latestTermsBR: TermsOfUse;
    let latestTermsAR: TermsOfUse;

    beforeEach(() => {
      latestTermsBR = {
        id: 'BR_2.0',
        version: '2.0',
        country: 'BR',
        effectiveDate: new Date('2025-01-01'),
        createdAt: new Date('2024-12-01'),
        text: 'Termos de uso versão 2.0',
        language: 'pt-BR',
        isActive: true
      };

      latestTermsAR = {
        id: 'AR_1.0',
        version: '1.0',
        country: 'AR',
        effectiveDate: new Date('2025-01-01'),
        createdAt: new Date('2024-12-01'),
        text: 'Términos de uso versión 1.0',
        language: 'es-AR',
        isActive: true
      };
    });

    describe('User never accepted terms', () => {
      it('should return true when user has no acceptances', () => {
        const result = needsTermsUpdate([], latestTermsBR);
        expect(result).toBe(true);
      });

      it('should return true when user accepted different country', () => {
        const userAcceptances = [
          { version: '1.0', country: 'US', acceptedAt: new Date() }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(true);
      });

      it('should return true for first time user in any country', () => {
        const result = needsTermsUpdate([], latestTermsAR);
        expect(result).toBe(true);
      });
    });

    describe('User has older version', () => {
      it('should return true when user has version 1.0 and latest is 2.0', () => {
        const userAcceptances = [
          { version: '1.0', country: 'BR', acceptedAt: new Date('2024-01-01') }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(true);
      });

      it('should return true when user has version 1.9 and latest is 2.0', () => {
        const userAcceptances = [
          { version: '1.9', country: 'BR', acceptedAt: new Date('2024-06-01') }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(true);
      });

      it('should return true for minor version upgrade (1.0.1 -> 1.1.0)', () => {
        const userAcceptances = [
          { version: '1.0.1', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.1.0'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(true);
      });

      it('should return true for patch version upgrade (1.0.1 -> 1.0.2)', () => {
        const userAcceptances = [
          { version: '1.0.1', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.0.2'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(true);
      });
    });

    describe('User has current version', () => {
      it('should return false when user has same version', () => {
        const userAcceptances = [
          { version: '2.0', country: 'BR', acceptedAt: new Date('2025-01-01') }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(false);
      });

      it('should return false when versions match exactly', () => {
        const userAcceptances = [
          { version: '1.0', country: 'AR', acceptedAt: new Date('2025-01-01') }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsAR);
        expect(result).toBe(false);
      });
    });

    describe('User has newer version (edge case)', () => {
      it('should return false when user has version 3.0 and latest is 2.0', () => {
        const userAcceptances = [
          { version: '3.0', country: 'BR', acceptedAt: new Date() }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(false);
      });
    });

    describe('Multiple countries', () => {
      it('should only check relevant country', () => {
        const userAcceptances = [
          { version: '1.0', country: 'US', acceptedAt: new Date() },
          { version: '1.5', country: 'BR', acceptedAt: new Date() },
          { version: '1.0', country: 'AR', acceptedAt: new Date() }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(true); // BR 1.5 < 2.0
      });

      it('should find correct country in list', () => {
        const userAcceptances = [
          { version: '2.0', country: 'US', acceptedAt: new Date() },
          { version: '2.0', country: 'BR', acceptedAt: new Date() },
          { version: '1.0', country: 'AR', acceptedAt: new Date() }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(false); // BR 2.0 == 2.0
      });
    });

    describe('Version comparison edge cases', () => {
      it('should handle version 1.10 vs 1.9', () => {
        const userAcceptances = [
          { version: '1.9', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.10'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(true); // 1.10 > 1.9
      });

      it('should handle version 2.0 vs 1.99', () => {
        const userAcceptances = [
          { version: '1.99', country: 'BR', acceptedAt: new Date() }
        ];
        const result = needsTermsUpdate(userAcceptances, latestTermsBR);
        expect(result).toBe(true); // 2.0 > 1.99
      });

      it('should handle version with missing parts (1 vs 1.0)', () => {
        const userAcceptances = [
          { version: '1', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.0'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(false); // 1 == 1.0 (missing parts are treated as 0)
      });

      it('should handle version 1.0.0 vs 1.0', () => {
        const userAcceptances = [
          { version: '1.0', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.0.0'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(false); // 1.0.0 == 1.0 (trailing zeros don't matter)
      });

      it('should handle version 1.0.1 vs 1.0', () => {
        const userAcceptances = [
          { version: '1.0', country: 'BR', acceptedAt: new Date() }
        ];
        const latestTerms: TermsOfUse = {
          ...latestTermsBR,
          version: '1.0.1'
        };
        const result = needsTermsUpdate(userAcceptances, latestTerms);
        expect(result).toBe(true); // 1.0.1 > 1.0
      });
    });
  });

  // ==========================================================================
  // TermsOfUse INTERFACE TESTS
  // ==========================================================================

  describe('TermsOfUse Interface', () => {
    it('should create valid TermsOfUse object', () => {
      const terms: TermsOfUse = {
        id: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        effectiveDate: new Date('2025-01-01'),
        createdAt: new Date('2024-12-01'),
        text: 'Texto completo dos termos de uso...',
        language: 'pt-BR',
        isActive: true
      };

      expect(terms.id).toBe('BR_1.0');
      expect(terms.version).toBe('1.0');
      expect(terms.country).toBe('BR');
      expect(terms.language).toBe('pt-BR');
      expect(terms.isActive).toBe(true);
    });

    it('should create TermsOfUse with optional summary', () => {
      const terms: TermsOfUse = {
        id: 'BR_2.0',
        version: '2.0',
        country: 'BR',
        effectiveDate: new Date('2025-06-01'),
        createdAt: new Date('2025-05-01'),
        text: 'Texto completo dos termos de uso versão 2.0...',
        summary: 'Resumo das principais mudanças na versão 2.0',
        language: 'pt-BR',
        isActive: true
      };

      expect(terms.summary).toBe('Resumo das principais mudanças na versão 2.0');
    });

    it('should create inactive TermsOfUse (archived version)', () => {
      const terms: TermsOfUse = {
        id: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        effectiveDate: new Date('2024-01-01'),
        createdAt: new Date('2023-12-01'),
        text: 'Versão antiga dos termos de uso...',
        language: 'pt-BR',
        isActive: false
      };

      expect(terms.isActive).toBe(false);
    });

    it('should support different languages', () => {
      const termsPTBR: TermsOfUse = {
        id: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Termos em português',
        language: 'pt-BR',
        isActive: true
      };

      const termsESAR: TermsOfUse = {
        id: 'AR_1.0',
        version: '1.0',
        country: 'AR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Términos en español',
        language: 'es-AR',
        isActive: true
      };

      const termsENUS: TermsOfUse = {
        id: 'US_1.0',
        version: '1.0',
        country: 'US',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: 'Terms in English',
        language: 'en-US',
        isActive: true
      };

      expect(termsPTBR.language).toBe('pt-BR');
      expect(termsESAR.language).toBe('es-AR');
      expect(termsENUS.language).toBe('en-US');
    });

    it('should support HTML content in text', () => {
      const terms: TermsOfUse = {
        id: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: '<h1>Termos de Uso</h1><p>Seção 1...</p><p>Seção 2...</p>',
        language: 'pt-BR',
        isActive: true
      };

      expect(terms.text).toContain('<h1>');
      expect(terms.text).toContain('</p>');
    });

    it('should support markdown content in text', () => {
      const terms: TermsOfUse = {
        id: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        effectiveDate: new Date(),
        createdAt: new Date(),
        text: '# Termos de Uso\n\n## Seção 1\n\nConteúdo...\n\n## Seção 2\n\nMais conteúdo...',
        language: 'pt-BR',
        isActive: true
      };

      expect(terms.text).toContain('# Termos de Uso');
      expect(terms.text).toContain('## Seção');
    });
  });
});
