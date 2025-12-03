import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { CreditScoreService } from '@/services/CreditScoreService';
import { Payment, Credit, User } from '@/types';
import { Receipt, CheckCircle, Clock, AlertTriangle, Calendar, CreditCard, Banknote, TrendingUp, Lock, User as UserIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const db = DatabaseConnection.getInstance();
  const scoreService = CreditScoreService.getInstance();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [paymentsData, creditsData, usersData] = await Promise.all([
        db.get<Payment[]>('/payments'),
        db.get<Credit[]>('/credits'),
        db.get<User[]>('/users'),
      ]);

      setUsers(usersData);
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

  // Check if payment can be made (only 1 payment per month)
  const canMakePayment = (payment: Payment): { canPay: boolean; reason?: string } => {
    const creditPayments = payments.filter(p => p.creditId === payment.creditId);
    const paidPayments = creditPayments.filter(p => p.status === 'paid');
    
    // Check if this is the next payment in sequence
    if (payment.paymentNumber !== paidPayments.length + 1) {
      return { canPay: false, reason: 'Debe pagar las cuotas en orden' };
    }

    // Check if already paid this month
    const lastPaidPayment = paidPayments
      .filter(p => p.paidAt)
      .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())[0];
    
    if (lastPaidPayment?.paidAt) {
      const lastPaymentDate = new Date(lastPaidPayment.paidAt);
      const now = new Date();
      
      // Check if the last payment was made in the current month
      const lastPaymentMonth = lastPaymentDate.getMonth();
      const lastPaymentYear = lastPaymentDate.getFullYear();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      if (lastPaymentMonth === currentMonth && lastPaymentYear === currentYear) {
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        return { 
          canPay: false, 
          reason: `Próximo pago disponible: ${nextMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}` 
        };
      }
    }
    
    return { canPay: true };
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

    const paymentStatus = canMakePayment(payment);
    if (!paymentStatus.canPay) {
      toast({
        title: "No disponible",
        description: paymentStatus.reason,
        variant: "destructive",
      });
      return;
    }

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
        // Set next payment due date for next month
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const nextPayment: Payment = {
          id: `pay-${Date.now()}`,
          creditId: credit.id,
          userId: user.id,
          amount: credit.monthlyPayment,
          paymentNumber: payment.paymentNumber + 1,
          dueDate: nextDueDate.toISOString(),
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
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-secondary/20 overflow-hidden">
              <CardContent className="py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Receipt className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mb-2">No hay créditos activos</p>
                  <p className="text-muted-foreground">Los pagos aparecerán aquí cuando tengas créditos activos</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Credit Cards with Next Payment */}
              <div>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Mis Créditos Activos
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeCreditsWithPayments.map(({ credit, nextPayment, paidCount, totalPayments }) => {
                    const daysUntilDue = nextPayment ? getDaysUntilDue(nextPayment.dueDate) : 0;
                    const isOverdue = nextPayment?.status === 'overdue';
                    const progress = (paidCount / totalPayments) * 100;
                    const paymentStatus = nextPayment ? canMakePayment(nextPayment) : { canPay: false };
                    
                    return (
                      <Card 
                        key={credit.id} 
                        className={cn(
                          "overflow-hidden border-0 shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group",
                          isOverdue ? "ring-2 ring-destructive/50" : "ring-1 ring-border/20"
                        )}
                      >
                        {/* Header with gradient */}
                        <div className={cn(
                          "p-5 text-primary-foreground relative overflow-hidden",
                          isOverdue 
                            ? "bg-gradient-to-br from-destructive via-destructive to-destructive/80" 
                            : "bg-gradient-to-br from-primary via-primary to-primary/80"
                        )}>
                          <div className="absolute inset-0 opacity-50" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.07)'%3E%3C/path%3E%3C/svg%3E\")"}} />
                          <div className="flex items-center justify-between relative">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                                <Banknote className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-sm opacity-80">Crédito</p>
                                <p className="font-bold text-xl">{getCreditTypeLabel(credit.type)}</p>
                              </div>
                            </div>
                            {nextPayment && getStatusBadge(nextPayment.status)}
                          </div>
                        </div>

                        <CardContent className="p-6 space-y-5">
                          {/* Amount */}
                          <div className="text-center py-4 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20">
                            <p className="text-sm text-muted-foreground mb-1">Próxima cuota</p>
                            <p className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                              S/ {nextPayment?.amount.toFixed(2) || credit.monthlyPayment.toFixed(2)}
                            </p>
                          </div>

                          {/* Due Date */}
                          {nextPayment && (
                            <div className={cn(
                              "rounded-xl p-4 flex items-center justify-between border",
                              isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-secondary/30 border-border/50"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  isOverdue ? "bg-destructive/10" : "bg-primary/10"
                                )}>
                                  <Calendar className={cn(
                                    "h-5 w-5",
                                    isOverdue ? "text-destructive" : "text-primary"
                                  )} />
                                </div>
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
                                "text-right px-3 py-1.5 rounded-lg text-sm font-bold",
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
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progreso del crédito</span>
                              <span className="font-bold">{paidCount} / {totalPayments} cuotas</span>
                            </div>
                            <div className="h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-primary via-primary to-success rounded-full transition-all duration-700 shadow-lg"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              {Math.round(progress)}% completado
                            </p>
                          </div>

                          {/* Credit Details */}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20">
                              <p className="text-xs text-muted-foreground">Monto total</p>
                              <p className="font-bold text-lg">S/ {credit.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20">
                              <p className="text-xs text-muted-foreground">Tasa interés</p>
                              <p className="font-bold text-lg">{credit.interestRate}%</p>
                            </div>
                          </div>

                          {/* Pay Button */}
                          {nextPayment && (
                            <div className="space-y-2">
                              {paymentStatus.canPay ? (
                                <Button 
                                  onClick={() => handlePayment(nextPayment)}
                                  className={cn(
                                    "w-full font-bold text-lg py-6 transition-all shadow-lg hover:shadow-xl",
                                    isOverdue 
                                      ? "bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-destructive-foreground" 
                                      : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                                  )}
                                >
                                  {isOverdue ? 'Pagar Ahora (Vencido)' : 'Realizar Pago'}
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  <Button 
                                    disabled
                                    className="w-full font-semibold py-6 bg-secondary/50 text-muted-foreground"
                                  >
                                    <Lock className="h-4 w-4 mr-2" />
                                    Pago no disponible
                                  </Button>
                                  <p className="text-xs text-center text-muted-foreground">
                                    {paymentStatus.reason}
                                  </p>
                                </div>
                              )}
                            </div>
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
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Historial de Pagos ({paidPayments.length})
                  </h2>
                  <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-card to-card/50">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/30">
                        {paidPayments.slice(0, 15).map((payment, index) => {
                          const credit = getCreditInfo(payment.creditId);
                          const paymentUser = users.find(u => u.id === payment.userId);
                          const isOverdue = payment.status === 'overdue';
                          
                          return (
                            <div 
                              key={payment.id} 
                              className="flex items-center justify-between p-5 hover:bg-secondary/20 transition-all duration-300"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "p-3 rounded-xl shadow-md",
                                  isOverdue 
                                    ? "bg-gradient-to-br from-warning/20 to-warning/5" 
                                    : "bg-gradient-to-br from-success/20 to-success/5"
                                )}>
                                  <CheckCircle className={cn(
                                    "h-6 w-6",
                                    isOverdue ? "text-warning" : "text-success"
                                  )} />
                                </div>
                                <div>
                                  <p className="font-bold text-lg">
                                    Cuota {payment.paymentNumber} de {credit?.term || '?'}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-primary">
                                      Crédito {getCreditTypeLabel(credit?.type || '')}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Pagado el {new Date(payment.paidAt || '').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <UserIcon className="h-3 w-3" />
                                    <span>{paymentUser?.name || 'Usuario'}</span>
                                    <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                                      ID: {payment.id}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn(
                                  "font-bold text-xl",
                                  isOverdue ? "text-warning" : "text-success"
                                )}>
                                  S/ {payment.amount.toFixed(2)}
                                </p>
                                {isOverdue && (
                                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                                    Pagado tarde
                                  </Badge>
                                )}
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