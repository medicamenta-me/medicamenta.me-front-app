import {
  calculateInstallments,
  formatCPF,
  isValidCPF,
  formatPhone,
  formatBRL,
  formatCEP,
  InstallmentOption
} from './pagseguro.model';

describe('PagSeguro Model Helpers', () => {
  describe('calculateInstallments', () => {
    it('should return correct number of options', () => {
      const options = calculateInstallments(10000, 12);
      expect(options.length).toBe(12);
    });

    it('should have 1x always as first option', () => {
      const options = calculateInstallments(10000, 12);
      expect(options[0].quantity).toBe(1);
      expect(options[0].value).toBe(10000);
      expect(options[0].totalValue).toBe(10000);
      expect(options[0].interestFree).toBeTrue();
    });

    it('should have interest-free options up to limit', () => {
      const options = calculateInstallments(10000, 12, 3);
      
      expect(options[0].interestFree).toBeTrue(); // 1x
      expect(options[1].interestFree).toBeTrue(); // 2x
      expect(options[2].interestFree).toBeTrue(); // 3x
      expect(options[3].interestFree).toBeFalse(); // 4x
    });

    it('should apply interest after interest-free limit', () => {
      const options = calculateInstallments(10000, 6, 3);
      
      // After limit, total value should be higher
      expect(options[3].totalValue).toBeGreaterThan(10000); // 4x
      expect(options[4].totalValue).toBeGreaterThan(options[3].totalValue); // 5x
    });

    it('should divide value evenly for interest-free options', () => {
      const options = calculateInstallments(12000, 3, 3);
      
      // 2x = 6000 each
      expect(options[1].value).toBe(6000);
      expect(options[1].totalValue).toBe(12000);
      
      // 3x = 4000 each
      expect(options[2].value).toBe(4000);
      expect(options[2].totalValue).toBe(12000);
    });

    it('should round values correctly', () => {
      const options = calculateInstallments(10001, 3, 3);
      
      // 3x = 10001/3 = 3333.67, should round
      expect(Number.isInteger(options[2].value)).toBeTrue();
    });

    it('should use default values', () => {
      const options = calculateInstallments(10000);
      expect(options.length).toBe(12); // default maxInstallments
    });

    it('should handle small amounts', () => {
      const options = calculateInstallments(100, 3);
      expect(options[0].value).toBe(100);
    });

    it('should handle large amounts', () => {
      const options = calculateInstallments(10000000, 12); // R$ 100.000,00
      expect(options[0].value).toBe(10000000);
      expect(options.length).toBe(12);
    });
  });

  describe('formatCPF', () => {
    it('should format valid CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should handle CPF with existing formatting', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
    });

    it('should return original if not 11 digits', () => {
      expect(formatCPF('12345')).toBe('12345');
      expect(formatCPF('1234567890123')).toBe('1234567890123');
    });

    it('should handle empty string', () => {
      expect(formatCPF('')).toBe('');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(formatCPF('123.456.789.01')).toBe('123.456.789-01');
      expect(formatCPF('123-456-789-01')).toBe('123.456.789-01');
    });
  });

  describe('isValidCPF', () => {
    it('should validate correct CPF', () => {
      // Using valid CPFs for testing
      expect(isValidCPF('529.982.247-25')).toBeTrue();
      expect(isValidCPF('52998224725')).toBeTrue();
    });

    it('should reject invalid CPF', () => {
      expect(isValidCPF('12345678901')).toBeFalse();
      expect(isValidCPF('00000000000')).toBeFalse();
    });

    it('should reject CPF with wrong length', () => {
      expect(isValidCPF('1234567890')).toBeFalse();
      expect(isValidCPF('123456789012')).toBeFalse();
    });

    it('should reject CPF with all same digits', () => {
      expect(isValidCPF('11111111111')).toBeFalse();
      expect(isValidCPF('99999999999')).toBeFalse();
      expect(isValidCPF('00000000000')).toBeFalse();
    });

    it('should handle formatted CPF', () => {
      expect(isValidCPF('529.982.247-25')).toBeTrue();
    });

    it('should reject empty string', () => {
      expect(isValidCPF('')).toBeFalse();
    });
  });

  describe('formatPhone', () => {
    it('should format 8-digit phone number', () => {
      expect(formatPhone('11', '12345678')).toBe('(11) 1234-5678');
    });

    it('should format 9-digit phone number', () => {
      expect(formatPhone('11', '912345678')).toBe('(11) 91234-5678');
    });

    it('should handle non-numeric area code', () => {
      expect(formatPhone('(11)', '912345678')).toBe('(11) 91234-5678');
    });

    it('should handle non-numeric phone number', () => {
      expect(formatPhone('11', '9-1234-5678')).toBe('(11) 91234-5678');
    });

    it('should return original format for invalid length', () => {
      expect(formatPhone('11', '123456')).toBe('(11) 123456');
    });

    it('should handle empty values', () => {
      expect(formatPhone('', '')).toBe('() ');
    });
  });

  describe('formatBRL', () => {
    it('should format cents to BRL currency', () => {
      const formatted = formatBRL(1990);
      expect(formatted).toContain('19,90');
      expect(formatted).toContain('R$');
    });

    it('should handle zero', () => {
      const formatted = formatBRL(0);
      expect(formatted).toContain('0,00');
    });

    it('should handle large amounts', () => {
      const formatted = formatBRL(10000000); // R$ 100.000,00
      expect(formatted).toContain('100.000,00');
    });

    it('should handle single cents', () => {
      const formatted = formatBRL(1);
      expect(formatted).toContain('0,01');
    });

    it('should format with proper thousands separator', () => {
      const formatted = formatBRL(123456789); // R$ 1.234.567,89
      expect(formatted).toContain('.');
    });
  });

  describe('formatCEP', () => {
    it('should format valid CEP', () => {
      expect(formatCEP('01310100')).toBe('01310-100');
    });

    it('should handle CEP with existing formatting', () => {
      expect(formatCEP('01310-100')).toBe('01310-100');
    });

    it('should return original if not 8 digits', () => {
      expect(formatCEP('12345')).toBe('12345');
      expect(formatCEP('123456789')).toBe('123456789');
    });

    it('should strip non-numeric characters', () => {
      expect(formatCEP('01.310-100')).toBe('01310-100');
    });

    it('should handle empty string', () => {
      expect(formatCEP('')).toBe('');
    });
  });

  describe('InstallmentOption interface', () => {
    it('should create valid InstallmentOption', () => {
      const option: InstallmentOption = {
        quantity: 3,
        value: 3333,
        totalValue: 10000,
        interestFree: true
      };
      
      expect(option.quantity).toBe(3);
      expect(option.value).toBe(3333);
      expect(option.totalValue).toBe(10000);
      expect(option.interestFree).toBeTrue();
    });
  });

  describe('edge cases', () => {
    it('calculateInstallments with 1 max installment', () => {
      const options = calculateInstallments(10000, 1);
      expect(options.length).toBe(1);
      expect(options[0].quantity).toBe(1);
    });

    it('calculateInstallments with 0 interest-free limit', () => {
      const options = calculateInstallments(10000, 3, 0);
      expect(options[0].interestFree).toBeTrue(); // 1x always free
      expect(options[1].interestFree).toBeFalse();
    });

    it('formatCPF with spaces', () => {
      expect(formatCPF('123 456 789 01')).toBe('123.456.789-01');
    });

    it('isValidCPF with special characters', () => {
      expect(isValidCPF('529.982.247/25')).toBeTrue();
    });
  });
});
