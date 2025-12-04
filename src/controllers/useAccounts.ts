// ============================================
// CONTROLLER - useAccounts Hook
// ============================================
// Conecta el Model (AccountFactory, InterestStrategy) con la View (Accounts)

import { useState, useEffect, useCallback } from 'react';
import { BankAccount, AccountType } from '@/models/entities';
import { DatabaseConnection, getAccountFactory, InterestCalculator } from '@/models/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await db.get<BankAccount[]>('/accounts');
      const userAccounts = user.role === 'admin' 
        ? data 
        : data.filter(acc => acc.userId === user.id);
      setAccounts(userAccounts);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const createAccount = async (accountType: AccountType, initialBalance: number) => {
    if (!user) return;
    try {
      // Usar Factory Method para crear la cuenta
      const factory = getAccountFactory(accountType);
      const accountNumber = `0001-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;
      const newAccount = factory.createAccount(user.id, accountNumber, initialBalance);

      await db.post('/accounts', newAccount);
      
      if (accountType === 'empresarial') {
        toast({
          title: "Solicitud enviada",
          description: "Tu cuenta empresarial está pendiente de aprobación",
        });
      } else {
        toast({
          title: "Cuenta creada",
          description: `Tu cuenta ${accountType} ha sido creada`,
        });
      }

      loadAccounts();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive",
      });
      return false;
    }
  };

  const calculateProjectedInterest = (account: BankAccount) => {
    const calculator = new InterestCalculator(account.type);
    return calculator.calculateInterest(account.balance, 12);
  };

  return {
    accounts,
    loading,
    createAccount,
    calculateProjectedInterest,
    refreshAccounts: loadAccounts,
  };
};
