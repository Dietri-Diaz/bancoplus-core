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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
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
                <Card className="relative overflow-hidden border-0 shadow-xl group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
                  <div className="absolute inset-0 opacity-50" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.07)'%3E%3C/path%3E%3C/svg%3E\")"}} />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-primary-foreground/80">Balance Total</CardTitle>
                    <div className="p-2 rounded-lg bg-white/20 group-hover:scale-110 transition-transform">
                      <Wallet className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-primary-foreground">
                      S/ {totalBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-primary-foreground/70 mt-2">{accounts.length} cuentas activas</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br from-card to-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Activos</CardTitle>
                    <div className="p-2 rounded-lg bg-secondary group-hover:scale-110 transition-transform">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{activeCredits}</div>
                    <p className="text-sm text-muted-foreground mt-2">De {credits.length} totales</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br from-card to-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
                    <div className="p-2 rounded-lg bg-secondary group-hover:scale-110 transition-transform">
                      <ArrowLeftRight className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{transactions.length}</div>
                    <p className="text-sm text-muted-foreground mt-2">Este mes</p>
                  </CardContent>
                </Card>

                {user?.role !== 'admin' && creditScore && (
                  <Card className={cn("border-0 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1")}>
                    <div className={cn("absolute inset-0 bg-gradient-to-br", getScoreBg(creditScore.level))} />
                    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Score Crediticio</CardTitle>
                      <div className={cn("p-2 rounded-lg group-hover:scale-110 transition-transform", 
                        creditScore.level === 'good' && "bg-success/20",
                        creditScore.level === 'medium' && "bg-warning/20",
                        creditScore.level === 'bad' && "bg-destructive/20"
                      )}>
                        <Gauge className={cn("h-5 w-5", getScoreColor(creditScore.level))} />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className={cn("text-3xl font-bold", getScoreColor(creditScore.level))}>
                        {creditScore.score}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "mt-2 text-xs font-semibold",
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
                  <Card className="relative overflow-hidden border-0 shadow-xl group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-success via-success to-success/80" />
                    <div className="absolute inset-0 opacity-50" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.07)'%3E%3C/path%3E%3C/svg%3E\")"}} />
                    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-success-foreground/80">Intereses Generados</CardTitle>
                      <div className="p-2 rounded-lg bg-white/20 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-success-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-success-foreground">S/ 425.50</div>
                      <p className="text-sm text-success-foreground/70 mt-2">Últimos 30 días</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Accounts and Transactions */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      Mis Cuentas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {accounts.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-12 text-center">No tienes cuentas registradas</p>
                      ) : (
                        accounts.map((account, index) => (
                          <div 
                            key={account.id} 
                            className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-all duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                                <Wallet className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold capitalize text-lg">{account.type}</p>
                                <p className="text-xs text-muted-foreground font-mono">{account.accountNumber}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xl">S/ {account.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">PEN</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="border-b border-border/50">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ArrowLeftRight className="h-5 w-5 text-primary" />
                      </div>
                      Transacciones Recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {recentTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-12 text-center">No hay transacciones recientes</p>
                      ) : (
                        recentTransactions.map((tx, index) => (
                          <div 
                            key={tx.id} 
                            className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-all duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "p-3 rounded-xl",
                                tx.type === 'deposit' ? "bg-gradient-to-br from-success/20 to-success/5" : "bg-gradient-to-br from-destructive/20 to-destructive/5"
                              )}>
                                {tx.type === 'deposit' ? (
                                  <ArrowDownRight className="h-5 w-5 text-success" />
                                ) : (
                                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold capitalize">
                                  {tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdrawal' ? 'Retiro' : 'Transferencia'}
                                </p>
                                <p className="text-xs text-muted-foreground">{tx.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-bold text-lg",
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