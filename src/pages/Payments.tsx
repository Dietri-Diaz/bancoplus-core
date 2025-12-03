import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { CreditScoreService } from '@/services/CreditScoreService';
import { Payment, Credit } from '@/types';
import { Receipt, CheckCircle, Clock, AlertTriangle, Calendar, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();
  const scoreService = CreditScoreService.getInstance();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [paymentsData, creditsData] = await Promise.all([
        db.get<Payment[]>('/payments'),
        db.get<Credit[]>('/credits'),
      ]);

      const userPayments = user.role === 'admin'
        ? paymentsData
        : paymentsData.filter(p => p.userId === user.id);
      
      const userCredits = user.role === 'admin'
        ? creditsData
        : creditsData.filter(c => c.userId === user.id);

      // Check for overdue payments
      const today = new Date();
      const updatedPayments = await Promise.all(userPayments.map(async (payment) => {
        if (payment.status === 'pending' && new Date(payment.dueDate) < today) {
          const updatedPayment = { ...payment, status: 'overdue' as const };
          await db.put(`/payments/${payment.id}`, updatedPayment);
          return updatedPayment;
        }
        return payment;
      }));

      setPayments(updatedPayments.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ));
      setCredits(userCredits);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const canMakePayment = (payment: Payment): boolean => {
    const creditPayments = payments.filter(p => p.creditId === payment.creditId);
    const paidPayments = creditPayments.filter(p => p.status === 'paid');
    return payment.paymentNumber === paidPayments.length + 1;
  };

  const getNextPaymentDate = (payment: Payment): string => {
    const dueDate = new Date(payment.dueDate);
    return dueDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handlePayment = async (payment: Payment) => {
    if (!user) return;

    const credit = credits.find(c => c.id === payment.creditId);
    if (!credit) return;

    try {
      const updatedPayment: Payment = {
        ...payment,
        status: 'paid',
        paidAt: new Date().toISOString(),
      };
      await db.put(`/payments/${payment.id}`, updatedPayment);

      const updatedCredit: Credit = {
        ...credit,
        remainingPayments: credit.remainingPayments - 1,
        paidAmount: credit.paidAmount + payment.amount,
        status: credit.remainingPayments - 1 === 0 ? 'completed' : credit.status,
      };
      await db.put(`/credits/${credit.id}`, updatedCredit);

      if (updatedCredit.remainingPayments > 0) {
        const nextPayment: Payment = {
          id: `pay-${Date.now()}`,
          creditId: credit.id,
          userId: user.id,
          amount: credit.monthlyPayment,
          paymentNumber: payment.paymentNumber + 1,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        };
        await db.post('/payments', nextPayment);
      }

      await scoreService.calculateScore(user.id);

      toast({
        title: "Pago realizado",
        description: `Cuota #${payment.paymentNumber} completada exitosamente`,
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: Payment['status']) => {
    const variants = {
      pending: { label: 'Pendiente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
      paid: { label: 'Pagado', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
      overdue: { label: 'Vencido', icon: AlertTriangle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
    };
    
    const { label, icon: Icon, className } = variants[status];
    return (
      <Badge variant="outline" className={cn("gap-1 font-medium", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getCreditInfo = (creditId: string) => {
    return credits.find(c => c.id === creditId);
  };

  const getCreditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      personal: 'Personal',
      hipotecario: 'Hipotecario',
      empresarial: 'Empresarial',
    };
    return labels[type] || type;
  };

  // Get active credits with their next pending payment
  const activeCreditsWithPayments = credits
    .filter(c => c.status === 'active')
    .map(credit => {
      const creditPayments = payments.filter(p => p.creditId === credit.id);
      const nextPayment = creditPayments.find(p => p.status === 'pending' || p.status === 'overdue');
      const paidCount = creditPayments.filter(p => p.status === 'paid').length;
      return { credit, nextPayment, paidCount, totalPayments: credit.term };
    });

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Historial de Pagos
            </h1>
            <p className="text-muted-foreground">Gestiona los pagos de tus créditos</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : credits.filter(c => c.status === 'active').length === 0 ? (
            <Card className="border-0 shadow-card bg-gradient-to-br from-card to-card/50">
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-10 w-10 text-primary" />
                </div>
                <p className="text-xl font-semibold mb-2">No hay créditos activos</p>
                <p className="text-muted-foreground">Los pagos aparecerán aquí cuando tengas créditos activos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Credit Cards with Next Payment */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Mis Créditos Activos
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeCreditsWithPayments.map(({ credit, nextPayment, paidCount, totalPayments }) => {
                    const daysUntilDue = nextPayment ? getDaysUntilDue(nextPayment.dueDate) : 0;
                    const isOverdue = nextPayment?.status === 'overdue';
                    const progress = (paidCount / totalPayments) * 100;
                    
                    return (
                      <Card 
                        key={credit.id} 
                        className={cn(
                          "overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                          isOverdue ? "ring-2 ring-destructive/50" : "ring-1 ring-border/50"
                        )}
                      >
                        {/* Header with gradient */}
                        <div className={cn(
                          "p-4 text-primary-foreground",
                          isOverdue 
                            ? "bg-gradient-to-r from-destructive to-destructive/80" 
                            : "bg-gradient-to-r from-primary to-primary/80"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-white/20">
                                <Banknote className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm opacity-90">Crédito</p>
                                <p className="font-bold text-lg">{getCreditTypeLabel(credit.type)}</p>
                              </div>
                            </div>
                            {nextPayment && getStatusBadge(nextPayment.status)}
                          </div>
                        </div>

                        <CardContent className="p-5 space-y-4">
                          {/* Amount */}
                          <div className="text-center py-2">
                            <p className="text-sm text-muted-foreground mb-1">Próxima cuota</p>
                            <p className="text-3xl font-bold text-foreground">
                              S/ {nextPayment?.amount.toFixed(2) || credit.monthlyPayment.toFixed(2)}
                            </p>
                          </div>

                          {/* Due Date */}
                          {nextPayment && (
                            <div className={cn(
                              "rounded-lg p-3 flex items-center justify-between",
                              isOverdue ? "bg-destructive/10" : "bg-secondary/50"
                            )}>
                              <div className="flex items-center gap-2">
                                <Calendar className={cn(
                                  "h-5 w-5",
                                  isOverdue ? "text-destructive" : "text-primary"
                                )} />
                                <div>
                                  <p className="text-xs text-muted-foreground">Fecha de vencimiento</p>
                                  <p className={cn(
                                    "font-semibold",
                                    isOverdue && "text-destructive"
                                  )}>
                                    {getNextPaymentDate(nextPayment)}
                                  </p>
                                </div>
                              </div>
                              <div className={cn(
                                "text-right px-3 py-1 rounded-full text-sm font-medium",
                                isOverdue 
                                  ? "bg-destructive/20 text-destructive" 
                                  : daysUntilDue <= 7 
                                    ? "bg-warning/20 text-warning" 
                                    : "bg-success/20 text-success"
                              )}>
                                {isOverdue 
                                  ? `${Math.abs(daysUntilDue)} días vencido`
                                  : `${daysUntilDue} días`
                                }
                              </div>
                            </div>
                          )}

                          {/* Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progreso</span>
                              <span className="font-medium">{paidCount} de {totalPayments} cuotas</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Credit Details */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                            <div className="text-center p-2 rounded-lg bg-secondary/30">
                              <p className="text-xs text-muted-foreground">Monto total</p>
                              <p className="font-semibold text-sm">S/ {credit.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-secondary/30">
                              <p className="text-xs text-muted-foreground">Tasa interés</p>
                              <p className="font-semibold text-sm">{credit.interestRate}%</p>
                            </div>
                          </div>

                          {/* Pay Button */}
                          {nextPayment && canMakePayment(nextPayment) && (
                            <Button 
                              onClick={() => handlePayment(nextPayment)}
                              className={cn(
                                "w-full font-semibold transition-all",
                                isOverdue 
                                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                                  : "gradient-primary text-primary-foreground hover:opacity-90"
                              )}
                            >
                              {isOverdue ? 'Pagar Ahora (Vencido)' : 'Realizar Pago'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Payment History */}
              {paidPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Historial de Pagos ({paidPayments.length})
                  </h2>
                  <Card className="border-0 shadow-card overflow-hidden">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/50">
                        {paidPayments.slice(0, 10).map((payment) => {
                          const credit = getCreditInfo(payment.creditId);
                          
                          return (
                            <div 
                              key={payment.id} 
                              className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-success/10">
                                  <CheckCircle className="h-5 w-5 text-success" />
                                </div>
                                <div>
                                  <p className="font-semibold">
                                    Cuota #{payment.paymentNumber}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Crédito {getCreditTypeLabel(credit?.type || '')} • Pagado el {new Date(payment.paidAt || '').toLocaleDateString('es-PE')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg text-success">S/ {payment.amount.toFixed(2)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Payments;
