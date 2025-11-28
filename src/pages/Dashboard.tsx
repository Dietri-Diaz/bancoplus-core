import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { BankAccount, Credit, Transaction } from '@/types';
import { Wallet, CreditCard, ArrowLeftRight, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [accountsData, creditsData, transactionsData] = await Promise.all([
        db.get<BankAccount[]>('/accounts'),
        db.get<Credit[]>('/credits'),
        db.get<Transaction[]>('/transactions'),
      ]);

      if (user?.role === 'admin') {
        setAccounts(accountsData);
        setCredits(creditsData);
        setTransactions(transactionsData);
      } else {
        setAccounts(accountsData.filter(acc => acc.userId === user?.id));
        setCredits(creditsData.filter(cred => cred.userId === user?.id));
        const userAccountIds = accountsData
          .filter(acc => acc.userId === user?.id)
          .map(acc => acc.id);
        setTransactions(transactionsData.filter(tx => userAccountIds.includes(tx.accountId)));
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeCredits = credits.filter(c => c.status === 'active' || c.status === 'approved').length;
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Resumen de tu actividad bancaria</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                    <Wallet className="h-5 w-5 opacity-80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs opacity-80 mt-1">{accounts.length} cuentas activas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Créditos Activos</CardTitle>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeCredits}</div>
                    <p className="text-xs text-muted-foreground mt-1">De {credits.length} totales</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{transactions.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Este mes</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-success to-success/80 text-success-foreground">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Intereses Ganados</CardTitle>
                    <TrendingUp className="h-5 w-5 opacity-80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$125.50</div>
                    <p className="text-xs opacity-80 mt-1">Últimos 30 días</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Mis Cuentas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accounts.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No tienes cuentas registradas</p>
                      ) : (
                        accounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                            <div>
                              <p className="font-medium capitalize">{account.type}</p>
                              <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">{account.currency}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Transacciones Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No hay transacciones recientes</p>
                      ) : (
                        recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium capitalize">{tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdrawal' ? 'Retiro' : 'Transferencia'}</p>
                              <p className="text-xs text-muted-foreground">{tx.description}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${tx.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                                {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.date).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
