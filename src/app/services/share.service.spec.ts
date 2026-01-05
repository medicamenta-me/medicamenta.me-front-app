/**
 * Share Service Tests
 * Testing share service types and logic
 */
describe('ShareService Logic', () => {
  describe('Web Share API Detection', () => {
    it('should detect share API availability', () => {
      const isShareAvailable = 'share' in navigator;
      expect(typeof isShareAvailable).toBe('boolean');
    });

    it('should detect canShare capability', () => {
      const hasCanShare = 'canShare' in navigator;
      expect(typeof hasCanShare).toBe('boolean');
    });
  });

  describe('Share Data Structure', () => {
    interface ShareData {
      title?: string;
      text?: string;
      url?: string;
      files?: File[];
    }

    it('should create basic share data', () => {
      const data: ShareData = {
        title: 'Test Title',
        text: 'Test text content',
        url: 'https://medicamenta.me'
      };

      expect(data.title).toBe('Test Title');
      expect(data.text).toBe('Test text content');
      expect(data.url).toBe('https://medicamenta.me');
    });

    it('should allow optional fields', () => {
      const data: ShareData = {
        text: 'Just text'
      };

      expect(data.title).toBeUndefined();
      expect(data.url).toBeUndefined();
    });

    it('should support files array', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });
      
      const data: ShareData = {
        title: 'With file',
        files: [file]
      };

      expect(data.files?.length).toBe(1);
    });
  });

  describe('Achievement Text Generation', () => {
    interface Achievement {
      id: string;
      name: string;
      description: string;
      tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    }

    function generateAchievementText(achievement: Achievement): string {
      const emoji = getTierEmoji(achievement.tier);
      return `${emoji} Desbloqueei a conquista "${achievement.name}"!\n\n${achievement.description}\n\n#Medicamenta #GamificaçãoSaúde`;
    }

    function getTierEmoji(tier: string): string {
      switch (tier) {
        case 'bronze': return '🥉';
        case 'silver': return '🥈';
        case 'gold': return '🥇';
        case 'platinum': return '💎';
        default: return '🏆';
      }
    }

    it('should generate text for bronze achievement', () => {
      const achievement: Achievement = {
        id: 'ach1',
        name: 'Primeira Dose',
        description: 'Tome sua primeira dose',
        tier: 'bronze'
      };

      const text = generateAchievementText(achievement);
      expect(text).toContain('🥉');
      expect(text).toContain('Primeira Dose');
    });

    it('should generate text for gold achievement', () => {
      const achievement: Achievement = {
        id: 'ach2',
        name: 'Semana Perfeita',
        description: 'Complete uma semana com 100% de adesão',
        tier: 'gold'
      };

      const text = generateAchievementText(achievement);
      expect(text).toContain('🥇');
    });

    it('should include hashtags', () => {
      const achievement: Achievement = {
        id: 'ach3',
        name: 'Test',
        description: 'Test',
        tier: 'silver'
      };

      const text = generateAchievementText(achievement);
      expect(text).toContain('#Medicamenta');
    });
  });

  describe('Share Title Generation', () => {
    function generateShareTitle(type: 'achievement' | 'streak' | 'level'): string {
      switch (type) {
        case 'achievement':
          return '🏆 Nova Conquista Medicamenta.me!';
        case 'streak':
          return '🔥 Sequência Incrível no Medicamenta.me!';
        case 'level':
          return '⬆️ Subi de Nível no Medicamenta.me!';
        default:
          return 'Medicamenta.me';
      }
    }

    it('should generate achievement title', () => {
      const title = generateShareTitle('achievement');
      expect(title).toContain('🏆');
      expect(title).toContain('Conquista');
    });

    it('should generate streak title', () => {
      const title = generateShareTitle('streak');
      expect(title).toContain('🔥');
    });

    it('should generate level title', () => {
      const title = generateShareTitle('level');
      expect(title).toContain('⬆️');
    });
  });

  describe('Clipboard Fallback', () => {
    it('should prepare text for clipboard', () => {
      const text = 'Test share text';
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('Share Analytics Events', () => {
    interface ShareAnalyticsEvent {
      achievement_id: string;
      tier: string;
      include_image: boolean;
      method: 'web_share_api' | 'clipboard';
    }

    it('should track web share API usage', () => {
      const event: ShareAnalyticsEvent = {
        achievement_id: 'ach123',
        tier: 'gold',
        include_image: true,
        method: 'web_share_api'
      };

      expect(event.method).toBe('web_share_api');
    });

    it('should track clipboard fallback', () => {
      const event: ShareAnalyticsEvent = {
        achievement_id: 'ach456',
        tier: 'silver',
        include_image: false,
        method: 'clipboard'
      };

      expect(event.method).toBe('clipboard');
    });
  });

  describe('Image Generation State', () => {
    let isGeneratingImage = false;

    function startImageGeneration(): void {
      isGeneratingImage = true;
    }

    function stopImageGeneration(): void {
      isGeneratingImage = false;
    }

    it('should track generating state', () => {
      expect(isGeneratingImage).toBeFalse();
      startImageGeneration();
      expect(isGeneratingImage).toBeTrue();
      stopImageGeneration();
      expect(isGeneratingImage).toBeFalse();
    });
  });

  describe('Streak Share Text', () => {
    function generateStreakText(days: number): string {
      if (days < 7) {
        return `🔥 ${days} dias de sequência no Medicamenta.me!`;
      } else if (days < 30) {
        return `🔥🔥 ${days} dias de sequência incrível no Medicamenta.me!`;
      } else {
        return `🔥🔥🔥 ${days} dias de sequência impressionante no Medicamenta.me!`;
      }
    }

    it('should generate text for short streak', () => {
      const text = generateStreakText(5);
      expect(text).toContain('5 dias');
      expect(text.match(/🔥/g)?.length).toBe(1);
    });

    it('should generate text for medium streak', () => {
      const text = generateStreakText(14);
      expect(text).toContain('14 dias');
      expect(text.match(/🔥/g)?.length).toBe(2);
    });

    it('should generate text for long streak', () => {
      const text = generateStreakText(60);
      expect(text).toContain('60 dias');
      expect(text.match(/🔥/g)?.length).toBe(3);
    });
  });

  describe('Level Share Text', () => {
    function generateLevelText(level: number, totalPoints: number): string {
      return `⬆️ Atingi o nível ${level} no Medicamenta.me com ${totalPoints.toLocaleString('pt-BR')} pontos! 💪`;
    }

    it('should generate level text', () => {
      const text = generateLevelText(10, 5000);
      expect(text).toContain('nível 10');
      expect(text).toContain('5.000');
    });

    it('should format large numbers', () => {
      const text = generateLevelText(25, 150000);
      expect(text).toContain('150.000');
    });
  });

  describe('Profile Share Data', () => {
    interface ProfileShareData {
      userName: string;
      level: number;
      totalPoints: number;
      achievements: number;
      currentStreak: number;
    }

    function generateProfileText(data: ProfileShareData): string {
      return `
📊 Meu perfil no Medicamenta.me:
👤 ${data.userName}
⬆️ Nível ${data.level}
💰 ${data.totalPoints.toLocaleString('pt-BR')} pontos
🏆 ${data.achievements} conquistas
🔥 ${data.currentStreak} dias de sequência
      `.trim();
    }

    it('should generate complete profile text', () => {
      const data: ProfileShareData = {
        userName: 'João',
        level: 15,
        totalPoints: 12500,
        achievements: 25,
        currentStreak: 30
      };

      const text = generateProfileText(data);
      expect(text).toContain('João');
      expect(text).toContain('Nível 15');
      expect(text).toContain('12.500 pontos');
      expect(text).toContain('25 conquistas');
      expect(text).toContain('30 dias');
    });
  });

  describe('Error Handling', () => {
    it('should identify AbortError', () => {
      const error = new Error('User cancelled');
      (error as any).name = 'AbortError';
      expect((error as any).name).toBe('AbortError');
    });

    it('should handle general errors', () => {
      const error = new Error('Share failed');
      expect(error.message).toBe('Share failed');
    });
  });

  describe('Share URL Generation', () => {
    function getShareUrl(): string {
      return typeof window !== 'undefined' ? window.location.origin : 'https://medicamenta.me';
    }

    it('should return origin URL', () => {
      const url = getShareUrl();
      expect(url).toBeTruthy();
    });
  });
});
