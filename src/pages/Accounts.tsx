import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { getAccountFactory } from '@/services/AccountFactory';
import { InterestCalculator } from '@/services/InterestStrategy';
import { BankAccount, AccountType } from '@/types';
import { Plus, Wallet, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Accounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('ahorro');
  const [initialBalance, setInitialBalance] = useState('1000');
  const db = DatabaseConnection.getInstance();

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    try {
      const data = await db.get<BankAccount[]>('/accounts');
      const userAccounts = user?.role === 'admin' 
        ? data 
        : data.filter(acc => acc.userId === user?.id);
      setAccounts(userAccounts);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!user) return;

    try {
      // Usar Factory Method para crear la cuenta
      const factory = getAccountFactory(accountType);
      const accountNumber = `0001-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;
      const newAccount = factory.createAccount(user.id, accountNumber, parseFloat(initialBalance));

      await db.post('/accounts', newAccount);
      
      toast({
        title: "Cuenta creada exitosamente",
        description: `Tu cuenta ${accountType} ha sido creada con éxito`,
      });

      setOpen(false);
      loadAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive",
      });
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    const labels = {
      ahorro: 'Ahorro',
      corriente: 'Corriente',
      empresarial: 'Empresarial'
    };
    return labels[type];
  };

  const calculateProjectedInterest = (account: BankAccount) => {
    const calculator = new InterestCalculator(account.type);
    return calculator.calculateInterest(account.balance, 12); // Interés proyectado a 12 meses
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mis Cuentas</h1>
              <p className="text-muted-foreground">Gestiona tus cuentas bancarias</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Cuenta</DialogTitle>
                  <DialogDescription>
                    Utiliza el patrón Factory Method para crear diferentes tipos de cuentas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Cuenta</Label>
                    <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                      <SelectTrigger id="type">
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
                    />
                  </div>
                  <Button onClick={handleCreateAccount} className="w-full">
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
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">No tienes cuentas</p>
                <p className="text-muted-foreground mb-4">Crea tu primera cuenta bancaria</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Cuenta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const projectedInterest = calculateProjectedInterest(account);
                return (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{getAccountTypeLabel(account.type)}</CardTitle>
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {account.accountNumber}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Balance Actual</p>
                          <p className="text-3xl font-bold text-foreground">
                            S/{account.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{account.currency}</p>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-xs text-muted-foreground">Tasa de Interés</p>
                              <p className="text-sm font-semibold">{account.interestRate}% anual</p>
                            </div>
                          </div>
                        </div>

                        {account.interestRate > 0 && (
                          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Interés proyectado (12 meses)</p>
                            <p className="text-lg font-bold text-success">
                              +S/{projectedInterest.toFixed(2)}
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Estado:</span>
                            <span className={`font-medium capitalize ${account.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
                              {account.status === 'active' ? 'Activa' : account.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-muted-foreground">Creada:</span>
                            <span className="font-medium">
                              {new Date(account.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          </div>
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
