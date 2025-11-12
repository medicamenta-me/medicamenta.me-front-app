import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonProgressBar,
  IonLabel,
  IonItem,
  IonList,
  IonSegment,
  IonSegmentButton,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  trophyOutline,
  peopleOutline,
  flameOutline,
  ribbonOutline,
  starOutline
} from 'ionicons/icons';
import { FamilyGamificationService, FAMILY_ACHIEVEMENT_DEFINITIONS } from '../../services/family-gamification.service';

type TabType = 'achievements' | 'ranking' | 'stats';

/**
 * Modal de Conquistas Familiares
 * Exibe conquistas desbloqueadas, ranking de membros e estatísticas
 */
@Component({
  selector: 'app-family-achievements-modal',
  templateUrl: './family-achievements-modal.component.html',
  styleUrls: ['./family-achievements-modal.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonProgressBar,
    IonLabel,
    IonItem,
    IonList,
    IonSegment,
    IonSegmentButton
  ]
})
export class FamilyAchievementsModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly familyGamificationService = inject(FamilyGamificationService);

  // Estado
  public readonly selectedTab = signal<TabType>('achievements');
  public readonly animatingAchievement = signal<string | null>(null);

  // Dados computados do serviço
  public readonly familyGamification = this.familyGamificationService.familyGamification;
  public readonly totalPoints = this.familyGamificationService.totalFamilyPoints;
  public readonly level = this.familyGamificationService.familyLevel;
  public readonly levelProgress = this.familyGamificationService.levelProgress;
  public readonly memberRanking = this.familyGamificationService.memberStatsRanking;
  public readonly currentStreak = this.familyGamificationService.currentStreak;
  public readonly longestStreak = this.familyGamificationService.longestStreak;
  
  // Expor constantes para o template
  public readonly FAMILY_ACHIEVEMENT_DEFINITIONS = FAMILY_ACHIEVEMENT_DEFINITIONS;

  // Todas as conquistas com status
  public readonly allAchievements = signal<Array<any>>([]);

  constructor() {
    addIcons({
      closeOutline,
      trophyOutline,
      peopleOutline,
      flameOutline,
      ribbonOutline,
      starOutline
    });
  }

  ngOnInit(): void {
    this.loadAchievements();
  }

  /**
   * Carrega todas as conquistas com status
   */
  private loadAchievements(): void {
    const achievements = this.familyGamificationService.getAllAchievementsWithStatus();
    
    // Ordenar: desbloqueadas primeiro, depois por raridade
    const sorted = achievements.sort((a, b) => {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });

    this.allAchievements.set(sorted);
  }

  /**
   * Muda a aba selecionada
   */
  changeTab(event: any): void {
    this.selectedTab.set(event.detail.value as TabType);
  }

  /**
   * Fecha o modal
   */
  dismiss(): void {
    this.modalController.dismiss();
  }

  /**
   * Formata data para exibição
   */
  formatDate(date?: Date): string {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
    if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
    return `${Math.floor(days / 365)} anos atrás`;
  }

  /**
   * Retorna classe CSS baseada na raridade
   */
  getRarityClass(rarity: string): string {
    return `rarity-${rarity}`;
  }

  /**
   * Retorna cor do badge baseada na posição no ranking
   */
  getRankingBadgeColor(position: number): string {
    if (position === 0) return 'warning'; // Ouro
    if (position === 1) return 'medium'; // Prata
    if (position === 2) return 'primary'; // Bronze
    return 'light';
  }

  /**
   * Retorna ícone do ranking baseado na posição
   */
  getRankingIcon(position: number): string {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `${position + 1}º`;
  }

  /**
   * Anima uma conquista quando clicada
   */
  animateAchievement(achievementId: string): void {
    this.animatingAchievement.set(achievementId);
    setTimeout(() => {
      this.animatingAchievement.set(null);
    }, 1000);
  }

  /**
   * Obtém mensagem de progresso para próximo nível
   */
  getNextLevelMessage(): string {
    const current = this.totalPoints();
    const level = this.level();
    const nextLevelPoints = this.calculatePointsForLevel(level + 1);
    const needed = nextLevelPoints - current;
    return `Faltam ${needed.toLocaleString()} pontos para o nível ${level + 1}`;
  }

  /**
   * Calcula pontos para um nível (mesmo cálculo do serviço)
   */
  private calculatePointsForLevel(level: number): number {
    return Math.floor(500 * Math.pow(level, 1.5));
  }

  /**
   * Obtém estatísticas gerais da família
   */
  getFamilyStats(): { label: string; value: string; icon: string }[] {
    const data = this.familyGamification();
    if (!data) return [];

    return [
      {
        label: 'Doses Tomadas',
        value: data.totalDosesTaken.toLocaleString(),
        icon: '💊'
      },
      {
        label: 'Dias Perfeitos',
        value: data.perfectDays.toLocaleString(),
        icon: '⭐'
      },
      {
        label: 'Streak Atual',
        value: `${data.currentStreak} dias`,
        icon: '🔥'
      },
      {
        label: 'Maior Streak',
        value: `${data.longestStreak} dias`,
        icon: '🏆'
      },
      {
        label: 'Conquistas',
        value: `${data.achievements.length}/${FAMILY_ACHIEVEMENT_DEFINITIONS.length}`,
        icon: '🎖️'
      },
      {
        label: 'Membros Ativos',
        value: data.memberStats.length.toString(),
        icon: '👥'
      }
    ];
  }
}
