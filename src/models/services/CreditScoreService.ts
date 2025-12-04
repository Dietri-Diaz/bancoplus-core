// ============================================
// MODEL - SERVICE: Credit Score Calculator
// ============================================
// Servicio Singleton para calcular el score crediticio
// Lógica: Atrasados = Malo, Por vencer = Medio, Puntuales = Bueno

import { CreditScore, ScoreLevel, SCORE_THRESHOLDS, Credit, Payment } from '@/models/entities';
import DatabaseConnection from './DatabaseConnection';

export class CreditScoreService {
  private static instance: CreditScoreService;
  private db = DatabaseConnection.getInstance();

  private constructor() {}

  static getInstance(): CreditScoreService {
    if (!CreditScoreService.instance) {
      CreditScoreService.instance = new CreditScoreService();
    }
    return CreditScoreService.instance;
  }

  getScoreLevel(score: number): ScoreLevel {
    if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
    if (score >= SCORE_THRESHOLDS.MEDIUM) return 'medium';
    return 'bad';
  }

  getScoreLevelLabel(level: ScoreLevel): string {
    const labels = {
      good: 'Bueno',
      medium: 'Regular',
      bad: 'Malo',
    };
    return labels[level];
  }

  getScoreColor(level: ScoreLevel): string {
    const colors = {
      good: 'text-success',
      medium: 'text-warning',
      bad: 'text-destructive',
    };
    return colors[level];
  }

  getScoreBgColor(level: ScoreLevel): string {
    const colors = {
      good: 'bg-success/10 border-success/30',
      medium: 'bg-warning/10 border-warning/30',
      bad: 'bg-destructive/10 border-destructive/30',
    };
    return colors[level];
  }

  async calculateScore(userId: string): Promise<CreditScore> {
    const [credits, payments, allScores] = await Promise.all([
      this.db.get<Credit[]>('/credits'),
      this.db.get<Payment[]>('/payments'),
      this.db.get<CreditScore[]>('/creditScores'),
    ]);

    const userCredits = credits.filter(c => c.userId === userId);
    const userPayments = payments.filter(p => p.userId === userId);

    // Contar pagos
    const overduePayments = userPayments.filter(p => p.status === 'overdue').length;
    const onTimePayments = userPayments.filter(p => p.status === 'paid' && 
      new Date(p.paidAt || '') <= new Date(p.dueDate)).length;
    const latePayments = userPayments.filter(p => 
      p.status === 'overdue' || 
      (p.status === 'paid' && new Date(p.paidAt || '') > new Date(p.dueDate))
    ).length;
    
    // Pagos pendientes próximos a vencer (dentro de 7 días)
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const pendingPaymentsSoon = userPayments.filter(p => {
      if (p.status !== 'pending') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    }).length;

    const activeDebts = userCredits.filter(c => c.status === 'active' || c.status === 'approved').length;
    const pastDebtProblems = latePayments > 0;
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const creditRequestsLast6Months = userCredits.filter(c => 
      new Date(c.requestedAt) >= sixMonthsAgo).length;

    // LÓGICA SIMPLE:
    // - Si tiene pagos atrasados (overdue) → MALO
    // - Si tiene pagos próximos a vencer (7 días) → MEDIO
    // - Si todos sus pagos son puntuales → BUENO
    
    let score: number;
    let level: ScoreLevel;

    if (overduePayments > 0) {
      score = 250 + Math.max(0, 100 - (overduePayments * 20));
      level = 'bad';
    } else if (pendingPaymentsSoon > 0) {
      score = 550 + Math.min(100, onTimePayments * 5);
      level = 'medium';
    } else {
      score = 750 + Math.min(150, onTimePayments * 2);
      level = 'good';
    }

    score = Math.max(0, Math.min(1000, score));

    const existingScore = allScores.find(s => s.userId === userId);
    const newScore: CreditScore = {
      id: existingScore?.id || `score-${Date.now()}`,
      userId,
      score,
      level,
      onTimePayments,
      latePayments,
      activeDebts,
      pastDebtProblems,
      creditRequestsLast6Months,
      lastUpdated: new Date().toISOString(),
    };

    if (existingScore) {
      await this.db.put(`/creditScores/${existingScore.id}`, newScore);
    } else {
      await this.db.post('/creditScores', newScore);
    }

    return newScore;
  }

  async getUserScore(userId: string): Promise<CreditScore | null> {
    const scores = await this.db.get<CreditScore[]>('/creditScores');
    return scores.find(s => s.userId === userId) || null;
  }

  canRequestCredit(score: CreditScore): { allowed: boolean; reason?: string } {
    if (score.level === 'bad') {
      return {
        allowed: false,
        reason: 'Tu score crediticio es muy bajo. Mejora tu historial de pagos para solicitar créditos.',
      };
    }
    return { allowed: true };
  }

  getInterestRateModifier(level: ScoreLevel): number {
    const modifiers = {
      good: 0,
      medium: 3,
      bad: 0,
    };
    return modifiers[level];
  }
}

export default CreditScoreService;
