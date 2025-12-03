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
import { Plus, CreditCard, Clock, CheckCircle, XCircle, Banknote, Percent, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

  const getCreditTypeColor = (type: CreditType) => {
    const colors = {
      personal: 'from-blue-500 to-cyan-600',
      hipotecario: 'from-amber-500 to-orange-600',
      empresarial: 'from-violet-500 to-purple-600'
    };
    return colors[type];
  };

  const getStatusBadge = (status: Credit['status']) => {
    const variants = {
      pending: { label: 'Pendiente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
      approved: { label: 'Aprobado', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
      active: { label: 'Activo', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
      rejected: { label: 'Rechazado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
      completed: { label: 'Completado', icon: CheckCircle, className: 'bg-primary/10 text-primary border-primary/30' },
    };
    
    const { label, icon: Icon, className } = variants[status];
    return (
      <Badge variant="outline" className={cn("gap-1 font-semibold", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Créditos
              </h1>
              <p className="text-muted-foreground">Gestiona tus solicitudes de crédito</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" />
                  Solicitar Crédito
                </Button>
              </DialogTrigger>
              <DialogContent className="border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Solicitar Nuevo Crédito</DialogTitle>
                  <DialogDescription>
                    Utiliza el patrón Abstract Factory para crear diferentes tipos de créditos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditType">Tipo de Crédito</Label>
                    <Select value={creditType} onValueChange={(value) => setCreditType(value as CreditType)}>
                      <SelectTrigger id="creditType" className="h-12">
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
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term">Plazo (meses)</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger id="term" className="h-12">
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
                  <Button onClick={handleRequestCredit} className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80">
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
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-secondary/20 overflow-hidden">
              <CardContent className="py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <CreditCard className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mb-2">No tienes créditos</p>
                  <p className="text-muted-foreground mb-6">Solicita tu primer crédito</p>
                  <Button onClick={() => setOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                    <Plus className="h-4 w-4" />
                    Solicitar Crédito
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {credits.map((credit, index) => (
                <Card 
                  key={credit.id} 
                  className="border-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient Header */}
                  <div className={cn(
                    "p-5 text-white relative overflow-hidden",
                    `bg-gradient-to-br ${getCreditTypeColor(credit.type)}`
                  )}>
                    <div className="absolute inset-0 opacity-50" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.1)'%3E%3C/path%3E%3C/svg%3E\")"}} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Crédito</p>
                        <p className="text-2xl font-bold capitalize">{getCreditTypeLabel(credit.type)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Banknote className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="relative mt-3">
                      {getStatusBadge(credit.status)}
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-5">
                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20">
                        <p className="text-xs text-muted-foreground mb-1">Monto</p>
                        <p className="text-2xl font-bold">
                          S/ {credit.amount.toLocaleString('es-PE')}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                        <p className="text-xs text-muted-foreground mb-1">Cuota Mensual</p>
                        <p className="text-2xl font-bold text-primary">
                          S/ {credit.monthlyPayment.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 bg-secondary/30 rounded-xl space-y-3 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Tasa de Interés</span>
                        </div>
                        <span className="font-bold">{credit.interestRate}% anual</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Plazo</span>
                        </div>
                        <span className="font-bold">{credit.term} meses</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">Total a Pagar</span>
                        <span className="font-bold text-lg">
                          S/ {(credit.monthlyPayment * credit.term).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="pt-3 border-t border-border/50 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Solicitado:</span>
                        <span className="font-medium">
                          {new Date(credit.requestedAt).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                      {credit.approvedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Aprobado:</span>
                          <span className="font-medium text-success">
                            {new Date(credit.approvedAt).toLocaleDateString('es-PE')}
                          </span>
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