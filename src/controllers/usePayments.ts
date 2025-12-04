// ============================================
// CONTROLLER - usePayments Hook
// ============================================
// Conecta el Model con la View (Payments)

import { useState, useEffect, useCallback } from 'react';
import { Payment, Credit, User } from '@/models/entities';
import { DatabaseConnection } from '@/models/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const usePayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [paymentsData, creditsData, usersData] = await Promise.all([
        db.get<Payment[]>('/payments'),
        db.get<Credit[]>('/credits'),
        db.get<User[]>('/users'),
      ]);
      
      const userPayments = user.role === 'admin' 
        ? paymentsData 
        : paymentsData.filter(p => p.userId === user.id);
      const userCredits = user.role === 'admin' 
        ? creditsData.filter(c => c.status === 'active' || c.status === 'approved')
        : creditsData.filter(c => c.userId === user.id && (c.status === 'active' || c.status === 'approved'));
      
      setPayments(userPayments);
      setCredits(userCredits);
      setUsers(usersData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canMakePayment = (payment: Payment, creditPayments: Payment[]) => {
    const paidPayments = creditPayments
      .filter(p => p.status === 'paid')
      .sort((a, b) => a.paymentNumber - b.paymentNumber);

    // Verificar orden
    if (payment.paymentNumber !== paidPayments.length + 1) {
      return { canPay: false, reason: 'Debes pagar las cuotas en orden' };
    }

    // Verificar si ya pagó este mes
    const lastPaidPayment = paidPayments[paidPayments.length - 1];
    if (lastPaidPayment?.paidAt) {
      const lastPaidDate = new Date(lastPaidPayment.paidAt);
      const now = new Date();
      
      if (lastPaidDate.getMonth() === now.getMonth() && 
          lastPaidDate.getFullYear() === now.getFullYear()) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { 
          canPay: false, 
          reason: `Ya pagaste este mes. Próximo pago: ${nextMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}` 
        };
      }
    }

    return { canPay: true };
  };

  const makePayment = async (payment: Payment) => {
    const creditPayments = payments.filter(p => p.creditId === payment.creditId);
    const { canPay, reason } = canMakePayment(payment, creditPayments);

    if (!canPay) {
      toast({
        title: "No puedes realizar el pago",
        description: reason,
        variant: "destructive",
      });
      return false;
    }

    try {
      const now = new Date();
      const dueDate = new Date(payment.dueDate);
      const isLate = now > dueDate;

      const updatedPayment = {
        ...payment,
        paidAt: now.toISOString(),
        status: isLate ? 'overdue' : 'paid' as const,
      };

      await db.put(`/payments/${payment.id}`, updatedPayment);

      // Actualizar crédito
      const credit = credits.find(c => c.id === payment.creditId);
      if (credit) {
        const newRemainingPayments = credit.remainingPayments - 1;
        const updatedCredit = {
          ...credit,
          paidAmount: credit.paidAmount + payment.amount,
          remainingPayments: newRemainingPayments,
          status: newRemainingPayments === 0 ? 'completed' : credit.status,
        };
        await db.put(`/credits/${credit.id}`, updatedCredit);
      }

      toast({
        title: isLate ? "Pago tardío registrado" : "Pago realizado",
        description: isLate 
          ? "El pago fue después de la fecha límite" 
          : "Tu pago ha sido procesado correctamente",
        variant: isLate ? "destructive" : "default",
      });

      loadData();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Usuario';
  };

  const getCreditType = (creditId: string) => {
    return credits.find(c => c.id === creditId)?.type || 'personal';
  };

  return {
    payments,
    credits,
    loading,
    makePayment,
    canMakePayment,
    getUserName,
    getCreditType,
    refreshPayments: loadData,
  };
};
