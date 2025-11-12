/**
 * Achievement Model
 * Sistema de conquistas para gamificação
 */

export type AchievementCategory = 'adherence' | 'caregiving' | 'organization' | 'streak' | 'social';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicon name
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: number; // Valor necessário para desbloquear
  currentProgress: number; // Progresso atual do usuário
  unlocked: boolean;
  unlockedAt?: Date;
  points: number; // Pontos ganhos ao desbloquear
}

export interface Streak {
  userId: string;
  currentStreak: number; // Dias consecutivos atuais
  longestStreak: number; // Maior sequência histórica
  lastDoseDate: Date | null; // Última dose tomada
  streakStartDate: Date | null; // Início da sequência atual
  isActive: boolean; // true se não perdeu nenhuma dose hoje/ontem
}

export interface UserGamification {
  userId: string;
  totalPoints: number;
  level: number; // Nível do usuário (calculado por pontos)
  achievements: Achievement[];
  streak: Streak;
  weeklyProgress: WeeklyProgress;
  lastUpdated: Date;
}

export interface WeeklyProgress {
  weekStart: Date;
  weekEnd: Date;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number; // 0-100
  perfectWeek: boolean; // true se adherenceRate === 100
}

/**
 * Definições de Conquistas
 */
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'currentProgress' | 'unlocked' | 'unlockedAt'>[] = [
  // ADHERENCE ACHIEVEMENTS
  {
    id: 'perfect_week',
    name: 'Semana Perfeita',
    description: '7 dias consecutivos sem doses perdidas',
    icon: 'trophy',
    category: 'adherence',
    tier: 'bronze',
    requirement: 7,
    points: 50
  },
  {
    id: 'perfect_month',
    name: 'Mês Impecável',
    description: '30 dias consecutivos sem doses perdidas',
    icon: 'trophy',
    category: 'adherence',
    tier: 'gold',
    requirement: 30,
    points: 200
  },
  {
    id: 'perfect_quarter',
    name: 'Trimestre de Ouro',
    description: '90 dias consecutivos sem doses perdidas',
    icon: 'trophy',
    category: 'adherence',
    tier: 'platinum',
    requirement: 90,
    points: 500
  },
  
  // STREAK ACHIEVEMENTS
  {
    id: 'streak_warrior',
    name: 'Guerreiro da Constância',
    description: 'Mantenha um streak de 15 dias',
    icon: 'flame',
    category: 'streak',
    tier: 'silver',
    requirement: 15,
    points: 100
  },
  {
    id: 'streak_champion',
    name: 'Campeão da Adesão',
    description: 'Mantenha um streak de 50 dias',
    icon: 'flame',
    category: 'streak',
    tier: 'gold',
    requirement: 50,
    points: 300
  },
  {
    id: 'streak_legend',
    name: 'Lenda Imortal',
    description: 'Mantenha um streak de 100 dias',
    icon: 'flame',
    category: 'streak',
    tier: 'platinum',
    requirement: 100,
    points: 1000
  },
  
  // CAREGIVING ACHIEVEMENTS
  {
    id: 'caregiver_starter',
    name: 'Cuidador Iniciante',
    description: 'Gerencie medicações de 1 dependente',
    icon: 'people',
    category: 'caregiving',
    tier: 'bronze',
    requirement: 1,
    points: 30
  },
  {
    id: 'caregiver_dedicated',
    name: 'Cuidador Dedicado',
    description: 'Gerencie medicações de 3 dependentes',
    icon: 'people',
    category: 'caregiving',
    tier: 'silver',
    requirement: 3,
    points: 100
  },
  {
    id: 'caregiver_hero',
    name: 'Herói dos Cuidados',
    description: 'Gerencie medicações de 5 dependentes',
    icon: 'people',
    category: 'caregiving',
    tier: 'gold',
    requirement: 5,
    points: 250
  },
  
  // ORGANIZATION ACHIEVEMENTS
  {
    id: 'organizer_basic',
    name: 'Organizador Básico',
    description: 'Cadastre 5 medicamentos com estoque controlado',
    icon: 'filing',
    category: 'organization',
    tier: 'bronze',
    requirement: 5,
    points: 40
  },
  {
    id: 'organizer_pro',
    name: 'Organizador Profissional',
    description: 'Cadastre 10 medicamentos com estoque controlado',
    icon: 'filing',
    category: 'organization',
    tier: 'silver',
    requirement: 10,
    points: 80
  },
  {
    id: 'organizer_master',
    name: 'Mestre da Organização',
    description: 'Mantenha todos os medicamentos com estoque adequado por 30 dias',
    icon: 'filing',
    category: 'organization',
    tier: 'gold',
    requirement: 30,
    points: 200
  },
  
  // ADHERENCE RATE ACHIEVEMENTS
  {
    id: 'adherence_90',
    name: 'Adepto Dedicado',
    description: 'Mantenha 90% de adesão por 1 mês',
    icon: 'checkmark-circle',
    category: 'adherence',
    tier: 'silver',
    requirement: 90,
    points: 150
  },
  {
    id: 'adherence_95',
    name: 'Adepto Exemplar',
    description: 'Mantenha 95% de adesão por 1 mês',
    icon: 'checkmark-circle',
    category: 'adherence',
    tier: 'gold',
    requirement: 95,
    points: 250
  },
  {
    id: 'first_dose',
    name: 'Primeira Dose',
    description: 'Registre sua primeira dose tomada',
    icon: 'medical',
    category: 'adherence',
    tier: 'bronze',
    requirement: 1,
    points: 10
  },
  {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Tome 10 doses antes das 8h da manhã',
    icon: 'sunny',
    category: 'adherence',
    tier: 'bronze',
    requirement: 10,
    points: 50
  },
  {
    id: 'night_owl',
    name: 'Coruja Noturna',
    description: 'Tome 10 doses depois das 22h',
    icon: 'moon',
    category: 'adherence',
    tier: 'bronze',
    requirement: 10,
    points: 50
  }
];

/**
 * Níveis de usuário baseados em pontos
 */
export interface Level {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  icon: string;
  color: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: 'Iniciante', minPoints: 0, maxPoints: 99, icon: 'leaf', color: '#808080' },
  { level: 2, name: 'Aprendiz', minPoints: 100, maxPoints: 249, icon: 'flower', color: '#CD7F32' },
  { level: 3, name: 'Praticante', minPoints: 250, maxPoints: 499, icon: 'rose', color: '#C0C0C0' },
  { level: 4, name: 'Dedicado', minPoints: 500, maxPoints: 999, icon: 'medal', color: '#FFD700' },
  { level: 5, name: 'Especialista', minPoints: 1000, maxPoints: 1999, icon: 'ribbon', color: '#4169E1' },
  { level: 6, name: 'Mestre', minPoints: 2000, maxPoints: 3999, icon: 'star', color: '#9370DB' },
  { level: 7, name: 'Campeão', minPoints: 4000, maxPoints: 7999, icon: 'diamond', color: '#FF69B4' },
  { level: 8, name: 'Lendário', minPoints: 8000, maxPoints: 15999, icon: 'trophy', color: '#FF4500' },
  { level: 9, name: 'Imortal', minPoints: 16000, maxPoints: 31999, icon: 'rocket', color: '#00CED1' },
  { level: 10, name: 'Divino', minPoints: 32000, maxPoints: Infinity, icon: 'infinite', color: '#FFD700' }
];

/**
 * Calcula o nível baseado em pontos
 */
export function calculateLevel(points: number): Level {
  return LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints) || LEVELS[0];
}

/**
 * Calcula progresso para o próximo nível
 */
export function calculateLevelProgress(points: number): { current: Level; next: Level | null; progress: number } {
  const current = calculateLevel(points);
  const currentIndex = LEVELS.findIndex(l => l.level === current.level);
  const next = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;
  
  if (!next) {
    return { current, next: null, progress: 100 };
  }
  
  const pointsInCurrentLevel = points - current.minPoints;
  const pointsNeededForNextLevel = next.minPoints - current.minPoints;
  const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
  
  return { current, next, progress };
}
