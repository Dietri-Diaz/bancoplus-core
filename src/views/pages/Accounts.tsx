// ============================================
// VIEW - Accounts Page
// ============================================
import { useState } from 'react';
import { Sidebar } from '@/views/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AccountType } from '@/models/entities';
import { useAccounts } from '@/controllers';
import { Plus, Wallet, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const Accounts = () => {
  const { accounts, loading, createAccount, calculateProjectedInterest } = useAccounts();
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('ahorro');
  const [initialBalance, setInitialBalance] = useState('1000');

  const handleCreateAccount = async () => {
    const success = await createAccount(accountType, parseFloat(initialBalance));
    if (success) setOpen(false);
  };

  const getAccountTypeLabel = (type: AccountType) => {
    const labels = { ahorro: 'Ahorro', corriente: 'Corriente', empresarial: 'Empresarial' };
    return labels[type];
  };

  const getAccountTypeColor = (type: AccountType) => {
    const colors = {
      ahorro: 'from-emerald-500 to-teal-600',
      corriente: 'from-blue-500 to-indigo-600',
      empresarial: 'from-purple-500 to-pink-600'
    };
    return colors[type];
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Mis Cuentas
              </h1>
              <p className="text-muted-foreground">Gestiona tus cuentas bancarias</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" />
                  Nueva Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent className="border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Crear Nueva Cuenta</DialogTitle>
                  <DialogDescription>
                    Utiliza el patrón Factory Method para crear diferentes tipos de cuentas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Cuenta</Label>
                    <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                      <SelectTrigger id="type" className="h-12">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ahorro">Ahorro (2.5% anual)</SelectItem>
                        <SelectItem value="corriente">Corriente (0% anual)</SelectItem>
                        <SelectItem value="empresarial">Empresarial (1.5% anual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance">Balance Inicial (S/)</Label>
                    <Input
                      id="balance"
                      type="number"
                      min="100"
                      step="0.01"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <Button onClick={handleCreateAccount} className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80">
                    Crear Cuenta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : accounts.length === 0 ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-secondary/20 overflow-hidden">
              <CardContent className="py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Wallet className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mb-2">No tienes cuentas</p>
                  <p className="text-muted-foreground mb-6">Crea tu primera cuenta bancaria</p>
                  <Button onClick={() => setOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                    <Plus className="h-4 w-4" />
                    Crear Cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account, index) => {
                const projectedInterest = calculateProjectedInterest(account);
                return (
                  <Card 
                    key={account.id} 
                    className="border-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={cn(
                      "p-5 text-white relative overflow-hidden",
                      `bg-gradient-to-br ${getAccountTypeColor(account.type)}`
                    )}>
                      <div className="absolute inset-0 opacity-50" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.1)'%3E%3C/path%3E%3C/svg%3E\")"}} />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Cuenta</p>
                          <p className="text-2xl font-bold capitalize">{getAccountTypeLabel(account.type)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <Wallet className="h-6 w-6" />
                        </div>
                      </div>
                      <p className="text-xs font-mono opacity-70 mt-3">{account.accountNumber}</p>
                    </div>

                    <CardContent className="p-5 space-y-5">
                      <div className="text-center py-4 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20">
                        <p className="text-sm text-muted-foreground mb-1">Balance Actual</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          S/ {account.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-success/10">
                            <TrendingUp className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tasa de Interés</p>
                            <p className="font-bold">{account.interestRate}% anual</p>
                          </div>
                        </div>
                      </div>

                      {account.interestRate > 0 && (
                        <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-success" />
                            <p className="text-xs text-muted-foreground">Interés proyectado (12 meses)</p>
                          </div>
                          <p className="text-2xl font-bold text-success">
                            +S/ {projectedInterest.toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div className="pt-4 border-t border-border/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estado:</span>
                          {account.status === 'pending' ? (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-semibold">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={cn(
                              "font-semibold",
                              account.status === 'active' && "bg-success/10 text-success border-success/30"
                            )}>
                              {account.status === 'active' ? 'Activa' : account.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Accounts;
