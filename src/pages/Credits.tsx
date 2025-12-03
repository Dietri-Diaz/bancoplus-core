import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { getCreditFactory } from '@/services/CreditFactory';
import { Credit, CreditType } from '@/types';
import { Plus, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Credits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creditType, setCreditType] = useState<CreditType>('personal');
  const [amount, setAmount] = useState('5000');
  const [term, setTerm] = useState('24');
  const db = DatabaseConnection.getInstance();

  useEffect(() => {
    loadCredits();
  }, [user]);

  const loadCredits = async () => {
    try {
      const data = await db.get<Credit[]>('/credits');
      const userCredits = user?.role === 'admin' 
        ? data 
        : data.filter(cred => cred.userId === user?.id);
      setCredits(userCredits);
    } catch (error) {
      console.error('Error al cargar créditos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCredit = async () => {
    if (!user) return;

    try {
      // Usar Abstract Factory para crear el crédito
      const factory = getCreditFactory(creditType);
      const newCredit = factory.createCredit(user.id, parseFloat(amount), parseInt(term));

      await db.post('/credits', newCredit);
      
      toast({
        title: "Solicitud enviada",
        description: `Tu solicitud de crédito ${creditType} ha sido enviada`,
      });

      setOpen(false);
      loadCredits();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la solicitud",
        variant: "destructive",
      });
    }
  };

  const getCreditTypeLabel = (type: CreditType) => {
    const labels = {
      personal: 'Personal',
      hipotecario: 'Hipotecario',
      empresarial: 'Empresarial'
    };
    return labels[type];
  };

  const getStatusBadge = (status: Credit['status']) => {
    const variants = {
      pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const },
      approved: { label: 'Aprobado', icon: CheckCircle, variant: 'default' as const },
      active: { label: 'Activo', icon: CheckCircle, variant: 'default' as const },
      rejected: { label: 'Rechazado', icon: XCircle, variant: 'destructive' as const },
      completed: { label: 'Completado', icon: CheckCircle, variant: 'outline' as const },
    };
    
    const { label, icon: Icon, variant } = variants[status];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Créditos</h1>
              <p className="text-muted-foreground">Gestiona tus solicitudes de crédito</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Solicitar Crédito
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Nuevo Crédito</DialogTitle>
                  <DialogDescription>
                    Utiliza el patrón Abstract Factory para crear diferentes tipos de créditos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditType">Tipo de Crédito</Label>
                    <Select value={creditType} onValueChange={(value) => setCreditType(value as CreditType)}>
                      <SelectTrigger id="creditType">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal (10-15% anual)</SelectItem>
                        <SelectItem value="hipotecario">Hipotecario (6.5-8.5% anual)</SelectItem>
                        <SelectItem value="empresarial">Empresarial (9-14% anual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto Solicitado (S/)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1000"
                      step="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term">Plazo (meses)</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger id="term">
                        <SelectValue placeholder="Selecciona el plazo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                        <SelectItem value="36">36 meses</SelectItem>
                        <SelectItem value="48">48 meses</SelectItem>
                        <SelectItem value="60">60 meses</SelectItem>
                        <SelectItem value="120">120 meses (10 años)</SelectItem>
                        <SelectItem value="240">240 meses (20 años)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleRequestCredit} className="w-full">
                    Enviar Solicitud
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : credits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">No tienes créditos</p>
                <p className="text-muted-foreground mb-4">Solicita tu primer crédito</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Crédito
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {credits.map((credit) => (
                <Card key={credit.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize">{getCreditTypeLabel(credit.type)}</CardTitle>
                      {getStatusBadge(credit.status)}
                    </div>
                    <CardDescription>
                      Solicitado el {new Date(credit.requestedAt).toLocaleDateString('es-ES')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Monto</p>
                          <p className="text-2xl font-bold text-foreground">
                            S/{credit.amount.toLocaleString('es-PE')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Cuota Mensual</p>
                          <p className="text-2xl font-bold text-primary">
                            S/{credit.monthlyPayment.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-accent/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tasa de Interés:</span>
                          <span className="font-semibold">{credit.interestRate}% anual</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Plazo:</span>
                          <span className="font-semibold">{credit.term} meses</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total a Pagar:</span>
                          <span className="font-semibold">
                            S/{(credit.monthlyPayment * credit.term).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {credit.approvedAt && (
                        <div className="text-xs text-muted-foreground">
                          Aprobado el {new Date(credit.approvedAt).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Credits;
