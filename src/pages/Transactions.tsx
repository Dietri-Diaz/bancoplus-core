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
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

        // Actualizar cuenta destino
        const toAccountProxy = new AccountProxyAccess(user.id, user.role);
        const destinationAccount = await toAccountProxy.getAccount(toAccount);
        await toAccountProxy.updateBalance(toAccount, destinationAccount.balance + transactionAmount);
      }

      // Actualizar balance usando el Proxy
      await accountProxy.updateBalance(selectedAccount, newBalance);

      // Crear transacción
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
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transacciones</h1>
              <p className="text-muted-foreground">Gestiona tus movimientos bancarios</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Transacción
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Transacción</DialogTitle>
                  <DialogDescription>
                    El Proxy valida permisos y controla el acceso a las cuentas
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="deposit">Depósito</TabsTrigger>
                    <TabsTrigger value="withdrawal">Retiro</TabsTrigger>
                    <TabsTrigger value="transfer">Transferencia</TabsTrigger>
                  </TabsList>
                  <TabsContent value={transactionType} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="account">Cuenta</Label>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger id="account">
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
                          <SelectTrigger id="toAccount">
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        placeholder="Descripción de la transacción"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <Button onClick={handleTransaction} className="w-full">
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
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold mb-2">No hay transacciones</p>
                <p className="text-muted-foreground mb-4">Realiza tu primera transacción</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Transacción
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Todas tus transacciones bancarias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const Icon = getTransactionIcon(tx.type);
                    const account = accounts.find(acc => acc.id === tx.accountId);
                    
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-success/20' : 'bg-primary/20'}`}>
                            <Icon className={`h-5 w-5 ${tx.type === 'deposit' ? 'text-success' : 'text-primary'}`} />
                          </div>
                          <div>
                            <p className="font-semibold">{getTransactionLabel(tx.type)}</p>
                            <p className="text-sm text-muted-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              {account?.accountNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${tx.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}S/{tx.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString('es-ES', { 
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
