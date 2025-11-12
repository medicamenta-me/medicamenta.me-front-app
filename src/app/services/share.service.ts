import { Injectable, inject, signal } from '@angular/core';
import { Achievement } from '../models/achievement.model';
import { ToastService } from './toast.service';
import { AnalyticsService } from './analytics.service';
import { LogService } from './log.service';

/**
 * ShareService
 * Handles social sharing of achievements, profiles, and gamification content
 * Uses Web Share API with image generation via html2canvas
 */
@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private toast = inject(ToastService);
  private analytics = inject(AnalyticsService);
  private readonly logService = inject(LogService);

  // Loading state signal for image generation
  public readonly isGeneratingImage = signal<boolean>(false);

  /**
   * Check if Web Share API is available
   */
  isShareAvailable(): boolean {
    return 'share' in navigator;
  }

  /**
   * Check if Web Share API supports files
   */
  canShareFiles(): boolean {
    return 'canShare' in navigator && navigator.canShare({ files: [] });
  }

  /**
   * Share an achievement with text and optional image
   */
  async shareAchievement(achievement: Achievement, includeImage: boolean = false): Promise<void> {
    try {
      // Generate share text
      const text = this.generateAchievementText(achievement);
      const title = '🏆 Nova Conquista Medicamenta.me!';

      // Prepare share data
      const shareData: ShareData = {
        title: title,
        text: text,
        url: window.location.origin
      };

      // Add image if requested and supported
      if (includeImage && this.canShareFiles()) {
        const imageBlob = await this.generateAchievementImage(achievement);
        if (imageBlob) {
          const file = new File([imageBlob], 'achievement.png', { type: 'image/png' });
          shareData.files = [file];
        }
      }

      // Share via Web Share API
      if (this.isShareAvailable()) {
        await navigator.share(shareData);
        
        // Track analytics
        this.analytics.logEvent('share_achievement', {
          achievement_id: achievement.id,
          tier: achievement.tier,
          include_image: includeImage,
          method: 'web_share_api'
        });

        this.toast.showSuccess('Conquista compartilhada com sucesso! 🎉');
      } else {
        // Fallback: Copy to clipboard
        await this.copyToClipboard(text);
        
        this.analytics.logEvent('share_achievement', {
          achievement_id: achievement.id,
          tier: achievement.tier,
          include_image: false,
          method: 'clipboard'
        });

        this.toast.showSuccess('Texto copiado para a área de transferência! 📋');
      }

    } catch (error: any) {
      // User cancelled share
      if (error.name === 'AbortError') {
        this.logService.info('ShareService', 'Share cancelled by user');
        return;
      }

      this.logService.error('ShareService', 'Error sharing achievement', error as Error);
      this.toast.showError('Erro ao compartilhar conquista. Tente novamente.');
    }
  }

  /**
   * Share profile stats (level, achievements, points, streak)
   */
  async shareProfile(stats: {
    userName: string;
    level: number;
    points: number;
    achievements: number;
    streak: number;
  }): Promise<void> {
    try {
      const text = this.generateProfileText(stats);
      const title = '🎮 Meu Progresso no Medicamenta.me';

      const shareData: ShareData = {
        title: title,
        text: text,
        url: window.location.origin
      };

      if (this.isShareAvailable()) {
        await navigator.share(shareData);

        this.analytics.logEvent('share_profile', {
          level: stats.level,
          points: stats.points,
          achievements: stats.achievements,
          streak: stats.streak,
          method: 'web_share_api'
        });

        this.toast.showSuccess('Perfil compartilhado com sucesso! 🎉');
      } else {
        await this.copyToClipboard(text);
        
        this.analytics.logEvent('share_profile', {
          level: stats.level,
          points: stats.points,
          achievements: stats.achievements,
          streak: stats.streak,
          method: 'clipboard'
        });

        this.toast.showSuccess('Texto copiado para a área de transferência! 📋');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logService.info('ShareService', 'Share cancelled by user');
        return;
      }

      this.logService.error('ShareService', 'Error sharing profile', error as Error);
      this.toast.showError('Erro ao compartilhar perfil. Tente novamente.');
    }
  }

  /**
   * Share streak milestone
   */
  async shareStreak(days: number): Promise<void> {
    try {
      const text = `🔥 ${days} dias de streak no Medicamenta.me!\n\n` +
                   `Estou mantendo minha rotina de medicamentos em dia! 💊✨\n\n` +
                   `Junte-se a mim: ${window.location.origin}`;

      const title = `🔥 ${days} dias de streak!`;

      const shareData: ShareData = {
        title: title,
        text: text,
        url: window.location.origin
      };

      if (this.isShareAvailable()) {
        await navigator.share(shareData);

        this.logService.info('ShareService', 'Streak shared', { days });

        this.toast.showSuccess('Streak compartilhado com sucesso! 🔥');
      } else {
        await this.copyToClipboard(text);
        this.toast.showSuccess('Texto copiado para a área de transferência! 📋');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      this.logService.error('ShareService', 'Error sharing streak', error as Error);
      this.toast.showError('Erro ao compartilhar streak.');
    }
  }

  /**
   * Generate achievement share text
   */
  private generateAchievementText(achievement: Achievement): string {
    const tierEmoji = this.getTierEmoji(achievement.tier);
    
    let text = `🏆 Desbloqueei "${achievement.name}" no Medicamenta.me!\n\n`;
    text += `${tierEmoji} Conquista ${this.getTierName(achievement.tier)}\n`;
    text += `⭐ ${achievement.points} pontos ganhos\n\n`;
    text += `"${achievement.description}"\n\n`;
    text += `Junte-se a mim no cuidado com a saúde: ${window.location.origin}`;

    return text;
  }

  /**
   * Generate profile share text
   */
  private generateProfileText(stats: {
    userName: string;
    level: number;
    points: number;
    achievements: number;
    streak: number;
  }): string {
    let text = `🎮 Meu progresso no Medicamenta.me!\n\n`;
    text += `👤 ${stats.userName}\n`;
    text += `🎯 Nível ${stats.level}\n`;
    text += `🏆 ${stats.achievements} conquistas desbloqueadas\n`;
    text += `⭐ ${stats.points} pontos totais\n`;
    text += `🔥 ${stats.streak} dias de streak\n\n`;
    text += `Estou cuidando da minha saúde de forma gamificada! 💊✨\n\n`;
    text += `Experimente: ${window.location.origin}`;

    return text;
  }

  /**
   * Generate achievement image using html2canvas
   */
  private async generateAchievementImage(achievement: Achievement): Promise<Blob | null> {
    try {
      // Set loading state
      this.isGeneratingImage.set(true);

      // Create temporary canvas container
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 600px;
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
      `;

      // Build achievement card HTML
      const tierColor = this.getTierColor(achievement.tier);
      container.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 80px; margin-bottom: 20px;">
            ${this.getIconEmoji(achievement.icon)}
          </div>
          <div style="
            display: inline-block;
            padding: 8px 16px;
            background: ${tierColor};
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 20px;
          ">
            ${this.getTierEmoji(achievement.tier)} ${this.getTierName(achievement.tier)}
          </div>
          <h2 style="font-size: 32px; margin: 20px 0; font-weight: bold;">
            ${achievement.name}
          </h2>
          <p style="font-size: 18px; opacity: 0.9; margin-bottom: 30px;">
            ${achievement.description}
          </p>
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 30px;
            font-size: 24px;
            font-weight: bold;
          ">
            ⭐ ${achievement.points} pontos
          </div>
          <div style="margin-top: 40px; font-size: 16px; opacity: 0.8;">
            🎮 Medicamenta.me
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Lazy load html2canvas
      const html2canvas = await import('html2canvas').then(m => m.default);

      // Capture canvas
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: 2,
        logging: false
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob: Blob | null) => resolve(blob), 'image/png', 0.95);
      });

    } catch (error: any) {
      this.logService.error('ShareService', 'Error generating achievement image', error as Error);
      return null;
    } finally {
      // Clear loading state
      this.isGeneratingImage.set(false);
    }
  }

  /**
   * Copy text to clipboard (fallback)
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (error: any) {
      this.logService.error('ShareService', 'Error copying to clipboard', error as Error);
      throw error;
    }
  }

  /**
   * Get tier emoji
   */
  private getTierEmoji(tier: string): string {
    const emojis: Record<string, string> = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎'
    };
    return emojis[tier] || '🏆';
  }

  /**
   * Get tier name (Portuguese)
   */
  private getTierName(tier: string): string {
    const names: Record<string, string> = {
      bronze: 'Bronze',
      silver: 'Prata',
      gold: 'Ouro',
      platinum: 'Platina'
    };
    return names[tier] || 'Conquista';
  }

  /**
   * Get tier color
   */
  private getTierColor(tier: string): string {
    const colors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2'
    };
    return colors[tier] || '#667eea';
  }

  /**
   * Convert icon name to emoji (simplified mapping)
   */
  private getIconEmoji(iconName: string): string {
    const emojiMap: Record<string, string> = {
      'checkmark-circle': '✅',
      'flame': '🔥',
      'trophy': '🏆',
      'star': '⭐',
      'ribbon': '🎖️',
      'medal': '🏅',
      'rocket': '🚀',
      'heart': '❤️',
      'calendar': '📅',
      'time': '⏰',
      'people': '👥',
      'flash': '⚡',
      'thumbs-up': '👍'
    };

    // Try to find emoji by icon name parts
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (iconName.includes(key)) {
        return emoji;
      }
    }

    return '🏆'; // Default trophy
  }
}

