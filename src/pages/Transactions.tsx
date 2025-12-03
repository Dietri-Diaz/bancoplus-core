import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import DatabaseConnection from '@/services/DatabaseConnection';
import { AccountProxyAccess } from '@/services/AccountProxy';
import { BankAccount, Transaction, TransactionType } from '@/types';
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Receipt } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Transactions = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('deposit');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [toAccount, setToAccount] = useState('');
  const db = DatabaseConnection.getInstance();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const accountsData = await db.get<BankAccount[]>('/accounts');
      const transactionsData = await db.get<Transaction[]>('/transactions');
      
      const userAccounts = user?.role === 'admin' 
        ? accountsData 
        : accountsData.filter(acc => acc.userId === user?.id);
      
      setAccounts(userAccounts);
      
      const userAccountIds = userAccounts.map(acc => acc.id);
      const userTransactions = transactionsData.filter(tx => userAccountIds.includes(tx.accountId));
      setTransactions(userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!user || !selectedAccount || !amount) return;

    try {
      const accountProxy = new AccountProxyAccess(user.id, user.role);
      const account = await accountProxy.getAccount(selectedAccount);
      const transactionAmount = parseFloat(amount);

      let newBalance = account.balance;

      if (transactionType === 'deposit') {
        newBalance += transactionAmount;
      } else if (transactionType === 'withdrawal') {
        if (account.balance < transactionAmount) {
          toast({
            title: "Saldo insuficiente",
            description: "No tienes suficiente saldo para realizar este retiro",
            variant: "destructive",
          });
          return;
        }
        newBalance -= transactionAmount;
      } else if (transactionType === 'transfer') {
        if (!toAccount || toAccount === selectedAccount) {
          toast({
            title: "Error",
            description: "Debes seleccionar una cuenta destino válida",
            variant: "destructive",
          });
          return;
        }
        if (account.balance < transactionAmount) {
          toast({
            title: "Saldo insuficiente",
            description: "No tienes suficiente saldo para realizar esta transferencia",
            variant: "destructive",
          });
          return;
        }
        newBalance -= transactionAmount;

        const toAccountProxy = new AccountProxyAccess(user.id, user.role);
        const destinationAccount = await toAccountProxy.getAccount(toAccount);
        await toAccountProxy.updateBalance(toAccount, destinationAccount.balance + transactionAmount);
      }

      await accountProxy.updateBalance(selectedAccount, newBalance);

      const newTransaction: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accountId: selectedAccount,
        type: transactionType,
        amount: transactionAmount,
        description: description || `${transactionType} realizado`,
        date: new Date().toISOString(),
        status: 'completed',
        ...(transactionType === 'transfer' && { toAccountId: toAccount }),
      };

      await db.post('/transactions', newTransaction);

      toast({
        title: "Transacción exitosa",
        description: `${transactionType === 'deposit' ? 'Depósito' : transactionType === 'withdrawal' ? 'Retiro' : 'Transferencia'} realizado correctamente`,
      });

      setOpen(false);
      setAmount('');
      setDescription('');
      setToAccount('');
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la transacción",
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: TransactionType) => {
    const icons = {
      deposit: ArrowDownToLine,
      withdrawal: ArrowUpFromLine,
      transfer: ArrowLeftRight,
    };
    return icons[type];
  };

  const getTransactionLabel = (type: TransactionType) => {
    const labels = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      transfer: 'Transferencia',
    };
    return labels[type];
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Transacciones
              </h1>
              <p className="text-muted-foreground">Gestiona tus movimientos bancarios</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4" />
                  Nueva Transacción
                </Button>
              </DialogTrigger>
              <DialogContent className="border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Nueva Transacción</DialogTitle>
                  <DialogDescription>
                    El Proxy valida permisos y controla el acceso a las cuentas
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
                  <TabsList className="grid w-full grid-cols-3 h-12">
                    <TabsTrigger value="deposit" className="text-sm font-semibold">Depósito</TabsTrigger>
                    <TabsTrigger value="withdrawal" className="text-sm font-semibold">Retiro</TabsTrigger>
                    <TabsTrigger value="transfer" className="text-sm font-semibold">Transferencia</TabsTrigger>
                  </TabsList>
                  <TabsContent value={transactionType} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="account">Cuenta</Label>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger id="account" className="h-12">
                          <SelectValue placeholder="Selecciona una cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.accountNumber} - S/{acc.balance.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {transactionType === 'transfer' && (
                      <div className="space-y-2">
                        <Label htmlFor="toAccount">Cuenta Destino</Label>
                        <Select value={toAccount} onValueChange={setToAccount}>
                          <SelectTrigger id="toAccount" className="h-12">
                            <SelectValue placeholder="Selecciona cuenta destino" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter(acc => acc.id !== selectedAccount)
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.accountNumber} - S/{acc.balance.toFixed(2)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto (S/)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-12 text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        placeholder="Descripción de la transacción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-20"
                      />
                    </div>

                    <Button onClick={handleTransaction} className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80">
                      Realizar Transacción
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-secondary/20 overflow-hidden">
              <CardContent className="py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <ArrowLeftRight className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-2xl font-bold mb-2">No hay transacciones</p>
                  <p className="text-muted-foreground mb-6">Realiza tu primera transacción</p>
                  <Button onClick={() => setOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                    <Plus className="h-4 w-4" />
                    Nueva Transacción
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-card to-card/50">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Historial de Transacciones</CardTitle>
                    <CardDescription>Todas tus transacciones bancarias</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {transactions.map((tx, index) => {
                    const Icon = getTransactionIcon(tx.type);
                    const account = accounts.find(acc => acc.id === tx.accountId);
                    
                    return (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-5 hover:bg-secondary/20 transition-all duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-xl shadow-md",
                            tx.type === 'deposit' 
                              ? "bg-gradient-to-br from-success/20 to-success/5" 
                              : tx.type === 'withdrawal'
                                ? "bg-gradient-to-br from-destructive/20 to-destructive/5"
                                : "bg-gradient-to-br from-primary/20 to-primary/5"
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              tx.type === 'deposit' ? "text-success" : tx.type === 'withdrawal' ? "text-destructive" : "text-primary"
                            )} />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{getTransactionLabel(tx.type)}</p>
                            <p className="text-sm text-muted-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              {account?.accountNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-xl font-bold",
                            tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                          )}>
                            {tx.type === 'deposit' ? '+' : '-'}S/ {tx.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString('es-PE', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Transactions;