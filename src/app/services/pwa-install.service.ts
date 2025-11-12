import { Injectable, signal } from '@angular/core';
import { LogService } from './log.service';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallStats {
  isInstallable: boolean;
  isInstalled: boolean;
  canShowPrompt: boolean;
  promptShownCount: number;
  lastPromptDate: Date | null;
  installDate: Date | null;
}

/**
 * PWA Install Service
 * 
 * Gerencia a instalação do PWA com install prompt customizado.
 * Features:
 * - Captura beforeinstallprompt event
 * - Mostra prompt customizado
 * - Detecta quando app foi instalado
 * - Estatísticas de instalação
 * - Rate limiting de prompts (7 dias entre prompts)
 */
@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: InstallPromptEvent | null = null;
  private readonly logService = new LogService();
  
  private readonly _stats = signal<InstallStats>({
    isInstallable: false,
    isInstalled: false,
    canShowPrompt: false,
    promptShownCount: 0,
    lastPromptDate: null,
    installDate: null
  });

  readonly stats = this._stats.asReadonly();

  private readonly PROMPT_COOLDOWN_DAYS = 7;
  private readonly MAX_PROMPTS = 3;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar service
   */
  private initialize(): void {
    // Carregar stats do localStorage
    this.loadStats();

    // Detectar se já está instalado
    this.checkIfInstalled();

    // Escutar evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as InstallPromptEvent;
      
      this._stats.update(s => ({
        ...s,
        isInstallable: true,
        canShowPrompt: this.canShowPrompt()
      }));

      this.logService.info('PWA Install', 'Install prompt available');
    });

    // Escutar evento appinstalled
    window.addEventListener('appinstalled', () => {
      this.logService.info('PWA Install', 'App installed successfully');
      
      this._stats.update(s => ({
        ...s,
        isInstalled: true,
        installDate: new Date(),
        canShowPrompt: false
      }));

      this.saveStats();
      this.deferredPrompt = null;
    });
  }

  /**
   * Mostrar prompt de instalação
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      this.logService.warn('PWA Install', 'Install prompt not available');
      return 'unavailable';
    }

    if (!this.canShowPrompt()) {
      this.logService.warn('PWA Install', 'Cannot show prompt (cooldown or max prompts reached)');
      return 'unavailable';
    }

    try {
      // Mostrar prompt nativo
      await this.deferredPrompt.prompt();

      // Aguardar escolha do usuário
      const { outcome } = await this.deferredPrompt.userChoice;

      this.logService.info('PWA Install', 'User choice', { outcome });

      // Atualizar stats
      this._stats.update(s => ({
        ...s,
        promptShownCount: s.promptShownCount + 1,
        lastPromptDate: new Date(),
        canShowPrompt: false
      }));

      this.saveStats();

      // Limpar prompt
      this.deferredPrompt = null;

      return outcome;
    } catch (error: any) {
      this.logService.error('PWA Install', 'Failed to show prompt', error as Error);
      return 'unavailable';
    }
  }

  /**
   * Verificar se pode mostrar prompt
   */
  private canShowPrompt(): boolean {
    const stats = this._stats();

    // Já instalado
    if (stats.isInstalled) {
      return false;
    }

    // Máximo de prompts atingido
    if (stats.promptShownCount >= this.MAX_PROMPTS) {
      return false;
    }

    // Verificar cooldown
    if (stats.lastPromptDate) {
      const daysSinceLastPrompt = this.getDaysSince(stats.lastPromptDate);
      if (daysSinceLastPrompt < this.PROMPT_COOLDOWN_DAYS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calcular dias desde data
   */
  private getDaysSince(date: Date): number {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Verificar se app está instalado
   */
  private checkIfInstalled(): void {
    // Detectar se está rodando como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInApp = (navigator as any).standalone === true; // iOS
    
    const isInstalled = isStandalone || isInApp;

    if (isInstalled) {
      this._stats.update(s => ({
        ...s,
        isInstalled: true,
        canShowPrompt: false
      }));

      // Salvar data de instalação se ainda não foi salva
      const stored = localStorage.getItem('medicamenta_pwa_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        if (!stats.installDate) {
          this._stats.update(s => ({
            ...s,
            installDate: new Date()
          }));
          this.saveStats();
        }
      }
    }
  }

  /**
   * Resetar contador de prompts
   */
  resetPromptCount(): void {
    this._stats.update(s => ({
      ...s,
      promptShownCount: 0,
      lastPromptDate: null,
      canShowPrompt: true
    }));

    this.saveStats();
  }

  /**
   * Carregar stats do localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem('medicamenta_pwa_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        
        // Converter strings de data para Date
        if (stats.lastPromptDate) {
          stats.lastPromptDate = new Date(stats.lastPromptDate);
        }
        if (stats.installDate) {
          stats.installDate = new Date(stats.installDate);
        }

        this._stats.update(s => ({ ...s, ...stats }));
      }
    } catch (error: any) {
      this.logService.error('PWA Install', 'Failed to load stats', error as Error);
    }
  }

  /**
   * Salvar stats no localStorage
   */
  private saveStats(): void {
    try {
      const stats = this._stats();
      localStorage.setItem('medicamenta_pwa_stats', JSON.stringify(stats));
    } catch (error: any) {
      this.logService.error('PWA Install', 'Failed to save stats', error as Error);
    }
  }

  /**
   * Obter dias desde última instalação
   */
  getDaysSinceInstall(): number | null {
    const installDate = this._stats().installDate;
    if (!installDate) {
      return null;
    }
    return this.getDaysSince(installDate);
  }

  /**
   * Obter dias desde último prompt
   */
  getDaysSinceLastPrompt(): number | null {
    const lastPromptDate = this._stats().lastPromptDate;
    if (!lastPromptDate) {
      return null;
    }
    return this.getDaysSince(lastPromptDate);
  }

  /**
   * Verificar se deve sugerir instalação
   */
  shouldSuggestInstall(): boolean {
    const stats = this._stats();
    
    // Não sugerir se já instalado
    if (stats.isInstalled) {
      return false;
    }

    // Não sugerir se não é installable
    if (!stats.isInstallable) {
      return false;
    }

    // Não sugerir se não pode mostrar prompt
    if (!stats.canShowPrompt) {
      return false;
    }

    return true;
  }

  /**
   * Obter plataforma
   */
  getPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    const ua = navigator.userAgent;
    
    if (/iPad|iPhone|iPod/.test(ua)) {
      return 'ios';
    }
    
    if (/android/i.test(ua)) {
      return 'android';
    }
    
    if (/Win|Mac|Linux/.test(ua)) {
      return 'desktop';
    }
    
    return 'unknown';
  }

  /**
   * Verificar se plataforma suporta install prompt
   */
  supportsInstallPrompt(): boolean {
    // iOS não suporta beforeinstallprompt
    return this.getPlatform() !== 'ios';
  }
}

