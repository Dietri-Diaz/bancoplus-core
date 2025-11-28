// Patrón Proxy: Controlar el acceso a las cuentas bancarias
import { BankAccount } from '@/types';
import DatabaseConnection from './DatabaseConnection';

export interface AccountAccess {
  getAccount(accountId: string): Promise<BankAccount>;
  updateBalance(accountId: string, newBalance: number): Promise<BankAccount>;
}

export class RealAccountAccess implements AccountAccess {
  private db = DatabaseConnection.getInstance();

  async getAccount(accountId: string): Promise<BankAccount> {
    const accounts = await this.db.get<BankAccount[]>('/accounts');
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) throw new Error('Cuenta no encontrada');
    return account;
  }

  async updateBalance(accountId: string, newBalance: number): Promise<BankAccount> {
    const account = await this.getAccount(accountId);
    account.balance = newBalance;
    return this.db.put<BankAccount>(`/accounts/${accountId}`, account);
  }
}

export class AccountProxyAccess implements AccountAccess {
  private realAccess: RealAccountAccess;
  private cache: Map<string, { account: BankAccount; timestamp: number }> = new Map();
  private cacheDuration = 30000; // 30 segundos

  constructor(private userId: string, private userRole: string) {
    this.realAccess = new RealAccountAccess();
  }

  async getAccount(accountId: string): Promise<BankAccount> {
    // Verificar permisos
    this.checkAccess(accountId);

    // Revisar caché
    const cached = this.cache.get(accountId);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log('✅ Acceso a cuenta desde caché (Proxy)');
      return cached.account;
    }

    // Obtener de la base de datos
    console.log('🔄 Acceso a cuenta desde base de datos (Proxy)');
    const account = await this.realAccess.getAccount(accountId);
    
    // Guardar en caché
    this.cache.set(accountId, { account, timestamp: Date.now() });
    
    return account;
  }

  async updateBalance(accountId: string, newBalance: number): Promise<BankAccount> {
    // Verificar permisos
    this.checkAccess(accountId);

    // Validar que el balance no sea negativo
    if (newBalance < 0) {
      throw new Error('El balance no puede ser negativo');
    }

    console.log('💰 Actualizando balance de cuenta (Proxy)');
    const updatedAccount = await this.realAccess.updateBalance(accountId, newBalance);
    
    // Actualizar caché
    this.cache.set(accountId, { account: updatedAccount, timestamp: Date.now() });
    
    return updatedAccount;
  }

  private async checkAccess(accountId: string): Promise<void> {
    if (this.userRole === 'admin') {
      console.log('🔓 Acceso administrativo permitido (Proxy)');
      return;
    }

    const account = await this.realAccess.getAccount(accountId);
    if (account.userId !== this.userId) {
      console.log('🚫 Acceso denegado (Proxy)');
      throw new Error('No tienes permisos para acceder a esta cuenta');
    }

    console.log('✅ Acceso de usuario permitido (Proxy)');
  }

  clearCache(): void {
    this.cache.clear();
  }
}
