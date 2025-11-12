import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { GamificationService } from '../../services/gamification.service';
import { AchievementCardComponent } from '../achievement-card/achievement-card.component';
import { Achievement } from '../../models/achievement.model';

type FilterType = 'all' | 'unlocked' | 'locked';
type CategoryType = 'all' | 'adherence' | 'caregiving' | 'organization' | 'streak' | 'social';
type TierType = 'all' | 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Achievement List Component
 * Full page component listing all achievements with filters
 */
@Component({
  selector: 'app-achievement-list',
  standalone: true,
  imports: [CommonModule, IonicModule, AchievementCardComponent],
  template: `
    <div class="achievement-list-container">
      <!-- Stats Header -->
      <div class="stats-header">
        <div class="stat-card">
          <div class="stat-value">{{ unlockedCount() }}</div>
          <div class="stat-label">Desbloqueadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalAchievements() }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ completionPercent() }}%</div>
          <div class="stat-label">Progresso</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-container">
        <!-- Status Filter -->
        <div class="filter-group">
          <ion-segment [value]="statusFilter()" (ionChange)="onStatusFilterChange($event)">
            <ion-segment-button value="all">
              <ion-label>Todas</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unlocked">
              <ion-label>Desbloqueadas</ion-label>
            </ion-segment-button>
            <ion-segment-button value="locked">
              <ion-label>Bloqueadas</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- Category Filter -->
        <div class="filter-group">
          <ion-label class="filter-label">Categoria</ion-label>
          <ion-select 
            [value]="categoryFilter()" 
            (ionChange)="onCategoryFilterChange($event)"
            interface="popover"
            placeholder="Selecione"
          >
            <ion-select-option value="all">Todas</ion-select-option>
            <ion-select-option value="adherence">Adesão</ion-select-option>
            <ion-select-option value="caregiving">Cuidado</ion-select-option>
            <ion-select-option value="organization">Organização</ion-select-option>
            <ion-select-option value="streak">Sequência</ion-select-option>
            <ion-select-option value="social">Social</ion-select-option>
          </ion-select>
        </div>

        <!-- Tier Filter -->
        <div class="filter-group">
          <ion-label class="filter-label">Tier</ion-label>
          <ion-select 
            [value]="tierFilter()" 
            (ionChange)="onTierFilterChange($event)"
            interface="popover"
            placeholder="Selecione"
          >
            <ion-select-option value="all">Todos</ion-select-option>
            <ion-select-option value="bronze">🥉 Bronze</ion-select-option>
            <ion-select-option value="silver">🥈 Prata</ion-select-option>
            <ion-select-option value="gold">🥇 Ouro</ion-select-option>
            <ion-select-option value="platinum">💎 Platina</ion-select-option>
          </ion-select>
        </div>
      </div>

      <!-- Achievement List -->
      <div class="achievements-grid">
        @if (filteredAchievements().length === 0) {
          <div class="empty-state">
            <ion-icon name="trophy-outline"></ion-icon>
            <p>Nenhuma conquista encontrada</p>
            <ion-button size="small" (click)="clearFilters()">
              Limpar Filtros
            </ion-button>
          </div>
        }
        
        @for (achievement of filteredAchievements(); track achievement.id) {
          <app-achievement-card 
            [achievement]="achievement"
            (cardClick)="onAchievementClick($event)"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .achievement-list-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 16px;
      padding-bottom: 80px; /* Space for bottom tabs */
    }

    .stats-header {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--ion-color-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--ion-color-medium);
      margin-top: 4px;
      text-align: center;
    }

    .filters-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    ion-segment {
      --background: var(--ion-color-light);
    }

    ion-select {
      width: 100%;
      max-width: 100%;
    }

    .achievements-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-state ion-icon {
      font-size: 64px;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    .empty-state p {
      font-size: 16px;
      color: var(--ion-color-medium-shade);
      margin-bottom: 16px;
    }

    @media (min-width: 768px) {
      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
    }

    @media (min-width: 1024px) {
      .achievements-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `]
})
export class AchievementListComponent {
  private readonly gamificationService = inject(GamificationService);

  // Filters
  protected readonly statusFilter = signal<FilterType>('all');
  protected readonly categoryFilter = signal<CategoryType>('all');
  protected readonly tierFilter = signal<TierType>('all');

  // Data
  protected readonly achievements = this.gamificationService.achievements;
  protected readonly totalAchievements = computed(() => this.achievements().length);
  protected readonly unlockedCount = computed(() => 
    this.achievements().filter(a => a.unlocked).length
  );
  protected readonly completionPercent = computed(() => {
    const total = this.totalAchievements();
    if (total === 0) return 0;
    return Math.round((this.unlockedCount() / total) * 100);
  });

  // Filtered achievements
  protected readonly filteredAchievements = computed(() => {
    let filtered = this.achievements();

    // Status filter
    const status = this.statusFilter();
    if (status === 'unlocked') {
      filtered = filtered.filter(a => a.unlocked);
    } else if (status === 'locked') {
      filtered = filtered.filter(a => !a.unlocked);
    }

    // Category filter
    const category = this.categoryFilter();
    if (category !== 'all') {
      filtered = filtered.filter(a => a.category === category);
    }

    // Tier filter
    const tier = this.tierFilter();
    if (tier !== 'all') {
      filtered = filtered.filter(a => a.tier === tier);
    }

    // Sort: unlocked first, then by points descending
    return filtered.sort((a, b) => {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      return b.points - a.points;
    });
  });

  // Filter handlers
  protected onStatusFilterChange(event: any): void {
    this.statusFilter.set(event.detail.value);
  }

  protected onCategoryFilterChange(event: any): void {
    this.categoryFilter.set(event.detail.value);
  }

  protected onTierFilterChange(event: any): void {
    this.tierFilter.set(event.detail.value);
  }

  protected clearFilters(): void {
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.tierFilter.set('all');
  }

  protected onAchievementClick(achievement: Achievement): void {
    console.log('Achievement clicked:', achievement);
    // Could open modal with detailed info
  }
}
