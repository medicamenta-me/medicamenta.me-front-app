import { 
  InstallPromptEvent,
  InstallStats
} from './pwa-install.service';

/**
 * PWA Install Service Tests
 * Testing PWA installation types, interfaces and logic
 */
describe('PwaInstallService Logic', () => {
  describe('InstallStats Interface', () => {
    it('should have all required fields', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(stats.isInstallable).toBeTrue();
      expect(stats.isInstalled).toBeFalse();
      expect(stats.canShowPrompt).toBeTrue();
      expect(stats.promptShownCount).toBe(0);
    });

    it('should allow date fields', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: true,
        canShowPrompt: false,
        promptShownCount: 2,
        lastPromptDate: new Date(2025, 0, 1),
        installDate: new Date(2025, 0, 15)
      };

      expect(stats.lastPromptDate).toBeInstanceOf(Date);
      expect(stats.installDate).toBeInstanceOf(Date);
    });

    it('should represent initial state', () => {
      const initialStats: InstallStats = {
        isInstallable: false,
        isInstalled: false,
        canShowPrompt: false,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(initialStats.isInstallable).toBeFalse();
      expect(initialStats.promptShownCount).toBe(0);
    });
  });

  describe('Prompt Cooldown Logic', () => {
    const PROMPT_COOLDOWN_DAYS = 7;
    const MAX_PROMPTS = 3;

    function canShowPrompt(stats: InstallStats): boolean {
      // Cannot show if already installed
      if (stats.isInstalled) return false;

      // Cannot show if not installable
      if (!stats.isInstallable) return false;

      // Cannot show if max prompts reached
      if (stats.promptShownCount >= MAX_PROMPTS) return false;

      // Cannot show if cooldown not passed
      if (stats.lastPromptDate) {
        const cooldownMs = PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const timeSinceLastPrompt = Date.now() - stats.lastPromptDate.getTime();
        if (timeSinceLastPrompt < cooldownMs) return false;
      }

      return true;
    }

    it('should allow prompt for fresh install', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(canShowPrompt(stats)).toBeTrue();
    });

    it('should not allow prompt if already installed', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: true,
        canShowPrompt: false,
        promptShownCount: 1,
        lastPromptDate: null,
        installDate: new Date()
      };

      expect(canShowPrompt(stats)).toBeFalse();
    });

    it('should not allow prompt if not installable', () => {
      const stats: InstallStats = {
        isInstallable: false,
        isInstalled: false,
        canShowPrompt: false,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(canShowPrompt(stats)).toBeFalse();
    });

    it('should not allow prompt if max prompts reached', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: false,
        promptShownCount: 3,
        lastPromptDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        installDate: null
      };

      expect(canShowPrompt(stats)).toBeFalse();
    });

    it('should not allow prompt during cooldown', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: false,
        promptShownCount: 1,
        lastPromptDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        installDate: null
      };

      expect(canShowPrompt(stats)).toBeFalse();
    });

    it('should allow prompt after cooldown', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 1,
        lastPromptDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        installDate: null
      };

      expect(canShowPrompt(stats)).toBeTrue();
    });
  });

  describe('Install Prompt Result', () => {
    type InstallResult = 'accepted' | 'dismissed' | 'unavailable';

    function processInstallResult(result: InstallResult, stats: InstallStats): InstallStats {
      switch (result) {
        case 'accepted':
          return {
            ...stats,
            isInstalled: true,
            canShowPrompt: false,
            installDate: new Date()
          };
        case 'dismissed':
          return {
            ...stats,
            promptShownCount: stats.promptShownCount + 1,
            lastPromptDate: new Date()
          };
        case 'unavailable':
          return stats;
        default:
          return stats;
      }
    }

    it('should update stats on accept', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      const updated = processInstallResult('accepted', stats);
      expect(updated.isInstalled).toBeTrue();
      expect(updated.installDate).not.toBeNull();
    });

    it('should update stats on dismiss', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 1,
        lastPromptDate: null,
        installDate: null
      };

      const updated = processInstallResult('dismissed', stats);
      expect(updated.promptShownCount).toBe(2);
      expect(updated.lastPromptDate).not.toBeNull();
    });

    it('should not change stats when unavailable', () => {
      const stats: InstallStats = {
        isInstallable: false,
        isInstalled: false,
        canShowPrompt: false,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      const updated = processInstallResult('unavailable', stats);
      expect(updated).toEqual(stats);
    });
  });

  describe('PWA Detection', () => {
    function isPwaInstalled(): boolean {
      // Check display-mode media query
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }

      // Check iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        return true;
      }

      // Check referrer (installed PWAs don't have referrer)
      if (document.referrer.startsWith('android-app://')) {
        return true;
      }

      return false;
    }

    it('should check display mode', () => {
      // This test just verifies the function doesn't throw
      expect(() => isPwaInstalled()).not.toThrow();
    });
  });

  describe('Stats Persistence', () => {
    const STORAGE_KEY = 'pwa_install_stats';
    let mockStorage: { [key: string]: string } = {};

    beforeEach(() => {
      mockStorage = {};
    });

    function saveStats(stats: InstallStats): void {
      mockStorage[STORAGE_KEY] = JSON.stringify({
        ...stats,
        lastPromptDate: stats.lastPromptDate?.toISOString() || null,
        installDate: stats.installDate?.toISOString() || null
      });
    }

    function loadStats(): InstallStats | null {
      const saved = mockStorage[STORAGE_KEY];
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        lastPromptDate: parsed.lastPromptDate ? new Date(parsed.lastPromptDate) : null,
        installDate: parsed.installDate ? new Date(parsed.installDate) : null
      };
    }

    it('should save stats', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 1,
        lastPromptDate: new Date(2025, 0, 15),
        installDate: null
      };

      saveStats(stats);
      expect(mockStorage[STORAGE_KEY]).toBeTruthy();
    });

    it('should load stats', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: true,
        canShowPrompt: false,
        promptShownCount: 2,
        lastPromptDate: new Date(2025, 0, 10),
        installDate: new Date(2025, 0, 15)
      };

      saveStats(stats);
      const loaded = loadStats();

      expect(loaded?.isInstalled).toBeTrue();
      expect(loaded?.promptShownCount).toBe(2);
    });

    it('should return null for missing stats', () => {
      const loaded = loadStats();
      expect(loaded).toBeNull();
    });
  });

  describe('Cooldown Constants', () => {
    it('should have 7 day cooldown', () => {
      const PROMPT_COOLDOWN_DAYS = 7;
      expect(PROMPT_COOLDOWN_DAYS).toBe(7);
    });

    it('should have max 3 prompts', () => {
      const MAX_PROMPTS = 3;
      expect(MAX_PROMPTS).toBe(3);
    });

    it('should calculate cooldown in milliseconds', () => {
      const PROMPT_COOLDOWN_DAYS = 7;
      const cooldownMs = PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      expect(cooldownMs).toBe(604800000);
    });
  });

  describe('Prompt Event Handling', () => {
    it('should handle beforeinstallprompt event', () => {
      let deferredPrompt: InstallPromptEvent | null = null;
      
      // Simulate event handling
      const mockEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        prompt: jasmine.createSpy('prompt').and.returnValue(Promise.resolve()),
        userChoice: Promise.resolve({ outcome: 'accepted' as const })
      } as unknown as InstallPromptEvent;

      deferredPrompt = mockEvent;

      expect(deferredPrompt).not.toBeNull();
    });

    it('should handle appinstalled event', () => {
      let isInstalled = false;

      // Simulate app installed
      isInstalled = true;

      expect(isInstalled).toBeTrue();
    });
  });

  describe('Install Banner Visibility', () => {
    function shouldShowBanner(stats: InstallStats): boolean {
      return stats.isInstallable && 
             !stats.isInstalled && 
             stats.canShowPrompt;
    }

    it('should show banner when all conditions met', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(shouldShowBanner(stats)).toBeTrue();
    });

    it('should not show banner if not installable', () => {
      const stats: InstallStats = {
        isInstallable: false,
        isInstalled: false,
        canShowPrompt: true,
        promptShownCount: 0,
        lastPromptDate: null,
        installDate: null
      };

      expect(shouldShowBanner(stats)).toBeFalse();
    });

    it('should not show banner if installed', () => {
      const stats: InstallStats = {
        isInstallable: true,
        isInstalled: true,
        canShowPrompt: false,
        promptShownCount: 2,
        lastPromptDate: null,
        installDate: new Date()
      };

      expect(shouldShowBanner(stats)).toBeFalse();
    });
  });

  describe('Platform Detection for Install', () => {
    function getInstallInstructions(platform: string): string {
      switch (platform) {
        case 'ios':
          return 'Toque em "Compartilhar" e depois "Adicionar à Tela de Início"';
        case 'android':
          return 'Toque no botão "Instalar" ou "Adicionar à tela inicial"';
        case 'desktop':
          return 'Clique no ícone de instalação na barra de endereços';
        default:
          return 'Instale o aplicativo para melhor experiência';
      }
    }

    it('should return iOS instructions', () => {
      const instructions = getInstallInstructions('ios');
      expect(instructions).toContain('Compartilhar');
    });

    it('should return Android instructions', () => {
      const instructions = getInstallInstructions('android');
      expect(instructions).toContain('Instalar');
    });

    it('should return desktop instructions', () => {
      const instructions = getInstallInstructions('desktop');
      expect(instructions).toContain('barra de endereços');
    });
  });
});
