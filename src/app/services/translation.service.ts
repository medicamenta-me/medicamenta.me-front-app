import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CountryService } from './country.service';
import { LogService } from './log.service';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'app_language';
  
  private readonly languages: LanguageOption[] = [
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
  ];

  // Mapeamento de países para idiomas
  private readonly countryToLanguageMap: { [key: string]: string } = {
    // Português
    'BR': 'pt',
    'PT': 'pt',
    'AO': 'pt',
    'MZ': 'pt',
    'TL': 'pt',
    
    // Inglês
    'US': 'en',
    'GB': 'en',
    'CA': 'en',
    'AU': 'en',
    'NZ': 'en',
    'ZA': 'en',
    'IE': 'en',
    'NG': 'en',
    'KE': 'en',
    'TZ': 'en',
    'UG': 'en',
    'GH': 'en',
    'ZW': 'en',
    'RW': 'en',
    'IN': 'en',
    'PK': 'en',
    'BD': 'en',
    'PH': 'en',
    'SG': 'en',
    'MY': 'en',
    'JM': 'en',
    'TT': 'en',
    'BS': 'en',
    'BZ': 'en',
    'GY': 'en',
    'FJ': 'en',
    'PG': 'en',
    
    // Espanhol
    'ES': 'es',
    'AR': 'es',
    'MX': 'es',
    'CO': 'es',
    'CL': 'es',
    'PE': 'es',
    'VE': 'es',
    'EC': 'es',
    'GT': 'es',
    'CU': 'es',
    'BO': 'es',
    'DO': 'es',
    'HN': 'es',
    'PY': 'es',
    'SV': 'es',
    'NI': 'es',
    'CR': 'es',
    'PA': 'es',
    'UY': 'es'
  };

  constructor(
    private translate: TranslateService,
    private countryService: CountryService,
    private readonly logService: LogService
  ) {
    this.initializeLanguage();
  }

  /**
   * Inicializa o idioma do aplicativo
   */
  private initializeLanguage(): void {
    // Idiomas disponíveis
    const availableLanguages = this.languages.map(lang => lang.code);
    this.translate.addLangs(availableLanguages);
    
    // Idioma padrão
    this.translate.setDefaultLang('pt');
    
    // Tenta carregar idioma salvo
    const savedLanguage = this.getSavedLanguage();
    if (savedLanguage && availableLanguages.includes(savedLanguage)) {
      this.translate.use(savedLanguage);
      this.logService.info('TranslationService', 'Using saved language', { language: savedLanguage });
      return;
    }
    
    // Detecta idioma do navegador/sistema operacional
    const browserLanguage = this.detectBrowserLanguage();
    if (browserLanguage && availableLanguages.includes(browserLanguage)) {
      this.translate.use(browserLanguage);
      this.logService.info('TranslationService', 'Using browser language', { language: browserLanguage });
      return;
    }
    
    // Usa português como padrão
    this.translate.use('pt');
    this.logService.info('TranslationService', 'Using default language', { language: 'pt' });
  }

  /**
   * Detecta o idioma do navegador
   */
  private detectBrowserLanguage(): string | null {
    try {
      const browserLang = navigator.language || (navigator as any).userLanguage;
      if (!browserLang) return null;
      
      // Pega apenas o código do idioma (ex: 'pt-BR' -> 'pt')
      const langCode = browserLang.split('-')[0].toLowerCase();
      return langCode;
    } catch (error: any) {
      this.logService.error('TranslationService', 'Error detecting browser language', error as Error);
      return null;
    }
  }

  /**
   * Obtém o idioma salvo no localStorage
   */
  private getSavedLanguage(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (error: any) {
      this.logService.error('TranslationService', 'Error getting saved language', error as Error);
      return null;
    }
  }

  /**
   * Salva o idioma no localStorage
   */
  private saveLanguage(languageCode: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, languageCode);
    } catch (error: any) {
      this.logService.error('TranslationService', 'Error saving language', error as Error);
    }
  }

  /**
   * Obtém todos os idiomas disponíveis
   */
  getAvailableLanguages(): LanguageOption[] {
    return this.languages;
  }

  /**
   * Obtém o idioma atual
   */
  getCurrentLanguage(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'pt';
  }

  /**
   * Obtém a opção de idioma atual
   */
  getCurrentLanguageOption(): LanguageOption | undefined {
    const currentLang = this.getCurrentLanguage();
    return this.languages.find(lang => lang.code === currentLang);
  }

  /**
   * Muda o idioma do aplicativo
   */
  setLanguage(languageCode: string): void {
    if (this.translate.getLangs().includes(languageCode)) {
      this.translate.use(languageCode);
      this.saveLanguage(languageCode);
      this.logService.info('TranslationService', 'Language changed', { languageCode });
    } else {
      this.logService.warn('TranslationService', 'Language not available', { languageCode });
    }
  }

  /**
   * Obtém o idioma baseado no código do país
   */
  getLanguageByCountryCode(countryCode: string): string {
    // First, try to get language from CountryService
    const country = this.countryService.getCountryByCode(countryCode);
    if (country?.language) {
      return country.language;
    }
    
    // Fallback to hardcoded map (for backwards compatibility)
    return this.countryToLanguageMap[countryCode] || 'pt';
  }

  /**
   * Muda o idioma baseado no país selecionado
   */
  setLanguageByCountryCode(countryCode: string): void {
    const languageCode = this.getLanguageByCountryCode(countryCode);
    this.setLanguage(languageCode);
  }

  /**
   * Traduz uma chave
   */
  instant(key: string | string[], interpolateParams?: Object): string | any {
    return this.translate.instant(key, interpolateParams);
  }

  /**
   * Traduz uma chave de forma assíncrona
   */
  get(key: string | string[], interpolateParams?: Object) {
    return this.translate.get(key, interpolateParams);
  }
}

