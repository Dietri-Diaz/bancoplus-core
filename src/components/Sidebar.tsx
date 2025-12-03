import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Wallet, 
  CreditCard, 
  ArrowLeftRight, 
  Users, 
  LogOut,
  Building2,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cuentas', href: '/accounts', icon: Wallet },
    { name: 'Créditos', href: '/credits', icon: CreditCard },
    { name: 'Pagos', href: '/payments', icon: Receipt },
    { name: 'Transacciones', href: '/transactions', icon: ArrowLeftRight },
  ];

  if (isAdmin) {
    navigation.push({ name: 'Administración', href: '/admin', icon: Users });
  }

  return (
    <div className="flex h-screen w-72 flex-col bg-card border-r border-border shadow-lg">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="gradient-primary rounded-xl p-2.5">
          <Building2 className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <span className="text-xl font-bold text-gradient">BancoPlus</span>
          <p className="text-xs text-muted-foreground">Banca Digital</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4">
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground mb-1">Bienvenido</p>
          <p className="font-semibold text-foreground truncate">{user?.name}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              user?.role === 'admin' 
                ? "bg-primary/10 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "animate-scale-in")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};
