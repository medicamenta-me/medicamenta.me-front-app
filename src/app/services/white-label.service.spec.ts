import { Organization } from '../models/enterprise.model';

/**
 * Unit tests for WhiteLabelService
 * Tests interfaces, types, and utility logic for enterprise branding
 */
describe('WhiteLabelService', () => {
  
  describe('Organization Branding Interface', () => {
    
    it('should create branding with logo only', () => {
      const branding: Organization['branding'] = {
        logo: 'https://example.com/logo.png'
      };

      expect(branding?.logo).toBe('https://example.com/logo.png');
    });

    it('should create branding with primary color', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4'
      };

      expect(branding?.primaryColor).toBe('#4285f4');
    });

    it('should create branding with secondary color', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4',
        secondaryColor: '#34a853'
      };

      expect(branding?.secondaryColor).toBe('#34a853');
    });

    it('should create branding with custom domain', () => {
      const branding: Organization['branding'] = {
        customDomain: 'clinic.example.com'
      };

      expect(branding?.customDomain).toBe('clinic.example.com');
    });

    it('should create full branding configuration', () => {
      const branding: Organization['branding'] = {
        logo: 'https://example.com/logo.png',
        primaryColor: '#4285f4',
        secondaryColor: '#34a853',
        customDomain: 'clinic.example.com',
        favicon: 'https://example.com/favicon.ico'
      };

      expect(branding?.logo).toBeDefined();
      expect(branding?.primaryColor).toBeDefined();
      expect(branding?.secondaryColor).toBeDefined();
      expect(branding?.customDomain).toBeDefined();
      expect(branding?.favicon).toBeDefined();
    });

    it('should allow undefined branding', () => {
      const branding: Organization['branding'] = undefined;
      expect(branding).toBeUndefined();
    });
  });

  describe('Color Validation', () => {
    
    function isValidHexColor(color: string): boolean {
      return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    it('should validate 6-digit hex colors', () => {
      expect(isValidHexColor('#4285f4')).toBeTrue();
      expect(isValidHexColor('#34a853')).toBeTrue();
      expect(isValidHexColor('#ffffff')).toBeTrue();
      expect(isValidHexColor('#000000')).toBeTrue();
    });

    it('should validate 3-digit hex colors', () => {
      expect(isValidHexColor('#fff')).toBeTrue();
      expect(isValidHexColor('#000')).toBeTrue();
      expect(isValidHexColor('#abc')).toBeTrue();
    });

    it('should reject invalid colors', () => {
      expect(isValidHexColor('4285f4')).toBeFalse();
      expect(isValidHexColor('#gggggg')).toBeFalse();
      expect(isValidHexColor('red')).toBeFalse();
      expect(isValidHexColor('')).toBeFalse();
    });
  });

  describe('Domain Validation', () => {
    
    function isValidDomain(domain: string): boolean {
      return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/.test(domain);
    }

    it('should validate standard domains', () => {
      expect(isValidDomain('clinic.example.com')).toBeTrue();
      expect(isValidDomain('hospital.medicamenta.me')).toBeTrue();
      expect(isValidDomain('care.org.br')).toBeTrue();
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('invalid')).toBeFalse();
      expect(isValidDomain('.example.com')).toBeFalse();
      expect(isValidDomain('http://example.com')).toBeFalse();
    });
  });

  describe('CSS Variables Management', () => {
    
    interface CSSVariables {
      primary: string;
      secondary: string;
    }

    function generateCSSVariables(branding: Organization['branding']): Partial<CSSVariables> {
      const vars: Partial<CSSVariables> = {};
      if (branding?.primaryColor) vars.primary = branding.primaryColor;
      if (branding?.secondaryColor) vars.secondary = branding.secondaryColor;
      return vars;
    }

    it('should generate CSS variables from branding', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4',
        secondaryColor: '#34a853'
      };

      const vars = generateCSSVariables(branding);
      expect(vars.primary).toBe('#4285f4');
      expect(vars.secondary).toBe('#34a853');
    });

    it('should handle partial branding', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4'
      };

      const vars = generateCSSVariables(branding);
      expect(vars.primary).toBe('#4285f4');
      expect(vars.secondary).toBeUndefined();
    });

    it('should handle undefined branding', () => {
      const vars = generateCSSVariables(undefined);
      expect(vars.primary).toBeUndefined();
      expect(vars.secondary).toBeUndefined();
    });
  });

  describe('Logo URL Processing', () => {
    
    function isBase64Image(data: string): boolean {
      return data.startsWith('data:image/');
    }

    function isValidImageUrl(url: string): boolean {
      return /^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url) || isBase64Image(url);
    }

    it('should validate PNG URLs', () => {
      expect(isValidImageUrl('https://example.com/logo.png')).toBeTrue();
    });

    it('should validate JPG URLs', () => {
      expect(isValidImageUrl('https://example.com/logo.jpg')).toBeTrue();
      expect(isValidImageUrl('https://example.com/logo.jpeg')).toBeTrue();
    });

    it('should validate SVG URLs', () => {
      expect(isValidImageUrl('https://example.com/logo.svg')).toBeTrue();
    });

    it('should validate base64 images', () => {
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhE')).toBeTrue();
    });

    it('should detect base64 images', () => {
      expect(isBase64Image('data:image/png;base64,ABC123')).toBeTrue();
      expect(isBase64Image('https://example.com/logo.png')).toBeFalse();
    });
  });

  describe('Branding Feature Check', () => {
    
    interface FeatureFlags {
      whiteLabel: boolean;
      customDomain: boolean;
    }

    function canApplyBranding(features: FeatureFlags): boolean {
      return features.whiteLabel;
    }

    function canSetCustomDomain(features: FeatureFlags): boolean {
      return features.whiteLabel && features.customDomain;
    }

    it('should allow branding when whiteLabel enabled', () => {
      expect(canApplyBranding({ whiteLabel: true, customDomain: false })).toBeTrue();
    });

    it('should deny branding when whiteLabel disabled', () => {
      expect(canApplyBranding({ whiteLabel: false, customDomain: false })).toBeFalse();
    });

    it('should allow custom domain when both features enabled', () => {
      expect(canSetCustomDomain({ whiteLabel: true, customDomain: true })).toBeTrue();
    });

    it('should deny custom domain when only whiteLabel enabled', () => {
      expect(canSetCustomDomain({ whiteLabel: true, customDomain: false })).toBeFalse();
    });
  });

  describe('Branding Merge Logic', () => {
    
    function mergeBranding(
      current: Organization['branding'],
      updates: Partial<NonNullable<Organization['branding']>>
    ): Organization['branding'] {
      return { ...current, ...updates };
    }

    it('should merge logo update', () => {
      const current: Organization['branding'] = {
        primaryColor: '#4285f4'
      };
      
      const result = mergeBranding(current, { logo: 'https://new-logo.png' });
      
      expect(result?.logo).toBe('https://new-logo.png');
      expect(result?.primaryColor).toBe('#4285f4');
    });

    it('should override existing values', () => {
      const current: Organization['branding'] = {
        primaryColor: '#4285f4'
      };
      
      const result = mergeBranding(current, { primaryColor: '#ff0000' });
      
      expect(result?.primaryColor).toBe('#ff0000');
    });

    it('should handle undefined current branding', () => {
      const result = mergeBranding(undefined, { logo: 'https://logo.png' });
      expect(result?.logo).toBe('https://logo.png');
    });
  });

  describe('Favicon Management', () => {
    
    function getFaviconType(url: string): string {
      if (url.endsWith('.ico')) return 'image/x-icon';
      if (url.endsWith('.png')) return 'image/png';
      if (url.endsWith('.svg')) return 'image/svg+xml';
      return 'image/x-icon';
    }

    it('should detect ICO favicon', () => {
      expect(getFaviconType('https://example.com/favicon.ico')).toBe('image/x-icon');
    });

    it('should detect PNG favicon', () => {
      expect(getFaviconType('https://example.com/favicon.png')).toBe('image/png');
    });

    it('should detect SVG favicon', () => {
      expect(getFaviconType('https://example.com/favicon.svg')).toBe('image/svg+xml');
    });

    it('should default to ICO for unknown', () => {
      expect(getFaviconType('https://example.com/favicon')).toBe('image/x-icon');
    });
  });

  describe('PDF Branding Options', () => {
    
    interface PDFBrandingOptions {
      logo?: string;
      headerColor?: string;
      footerText?: string;
      showPoweredBy: boolean;
    }

    function createPDFOptions(branding: Organization['branding']): PDFBrandingOptions {
      return {
        logo: branding?.logo,
        headerColor: branding?.primaryColor,
        footerText: branding?.customDomain || 'medicamenta.me',
        showPoweredBy: !branding?.customDomain
      };
    }

    it('should create PDF options with custom branding', () => {
      const branding: Organization['branding'] = {
        logo: 'https://logo.png',
        primaryColor: '#4285f4',
        customDomain: 'clinic.example.com'
      };

      const options = createPDFOptions(branding);

      expect(options.logo).toBe('https://logo.png');
      expect(options.headerColor).toBe('#4285f4');
      expect(options.footerText).toBe('clinic.example.com');
      expect(options.showPoweredBy).toBeFalse();
    });

    it('should show powered by without custom domain', () => {
      const branding: Organization['branding'] = {
        logo: 'https://logo.png'
      };

      const options = createPDFOptions(branding);
      expect(options.footerText).toBe('medicamenta.me');
      expect(options.showPoweredBy).toBeTrue();
    });
  });

  describe('Branding Reset', () => {
    
    interface BrandingState {
      applied: boolean;
      branding: Organization['branding'];
    }

    function resetBrandingState(): BrandingState {
      return {
        applied: false,
        branding: undefined
      };
    }

    function applyBrandingState(branding: Organization['branding']): BrandingState {
      return {
        applied: true,
        branding
      };
    }

    it('should reset branding state', () => {
      const state = resetBrandingState();
      expect(state.applied).toBeFalse();
      expect(state.branding).toBeUndefined();
    });

    it('should apply branding state', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4'
      };
      
      const state = applyBrandingState(branding);
      expect(state.applied).toBeTrue();
      expect(state.branding?.primaryColor).toBe('#4285f4');
    });
  });

  describe('Audit Log Entry', () => {
    
    interface AuditLogEntry {
      action: string;
      description: string;
      resourceType: string;
      severity: string;
    }

    function createLogoUpdateAudit(): AuditLogEntry {
      return {
        action: 'organization.update',
        description: 'Logo updated',
        resourceType: 'organization',
        severity: 'info'
      };
    }

    function createColorUpdateAudit(): AuditLogEntry {
      return {
        action: 'organization.update',
        description: 'Colors updated',
        resourceType: 'organization',
        severity: 'info'
      };
    }

    function createDomainUpdateAudit(domain: string): AuditLogEntry {
      return {
        action: 'organization.update',
        description: `Custom domain set: ${domain}`,
        resourceType: 'organization',
        severity: 'info'
      };
    }

    it('should create logo update audit', () => {
      const audit = createLogoUpdateAudit();
      expect(audit.action).toBe('organization.update');
      expect(audit.description).toBe('Logo updated');
    });

    it('should create color update audit', () => {
      const audit = createColorUpdateAudit();
      expect(audit.description).toBe('Colors updated');
    });

    it('should create domain update audit with domain', () => {
      const audit = createDomainUpdateAudit('clinic.example.com');
      expect(audit.description).toContain('clinic.example.com');
    });
  });

  describe('Theme Generator', () => {
    
    interface Theme {
      primary: string;
      primaryRgb: string;
      primaryContrast: string;
      secondary?: string;
    }

    function hexToRgb(hex: string): string {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0,0,0';
      return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
    }

    function getContrastColor(hex: string): string {
      const rgb = hexToRgb(hex).split(',').map(Number);
      const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function generateTheme(branding: Organization['branding']): Theme {
      const primary = branding?.primaryColor || '#3880ff';
      return {
        primary,
        primaryRgb: hexToRgb(primary),
        primaryContrast: getContrastColor(primary),
        secondary: branding?.secondaryColor
      };
    }

    it('should convert hex to RGB', () => {
      expect(hexToRgb('#4285f4')).toBe('66,133,244');
      expect(hexToRgb('#000000')).toBe('0,0,0');
      expect(hexToRgb('#ffffff')).toBe('255,255,255');
    });

    it('should determine contrast color for dark background', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
      expect(getContrastColor('#1a1a1a')).toBe('#ffffff');
    });

    it('should determine contrast color for light background', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000');
      expect(getContrastColor('#f0f0f0')).toBe('#000000');
    });

    it('should generate theme from branding', () => {
      const branding: Organization['branding'] = {
        primaryColor: '#4285f4',
        secondaryColor: '#34a853'
      };

      const theme = generateTheme(branding);
      expect(theme.primary).toBe('#4285f4');
      expect(theme.primaryRgb).toBe('66,133,244');
      expect(theme.secondary).toBe('#34a853');
    });

    it('should use default primary if not provided', () => {
      const theme = generateTheme(undefined);
      expect(theme.primary).toBe('#3880ff');
    });
  });
});
