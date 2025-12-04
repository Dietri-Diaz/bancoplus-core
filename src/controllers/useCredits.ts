// ============================================
// CONTROLLER - useCredits Hook
// ============================================
// Conecta el Model (CreditFactory, CreditScoreService) con la View (Credits)

import { useState, useEffect, useCallback } from 'react';
import { Credit, CreditType, CreditScore } from '@/models/entities';
import { DatabaseConnection, getCreditFactory, CreditScoreService } from '@/models/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();
  const scoreService = CreditScoreService.getInstance();

  const loadCredits = useCallback(async () => {
    if (!user) return;
    try {
      const data = await db.get<Credit[]>('/credits');
      const userCredits = user.role === 'admin' 
        ? data 
        : data.filter(c => c.userId === user.id);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error al cargar créditos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCreditScore = useCallback(async () => {
    if (!user || user.role === 'admin') return;
    try {
      const score = await scoreService.calculateScore(user.id);
      setCreditScore(score);
    } catch (error) {
      console.error('Error al calcular score:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCredits();
    loadCreditScore();
  }, [loadCredits, loadCreditScore]);

  const requestCredit = async (type: CreditType, amount: number, term: number) => {
    if (!user) return false;

    // Verificar score crediticio
    if (creditScore) {
      const canRequest = scoreService.canRequestCredit(creditScore);
      if (!canRequest.allowed) {
        toast({
          title: "No puedes solicitar crédito",
          description: canRequest.reason,
          variant: "destructive",
        });
        return false;
      }
    }

    try {
      // Usar Abstract Factory para crear el crédito
      const factory = getCreditFactory(type);
      let credit = factory.createCredit(user.id, amount, term);

      // Ajustar tasa según score
      if (creditScore && creditScore.level === 'medium') {
        const modifier = scoreService.getInterestRateModifier(creditScore.level);
        credit = {
          ...credit,
          interestRate: credit.interestRate + modifier,
          monthlyPayment: factory.calculateMonthlyPayment(
            amount, 
            credit.interestRate + modifier, 
            term
          ),
        };
      }

      await db.post('/credits', credit);
      
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de crédito está pendiente de aprobación",
      });

      loadCredits();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud",
        variant: "destructive",
      });
      return false;
    }
  };

  const getCreditTypeLabel = (type: CreditType) => {
    const labels = { personal: 'Personal', hipotecario: 'Hipotecario', empresarial: 'Empresarial' };
    return labels[type];
  };

  const getStatusLabel = (status: Credit['status']) => {
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      active: 'Activo',
      rejected: 'Rechazado',
      completed: 'Completado'
    };
    return labels[status];
  };

  return {
    credits,
    creditScore,
    loading,
    requestCredit,
    getCreditTypeLabel,
    getStatusLabel,
    refreshCredits: loadCredits,
    refreshScore: loadCreditScore,
    scoreService,
  };
};
