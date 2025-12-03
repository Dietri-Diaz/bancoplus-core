import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { CreditScoreService } from '@/services/CreditScoreService';
import { BankAccount, Credit, Transaction, CreditScore } from '@/types';
import { Wallet, CreditCard, ArrowLeftRight, TrendingUp, Gauge, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();
  const scoreService = CreditScoreService.getInstance();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
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

      // Calculate credit score for regular users
      if (user.role !== 'admin') {
        const score = await scoreService.calculateScore(user.id);
        setCreditScore(score);
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

  const getScoreColor = (level: string) => {
    switch (level) {
      case 'good': return 'text-success';
      case 'medium': return 'text-warning';
      case 'bad': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getScoreBg = (level: string) => {
    switch (level) {
      case 'good': return 'from-success/20 to-success/5';
      case 'medium': return 'from-warning/20 to-warning/5';
      case 'bad': return 'from-destructive/20 to-destructive/5';
      default: return 'from-muted to-muted/50';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
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
              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card className="relative overflow-hidden border-0 shadow-card">
                  <div className="absolute inset-0 gradient-primary opacity-90" />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-primary-foreground/80">Balance Total</CardTitle>
                    <Wallet className="h-5 w-5 text-primary-foreground/80" />
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold text-primary-foreground">
                      S/ {totalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-1">{accounts.length} cuentas activas</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Activos</CardTitle>
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{activeCredits}</div>
                    <p className="text-xs text-muted-foreground mt-1">De {credits.length} totales</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{transactions.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Este mes</p>
                  </CardContent>
                </Card>

                {user?.role !== 'admin' && creditScore && (
                  <Card className={cn("border-0 shadow-card relative overflow-hidden")}>
                    <div className={cn("absolute inset-0 bg-gradient-to-br", getScoreBg(creditScore.level))} />
                    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Score Crediticio</CardTitle>
                      <Gauge className={cn("h-5 w-5", getScoreColor(creditScore.level))} />
                    </CardHeader>
                    <CardContent className="relative">
                      <div className={cn("text-2xl font-bold", getScoreColor(creditScore.level))}>
                        {creditScore.score}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "mt-1 text-xs",
                          creditScore.level === 'good' && "border-success/50 text-success bg-success/10",
                          creditScore.level === 'medium' && "border-warning/50 text-warning bg-warning/10",
                          creditScore.level === 'bad' && "border-destructive/50 text-destructive bg-destructive/10"
                        )}
                      >
                        {scoreService.getScoreLevelLabel(creditScore.level)}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {user?.role === 'admin' && (
                  <Card className="relative overflow-hidden border-0 shadow-card">
                    <div className="absolute inset-0 gradient-success opacity-90" />
                    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-success-foreground/80">Intereses Generados</CardTitle>
                      <TrendingUp className="h-5 w-5 text-success-foreground/80" />
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-2xl font-bold text-success-foreground">S/ 425.50</div>
                      <p className="text-xs text-success-foreground/70 mt-1">Últimos 30 días</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Accounts and Transactions */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      Mis Cuentas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {accounts.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">No tienes cuentas registradas</p>
                      ) : (
                        accounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                            <div>
                              <p className="font-semibold capitalize">{account.type}</p>
                              <p className="text-xs text-muted-foreground font-mono">{account.accountNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">S/ {account.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">PEN</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5 text-primary" />
                      Transacciones Recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">No hay transacciones recientes</p>
                      ) : (
                        recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                tx.type === 'deposit' ? "bg-success/10" : "bg-destructive/10"
                              )}>
                                {tx.type === 'deposit' ? (
                                  <ArrowDownRight className="h-4 w-4 text-success" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium capitalize">
                                  {tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdrawal' ? 'Retiro' : 'Transferencia'}
                                </p>
                                <p className="text-xs text-muted-foreground">{tx.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-bold",
                                tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                              )}>
                                {tx.type === 'deposit' ? '+' : '-'}S/ {tx.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.date).toLocaleDateString('es-PE')}
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
