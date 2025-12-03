import { CreditScore, ScoreLevel, SCORE_THRESHOLDS, Credit, Payment } from '@/types';
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

    // Calculate variables
    const onTimePayments = userPayments.filter(p => p.status === 'paid' && 
      new Date(p.paidAt || '') <= new Date(p.dueDate)).length;
    const latePayments = userPayments.filter(p => p.status === 'overdue' || 
      (p.status === 'paid' && new Date(p.paidAt || '') > new Date(p.dueDate))).length;
    const activeDebts = userCredits.filter(c => c.status === 'active' || c.status === 'approved').length;
    const pastDebtProblems = userPayments.some(p => p.status === 'overdue');
    
    // Credit requests in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const creditRequestsLast6Months = userCredits.filter(c => 
      new Date(c.requestedAt) >= sixMonthsAgo).length;

    // Calculate score (0-1000)
    let score = 700; // Base score

    // Factor 1: Payment history (most important, up to ±300 points)
    const totalPayments = onTimePayments + latePayments;
    if (totalPayments > 0) {
      const onTimeRatio = onTimePayments / totalPayments;
      score += Math.round((onTimeRatio - 0.5) * 600); // -300 to +300
    }

    // Factor 2: Active debts (up to -150 points)
    if (activeDebts >= 4) score -= 150;
    else if (activeDebts >= 2) score -= 75;
    else if (activeDebts >= 1) score -= 25;

    // Factor 3: Past debt problems (up to -200 points)
    if (pastDebtProblems) score -= 100;
    if (latePayments > 3) score -= 100;

    // Factor 4: Credit request frequency (up to -100 points)
    if (creditRequestsLast6Months >= 5) score -= 100;
    else if (creditRequestsLast6Months >= 3) score -= 50;

    // Clamp score to 0-1000
    score = Math.max(0, Math.min(1000, score));

    const level = this.getScoreLevel(score);

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

    // Save or update score
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
      bad: 0, // Not allowed anyway
    };
    return modifiers[level];
  }
}

export default CreditScoreService;
