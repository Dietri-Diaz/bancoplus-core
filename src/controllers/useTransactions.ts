// ============================================
// CONTROLLER - useTransactions Hook
// ============================================
// Conecta el Model con la View (Transactions)

import { useState, useEffect, useCallback } from 'react';
import { Transaction, BankAccount, TransactionType } from '@/models/entities';
import { DatabaseConnection, AccountProxyAccess } from '@/models/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [transactionsData, accountsData] = await Promise.all([
        db.get<Transaction[]>('/transactions'),
        db.get<BankAccount[]>('/accounts'),
      ]);

      const userAccounts = user.role === 'admin' 
        ? accountsData.filter(a => a.status === 'active')
        : accountsData.filter(a => a.userId === user.id && a.status === 'active');
      
      const userAccountIds = userAccounts.map(a => a.id);
      const userTransactions = user.role === 'admin'
        ? transactionsData
        : transactionsData.filter(t => userAccountIds.includes(t.accountId));
      
      setAccounts(userAccounts);
      setTransactions(userTransactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTransaction = async (
    type: TransactionType,
    accountId: string,
    amount: number,
    description: string,
    toAccountId?: string
  ) => {
    if (!user) return false;

    try {
      // Usar Proxy para validar acceso
      const proxy = new AccountProxyAccess(user.id, user.role);
      const account = await proxy.getAccount(accountId);

      // Validar fondos para retiro o transferencia
      if ((type === 'withdrawal' || type === 'transfer') && account.balance < amount) {
        toast({
          title: "Fondos insuficientes",
          description: "No tienes suficiente saldo",
          variant: "destructive",
        });
        return false;
      }

      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accountId,
        type,
        amount,
        description,
        date: new Date().toISOString(),
        status: 'completed',
        toAccountId,
      };

      // Actualizar balances
      let newBalance = account.balance;
      if (type === 'deposit') {
        newBalance += amount;
      } else if (type === 'withdrawal' || type === 'transfer') {
        newBalance -= amount;
      }

      await proxy.updateBalance(accountId, newBalance);

      // Si es transferencia, actualizar cuenta destino
      if (type === 'transfer' && toAccountId) {
        const destProxy = new AccountProxyAccess(user.id, user.role);
        const destAccount = accounts.find(a => a.id === toAccountId);
        if (destAccount) {
          await destProxy.updateBalance(toAccountId, destAccount.balance + amount);
        }
      }

      await db.post('/transactions', transaction);

      toast({
        title: "Transacción exitosa",
        description: `${type === 'deposit' ? 'Depósito' : type === 'withdrawal' ? 'Retiro' : 'Transferencia'} realizado`,
      });

      loadData();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar",
        variant: "destructive",
      });
      return false;
    }
  };

  const getAccountNumber = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.accountNumber || 'Cuenta no encontrada';
  };

  return {
    transactions,
    accounts,
    loading,
    createTransaction,
    getAccountNumber,
    refreshTransactions: loadData,
  };
};
