import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { FamilyService } from './family.service';
import { GamificationService } from './gamification.service';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';
import { doc, getDoc, setDoc, Firestore, serverTimestamp } from 'firebase/firestore';

/**
 * Tipos de conquistas familiares
 */
export type FamilyAchievementType = 
  | 'family_perfect_week'      // Família 100% aderente por 7 dias
  | 'no_missed_month'           // Sem doses perdidas em um mês
  | 'all_members_active'        // Todos os membros ativos
  | 'perfect_month'             // 30 dias de aderência perfeita
  | 'early_bird_family'         // Todas as doses matinais tomadas no horário (7 dias)
  | 'night_owl_family'          // Todas as doses noturnas tomadas no horário (7 dias)
  | 'teamwork_champion'         // 100 doses marcadas corretamente
  | 'consistency_king'          // 90 dias consecutivos com aderência > 80%
  | 'perfect_quarter'           // 3 meses seguidos com aderência > 95%
  | 'family_veteran'            // 6 meses usando o app em família
  | 'gold_standard'             // 1 ano de aderência > 90%
  | 'family_unity';             // Todos os membros com pelo menos uma conquista

/**
 * Definição de conquista familiar
 */
export interface FamilyAchievementDefinition {
  id: FamilyAchievementType;
  name: string;
  description: string;
  icon: string;
  points: number;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * Conquista familiar desbloqueada
 */
export interface FamilyAchievement {
  achievementId: FamilyAchievementType;
  unlockedAt: Date;
  contributingMembers: string[]; // IDs dos membros que contribuíram
}

/**
 * Estatísticas de membro no contexto familiar
 */
export interface FamilyMemberStats {
  memberId: string;
  memberName: string;
  individualPoints: number;
  contributedAchievements: number;
  adherenceRate: number;
  activeDays: number;
}

/**
 * Dados de gamificação familiar
 */
export interface FamilyGamificationData {
  familyId: string; // ID do usuário principal
  totalPoints: number;
  level: number;
  achievements: FamilyAchievement[];
  memberStats: FamilyMemberStats[];
  currentStreak: number; // Dias consecutivos com aderência > 80%
  longestStreak: number;
  totalDosesTaken: number;
  perfectDays: number; // Dias com 100% aderência
  lastUpdated: Date;
}

/**
 * Definições de todas as conquistas familiares
 */
export const FAMILY_ACHIEVEMENT_DEFINITIONS: FamilyAchievementDefinition[] = [
  {
    id: 'family_perfect_week',
    name: 'Família 100% Aderente',
    description: 'Toda a família com 100% de aderência por 7 dias consecutivos',
    icon: '🏆',
    points: 500,
    color: '#FFD700',
    rarity: 'rare'
  },
  {
    id: 'no_missed_month',
    name: 'Sem Falhas',
    description: 'Nenhuma dose perdida por toda a família durante 30 dias',
    icon: '🌟',
    points: 1000,
    color: '#4CAF50',
    rarity: 'epic'
  },
  {
    id: 'all_members_active',
    name: 'Todos Ativos',
    description: 'Todos os membros da família marcaram pelo menos uma dose hoje',
    icon: '👨‍👩‍👧‍👦',
    points: 200,
    color: '#2196F3',
    rarity: 'common'
  },
  {
    id: 'perfect_month',
    name: 'Mês Perfeito',
    description: '30 dias consecutivos com aderência familiar acima de 95%',
    icon: '💎',
    points: 1500,
    color: '#9C27B0',
    rarity: 'epic'
  },
  {
    id: 'early_bird_family',
    name: 'Família Matutina',
    description: 'Todas as doses matinais tomadas no horário por 7 dias',
    icon: '🌅',
    points: 300,
    color: '#FF9800',
    rarity: 'common'
  },
  {
    id: 'night_owl_family',
    name: 'Família Noturna',
    description: 'Todas as doses noturnas tomadas no horário por 7 dias',
    icon: '🌙',
    points: 300,
    color: '#3F51B5',
    rarity: 'common'
  },
  {
    id: 'teamwork_champion',
    name: 'Campeões do Trabalho em Equipe',
    description: '100 doses marcadas corretamente pela família',
    icon: '🤝',
    points: 400,
    color: '#00BCD4',
    rarity: 'rare'
  },
  {
    id: 'consistency_king',
    name: 'Rei da Consistência',
    description: '90 dias consecutivos com aderência familiar acima de 80%',
    icon: '👑',
    points: 2000,
    color: '#FFD700',
    rarity: 'legendary'
  },
  {
    id: 'perfect_quarter',
    name: 'Trimestre Perfeito',
    description: '3 meses seguidos com aderência familiar acima de 95%',
    icon: '🔥',
    points: 3000,
    color: '#FF5722',
    rarity: 'legendary'
  },
  {
    id: 'family_veteran',
    name: 'Veterano Familiar',
    description: '6 meses usando o app em família',
    icon: '🎖️',
    points: 1000,
    color: '#795548',
    rarity: 'epic'
  },
  {
    id: 'gold_standard',
    name: 'Padrão Ouro',
    description: '1 ano de aderência familiar acima de 90%',
    icon: '🥇',
    points: 5000,
    color: '#FFD700',
    rarity: 'legendary'
  },
  {
    id: 'family_unity',
    name: 'Unidade Familiar',
    description: 'Todos os membros têm pelo menos uma conquista individual',
    icon: '💪',
    points: 800,
    color: '#E91E63',
    rarity: 'rare'
  }
];

/**
 * Serviço de Gamificação Familiar
 * Gerencia pontos compartilhados, conquistas colaborativas e ranking familiar
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyGamificationService {
  private readonly familyService = inject(FamilyService);
  private readonly gamificationService = inject(GamificationService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly userService = inject(UserService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);
  private readonly firestore: Firestore;

  private readonly _familyGamification = signal<FamilyGamificationData | null>(null);
  private readonly _isLoading = signal<boolean>(false);

  /**
   * Dados de gamificação familiar (somente leitura)
   */
  public readonly familyGamification = this._familyGamification.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();

  /**
   * Pontos totais da família
   */
  public readonly totalFamilyPoints = computed(() => {
    return this._familyGamification()?.totalPoints || 0;
  });

  /**
   * Nível da família baseado em pontos
   */
  public readonly familyLevel = computed(() => {
    return this._familyGamification()?.level || 1;
  });

  /**
   * Conquistas desbloqueadas
   */
  public readonly unlockedAchievements = computed(() => {
    return this._familyGamification()?.achievements || [];
  });

  /**
   * Estatísticas dos membros ordenadas por pontos
   */
  public readonly memberStatsRanking = computed(() => {
    const stats = this._familyGamification()?.memberStats || [];
    return [...stats].sort((a, b) => b.individualPoints - a.individualPoints);
  });

  /**
   * Progresso para o próximo nível
   */
  public readonly levelProgress = computed(() => {
    const points = this.totalFamilyPoints();
    const level = this.familyLevel();
    const currentLevelPoints = this.calculatePointsForLevel(level);
    const nextLevelPoints = this.calculatePointsForLevel(level + 1);
    const progress = ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
    return Math.min(100, Math.max(0, progress));
  });

  /**
   * Streak atual da família
   */
  public readonly currentStreak = computed(() => {
    return this._familyGamification()?.currentStreak || 0;
  });

  /**
   * Maior streak da família
   */
  public readonly longestStreak = computed(() => {
    return this._familyGamification()?.longestStreak || 0;
  });

  constructor() {
    this.firestore = this.firebaseService.firestore;

    // Carregar dados quando usuário muda
    effect(() => {
      const user = this.userService.currentUser();
      if (user?.id) {
        this.loadFamilyGamification(user.id);
      } else {
        this._familyGamification.set(null);
      }
    });
  }

  /**
   * Carrega dados de gamificação familiar do Firestore
   */
  private async loadFamilyGamification(userId: string): Promise<void> {
    try {
      this._isLoading.set(true);

      // Tenta cache primeiro
      const cached = await this.indexedDB.get<FamilyGamificationData>('family-gamification', userId);
      if (cached) {
        this._familyGamification.set(cached);
      }

      // Carrega do Firestore
      const docRef = doc(this.firestore, `users/${userId}/family-gamification/data`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FamilyGamificationData;
        // Converter timestamps do Firestore para Date
        data.lastUpdated = (data.lastUpdated as any)?.toDate() || new Date();
        data.achievements = data.achievements.map(ach => ({
          ...ach,
          unlockedAt: (ach.unlockedAt as any)?.toDate() || new Date()
        }));
        
        this._familyGamification.set(data);
        await this.indexedDB.put('family-gamification', data);
      } else {
        // Inicializar nova gamificação familiar
        await this.initializeFamilyGamification(userId);
      }
    } catch (error: any) {
      this.logService.error('FamilyGamificationService', 'Failed to load data', error as Error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Inicializa gamificação familiar para nova família
   */
  private async initializeFamilyGamification(userId: string): Promise<void> {
    const members = this.familyService.familyMembers();
    
    const initialData: FamilyGamificationData = {
      familyId: userId,
      totalPoints: 0,
      level: 1,
      achievements: [],
      memberStats: members.map(member => ({
        memberId: member.id,
        memberName: member.name,
        individualPoints: 0,
        contributedAchievements: 0,
        adherenceRate: 0,
        activeDays: 0
      })),
      currentStreak: 0,
      longestStreak: 0,
      totalDosesTaken: 0,
      perfectDays: 0,
      lastUpdated: new Date()
    };

    try {
      const docRef = doc(this.firestore, `users/${userId}/family-gamification/data`);
      await setDoc(docRef, {
        ...initialData,
        lastUpdated: serverTimestamp()
      });
      
      this._familyGamification.set(initialData);
      await this.indexedDB.put('family-gamification', initialData);
    } catch (error: any) {
      this.logService.error('FamilyGamificationService', 'Failed to initialize', error as Error);
    }
  }

  /**
   * Calcula pontos necessários para um nível
   */
  private calculatePointsForLevel(level: number): number {
    // Fórmula: 500 * level^1.5
    return Math.floor(500 * Math.pow(level, 1.5));
  }

  /**
   * Calcula nível baseado em pontos totais
   */
  private calculateLevelFromPoints(points: number): number {
    let level = 1;
    while (this.calculatePointsForLevel(level + 1) <= points) {
      level++;
    }
    return level;
  }

  /**
   * Atualiza pontos da família e verifica conquistas
   */
  async updateFamilyProgress(): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) return;

    try {
      const data = this._familyGamification();
      if (!data) return;

      // Atualizar estatísticas dos membros
      await this.updateMemberStats(data);

      // Verificar novas conquistas
      const newAchievements = await this.checkForNewAchievements(data);

      // Calcular pontos totais
      const achievementPoints = data.achievements.reduce((sum, ach) => {
        const def = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === ach.achievementId);
        return sum + (def?.points || 0);
      }, 0);

      const memberPoints = data.memberStats.reduce((sum, stat) => sum + stat.individualPoints, 0);
      const totalPoints = achievementPoints + memberPoints;

      // Calcular novo nível
      const newLevel = this.calculateLevelFromPoints(totalPoints);

      // Atualizar dados
      const updatedData: FamilyGamificationData = {
        ...data,
        totalPoints,
        level: newLevel,
        achievements: [...data.achievements, ...newAchievements],
        lastUpdated: new Date()
      };

      // Salvar no Firestore
      const docRef = doc(this.firestore, `users/${userId}/family-gamification/data`);
      await setDoc(docRef, {
        ...updatedData,
        lastUpdated: serverTimestamp()
      });

      this._familyGamification.set(updatedData);
      await this.indexedDB.put('family-gamification', updatedData);

      this.logService.info('FamilyGamificationService', 'Progress updated successfully');
    } catch (error: any) {
      this.logService.error('FamilyGamificationService', 'Failed to update progress', error as Error);
    }
  }

  /**
   * Atualiza estatísticas individuais dos membros
   */
  private async updateMemberStats(data: FamilyGamificationData): Promise<void> {
    const members = this.familyService.familyMembers();
    
    for (const member of members) {
      const existingStat = data.memberStats.find(s => s.memberId === member.id);
      
      if (existingStat) {
        // Atualizar estatísticas do membro usando dados da gamificação individual
        // (isso seria integrado com o GamificationService)
        existingStat.memberName = member.name;
      } else {
        // Adicionar novo membro
        data.memberStats.push({
          memberId: member.id,
          memberName: member.name,
          individualPoints: 0,
          contributedAchievements: 0,
          adherenceRate: 0,
          activeDays: 0
        });
      }
    }

    // Remover membros que não estão mais na família
    data.memberStats = data.memberStats.filter(stat => 
      members.some(m => m.id === stat.memberId)
    );
  }

  /**
   * Verifica e desbloqueia novas conquistas familiares
   */
  private async checkForNewAchievements(data: FamilyGamificationData): Promise<FamilyAchievement[]> {
    const newAchievements: FamilyAchievement[] = [];
    const familyStats = this.familyService.familyStats();
    const members = this.familyService.familyMembers();

    // Verificar cada conquista
    for (const def of FAMILY_ACHIEVEMENT_DEFINITIONS) {
      // Pular se já desbloqueada
      if (data.achievements.some(ach => ach.achievementId === def.id)) {
        continue;
      }

      let unlocked = false;
      const contributingMembers: string[] = [];

      switch (def.id) {
        case 'all_members_active': {
          // Todos marcaram pelo menos uma dose hoje
          const stats = familyStats;
          if (stats.takenDoses >= members.length) {
            unlocked = true;
            contributingMembers.push(...members.map(m => m.id));
          }
          break;
        }

        case 'family_perfect_week': {
          // 7 dias com 100% aderência (seria verificado com histórico real)
          const currentStats = familyStats;
          if (data.currentStreak >= 7 && currentStats.adherenceRate >= 100) {
            unlocked = true;
            contributingMembers.push(...members.map(m => m.id));
          }
          break;
        }

        case 'no_missed_month':
          // 30 dias sem doses perdidas (seria verificado com histórico real)
          if (data.perfectDays >= 30) {
            unlocked = true;
            contributingMembers.push(...members.map(m => m.id));
          }
          break;

        case 'teamwork_champion':
          // 100 doses marcadas
          if (data.totalDosesTaken >= 100) {
            unlocked = true;
            contributingMembers.push(...members.map(m => m.id));
          }
          break;

        case 'consistency_king':
          // 90 dias consecutivos com aderência > 80%
          if (data.currentStreak >= 90) {
            unlocked = true;
            contributingMembers.push(...members.map(m => m.id));
          }
          break;

        // Adicionar verificações para outras conquistas...
      }

      if (unlocked) {
        newAchievements.push({
          achievementId: def.id,
          unlockedAt: new Date(),
          contributingMembers
        });
        this.logService.info('FamilyGamificationService', 'New achievement unlocked', { name: def.name });
      }
    }

    return newAchievements;
  }

  /**
   * Obtém definição de uma conquista
   */
  getAchievementDefinition(achievementId: FamilyAchievementType): FamilyAchievementDefinition | undefined {
    return FAMILY_ACHIEVEMENT_DEFINITIONS.find(def => def.id === achievementId);
  }

  /**
   * Obtém todas as conquistas (desbloqueadas e bloqueadas)
   */
  getAllAchievementsWithStatus(): Array<FamilyAchievementDefinition & { unlocked: boolean; unlockedAt?: Date }> {
    const unlockedIds = new Set(this.unlockedAchievements().map(ach => ach.achievementId));
    
    return FAMILY_ACHIEVEMENT_DEFINITIONS.map(def => {
      const achievement = this.unlockedAchievements().find(ach => ach.achievementId === def.id);
      return {
        ...def,
        unlocked: unlockedIds.has(def.id),
        unlockedAt: achievement?.unlockedAt
      };
    });
  }

  /**
   * Força atualização imediata dos dados
   */
  async refresh(): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (userId) {
      await this.loadFamilyGamification(userId);
    }
  }
}

