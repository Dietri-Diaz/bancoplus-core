import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { CreditScoreService } from '@/services/CreditScoreService';
import { Payment, Credit } from '@/types';
import { Receipt, CheckCircle, Clock, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
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
    // Check if it's the first unpaid payment for this credit
    const creditPayments = payments.filter(p => p.creditId === payment.creditId);
    const paidPayments = creditPayments.filter(p => p.status === 'paid');
    
    // Can pay if it's the next sequential payment
    return payment.paymentNumber === paidPayments.length + 1;
  };

  const handlePayment = async (payment: Payment) => {
    if (!user) return;

    // Check if enough time has passed (simulate monthly payment)
    const credit = credits.find(c => c.id === payment.creditId);
    if (!credit) return;

    // For non-first payments, check if a month has passed since last payment
    if (payment.paymentNumber > 1) {
      const previousPayment = payments.find(
        p => p.creditId === payment.creditId && p.paymentNumber === payment.paymentNumber - 1
      );
      
      if (previousPayment?.paidAt) {
        const lastPaymentDate = new Date(previousPayment.paidAt);
        const daysSinceLastPayment = Math.floor(
          (Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastPayment < 30) {
          toast({
            title: "Pago no disponible",
            description: `Debes esperar ${30 - daysSinceLastPayment} días más para realizar el siguiente pago (pago mensual).`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      // Mark payment as paid
      const updatedPayment: Payment = {
        ...payment,
        status: 'paid',
        paidAt: new Date().toISOString(),
      };
      await db.put(`/payments/${payment.id}`, updatedPayment);

      // Update credit
      const updatedCredit: Credit = {
        ...credit,
        remainingPayments: credit.remainingPayments - 1,
        paidAmount: credit.paidAmount + payment.amount,
        status: credit.remainingPayments - 1 === 0 ? 'completed' : credit.status,
      };
      await db.put(`/credits/${credit.id}`, updatedCredit);

      // Create next payment if not completed
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

      // Recalculate credit score
      await scoreService.calculateScore(user.id);

      toast({
        title: "Pago realizado",
        description: `Pago #${payment.paymentNumber} completado exitosamente`,
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
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getCreditInfo = (creditId: string) => {
    return credits.find(c => c.id === creditId);
  };

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const paidPayments = payments.filter(p => p.status === 'paid');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Historial de Pagos</h1>
            <p className="text-muted-foreground">Gestiona los pagos de tus créditos</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : payments.length === 0 ? (
            <Card className="border-0 shadow-card">
              <CardContent className="py-12 text-center">
                <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">No hay pagos registrados</p>
                <p className="text-muted-foreground">Los pagos aparecerán aquí cuando tengas créditos activos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Pending Payments */}
              {pendingPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pagos Pendientes ({pendingPayments.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingPayments.map((payment) => {
                      const credit = getCreditInfo(payment.creditId);
                      const isPayable = canMakePayment(payment);
                      
                      return (
                        <Card key={payment.id} className={cn(
                          "border-0 shadow-card transition-all duration-300",
                          payment.status === 'overdue' && "ring-2 ring-destructive/50"
                        )}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Cuota #{payment.paymentNumber}</CardTitle>
                              {getStatusBadge(payment.status)}
                            </div>
                            <CardDescription className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Crédito {credit?.type}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Monto:</span>
                                <span className="text-2xl font-bold">S/ {payment.amount.toFixed(2)}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Vencimiento:
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  payment.status === 'overdue' && "text-destructive"
                                )}>
                                  {new Date(payment.dueDate).toLocaleDateString('es-PE')}
                                </span>
                              </div>

                              {payment.status === 'overdue' && (
                                <Alert className="bg-destructive/5 border-destructive/30">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <AlertDescription className="text-destructive text-sm">
                                    Este pago está vencido. Realízalo cuanto antes para evitar afectar tu score crediticio.
                                  </AlertDescription>
                                </Alert>
                              )}

                              <Button 
                                onClick={() => handlePayment(payment)}
                                className={cn(
                                  "w-full",
                                  isPayable 
                                    ? "gradient-primary text-primary-foreground hover:opacity-90" 
                                    : "bg-muted text-muted-foreground"
                                )}
                                disabled={!isPayable}
                              >
                                {isPayable ? 'Realizar Pago' : 'Paga la cuota anterior primero'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {paidPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Historial de Pagos ({paidPayments.length})
                  </h2>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {paidPayments.map((payment) => {
                          const credit = getCreditInfo(payment.creditId);
                          
                          return (
                            <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-success/10">
                                  <CheckCircle className="h-5 w-5 text-success" />
                                </div>
                                <div>
                                  <p className="font-medium">Cuota #{payment.paymentNumber} - Crédito {credit?.type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Pagado el {new Date(payment.paidAt || '').toLocaleDateString('es-PE')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-success">S/ {payment.amount.toFixed(2)}</p>
                                {getStatusBadge(payment.status)}
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
