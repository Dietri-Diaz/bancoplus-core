import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import DatabaseConnection from '@/services/DatabaseConnection';
import { CreditScoreService } from '@/services/CreditScoreService';
import { User, UserRole, Credit, CreditScore, Payment } from '@/types';
import { Plus, Users, Shield, Mail, CreditCard, CheckCircle, XCircle, Clock, Gauge, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [creditScores, setCreditScores] = useState<CreditScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const db = DatabaseConnection.getInstance();
  const scoreService = CreditScoreService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, creditsData, scoresData] = await Promise.all([
        db.get<User[]>('/users'),
        db.get<Credit[]>('/credits'),
        db.get<CreditScore[]>('/creditScores'),
      ]);
      setUsers(usersData);
      setCredits(creditsData);
      setCreditScores(scoresData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const newUser: User = {
        id: `${Date.now()}`,
        email,
        password,
        name,
        role,
        createdAt: new Date().toISOString(),
      };

      await db.post('/users', newUser);
      
      toast({
        title: "Usuario creado",
        description: `El usuario ${name} ha sido creado exitosamente`,
      });

      setOpen(false);
      setEmail('');
      setPassword('');
      setName('');
      setRole('user');
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const updatedUser = { ...user, role: newRole };
      await db.put(`/users/${userId}`, updatedUser);

      toast({
        title: "Rol actualizado",
        description: `El rol de ${user.name} ha sido actualizado a ${newRole}`,
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive",
      });
    }
  };

  const handleApproveCredit = async (credit: Credit) => {
    try {
      const updatedCredit: Credit = {
        ...credit,
        status: 'active',
        approvedAt: new Date().toISOString(),
      };
      await db.put(`/credits/${credit.id}`, updatedCredit);

      // Create first payment if not exists
      const payments = await db.get<Payment[]>('/payments');
      const existingPayment = payments.find(p => p.creditId === credit.id);
      
      if (!existingPayment) {
        const firstPayment: Payment = {
          id: `pay-${Date.now()}`,
          creditId: credit.id,
          userId: credit.userId,
          amount: credit.monthlyPayment,
          paymentNumber: 1,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        };
        await db.post('/payments', firstPayment);
      }

      toast({
        title: "Crédito aprobado",
        description: "El crédito ha sido aprobado y activado",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo aprobar el crédito",
        variant: "destructive",
      });
    }
  };

  const handleRejectCredit = async () => {
    if (!selectedCredit) return;

    try {
      const updatedCredit: Credit = {
        ...selectedCredit,
        status: 'rejected',
        rejectionReason,
      };
      await db.put(`/credits/${selectedCredit.id}`, updatedCredit);

      toast({
        title: "Crédito rechazado",
        description: "El crédito ha sido rechazado",
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedCredit(null);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo rechazar el crédito",
        variant: "destructive",
      });
    }
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Usuario desconocido';
  };

  const getUserScore = (userId: string) => {
    return creditScores.find(s => s.userId === userId);
  };

  const pendingCredits = credits.filter(c => c.status === 'pending');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Administración</h1>
              <p className="text-muted-foreground">Gestiona usuarios, permisos y solicitudes de crédito</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 gradient-primary text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Asigna roles y permisos al nuevo usuario
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      placeholder="Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@bancoplus.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full gradient-primary text-primary-foreground">
                    Crear Usuario
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="credits" className="space-y-6">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="credits" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                  <CreditCard className="h-4 w-4" />
                  Solicitudes de Crédito
                  {pendingCredits.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {pendingCredits.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                  <Users className="h-4 w-4" />
                  Usuarios
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
                  <Shield className="h-4 w-4" />
                  Roles
                </TabsTrigger>
              </TabsList>

              {/* Credit Requests Tab */}
              <TabsContent value="credits" className="space-y-4">
                {pendingCredits.length === 0 ? (
                  <Card className="border-0 shadow-card">
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                      <p className="text-xl font-semibold mb-2">No hay solicitudes pendientes</p>
                      <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingCredits.map((credit) => {
                      const userScore = getUserScore(credit.userId);
                      
                      return (
                        <Card key={credit.id} className="border-0 shadow-card">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="capitalize">Crédito {credit.type}</CardTitle>
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            </div>
                            <CardDescription>
                              Solicitado por: {getUserName(credit.userId)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* User Score */}
                              {userScore && (
                                <div className={cn(
                                  "p-3 rounded-lg border flex items-center justify-between",
                                  userScore.level === 'good' && "bg-success/5 border-success/30",
                                  userScore.level === 'medium' && "bg-warning/5 border-warning/30",
                                  userScore.level === 'bad' && "bg-destructive/5 border-destructive/30"
                                )}>
                                  <div className="flex items-center gap-2">
                                    <Gauge className={cn(
                                      "h-5 w-5",
                                      userScore.level === 'good' && "text-success",
                                      userScore.level === 'medium' && "text-warning",
                                      userScore.level === 'bad' && "text-destructive"
                                    )} />
                                    <span className="text-sm font-medium">Score Crediticio</span>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                    userScore.level === 'good' && "border-success/50 text-success",
                                    userScore.level === 'medium' && "border-warning/50 text-warning",
                                    userScore.level === 'bad' && "border-destructive/50 text-destructive"
                                  )}>
                                    {userScore.score} - {scoreService.getScoreLevelLabel(userScore.level)}
                                  </Badge>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Monto</p>
                                  <p className="text-xl font-bold">S/ {credit.amount.toLocaleString('es-PE')}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                                  <p className="text-xl font-bold text-primary">S/ {credit.monthlyPayment.toFixed(2)}</p>
                                </div>
                              </div>

                              <div className="p-3 bg-secondary/30 rounded-lg space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tasa:</span>
                                  <span className="font-medium">{credit.interestRate}% anual</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Plazo:</span>
                                  <span className="font-medium">{credit.term} meses</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Fecha solicitud:</span>
                                  <span className="font-medium">{new Date(credit.requestedAt).toLocaleDateString('es-PE')}</span>
                                </div>
                              </div>

                              {userScore?.level === 'bad' && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Score bajo - Se recomienda rechazar</span>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <Button 
                                  onClick={() => handleApproveCredit(credit)}
                                  className="flex-1 gradient-success text-success-foreground hover:opacity-90"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprobar
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCredit(credit);
                                    setRejectDialogOpen(true);
                                  }}
                                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rechazar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* All Credits History */}
                {credits.filter(c => c.status !== 'pending').length > 0 && (
                  <Card className="border-0 shadow-card mt-8">
                    <CardHeader>
                      <CardTitle>Historial de Créditos</CardTitle>
                      <CardDescription>Todos los créditos procesados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {credits.filter(c => c.status !== 'pending').map((credit) => (
                          <div key={credit.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                            <div>
                              <p className="font-medium capitalize">{credit.type}</p>
                              <p className="text-sm text-muted-foreground">{getUserName(credit.userId)}</p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <div>
                                <p className="font-bold">S/ {credit.amount.toLocaleString('es-PE')}</p>
                                <p className="text-xs text-muted-foreground">{credit.term} meses</p>
                              </div>
                              <Badge variant="outline" className={cn(
                                credit.status === 'active' && "bg-primary/10 text-primary border-primary/30",
                                credit.status === 'approved' && "bg-success/10 text-success border-success/30",
                                credit.status === 'rejected' && "bg-destructive/10 text-destructive border-destructive/30",
                                credit.status === 'completed' && "bg-muted text-muted-foreground"
                              )}>
                                {credit.status === 'active' && 'Activo'}
                                {credit.status === 'approved' && 'Aprobado'}
                                {credit.status === 'rejected' && 'Rechazado'}
                                {credit.status === 'completed' && 'Completado'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle>Lista de Usuarios</CardTitle>
                    <CardDescription>
                      {users.length} usuarios registrados en el sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.map((user) => {
                        const userScore = getUserScore(user.id);
                        
                        return (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "p-2.5 rounded-xl",
                                user.role === 'admin' ? 'gradient-primary' : 'bg-secondary'
                              )}>
                                {user.role === 'admin' ? (
                                  <Shield className="h-5 w-5 text-primary-foreground" />
                                ) : (
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">{user.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {userScore && user.role !== 'admin' && (
                                <Badge variant="outline" className={cn(
                                  "text-xs",
                                  userScore.level === 'good' && "border-success/50 text-success",
                                  userScore.level === 'medium' && "border-warning/50 text-warning",
                                  userScore.level === 'bad' && "border-destructive/50 text-destructive"
                                )}>
                                  Score: {userScore.score}
                                </Badge>
                              )}
                              <Select
                                value={user.role}
                                onValueChange={(value) => handleUpdateRole(user.id, value as UserRole)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Usuario</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Roles Tab */}
              <TabsContent value="roles" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-0 shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg gradient-primary">
                          <Shield className="h-5 w-5 text-primary-foreground" />
                        </div>
                        Rol Administrador
                      </CardTitle>
                      <CardDescription>Acceso total al sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm">
                        {[
                          'Ver todas las cuentas y usuarios',
                          'Gestionar usuarios y permisos',
                          'Aprobar o rechazar créditos',
                          'Ver scores crediticios de usuarios',
                          'Acceder a todas las transacciones',
                          'Configuración del sistema',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full gradient-primary"></div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-secondary">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        Rol Usuario
                      </CardTitle>
                      <CardDescription>Acceso limitado a recursos propios</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm">
                        {[
                          'Ver solo sus propias cuentas',
                          'Crear cuentas bancarias',
                          'Solicitar créditos (según score)',
                          'Realizar pagos de cuotas',
                          'Realizar transacciones',
                          'Ver historial personal',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Reject Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rechazar Crédito</DialogTitle>
                <DialogDescription>
                  Proporciona una razón para el rechazo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Razón del rechazo</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explica por qué se rechaza esta solicitud..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setRejectDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleRejectCredit}
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={!rejectionReason.trim()}
                  >
                    Confirmar Rechazo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Admin;
